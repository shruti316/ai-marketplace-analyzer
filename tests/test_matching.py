"""
tests/test_matching.py
----------------------
Unit tests for cross-marketplace product entity matching.
"""

from src.features.matching import CrossMarketplaceMatcher, calculate_jaccard, normalize_title_tokens


def test_jaccard_token_similarity():
    t1 = normalize_title_tokens("Sony WH-1000XM4 Wireless Noise-Canceling Overhead Headphones Black")
    t2 = normalize_title_tokens("Sony WH-1000XM4 Wireless Headphones - Black")
    j = calculate_jaccard(t1, t2)
    assert j > 0.60, f"Expected high Jaccard similarity, got {j}"


def test_exact_model_match():
    matcher = CrossMarketplaceMatcher()
    p1 = {
        "canonical_product_id": "walmart_101",
        "marketplace": "walmart",
        "title": "Sony WH-1000XM4 Headphones",
        "brand": "Sony",
        "modelno": "WH-1000XM4",
    }
    p2 = {
        "canonical_product_id": "amazon_B0863TXGM3",
        "marketplace": "amazon",
        "title": "Sony WH-1000XM4 Wireless Noise-Canceling Overhead Headphones",
        "brand": "Sony",
        "modelno": "WH-1000XM4",
    }
    res = matcher.evaluate_pair(p1, p2)
    assert res.match_decision == "MATCHED"
    assert res.match_method == "EXACT_MODEL_MATCH"
    assert res.confidence_score >= 0.90


def test_conflicting_attributes_rejection():
    matcher = CrossMarketplaceMatcher()
    p1 = {
        "canonical_product_id": "walmart_102",
        "marketplace": "walmart",
        "title": "Apple iPhone 13 128GB Midnight",
        "brand": "Apple",
        "modelno": "MLNC3LL/A",
    }
    p2 = {
        "canonical_product_id": "amazon_B09G9FPGMB",
        "marketplace": "amazon",
        "title": "Samsung Galaxy S22 128GB Phantom Black",
        "brand": "Samsung",
        "modelno": "SM-S901U",
    }
    res = matcher.evaluate_pair(p1, p2)
    assert res.match_decision == "REJECTED"
    assert res.confidence_score < 0.50
