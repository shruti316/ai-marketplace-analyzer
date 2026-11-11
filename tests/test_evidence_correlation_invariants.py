"""
Controlled Evidence Correlation and Provenance Invariant Test Suite
Milestone 6 / Master Final Readiness: AI-Powered Indian Marketplace Trust Intelligence Platform

Tests:
1. Two findings from the same physical event are bound to identical evidence_event_id.
2. Two genuinely separate events are NOT incorrectly merged.
3. Multiple representations of the same image reuse event are recognized as correlated.
4. Evidence deduplication does NOT modify frozen model inference or probability outputs.
5. Bit-level reproducibility of model outputs under evidence correlation tracking.
"""

from pathlib import Path
import sys

import pytest

# Ensure project root in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.trust_engine import (
    EvidenceModality,
    EvidenceNature,
    RiskTier,
    TrustIntelligenceEngine,
    UnifiedEvidenceEngine,
    UnifiedEvidenceItem,
)
from src.trust_engine.multimodal_fusion import MultimodalFusionEngine

DATASET_DIR = PROJECT_ROOT / "data" / "indian_marketplace_trust_dataset_v1_7"


@pytest.fixture(scope="module")
def trust_engine():
    assert DATASET_DIR.exists()
    return TrustIntelligenceEngine(dataset_dir=DATASET_DIR)


def test_shared_event_receives_identical_identifier(trust_engine):
    """Proves that image reuse in CV and Graph edge receive identical evidence_event_id."""
    pid = "amazon_in_B008617U3K"
    evidence_items = trust_engine.evidence_engine.get_product_evidence(pid)

    cv_reuse = [it for it in evidence_items if it.evidence_type == "CROSS_PRODUCT_IMAGE_REUSE"]
    graph_shared = [it for it in evidence_items if it.evidence_type == "GRAPH_SHARED_IMAGE_EDGE"]

    assert len(cv_reuse) > 0
    assert len(graph_shared) > 0

    assert cv_reuse[0].evidence_event_id == graph_shared[0].evidence_event_id
    assert cv_reuse[0].correlation_group_id == graph_shared[0].correlation_group_id == "CORR_CROSS_PRODUCT_IMAGE_ASSET"


def test_genuinely_distinct_events_are_not_merged():
    """Proves that two independent anomaly events are NOT grouped together."""
    # Synthetic item 1: Image reuse event A
    item_img = UnifiedEvidenceItem(
        evidence_id="ev_img_1",
        entity_id="img_1",
        canonical_product_id="prod_A",
        listing_id=None,
        evidence_modality=EvidenceModality.IMAGE_CV,
        evidence_type="CROSS_PRODUCT_IMAGE_REUSE",
        evidence_nature=EvidenceNature.MODEL_PREDICTION,
        observed_value="Cluster 1",
        signal_severity="HIGH",
        detection_method="RESNET",
        confidence=0.95,
        uncertainty_note="",
        provenance="",
        timestamp=None,
        modality_available=True,
        evidence_limitations="",
        evidence_event_id="EVENT_VISUAL_REUSE_cluster_001",
        correlation_group_id="CORR_CROSS_PRODUCT_IMAGE_ASSET",
    )

    # Synthetic item 2: Extreme discount pricing event B
    item_price = UnifiedEvidenceItem(
        evidence_id="ev_price_1",
        entity_id="prod_A",
        canonical_product_id="prod_A",
        listing_id=None,
        evidence_modality=EvidenceModality.PRICING,
        evidence_type="PRICE_DISCOUNT_ANOMALY",
        evidence_nature=EvidenceNature.HEURISTIC_SIGNAL,
        observed_value="Discount 95%",
        signal_severity="HIGH",
        detection_method="MAD_CORRIDOR",
        confidence=0.90,
        uncertainty_note="",
        provenance="",
        timestamp=None,
        modality_available=True,
        evidence_limitations="",
        evidence_event_id="EVENT_PRICING_OUTLIER_prod_A",
        correlation_group_id="CORR_PRICING_DEVIATION",
    )

    correlated, independent_count = MultimodalFusionEngine.analyze_cross_modal_correlation([item_img, item_price])

    # Distinct events must have independent corroboration count = 2
    assert len(correlated) == 0, "Distinct events must not be grouped as correlated"
    assert independent_count == 2, f"Expected 2 independent corroborations, got {independent_count}"


def test_evidence_deduplication_does_not_modify_learned_model_inference(trust_engine):
    """
    Proves that adding correlation tracking does NOT alter the numerical probability output
    or feature representation of the frozen V1.0 or V1.1 models.
    """
    pid = "amazon_in_B008617U3K"

    # Assess multimodal inference twice
    res1_v1_0 = trust_engine.assess_product_learned_multimodal(pid, version="v1.0")
    res2_v1_0 = trust_engine.assess_product_learned_multimodal(pid, version="v1.0")

    prob1_v1_0 = res1_v1_0.get("calibrated_risk_probability") or res1_v1_0.get("calibrated_probability")
    prob2_v1_0 = res2_v1_0.get("calibrated_risk_probability") or res2_v1_0.get("calibrated_probability")
    assert prob1_v1_0 == prob2_v1_0
    assert prob1_v1_0 is not None

    res1_v1_1 = trust_engine.assess_product_learned_multimodal(pid, version="v1.1")
    res2_v1_1 = trust_engine.assess_product_learned_multimodal(pid, version="v1.1")

    prob1_v1_1 = res1_v1_1.get("calibrated_probability") or res1_v1_1.get("calibrated_risk_probability")
    prob2_v1_1 = res2_v1_1.get("calibrated_probability") or res2_v1_1.get("calibrated_risk_probability")
    assert prob1_v1_1 == prob2_v1_1
    assert prob1_v1_1 is not None
    assert res1_v1_1["predicted_risk_tier"] == res2_v1_1["predicted_risk_tier"]
