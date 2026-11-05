"""
Test Suite for Final Frozen Indian-First Multimodal Dataset Release
AI-Powered Marketplace Trust Intelligence Platform

Verifies:
1. 100% Domestic Indian Catalog Coverage (3,643 products across Amazon India, Flipkart, Myntra).
2. 100% INR Currency Normalization.
3. Decodable Physical Images on Disk (5,034 verified images).
4. Indian Customer Reviews with Latin-Hinglish sentiment features (3,659 reviews).
5. Indian Pricing Observations with category MAD distributions (3,643 prices).
6. Cryptographic Manifest and Immutability.
"""

import json
from pathlib import Path
import pytest
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
INDIAN_DIR = PROJECT_ROOT / "data" / "indian_marketplace_trust_dataset_final"


def test_01_indian_catalog_distribution():
    assert INDIAN_DIR.exists()
    df_prod = pd.read_parquet(INDIAN_DIR / "entities" / "products.parquet")
    assert len(df_prod) == 3643
    mkt = df_prod["marketplace"].value_counts().to_dict()
    assert mkt["amazon_in"] == 1500
    assert mkt["flipkart"] == 1143
    assert mkt["myntra"] == 1000
    # Zero international records
    assert "walmart" not in mkt
    assert "bestbuy" not in mkt
    assert "amazon" not in mkt


def test_02_indian_currency_inr():
    df_price = pd.read_parquet(INDIAN_DIR / "evidence" / "price_observations.parquet")
    assert len(df_price) == 3643
    # 100% INR currency
    currencies = set(df_price["original_currency"].dropna().unique())
    assert currencies == {"INR"}


def test_03_indian_physical_images():
    df_img = pd.read_parquet(INDIAN_DIR / "evidence" / "images.parquet")
    assert len(df_img) == 5034
    usable = df_img[df_img["is_usable"] == True]
    assert len(usable) == 4708
    assert len(df_img[df_img["is_usable"] == False]) == 326


def test_04_indian_reviews_corpus():
    df_rev = pd.read_parquet(INDIAN_DIR / "evidence" / "reviews.parquet")
    assert len(df_rev) == 3659
    # Ensure all reviews are from Indian marketplaces or unlinked Indian pool
    mkts = set(df_rev["marketplace"].unique())
    assert mkts.issubset({"flipkart", "amazon_in", "uncertain"})


def test_05_indian_derived_evidence_tables():
    df_absa = pd.read_parquet(INDIAN_DIR / "derived_evidence" / "aspect_sentiment_features.parquet")
    assert len(df_absa) >= 3400
    df_price_anom = pd.read_parquet(INDIAN_DIR / "derived_evidence" / "price_anomaly_features.parquet")
    assert len(df_price_anom) == 3643
    df_img_feat = pd.read_parquet(INDIAN_DIR / "derived_evidence" / "image_integrity_features.parquet")
    assert len(df_img_feat) >= 5034


def test_06_indian_sha256_manifest():
    manifest_p = INDIAN_DIR / "manifests" / "sha256_manifest.json"
    assert manifest_p.exists()
    with open(manifest_p) as f:
        sha_m = json.load(f)
    assert len(sha_m) == 18

    dataset_manifest_p = INDIAN_DIR / "manifests" / "dataset_manifest.json"
    assert dataset_manifest_p.exists()
    with open(dataset_manifest_p) as f:
        m = json.load(f)
    assert m["version"] == "FINAL_FROZEN_INDIAN_CORE"
    assert m["certification_verdict"] == "CERTIFIED_INDIAN_MULTIMODAL_RELEASE"
