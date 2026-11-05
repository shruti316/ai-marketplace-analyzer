"""
Unit & Integration Tests for Multimodal Coverage Matrix Generator
AI-Powered Marketplace Trust Intelligence Platform
"""

from pathlib import Path
import pytest
import pandas as pd

from src.data.curation.multimodal_coverage_matrix import MultimodalCoverageMatrixBuilder

PROJECT_ROOT = Path(__file__).resolve().parents[1]
FINAL_DATASET_DIR = PROJECT_ROOT / "data" / "indian_marketplace_trust_dataset_final"


def test_coverage_matrix_build():
    builder = MultimodalCoverageMatrixBuilder(FINAL_DATASET_DIR)
    matrix = builder.build_matrix()
    
    assert len(matrix) == 3643
    
    expected_cols = [
        "canonical_product_id",
        "marketplace",
        "title",
        "brand",
        "category",
        "subcategory",
        "review_count",
        "valid_review_count",
        "image_count",
        "valid_image_count",
        "valid_price_available",
        "seller_identity_available",
        "review_status",
        "image_status",
        "price_status",
        "metadata_status",
        "missing_modalities",
        "modality_count",
        "coverage_tier",
        "validation_status",
    ]
    for col in expected_cols:
        assert col in matrix.columns, f"Missing expected column: {col}"

    # Verify status enums
    valid_statuses = {"AVAILABLE", "MISSING", "INVALID", "UNVERIFIED", "QUARANTINED"}
    assert set(matrix["review_status"].unique()).issubset(valid_statuses)
    assert set(matrix["image_status"].unique()).issubset(valid_statuses)
    assert set(matrix["price_status"].unique()).issubset(valid_statuses)
    assert set(matrix["metadata_status"].unique()).issubset(valid_statuses)

    # Verify coverage tiers
    valid_tiers = {"Tier A", "Tier B", "Tier C", "Tier D"}
    assert set(matrix["coverage_tier"].unique()).issubset(valid_tiers)

    # Check Tier A has 4 modalities
    tier_a = matrix[matrix["coverage_tier"] == "Tier A"]
    assert len(tier_a) >= 5
    for _, r in tier_a.iterrows():
        assert r["modality_count"] == 4
        assert r["review_status"] == "AVAILABLE"
        assert r["image_status"] == "AVAILABLE"
        assert r["price_status"] == "AVAILABLE"
        assert r["metadata_status"] == "AVAILABLE"
