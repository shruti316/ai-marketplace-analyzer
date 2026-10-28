"""
tests/test_relationships.py
---------------------------
Unit tests for auditable entity relationship graph modeling.
"""

import os
import pandas as pd
from src.data.relationships import CanonicalRelationship, RelationshipGraphBuilder


def test_canonical_relationship_dataclass():
    rel = CanonicalRelationship(
        relationship_id="brand_amz_01_philips",
        source_entity_id="amazon_B001",
        source_entity_type="product",
        target_entity_id="brand_philips",
        target_entity_type="brand",
        relationship_type="belongs_to_brand",
        marketplace="amazon",
        evidence_source="canonical_products.brand",
        verification_status="OBSERVED_CATALOG_ATTRIBUTE",
        confidence_score=0.85,
    )
    assert rel.confidence_score == 0.85
    assert rel.relationship_type == "belongs_to_brand"
    assert "OBSERVED" in rel.verification_status


def test_relationship_table_integrity():
    rel_path = "data/processed/canonical_relationships.parquet"
    assert os.path.exists(rel_path), f"Relationship table missing: {rel_path}"
    df = pd.read_parquet(rel_path)
    assert len(df) > 100000, f"Expected >100k relationships, got {len(df)}"

    # Check required columns
    required_cols = [
        "relationship_id",
        "source_entity_id",
        "source_entity_type",
        "target_entity_id",
        "target_entity_type",
        "relationship_type",
        "marketplace",
        "evidence_source",
        "verification_status",
        "confidence_score",
    ]
    for col in required_cols:
        assert col in df.columns, f"Missing column {col} in relationships table"

    # Check relationship IDs are unique
    assert df["relationship_id"].nunique() == len(df), "Relationship IDs must be unique"

    # Verify seller/brand policy: brands are not verified merchant IDs
    brand_edges = df[df["relationship_type"] == "belongs_to_brand"]
    assert len(brand_edges) > 0
    for status in brand_edges["verification_status"].unique():
        assert "NOT verified seller ID" in status, "Brand relationship must explicitly note it is not a verified seller ID"


def test_variant_relationship_integrity():
    rel_path = "data/processed/canonical_relationships.parquet"
    df = pd.read_parquet(rel_path)
    var_edges = df[df["relationship_type"] == "is_variant_of"]

    # 1. Exactly 1,000 legitimate variant edges from Myntra
    assert len(var_edges) == 1000, f"Expected exactly 1,000 is_variant_of edges, got {len(var_edges)}"
    assert (var_edges["marketplace"] == "myntra").all(), "is_variant_of edges must strictly originate from Myntra"

    # 2. Target entity type is explicitly 'product_style_group'
    assert (var_edges["target_entity_type"] == "product_style_group").all(), "Target entity type must be 'product_style_group'"
    assert var_edges["target_entity_id"].nunique() == 959, f"Expected 959 unique parent styles, got {var_edges['target_entity_id'].nunique()}"

    # 3. Zero self-referential edges
    assert (var_edges["source_entity_id"] != var_edges["target_entity_id"]).all(), "Found self-referential variant edges"

    # 4. Zero pseudo-variant edges for other marketplaces
    for m in ["walmart", "amazon", "amazon_in", "flipkart", "bestbuy"]:
        m_var = var_edges[var_edges["marketplace"] == m]
        assert len(m_var) == 0, f"Found {len(m_var)} invalid pseudo-variant edges for {m}"

