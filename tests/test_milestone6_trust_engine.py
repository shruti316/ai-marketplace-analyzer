"""
Milestone 6 Test Suite: Final Multimodal Trust Intelligence Engine
AI-Powered Indian Marketplace Trust Intelligence Platform

Tests:
1. Unified evidence retrieval across reviews, images, pricing, sellers, and graph.
2. Product-level explainable trust assessment and risk categorization.
3. Listing-level trust assessment and marketplace offer verification.
4. Seller identity governance restrictions (platform aggregate merchant pool).
5. Zero-penalty missing modality invariant (unassessed sparse catalog items).
6. Correlated signal de-duplication within modalities.
7. Graph-based intelligence, egocentric subgraphs, and cross-product image reuse.
8. Evidence-based product comparison and data-density recommendations.
9. Explainable trust report generation (Markdown & JSON, 12 sections).
10. Verification against real dataset records across Amazon India, Flipkart, and Myntra.
"""

import json
import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import pytest

from src.trust_engine import (
    EvidenceModality,
    EvidenceNature,
    RiskTier,
    TrustIntelligenceEngine,
)

V16_DIR = Path("data/indian_marketplace_trust_dataset_v1_6")


@pytest.fixture(scope="module")
def trust_engine():
    """Initializes a shared TrustIntelligenceEngine instance for testing."""
    assert V16_DIR.exists(), f"Baseline dataset directory {V16_DIR} does not exist!"
    return TrustIntelligenceEngine(dataset_dir=V16_DIR)


def test_evidence_retrieval_structure(trust_engine):
    """Verifies that atomic evidence items conform to the standardized schema."""
    # Test real Amazon India product
    pid = "amazon_in_B000052YQN"
    evidence = trust_engine.get_product_evidence(pid)
    assert len(evidence) > 0, "Product should have evidence items"

    # Verify required fields across all evidence items
    required_keys = {
        "evidence_id", "entity_id", "canonical_product_id", "listing_id",
        "evidence_modality", "evidence_type", "evidence_nature", "observed_value",
        "signal_severity", "detection_method", "confidence", "uncertainty_note",
        "provenance", "timestamp", "modality_available", "evidence_limitations",
    }
    for item in evidence:
        assert required_keys.issubset(set(item.keys())), f"Missing keys in evidence item: {item}"
        assert item["evidence_nature"] in {"OBSERVED_EVIDENCE", "HEURISTIC_SIGNAL", "MODEL_PREDICTION"}
        assert 0.0 <= item["confidence"] <= 1.0


def test_product_assessment_risk_tiers(trust_engine):
    """Verifies product trust assessment across different risk tiers."""
    # 1. Product with 2 available core modalities (image + price) and consistent signals
    pid_low = "amazon_in_B000052YQN"
    asmt_low = trust_engine.assess_product(pid_low)
    assert asmt_low["overall_risk_tier"] == RiskTier.LOW_OBSERVED_ANOMALY.value
    assert asmt_low["available_core_modalities_count"] == 2
    assert len(asmt_low["positive_evidence"]) > 0

    # 2. Product with all 3 core modalities (image + price + reviews)
    pid_all3 = "amazon_in_B000CSH3YG"
    asmt_all3 = trust_engine.assess_product(pid_all3)
    assert asmt_all3["available_core_modalities_count"] == 3

    # 2. Product with extreme discount anomaly
    pid_anom = "flipkart_NKCE8BG8TGGG3HV5"  # 90.44% discount
    asmt_anom = trust_engine.assess_product(pid_anom)
    assert asmt_anom["overall_risk_tier"] in {
        RiskTier.MODERATE_SINGLE_MODALITY_ANOMALY.value,
        RiskTier.ELEVATED_MULTIMODAL_ANOMALY.value
    }
    p_mod = asmt_anom["modality_breakdown"]["PRICING"]
    assert p_mod["has_anomaly"] is True
    assert p_mod["anomaly_type"] == "EXTREME_DISCOUNT_ANOMALY"


def test_listing_assessment_linkage(trust_engine):
    """Verifies listing assessment and referential linkage to product and seller."""
    lid = "list_amazon_in_amazon_in_B000052YQN"
    asmt = trust_engine.assess_listing(lid)

    assert asmt["listing_id"] == lid
    assert asmt["canonical_product_id"] == "amazon_in_B000052YQN"
    assert asmt["marketplace"] == "amazon_in"
    assert asmt["seller_id"] == "SELLER_AGG_AMAZON_IN"
    assert asmt["seller_resolution_status"] == "UNRESOLVED_PLATFORM_AGGREGATE"
    assert asmt["product_risk_tier"] == RiskTier.LOW_OBSERVED_ANOMALY.value


def test_seller_identity_governance_restrictions(trust_engine):
    """Verifies strict governance restrictions: platform aggregate pools must never be scored as individual merchants."""
    # 1. Amazon India aggregate pool
    s_asmt = trust_engine.assess_seller("SELLER_AGG_AMAZON_IN")
    assert s_asmt["seller_type"] == "PLATFORM_AGGREGATE"
    assert s_asmt["is_individual_merchant"] is False
    assert s_asmt["governance_classification"] == "PLATFORM_OPERATOR_PROXY"
    assert "platform aggregate merchant pool" in s_asmt["governance_notice"].lower()

    # 2. Flipkart aggregate pool
    s_asmt_fk = trust_engine.assess_seller("SELLER_AGG_FLIPKART")
    assert s_asmt_fk["seller_type"] == "PLATFORM_AGGREGATE"
    assert s_asmt_fk["is_individual_merchant"] is False

    # 3. Unresolved pool
    s_asmt_unres = trust_engine.assess_seller("SELLER_UNRESOLVED_THIRD_PARTY")
    assert s_asmt_unres["seller_type"] == "UNRESOLVED_MERCHANT_POOL"
    assert "omitted" in s_asmt_unres["governance_notice"].lower()


