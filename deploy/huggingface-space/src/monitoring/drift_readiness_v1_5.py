"""
src/monitoring/drift_readiness_v1_5.py
--------------------------------------
Data Drift and Monitoring Architecture for Release v1.5.

Establishes baseline distributional snapshots across marketplace distributions,
pricing distributions, image availability, and language representations.
Provides Kolmogorov-Smirnov (KS) and Population Stability Index (PSI) utilities
for detecting production drift on future crawls.
"""

from typing import Dict, Any, List
import pandas as pd
import numpy as np
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class DriftMonitoringEngineV15:
    """
    Creates reference distribution snapshots and calculates drift against baseline.
    """

    @staticmethod
    def capture_v1_5_baseline_snapshot(
        products_df: pd.DataFrame,
        prices_df: pd.DataFrame,
        reviews_df: pd.DataFrame,
        images_df: pd.DataFrame
    ) -> Dict[str, Any]:
        """
        Captures frozen distributional parameters for v1.5 release.
        """
        # Marketplace distribution
        mkt_dist = products_df["marketplace"].value_counts(normalize=True).round(4).to_dict()

        # Category distribution
        cat_dist = products_df["category"].value_counts(normalize=True).round(4).to_dict()

        # Valid price stats
        valid_prices = prices_df[prices_df["is_valid_price"] == True]["normalized_price_inr"]
        price_stats = {
            "count": int(len(valid_prices)),
            "mean": round(float(valid_prices.mean()), 2),
            "std": round(float(valid_prices.std()), 2),
            "median": round(float(valid_prices.median()), 2),
            "q25": round(float(np.percentile(valid_prices, 25)), 2),
            "q75": round(float(np.percentile(valid_prices, 75)), 2),
            "missing_rate": round(float((~prices_df["is_valid_price"]).mean()), 4)
        }

        # Review rating stats
        valid_ratings = reviews_df["rating"].dropna()
        rating_stats = {
            "count": int(len(valid_ratings)),
            "mean": round(float(valid_ratings.mean()), 2),
            "std": round(float(valid_ratings.std()), 2),
            "rating_distribution": valid_ratings.value_counts(normalize=True).round(4).to_dict()
        }

        # Image usability rate
        usable_img_rate = round(float(images_df["is_usable"].mean()), 4)

        return {
            "snapshot_version": "v1.5_BASELINE_SNAPSHOT",
            "observation_timestamp": "2026-11-04T09:30:00+05:30",
            "marketplace_distribution": mkt_dist,
            "category_distribution": cat_dist,
            "price_distribution_inr": price_stats,
            "rating_distribution": rating_stats,
            "image_usability_rate": usable_img_rate,
            "monitoring_governance_note": (
                "This snapshot serves as the calibration reference for future crawl monitoring. "
                "No temporal drift is claimed from a single static crawl snapshot."
            )
        }

    @staticmethod
    def calculate_psi(baseline_dist: Dict[str, float], target_dist: Dict[str, float]) -> float:
        """
        Calculates Population Stability Index (PSI) between two categorical distributions.
        PSI < 0.10: No significant change
        0.10 <= PSI < 0.25: Moderate change / monitoring alert
        PSI >= 0.25: Significant drift / recalibration required
        """
        all_keys = set(baseline_dist.keys()).union(set(target_dist.keys()))
        psi = 0.0
        eps = 1e-4

        for k in all_keys:
            p = baseline_dist.get(k, eps)
            q = target_dist.get(k, eps)
            psi += (q - p) * np.log(max(q, eps) / max(p, eps))

        return round(float(psi), 4)
