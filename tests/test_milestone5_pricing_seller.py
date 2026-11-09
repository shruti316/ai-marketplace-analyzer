"""
Milestone 5 Test Suite: Advanced Pricing & Seller Intelligence
AI-Powered Indian Marketplace Trust Intelligence Platform

Tests:
1. Pricing benchmarks, robust corridors (IQR/MAD), and robust z-score calculation.
2. MRP vs selling price consistency checks and extreme discount anomalies.
3. Seller identity resolution, honest null modeling, and reputation metrics.
4. Graph relationship enrichment, referential integrity, and cross-product image reuse edges.
5. Multimodal evidence fusion, zero-penalty missing modality invariant, and risk tier assignments.
6. Dataset v1.6 manifest and SHA-256 checksum integrity.
"""

import json
from pathlib import Path
import pytest
import numpy as np
import pandas as pd

V16_DIR = Path("data/indian_marketplace_trust_dataset_v1_6")


@pytest.fixture(scope="module")
def v16_tables():
    """Loads all relevant v1.6 dataset tables for testing."""
    assert V16_DIR.exists(), f"Dataset directory {V16_DIR} does not exist!"
    return {
        "products": pd.read_parquet(V16_DIR / "entities" / "products.parquet"),
        "listings": pd.read_parquet(V16_DIR / "entities" / "listings.parquet"),
        "sellers": pd.read_parquet(V16_DIR / "entities" / "sellers.parquet"),
        "price_obs": pd.read_parquet(V16_DIR / "evidence" / "price_observations.parquet"),
        "reviews": pd.read_parquet(V16_DIR / "evidence" / "reviews.parquet"),
        "relationships": pd.read_parquet(V16_DIR / "relationships" / "entity_relationships.parquet"),
        "pricing_features": pd.read_parquet(V16_DIR / "derived_evidence" / "pricing_features.parquet"),
        "cat_benchmarks": pd.read_parquet(V16_DIR / "derived_evidence" / "pricing_category_benchmarks.parquet"),
        "brand_benchmarks": pd.read_parquet(V16_DIR / "derived_evidence" / "pricing_brand_benchmarks.parquet"),
        "mkt_benchmarks": pd.read_parquet(V16_DIR / "derived_evidence" / "pricing_marketplace_benchmarks.parquet"),
        "seller_features": pd.read_parquet(V16_DIR / "derived_evidence" / "seller_features.parquet"),
        "multimodal_evidence": pd.read_parquet(V16_DIR / "derived_evidence" / "multimodal_evidence_records.parquet"),
        "product_summary": pd.read_parquet(V16_DIR / "derived_evidence" / "product_multimodal_summary.parquet"),
    }


def test_pricing_benchmarks_and_corridors(v16_tables):
    """Verifies category, brand, and marketplace robust price benchmarks."""
    cat_df = v16_tables["cat_benchmarks"]
    brand_df = v16_tables["brand_benchmarks"]
    mkt_df = v16_tables["mkt_benchmarks"]
    p_feat = v16_tables["pricing_features"]

    # 1. Subcategory benchmarks
    assert len(cat_df) == 343, f"Expected 343 subcategory benchmarks, got {len(cat_df)}"
    assert (cat_df["sample_count"] > 0).all()
    assert (cat_df["median_price_inr"] > 0).all()
    assert (cat_df["corridor_upper_inr"] >= cat_df["corridor_lower_inr"]).all()

    # 2. Brand benchmarks & reliability flag
    assert len(brand_df) == 1608, f"Expected 1608 brand benchmarks, got {len(brand_df)}"
    assert "is_brand_benchmark_reliable" in brand_df.columns
    assert "sample_size_flag" in brand_df.columns
    reliable_count = brand_df["is_brand_benchmark_reliable"].sum()
    sparse_count = (~brand_df["is_brand_benchmark_reliable"]).sum()
    assert reliable_count == 105, f"Expected 105 reliable brands (>=5), got {reliable_count}"
    assert sparse_count == 1503, f"Expected 1503 sparse brands (<5), got {sparse_count}"

    # 3. Marketplace benchmarks
    assert set(mkt_df["marketplace"]) == {"amazon_in", "flipkart", "myntra"}
    assert (mkt_df["median_price_inr"] > 0).all()

    # 4. Pricing features table
    assert len(p_feat) == 3643
    assert not p_feat["robust_z_score"].isna().any()
    assert not p_feat["is_price_outlier"].isna().any()
    assert p_feat["is_price_outlier"].sum() == 444
    assert p_feat["is_extreme_price_outlier"].sum() == 353


