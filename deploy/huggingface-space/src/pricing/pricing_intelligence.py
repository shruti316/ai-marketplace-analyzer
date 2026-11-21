"""
Advanced Pricing Intelligence Pipeline
AI-Powered Indian Marketplace Trust Intelligence Platform

Implements category-wise, brand-wise, and marketplace-wise price benchmarks,
robust median & IQR-based price anomaly detection, MRP vs selling price consistency,
hierarchical price corridor generation, and append-only snapshot management.
"""

from collections import defaultdict
import datetime
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

logger = logging.getLogger("PricingIntelligence")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class RobustStatsCalculator:
    """Computes robust non-parametric statistics (Median, IQR, MAD)."""

    @staticmethod
    def compute_stats(values: List[float]) -> Dict[str, float]:
        """Calculates median, Q1, Q3, IQR, and Median Absolute Deviation (MAD)."""
        valid = [v for v in values if v is not None and not np.isnan(v) and v > 0]
        if not valid:
            return {
                "count": 0, "median": 0.0, "q1": 0.0, "q3": 0.0,
                "iqr": 0.0, "mad": 0.0, "corridor_lower": 0.0, "corridor_upper": 0.0
            }

        arr = np.array(valid, dtype=np.float64)
        med = float(np.median(arr))
        q1 = float(np.percentile(arr, 25))
        q3 = float(np.percentile(arr, 75))
        iqr = float(q3 - q1)

        # Median Absolute Deviation (MAD)
        mad = float(np.median(np.abs(arr - med)))
        if mad == 0.0:
            mad = float(np.std(arr)) if np.std(arr) > 0 else 1.0

        # Effective IQR fence prevents zero-width corridor collapse on uniform prices
        iqr_effective = max(iqr, 0.10 * med) if med > 0 else (iqr if iqr > 0 else 1.0)
        corridor_lower = max(0.0, float(q1 - 1.5 * iqr_effective))
        corridor_upper = float(q3 + 1.5 * iqr_effective)

        return {
            "count": len(valid),
            "median": round(med, 2),
            "q1": round(q1, 2),
            "q3": round(q3, 2),
            "iqr": round(iqr, 2),
            "mad": round(mad, 2),
            "corridor_lower": round(corridor_lower, 2),
            "corridor_upper": round(corridor_upper, 2),
        }

    @staticmethod
    def compute_robust_zscore(value: float, median: float, mad: float) -> float:
        """Calculates robust z-score: (x - median) / (1.4826 * MAD)."""
        if mad <= 0.0:
            return 0.0
        scale = 1.4826 * mad
        z = (value - median) / scale
        return round(float(z), 3)


class MRPConsistencyChecker:
    """Audits MRP versus selling-price consistency and discount anomalies."""

    @staticmethod
    def audit_mrp_and_discount(selling_price: Optional[float], mrp: Optional[float]) -> Dict[str, Any]:
        """Audits consistency between declared MRP and observed selling price."""
        if selling_price is None or np.isnan(selling_price) or selling_price <= 0:
            return {
                "is_mrp_present": False,
                "is_selling_price_valid": False,
                "selling_exceeds_mrp": False,
                "discount_percentage": 0.0,
                "is_negative_discount": False,
                "is_deep_discount": False,
                "is_extreme_discount": False,
                "mrp_consistency_status": "MISSING_PRICE",
            }

        sp = float(selling_price)
        has_mrp = (mrp is not None and not np.isnan(mrp) and mrp > 0)

        if not has_mrp:
            return {
                "is_mrp_present": False,
                "is_selling_price_valid": True,
                "selling_exceeds_mrp": False,
                "discount_percentage": 0.0,
                "is_negative_discount": False,
                "is_deep_discount": False,
                "is_extreme_discount": False,
                "mrp_consistency_status": "MRP_NOT_DECLARED",
            }

        mrp_val = float(mrp)
        selling_exceeds_mrp = (sp > mrp_val)
        disc_pct = round(((mrp_val - sp) / mrp_val) * 100.0, 2)

        is_negative_disc = (disc_pct < 0.0)
        is_deep_disc = (disc_pct >= 80.0)
        is_extreme_disc = (disc_pct >= 90.0)

        if selling_exceeds_mrp:
            status = "SELLING_PRICE_EXCEEDS_DECLARED_MRP"
        elif is_extreme_disc:
            status = "EXTREME_DISCOUNT_ANOMALY"
        elif is_deep_disc:
            status = "HIGH_DISCOUNT_PROMOTION"
        else:
            status = "CONSISTENT_CATALOG_PRICING"

        return {
            "is_mrp_present": True,
            "is_selling_price_valid": True,
            "selling_exceeds_mrp": selling_exceeds_mrp,
            "discount_percentage": disc_pct,
            "is_negative_discount": is_negative_disc,
            "is_deep_discount": is_deep_disc,
            "is_extreme_discount": is_extreme_disc,
            "mrp_consistency_status": status,
        }


