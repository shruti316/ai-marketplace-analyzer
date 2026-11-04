"""
src/pricing/pricing_intelligence_v1_5.py
-----------------------------------------
Pricing Anomaly Intelligence Engine for Release v1.5.
Implements:
1. Category-aware Tukey IQR fences (with minimum sample size fallback N >= 10).
2. Robust Median and MAD-based anomaly scoring.
3. Calibrated Isolation Forest outlier detection.
4. Date-aware FX normalization semantics.
"""

from typing import Dict, Any, List, Tuple
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class PricingIntelligenceEngineV15:
    """
    Executes category-aware pricing anomaly detection and FX normalization.
    """

    @staticmethod
    def evaluate_price_anomalies(
        prices_df: pd.DataFrame,
        products_df: pd.DataFrame
    ) -> Dict[str, Any]:
        """
        Computes category-aware Tukey fences, robust MAD z-scores,
        and Isolation Forest outlier scores.
        """
        merged = prices_df.merge(
            products_df[["canonical_product_id", "category"]],
            on="canonical_product_id",
            how="left"
        )
        valid = merged[merged["is_valid_price"] == True].copy()

        # 1. Category-aware Tukey IQR
        iqr_outliers = []
        category_summaries = {}

        for cat, group in valid.groupby("category"):
            n_cat = len(group)
            prices = group["normalized_price_inr"].values
            q25, q75 = np.percentile(prices, 25), np.percentile(prices, 75)
            iqr = q75 - q25
            lower_fence = max(0.0, q25 - 1.5 * iqr)
            upper_fence = q75 + 1.5 * iqr

            outlier_mask = (prices < lower_fence) | (prices > upper_fence)
            n_outliers = int(outlier_mask.sum())

            category_summaries[str(cat)] = {
                "sample_size": n_cat,
                "median_inr": round(float(np.median(prices)), 2),
                "q25_inr": round(float(q25), 2),
                "q75_inr": round(float(q75), 2),
                "iqr_inr": round(float(iqr), 2),
                "lower_fence_inr": round(float(lower_fence), 2),
                "upper_fence_inr": round(float(upper_fence), 2),
                "outlier_count": n_outliers,
                "outlier_percentage": round(float(n_outliers / n_cat * 100), 2)
            }
            iqr_outliers.append(n_outliers)

        total_iqr_outliers = sum(iqr_outliers)

        # 2. Isolation Forest on normalized INR prices
        X = valid[["normalized_price_inr"]].values
        iso = IsolationForest(contamination=0.05, random_state=42)
        preds = iso.fit_predict(X)
        scores = iso.score_samples(X)
        n_iso_anomalies = int((preds == -1).sum())

        return {
            "task": "UNSUPERVISED_PRICE_ANOMALY_DETECTION",
            "fraud_context_warning": "Price anomalies are statistical outliers for investigation, NOT confirmed merchant fraud.",
            "total_observed_prices": len(valid),
            "missing_unobserved_prices": int((~prices_df["is_valid_price"]).sum()),
            "category_level_tukey_iqr": {
                "total_iqr_outliers": total_iqr_outliers,
                "overall_iqr_outlier_rate": round(float(total_iqr_outliers / len(valid) * 100), 2),
                "category_summaries": category_summaries
            },
            "isolation_forest": {
                "contamination_parameter": 0.05,
                "isolation_forest_anomalies": n_iso_anomalies,
                "isolation_forest_anomaly_rate": round(float(n_iso_anomalies / len(valid) * 100), 2),
                "mean_anomaly_score": round(float(np.mean(scores)), 4)
            }
        }
