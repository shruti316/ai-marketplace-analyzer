"""
tests/test_risk_engine.py
-------------------------
Unit tests for the multimodal explainable risk engine.
"""

from src.risk.engine import MarketplaceRiskEngine


def test_risk_engine_baseline_low_risk():
    engine = MarketplaceRiskEngine()

    product = {
        "canonical_product_id": "amazon_TEST001",
        "marketplace": "amazon",
        "category": "Electronics",
        "title": "High Precision Gaming Mouse with Optical Sensor",
        "description": "Ergonomic design, customizable DPI settings, RGB backlighting.",
        "brand": "ProGamer",
        "seller_id": "M_12345678",
    }
    price_analysis = {
        "price_status": "VALID",
        "price_observed": 39.99,
        "anomaly_flag": "NORMAL_PRICE_RANGE",
        "evidence_explanation": "Price ($39.99) is normal.",
    }
    review_analysis = {
        "review_count": 50,
        "review_status": "DENSE_MULTI_REVIEW",
        "average_rating": 4.5,
        "verified_purchase_ratio": 0.90,
        "repetitive_review_pairs": 0,
        "sentiment_disagreement_ratio": 0.05,
        "evidence_summary": "50 reviews analyzed. Healthy distribution.",
    }
    visual_analysis = {
        "image_status": "VALIDATED",
        "packaging_consistency_score": 0.85,
        "evidence_summary": "Packaging matches product title.",
    }

    result = engine.evaluate_product_listing(product, price_analysis, review_analysis, visual_analysis)

    assert result["risk_tier"] == "LOW"
    assert result["risk_score"] < 15.0
    assert result["confidence_score"] >= 0.80
    assert len(result["risk_signals_triggered"]) == 0
    assert "No anomalous patterns detected" in result["risk_narrative"]


def test_risk_engine_compound_risk():
    engine = MarketplaceRiskEngine()

    product = {
        "canonical_product_id": "amazon_TEST002",
        "marketplace": "amazon",
        "category": "Electronics",
        "title": "Flagship 4K Ultra HD Smart TV",
        "description": "",
        "brand": "SuperBrand",
        "seller_id": None,
    }
    price_analysis = {
        "price_status": "VALID",
        "price_observed": 29.99,  # Ridiculously cheap for a 4K TV
        "anomaly_flag": "PRICE_BELOW_LOWER_FENCE",
        "evidence_explanation": "Observed price ($29.99) is 95% below category median.",
    }
    review_analysis = {
        "review_count": 20,
        "review_status": "DENSE_MULTI_REVIEW",
        "average_rating": 4.9,
        "verified_purchase_ratio": 0.05,  # 95% unverified
        "repetitive_review_pairs": 5,     # Copy-paste reviews
        "sentiment_disagreement_ratio": 0.0,
        "evidence_summary": "Severe review clustering detected.",
    }
    visual_analysis = {
        "image_status": "VALIDATED",
        "ocr_text": "Generic Kitchen Blender",  # Blatant packaging mismatch
        "packaging_consistency_score": 0.0,
        "evidence_summary": "Packaging text does not match listing.",
    }

    result = engine.evaluate_product_listing(product, price_analysis, review_analysis, visual_analysis)

    assert result["risk_tier"] in ["ELEVATED", "HIGH"]
    assert result["risk_score"] >= 60.0
    assert any("PRICE_ANOMALY_LOW" in s for s in result["risk_signals_triggered"])
    assert any("REPETITIVE_REVIEW_CLUSTER" in s for s in result["risk_signals_triggered"])
    assert any("PACKAGING_LISTING_TEXT_MISMATCH" in s for s in result["risk_signals_triggered"])


def test_risk_engine_handles_missing_signals_non_punitively():
    engine = MarketplaceRiskEngine()

    product = {
        "canonical_product_id": "walmart_TEST003",
        "marketplace": "walmart",
        "category": "Clothing & Fashion",
        "title": "Classic Cotton Crewneck T-Shirt",
        "description": "100% breathable combed cotton.",
        "brand": "BasicWear",
        "seller_id": None,
    }
    price_analysis = {
        "price_status": "MISSING_PRICE",
        "anomaly_flag": "PRICE_UNAVAILABLE",
    }
    review_analysis = {
        "review_count": 0,
        "review_status": "ZERO_REVIEWS",
    }

    result = engine.evaluate_product_listing(product, price_analysis, review_analysis, None)

    # Missing price and zero reviews should drop confidence, NOT result in false HIGH risk
    assert result["risk_tier"] == "LOW"
    assert result["confidence_score"] <= 0.35
    assert "PRICE_UNAVAILABLE" in result["missing_signals"]
    assert "CUSTOMER_REVIEWS_UNAVAILABLE (Zero reviews on record)" in result["missing_signals"]


   
def test_low_customer_rating_does_not_increase_fraud_risk():
    engine = MarketplaceRiskEngine()

    product = {
        "canonical_product_id": "amazon_LOW_RATING",
        "marketplace": "amazon",
        "category": "Beauty",
        "title": "Basic Hair Extension Tape",
        "description": "Hair extension tape replacement pack.",
        "brand": "Duo",
        "seller_id": "M_TEST",
    }

    price_analysis = {
        "price_status": "VALID",
        "price_observed": 16.75,
        "anomaly_flag": "NORMAL_PRICE_RANGE",
        "evidence_explanation": "Price is within the expected range.",
    }

    review_analysis = {
        "review_count": 28,
        "review_status": "DENSE_MULTI_REVIEW",
        "average_rating": 2.0,
        "average_sentiment_compound": -0.40,
        "verified_purchase_ratio": 0.90,
        "repetitive_review_pairs": 0,
        "sentiment_disagreement_ratio": 0.05,
        "evidence_summary": "Reviews indicate poor customer satisfaction.",
    }

    result = engine.evaluate_product_listing(
        product, price_analysis, review_analysis, None
    )

    assert result["risk_score"] == 0.0
    assert result["risk_tier"] == "LOW"
    assert result["customer_experience"]["average_rating"] == 2.0
    assert "satisfaction appears low" in (
        result["customer_experience"]["summary"]
    ).lower()
    assert not any(
        "LOW_RATING" in signal
        for signal in result["risk_signals_triggered"]
    )




def test_confidence_score_is_documented_as_evidence_availability():
    engine = MarketplaceRiskEngine()

    product = {
        "canonical_product_id": "amazon_CONFIDENCE_TEST",
        "marketplace": "amazon",
        "category": "Electronics",
        "title": "Basic Wireless Mouse",
        "description": "Wireless mouse with USB receiver.",
        "brand": "ExampleBrand",
        "seller_id": "M_TEST",
    }

    price_analysis = {
        "price_status": "VALID",
        "price_observed": 20.0,
        "anomaly_flag": "NORMAL_PRICE_RANGE",
        "evidence_explanation": "Price is within the expected range.",
    }

    review_analysis = {
        "review_count": 10,
        "review_status": "DENSE_MULTI_REVIEW",
        "average_rating": 4.0,
        "verified_purchase_ratio": 0.8,
        "repetitive_review_pairs": 0,
        "sentiment_disagreement_ratio": 0.0,
        "evidence_summary": "Ten reviews analyzed.",
    }

    result = engine.evaluate_product_listing(
        product, price_analysis, review_analysis, None
    )

    assert 0.0 <= result["confidence_score"] <= 1.0
    assert result["engine_metadata"]["confidence_interpretation"] == (
        "evidence_availability_not_probability"
    )
