"""
Comprehensive Hardening & Evidence Integrity Test Suite (V1.1)
Milestone 6: AI-Powered Indian Marketplace Trust Intelligence Platform

Validates:
1. Workstream 1: Evidence Provenance & Event-Level Deduplication (CV-Graph correlation)
2. Workstream 2: Visual Evidence Explainability & Path Sanitization (6-tier duplicate taxonomy)
3. Workstream 3: Missing-Modality Transparency (ModalityStatus enum & Zero-Penalty Invariant)
4. Workstream 4: Marketplace-Specific Calibration Policies (Amazon vs Flipkart vs Myntra)
5. Workstream 5: OCR Confidence & Uncertainty Isolation
6. Workstream 7: Independent Double-Blind Ground-Truth Schema & Cohen's Kappa Protocol
"""

from pathlib import Path
import sys

import pytest

# Ensure project root in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.cv.ocr_engine import OCRConfidenceRecord, PhysicalOCREngine
from src.data.ground_truth_schema import (
    AdjudicationStatus,
    DoubleBlindAnnotationRecord,
    GroundTruthAdjudicationProtocol,
    GroundTruthTaxonomy,
)
from src.trust_engine import (
    EvidenceModality,
    EvidenceNature,
    MarketplaceDecisionPolicy,
    MarketplacePolicyConfig,
    ModalityStatus,
    RiskTier,
    ThresholdValidationStatus,
    TrustIntelligenceEngine,
    UnifiedEvidenceEngine,
    UnifiedEvidenceItem,
    VisualDuplicateCategory,
    VisualEvidenceDetail,
)
from src.trust_engine.multimodal_fusion import MultimodalFusionEngine

DATASET_DIR = PROJECT_ROOT / "data" / "indian_marketplace_trust_dataset_v1_7"


@pytest.fixture(scope="module")
def trust_engine():
    """Initializes shared trust engine with certified v1.7 dataset."""
    assert DATASET_DIR.exists(), f"Dataset directory {DATASET_DIR} does not exist!"
    return TrustIntelligenceEngine(dataset_dir=DATASET_DIR)


# ------------------------------------------------------------------------------
# Workstream 1: Evidence Provenance & Event Deduplication
# ------------------------------------------------------------------------------
def test_cross_modal_image_graph_event_linkage(trust_engine):
    """
    Verifies that cross-product image reuse in Image CV and Graph Topology
    are bound to the identical evidence_event_id and correlation_group_id.
    """
    # Product known to have cross-product image reuse in dataset
    pid = "amazon_in_B008617U3K"
    evidence_items = trust_engine.evidence_engine.get_product_evidence(pid)

    cv_reuse_items = [
        it for it in evidence_items
        if it.evidence_modality == EvidenceModality.IMAGE_CV and it.evidence_type == "CROSS_PRODUCT_IMAGE_REUSE"
    ]
    graph_shared_items = [
        it for it in evidence_items
        if it.evidence_modality == EvidenceModality.GRAPH_TOPOLOGY and it.evidence_type == "GRAPH_SHARED_IMAGE_EDGE"
    ]

    assert len(cv_reuse_items) > 0, "Product should have CV image reuse evidence"
    assert len(graph_shared_items) > 0, "Product should have Graph shared image edge evidence"

    cv_item = cv_reuse_items[0]
    graph_item = graph_shared_items[0]

    # Verify shared event identifier and correlation group
    assert cv_item.evidence_event_id is not None
    assert graph_item.evidence_event_id is not None
    assert cv_item.evidence_event_id == graph_item.evidence_event_id, (
        f"Event ID mismatch: CV {cv_item.evidence_event_id} vs Graph {graph_item.evidence_event_id}"
    )
    assert cv_item.correlation_group_id == "CORR_CROSS_PRODUCT_IMAGE_ASSET"
    assert graph_item.correlation_group_id == "CORR_CROSS_PRODUCT_IMAGE_ASSET"

    # Verify source references remain distinct and traceable
    assert "DERIVED_EVIDENCE_IMAGE_INTELLIGENCE" in cv_item.source_reference
    assert "ENTITY_RELATIONSHIPS" in graph_item.source_reference


def test_fusion_engine_correlation_analysis(trust_engine):
    """
    Verifies that MultimodalFusionEngine.analyze_cross_modal_correlation identifies
    multi-view representations and computes independent corroboration count.
    """
    pid = "amazon_in_B008617U3K"
    evidence_items = trust_engine.evidence_engine.get_product_evidence(pid)

    correlated, independent_count = MultimodalFusionEngine.analyze_cross_modal_correlation(evidence_items)

    assert len(correlated) > 0, "Should detect cross-modal correlation for shared image"
    corr0 = correlated[0]
    assert corr0["is_single_physical_event"] is True
    assert set(corr0["modalities"]).issubset({"IMAGE_CV", "GRAPH_TOPOLOGY"})

    # Product assessment should carry these fields
    asmt = trust_engine.assess_product(pid)
    assert "correlated_findings" in asmt
    assert asmt["independent_corroboration_count"] >= 1


