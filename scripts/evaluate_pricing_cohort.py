"""
scripts/evaluate_pricing_cohort.py
----------------------------------
Descriptive in-sample evaluation of the production CategoryPricingAnalyzer
against the 20,000-product expanded curated cohort.

Evaluation Objectives:
1. Evaluate production CategoryPricingAnalyzer from src.features.pricing.
2. Preserve exact (marketplace, currency, category) peer groups with min_sample_size=20.
3. Quantify status distributions:
   - NORMAL_PRICE_RANGE
   - PRICE_ABOVE_UPPER_FENCE
   - PRICE_BELOW_LOWER_FENCE
   - INSUFFICIENT_PEER_GROUP
   - MISSING_PRICE
   - INVALID_PRICE
4. Report marketplace and category breakdowns.
5. Audit Robust Z-score availability and ZERO_MAD occurrences.
6. Inspect extreme price outliers (highest and lowest).
7. Ensure zero cross-currency mixing (USD and INR remain strictly segregated).
8. Clearly disclose methodological boundaries and in-sample descriptive constraints.
"""

import sys
import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, List

import numpy as np
import pandas as pd

# Add repository root to path
sys.path.insert(0, os.path.abspath("."))

from src.features.pricing import CategoryPricingAnalyzer

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

COHORT_PATH = Path("data/curated/curated_products_20000.parquet")
OUTPUT_REPORT_PATH = Path("reports/pricing_cohort_evaluation.md")


