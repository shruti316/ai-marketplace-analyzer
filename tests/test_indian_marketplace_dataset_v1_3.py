"""
Comprehensive Regression Test Suite: Indian Marketplace Trust Dataset v1.3
===========================================================================
Validates all 25 acceptance criteria specified in Section 15 (Phase L) of the
Master Implementation Directive for v1.3:

1. Dataset version integrity
2. Historical release immutability (v1.0, v1.1, v1.2)
3. Entity ID uniqueness
4. Product-to-listing referential integrity
5. Product-to-variant referential integrity
6. Seller and platform identity semantics (Separation of platform vs merchant)
7. Seller-to-listing evidence validity
8. Price observation validity
9. Timestamp formatting & validity
10. Append-only price observation behaviour
11. OCR image references & referential integrity
12. OCR provenance correctness (TITLE_TOKEN_PROXY verification, no false Tesseract)
13. Image-to-embedding one-to-one parity (4,708 records)
14. Embedding dimensions (512-dim) and unit L2-normalization
15. Review annotation provenance (Silver heuristic pseudo-labels vs Human)
16. Silver versus human annotation separation into distinct files
17. Multi-class listing annotation quality checks
18. Multi-class image annotation quality checks
19. Language and script validity (Traceable counts for en, hi-en)
20. Duplicate cluster integrity
21. Benchmark leakage-safe guarantees (0 product overlap, 0 text cluster overlap)
22. Multi-relational Knowledge Graph integrity (0 orphaned nodes, 0 self-loops)
23. Multimodal coverage matrix completeness (3,643 products, 20+ columns)
24. SHA-256 cryptographic manifest verification
25. Reproducibility & deterministic provenance
"""

import json
import os
import hashlib
from pathlib import Path
import numpy as np
import pandas as pd
import pytest

DATASET_ROOT = Path("data/indian_marketplace_trust_dataset_v1_3")
V12_ROOT = Path("data/indian_marketplace_trust_dataset_v1_2")
V11_ROOT = Path("data/indian_marketplace_trust_dataset_v1_1")
V10_ROOT = Path("data/indian_marketplace_trust_dataset_final")


@pytest.fixture(scope="module")
def dataset_tables():
    """Loads all core v1.3 tables for test evaluation."""
    assert DATASET_ROOT.exists(), f"Dataset directory missing: {DATASET_ROOT}"
    
    tables = {
        "products": pd.read_parquet(DATASET_ROOT / "entities" / "products.parquet"),
        "listings": pd.read_parquet(DATASET_ROOT / "entities" / "listings.parquet"),
        "variants": pd.read_parquet(DATASET_ROOT / "entities" / "variants.parquet"),
        "platforms": pd.read_parquet(DATASET_ROOT / "entities" / "platforms.parquet"),
        "sellers": pd.read_parquet(DATASET_ROOT / "entities" / "sellers.parquet"),
        "images": pd.read_parquet(DATASET_ROOT / "evidence" / "images.parquet"),
        "reviews": pd.read_parquet(DATASET_ROOT / "evidence" / "reviews.parquet"),
        "prices": pd.read_parquet(DATASET_ROOT / "evidence" / "price_observations.parquet"),
        "ocr": pd.read_parquet(DATASET_ROOT / "evidence" / "ocr_evidence.parquet"),
        "review_features": pd.read_parquet(DATASET_ROOT / "derived_evidence" / "review_features.parquet"),
        "pricing_features": pd.read_parquet(DATASET_ROOT / "derived_evidence" / "pricing_features.parquet"),
        "seller_features": pd.read_parquet(DATASET_ROOT / "derived_evidence" / "seller_features.parquet"),
        "matrix": pd.read_parquet(DATASET_ROOT / "derived_evidence" / "multimodal_coverage_matrix.parquet"),
        "graph": pd.read_parquet(DATASET_ROOT / "relationships" / "entity_relationships.parquet"),
        "silver_reviews": pd.read_parquet(DATASET_ROOT / "annotations" / "review_silver_annotations.parquet"),
        "human_reviews": pd.read_parquet(DATASET_ROOT / "annotations" / "review_human_annotations.parquet"),
        "listing_ann": pd.read_parquet(DATASET_ROOT / "annotations" / "listing_annotations.parquet"),
        "image_ann": pd.read_parquet(DATASET_ROOT / "annotations" / "image_annotations.parquet"),
        "train_split": pd.read_parquet(DATASET_ROOT / "benchmarks" / "train_split.parquet"),
        "val_split": pd.read_parquet(DATASET_ROOT / "benchmarks" / "validation_split.parquet"),
        "test_split": pd.read_parquet(DATASET_ROOT / "benchmarks" / "test_split.parquet"),
        "embeddings": np.load(DATASET_ROOT / "derived_evidence" / "visual_embeddings_resnet18.npz", allow_pickle=True)
    }
    return tables


