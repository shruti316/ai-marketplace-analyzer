"""
tests/test_schema.py
--------------------
Unit tests for canonical schema classes, taxonomy mapping, and availability flags.
"""

from src.data.schema import (
    CanonicalProduct,
    CanonicalReview,
    CanonicalImage,
    normalize_category_name,
)


def test_category_normalization():
    assert normalize_category_name("Electronics") == "Electronics"
    assert normalize_category_name("Cell Phones & Accessories") == "Electronics"
    assert normalize_category_name("All_Beauty") == "Beauty & Personal Care"
    assert normalize_category_name("Amazon Fashion") == "Clothing & Fashion"
    assert normalize_category_name("Home and Kitchen") == "Home & Kitchen"
    assert normalize_category_name("Toys & Games") == "Toys & Games"
    assert normalize_category_name("Books") == "Books & Stationery"
    assert normalize_category_name("Random Nonexistent Category") == "Random Nonexistent Category"
    assert normalize_category_name(None) == "Other"


def test_canonical_product_initialization():
    prod = CanonicalProduct(
        canonical_product_id="amazon_B001",
        marketplace="amazon",
        source_product_id="B001",
        title="Wireless Bluetooth Headphones",
        category="Electronics",
        price=49.99,
        rating=4.5,
    )
    assert prod.canonical_product_id == "amazon_B001"
    assert prod.marketplace == "amazon"
    assert prod.category == "Electronics"
    assert prod.field_availability["has_title"] is True
    assert prod.field_availability["has_price"] is True
    assert prod.field_availability["has_rating"] is True
    assert prod.field_availability["has_verified_seller_id"] is False


def test_canonical_review_initialization():
    rev = CanonicalReview(
        canonical_review_id="amazon_R001",
        source_review_id="R001",
        canonical_product_id="amazon_B001",
        marketplace="amazon",
        review_title="Excellent battery life",
        review_text="Sound quality is crisp and battery lasts over 30 hours.",
        rating=5.0,
        verified_purchase=True,
    )
    assert rev.canonical_review_id == "amazon_R001"
    assert rev.canonical_product_id == "amazon_B001"
    assert rev.rating == 5.0
    assert rev.verified_purchase is True


def test_canonical_image_initialization():
    img = CanonicalImage(
        image_id="img_001",
        canonical_product_id="amazon_B001",
        marketplace="amazon",
        image_url="https://m.media-amazon.com/images/I/test.jpg",
        image_type="primary",
        download_status="DOWNLOADED",
        content_hash_sha256="abc123sha",
        perceptual_hash_dhash="ffff0000ffff0000",
    )
    assert img.image_id == "img_001"
    assert img.download_status == "DOWNLOADED"
    assert img.content_hash_sha256 == "abc123sha"