# ------------------------------------------------------------------------------
# Workstream 2: Visual Evidence Explainability & Path Sanitization
# ------------------------------------------------------------------------------
def test_visual_evidence_taxonomy_and_path_sanitization(trust_engine):
    r"""
    Verifies 6-tier duplicate taxonomy assignment and confirms that no local
    host file paths (C:\Users\...) are leaked in trust reports or visual details.
    """
    pid = "amazon_in_B008617U3K"
    asmt = trust_engine.assess_product(pid)
    vis_detail = asmt.get("visual_evidence_detail")

    assert vis_detail is not None, "Product should have visual evidence detail"
    assert vis_detail["duplicate_category"] in [c.value for c in VisualDuplicateCategory]
    assert vis_detail["sanitized_image_ref"].startswith("asset://")

    # Path sanitization check: Ensure no local machine paths exist in report or visual detail
    rep_dict = trust_engine.generate_report(pid, format_type="json")
    rep_str = str(rep_dict)

    assert "C:\\Users" not in rep_str, "Local machine path C:\\Users leaked in JSON report!"
    assert "c:/users" not in rep_str.lower(), "Local machine path leaked in JSON report!"


# ------------------------------------------------------------------------------
# Workstream 3: Missing-Modality Transparency & Zero-Penalty Invariant
# ------------------------------------------------------------------------------
def test_modality_status_and_zero_penalty(trust_engine):
    """
    Verifies ModalityStatus reporting and confirms Zero-Penalty Invariant
    when catalog items have missing reviews or missing images.
    """
    # Sparse product with missing reviews
    pid_sparse = "amazon_in_B000052YQN"
    asmt = trust_engine.assess_product(pid_sparse)
    breakdown = asmt["modality_breakdown"]

    # Review modality should be explicitly marked UNAVAILABLE
    rev_mod = breakdown["REVIEW_NLP"]
    assert rev_mod["modality_status"] == ModalityStatus.UNAVAILABLE.value
    assert rev_mod["has_anomaly"] is False
    assert "Zero-Penalty" in rev_mod["status_reason"] or "Zero penalty" in rev_mod["summary_text"]

    # Risk tier should not be inflated due to missing reviews
    assert asmt["overall_risk_tier"] == RiskTier.LOW_OBSERVED_ANOMALY.value


# ------------------------------------------------------------------------------
# Workstream 4: Marketplace Calibration Policies
# ------------------------------------------------------------------------------
def test_marketplace_decision_policy():
    """
    Verifies that MarketplaceDecisionPolicy applies calibrated thresholds:
    - Amazon: 0.50 (VALIDATED)
    - Flipkart: 0.65 (VALIDATED_MARKETPLACE_ADAPTED)
    - Myntra: 0.50 (UNVALIDATED_THRESHOLD)
    """
    policy_engine = MarketplaceDecisionPolicy()

    # 1. Amazon India at 0.55 -> Above threshold -> ELEVATED
    res_amz = policy_engine.evaluate_risk(
        calibrated_probability=0.55,
        marketplace="amazon_in",
        active_anomaly_count=2,
        available_core_modalities=3,
    )
    assert res_amz["assigned_risk_tier"] == RiskTier.ELEVATED_MULTIMODAL_ANOMALY.value
    assert res_amz["decision_threshold"] == 0.50
    assert res_amz["validation_status"] == ThresholdValidationStatus.VALIDATED.value

    # 2. Flipkart at 0.55 -> Below adapted threshold (0.65) -> MODERATE (protects from false alarm!)
    res_fk = policy_engine.evaluate_risk(
        calibrated_probability=0.55,
        marketplace="flipkart",
        active_anomaly_count=1,
        available_core_modalities=3,
    )
    assert res_fk["assigned_risk_tier"] == RiskTier.MODERATE_SINGLE_MODALITY_ANOMALY.value
    assert res_fk["decision_threshold"] == 0.65
    assert res_fk["is_above_threshold"] is False

    # 3. Myntra at 0.70 -> Above threshold but UNVALIDATED -> Capped at MODERATE with warning
    res_myn = policy_engine.evaluate_risk(
        calibrated_probability=0.70,
        marketplace="myntra",
        active_anomaly_count=2,
        available_core_modalities=3,
    )
    assert res_myn["assigned_risk_tier"] == RiskTier.MODERATE_SINGLE_MODALITY_ANOMALY.value
    assert res_myn["validation_status"] == ThresholdValidationStatus.UNVALIDATED_THRESHOLD.value
    assert "UNVALIDATED_THRESHOLD" in res_myn["warning"]