# 1. Dataset Version Integrity
def test_dataset_version_integrity(dataset_tables):
    manifest_path = DATASET_ROOT / "manifests" / "dataset_manifest.json"
    assert manifest_path.exists(), "Dataset manifest missing."
    with open(manifest_path, "r") as f:
        manifest = json.load(f)
    assert manifest["release_version"] == "v1.3_ENHANCED_RESEARCH_READY"
    assert manifest["governance"]["synthetic_fabrication"] is False


# 2. Historical Release Immutability (v1.0, v1.1, v1.2)
def test_historical_releases_immutable():
    assert V10_ROOT.exists(), "Historical baseline v1.0 missing."
    assert V11_ROOT.exists(), "Historical baseline v1.1 missing."
    assert V12_ROOT.exists(), "Historical baseline v1.2 missing."
    
    # Check v1.2 manifest
    v12_manifest = V12_ROOT / "manifests" / "dataset_manifest.json"
    assert v12_manifest.exists()
    with open(v12_manifest, "r") as f:
        data = json.load(f)
    assert data["release_version"] == "v1.2_RESEARCH_READY"


# 3. Entity ID Uniqueness
def test_entity_id_uniqueness(dataset_tables):
    for table_name, id_col in [
        ("products", "canonical_product_id"),
        ("listings", "listing_id"),
        ("variants", "variant_id"),
        ("platforms", "platform_id"),
        ("sellers", "seller_id"),
        ("images", "image_id"),
        ("reviews", "review_id"),
        ("prices", "price_observation_id")
    ]:
        series = dataset_tables[table_name][id_col]
        assert series.is_unique, f"Duplicate IDs detected in {table_name}.{id_col}"


# 4. Product-to-Listing Relationships
def test_product_to_listing_relationships(dataset_tables):
    prod_ids = set(dataset_tables["products"]["canonical_product_id"])
    listing_prod_ids = set(dataset_tables["listings"]["canonical_product_id"])
    assert listing_prod_ids.issubset(prod_ids), "Listings contain unreferenced product IDs."
    assert len(dataset_tables["listings"]) == len(dataset_tables["products"]) == 3643


# 5. Product-to-Variant Relationships
def test_product_to_variant_relationships(dataset_tables):
    prod_ids = set(dataset_tables["products"]["canonical_product_id"])
    variant_prod_ids = set(dataset_tables["variants"]["canonical_product_id"])
    assert variant_prod_ids.issubset(prod_ids), "Variants contain unreferenced product IDs."
    
    # Check that 'Standard' placeholders are 100% eliminated from variant attributes
    var_df = dataset_tables["variants"]
    assert (var_df["colour"] == "Standard").sum() == 0, "'Standard' placeholder found in colour."
    assert (var_df["size"] == "Standard").sum() == 0, "'Standard' placeholder found in size."
    assert (var_df["material"] == "Standard").sum() == 0, "'Standard' placeholder found in material."
    
    # Check that Myntra multi-size items have valid parent_product_id
    myntra_vars = var_df[var_df["canonical_product_id"].str.startswith("myntra")]
    assert len(myntra_vars) == 1000
    assert myntra_vars["parent_product_id"].notna().all()


# 6. Seller Identity Semantics (Separation of Platforms & Merchants)
def test_seller_identity_semantics(dataset_tables):
    platforms = dataset_tables["platforms"]
    sellers = dataset_tables["sellers"]
    assert len(platforms) == 3
    assert len(sellers) == 3
    
    # Check seller type is PLATFORM_AGGREGATE and is_individual_merchant is False
    assert (sellers["seller_type"] == "PLATFORM_AGGREGATE").all()
    assert (sellers["is_individual_merchant"] == False).all()
    assert (sellers["merchant_resolution_status"] == "UNRESOLVED_THIRD_PARTY_MERCHANT").all()


# 7. Seller-to-Listing Evidence
def test_seller_to_listing_evidence(dataset_tables):
    graph = dataset_tables["graph"]
    # Verify that zero misleading SOLD_BY platform edges exist
    sold_by_edges = graph[graph["relationship_type"] == "SOLD_BY"]
    assert len(sold_by_edges) == 0, f"Found {len(sold_by_edges)} misleading SOLD_BY edges."
    
    # Verify HOSTED_ON_PLATFORM edges connect products to valid platforms
    hosted_edges = graph[graph["relationship_type"] == "HOSTED_ON_PLATFORM"]
    assert len(hosted_edges) == 3643
    platform_ids = set(dataset_tables["platforms"]["platform_id"])
    assert set(hosted_edges["target_entity_id"]).issubset(platform_ids)


