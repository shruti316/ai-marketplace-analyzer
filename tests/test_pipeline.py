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
