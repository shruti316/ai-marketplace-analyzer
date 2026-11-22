"""
src/pricing/anomaly_engine.py
-----------------------------
Robust Pricing Anomaly Engine with Category-Aware Fallbacks and Unsupervised Scoring.
"""

from typing import Dict, Any, Tuple
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest


class RobustPriceAnomalyEngine:
    """
    Computes robust category-aware price anomaly fences with minimum sample size fallbacks
    and unsupervised Isolation Forest anomaly scores.
    """

    def __init__(self, min_category_sample: int = 10):
        self.min_category_sample = min_category_sample

    def compute_category_fences(self, prices_df: pd.DataFrame) -> Dict[str, Dict[str, float]]:
        """
        Computes robust IQR fences per category with fallback to global metrics if sparse.
        """
        valid = prices_df[prices_df["is_valid_price"] & (prices_df["normalized_price_inr"] > 0)].copy()

        # Global baseline fallback
        g_q25 = valid["normalized_price_inr"].quantile(0.25)
        g_q75 = valid["normalized_price_inr"].quantile(0.75)
        g_iqr = g_q75 - g_q25
        global_fallback = {
            "q25": g_q25,
            "q75": g_q75,
            "iqr": g_iqr,
            "lower_fence": max(0.0, g_q25 - 1.5 * g_iqr),
            "upper_fence": g_q75 + 1.5 * g_iqr,
            "sample_size": len(valid),
            "is_fallback": True
        }

        fences = {"__GLOBAL__": global_fallback}

        # Category level
        if "category" in valid.columns:
            for cat, grp in valid.groupby("category"):
                if len(grp) >= self.min_category_sample:
                    q25 = grp["normalized_price_inr"].quantile(0.25)
                    q75 = grp["normalized_price_inr"].quantile(0.75)
                    iqr = q75 - q25
                    fences[cat] = {
                        "q25": q25,
                        "q75": q75,
                        "iqr": iqr,
                        "lower_fence": max(0.0, q25 - 1.5 * iqr),
                        "upper_fence": q75 + 1.5 * iqr,
                        "sample_size": len(grp),
                        "is_fallback": False
                    }
                else:
                    # Sparse category -> use global fallback
                    fences[cat] = {
                        "q25": g_q25,
                        "q75": g_q75,
                        "iqr": g_iqr,
                        "lower_fence": global_fallback["lower_fence"],
                        "upper_fence": global_fallback["upper_fence"],
                        "sample_size": len(grp),
                        "is_fallback": True
                    }

        return fences

    def score_price_anomalies(self, prices_df: pd.DataFrame,
                              categories_df: pd.DataFrame = None) -> pd.DataFrame:
        """
        Scores each price observation against robust fences and fits Isolation Forest.
        """
        df = prices_df.copy()
        if categories_df is not None and "category" in categories_df.columns:
            df = df.merge(categories_df[["canonical_product_id", "category"]], on="canonical_product_id", how="left")

        if "category" not in df.columns:
            df["category"] = "Uncategorized"

        fences = self.compute_category_fences(df)

        records = []
        for _, row in df.iterrows():
            pid = row["canonical_product_id"]
            p_obs_id = row.get("price_observation_id", f"PRC_{pid}")
            price = row.get("normalized_price_inr")
            cat = row.get("category", "Uncategorized")
            fence = fences.get(cat, fences["__GLOBAL__"])

            is_valid = row.get("is_valid_price", pd.notna(price) and price > 0)
            if not is_valid or pd.isna(price) or price <= 0:
                records.append({
                    "price_observation_id": p_obs_id,
                    "canonical_product_id": pid,
                    "normalized_price_inr": None,
                    "category": cat,
                    "lower_fence": fence["lower_fence"],
                    "upper_fence": fence["upper_fence"],
                    "is_below_lower_fence": False,
                    "is_above_upper_fence": False,
                    "price_iqr_ratio": 0.0,
                    "is_price_anomaly": False,
                    "anomaly_type": "NONE_MISSING_PRICE",
                    "sample_size": fence["sample_size"],
                    "is_fallback_fence": fence["is_fallback"]
                })
                continue

            is_below = bool(price < fence["lower_fence"])
            is_above = bool(price > fence["upper_fence"])
            iqr = fence["iqr"]
            ratio = (price - fence["q75"]) / iqr if iqr > 0 and price > fence["q75"] else (
                (fence["q25"] - price) / iqr if iqr > 0 and price < fence["q25"] else 0.0
            )

            anom_type = "NONE"
            if is_above:
                anom_type = "PRICE_ABOVE_UPPER_FENCE"
            elif is_below:
                anom_type = "PRICE_BELOW_LOWER_FENCE"

            records.append({
                "price_observation_id": p_obs_id,
                "canonical_product_id": pid,
                "normalized_price_inr": round(float(price), 2),
                "category": cat,
                "lower_fence": round(float(fence["lower_fence"]), 2),
                "upper_fence": round(float(fence["upper_fence"]), 2),
                "is_below_lower_fence": is_below,
                "is_above_upper_fence": is_above,
                "price_iqr_ratio": round(float(ratio), 4),
                "is_price_anomaly": (is_below or is_above),
                "anomaly_type": anom_type,
                "sample_size": fence["sample_size"],
                "is_fallback_fence": fence["is_fallback"]
            })

        out_df = pd.DataFrame(records)

        # Fit Isolation Forest on valid prices
        valid_idx = out_df[out_df["normalized_price_inr"].notna()].index
        if len(valid_idx) > 20:
            X = out_df.loc[valid_idx, ["normalized_price_inr"]].values
            iso = IsolationForest(contamination=0.05, random_state=42)
            preds = iso.fit_predict(X)
            scores = -iso.score_samples(X)  # higher = more anomalous

            out_df["isolation_forest_anomaly"] = False
            out_df.loc[valid_idx, "isolation_forest_anomaly"] = (preds == -1)
            out_df["isolation_forest_score"] = 0.0
            out_df.loc[valid_idx, "isolation_forest_score"] = np.round(scores, 4)
        else:
            out_df["isolation_forest_anomaly"] = False
            out_df["isolation_forest_score"] = 0.0

        return out_df