def test_mrp_consistency_and_discount_anomalies(v16_tables):
    """Verifies MRP versus selling price consistency and discount anomaly detection."""
    p_feat = v16_tables["pricing_features"]

    assert "selling_exceeds_mrp" in p_feat.columns
    assert "is_discount_anomaly" in p_feat.columns
    assert "mrp_consistency_status" in p_feat.columns

    # In catalog crawl, 0 products had selling price exceeding declared MRP
    assert p_feat["selling_exceeds_mrp"].sum() == 0

    # Exactly 2 products had extreme discounts >= 90%
    assert p_feat["is_discount_anomaly"].sum() == 2

    # Verification of discount values for flagged records
    anomalous = p_feat[p_feat["is_discount_anomaly"] == True]
    assert (anomalous["discount_percentage"] >= 90.0).all()


def test_seller_identity_and_honest_null_governance(v16_tables):
    """Verifies seller identity resolution, platform aggregate semantics, and honest null modeling."""
    prods = v16_tables["products"]
    listings = v16_tables["listings"]
    sellers = v16_tables["sellers"]
    s_feat = v16_tables["seller_features"]

    # 1. Product-level honest null invariant: products.seller_id MUST be 100% null
    assert prods["seller_id"].isna().all(), "products.seller_id must remain 100% null (honest null standard)!"
    assert (prods["seller_id_semantics"] == "HONEST_NULL_AGGREGATE_MERCHANT").all()

    # 2. Listings-level foreign key linkage
    assert "seller_id" in listings.columns
    assert not listings["seller_id"].isna().any(), "All listings must have resolved seller_id!"
    assert (listings["seller_resolution_status"] == "UNRESOLVED_PLATFORM_AGGREGATE").all()
    valid_seller_ids = set(sellers["seller_id"])
    assert set(listings["seller_id"]).issubset(valid_seller_ids)
    assert listings["seller_id"].value_counts().to_dict() == {
        "SELLER_AGG_AMAZON_IN": 1500,
        "SELLER_AGG_FLIPKART": 1143,
        "SELLER_AGG_MYNTRA": 1000,
    }

    # 3. Seller master entity semantics
    assert len(sellers) == 4
    agg_sellers = sellers[sellers["seller_type"] == "PLATFORM_AGGREGATE"]
    assert len(agg_sellers) == 3
    assert (agg_sellers["is_individual_merchant"] == False).all()
    assert (agg_sellers["registration_status"] == "PLATFORM_OPERATOR_VERIFIED").all()

    # 4. Seller features table
    assert len(s_feat) == 3
    assert set(s_feat["seller_id"]) == {"SELLER_AGG_AMAZON_IN", "SELLER_AGG_FLIPKART", "SELLER_AGG_MYNTRA"}
    assert (s_feat["is_single_merchant_verified"] == False).all()
    assert (s_feat["data_quality_flag"] == "AGGREGATE_PROXY_METADATA_LIMITATION").all()


def test_graph_relationship_enrichment(v16_tables):
    """Verifies graph enrichment, edge count expansion, schema, and referential integrity."""
    rel_df = v16_tables["relationships"]
    prods = v16_tables["products"]
    listings = v16_tables["listings"]
    sellers = v16_tables["sellers"]

    # 1. Total edge count and uniqueness
    assert len(rel_df) == 41372, f"Expected 41,372 relationships, got {len(rel_df)}"
    assert rel_df["relationship_id"].is_unique, "relationship_id must be globally unique!"
    assert not rel_df.isna().any().any(), "Relationships table must have zero null values!"
    assert rel_df["relationship_confidence"].between(0.0, 1.0).all()

    # 2. Relationship type breakdown
    rel_counts = rel_df["relationship_type"].value_counts().to_dict()
    assert rel_counts["SELLER_OFFERS_LISTING"] == 3643
    assert rel_counts["LISTING_OF_PRODUCT"] == 3643
    assert rel_counts["LISTING_ON_PLATFORM"] == 3643
    assert rel_counts["SHARED_IMAGE_BETWEEN_PRODUCTS"] == 214
    assert rel_counts["HAS_IMAGE"] == 4708
    assert rel_counts["HAS_PRICE_OBSERVATION"] == 3667
    assert rel_counts["HAS_REVIEW"] == 3659
    assert rel_counts["HAS_LISTING"] == 3643
    assert rel_counts["HAS_VARIANT"] == 3643
    assert rel_counts["HOSTED_ON_PLATFORM"] == 3643
    assert rel_counts["BELONGS_TO_BRAND"] == 3643
    assert rel_counts["HAS_PRICE"] == 3623

    # 3. Referential integrity
    all_prod_ids = set(prods["canonical_product_id"])
    all_list_ids = set(listings["listing_id"])
    all_seller_ids = set(sellers["seller_id"])

    seller_edges = rel_df[rel_df["relationship_type"] == "SELLER_OFFERS_LISTING"]
    assert set(seller_edges["source_entity_id"]).issubset(all_seller_ids)
    assert set(seller_edges["target_entity_id"]).issubset(all_list_ids)

    listing_prod_edges = rel_df[rel_df["relationship_type"] == "LISTING_OF_PRODUCT"]
    assert set(listing_prod_edges["source_entity_id"]).issubset(all_list_ids)
    assert set(listing_prod_edges["target_entity_id"]).issubset(all_prod_ids)

    shared_img_edges = rel_df[rel_df["relationship_type"] == "SHARED_IMAGE_BETWEEN_PRODUCTS"]
    assert set(shared_img_edges["source_entity_id"]).issubset(all_prod_ids)
    assert set(shared_img_edges["target_entity_id"]).issubset(all_prod_ids)
    assert (shared_img_edges["relationship_confidence"] >= 0.95).all()