class PricingIntelligenceEngine:
    """
    Master pipeline for advanced pricing benchmarks, corridors,
    and anomaly detection across Indian marketplaces.
    """

    def __init__(self, price_obs_df: pd.DataFrame, products_df: pd.DataFrame):
        self.price_obs_df = price_obs_df.copy()
        self.products_df = products_df.copy()

    def compute_benchmarks(self) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """Computes category-wise, brand-wise, and marketplace-wise price benchmarks."""
        # Join product metadata with price observations
        merged = self.price_obs_df.merge(
            self.products_df[["canonical_product_id", "category", "subcategory", "brand"]],
            on="canonical_product_id",
            how="left"
        )

        # 1. Category & Subcategory Benchmarks
        cat_records = []
        for (cat, subcat), grp in merged.groupby(["category", "subcategory"]):
            prices = grp["normalized_price_inr"].dropna().tolist()
            stats = RobustStatsCalculator.compute_stats(prices)
            cat_records.append({
                "category": cat,
                "subcategory": subcat,
                "sample_count": stats["count"],
                "median_price_inr": stats["median"],
                "q1_price_inr": stats["q1"],
                "q3_price_inr": stats["q3"],
                "iqr_inr": stats["iqr"],
                "mad_inr": stats["mad"],
                "corridor_lower_inr": stats["corridor_lower"],
                "corridor_upper_inr": stats["corridor_upper"],
                "provenance": "ROBUST_SUBCATEGORY_CORRIDOR",
            })
        category_benchmarks_df = pd.DataFrame(cat_records)

        # 2. Brand Benchmarks
        brand_records = []
        for brand, grp in merged.groupby("brand"):
            prices = grp["normalized_price_inr"].dropna().tolist()
            stats = RobustStatsCalculator.compute_stats(prices)
            is_reliable = (stats["count"] >= 5)
            brand_records.append({
                "brand": brand,
                "sample_count": stats["count"],
                "is_brand_benchmark_reliable": is_reliable,
                "sample_size_flag": "RELIABLE_SAMPLE_SIZE" if is_reliable else "INSUFFICIENT_SAMPLE_SIZE_WIDE_CORRIDOR",
                "median_price_inr": stats["median"],
                "q1_price_inr": stats["q1"],
                "q3_price_inr": stats["q3"],
                "iqr_inr": stats["iqr"],
                "mad_inr": stats["mad"],
                "corridor_lower_inr": stats["corridor_lower"],
                "corridor_upper_inr": stats["corridor_upper"],
                "provenance": "ROBUST_BRAND_CORRIDOR",
            })
        brand_benchmarks_df = pd.DataFrame(brand_records)

        # 3. Marketplace Benchmarks
        mkt_records = []
        for mkt, grp in merged.groupby("marketplace"):
            prices = grp["normalized_price_inr"].dropna().tolist()
            discounts = grp["discount_percentage"].dropna().tolist()
            stats = RobustStatsCalculator.compute_stats(prices)
            mkt_records.append({
                "marketplace": mkt,
                "sample_count": stats["count"],
                "median_price_inr": stats["median"],
                "q1_price_inr": stats["q1"],
                "q3_price_inr": stats["q3"],
                "iqr_inr": stats["iqr"],
                "mean_discount_percentage": round(float(np.mean(discounts)), 2) if discounts else 0.0,
                "median_discount_percentage": round(float(np.median(discounts)), 2) if discounts else 0.0,
                "provenance": "MARKETPLACE_PRICE_BENCHMARK",
            })
        marketplace_benchmarks_df = pd.DataFrame(mkt_records)

        return category_benchmarks_df, brand_benchmarks_df, marketplace_benchmarks_df

    def run_pipeline(self) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, Dict[str, Any]]:
        """Executes full pricing intelligence pipeline and generates pricing features table."""
        logger.info("Executing Advanced Pricing Intelligence Pipeline...")
        cat_df, brand_df, mkt_df = self.compute_benchmarks()

        # Build lookup dictionaries
        subcat_map = cat_df.set_index(["category", "subcategory"]).to_dict(orient="index")
        brand_map = brand_df.set_index("brand").to_dict(orient="index")

        # Map latest observed price per canonical product
        obs_grouped = self.price_obs_df.groupby("canonical_product_id")
        latest_prices = obs_grouped.last()
        obs_counts = obs_grouped.size().to_dict()

        features_records = []
        for idx, row in self.products_df.iterrows():
            pid = str(row["canonical_product_id"])
            cat = str(row.get("category", ""))
            subcat = str(row.get("subcategory", ""))
            brand = str(row.get("brand", ""))
            mkt = str(row.get("marketplace", ""))

            p_obs = latest_prices.loc[pid] if pid in latest_prices.index else None
            sp = float(p_obs["selling_price"]) if p_obs is not None and pd.notna(p_obs.get("selling_price")) else None
            mrp = float(p_obs["mrp"]) if p_obs is not None and pd.notna(p_obs.get("mrp")) else None
            obs_cnt = obs_counts.get(pid, 1)

            # MRP & discount audit
            mrp_info = MRPConsistencyChecker.audit_mrp_and_discount(sp, mrp)

            # Subcategory corridor lookup
            subcat_stats = subcat_map.get((cat, subcat), {
                "median_price_inr": sp or 0.0, "mad_inr": 1.0,
                "corridor_lower_inr": 0.0, "corridor_upper_inr": (sp or 0.0) * 3.0,
                "sample_count": 1
            })

            # Brand corridor lookup
            brand_stats = brand_map.get(brand, None)
            use_brand_corridor = (brand_stats is not None and brand_stats.get("is_brand_benchmark_reliable", False))

            # Compute robust z-score against subcategory benchmark
            if sp is not None and subcat_stats["mad_inr"] > 0:
                robust_z = RobustStatsCalculator.compute_robust_zscore(
                    sp, subcat_stats["median_price_inr"], subcat_stats["mad_inr"]
                )
            else:
                robust_z = 0.0

            # Determine corridor bounds (hierarchical fallback: brand corridor if reliable, else subcategory)
            if use_brand_corridor:
                c_lower = brand_stats["corridor_lower_inr"]
                c_upper = brand_stats["corridor_upper_inr"]
                corridor_source = "HIERARCHICAL_BRAND_CORRIDOR"
            else:
                c_lower = subcat_stats["corridor_lower_inr"]
                c_upper = subcat_stats["corridor_upper_inr"]
                corridor_source = "SUBCATEGORY_BENCHMARK_CORRIDOR"

            # Price anomaly determination
            is_corridor_outlier = (sp is not None) and (sp < c_lower or sp > c_upper)
            is_extreme_outlier = (sp is not None) and (abs(robust_z) >= 3.0)

            # Signal flags
            selling_exceeds_mrp_signal = mrp_info["selling_exceeds_mrp"]
            discount_anomaly_signal = mrp_info["is_extreme_discount"]
            price_outlier_signal = is_corridor_outlier or is_extreme_outlier

            # Explainable pricing risk signal
            if selling_exceeds_mrp_signal:
                risk_signal = "SELLING_EXCEEDS_DECLARED_MRP_SIGNAL"
            elif discount_anomaly_signal:
                risk_signal = "EXTREME_DISCOUNT_OUTLIER_SIGNAL"
            elif is_extreme_outlier:
                risk_signal = "EXTREME_PRICE_CORRIDOR_OUTLIER"
            elif is_corridor_outlier:
                risk_signal = "MODERATE_PRICE_CORRIDOR_OUTLIER"
            else:
                risk_signal = "WITHIN_EXPECTED_CORRIDOR"

            features_records.append({
                "canonical_product_id": pid,
                "marketplace": mkt,
                "category": cat,
                "subcategory": subcat,
                "brand": brand,
                "observed_price_inr": sp,
                "mrp_inr": mrp,
                "discount_percentage": mrp_info["discount_percentage"],
                "mrp_consistency_status": mrp_info["mrp_consistency_status"],
                "subcategory_median_price_inr": subcat_stats["median_price_inr"],
                "subcategory_mad_inr": subcat_stats["mad_inr"],
                "corridor_lower_inr": c_lower,
                "corridor_upper_inr": c_upper,
                "corridor_source": corridor_source,
                "robust_z_score": robust_z,
                "price_robust_zscore": robust_z,
                "is_price_outlier": price_outlier_signal,
                "is_extreme_price_outlier": is_extreme_outlier,
                "is_discount_anomaly": discount_anomaly_signal,
                "selling_exceeds_mrp": selling_exceeds_mrp_signal,
                "pricing_risk_signal": risk_signal,
                "historical_observations_count": obs_cnt,
                "is_historical_pricing_available": (obs_cnt > 1),
                "validation_status": "CALIBRATED_PRICING_INTELLIGENCE_V1_6",
            })

        features_df = pd.DataFrame(features_records)

        summary = {
            "total_products_benchmarked": len(features_df),
            "total_categories": len(cat_df["category"].unique()),
            "total_subcategories": len(cat_df),
            "reliable_brands_ge_5": int(brand_df["is_brand_benchmark_reliable"].sum()),
            "sparse_brands_lt_5": int((~brand_df["is_brand_benchmark_reliable"]).sum()),
            "price_corridor_outliers": int(features_df["is_price_outlier"].sum()),
            "extreme_price_outliers": int(features_df["is_extreme_price_outlier"].sum()),
            "selling_exceeds_mrp_count": int(features_df["selling_exceeds_mrp"].sum()),
            "extreme_discount_count": int(features_df["is_discount_anomaly"].sum()),
            "products_with_repeated_observations": int(features_df["is_historical_pricing_available"].sum()),
        }

        logger.info(f"Pricing Intelligence completed: {json.dumps(summary, indent=2)}")
        return features_df, cat_df, brand_df, summary
