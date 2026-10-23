"""
tests/test_vision.py
--------------------
Unit tests for visual perceptual hashing and packaging consistency analysis.
"""

from PIL import Image
from src.vision.image_analysis import (
    compute_dhash,
    calculate_packaging_consistency,
)


def test_dhash_determinism():
    img1 = Image.new("RGB", (100, 100), color="white")
    img2 = Image.new("RGB", (100, 100), color="white")
    h1 = compute_dhash(img1)
    h2 = compute_dhash(img2)
    assert h1 == h2, "Identical images must yield identical dHash"


def test_packaging_consistency_exact():
    title = "CeraVe Moisturizing Cream with Hyaluronic Acid"
    brand = "CeraVe"
    ocr_text = "CERAVE MOISTURIZING CREAM DAILY HYALURONIC ACID 16 OZ"
    score = calculate_packaging_consistency(ocr_text, title, brand)
    assert score >= 0.50, f"Expected high packaging consistency, got {score}"


def test_packaging_consistency_neutral_on_empty():
    title = "Plain Silicone Spatula Blue"
    brand = "KitchenAid"
    score = calculate_packaging_consistency(None, title, brand)
    assert score == 0.50, "Absence of text should yield neutral score 0.50"


def test_packaging_consistency_normalizes_punctuation():
    score = calculate_packaging_consistency(
        "BEAUTIFY- DUO-PRO HAIR EXTENSION TAPE",
        "DUO-PRO Extension tabs",
        "Duo",
    )
    assert score == 0.75, f"Expected normalized token overlap of 0.75, got {score}"

def test_packaging_consistency_neutral_when_no_usable_tokens():
    score = calculate_packaging_consistency(
        "a b c",
        "x y",
        None,
    )
    assert score == 0.50, f"Expected neutral score, got {score}"



def test_packaging_consistency_is_case_insensitive():
    score = calculate_packaging_consistency(
        "CERAVE MOISTURIZING CREAM",
        "CeraVe Moisturizing Cream",
        None,
    )
    assert score == 1.0, f"Expected case-insensitive match, got {score}"
