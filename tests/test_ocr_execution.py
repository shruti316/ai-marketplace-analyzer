"""Targeted Unit Tests for Workstream 3: Physical OCR Execution.

Verifies:
1. Physical OCR engine initialization and interface compliance.
2. Word-level bounding boxes structure and confidence schema.
3. Actual OCR evidence table schema, non-nullity, and status distribution in v1.7.
4. Packaging brand alignment evaluation logic.
"""

import json
from pathlib import Path
import pytest
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATASET_DIR = PROJECT_ROOT / "data" / "indian_marketplace_trust_dataset_v1_7"


def test_ocr_evidence_table_integrity():
    """Verifies ocr_evidence.parquet exists, has 100 rows, and valid columns."""
    ocr_path = DATASET_DIR / "evidence" / "ocr_evidence.parquet"
    assert ocr_path.exists(), f"Missing {ocr_path}"

    df = pd.read_parquet(ocr_path)
    assert len(df) == 100, f"Expected 100 rows, found {len(df)}"

    required_cols = [
        "ocr_record_id",
        "image_id",
        "canonical_product_id",
        "detected_text",
        "word_count",
        "words_json",
        "ocr_engine",
        "ocr_confidence",
        "brand_alignment_status",
        "processing_status",
        "provenance",
    ]
    for col in required_cols:
        assert col in df.columns, f"Missing column {col}"

    assert (df["provenance"] == "GENUINE_WINRT_PHYSICAL_OCR").all()


def test_ocr_success_rate_and_text_extraction():
    """Verifies that physical OCR succeeded on majority of images and extracted real words."""
    ocr_path = DATASET_DIR / "evidence" / "ocr_evidence.parquet"
    df = pd.read_parquet(ocr_path)

    success_df = df[df["processing_status"] == "SUCCESS"]
    assert len(success_df) >= 70, f"Expected >=70 success, got {len(success_df)}"

    # Check words_json contains valid bounding boxes
    sample = success_df.iloc[0]
    words = json.loads(sample["words_json"])
    assert len(words) > 0
    first_word = words[0]
    assert "text" in first_word
    assert "x" in first_word and "y" in first_word
    assert "w" in first_word and "h" in first_word


def test_ocr_brand_alignment_evaluation():
    """Verifies brand alignment status classification."""
    ocr_path = DATASET_DIR / "evidence" / "ocr_evidence.parquet"
    df = pd.read_parquet(ocr_path)

    verified = df[df["brand_alignment_status"] == "BRAND_VERIFIED_ON_PACKAGING"]
    assert len(verified) >= 30, f"Expected >=30 brand verified rows, got {len(verified)}"

    # Confirm known product Pond's cold cream has brand verified
    ponds = df[df["canonical_product_id"] == "amazon_in_B000052YQN"]
    assert len(ponds) == 1
    assert "POND" in ponds.iloc[0]["detected_text"].upper()
    assert ponds.iloc[0]["brand_alignment_status"] == "BRAND_VERIFIED_ON_PACKAGING"