# ------------------------------------------------------------------------------
# Workstream 5: OCR Confidence & Uncertainty Isolation
# ------------------------------------------------------------------------------
def test_ocr_confidence_record_and_isolation():
    """
    Verifies that OCRConfidenceRecord structures field confidences and guarantees
    that OCR absence/failure never inflates risk (zero_penalty_applied = True).
    """
    raw_mock_result = {
        "detected_text": "MRP RS. 1,499.00 NET QTY 200 ml LOT NO BATCH123",
        "word_count": 10,
        "confidence": 0.95,
        "brand_alignment_status": "BRAND_VERIFIED_ON_PACKAGING",
        "brand_confidence": 0.95,
        "extracted_mrp": 1499.0,
        "extracted_net_quantity": "200 ml",
        "extracted_batch_code": "BATCH123",
        "processing_status": "SUCCESS",
    }

    record = PhysicalOCREngine.build_confidence_record(raw_mock_result)

    assert record.processing_status == "OBSERVED"
    assert record.mrp_confidence == 0.95
    assert record.net_quantity_confidence == 0.90
    assert record.batch_code_confidence == 0.85
    assert record.brand_match_confidence == 0.95
    assert record.zero_penalty_applied is True

    # Offline failure mock
    raw_fail = {
        "detected_text": "",
        "word_count": 0,
        "confidence": 0.0,
        "processing_status": "UNSUPPORTED_PLATFORM",
        "failure_reason": "Offline sandbox environment",
    }
    rec_fail = PhysicalOCREngine.build_confidence_record(raw_fail)
    assert rec_fail.processing_status == "OFFLINE_DEPENDENCY_ABSENT"
    assert rec_fail.zero_penalty_applied is True


# ------------------------------------------------------------------------------
# Workstream 7: Independent Double-Blind Ground-Truth Schema & Protocol
# ------------------------------------------------------------------------------
def test_double_blind_ground_truth_protocol():
    """
    Verifies double-blind adjudication protocol:
    - Direct agreement between 2 annotators -> DOUBLE_BLIND_AGREEMENT
    - Disagreement resolved by 3rd expert -> RESOLVED_BY_THIRD_EXPERT
    - Cohen's Kappa calculation
    """
    # 1. Agreement case
    rec_agree = GroundTruthAdjudicationProtocol.adjudicate_record(
        sample_id="SAMPLE_001",
        canonical_product_id="prod_123",
        marketplace="amazon_in",
        annotator_1_id="ANN_A",
        annotator_1_label=GroundTruthTaxonomy.AUTHENTIC,
        annotator_1_conf=5,
        annotator_2_id="ANN_B",
        annotator_2_label=GroundTruthTaxonomy.AUTHENTIC,
        annotator_2_conf=4,
    )
    assert rec_agree.adjudication_status == AdjudicationStatus.DOUBLE_BLIND_AGREEMENT
    assert rec_agree.consensus_label == GroundTruthTaxonomy.AUTHENTIC

    # 2. Tie-break resolution case
    rec_tiebreak = GroundTruthAdjudicationProtocol.adjudicate_record(
        sample_id="SAMPLE_002",
        canonical_product_id="prod_456",
        marketplace="flipkart",
        annotator_1_id="ANN_A",
        annotator_1_label=GroundTruthTaxonomy.SUSPECTED_KNOCKOFF,
        annotator_1_conf=4,
        annotator_2_id="ANN_B",
        annotator_2_label=GroundTruthTaxonomy.UNAUTHORIZED_STOCK_PHOTO,
        annotator_2_conf=3,
        third_adjudicator_id="EXPERT_LEAD",
        third_label=GroundTruthTaxonomy.SUSPECTED_KNOCKOFF,
    )
    assert rec_tiebreak.adjudication_status == AdjudicationStatus.RESOLVED_BY_THIRD_EXPERT
    assert rec_tiebreak.consensus_label == GroundTruthTaxonomy.SUSPECTED_KNOCKOFF

    # 3. Cohen's Kappa agreement
    rater1 = [GroundTruthTaxonomy.AUTHENTIC, GroundTruthTaxonomy.SUSPECTED_KNOCKOFF, GroundTruthTaxonomy.PACKAGING_VIOLATION]
    rater2 = [GroundTruthTaxonomy.AUTHENTIC, GroundTruthTaxonomy.SUSPECTED_KNOCKOFF, GroundTruthTaxonomy.PACKAGING_VIOLATION]
    kappa_perfect = GroundTruthAdjudicationProtocol.compute_cohens_kappa(rater1, rater2)
    assert kappa_perfect == 1.0

    rater3 = [GroundTruthTaxonomy.AUTHENTIC, GroundTruthTaxonomy.AUTHENTIC, GroundTruthTaxonomy.AUTHENTIC]
    kappa_imperfect = GroundTruthAdjudicationProtocol.compute_cohens_kappa(rater1, rater3)
    assert kappa_imperfect < 1.0
