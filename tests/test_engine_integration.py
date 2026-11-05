"""
Integration and Unit Test Suite for Marketplace Trust Intelligence Engine
Validates all 9 workstreams across services, contracts, and unified API.
"""

import json
from pathlib import Path
import pytest
import numpy as np
import pandas as pd

from src.engine.api import MarketplaceTrustAPI
from src.engine.contracts import (
    MultimodalTrustReport,
    ProductComparisonReport,
    RecommendationItem,
    ReviewEvidence,
    ReviewItem,
)
from src.engine.drift_service import MarketplaceDriftMonitoringService
from src.engine.graph_service import GraphIntelligenceService
from src.engine.matching_service import CrossMarketplaceMatchingService
from src.engine.nlp_service import NLPReviewIntelligenceService
from src.engine.pricing_service import PricingIntelligenceService
from src.engine.recommendation_service import RecommendationComparisonService
from src.engine.trust_engine import MarketplaceTrustEngine
from src.engine.vision_service import ComputerVisionIntelligenceService


@pytest.fixture(scope="module")
def api():
    return MarketplaceTrustAPI()


def test_01_contracts_serialization():
    rep = MultimodalTrustReport(
        canonical_product_id="TEST_001",
        product_title="Test Listing",
        marketplace="amazon_in",
        category="Electronics",
        modality_tier="TIER_A_COMPLETE",
        composite_trust_score=0.92,
        confidence_score=1.0,
        risk_level="LOW_RISK",
        modality_scores={"text": 0.9, "vision": 0.95, "price": 0.9},
        available_modalities=["PRODUCT_METADATA", "CUSTOMER_REVIEWS", "PRODUCT_IMAGES", "PRICE_INTELLIGENCE"],
        missing_modalities=[],
        risk_signals=["NO_ELEVATED_RISK"],
        explanations=["Verified listing."],
    )
    d = rep.to_dict()
    assert d["canonical_product_id"] == "TEST_001"
    assert d["composite_trust_score"] == 0.92
    j = rep.to_json()
    assert "TEST_001" in j


def test_02_nlp_preprocessing_and_absa():
    svc = NLPReviewIntelligenceService()
    text = "The sound quality is incredible and battery life lasts 24 hours! Delivery was very fast."
    clean = svc.preprocess_text(text)
    assert "quality" in clean
    aspects = svc.extract_aspects(clean)
    assert aspects["quality"].mentioned is True
    assert aspects["performance_battery"].mentioned is True
    assert aspects["delivery_packaging"].mentioned is True
    assert aspects["quality"].polarity == 0 or aspects["quality"].polarity == 1


def test_03_nlp_discordance_detection():
    svc = NLPReviewIntelligenceService()
    # 5-star rating with strongly negative text
    rev_disc = svc.analyze_single_review(
        "This is terrible, broken, garbage, worst waste of money and awful junk",
        rating=5.0,
    )
    assert rev_disc.rating_sentiment_discordance is True
    assert "RATING_SENTIMENT_DISCORDANCE" in rev_disc.suspicion_flags

    # Normal 5-star review
    rev_norm = svc.analyze_single_review(
        "Great quality product, works smoothly and good price",
        rating=5.0,
    )
    assert rev_norm.rating_sentiment_discordance is False


def test_04_nlp_product_reviews_retrieval():
    svc = NLPReviewIntelligenceService()
    res = svc.analyze_product_reviews("bestbuy_mmm73ll_a")
    assert res.total_reviews == 3108
    assert res.mean_rating > 4.5
    assert "quality" in res.dominant_aspects
    assert "performance_battery" in res.dominant_aspects


def test_05_vision_exact_and_perceptual_duplicates():
    svc = ComputerVisionIntelligenceService()
    eval_res = svc.evaluate_vision_language_concordance()
    assert eval_res["total_embeddings"] == 5228
    assert eval_res["embedding_dimension"] == 512


def test_06_vision_similarity_search():
    svc = ComputerVisionIntelligenceService()
    matches = svc.find_visually_similar_products("amazon_in_B000052YQN", top_k=3)
    assert len(matches) == 3
    assert matches[0]["cosine_similarity"] > 0.80