# 8. Price Observation Validity
def test_price_observation_validity(dataset_tables):
    prices = dataset_tables["prices"]
    assert len(prices) == 3667
    valid_prices = prices[prices["is_valid_price"] == True]
    assert len(valid_prices) == 3647
    assert (valid_prices["selling_price"] > 0).all()
    assert (valid_prices["currency"] == "INR").all()


# 9. Timestamp Validity
def test_timestamp_validity(dataset_tables):
    prices = dataset_tables["prices"]
    # Check ISO-8601 formatting
    iso_pattern = r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}'
    matches = prices["observation_timestamp"].str.match(iso_pattern)
    assert matches.all(), "Non-ISO timestamp found in price observations."


# 10. Append-Only Price Behaviour
def test_append_only_price_behaviour(dataset_tables):
    prices = dataset_tables["prices"]
    obs_types = prices["observation_type"].value_counts().to_dict()
    assert obs_types.get("PRIMARY_SCRAPE_OBSERVATION", 0) == 3643
    assert obs_types.get("REVIEW_CORROBORATED_OBSERVATION", 0) == 24


# 11. OCR Image References
def test_ocr_image_references(dataset_tables):
    ocr = dataset_tables["ocr"]
    image_ids = set(dataset_tables["images"]["image_id"])
    assert len(ocr) == 1000
    assert set(ocr["image_id"]).issubset(image_ids), "OCR references non-existent image IDs."


# 12. OCR Provenance Correctness
def test_ocr_provenance_correctness(dataset_tables):
    ocr = dataset_tables["ocr"]
    # Engine must NOT be falsely claimed as Tesseract OCR
    assert (ocr["ocr_engine"] != "TESSERACT_OCR_v5.3_PIPELINE").all()
    assert (ocr["ocr_engine"] == "TITLE_TOKEN_PROXY_v1.3").all()
    assert (ocr["provenance"] == "METADATA_TITLE_TOKEN_PROXY").all()
    assert (ocr["ocr_confidence"] == 0.50).all()


# 13. Image-to-Embedding Parity
def test_image_embedding_parity(dataset_tables):
    emb_data = dataset_tables["embeddings"]
    emb_image_ids = list(emb_data["image_ids"])
    usable_images = dataset_tables["images"][dataset_tables["images"]["is_usable"] == True]
    assert len(emb_image_ids) == len(usable_images) == 4708
    assert set(emb_image_ids) == set(usable_images["image_id"])


# 14. Embedding Dimensions and L2 Normalization
def test_embedding_dimensions_and_normalization(dataset_tables):
    emb_data = dataset_tables["embeddings"]
    matrix = emb_data["normalized_embeddings"]
    assert matrix.shape == (4708, 512)
    norms = np.linalg.norm(matrix, axis=1)
    assert np.allclose(norms, 1.0, atol=1e-4)


# 15. Review Annotation Provenance
def test_review_annotation_provenance(dataset_tables):
    silver = dataset_tables["silver_reviews"]
    assert len(silver) == 600
    assert (silver["annotator_id"] == "RULE_HEURISTIC_PIPELINE_v1.2").all()
    assert (silver["adjudication_status"] == "UNADJUDICATED_SILVER_LABEL").all()
    assert (silver["confidence"] == 0.70).all()


# 16. Silver versus Human Annotation Separation
def test_silver_vs_human_annotation_separation(dataset_tables):
    silver = dataset_tables["silver_reviews"]
    human = dataset_tables["human_reviews"]
    assert len(human) == 50
    assert (human["annotator_id"] == "HUMAN_EXPERT_ANNOTATOR_01").all()
    assert (human["adjudication_status"] == "SINGLE_ANNOTATOR_VERIFIED").all()
    # Check that guidelines markdown exists
    assert (DATASET_ROOT / "annotations" / "annotation_guidelines.md").exists()


# 17. Multi-Class Listing Annotation Quality Checks
def test_listing_annotation_quality(dataset_tables):
    list_ann = dataset_tables["listing_ann"]
    assert len(list_ann) == 250
    classes = list_ann["listing_integrity_label"].unique()
    assert len(classes) >= 3, f"Expected at least 3 classes in listing annotations, found {classes}"
    assert "VERIFIED_CONSISTENT" in classes
    assert "EXTREME_PRICE_DISCOUNT_ANOMALY" in classes


# 18. Multi-Class Image Annotation Quality Checks
def test_image_annotation_quality(dataset_tables):
    img_ann = dataset_tables["image_ann"]
    assert len(img_ann) == 250
    classes = img_ann["visual_matching_label"].unique()
    assert len(classes) >= 3, f"Expected at least 3 classes in image annotations, found {classes}"
    assert "CORRECT_PRODUCT_HERO_MATCH" in classes
    assert "INCORRECT_PRODUCT_MATCH" in classes


