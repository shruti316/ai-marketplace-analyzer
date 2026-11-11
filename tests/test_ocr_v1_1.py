"""
Unit Tests for Packaging OCR Enhancements (V1.1)
AI-Powered Indian Marketplace Trust Intelligence Platform
"""

import pytest
from PIL import Image

from src.cv.ocr_engine import (
    PackagingBrandMatcher,
    PackagingIdentifierExtractor,
    PackagingImagePreprocessor,
    PhysicalOCREngine,
)


def test_packaging_image_preprocessor():
    """Verifies image preprocessing creates an RGB image with enhanced contrast."""
    test_img = Image.new("RGB", (200, 200), color=(180, 180, 180))
    enhanced = PackagingImagePreprocessor.enhance_for_ocr(test_img)
    assert enhanced.size == (200, 200)
    assert enhanced.mode == "RGB"


def test_statutory_identifier_extraction():
    """Verifies regex extraction of Indian statutory packaging markings (MRP, Net Qty, Batch)."""
    ocr_sample = (
        "MANUFACTURED BY HINDUSTAN UNILEVER LIMITED. "
        "NET QTY: 100 ml. "
        "MRP Rs. 249.00 INCL. OF ALL TAXES. "
        "B.NO. B234/EXP 05/28"
    )

    ids = PackagingIdentifierExtractor.extract_identifiers(ocr_sample)
    assert ids["mrp_detected"] == 249.00
    assert "100 ml" in ids["net_quantity"].lower()
    assert ids["batch_code"] is not None


def test_fuzzy_brand_matching():
    """Verifies fuzzy brand matching handles slight OCR typos or punctuation variance."""
    # Exact with punctuation variation: "Pond's" vs "Ponds"
    align, tokens, conf = PackagingBrandMatcher.match_brand(
        canonical_brand="Pond's",
        detected_text="PONDS WHITE BEAUTY DAILY SPOTLESS LIGHTENING CREAM",
        word_count=7,
    )
    assert align == "BRAND_VERIFIED_ON_PACKAGING"
    assert conf >= 0.90

    # Multi-token brand with minor OCR slip
    align2, tokens2, conf2 = PackagingBrandMatcher.match_brand(
        canonical_brand="Mamaearth",
        detected_text="NATURAL MAMA EARTH ONION SHAMPOO FOR HAIR FALL CONTROL",
        word_count=9,
    )
    assert align2 == "BRAND_VERIFIED_ON_PACKAGING"


def test_insufficient_packaging_text_non_penalty():
    """Verifies images with minimal or unreadable text receive INSUFFICIENT_PACKAGING_TEXT without penalty."""
    align, tokens, conf = PackagingBrandMatcher.match_brand(
        canonical_brand="Nivea",
        detected_text="NEW 2024",
        word_count=2,
    )
    assert align == "INSUFFICIENT_PACKAGING_TEXT"
    assert len(tokens) == 0


def test_ocr_engine_extract_contract():
    """Verifies extract_text_from_image returns all V1.1 metadata fields."""
    engine = PhysicalOCREngine()
    # Missing file test
    res = engine.extract_text_from_image("data/non_existent_packaging.jpg", canonical_brand="Patanjali")
    assert res["brand_alignment_status"] == "IMAGE_FILE_NOT_FOUND"
    assert "extracted_mrp" in res
    assert "extracted_net_quantity" in res
    assert "brand_confidence" in res
