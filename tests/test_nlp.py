"""
tests/test_nlp.py
------------------
Unit tests for the NLP Review Analysis and Trust Intelligence Module.
"""

import pandas as pd
import numpy as np
from src.nlp.review_analysis import (
    get_sentiment_compound,
    classify_rating_sentiment,
    classify_text_sentiment,
    is_polar_discordance,
    ProductReviewAnalyzer,
)


def test_sentiment_compound_polarity():
    """Verifies sentiment scoring on positive, negative, neutral, and empty text."""
    pos_score = get_sentiment_compound("This product is amazing, high quality and absolutely wonderful!")
    neg_score = get_sentiment_compound("Terrible defective item, completely broke on arrival, absolute waste.")
    neutral_score = get_sentiment_compound("The item arrived in a cardboard box on Tuesday.")
    empty_score = get_sentiment_compound("")
    none_score = get_sentiment_compound(None)

    assert pos_score > 0.4, f"Expected strong positive score, got {pos_score}"
    assert neg_score < -0.4, f"Expected strong negative score, got {neg_score}"
    assert -0.3 <= neutral_score <= 0.3, f"Expected neutral score, got {neutral_score}"
    assert empty_score == 0.0, f"Expected 0.0 for empty string, got {empty_score}"
    assert none_score == 0.0, f"Expected 0.0 for None, got {none_score}"


def test_polar_discordance_logic():
    """Verifies polar discordance evaluation and exclusion of nuanced neutral ratings."""
    # Strong discordance: 5-star rating with negative text
    assert is_polar_discordance(5.0, -0.65) is True
    assert is_polar_discordance(4.0, -0.25) is True

    # Strong discordance: 1-star rating with positive text
    assert is_polar_discordance(1.0, 0.55) is True
    assert is_polar_discordance(2.0, 0.35) is True

    # Concordant ratings
    assert is_polar_discordance(5.0, 0.75) is False
    assert is_polar_discordance(1.0, -0.80) is False

    # Neutral 3-star rating: should NOT trigger discordance flag
    assert is_polar_discordance(3.0, 0.85) is False
    assert is_polar_discordance(3.0, -0.75) is False
    assert is_polar_discordance(3.0, 0.0) is False

    # Nuanced / borderline text (-0.1 to 0.2): should not trigger discordance
    assert is_polar_discordance(5.0, 0.1) is False
    assert is_polar_discordance(5.0, -0.1) is False
    assert is_polar_discordance(1.0, 0.2) is False


def test_product_review_analyzer_zero_reviews():
    """Verifies honest reporting for zero-review listings."""
    analyzer = ProductReviewAnalyzer()
    df_empty = pd.DataFrame(columns=["canonical_review_id", "review_text", "rating", "verified_purchase"])

    res = analyzer.analyze_reviews(df_empty)
    assert res["review_status"] == "ZERO_REVIEWS"
    assert res["review_count"] == 0
    assert res["average_rating"] is None
    assert "NO_REVIEWS_AVAILABLE" in res["evidence_flags"]


def test_product_review_analyzer_single_review():
    """Verifies honest handling of sparse single-review listings."""
    analyzer = ProductReviewAnalyzer()
    df_single = pd.DataFrame([{
        "canonical_review_id": "rev_001",
        "review_text": "Great product, works exactly as described.",
        "rating": 5.0,
        "verified_purchase": True,
    }])

    res = analyzer.analyze_reviews(df_single)
    assert res["review_status"] == "SPARSE_SINGLE_REVIEW"
    assert res["review_count"] == 1
    assert res["average_rating"] == 5.0
    assert res["verified_purchase_ratio"] == 1.0
    assert res["max_similarity_score"] == 0.0
    assert res["repetitive_review_pairs"] == 0
    assert "SPARSE_SINGLE_REVIEW" in res["evidence_flags"]


def test_product_review_analyzer_multi_review_similarity():
    """Verifies detection of copy-paste reviews and similarity clustering."""
    analyzer = ProductReviewAnalyzer(similarity_threshold=0.80)
    df_cluster = pd.DataFrame([
        {
            "canonical_review_id": "rev_1",
            "review_text": "Five stars amazing product! Highly recommend to everyone looking for great value.",
            "rating": 5.0,
            "verified_purchase": False,
        },
        {
            "canonical_review_id": "rev_2",
            "review_text": "Five stars amazing product! Highly recommend to everyone looking for great value.",
            "rating": 5.0,
            "verified_purchase": False,
        },
        {
            "canonical_review_id": "rev_3",
            "review_text": "Five stars amazing product! Highly recommend to all looking for great value.",
            "rating": 5.0,
            "verified_purchase": False,
        },
        {
            "canonical_review_id": "rev_4",
            "review_text": "Completely different text about battery life and screen brightness.",
            "rating": 4.0,
            "verified_purchase": True,
        },
    ])

    res = analyzer.analyze_reviews(df_cluster)
    assert res["review_status"] == "DENSE_MULTI_REVIEW"
    assert res["review_count"] == 4
    assert res["exact_duplicate_reviews"] >= 1
    assert res["repetitive_review_pairs"] >= 2
    assert res["max_similarity_score"] >= 0.85
    assert any("REPETITIVE_REVIEW_CLUSTER" in f for f in res["evidence_flags"])
    assert any("EXACT_DUPLICATE_REVIEWS" in f for f in res["evidence_flags"])


def test_product_review_analyzer_missing_empty_text():
    """Verifies that missing and unparseable review texts are tracked and reported."""
    analyzer = ProductReviewAnalyzer()
    df_sparse_text = pd.DataFrame([
        {"canonical_review_id": "rev_1", "review_text": "", "rating": 5.0, "verified_purchase": True},
        {"canonical_review_id": "rev_2", "review_text": None, "rating": 4.0, "verified_purchase": True},
        {"canonical_review_id": "rev_3", "review_text": "ok", "rating": 3.0, "verified_purchase": True},
        {"canonical_review_id": "rev_4", "review_text": "Valid review text that exceeds minimum character limits.", "rating": 5.0, "verified_purchase": True},
    ])

    res = analyzer.analyze_reviews(df_sparse_text)
    assert res["empty_or_missing_text_count"] == 3
    assert any("EMPTY_OR_UNPARSEABLE_REVIEWS" in f for f in res["evidence_flags"])
