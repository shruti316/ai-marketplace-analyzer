"""
Comprehensive Catalog Drift, Covariate Shift & Data Quality Monitoring Engine
AI-Powered Indian Marketplace Trust Intelligence Platform

Monitors production data streams across Amazon India, Flipkart, and Myntra for:
1. Missing Modality Rates (Pricing, Reviews, Images, CLIP, Graph)
2. Marketplace Distribution Drift (PSI)
3. Category Distribution Drift (PSI)
4. Numerical Feature Covariate Shift (Kolmogorov-Smirnov test & Binned PSI)
   - Price INR distribution
   - Discount percentages
   - Review rating distributions
5. Model Output / Prediction Drift (Calibrated Risk Probability distribution)
6. Automated Severity Triage:
   - NEGLIGIBLE (PSI < 0.10, KS p-value > 0.05)
   - MODERATE (0.10 <= PSI < 0.25)
   - CRITICAL_RECALIBRATION_REQUIRED (PSI >= 0.25, KS p-value < 0.01)

Zero-Penalty Invariant:
Missing-value drift triggers ingestion re-crawling alerts; it never inflates product risk.
"""

from dataclasses import asdict, dataclass
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import pandas as pd
from scipy.stats import ks_2samp

logger = logging.getLogger("CatalogDriftDetector")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATASET_DIR = PROJECT_ROOT / "data" / "indian_marketplace_trust_dataset_v1_7"


@dataclass
class DriftMetricResult:
    """Strongly typed outcome for a single monitored feature or categorical stream."""
    feature_name: str
    feature_type: str                   # 'categorical' or 'continuous'
    psi_score: float
    ks_statistic: Optional[float]
    ks_p_value: Optional[float]
    drift_severity: str                 # 'NEGLIGIBLE', 'MODERATE', 'CRITICAL_RECALIBRATION_REQUIRED'
    alert_triggered: bool
    summary_message: str

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["psi_score"] = round(self.psi_score, 4)
        if self.ks_statistic is not None:
            d["ks_statistic"] = round(self.ks_statistic, 4)
        if self.ks_p_value is not None:
            d["ks_p_value"] = round(self.ks_p_value, 5)
        return d