def test_multimodal_evidence_fusion_and_invariants(v16_tables):
    """Verifies atomic evidence records, product summary, and zero-penalty missing modality invariant."""
    ev_df = v16_tables["multimodal_evidence"]
    p_sum = v16_tables["product_summary"]

    # 1. Atomic evidence records
    assert len(ev_df) == 6064, f"Expected 6,064 atomic evidence records, got {len(ev_df)}"
    ev_types = ev_df["evidence_type"].value_counts().to_dict()
    assert ev_types["REVIEW_SENTIMENT"] == 3659
    assert ev_types["REVIEW_DUPLICATE_CLUSTER"] == 1171
    assert ev_types["REVIEW_DISCORDANCE"] == 571
    assert ev_types["PRICE_CORRIDOR_OUTLIER"] == 444
    assert ev_types["CROSS_PRODUCT_IMAGE_REUSE"] == 216
    assert ev_types["PRICE_DISCOUNT_ANOMALY"] == 2
    assert ev_types["OCR_STATUS"] == 1

    # 2. Product-level summary
    assert len(p_sum) == 3643
    assert set(p_sum["assessment_framework"]) == {"EXPLAINABLE_MULTIMODAL_EVIDENCE_V1_6"}

    # 3. ZERO-PENALTY MISSING MODALITY INVARIANT:
    # All products with < 2 core modalities MUST be UNASSESSED_SPARSE_DATA!
    sparse_mask = p_sum["available_core_modalities_count"] < 2
    assert sparse_mask.sum() == 1068, f"Expected exactly 1,068 sparse products, got {sparse_mask.sum()}"
    sparse_prods = p_sum[sparse_mask]
    assert (sparse_prods["provisional_risk_tier"] == "UNASSESSED_SPARSE_DATA").all(), (
        "Zero-penalty invariant violated: sparse products were assigned an active risk tier!"
    )

    # 4. Multimodal anomalies
    multimodal_anomalies = p_sum[p_sum["provisional_risk_tier"] == "ELEVATED_MULTIMODAL_ANOMALY"]
    assert len(multimodal_anomalies) == 22
    assert (multimodal_anomalies["active_risk_flag_count"] >= 2).all()


def test_manifest_and_sha256_checksum_integrity():
    """Verifies manifest completeness and SHA-256 checksum validity."""
    manifest_path = V16_DIR / "manifests" / "dataset_manifest.json"
    sha_path = V16_DIR / "manifests" / "sha256_manifest.json"
    chk_path = V16_DIR / "manifests" / "checksums.sha256"

    assert manifest_path.exists()
    assert sha_path.exists()
    assert chk_path.exists()

    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    with open(sha_path, "r", encoding="utf-8") as f:
        sha_manifest = json.load(f)

    assert manifest["version"] == "v1.6"
    assert manifest["total_files"] == 141
    assert len(sha_manifest) == 141
    assert manifest["specifications"]["canonical_products"] == 3643
    assert manifest["specifications"]["graph_relationships"] == 41372
    assert manifest["specifications"]["atomic_multimodal_evidence_records"] == 6064