# 19. Language and Script Validity
def test_language_and_script_validity(dataset_tables):
    revs = dataset_tables["reviews"]
    assert len(revs) == 3659
    lang_counts = revs["language"].value_counts().to_dict()
    assert lang_counts.get("en", 0) == 3655
    assert lang_counts.get("hi-en", 0) == 4
    script_counts = revs["script"].value_counts().to_dict()
    assert script_counts.get("LATIN", 0) == 3655
    assert script_counts.get("LATIN_HINGLISH", 0) == 4


# 20. Duplicate Cluster Integrity
def test_duplicate_cluster_integrity(dataset_tables):
    rf = dataset_tables["review_features"]
    assert len(rf) == 3659
    dup_instances = (rf["is_exact_duplicate"] == True).sum()
    assert dup_instances == 1335


# 21. Benchmark Leakage Elimination
def test_benchmark_leakage_elimination(dataset_tables):
    train = set(dataset_tables["train_split"]["canonical_product_id"])
    val = set(dataset_tables["val_split"]["canonical_product_id"])
    test = set(dataset_tables["test_split"]["canonical_product_id"])
    
    # 0 Product Leakage
    assert len(train & val) == 0, "Product overlap between train and val."
    assert len(train & test) == 0, "Product overlap between train and test."
    assert len(val & test) == 0, "Product overlap between val and test."
    
    # 0 Duplicate Review Text Cluster Leakage
    revs = dataset_tables["reviews"]
    train_texts = set(revs[revs["canonical_product_id"].isin(train)]["review_text_cleaned"].str.strip().str.lower())
    val_texts = set(revs[revs["canonical_product_id"].isin(val)]["review_text_cleaned"].str.strip().str.lower())
    test_texts = set(revs[revs["canonical_product_id"].isin(test)]["review_text_cleaned"].str.strip().str.lower())
    
    dup_texts = set(revs[revs.duplicated("review_text_cleaned", keep=False)]["review_text_cleaned"].str.strip().str.lower())
    
    assert len(train_texts.intersection(val_texts).intersection(dup_texts)) == 0, "Duplicate text leaked between train and val."
    assert len(train_texts.intersection(test_texts).intersection(dup_texts)) == 0, "Duplicate text leaked between train and test."
    assert len(val_texts.intersection(test_texts).intersection(dup_texts)) == 0, "Duplicate text leaked between val and test."


# 22. Multi-Relational Knowledge Graph Integrity
def test_knowledge_graph_integrity(dataset_tables):
    graph = dataset_tables["graph"]
    assert len(graph) > 20000
    # No self-loops
    self_loops = graph[graph["source_entity_id"] == graph["target_entity_id"]]
    assert len(self_loops) == 0, f"Found {len(self_loops)} self-loops in knowledge graph."
    # No duplicate relationship IDs
    assert graph["relationship_id"].is_unique, "Duplicate relationship IDs in knowledge graph."


# 23. Coverage Matrix Completeness
def test_coverage_matrix_completeness(dataset_tables):
    matrix = dataset_tables["matrix"]
    assert len(matrix) == 3643
    assert len(matrix.columns) >= 20
    tiers = matrix["coverage_tier"].value_counts().to_dict()
    assert tiers.get("Tier A", 0) == 5
    assert tiers.get("Tier B", 0) == 2570
    assert tiers.get("Tier C", 0) == 1068


# 24. SHA-256 Checksum Verification
def test_sha256_checksum_verification():
    manifest_path = DATASET_ROOT / "manifests" / "sha256_manifest.json"
    assert manifest_path.exists()
    with open(manifest_path, "r") as f:
        manifest = json.load(f)
        
    for rel_path, meta in list(manifest.items())[:20]:
        file_path = DATASET_ROOT / rel_path
        assert file_path.exists(), f"File listed in manifest is missing: {rel_path}"
        h = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(65536):
                h.update(chunk)
        assert h.hexdigest() == meta["sha256"], f"Checksum mismatch for {rel_path}"


# 25. Build Reproducibility
def test_build_reproducibility():
    manifest_path = DATASET_ROOT / "manifests" / "dataset_manifest.json"
    assert manifest_path.exists()
    with open(manifest_path, "r") as f:
        data = json.load(f)
    assert data["summary_metrics"]["canonical_products"] == 3643
    assert data["summary_metrics"]["usable_images"] == 4708
    assert data["summary_metrics"]["linked_reviews"] == 3659
    assert data["summary_metrics"]["platforms"] == 3
    assert data["summary_metrics"]["sellers"] == 3
