"""
Unit Tests for Fine-Grained 6-Tier Duplicate Image Taxonomy (V1.1)
AI-Powered Indian Marketplace Trust Intelligence Platform
"""

import pytest
from src.cv.duplicate_taxonomy import (
    AdvancedDuplicateTaxonomyClassifier,
    DuplicateTaxonomyResult,
    VisualTaxonomyTier,
)


def test_exact_duplicate_classification():
    """Verifies cryptographic SHA-256 bitwise equality yields EXACT_DUPLICATE."""
    meta1 = {
        "image_id": "img_001",
        "canonical_product_id": "prod_A",
        "marketplace": "amazon_in",
        "sha256": "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        "dhash": "0000000000000000",
        "brand": "Boat",
    }
    meta2 = {
        "image_id": "img_002",
        "canonical_product_id": "prod_B",
        "marketplace": "flipkart",
        "sha256": "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        "dhash": "0000000000000000",
        "brand": "GenericSeller",
    }

    res = AdvancedDuplicateTaxonomyClassifier.classify_image_pair(
        meta1, meta2, centered_cosine_sim=1.0, dhash_distance=0
    )
    assert res.taxonomy_tier == VisualTaxonomyTier.EXACT_DUPLICATE.value
    assert res.is_suspicious_cross_product_reuse is True
    assert res.is_cross_marketplace is True
    assert res.confidence == 1.0


def test_near_duplicate_classification():
    """Verifies minor compression/resizing yields NEAR_DUPLICATE."""
    meta1 = {
        "image_id": "img_001",
        "canonical_product_id": "prod_A",
        "marketplace": "amazon_in",
        "sha256": "1111111111111111111111111111111111111111111111111111111111111111",
        "dhash": "ffff0000ffff0000",
        "brand": "Sony",
    }
    meta2 = {
        "image_id": "img_002",
        "canonical_product_id": "prod_B",
        "marketplace": "amazon_in",
        "sha256": "2222222222222222222222222222222222222222222222222222222222222222",
        "dhash": "ffff0000ffff0001",  # Hamming dist = 1
        "brand": "UnauthorizedStore",
    }

    res = AdvancedDuplicateTaxonomyClassifier.classify_image_pair(
        meta1, meta2, centered_cosine_sim=0.985, dhash_distance=1
    )
    assert res.taxonomy_tier == VisualTaxonomyTier.NEAR_DUPLICATE.value
    assert res.is_suspicious_cross_product_reuse is True


def test_same_product_multi_angle_non_penalty():
    """Verifies multiple camera shots of the SAME product are never flagged as suspicious reuse."""
    meta1 = {
        "image_id": "img_001_front",
        "canonical_product_id": "amazon_in_B00XYZ",
        "marketplace": "amazon_in",
        "sha256": "aaaabbbbccccddddaaaabbbbccccddddaaaabbbbccccddddaaaabbbbccccdddd",
        "dhash": "1111222233334444",
        "brand": "Puma",
    }
    meta2 = {
        "image_id": "img_001_back",
        "canonical_product_id": "amazon_in_B00XYZ",  # Identical canonical product
        "marketplace": "amazon_in",
        "sha256": "eeeeffff00001111eeeeffff00001111eeeeffff00001111eeeeffff00001111",
        "dhash": "5555666677778888",
        "brand": "Puma",
    }

    res = AdvancedDuplicateTaxonomyClassifier.classify_image_pair(
        meta1, meta2, centered_cosine_sim=0.88, dhash_distance=10
    )
    assert res.taxonomy_tier == VisualTaxonomyTier.SAME_PRODUCT_DIFFERENT_IMAGE.value
    assert res.is_same_product is True
    assert res.is_suspicious_cross_product_reuse is False  # Zero penalty!


def test_same_brand_legitimate_variant():
    """Verifies legitimate catalog product variants within the same brand are not suspicious."""
    meta1 = {
        "image_id": "img_red_variant",
        "canonical_product_id": "prod_phone_red",
        "marketplace": "amazon_in",
        "sha256": "1234567812345678123456781234567812345678123456781234567812345678",
        "dhash": "aaaaaaaaaaaaaaaa",
        "brand": "Samsung",
    }
    meta2 = {
        "image_id": "img_blue_variant",
        "canonical_product_id": "prod_phone_blue",
        "marketplace": "amazon_in",
        "sha256": "8765432187654321876543218765432187654321876543218765432187654321",
        "dhash": "aaaaaaaaaaaaaaab",
        "brand": "Samsung",
    }

    res = AdvancedDuplicateTaxonomyClassifier.classify_image_pair(
        meta1, meta2, centered_cosine_sim=0.89, dhash_distance=6
    )
    assert res.taxonomy_tier == VisualTaxonomyTier.SAME_PRODUCT_VARIANT.value
    assert res.is_same_brand is True
    assert res.is_suspicious_cross_product_reuse is False


def test_review_required_ambiguity():
    """Verifies ambiguous cross-brand pairs trigger REVIEW_REQUIRED."""
    meta1 = {
        "image_id": "img_brand_x",
        "canonical_product_id": "prod_x",
        "marketplace": "amazon_in",
        "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "dhash": "1111111111111111",
        "brand": "BrandX",
    }
    meta2 = {
        "image_id": "img_brand_y",
        "canonical_product_id": "prod_y",
        "marketplace": "flipkart",
        "sha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        "dhash": "111111111111111f",  # dist = 4
        "brand": "BrandY",
    }

    res = AdvancedDuplicateTaxonomyClassifier.classify_image_pair(
        meta1, meta2, centered_cosine_sim=0.935, dhash_distance=6
    )
    assert res.taxonomy_tier == VisualTaxonomyTier.REVIEW_REQUIRED.value
    assert res.confidence == 0.70


def test_unrelated_products():
    """Verifies low similarity pairs are classified as UNRELATED."""
    meta1 = {
        "image_id": "img_shoes",
        "canonical_product_id": "prod_shoes",
        "marketplace": "amazon_in",
        "sha256": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        "dhash": "0000000000000000",
        "brand": "Nike",
    }
    meta2 = {
        "image_id": "img_laptop",
        "canonical_product_id": "prod_laptop",
        "marketplace": "amazon_in",
        "sha256": "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        "dhash": "ffffffffffffffff",
        "brand": "Dell",
    }

    res = AdvancedDuplicateTaxonomyClassifier.classify_image_pair(
        meta1, meta2, centered_cosine_sim=0.12, dhash_distance=64
    )
    assert res.taxonomy_tier == VisualTaxonomyTier.UNRELATED.value
    assert res.is_suspicious_cross_product_reuse is False
