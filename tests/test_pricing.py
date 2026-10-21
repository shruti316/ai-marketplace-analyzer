"""
tests/test_pricing.py
---------------------
Unit tests for category-relative price anomaly detection and Tukey fence evaluation.
"""

import pandas as pd
from src.features.pricing import CategoryPricingAnalyzer


def sample_pricing_data():
    return pd.DataFrame([
        {"category": "Electronics", "price": 100.0, "currency": "USD"},
        {"category": "Electronics", "price": 110.0, "currency": "USD"},
        {"category": "Electronics", "price": 95.0, "currency": "USD"},
        {"category": "Electronics", "price": 105.0, "currency": "USD"},
        {"category": "Electronics", "price": 120.0, "currency": "USD"},
        {"category": "Electronics", "price": 90.0, "currency": "USD"},
        {"category": "Books & Stationery", "price": 15.0, "currency": "USD"},
        {"category": "Books & Stationery", "price": 18.0, "currency": "USD"},
        {"category": "Books & Stationery", "price": 12.0, "currency": "USD"},
        {"category": "Books & Stationery", "price": 14.0, "currency": "USD"},
        {"category": "Books & Stationery", "price": 20.0, "currency": "USD"},
    ])


def test_pricing_analyzer_fit_and_normal(sample_pricing_data):
    analyzer = CategoryPricingAnalyzer(min_sample_size=3)
    analyzer.fit(sample_pricing_data)

    res = analyzer.analyze_product_price(102.0, "Electronics")
    assert res["price_status"] == "VALID"
    assert res["anomaly_flag"] == "NORMAL_PRICE_RANGE"
    assert "within expected category" in res["evidence_explanation"]


def test_pricing_dumping_anomaly(sample_pricing_data):
    analyzer = CategoryPricingAnalyzer(min_sample_size=3)
    analyzer.fit(sample_pricing_data)

    # Extreme low price ($10 for an electronic device whose median is ~$102)
    res = analyzer.analyze_product_price(10.0, "Electronics")
    assert res["anomaly_flag"] == "PRICE_BELOW_LOWER_FENCE"
    assert "below category median" in res["evidence_explanation"]


def test_pricing_missing_price():
    analyzer = CategoryPricingAnalyzer(min_sample_size=3)
    res = analyzer.analyze_product_price(None, "Electronics")
    assert res["price_status"] == "MISSING_PRICE"
    assert res["anomaly_flag"] == "PRICE_UNAVAILABLE"