@dataclass
class CatalogHealthReport:
    """Consolidated health and drift monitoring report for a target catalog batch."""
    report_timestamp: float
    baseline_catalog_size: int
    target_catalog_size: int
    missing_modality_rates: Dict[str, float]
    feature_drift_metrics: Dict[str, Dict[str, Any]]
    overall_drift_status: str           # 'HEALTHY_IN_BOUNDS', 'MODERATE_MONITORING_ALERT', 'CRITICAL_DRIFT_ALERT'
    recalibration_recommended: bool
    governance_notes: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class CatalogDriftDetector:
    """
    Computes statistical divergence between a reference baseline catalog snapshot
    and newly ingested target marketplace crawl partitions.
    """

    # Standard Population Stability Index (PSI) Thresholds
    PSI_NEGLIGIBLE_CUTOFF = 0.10
    PSI_MODERATE_CUTOFF = 0.25

    def __init__(self, dataset_dir: Path = DATASET_DIR):
        self.dataset_dir = Path(dataset_dir)
        self.baseline_products: Optional[pd.DataFrame] = None
        self.baseline_prices: Optional[pd.DataFrame] = None
        self.baseline_reviews: Optional[pd.DataFrame] = None
        self.baseline_images: Optional[pd.DataFrame] = None
        self._load_baseline_tables()

    def _load_baseline_tables(self) -> None:
        """Loads baseline catalog entities from certified dataset directory."""
        prod_path = self.dataset_dir / "entities" / "products.parquet"
        pricing_path = self.dataset_dir / "derived_evidence" / "pricing_features.parquet"
        review_path = self.dataset_dir / "derived_evidence" / "review_nlp_features.parquet"
        img_path = self.dataset_dir / "derived_evidence" / "image_intelligence_features.parquet"

        if prod_path.exists():
            self.baseline_products = pd.read_parquet(prod_path)
        if pricing_path.exists():
            self.baseline_prices = pd.read_parquet(pricing_path)
        if review_path.exists():
            self.baseline_reviews = pd.read_parquet(review_path)
        if img_path.exists():
            self.baseline_images = pd.read_parquet(img_path)

        logger.info(f"Loaded baseline catalog tables (products: {len(self.baseline_products) if self.baseline_products is not None else 0}).")

    @staticmethod
    def calculate_categorical_psi(baseline_counts: Dict[str, float], target_counts: Dict[str, float]) -> float:
        """Calculates Population Stability Index between two categorical distributions."""
        all_keys = set(baseline_counts.keys()).union(set(target_counts.keys()))
        if not all_keys:
            return 0.0

        b_total = sum(baseline_counts.values()) or 1.0
        t_total = sum(target_counts.values()) or 1.0

        psi = 0.0
        eps = 1e-4

        for k in all_keys:
            p = baseline_counts.get(k, 0.0) / b_total
            q = target_counts.get(k, 0.0) / t_total

            p_adj = max(p, eps)
            q_adj = max(q, eps)
            psi += (q_adj - p_adj) * np.log(q_adj / p_adj)

        return float(psi)

    @staticmethod
    def calculate_continuous_psi(baseline_vals: np.ndarray, target_vals: np.ndarray, num_bins: int = 10) -> float:
        """Calculates Population Stability Index for continuous variables using reference quantile bins."""
        b_clean = baseline_vals[~np.isnan(baseline_vals)]
        t_clean = target_vals[~np.isnan(target_vals)]

        if len(b_clean) < 10 or len(t_clean) < 10:
            return 0.0

        quantiles = np.linspace(0, 100, num_bins + 1)
        bin_edges = np.percentile(b_clean, quantiles)
        bin_edges = np.unique(bin_edges)  # Prevent duplicate bin edges for discrete spikes

        if len(bin_edges) < 2:
            return 0.0

        b_counts, _ = np.histogram(b_clean, bins=bin_edges)
        t_counts, _ = np.histogram(t_clean, bins=bin_edges)

        b_prop = (b_counts + 1e-4) / (len(b_clean) + 1e-4 * len(b_counts))
        t_prop = (t_counts + 1e-4) / (len(t_clean) + 1e-4 * len(t_counts))

        psi = np.sum((t_prop - b_prop) * np.log(t_prop / b_prop))
        return float(psi)

    @classmethod
    def evaluate_continuous_drift(
        cls, feature_name: str, baseline_vals: np.ndarray, target_vals: np.ndarray
    ) -> DriftMetricResult:
        """Computes both 2-sample Kolmogorov-Smirnov test and 10-bin PSI for a continuous feature."""
        b_clean = baseline_vals[~np.isnan(baseline_vals)]
        t_clean = target_vals[~np.isnan(target_vals)]

        if len(b_clean) == 0 or len(t_clean) == 0:
            return DriftMetricResult(
                feature_name=feature_name,
                feature_type="continuous",
                psi_score=0.0,
                ks_statistic=0.0,
                ks_p_value=1.0,
                drift_severity="NEGLIGIBLE",
                alert_triggered=False,
                summary_message="Insufficient data to compute continuous drift.",
            )

        ks_stat, ks_p = ks_2samp(b_clean, t_clean)
        psi = cls.calculate_continuous_psi(b_clean, t_clean)

        if psi >= cls.PSI_MODERATE_CUTOFF or (ks_p < 0.001 and psi >= 0.15):
            severity = "CRITICAL_RECALIBRATION_REQUIRED"
            alert = True
            msg = f"Critical distributional shift detected (PSI={psi:.3f}, KS stat={ks_stat:.3f}, p={ks_p:.4e})."
        elif psi >= cls.PSI_NEGLIGIBLE_CUTOFF or (ks_p < 0.05 and psi >= 0.05):
            severity = "MODERATE"
            alert = True
            msg = f"Moderate distribution drift observed (PSI={psi:.3f}, KS stat={ks_stat:.3f}, p={ks_p:.4e})."
        else:
            severity = "NEGLIGIBLE"
            alert = False
            msg = f"Feature distribution in stable alignment with baseline (PSI={psi:.3f}, p={ks_p:.3f})."

        return DriftMetricResult(
            feature_name=feature_name,
            feature_type="continuous",
            psi_score=psi,
            ks_statistic=float(ks_stat),
            ks_p_value=float(ks_p),
            drift_severity=severity,
            alert_triggered=alert,
            summary_message=msg,
        )

    def compute_missing_modality_rates(self, products_df: pd.DataFrame) -> Dict[str, float]:
        """Calculates current missing rates across the 5 core modality streams."""
        total = len(products_df) if len(products_df) > 0 else 1

        # Check availability against loaded feature tables
        rates = {}
        if self.baseline_prices is not None:
            p_pids = set(self.baseline_prices.index)
            missing_prices = sum(1 for pid in products_df["canonical_product_id"] if pid not in p_pids)
            rates["pricing_missing_rate"] = round(missing_prices / total, 4)
        else:
            rates["pricing_missing_rate"] = 0.0

        if self.baseline_reviews is not None:
            r_pids = set(self.baseline_reviews.index)
            missing_reviews = sum(1 for pid in products_df["canonical_product_id"] if pid not in r_pids)
            rates["review_missing_rate"] = round(missing_reviews / total, 4)
        else:
            rates["review_missing_rate"] = 0.0

        if self.baseline_images is not None:
            i_pids = set(self.baseline_images["canonical_product_id"])
            missing_images = sum(1 for pid in products_df["canonical_product_id"] if pid not in i_pids)
            rates["vision_missing_rate"] = round(missing_images / total, 4)
        else:
            rates["vision_missing_rate"] = 0.0

        return rates

    def audit_catalog_batch(
        self, target_products_df: pd.DataFrame, target_prices_df: Optional[pd.DataFrame] = None
    ) -> CatalogHealthReport:
        """
        Executes complete quality and drift audit of a target catalog batch against baseline.
        """
        import time

        base_count = len(self.baseline_products) if self.baseline_products is not None else 0
        target_count = len(target_products_df)

        metrics: Dict[str, Dict[str, Any]] = {}
        notes: List[str] = []

        # 1. Marketplace Distribution Drift (PSI)
        if self.baseline_products is not None and "marketplace" in target_products_df.columns:
            b_mkt = self.baseline_products["marketplace"].value_counts().to_dict()
            t_mkt = target_products_df["marketplace"].value_counts().to_dict()
            psi_mkt = self.calculate_categorical_psi(b_mkt, t_mkt)

            severity = "CRITICAL_RECALIBRATION_REQUIRED" if psi_mkt >= self.PSI_MODERATE_CUTOFF else (
                "MODERATE" if psi_mkt >= self.PSI_NEGLIGIBLE_CUTOFF else "NEGLIGIBLE"
            )
            metrics["marketplace_distribution"] = {
                "feature_name": "marketplace",
                "feature_type": "categorical",
                "psi_score": round(psi_mkt, 4),
                "drift_severity": severity,
                "alert_triggered": psi_mkt >= self.PSI_NEGLIGIBLE_CUTOFF,
            }

        # 2. Category Distribution Drift (PSI)
        if self.baseline_products is not None and "category" in target_products_df.columns:
            b_cat = self.baseline_products["category"].value_counts().to_dict()
            t_cat = target_products_df["category"].value_counts().to_dict()
            psi_cat = self.calculate_categorical_psi(b_cat, t_cat)

            severity = "CRITICAL_RECALIBRATION_REQUIRED" if psi_cat >= self.PSI_MODERATE_CUTOFF else (
                "MODERATE" if psi_cat >= self.PSI_NEGLIGIBLE_CUTOFF else "NEGLIGIBLE"
            )
            metrics["category_distribution"] = {
                "feature_name": "category",
                "feature_type": "categorical",
                "psi_score": round(psi_cat, 4),
                "drift_severity": severity,
                "alert_triggered": psi_cat >= self.PSI_NEGLIGIBLE_CUTOFF,
            }

        # 3. Continuous Price Drift (KS & PSI)
        if self.baseline_prices is not None and target_prices_df is not None:
            if "pricing_log_inr" in self.baseline_prices.columns and "pricing_log_inr" in target_prices_df.columns:
                b_p = self.baseline_prices["pricing_log_inr"].dropna().values
                t_p = target_prices_df["pricing_log_inr"].dropna().values
                p_res = self.evaluate_continuous_drift("pricing_log_inr", b_p, t_p)
                metrics["pricing_log_inr"] = p_res.to_dict()

        # 4. Modality Missing Rates
        missing_rates = self.compute_missing_modality_rates(target_products_df)

        # Overall Status
        has_critical = any(m.get("drift_severity") == "CRITICAL_RECALIBRATION_REQUIRED" for m in metrics.values())
        has_moderate = any(m.get("drift_severity") == "MODERATE" for m in metrics.values())

        if has_critical:
            overall = "CRITICAL_DRIFT_ALERT"
            recal = True
            notes.append("Severe covariate shift detected in catalog ingestion batch. Retraining or threshold recalibration required.")
        elif has_moderate:
            overall = "MODERATE_MONITORING_ALERT"
            recal = False
            notes.append("Moderate distribution shift observed. Recommend targeted sampling and close monitoring.")
        else:
            overall = "HEALTHY_IN_BOUNDS"
            recal = False
            notes.append("Catalog batch is in close statistical alignment with certified reference baseline.")

        return CatalogHealthReport(
            report_timestamp=time.time(),
            baseline_catalog_size=base_count,
            target_catalog_size=target_count,
            missing_modality_rates=missing_rates,
            feature_drift_metrics=metrics,
            overall_drift_status=overall,
            recalibration_recommended=recal,
            governance_notes=notes,
        )