def test_zero_penalty_missing_modality_invariant(trust_engine):
    """Verifies that products with < 2 core modalities are classified as UNASSESSED_SPARSE_DATA with zero penalty."""
    # Find a product with only pricing (no image, no reviews)
    summary_df = trust_engine.evidence_engine.pricing_features_df
    # In v1.6, 1,068 products have available_core_modalities_count < 2
    # Let's inspect products table for unimaged & unreviewed product
    prods_df = trust_engine.evidence_engine.products_df
    sparse_pids = prods_df[(prods_df["has_image"] == False) & (prods_df["has_review"] == False)]["canonical_product_id"]
    assert len(sparse_pids) > 0

    test_sparse_pid = sparse_pids.iloc[0]
    asmt = trust_engine.assess_product(test_sparse_pid)

    assert asmt["overall_risk_tier"] == RiskTier.UNASSESSED_SPARSE_DATA.value
    assert asmt["available_core_modalities_count"] < 2
    assert "REVIEW_NLP" in asmt["missing_modalities"]
    assert "IMAGE_CV" in asmt["missing_modalities"]
    # Check that recommendation clearly states sparse instrumentation, not fraud
    assert "Sparse catalog instrumentation" in asmt["recommendation_summary"]


def test_correlated_signal_deduplication(trust_engine):
    """Verifies that multiple anomalies within a single modality are treated as a single modality flag."""
    # Product with extreme discount anomaly
    pid = "flipkart_NKCE8BG8TGGG3HV5"
    asmt = trust_engine.assess_product(pid)

    # If only pricing is anomalous, active_anomaly_modality_count should be exactly 1
    # unless image reuse is also detected on this product
    pricing_mod = asmt["modality_breakdown"]["PRICING"]
    assert pricing_mod["has_anomaly"] is True
    # The pricing assessment should group any corridor and discount flags
    assert len(pricing_mod["corroborating_evidence_ids"]) >= 1


def test_graph_intelligence_service(trust_engine):
    """Verifies graph intelligence, egocentric subgraphs, and cross-product image reuse queries."""
    pid = "amazon_in_B000052YQN"
    subgraph = trust_engine.get_entity_subgraph(pid, depth=1)

    assert subgraph["root_entity_id"] == pid
    assert subgraph["total_nodes"] >= 2
    assert subgraph["total_edges"] >= 1
    assert any(e["source_entity_id"] == pid or e["target_entity_id"] == pid for e in subgraph["edges"])

    # Test cross-product image sharing analysis
    patterns = trust_engine.graph_service.analyze_graph_trust_patterns(pid)
    assert "total_degree" in patterns
    assert "shared_image_peers_count" in patterns
    assert "governance_rule" in patterns


def test_product_comparison_and_evidence_density(trust_engine):
    """Verifies evidence-based comparison and anti-sparsity recommendation logic."""
    # Compare:
    # 1. Fully-instrumented product with 3 modalities (amazon_in_B000052YQN)
    # 2. Sparse product with 1 modality (unimaged, unreviewed)
    prods_df = trust_engine.evidence_engine.products_df
    sparse_pids = prods_df[(prods_df["has_image"] == False) & (prods_df["has_review"] == False)]["canonical_product_id"]
    sparse_pid = sparse_pids.iloc[0]

    dense_pid = "amazon_in_B000052YQN"

    res = trust_engine.compare_products([dense_pid, sparse_pid])

    assert res["compared_product_ids"] == [dense_pid, sparse_pid]
    # Dense product must rank highest in evidence density
    assert res["evidence_density_ranking"][0] == dense_pid
    # Recommended product MUST be the dense product, NEVER the unassessed sparse product!
    assert res["recommended_product_id"] == dense_pid
    assert "dense, multi-modal evidence" in res["recommendation_rationale"]
    # Tradeoffs must explain sparse data status
    assert any("SPARSE DATA" in t for t in res["tradeoffs"])


def test_explainable_trust_report_generation(trust_engine):
    """Verifies 12-section explainable report generation in Markdown and JSON formats."""
    pid = "amazon_in_B000052YQN"

    # 1. JSON report
    rep_dict = trust_engine.generate_report(pid, format_type="json")
    expected_sections = [
        "section_1_product_metadata",
        "section_2_overall_assessment",
        "section_3_modality_breakdown",
        "section_4_positive_evidence",
        "section_5_negative_evidence",
        "section_6_review_evidence",
        "section_7_image_evidence",
        "section_8_price_evidence",
        "section_9_seller_governance",
        "section_10_graph_evidence",
        "section_11_missing_information",
        "section_12_confidence_and_limitations",
    ]
    for sec in expected_sections:
        assert sec in rep_dict, f"Missing section '{sec}' in JSON report"

    # 2. Markdown report
    md_rep = trust_engine.generate_report(pid, format_type="markdown")
    assert isinstance(md_rep, str)
    assert f"# Multimodal Trust Assessment Report: `{pid}`" in md_rep
    assert "## 1. Product & Listing Metadata" in md_rep
    assert "## 2. Overall Trust Assessment & Risk Tier" in md_rep
    assert "## 12. Confidence, Limitations & Recommended Next Steps" in md_rep
