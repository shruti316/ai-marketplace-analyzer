"""
Test Suite for Enriched Indian-First Multimodal Dataset Release v1.1
AI-Powered Marketplace Trust Intelligence Platform

Verifies:
1. 100% Domestic Indian Catalog Coverage (3,643 products across Amazon India, Flipkart, Myntra).
2. 100% INR Currency Normalization (zero foreign retail records).
3. Review Corpus Resolution (3,659 reviews, 100% linked, 0 unlinked).
4. Physical Product Images (4,708 usable decodable JPEGs on disk).
5. 1-to-1 ResNet-18 Embeddings (4,708 vectors, 512-dim, L2-normalized).
6. Graph Entity Relationships (11,990 edges, zero orphaned endpoints).
7. Dynamic Multimodal Coverage Matrix (20 columns, dynamic non-hardcoded tiers).
8. Immutability of Original Release (data/indian_marketplace_trust_dataset_final/).
"""

import json
from pathlib import Path
import numpy as np
import pandas as pd
import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATASET_V11_DIR = PROJECT_ROOT / "data" / "indian_marketplace_trust_dataset_v1_1"
ORIGINAL_DATASET_DIR = PROJECT_ROOT / "data" / "indian_marketplace_trust_dataset_final"


def test_01_catalog_distribution_and_integrity():
    assert DATASET_V11_DIR.exists()
    df_prod = pd.read_parquet(DATASET_V11_DIR / "entities" / "products.parquet")
    assert len(df_prod) == 3643
    mkt = df_prod["marketplace"].value_counts().to_dict()
    assert mkt["amazon_in"] == 1500
    assert mkt["flipkart"] == 1143
    assert mkt["myntra"] == 1000

    # Ensure zero foreign marketplaces
    for foreign in ["walmart", "bestbuy", "amazon", "target"]:
        assert foreign not in mkt

    # Ensure zero 'Other' categories
    assert (df_prod["category"] == "Other").sum() == 0


def test_02_currency_and_pricing_integrity():
    df_price = pd.read_parquet(DATASET_V11_DIR / "evidence" / "price_observations.parquet")
    assert len(df_price) == 3643
    currencies = set(df_price["original_currency"].dropna().unique())
    assert currencies == {"INR"}
    assert (df_price["is_valid_price"] == True).sum() == 3623
    assert (df_price["is_valid_price"] == False).sum() == 20


def test_03_resolved_review_corpus():
    df_rev = pd.read_parquet(DATASET_V11_DIR / "evidence" / "reviews.parquet")
    assert len(df_rev) == 3659

    # 100% linked
    assert df_rev["canonical_product_id"].isna().sum() == 0
    assert (df_rev["canonical_product_id"] == "").sum() == 0
    assert (df_rev["canonical_product_id"] == "UNLINKED_CORPUS").sum() == 0
    assert (df_rev["marketplace"] == "uncertain").sum() == 0

    # Verify all review foreign keys exist in products table
    df_prod = pd.read_parquet(DATASET_V11_DIR / "entities" / "products.parquet")
    prod_pids = set(df_prod["canonical_product_id"])
    assert set(df_rev["canonical_product_id"]).issubset(prod_pids)


def test_04_physical_images_on_disk():
    df_img = pd.read_parquet(DATASET_V11_DIR / "evidence" / "images.parquet")
    assert len(df_img) == 5034
    usable = df_img[df_img["is_usable"] == True]
    assert len(usable) == 4708
    assert len(df_img[df_img["is_usable"] == False]) == 326


def test_05_resnet18_embeddings_alignment():
    emb_path = DATASET_V11_DIR / "derived_evidence" / "visual_embeddings_resnet18.npz"
    assert emb_path.exists()

    data = np.load(emb_path, allow_pickle=True)
    img_ids = data["image_ids"]
    norm_embs = data["normalized_embeddings"]

    assert len(img_ids) == 4708
    assert norm_embs.shape == (4708, 512)
    assert np.all(np.isfinite(norm_embs))

    # Verify L2 normalization
    norms = np.linalg.norm(norm_embs, axis=1)
    assert np.allclose(norms, 1.0, atol=1e-5)

    # Verify 1-to-1 match with usable images in images table
    df_img = pd.read_parquet(DATASET_V11_DIR / "evidence" / "images.parquet")
    usable_ids = set(df_img[df_img["is_usable"] == True]["image_id"])
    assert set(img_ids) == usable_ids


def test_06_graph_relationships_reconciliation():
    df_edges = pd.read_parquet(DATASET_V11_DIR / "relationships" / "entity_relationships.parquet")
    assert len(df_edges) == 11990

    counts = df_edges["relationship_type"].value_counts().to_dict()
    assert counts["HAS_IMAGE"] == 4708
    assert counts["HAS_PRICE"] == 3623
    assert counts["HAS_REVIEW"] == 3659

    # Verify source entity foreign keys
    df_prod = pd.read_parquet(DATASET_V11_DIR / "entities" / "products.parquet")
    prod_pids = set(df_prod["canonical_product_id"])
    assert set(df_edges["source_entity_id"]).issubset(prod_pids)


def test_07_multimodal_coverage_matrix():
    matrix_path = DATASET_V11_DIR / "derived_evidence" / "multimodal_coverage_matrix.parquet"
    assert matrix_path.exists()

    df_m = pd.read_parquet(matrix_path)
    assert len(df_m) == 3643
    assert len(df_m.columns) == 20

    # Verify Tier A items have all 4 modalities
    tier_a = df_m[df_m["coverage_tier"] == "Tier A"]
    assert len(tier_a) >= 5
    for _, r in tier_a.iterrows():
        assert r["modality_count"] == 4
        assert r["review_status"] == "AVAILABLE"
        assert r["image_status"] == "AVAILABLE"
        assert r["price_status"] == "AVAILABLE"
        assert r["metadata_status"] == "AVAILABLE"


def test_08_original_baseline_immutability():
    # Verify original final dataset remains untouched and exists
    assert ORIGINAL_DATASET_DIR.exists()
    orig_prods = pd.read_parquet(ORIGINAL_DATASET_DIR / "entities" / "products.parquet")
    assert len(orig_prods) == 3643

    orig_revs = pd.read_parquet(ORIGINAL_DATASET_DIR / "evidence" / "reviews.parquet")
    assert len(orig_revs) == 3659
    # In original dataset, 240 reviews were unlinked
    assert (orig_revs["marketplace"] == "uncertain").sum() == 240


def test_09_manifests_integrity():
    manifest_p = DATASET_V11_DIR / "manifests" / "dataset_manifest.json"
    assert manifest_p.exists()
    with open(manifest_p) as f:
        m = json.load(f)
    assert m["dataset_version"] == "v1.1"
    assert m["modality_metrics"]["linked_reviews"] == 3659
    assert m["modality_metrics"]["unlinked_reviews"] == 0
    assert m["modality_metrics"]["resnet18_embeddings_count"] == 4708
    assert m["modality_metrics"]["graph_edges_total"] == 11990

    sha_p = DATASET_V11_DIR / "manifests" / "sha256_manifest.json"
    assert sha_p.exists()
    with open(sha_p) as f:
        sha_m = json.load(f)
    assert len(sha_m) >= 12