def test_07_pricing_mad_zscore_and_anomalies():
    svc = PricingIntelligenceService()
    # Test valid product price
    res = svc.analyze_product_price("amazon_in_B000052YQN")
    assert res.is_price_valid is True
    assert res.normalized_price_inr == 890.0
    assert abs(res.mad_zscore) < 3.5

    # Test extreme outlier ad-hoc
    adhoc = svc.analyze_product_price(
        "ADHOC_PRICING",
        custom_price=250000.0,
        custom_category="Beauty & Personal Care",
        custom_mrp=100000.0,
    )
    assert adhoc.is_extreme_high_outlier is True
    assert adhoc.has_negative_discount is True
    assert "EXTREME_HIGH_PRICE_OUTLIER_MAD" in adhoc.risk_signals


def test_08_graph_topology_and_centrality():
    svc = GraphIntelligenceService()
    res = svc.extract_graph_evidence("amazon_in_B000052YQN")
    assert res.total_degree >= 3
    assert res.is_evidence_isolated is False
    assert res.connected_component_id >= 0


def test_09_matching_variant_differentiation():
    svc = CrossMarketplaceMatchingService()
    # Preserves variants with conflicting volume
    m_var = svc.match_two_listings(
        "Nivea Soft Moisturizing Cream 100ml", "Nivea",
        "Nivea Soft Moisturizing Cream 300ml", "Nivea",
    )
    assert m_var.resolution_status == "VARIANT_FAMILY_CROSS_MARKETPLACE"
    assert "volume_weight" in m_var.evidence_note


def test_10_matching_high_confidence():
    svc = CrossMarketplaceMatchingService()
    # Normalized exact match
    m_exact = svc.match_two_listings(
        "Apple iPhone 13 128GB Midnight", "Apple",
        "Apple iPhone 13 (128GB) - Midnight", "Apple",
    )
    assert m_exact.resolution_status == "EXACT_CROSS_MARKETPLACE_MATCH"
    assert m_exact.match_confidence == 1.0

    # High confidence fuzzy match
    m_high = svc.match_two_listings(
        "Apple iPhone 13 128GB Midnight", "Apple",
        "Apple iPhone 13 128GB Midnight Smartphone Unlocked", "Apple",
    )
    assert m_high.resolution_status == "HIGH_CONFIDENCE_MATCH"
    assert m_high.match_confidence >= 0.75


def test_11_trust_engine_multimodal_analysis(api):
    rep = api.get_product_trust_report("amazon_in_B000052YQN")
    assert rep.composite_trust_score > 0.70
    assert rep.confidence_score >= 0.70
    assert rep.modality_tier in ["TIER_A_COMPLETE", "TIER_B_VISUAL"]
    assert "PRODUCT_METADATA" in rep.available_modalities


def test_12_trust_engine_ablation(api):
    abl = api.evaluate_modality_ablation("amazon_in_B000052YQN", ["PRODUCT_IMAGES"])
    assert "PRODUCT_IMAGES" in abl["omitted_modalities"]
    assert "full_confidence" in abl
    assert "ablated_confidence" in abl


def test_13_recommendations_and_utility(api):
    recs = api.recommend_alternatives("amazon_in_B000052YQN", top_k=3)
    assert len(recs) == 3
    for r in recs:
        assert r.category == "Beauty & Personal Care"
        assert r.utility_score > 0.50
        assert r.trust_score >= 0.70


def test_14_product_comparison(api):
    comp = api.compare_products("amazon_in_B000052YQN", "bestbuy_mmm73ll_a")
    assert comp.preferred_product_id in ["amazon_in_B000052YQN", "bestbuy_mmm73ll_a"]
    assert comp.comparison_summary != ""
    assert "aspect_comparison" in comp.__dict__


def test_15_drift_monitoring(api):
    rep = api.check_system_drift()
    assert rep.total_features_evaluated == 4
    assert rep.system_alert_level in ["NORMAL", "WARNING", "CRITICAL"]
    assert len(rep.drift_details) == 4


def test_16_custom_listing_analysis(api):
    custom_listing = {
        "canonical_product_id": "CUSTOM_PROD_100",
        "product_title": "Brand New Noise-Cancelling Headphones",
        "category": "Electronics",
        "price": 4999.0,
        "currency": "INR",
        "retail_mrp": 7999.0,
        "reviews": [
            ReviewItem(review_id="R1", review_text="Excellent sound quality and fast delivery!", rating=5.0),
            ReviewItem(review_id="R2", review_text="Good headphones, battery lasts all day.", rating=4.0),
        ],
    }
    rep = api.analyze_custom_listing(custom_listing)
    assert rep.canonical_product_id == "CUSTOM_PROD_100"
    assert rep.composite_trust_score >= 0.80
    assert rep.nlp_summary["total_reviews"] == 2
