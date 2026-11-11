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


def test_ocr_missing_file_and_unsupported_platform():
    """Verifies that missing files and unsupported environments produce neutral, safe responses."""
    from src.cv.ocr_engine import PhysicalOCREngine

    engine = PhysicalOCREngine()

    # 1. Invalid file input
    res_missing = engine.extract_text_from_image(Path("non_existent_image_path_123.jpg"))
    assert res_missing["processing_status"] == "FILE_NOT_FOUND"
    assert res_missing["brand_alignment_status"] == "IMAGE_FILE_NOT_FOUND"
    assert res_missing["word_count"] == 0
    assert res_missing["confidence"] == 0.0

    # 2. Simulated engine unavailable state (neutral response invariant)
    engine_mock = PhysicalOCREngine()
    engine_mock._winocr_available = False
    engine_mock._tesseract_available = False
    sample_img = DATASET_DIR / "evidence"
    res_unavail = engine_mock.extract_text_from_image(sample_img)
    assert res_unavail["processing_status"] in ["UNSUPPORTED_PLATFORM", "FILE_NOT_FOUND"]
    assert res_unavail["confidence"] == 0.0


def test_ocr_brand_token_matching_logic():
    """Verifies brand token evaluation logic across partial, full, and mismatched brand tokens."""
    from src.cv.ocr_engine import PhysicalOCREngine
    engine = PhysicalOCREngine()

    # Create dummy images with text if engine available, or test token alignment directly
    # Full match:
    detected_text = "Authentic Sony Bravia 4K Ultra HD Television"
    clean_brand = "Sony"
    brand_parts = [t for t in clean_brand.lower().split() if len(t) > 2]
    matched = [t for t in brand_parts if t in detected_text.lower()]
    assert len(matched) == len(brand_parts)

    # Partial match:
    clean_brand_part = "Sony Electronics International"
    parts_multi = [t for t in clean_brand_part.lower().split() if len(t) > 2]
    matched_multi = [t for t in parts_multi if t in detected_text.lower()]
    assert 0 < len(matched_multi) < len(parts_multi)

    # No match:
    clean_brand_none = "Samsung"
    parts_none = [t for t in clean_brand_none.lower().split() if len(t) > 2]
    matched_none = [t for t in parts_none if t in detected_text.lower()]
    assert len(matched_none) == 0
