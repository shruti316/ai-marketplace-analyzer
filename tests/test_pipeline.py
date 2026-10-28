"""
tests/test_pipeline.py
----------------------
Integration tests for canonical dataset integrity, referential constraints,
and multi-category / multi-marketplace coverage.
"""

import os
import pandas as pd


def test_canonical_datasets_exist():
    assert os.path.exists("data/processed/canonical_products.parquet")
    assert os.path.exists("data/processed/canonical_reviews.parquet")
    assert os.path.exists("data/processed/canonical_images.parquet")


def test_multi_marketplace_coverage():
    df_p = pd.read_parquet("data/processed/canonical_products.parquet")
    markets = set(df_p["marketplace"].unique())
    assert "amazon" in markets, "Amazon products missing from canonical catalog!"
    assert "walmart" in markets, "Walmart products missing from canonical catalog!"
    assert "bestbuy" in markets, "BestBuy products missing from canonical catalog!"
    assert "flipkart" in markets, "Flipkart products missing from canonical catalog!"
    assert "amazon_in" in markets, "Amazon India products missing from canonical catalog!"
    assert "myntra" in markets, "Myntra products missing from canonical catalog!"


def test_indian_marketplace_and_currency_provenance():
    df_p = pd.read_parquet("data/processed/canonical_products.parquet")
    countries = set(df_p["country"].unique())
    currencies = set(df_p["currency"].unique())

    assert "US" in countries, "US country missing!"
    assert "IN" in countries, "India country provenance missing!"
    assert "USD" in currencies, "USD currency missing!"
    assert "INR" in currencies, "INR currency missing!"

    # Verify India listings specifically have INR
    india_prods = df_p[df_p["country"] == "IN"]
    assert len(india_prods) >= 1000, "Too few Indian marketplace products!"
    assert (india_prods["currency"] == "INR").all(), "Indian products must have INR currency!"


def test_multi_category_coverage():
    df_p = pd.read_parquet("data/processed/canonical_products.parquet")
    cats = set(df_p["category"].unique())
    expected_categories = [
        "Electronics",
        "Beauty & Personal Care",
        "Books & Stationery",
        "Clothing & Fashion",
        "Toys & Games",
        "Home & Kitchen",
        "Grocery & Household Essentials",
    ]
    for c in expected_categories:
        assert c in cats, f"Expected category '{c}' missing from canonical catalog!"


def test_referential_integrity():
    df_p = pd.read_parquet("data/processed/canonical_products.parquet")
    df_r = pd.read_parquet("data/processed/canonical_reviews.parquet")
    df_i = pd.read_parquet("data/processed/canonical_images.parquet")

    valid_product_ids = set(df_p["canonical_product_id"])

    # 1. Zero duplicate primary keys
    assert df_p["canonical_product_id"].duplicated().sum() == 0, "Duplicate product IDs found!"
    assert df_r["canonical_review_id"].duplicated().sum() == 0, "Duplicate review IDs found!"

    # 2. Referential integrity: Reviews -> Products
    review_orphans = df_r[~df_r["canonical_product_id"].isin(valid_product_ids)]
    assert len(review_orphans) == 0, f"Found {len(review_orphans)} orphan reviews with missing product FK!"

    # 3. Referential integrity: Images -> Products
    image_orphans = df_i[~df_i["canonical_product_id"].isin(valid_product_ids)]
    assert len(image_orphans) == 0, f"Found {len(image_orphans)} orphan images with missing product FK!"


def test_unlinked_review_corpus_integrity():
    corpus_path = "data/processed/review_corpus_unlinked.parquet"
    raw_path = "data/raw/flipkart/flipkart_reviews_raw.csv"
    assert os.path.exists(corpus_path), "review_corpus_unlinked.parquet must exist!"

    df_u = pd.read_parquet(corpus_path)
    # Revision 1: Source-driven row-count validation rather than hardcoding exactly 3500
    if os.path.exists(raw_path):
        source_count = len(pd.read_csv(raw_path))
        assert len(df_u) == source_count, f"Corpus length {len(df_u)} does not match source count {source_count}!"
    else:
        assert len(df_u) > 0

    assert (df_u["linkage_status"] == "UNLINKED_RESEARCH_CORPUS").all()
    assert (df_u["country"] == "IN").all()
    assert (df_u["marketplace"] == "flipkart").all()
    valid_labels = {"positive", "negative", "neutral"}
    assert set(df_u["sentiment_label"].dropna().unique()).issubset(valid_labels)


def test_myntra_variant_preservation():
    df_p = pd.read_parquet("data/processed/canonical_products.parquet")
    myn = df_p[df_p["marketplace"] == "myntra"]
    # All 1000 SKUs must be preserved
    assert len(myn) == 1000, f"Expected 1000 Myntra variants, found {len(myn)}"
    assert myn["canonical_product_id"].nunique() == 1000
    assert myn["parent_product_id"].nunique() == 959
    assert (myn["country"] == "IN").all()
    assert (myn["currency"] == "INR").all()


def test_amazon_india_price_provenance():
    df_p = pd.read_parquet("data/processed/canonical_products.parquet")
    amz_in = df_p[df_p["marketplace"] == "amazon_in"]
    assert len(amz_in) == 1500

    # Test that the leading-dot items were normalized with evidence recorded (Revision 2)
    asin_sample = amz_in[amz_in["source_product_id"] == "B00JMELFXQ"]
    assert len(asin_sample) == 1
    row = asin_sample.iloc[0]
    assert row["price"] == 250.0
    meta = row["metadata_details"]
    assert meta["raw_price_string"] == ".250.00"
    assert meta["price_transformation_reason"] == "leading_dot_scraper_artifact_normalized"

