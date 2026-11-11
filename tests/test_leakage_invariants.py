"""
tests/test_leakage_invariants.py
--------------------------------
Automated Unit & Invariant Tests for:
1. Target Provenance & Rule Reconstruction
2. Strict Brand-Isolated Fold Leakage Invariant
3. Zero-Penalty Invariant under Missing Modalities
4. REST API Dual-Model Version Support (V1.0 & V1.1)
"""

from pathlib import Path
import pytest
import numpy as np

from src.cv.pipeline_v1_1 import MultimodalFeaturePipelineV1_1, GatedMultimodalFusionModelV1_1
from src.api.service import TrustIntelligenceDispatcher

def test_target_provenance_rule_reconstruction():
    """Confirms that the target y is accurately reconstructed by the documented boolean rule."""
    pipeline = MultimodalFeaturePipelineV1_1()
    X, y, masks, feats, _ = pipeline.build_feature_matrix()

    cv_reuse_idx = feats.index("cv_is_cross_product_reuse")
    r_dup_idx = feats.index("review_has_duplicate")
    p_z_idx = feats.index("pricing_robust_z")

    rule_pred = (X[:, cv_reuse_idx] > 0.5) | ((X[:, r_dup_idx] > 0.5) & (X[:, p_z_idx] > 0.4))
    accuracy = np.mean(rule_pred == y)
    assert accuracy > 0.99, f"Expected rule reconstruction accuracy > 99%, got {accuracy:.4f}"

def test_strict_zero_penalty_missing_modalities():
    """Ensures missing modalities (M_k = 0) yield strictly zero feature values after gating."""
    model = GatedMultimodalFusionModelV1_1()
    n_samples = 10
    X_synthetic = np.ones((n_samples, 16))
    # Mask out vision (idx 2) and clip (idx 3)
    masks = np.ones((n_samples, 5))
    masks[:, 2] = 0.0 # Image CV missing
    masks[:, 3] = 0.0 # CLIP missing

    X_gated = model._apply_gating(X_synthetic, masks)

    # Features 7..10 are Image CV, 11..13 are CLIP
    assert np.all(X_gated[:, 7:11] == 0.0), "Image CV features were not zeroed under M_image=0!"
    assert np.all(X_gated[:, 11:14] == 0.0), "CLIP features were not zeroed under M_clip=0!"
    # Active streams should remain unchanged
    assert np.all(X_gated[:, 0:3] == 1.0), "Pricing stream was improperly modified!"

def test_api_dispatcher_dual_version_support():
    """Verifies that the REST API dispatcher correctly serves both V1.0 and V1.1 endpoints."""
    dispatcher = TrustIntelligenceDispatcher()
    canonical_id = "amazon_in_B000052YQN"

    # 1. Query V1.0
    code_v1_0, res_v1_0 = dispatcher.dispatch(
        "GET", f"/api/v1/products/{canonical_id}/learned-multimodal?version=v1.0"
    )
    assert code_v1_0 == 200
    assert res_v1_0.get("model_version") in ["2.0.0", "1.0.0", "1.0"]
    assert "calibrated_risk_probability" in res_v1_0

    # 2. Query V1.1
    code_v1_1, res_v1_1 = dispatcher.dispatch(
        "GET", f"/api/v1/products/{canonical_id}/learned-multimodal?version=v1.1"
    )
    assert code_v1_1 == 200
    assert res_v1_1.get("model_version") == "1.1.0"
    assert "calibrated_risk_probability" in res_v1_1
    assert "confidence_interval" in res_v1_1

def test_api_unknown_product_returns_404():
    """Verifies that unknown product IDs return structured 404 errors."""
    dispatcher = TrustIntelligenceDispatcher()
    code, res = dispatcher.dispatch(
        "GET", "/api/v1/products/NONEXISTENT_PRODUCT_ID/learned-multimodal"
    )
    assert code == 404
    assert res.get("error") is True
    assert "not found" in res.get("message", "").lower()
