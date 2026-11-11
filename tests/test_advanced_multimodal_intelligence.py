"""Test Suite for Advanced Multimodal Intelligence and Empirical Benchmarks.

Project: AI-Powered Indian Marketplace Trust Intelligence Platform
Phase: Phase 2 — Complete Multimodal AI Intelligence Development
"""

from pathlib import Path
import pytest
import numpy as np

from src.models.advanced_multimodal_fusion import (
    AdvancedMultimodalIntelligenceService,
    AdvancedMultimodalFeaturePipeline,
    GatedMultimodalFusionModel,
    MultimodalPredictionOutput,
)
from src.evaluation.empirical_multimodal_benchmarks import (
    evaluate_empirical_clip_separation,
    evaluate_visual_duplicate_taxonomy,
    extract_graph_centrality_features,
)
from src.api.service import TrustIntelligenceRestServer

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATASET_DIR = PROJECT_ROOT / "data" / "indian_marketplace_trust_dataset_v1_7"


@pytest.fixture(scope="module")
def multimodal_service():
    service = AdvancedMultimodalIntelligenceService(DATASET_DIR)
    return service


@pytest.fixture(scope="module")
def api_server():
    server = TrustIntelligenceRestServer(bind_socket=False)
    return server


class TestAdvancedMultimodalFusion:
    """Tests the Gated Multimodal Fusion model, pipeline, and invariants."""

    def test_pipeline_feature_and_mask_extraction(self, multimodal_service):
        X, y, masks, feats, pids = multimodal_service.pipeline.build_feature_matrix()
        
        assert len(pids) == 3643, f"Expected 3,643 products, got {len(pids)}"
        assert X.shape == (3643, 13), f"Expected 13 dense features, got {X.shape}"
        assert masks.shape == (3643, 5), f"Expected 5-modality mask, got {masks.shape}"
        assert len(feats) == 13, f"Expected 13 feature names, got {len(feats)}"
        
        # Verify no NaN or Inf in feature matrix
        assert not np.isnan(X).any(), "Feature matrix contains NaNs"
        assert not np.isinf(X).any(), "Feature matrix contains Infs"
        
        # Verify mask is binary
        assert set(np.unique(masks)).issubset({0.0, 1.0}), "Modality mask must be strictly binary {0, 1}"

    def test_gated_multimodal_inference_contract(self, multimodal_service):
        sample_pid = "amazon_in_B000052YQN"
        result = multimodal_service.assess_product_multimodal(sample_pid)
        
        assert isinstance(result, MultimodalPredictionOutput)
        assert result.canonical_product_id == sample_pid
        assert 0.0 <= result.continuous_anomaly_score <= 1.0
        assert 0.0 <= result.calibrated_risk_probability <= 1.0
        
        lower, upper = result.confidence_interval
        assert 0.0 <= lower <= result.calibrated_risk_probability <= upper <= 1.0
        assert result.predicted_risk_tier in [
            "LOW_OBSERVED_ANOMALY",
            "MODERATE_SINGLE_MODALITY_ANOMALY",
            "ELEVATED_MULTIMODAL_ANOMALY",
            "UNASSESSED_SPARSE_DATA",
        ]
        assert result.active_modalities_count >= 1
        assert result.zero_penalty_invariant_applied is True
        
        # Check multi-task heads
        heads = result.multi_task_risk_heads
        assert "review_manipulation_risk" in heads
        assert "visual_duplicate_risk" in heads
        assert "price_corridor_risk" in heads
        assert "cross_modal_discordance_risk" in heads

    def test_zero_penalty_invariant_on_missing_modalities(self, multimodal_service):
        """Verify that missing modalities have their feature values zeroed and do not artificially trigger risk."""
        # Create synthetic input with all modalities zeroed except graph
        x_sparse = np.ones((1, 13))
        m_sparse = np.array([[0.0, 0.0, 0.0, 0.0, 1.0]]) # Only graph observed
        
        model = multimodal_service.model
        gated_x = model._apply_gating(x_sparse, m_sparse)
        
        # Slices for missing modalities (pricing: 0-3, review: 3-7, image: 7-9, clip: 9-11) should be strictly 0
        assert np.all(gated_x[0, :11] == 0.0), "Zero-Penalty Invariant violated: unobserved modalities have non-zero features!"
        # Graph features (11-12) should remain intact
        assert np.all(gated_x[0, 11:] == 1.0), "Observed modality features were improperly modified!"

    def test_uncertainty_expansion_under_missingness(self, multimodal_service):
        """Verify that products with fewer observed modalities have wider confidence intervals."""
        # Full observation (5 modalities) vs 2 modalities
        w_5 = multimodal_service.model._compute_epistemic_uncertainty(5)
        w_2 = multimodal_service.model._compute_epistemic_uncertainty(2)
        w_1 = multimodal_service.model._compute_epistemic_uncertainty(1)
        
        assert w_1 > w_2 > w_5, f"Uncertainty must expand as modality sparsity increases: {w_1} > {w_2} > {w_5}"

    def test_modality_ablation_metrics(self, multimodal_service):
        ablations = multimodal_service.evaluate_modality_ablations()
        
        assert "Full_Multimodal_Gated_Model" in ablations
        full_metrics = ablations["Full_Multimodal_Gated_Model"]
        assert full_metrics["mean_roc_auc"] > 0.90, f"Full model ROC-AUC {full_metrics['mean_roc_auc']} too low"
        assert full_metrics["mean_pr_auc"] > 0.60, f"Full model PR-AUC {full_metrics['mean_pr_auc']} too low"
        
        # Verify unimodal baselines are inferior to multimodal synergy
        assert full_metrics["mean_pr_auc"] > ablations["Pricing_Only"]["mean_pr_auc"]
        assert full_metrics["mean_pr_auc"] > ablations["Review_NLP_Only"]["mean_pr_auc"]
        assert full_metrics["mean_pr_auc"] > ablations["Vision_Only"]["mean_pr_auc"]


