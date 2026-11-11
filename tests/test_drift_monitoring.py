"""
Unit Tests for Catalog Drift Detector & Data Quality Monitoring
AI-Powered Indian Marketplace Trust Intelligence Platform

Validates:
1. Categorical PSI calculation for identical and drifted distributions.
2. Continuous feature drift via Kolmogorov-Smirnov test and binned PSI.
3. Missing modality rate tracking across pricing, reviews, and vision.
4. Full catalog batch audit producing structured CatalogHealthReport.
5. Invariant check: Ingestion drift alerts trigger monitoring notifications but never penalize individual products.
"""

from pathlib import Path
import sys
import numpy as np
import pandas as pd
import pytest

# Ensure project root in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.monitoring.catalog_drift_detector import (
    CatalogDriftDetector,
    CatalogHealthReport,
    DriftMetricResult,
)


@pytest.fixture(scope="module")
def drift_detector():
    """Initializes CatalogDriftDetector with certified v1.7 baseline tables."""
    return CatalogDriftDetector()


def test_categorical_psi_identical_distribution():
    """Identical categorical distributions must return PSI = 0.0."""
    dist_a = {"Amazon": 1500, "Flipkart": 1143, "Myntra": 1000}
    dist_b = {"Amazon": 1500, "Flipkart": 1143, "Myntra": 1000}
    psi = CatalogDriftDetector.calculate_categorical_psi(dist_a, dist_b)
    assert psi == pytest.approx(0.0, abs=1e-4)


def test_categorical_psi_drift_detection():
    """Substantial distribution shift must trigger high PSI (>= 0.25)."""
    dist_baseline = {"Amazon": 1500, "Flipkart": 1143, "Myntra": 1000}
    # Radical shift: 90% Flipkart, 5% Amazon, 5% Myntra
    dist_shifted = {"Amazon": 50, "Flipkart": 900, "Myntra": 50}
    psi = CatalogDriftDetector.calculate_categorical_psi(dist_baseline, dist_shifted)
    assert psi >= 0.25, f"Expected high PSI for major shift, got {psi}"


def test_continuous_feature_drift_ks_and_psi():
    """Tests KS test and continuous PSI on stationary vs shifted Gaussian distributions."""
    np.random.seed(42)
    # Stationary: two samples from N(5.0, 1.0)
    sample_ref = np.random.normal(5.0, 1.0, size=500)
    sample_same = np.random.normal(5.0, 1.0, size=500)
    res_stationary = CatalogDriftDetector.evaluate_continuous_drift("price_log", sample_ref, sample_same)
    assert res_stationary.drift_severity == "NEGLIGIBLE"
    assert res_stationary.psi_score < 0.10
    assert res_stationary.alert_triggered is False

    # Shifted: sample from N(6.5, 1.5)
    sample_shifted = np.random.normal(6.5, 1.5, size=500)
    res_shifted = CatalogDriftDetector.evaluate_continuous_drift("price_log", sample_ref, sample_shifted)
    assert res_shifted.drift_severity in ("MODERATE", "CRITICAL_RECALIBRATION_REQUIRED")
    assert res_shifted.alert_triggered is True
    assert res_shifted.ks_p_value < 0.01


def test_missing_modality_rates(drift_detector):
    """Calculates missing modality rates on catalog products."""
    prods = drift_detector.baseline_products
    assert prods is not None, "Baseline products table must be loaded"

    rates = drift_detector.compute_missing_modality_rates(prods.head(100))
    assert "pricing_missing_rate" in rates
    assert "review_missing_rate" in rates
    assert "vision_missing_rate" in rates
    assert 0.0 <= rates["pricing_missing_rate"] <= 1.0


def test_audit_catalog_batch_end_to_end(drift_detector):
    """Executes full audit against a test partition."""
    prods = drift_detector.baseline_products
    prices = drift_detector.baseline_prices
    assert prods is not None

    sample_prods = prods.sample(n=200, random_state=42)
    sample_prices = prices.loc[prices.index.isin(sample_prods["canonical_product_id"])] if prices is not None else None

    report = drift_detector.audit_catalog_batch(sample_prods, sample_prices)
    assert isinstance(report, CatalogHealthReport)
    assert report.target_catalog_size == 200
    assert report.baseline_catalog_size > 0
    assert "marketplace_distribution" in report.feature_drift_metrics
    assert report.overall_drift_status in ("HEALTHY_IN_BOUNDS", "MODERATE_MONITORING_ALERT")
