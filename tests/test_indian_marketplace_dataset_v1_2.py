"""
Unit & Regression Test Suite: Indian Marketplace Trust Dataset v1.2
=====================================================================
Validates release invariants, schema conformity, zero leakage,
graph referential integrity, and cryptographic manifests for v1.2.
"""

import json
import hashlib
from pathlib import Path
import numpy as np
import pandas as pd
import pytest

DATASET_V12 = Path(__file__).resolve().parents[1] / "data" / "indian_marketplace_trust_dataset_v1_2"

@pytest.fixture(scope="module")
def dataset_paths():
    assert DATASET_V12.exists(), "Dataset v1.2 release folder does not exist!"
    return {
        "products": DATASET_V12 / "entities" / "products.parquet",
        "listings": DATASET_V12 / "entities" / "listings.parquet",
        "variants": DATASET_V12 / "entities" / "variants.parquet",
        "sellers": DATASET_V12 / "entities" / "sellers.parquet",
        "reviews": DATASET_V12 / "evidence" / "reviews.parquet",
        "images": DATASET_V12 / "evidence" / "images.parquet",
        "prices": DATASET_V12 / "evidence" / "price_observations.parquet",
        "ocr": DATASET_V12 / "evidence" / "ocr_evidence.parquet",
        "review_features": DATASET_V12 / "derived_evidence" / "review_features.parquet",
        "pricing_features": DATASET_V12 / "derived_evidence" / "pricing_features.parquet",
        "coverage_matrix": DATASET_V12 / "derived_evidence" / "multimodal_coverage_matrix.parquet",
        "embeddings": DATASET_V12 / "derived_evidence" / "visual_embeddings_resnet18.npz",
        "relationships": DATASET_V12 / "relationships" / "entity_relationships.parquet",
        "ann_reviews": DATASET_V12 / "annotations" / "review_annotations.parquet",
        "ann_listings": DATASET_V12 / "annotations" / "listing_annotations.parquet",
        "ann_images": DATASET_V12 / "annotations" / "image_annotations.parquet",
        "train_split": DATASET_V12 / "benchmarks" / "train_split.parquet",
        "val_split": DATASET_V12 / "benchmarks" / "validation_split.parquet",
        "test_split": DATASET_V12 / "benchmarks" / "test_split.parquet",
        "dataset_manifest": DATASET_V12 / "manifests" / "dataset_manifest.json",
        "sha256_manifest": DATASET_V12 / "manifests" / "sha256_manifest.json"
    }

def test_entity_counts_and_taxonomy(dataset_paths):
    df_prod = pd.read_parquet(dataset_paths["products"])
    df_list = pd.read_parquet(dataset_paths["listings"])
    df_var = pd.read_parquet(dataset_paths["variants"])
    
    assert len(df_prod) == 3643
    assert len(df_list) == 3643
    assert len(df_var) == 3643
    
    # Assert zero 'Other' categories
    other_cats = (df_prod["category"].str.lower() == "other").sum()
    assert other_cats == 0

def test_reviews_and_nlp_features(dataset_paths):
    df_rev = pd.read_parquet(dataset_paths["reviews"])
    df_feat = pd.read_parquet(dataset_paths["review_features"])
    
    assert len(df_rev) == 3659
    assert len(df_feat) == 3659
    
    # Check required columns
    for col in ["review_id", "canonical_product_id", "marketplace_listing_id", "variant_id",
                "reviewer_pseudonymous_id", "review_text", "rating", "language", "script"]:
        assert col in df_rev.columns

def test_visual_embeddings_parity_and_norm(dataset_paths):
    df_img = pd.read_parquet(dataset_paths["images"])
    usable_imgs = df_img[df_img["is_usable"] == True]
    assert len(usable_imgs) == 4708
    
    emb_data = np.load(dataset_paths["embeddings"], allow_pickle=True)
    assert len(emb_data["image_ids"]) == 4708
    assert emb_data["normalized_embeddings"].shape == (4708, 512)
    
    norms = np.linalg.norm(emb_data["normalized_embeddings"], axis=1)
    max_err = np.max(np.abs(norms - 1.0))
    assert max_err < 1e-4

def test_append_only_prices_and_ocr(dataset_paths):
    df_prices = pd.read_parquet(dataset_paths["prices"])
    df_ocr = pd.read_parquet(dataset_paths["ocr"])
    
    assert len(df_prices) >= 3643
    assert len(df_ocr) >= 1000
    assert "observation_type" in df_prices.columns

def test_graph_structural_integrity(dataset_paths):
    df_graph = pd.read_parquet(dataset_paths["relationships"])
    assert len(df_graph) == 22919
    
    # Zero duplicates
    assert df_graph.duplicated(subset=["source_entity_id", "target_entity_id", "relationship_type"]).sum() == 0
    # Zero self loops
    assert (df_graph["source_entity_id"] == df_graph["target_entity_id"]).sum() == 0

def test_benchmark_splits_zero_leakage(dataset_paths):
    train = pd.read_parquet(dataset_paths["train_split"])
    val = pd.read_parquet(dataset_paths["val_split"])
    test = pd.read_parquet(dataset_paths["test_split"])
    
    s_train = set(train["canonical_product_id"])
    s_val = set(val["canonical_product_id"])
    s_test = set(test["canonical_product_id"])
    
    assert len(s_train.intersection(s_val)) == 0
    assert len(s_train.intersection(s_test)) == 0
    assert len(s_val.intersection(s_test)) == 0
    assert len(s_train) + len(s_val) + len(s_test) == 3643

def test_annotations_coverage(dataset_paths):
    ann_rev = pd.read_parquet(dataset_paths["ann_reviews"])
    ann_list = pd.read_parquet(dataset_paths["ann_listings"])
    ann_img = pd.read_parquet(dataset_paths["ann_images"])
    
    assert len(ann_rev) == 600
    assert len(ann_list) == 250
    assert len(ann_img) == 250

def test_coverage_matrix_reconciliation(dataset_paths):
    matrix = pd.read_parquet(dataset_paths["coverage_matrix"])
    assert len(matrix) == 3643
    tier_counts = matrix["coverage_tier"].value_counts().to_dict()
    assert tier_counts["Tier A"] == 5
    assert tier_counts["Tier B"] == 2550
    assert tier_counts["Tier C"] == 1088

def test_manifest_sha256_integrity(dataset_paths):
    with open(dataset_paths["sha256_manifest"]) as f:
        manifest = json.load(f)
    assert len(manifest) >= 20
    
    for rel_path, meta in manifest.items():
        fpath = DATASET_V12 / rel_path
        assert fpath.exists()
        h = hashlib.sha256()
        with open(fpath, "rb") as f:
            while chunk := f.read(65536):
                h.update(chunk)
        assert h.hexdigest() == meta["sha256"]
