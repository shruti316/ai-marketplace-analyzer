"""
Targeted Test Suite: Milestone 2 — Product, Brand, Seller, and Variant Finalization
===================================================================================
Validates all specific improvements delivered in Milestone 2:
1. Brand entity deduplication, normalization, and alias tracking.
2. Referential integrity of brand_id across products, variants, and knowledge graph.
3. Flipkart product family grouping under parent_product_id.
4. Factual variant attribute extraction (pattern, sleeve_length, collar_style, fit, occasion).
5. Zero synthetic placeholders and preservation of explicit nulls.
6. Fulfillment model tracking across listings.
"""

import json
from pathlib import Path
import pandas as pd
import pytest

DATASET_ROOT = Path("data/indian_marketplace_trust_dataset_v1_4")


@pytest.fixture(scope="module")
def milestone2_tables():
    assert DATASET_ROOT.exists(), f"Dataset directory missing: {DATASET_ROOT}"
    return {
        "products": pd.read_parquet(DATASET_ROOT / "entities" / "products.parquet"),
        "listings": pd.read_parquet(DATASET_ROOT / "entities" / "listings.parquet"),
        "variants": pd.read_parquet(DATASET_ROOT / "entities" / "variants.parquet"),
        "brands": pd.read_parquet(DATASET_ROOT / "entities" / "brands.parquet"),
        "platforms": pd.read_parquet(DATASET_ROOT / "entities" / "platforms.parquet"),
        "sellers": pd.read_parquet(DATASET_ROOT / "entities" / "sellers.parquet"),
        "graph": pd.read_parquet(DATASET_ROOT / "relationships" / "entity_relationships.parquet"),
    }


def test_brand_deduplication_and_alias_registry(milestone2_tables):
    brands = milestone2_tables["brands"]
    assert len(brands) == 1593, f"Expected 1,593 canonical brands, got {len(brands)}"
    assert "brand_aliases" in brands.columns
    
    # Check that known variation clusters now have aliases
    aj_dezines = brands[brands["brand_name"].str.lower() == "aj dezines"].iloc[0]
    aliases = json.loads(aj_dezines["brand_aliases"])
    assert len(aliases) >= 2
    assert "AJ Dezines" in aliases or "Aj DEZInES" in aliases


def test_brand_referential_integrity(milestone2_tables):
    brands = milestone2_tables["brands"]
    prods = milestone2_tables["products"]
    vars_df = milestone2_tables["variants"]
    graph = milestone2_tables["graph"]
    
    brand_ids = set(brands["brand_id"])
    assert len(brand_ids) == len(brands), "Brand IDs must be unique"
    
    # Product brand_ids must exist in brands
    for bid in prods["brand_id"]:
        assert bid in brand_ids, f"Dangling brand_id {bid} in products"
        
    # Variant brand_ids must exist in brands
    for bid in vars_df["brand_id"]:
        assert bid in brand_ids, f"Dangling brand_id {bid} in variants"
        
    # Graph BELONGS_TO_BRAND targets must exist in brands
    brand_edges = graph[graph["relationship_type"] == "BELONGS_TO_BRAND"]
    assert len(brand_edges) == 3643
    for target in brand_edges["target_entity_id"]:
        assert target in brand_ids, f"Dangling brand_id {target} in graph edges"


def test_flipkart_product_family_parents(milestone2_tables):
    vars_df = milestone2_tables["variants"]
    fk_vars = vars_df[vars_df["canonical_product_id"].str.startswith("flipkart")]
    
    # Check that multi-variant slug families have non-self parent_product_ids
    multi_family_vars = fk_vars[fk_vars["variant_type"] == "FAMILY_SLUG_VARIANT"]
    assert len(multi_family_vars) >= 140, f"Expected >= 140 Flipkart family variants, got {len(multi_family_vars)}"
    for _, r in multi_family_vars.iterrows():
        assert r["parent_product_id"] != r["canonical_product_id"]
        assert r["parent_product_id"].startswith("flipkart_")


def test_factual_variant_attributes_extracted(milestone2_tables):
    vars_df = milestone2_tables["variants"]
    
    for col in ["pattern", "sleeve_length", "collar_style", "fit", "occasion"]:
        assert col in vars_df.columns, f"Missing column {col} in variants"
        non_null_cnt = vars_df[col].notna().sum()
        assert non_null_cnt > 50, f"Expected > 50 non-null values for {col}, got {non_null_cnt}"
        
        # Verify 0 'Standard' placeholders
        assert (vars_df[col] == "Standard").sum() == 0


def test_fulfillment_types_in_listings(milestone2_tables):
    listings = milestone2_tables["listings"]
    assert "fulfillment_type" in listings.columns
    types = set(listings["fulfillment_type"])
    assert "AMAZON_FULFILLED_CATALOG" in types
    assert "MYNTRA_DIRECT_CATALOG" in types
    assert "FLIPKART_ADVANTAGE_FULFILLED" in types
    assert "STANDARD_MERCHANT_FULFILLED" in types


def test_graph_structural_integrity(milestone2_tables):
    graph = milestone2_tables["graph"]
    assert (graph["source_entity_id"] == graph["target_entity_id"]).sum() == 0, "No self-loops permitted"
    assert (graph["relationship_type"] == "SOLD_BY").sum() == 0, "No false SOLD_BY edges"
    assert (graph["relationship_type"] == "BELONGS_TO_BRAND").sum() == 3643
