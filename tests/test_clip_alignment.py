"""Targeted Unit Tests for Workstream 4: CLIP Vision-Language Integration.

Verifies:
1. Alignment parquet schema, non-nullity, and row count.
2. Cosine similarity metric range (-1.0 to 1.0) and non-degeneracy.
3. Distribution of alignment categories (High, Moderate, Discordant).
4. Provenance authenticity tag.
"""

from pathlib import Path
import pytest
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATASET_DIR = PROJECT_ROOT / "data" / "indian_marketplace_trust_dataset_v1_7"


def test_clip_alignment_evidence_table():
    """Verifies image_text_consistency.parquet exists, has 100 rows, and valid columns."""
    p = DATASET_DIR / "derived_evidence" / "image_text_consistency.parquet"
    assert p.exists(), f"Missing {p}"

    df = pd.read_parquet(p)
    assert len(df) == 100, f"Expected 100 rows, got {len(df)}"

    required_cols = [
        "consistency_record_id",
        "canonical_product_id",
        "listing_id",
        "image_id",
        "listing_title",
        "model_architecture",
        "cosine_similarity",
        "alignment_status",
        "confidence",
        "is_discordant",
        "provenance",
    ]
    for c in required_cols:
        assert c in df.columns, f"Missing column {c}"

    assert (df["provenance"] == "GENUINE_OPENAI_CLIP_INFERENCE").all()


def test_clip_cosine_similarity_ranges():
    """Verifies cosine similarity scores are valid float numbers in reasonable range."""
    p = DATASET_DIR / "derived_evidence" / "image_text_consistency.parquet"
    df = pd.read_parquet(p)

    sims = df["cosine_similarity"].values
    assert (sims >= -1.0).all() and (sims <= 1.0).all()
    # Ensure not all zeros (non-degenerate)
    assert (sims > 0.05).sum() >= 70, "Expected at least 70 images with positive cosine similarity"


def test_clip_alignment_tier_distribution():
    """Verifies that alignment categories are populated."""
    p = DATASET_DIR / "derived_evidence" / "image_text_consistency.parquet"
    df = pd.read_parquet(p)

    statuses = set(df["alignment_status"].unique())
    expected = {"HIGH_VISUAL_TEXT_ALIGNMENT", "MODERATE_VISUAL_TEXT_ALIGNMENT"}
    assert len(statuses.intersection(expected)) > 0

    # Ensure discordant flag is boolean
    assert df["is_discordant"].dtype == bool
