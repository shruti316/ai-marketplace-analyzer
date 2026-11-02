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


def test_pricing_analyzer_fit_and_normal(pricing_data=None):
    if pricing_data is None:
        pricing_data = sample_pricing_data()
    analyzer = CategoryPricingAnalyzer(min_sample_size=3)
    analyzer.fit(pricing_data)

    res = analyzer.analyze_product_price(102.0, "Electronics")
    assert res["price_status"] == "VALID"
    assert res["anomaly_flag"] == "NORMAL_PRICE_RANGE"
    assert "within expected category" in res["evidence_explanation"]


def test_pricing_missing_price():
    analyzer = CategoryPricingAnalyzer(min_sample_size=3)
    res = analyzer.analyze_product_price(None, "Electronics")
    assert res["price_status"] == "MISSING_PRICE"
    assert res["anomaly_flag"] == "PRICE_UNAVAILABLE"


    # Analyze USD item: should compare against USD median (~102.5), NOT INR (8150)
    res_usd = analyzer.analyze_product_price(102.0, "Electronics", currency="USD")
    assert res_usd["price_status"] == "VALID"
    assert res_usd["anomaly_flag"] == "NORMAL_PRICE_RANGE"
    assert "$" in res_usd["evidence_explanation"]

    # Analyze INR item: should compare against INR median (~8150), NOT USD
    res_inr = analyzer.analyze_product_price(8200.0, "Electronics", currency="INR")
    assert res_inr["price_status"] == "VALID"
    assert res_inr["anomaly_flag"] == "NORMAL_PRICE_RANGE"
    assert "₹" in res_inr["evidence_explanation"]

"""
Unit tests for marketplace-specific price anomaly detection.
"""

import numpy as np
import pandas as pd
import pytest

from src.features.pricing import CategoryPricingAnalyzer


def sample_pricing_data():
    rows = []

    # Amazon US - Electronics - USD
    for price in [100, 110, 95, 105, 120, 90]:
        rows.append({
            "marketplace": "amazon",
            "category": "Electronics",
            "price": price,
            "currency": "USD"
        })

    # Amazon US - Books - USD
    for price in [15, 18, 12, 14, 20]:
        rows.append({
            "marketplace": "amazon",
            "category": "Books & Stationery",
            "price": price,
            "currency": "USD"
        })

    # Flipkart - Electronics - INR
    for price in [8000, 8500, 8200, 8100, 8300, 8400]:
        rows.append({
            "marketplace": "flipkart",
            "category": "Electronics",
            "price": price,
            "currency": "INR"
        })

    return pd.DataFrame(rows)


def test_pricing_analyzer_fit_and_normal():
    df = sample_pricing_data()

    analyzer = CategoryPricingAnalyzer(min_sample_size=3)
    analyzer.fit(df)

    result = analyzer.analyze_product_price(
        102.0, "amazon", "Electronics", "USD"
    )

    assert result["price_status"] == "VALID"
    assert result["anomaly_flag"] == "NORMAL_PRICE_RANGE"


def test_pricing_low_price_anomaly():
    analyzer = CategoryPricingAnalyzer(min_sample_size=3)
    analyzer.fit(sample_pricing_data())

    result = analyzer.analyze_product_price(
        10.0, "amazon", "Electronics", "USD"
    )

    assert result["price_status"] == "VALID"
    assert result["anomaly_flag"] == "PRICE_BELOW_LOWER_FENCE"


def test_pricing_high_price_anomaly():
    analyzer = CategoryPricingAnalyzer(min_sample_size=3)
    analyzer.fit(sample_pricing_data())

    result = analyzer.analyze_product_price(
        1000.0, "amazon", "Electronics", "USD"
    )

    assert result["price_status"] == "VALID"
    assert result["anomaly_flag"] == "PRICE_ABOVE_UPPER_FENCE"


def test_pricing_missing_price():
    analyzer = CategoryPricingAnalyzer(min_sample_size=3)
    analyzer.fit(sample_pricing_data())

    result = analyzer.analyze_product_price(
        None, "amazon", "Electronics", "USD"
    )

    assert result["price_status"] == "MISSING_PRICE"


@pytest.mark.parametrize("invalid_price", [
    0,
    -100,
    np.inf,
    -np.inf,
    "not-a-price"
])
def test_pricing_invalid_values(invalid_price):
    analyzer = CategoryPricingAnalyzer(min_sample_size=3)
    analyzer.fit(sample_pricing_data())

    result = analyzer.analyze_product_price(
        invalid_price, "amazon", "Electronics", "USD"
    )

    assert result["price_status"] == "INVALID_PRICE"


def test_pricing_currency_separation():
    analyzer = CategoryPricingAnalyzer(min_sample_size=3)
    analyzer.fit(sample_pricing_data())

    usd_result = analyzer.analyze_product_price(
        102.0, "amazon", "Electronics", "USD"
    )

    inr_result = analyzer.analyze_product_price(
        8200.0, "flipkart", "Electronics", "INR"
    )

    assert usd_result["anomaly_flag"] == "NORMAL_PRICE_RANGE"
    assert inr_result["anomaly_flag"] == "NORMAL_PRICE_RANGE"


def test_pricing_marketplace_separation():
    df = sample_pricing_data()

    # Create a separate marketplace with a different price distribution.
    extra = pd.DataFrame([
        {
            "marketplace": "walmart",
            "category": "Electronics",
            "price": price,
            "currency": "USD"
        }
        for price in [500, 510, 490, 520, 505]
    ])

    df = pd.concat([df, extra], ignore_index=True)

    analyzer = CategoryPricingAnalyzer(min_sample_size=3)
    analyzer.fit(df)

    amazon_result = analyzer.analyze_product_price(
        102.0, "amazon", "Electronics", "USD"
    )

    walmart_result = analyzer.analyze_product_price(
        505.0, "walmart", "Electronics", "USD"
    )

    assert amazon_result["anomaly_flag"] == "NORMAL_PRICE_RANGE"
    assert walmart_result["anomaly_flag"] == "NORMAL_PRICE_RANGE"


def test_pricing_insufficient_peer_group():
    analyzer = CategoryPricingAnalyzer(min_sample_size=20)
    analyzer.fit(sample_pricing_data())

    result = analyzer.analyze_product_price(
        102.0, "amazon", "Electronics", "USD"
    )

    assert result["price_status"] == "INSUFFICIENT_PEER_GROUP"


def test_pricing_missing_marketplace():
    analyzer = CategoryPricingAnalyzer(min_sample_size=3)
    analyzer.fit(sample_pricing_data())

    result = analyzer.analyze_product_price(
        102.0, None, "Electronics", "USD"
    )

    assert result["price_status"] == "MISSING_MARKETPLACE"


def test_pricing_missing_currency():
    analyzer = CategoryPricingAnalyzer(min_sample_size=3)
    analyzer.fit(sample_pricing_data())

    result = analyzer.analyze_product_price(
        102.0, "amazon", "Electronics", None
    )

    assert result["price_status"] == "MISSING_CURRENCY"


def test_pricing_missing_category():
    analyzer = CategoryPricingAnalyzer(min_sample_size=3)
    analyzer.fit(sample_pricing_data())

    result = analyzer.analyze_product_price(
        102.0, "amazon", None, "USD"
    )

    assert result["price_status"] == "MISSING_CATEGORY"