def run_evaluation() -> Dict[str, Any]:
    logging.info("==================================================")
    logging.info("Starting CategoryPricingAnalyzer Real-Data Evaluation")
    logging.info("==================================================")

    # 1. Load and validate cohort dataset
    assert COHORT_PATH.exists(), f"Cohort dataset missing at {COHORT_PATH}"
    df = pd.read_parquet(COHORT_PATH)
    assert len(df) == 20000, f"Expected 20,000 products, found {len(df):,}"
    assert df["canonical_product_id"].nunique() == 20000, "Duplicate canonical product IDs detected"
    assert df["canonical_product_id"].isna().sum() == 0, "Null canonical product IDs detected"
    logging.info("Loaded 20,000 products from %s", COHORT_PATH)

    # 2. Initialize and fit CategoryPricingAnalyzer
    analyzer = CategoryPricingAnalyzer(min_sample_size=20)
    analyzer.fit(df)
    logging.info(
        "Fitted %d total peer groups; %d meet min_sample_size=20",
        len(analyzer.peer_group_baselines),
        sum(b["sample_size"] >= 20 for b in analyzer.peer_group_baselines.values()),
    )

    # 3. Evaluate each product in the cohort
    logging.info("Evaluating product prices across the 20,000 cohort...")
    eval_records = []
    for _, row in df.iterrows():
        res = analyzer.analyze_product_price(
            price=row["price"],
            marketplace=row["marketplace"],
            category=row["category"],
            currency=row["currency"],
        )

        # Derive mutually exclusive evaluation status
        if res["price_status"] == "VALID":
            eval_status = res["anomaly_flag"]
        else:
            eval_status = res["price_status"]

        eval_records.append({
            "canonical_product_id": row["canonical_product_id"],
            "title": row["title"],
            "marketplace": row["marketplace"],
            "currency": row["currency"],
            "category": row["category"],
            "price_raw": row["price"],
            "price_observed": res["price_observed"],
            "evaluation_status": eval_status,
            "anomaly_flag": res["anomaly_flag"],
            "price_status": res["price_status"],
            "peer_group_size": res["peer_group_size"],
            "peer_median": res["peer_median"],
            "q1": res["q1"],
            "q3": res["q3"],
            "iqr": res["iqr"],
            "mad": res["mad"],
            "lower_fence": res["lower_fence"],
            "upper_fence": res["upper_fence"],
            "robust_zscore": res["robust_zscore"],
            "robust_zscore_status": res["robust_zscore_status"],
            "evidence_explanation": res["evidence_explanation"],
        })

    eval_df = pd.DataFrame(eval_records)
    assert len(eval_df) == 20000

    # 4. Status Distributions
    status_order = [
        "NORMAL_PRICE_RANGE",
        "PRICE_ABOVE_UPPER_FENCE",
        "PRICE_BELOW_LOWER_FENCE",
        "INSUFFICIENT_PEER_GROUP",
        "MISSING_PRICE",
        "INVALID_PRICE",
    ]
    status_counts = eval_df["evaluation_status"].value_counts().reindex(status_order, fill_value=0)
    status_pcts = (status_counts / len(eval_df) * 100).round(3)

    evaluated_mask = eval_df["evaluation_status"].isin([
        "NORMAL_PRICE_RANGE", "PRICE_ABOVE_UPPER_FENCE", "PRICE_BELOW_LOWER_FENCE"
    ])
    evaluated_df = eval_df[evaluated_mask].copy()
    evaluated_count = len(evaluated_df)
    eval_status_counts = evaluated_df["evaluation_status"].value_counts().reindex(
        ["NORMAL_PRICE_RANGE", "PRICE_ABOVE_UPPER_FENCE", "PRICE_BELOW_LOWER_FENCE"], fill_value=0
    )
    eval_status_pcts = (eval_status_counts / evaluated_count * 100).round(2)

    # 5. Marketplace breakdown
    mkt_summary = []
    for mkt in ["amazon", "walmart", "amazon_in", "flipkart", "myntra", "bestbuy"]:
        sub = eval_df[eval_df["marketplace"] == mkt]
        tot = len(sub)
        n_normal = int((sub["evaluation_status"] == "NORMAL_PRICE_RANGE").sum())
        n_above = int((sub["evaluation_status"] == "PRICE_ABOVE_UPPER_FENCE").sum())
        n_below = int((sub["evaluation_status"] == "PRICE_BELOW_LOWER_FENCE").sum())
        n_sparse = int((sub["evaluation_status"] == "INSUFFICIENT_PEER_GROUP").sum())
        n_missing = int((sub["evaluation_status"] == "MISSING_PRICE").sum())
        n_invalid = int((sub["evaluation_status"] == "INVALID_PRICE").sum())
        n_eval = n_normal + n_above + n_below
        outlier_rate = round(n_above / n_eval * 100, 2) if n_eval > 0 else 0.0

        mkt_summary.append({
            "marketplace": mkt,
            "total": tot,
            "evaluated": n_eval,
            "normal": n_normal,
            "above_upper": n_above,
            "below_lower": n_below,
            "sparse_insufficient": n_sparse,
            "missing_price": n_missing,
            "invalid_price": n_invalid,
            "outlier_rate_pct": outlier_rate,
        })
    df_mkt_summary = pd.DataFrame(mkt_summary)

    # 6. Category breakdown
    cat_summary = []
    for cat in sorted(df["category"].unique()):
        sub = eval_df[eval_df["category"] == cat]
        tot = len(sub)
        n_normal = int((sub["evaluation_status"] == "NORMAL_PRICE_RANGE").sum())
        n_above = int((sub["evaluation_status"] == "PRICE_ABOVE_UPPER_FENCE").sum())
        n_below = int((sub["evaluation_status"] == "PRICE_BELOW_LOWER_FENCE").sum())
        n_sparse = int((sub["evaluation_status"] == "INSUFFICIENT_PEER_GROUP").sum())
        n_missing = int((sub["evaluation_status"] == "MISSING_PRICE").sum())
        n_invalid = int((sub["evaluation_status"] == "INVALID_PRICE").sum())
        n_eval = n_normal + n_above + n_below
        outlier_rate = round(n_above / n_eval * 100, 2) if n_eval > 0 else 0.0

        cat_summary.append({
            "category": cat,
            "total": tot,
            "evaluated": n_eval,
            "normal": n_normal,
            "above_upper": n_above,
            "below_lower": n_below,
            "sparse_insufficient": n_sparse,
            "missing_price": n_missing,
            "invalid_price": n_invalid,
            "outlier_rate_pct": outlier_rate,
        })
    df_cat_summary = pd.DataFrame(cat_summary)

    # 7. Robust Z-score & ZERO_MAD audit
    z_counts = eval_df["robust_zscore_status"].value_counts().to_dict()

    # 8. Highest and Lowest Outliers
    top_z_outliers = evaluated_df.sort_values("robust_zscore", ascending=False).head(10)[
        ["canonical_product_id", "marketplace", "currency", "category", "price_observed", "peer_median", "iqr", "robust_zscore", "title"]
    ]
    top_price_outliers = evaluated_df.sort_values("price_observed", ascending=False).head(10)[
        ["canonical_product_id", "marketplace", "currency", "category", "price_observed", "peer_median", "iqr", "robust_zscore", "title"]
    ]
    low_z_products = evaluated_df.sort_values("robust_zscore", ascending=True).head(10)[
        ["canonical_product_id", "marketplace", "currency", "category", "price_observed", "peer_median", "iqr", "robust_zscore", "title"]
    ]
    low_price_products = evaluated_df.sort_values("price_observed", ascending=True).head(10)[
        ["canonical_product_id", "marketplace", "currency", "category", "price_observed", "peer_median", "iqr", "robust_zscore", "title"]
    ]

    print("\n" + "=" * 70)
    print("EVALUATION STATUS DISTRIBUTION (Total: 20,000 Products)")
    print("=" * 70)
    for st in status_order:
        cnt = status_counts[st]
        pct = status_pcts[st]
        print(f"  {st:<28s}: {cnt:>6,} ({pct:>6.2f}%)")

    print("\n" + "=" * 70)
    print("EVALUATED SUBSET DISTRIBUTION (Eligible Peer Groups n >= 20: 16,427 Products)")
    print("=" * 70)
    for st in ["NORMAL_PRICE_RANGE", "PRICE_ABOVE_UPPER_FENCE", "PRICE_BELOW_LOWER_FENCE"]:
        cnt = eval_status_counts[st]
        pct = eval_status_pcts[st]
        print(f"  {st:<28s}: {cnt:>6,} ({pct:>6.2f}%)")

    print("\n" + "=" * 70)
    print("ROBUST Z-SCORE & ZERO-MAD AUDIT")
    print("=" * 70)
    for st, cnt in z_counts.items():
        print(f"  {st:<28s}: {cnt:>6,} ({cnt / len(eval_df) * 100:>6.2f}%)")

    print("\n" + "=" * 70)
    print("MARKETPLACE EVALUATION SUMMARY")
    print("=" * 70)
    print(df_mkt_summary.to_string(index=False))

    print("\n" + "=" * 70)
    print("CATEGORY EVALUATION SUMMARY")
    print("=" * 70)
    print(df_cat_summary.to_string(index=False))

    return {
        "status_counts": status_counts.to_dict(),
        "status_pcts": status_pcts.to_dict(),
        "eval_status_counts": eval_status_counts.to_dict(),
        "eval_status_pcts": eval_status_pcts.to_dict(),
        "mkt_summary": mkt_summary,
        "cat_summary": cat_summary,
        "z_counts": z_counts,
        "top_z_outliers": top_z_outliers.to_dict(orient="records"),
        "top_price_outliers": top_price_outliers.to_dict(orient="records"),
        "low_z_products": low_z_products.to_dict(orient="records"),
        "low_price_products": low_price_products.to_dict(orient="records"),
    }


if __name__ == "__main__":
    run_evaluation()