class TestEmpiricalBenchmarks:
    """Tests the empirical CLIP, visual taxonomy, and graph benchmarks."""

    def test_empirical_clip_separation_margin(self):
        clip_metrics = evaluate_empirical_clip_separation(DATASET_DIR)
        
        assert clip_metrics["num_matched_pairs"] == 100
        assert clip_metrics["num_cross_category_negatives"] == 50
        assert clip_metrics["num_intra_category_hard_negatives"] == 50
        
        # Separation margin must be substantial (> 0.10 cosine similarity)
        assert clip_metrics["margin_matched_vs_hard_negative"] > 0.10, "Empirical CLIP hard-negative margin too small"
        assert clip_metrics["roc_auc_vs_hard_negatives"] > 0.90, "Empirical CLIP ROC-AUC vs hard negatives too low"

    def test_visual_duplicate_taxonomy_map(self):
        cv_metrics = evaluate_visual_duplicate_taxonomy(DATASET_DIR)
        
        assert cv_metrics["exact_sha256_duplicates"] >= 30
        assert cv_metrics["perceptual_dhash_duplicates"] >= 40
        assert cv_metrics["cross_catalog_image_reuse_pairs"] >= 50
        assert cv_metrics["duplicate_taxonomy_map"] > 0.90, "Visual duplicate taxonomy mAP must exceed 0.90"

    def test_graph_centrality_extraction(self):
        graph_feats = extract_graph_centrality_features(DATASET_DIR)
        
        assert len(graph_feats) == 3643
        assert "pagerank" in graph_feats.columns
        assert "degree_centrality" in graph_feats.columns
        assert not graph_feats["pagerank"].isna().any()


class TestMultimodalApiIntegration:
    """Tests REST API endpoints for learned multimodal inference and ablation studies."""

    def test_rest_learned_multimodal_endpoint_success(self, api_server):
        status, response = api_server.dispatch(
            "GET", "/api/v1/products/amazon_in_B000052YQN/learned-multimodal"
        )
        assert status == 200
        assert response["canonical_product_id"] == "amazon_in_B000052YQN"
        assert "calibrated_risk_probability" in response
        assert "confidence_interval" in response
        assert "multi_task_risk_heads" in response
        assert response["zero_penalty_invariant_applied"] is True

    def test_rest_learned_multimodal_endpoint_404(self, api_server):
        status, response = api_server.dispatch(
            "GET", "/api/v1/products/non_existent_product_9999/learned-multimodal"
        )
        assert status == 404
        assert response["error"] is True

    def test_rest_ablations_endpoint(self, api_server):
        status, response = api_server.dispatch("GET", "/api/v1/ablations")
        assert status == 200
        assert "Full_Multimodal_Gated_Model" in response
        assert "Ablation_Drop_Graph" in response
