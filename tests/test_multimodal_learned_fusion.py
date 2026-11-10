"""Targeted Unit Tests for Workstream 6: Multimodal Learned Fusion.

Verifies:
1. Feature extraction pipeline across all catalog products and features.
2. Multimodal fusion model artifact loading and prediction validity.
3. Zero-penalty invariant under simulated missing modalities.
4. Metric boundaries on held-out test evaluation.
"""

from pathlib import Path
import sys
import joblib
import numpy as np
import pandas as pd
import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

DATASET_DIR = PROJECT_ROOT / "data" / "indian_marketplace_trust_dataset_v1_7"
MODELS_DIR = PROJECT_ROOT / "models"

from src.models.multimodal_learned_fusion import MultimodalFeatureExtractor, MultimodalLearnedFusion


def test_multimodal_feature_extractor():
    """Verifies feature extractor outputs aligned 3,643 rows with all 23 feature columns."""
    extractor = MultimodalFeatureExtractor(DATASET_DIR)
    df = extractor.extract_product_feature_matrix()

    assert len(df) == 3643, f"Expected 3643 products, got {len(df)}"
    for col in MultimodalLearnedFusion.FEATURE_COLS:
        assert col in df.columns, f"Missing feature column {col}"
        # Assert no NaN values in features
        assert df[col].isna().sum() == 0, f"Found NaNs in column {col}"


def test_saved_model_artifact():
    """Verifies model artifact exists, loads cleanly, and contains required bundle components."""
    model_path = MODELS_DIR / "multimodal_fusion_model.joblib"
    assert model_path.exists(), f"Missing {model_path}"

    bundle = joblib.load(model_path)
    assert "rf_model" in bundle
    assert "lr_model" in bundle
    assert "feature_columns" in bundle
    assert len(bundle["feature_columns"]) == 23
    assert bundle["performance_summary"]["late_f1"] >= 0.20


def test_zero_penalty_invariant_inference():
    """Verifies that sparse/unobserved products do NOT receive an elevated risk penalty."""
    model_path = MODELS_DIR / "multimodal_fusion_model.joblib"
    bundle = joblib.load(model_path)
    rf = bundle["rf_model"]

    # Construct clean baseline product
    clean_vec = np.zeros((1, 23))
    clean_vec[0, 0] = np.log1p(499.0) / 10.0  # standard price
    clean_vec[0, 1] = 10.0  # normal discount
    clean_vec[0, 12] = 1.0  # has_images
    clean_vec[0, 13] = 1.0  # image_count

    clean_prob = rf.predict_proba(clean_vec)[0, 1]

    # Construct completely sparse product (no reviews, no images, unobserved OCR/CLIP)
    sparse_vec = np.zeros((1, 23))
    sparse_vec[0, 0] = np.log1p(499.0) / 10.0
    sparse_prob = rf.predict_proba(sparse_vec)[0, 1]

    # Zero-penalty invariant: sparse product risk probability must NOT exceed clean product
    assert sparse_prob <= clean_prob + 0.05, f"Sparse prob {sparse_prob} penalized compared to clean {clean_prob}"


def test_multimodal_evaluation_report_metrics():
    """Verifies evaluation JSON report contains complete benchmark metrics."""
    json_path = DATASET_DIR / "reports" / "multimodal_model_evaluation.json"
    assert json_path.exists(), f"Missing {json_path}"

    import json
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert "benchmarks" in data
    assert "stratified_5fold_cross_validation_catalog_wide" in data
    cv_data = data["stratified_5fold_cross_validation_catalog_wide"]

    assert cv_data["late_fusion_ensemble"]["f1_score"] >= 0.80
    assert cv_data["late_fusion_ensemble"]["roc_auc"] >= 0.95
    assert data["missing_modality_robustness"]["zero_penalty_invariant_satisfied"] is True
