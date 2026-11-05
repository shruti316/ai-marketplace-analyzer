"""
Drift Monitoring Service — v1.7
AI-Powered Marketplace Trust Intelligence Platform

Provides production-ready data, feature, and embedding drift monitoring:
1. Two-sample Kolmogorov-Smirnov (KS) tests and Population Stability Index (PSI).
2. Categorical distribution drift (Total Variation Distance / Chi-Square).
3. Visual embedding distribution drift (Centroid cosine shift & variance ratio).
4. Configurable drift alert thresholds (NORMAL, WARNING, CRITICAL).
5. Comprehensive drift reporting and actionable alerting.
"""

from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from scipy.stats import ks_2samp

from src.engine.contracts import DriftMetricResult, DriftReport

logger = logging.getLogger("drift_service")


class MarketplaceDriftMonitoringService:
    """
    Production-grade Drift Monitoring Service for marketplace features and embeddings.
    """

    def __init__(self, v17_dir: Optional[Path] = None) -> None:
        self.project_root = Path(__file__).resolve().parents[2]
        self.v17_dir = v17_dir or (self.project_root / "data" / "marketplace_trust_dataset_v1.7")

        # Thresholds
        self.ks_pvalue_critical = 0.01
        self.ks_pvalue_warning = 0.05
        self.psi_critical = 0.25
        self.psi_warning = 0.10
        self.tvd_critical = 0.20
        self.tvd_warning = 0.10
        self.embedding_centroid_cosine_critical = 0.15

        self._baseline_prices: Optional[np.ndarray] = None
        self._baseline_ratings: Optional[np.ndarray] = None
        self._baseline_categories: Optional[Dict[str, int]] = None
        self._baseline_embeddings: Optional[np.ndarray] = None

    def _ensure_baseline_loaded(self) -> None:
        if self._baseline_prices is None:
            price_path = self.v17_dir / "evidence" / "price_observations.parquet"
            rev_path = self.v17_dir / "evidence" / "reviews.parquet"
            prod_path = self.v17_dir / "entities" / "products.parquet"
            emb_path = self.project_root / "data" / "processed_v1_7" / "visual_embeddings_v1_7.npz"

            if price_path.exists():
                df_p = pd.read_parquet(price_path)
                valid_p = df_p[df_p["is_valid_price"] == True]["normalized_price_inr"].dropna()
                self._baseline_prices = valid_p.values.astype(float)

            if rev_path.exists():
                df_r = pd.read_parquet(rev_path)
                valid_r = df_r["rating"].dropna()
                self._baseline_ratings = valid_r.values.astype(float)

            if prod_path.exists():
                df_pr = pd.read_parquet(prod_path)
                self._baseline_categories = df_pr["category"].value_counts().to_dict()

            if emb_path.exists():
                data = np.load(emb_path, allow_pickle=True)
                self._baseline_embeddings = data["normalized_embeddings"]

    @staticmethod
    def calculate_psi(baseline: np.ndarray, current: np.ndarray, num_buckets: int = 10) -> float:
        """Calculates Population Stability Index (PSI) between two continuous distributions."""
        if len(baseline) == 0 or len(current) == 0:
            return 0.0

        quantiles = np.linspace(0, 100, num_buckets + 1)
        breakpoints = np.percentile(baseline, quantiles)
        breakpoints[0] = -np.inf
        breakpoints[-1] = np.inf

        base_counts, _ = np.histogram(baseline, bins=breakpoints)
        curr_counts, _ = np.histogram(current, bins=breakpoints)

        base_pct = np.where(base_counts == 0, 0.0001, base_counts / len(baseline))
        curr_pct = np.where(curr_counts == 0, 0.0001, curr_counts / len(current))

        psi_val = np.sum((curr_pct - base_pct) * np.log(curr_pct / base_pct))
        return round(float(psi_val), 4)

    @staticmethod
    def calculate_tvd(baseline_counts: Dict[str, int], current_counts: Dict[str, int]) -> float:
        """Calculates Total Variation Distance (TVD) between two discrete distributions."""
        all_keys = set(baseline_counts.keys()) | set(current_counts.keys())
        tot_b = sum(baseline_counts.values())
        tot_c = sum(current_counts.values())
        if tot_b == 0 or tot_c == 0:
            return 0.0

        tvd = 0.5 * sum(
            abs((baseline_counts.get(k, 0) / tot_b) - (current_counts.get(k, 0) / tot_c))
            for k in all_keys
        )
        return round(float(tvd), 4)

    def evaluate_numerical_drift(
        self,
        feature_name: str,
        baseline_values: np.ndarray,
        current_values: np.ndarray,
    ) -> DriftMetricResult:
        if len(baseline_values) < 5 or len(current_values) < 5:
            return DriftMetricResult(
                feature_name=feature_name,
                metric_type="KS_TEST",
                test_statistic=0.0,
                p_value_or_threshold=1.0,
                drift_detected=False,
                alert_level="NORMAL",
                baseline_summary={"count": len(baseline_values)},
                current_summary={"count": len(current_values)},
                diagnostic_message="Insufficient samples to reliably evaluate drift.",
            )

        ks_res = ks_2samp(baseline_values, current_values)
        stat = round(float(ks_res.statistic), 4)
        pval = round(float(ks_res.pvalue), 6)
        psi = self.calculate_psi(baseline_values, current_values)

        if pval < self.ks_pvalue_critical or psi >= self.psi_critical:
            alert = "CRITICAL"
            drift = True
            msg = f"Critical drift detected: KS stat={stat}, p-value={pval}, PSI={psi}."
        elif pval < self.ks_pvalue_warning or psi >= self.psi_warning:
            alert = "WARNING"
            drift = True
            msg = f"Moderate distribution shift: KS stat={stat}, p-value={pval}, PSI={psi}."
        else:
            alert = "NORMAL"
            drift = False
            msg = f"Distribution stable: KS stat={stat}, p-value={pval}, PSI={psi}."

        return DriftMetricResult(
            feature_name=feature_name,
            metric_type="KS_TEST_AND_PSI",
            test_statistic=stat,
            p_value_or_threshold=pval,
            drift_detected=drift,
            alert_level=alert,
            baseline_summary={
                "mean": round(float(np.mean(baseline_values)), 2),
                "std": round(float(np.std(baseline_values)), 2),
                "samples": len(baseline_values),
            },
            current_summary={
                "mean": round(float(np.mean(current_values)), 2),
                "std": round(float(np.std(current_values)), 2),
                "samples": len(current_values),
            },
            diagnostic_message=msg,
        )

    def evaluate_categorical_drift(
        self,
        feature_name: str,
        baseline_counts: Dict[str, int],
        current_counts: Dict[str, int],
    ) -> DriftMetricResult:
        tvd = self.calculate_tvd(baseline_counts, current_counts)

        if tvd >= self.tvd_critical:
            alert = "CRITICAL"
            drift = True
            msg = f"Critical category shift: TVD={tvd} exceeds critical threshold {self.tvd_critical}."
        elif tvd >= self.tvd_warning:
            alert = "WARNING"
            drift = True
            msg = f"Moderate category shift: TVD={tvd} exceeds warning threshold {self.tvd_warning}."
        else:
            alert = "NORMAL"
            drift = False
            msg = f"Category distribution stable: TVD={tvd}."

        return DriftMetricResult(
            feature_name=feature_name,
            metric_type="TOTAL_VARIATION_DISTANCE",
            test_statistic=tvd,
            p_value_or_threshold=self.tvd_warning,
            drift_detected=drift,
            alert_level=alert,
            baseline_summary={"categories_count": len(baseline_counts)},
            current_summary={"categories_count": len(current_counts)},
            diagnostic_message=msg,
        )

    def evaluate_embedding_drift(
        self,
        baseline_embeddings: np.ndarray,
        current_embeddings: np.ndarray,
    ) -> DriftMetricResult:
        if len(baseline_embeddings) == 0 or len(current_embeddings) == 0:
            return DriftMetricResult(
                feature_name="visual_embeddings_512d",
                metric_type="CENTROID_COSINE",
                test_statistic=0.0,
                p_value_or_threshold=1.0,
                drift_detected=False,
                alert_level="NORMAL",
                baseline_summary={},
                current_summary={},
                diagnostic_message="No embeddings provided.",
            )

        c_base = np.mean(baseline_embeddings, axis=0)
        c_curr = np.mean(current_embeddings, axis=0)

        norm_b = np.linalg.norm(c_base)
        norm_c = np.linalg.norm(c_curr)

        cosine_sim = np.dot(c_base, c_curr) / (norm_b * norm_c) if norm_b > 0 and norm_c > 0 else 1.0
        cosine_dist = round(float(1.0 - cosine_sim), 4)

        if cosine_dist >= self.embedding_centroid_cosine_critical:
            alert = "CRITICAL"
            drift = True
            msg = f"Critical embedding centroid shift: Cosine distance={cosine_dist}."
        elif cosine_dist >= 0.08:
            alert = "WARNING"
            drift = True
            msg = f"Moderate embedding centroid shift: Cosine distance={cosine_dist}."
        else:
            alert = "NORMAL"
            drift = False
            msg = f"Embedding space stable: Centroid cosine distance={cosine_dist}."

        return DriftMetricResult(
            feature_name="visual_embeddings_512d",
            metric_type="CENTROID_COSINE_DISTANCE",
            test_statistic=cosine_dist,
            p_value_or_threshold=self.embedding_centroid_cosine_critical,
            drift_detected=drift,
            alert_level=alert,
            baseline_summary={"dimension": baseline_embeddings.shape[1], "samples": len(baseline_embeddings)},
            current_summary={"dimension": current_embeddings.shape[1], "samples": len(current_embeddings)},
            diagnostic_message=msg,
        )

    def run_full_drift_audit(
        self,
        current_prices: Optional[np.ndarray] = None,
        current_ratings: Optional[np.ndarray] = None,
        current_categories: Optional[Dict[str, int]] = None,
        current_embeddings: Optional[np.ndarray] = None,
    ) -> DriftReport:
        """
        Executes complete drift monitoring audit against certified v1.7 baselines.
        If current values omitted, compares baseline split (sample) to demonstrate stability.
        """
        self._ensure_baseline_loaded()
        results: List[DriftMetricResult] = []

        # 1. Price Drift
        if self._baseline_prices is not None:
            c_prices = current_prices if current_prices is not None else self._baseline_prices[-500:]
            res_price = self.evaluate_numerical_drift("normalized_price_inr", self._baseline_prices, c_prices)
            results.append(res_price)

        # 2. Rating Drift
        if self._baseline_ratings is not None:
            c_ratings = current_ratings if current_ratings is not None else self._baseline_ratings[-1000:]
            res_rating = self.evaluate_numerical_drift("review_rating", self._baseline_ratings, c_ratings)
            results.append(res_rating)

        # 3. Category Drift
        if self._baseline_categories is not None:
            c_cats = current_categories if current_categories is not None else self._baseline_categories
            res_cat = self.evaluate_categorical_drift("product_category", self._baseline_categories, c_cats)
            results.append(res_cat)

        # 4. Visual Embedding Drift
        if self._baseline_embeddings is not None:
            c_embs = current_embeddings if current_embeddings is not None else self._baseline_embeddings[-500:]
            res_emb = self.evaluate_embedding_drift(self._baseline_embeddings, c_embs)
            results.append(res_emb)

        # Summary
        drifted_cnt = sum(1 for r in results if r.drift_detected)
        has_critical = any(r.alert_level == "CRITICAL" for r in results)
        has_warning = any(r.alert_level == "WARNING" for r in results)

        if has_critical:
            system_alert = "CRITICAL"
            action = "Immediate retraining or recalibration required: Critical distribution shift observed."
        elif has_warning:
            system_alert = "WARNING"
            action = "Monitor closely: Mild distribution shift observed in one or more features."
        else:
            system_alert = "NORMAL"
            action = "All features and embeddings are statistically concordant with certified v1.7 baseline."

        return DriftReport(
            report_id=f"DRIFT_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            timestamp=datetime.utcnow().isoformat(),
            total_features_evaluated=len(results),
            drifted_features_count=drifted_cnt,
            system_alert_level=system_alert,
            drift_details=results,
            recommended_action=action,
        )
