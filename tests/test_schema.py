"""
tests/test_schema.py
--------------------
Unit tests for canonical schema classes, taxonomy mapping, and availability flags.
"""

from src.data.schema import (
    CanonicalProduct,
    CanonicalReview,
    CanonicalImage,
    UnlinkedReviewRecord,
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
    assert normalize_category_name("inkjet printer ink") == "Books & Stationery"
    assert normalize_category_name("headphones") == "Electronics"
    assert normalize_category_name("Mobiles & Accessories") == "Electronics"
    assert normalize_category_name("Dinner Sets & Crockery") == "Home & Kitchen"
    assert normalize_category_name("Cookware & Utensils") == "Home & Kitchen"
    assert normalize_category_name("Washing Machine & Refrigerator") == "Home Appliances"
    assert normalize_category_name("Grocery & Gourmet Foods") == "Grocery & Household Essentials"
    assert normalize_category_name("Detergents & Dishwash") == "Grocery & Household Essentials"
    assert normalize_category_name("Jewellery & Footwear") == "Clothing & Fashion"
    assert normalize_category_name("Random Nonexistent Category") == "Other"
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


def test_country_and_currency_guardrails():
    # US marketplace defaults to US / USD
    us_prod = CanonicalProduct(
        canonical_product_id="amazon_us_1",
        marketplace="amazon",
        source_product_id="us_1",
        title="US Gadget",
    )
    assert us_prod.country == "US"
    assert us_prod.currency == "USD"

    # Indian marketplace auto-corrects to IN / INR to prevent silent geographic mislabeling
    in_prod = CanonicalProduct(
        canonical_product_id="flipkart_in_1",
        marketplace="flipkart",
        source_product_id="in_1",
        title="Indian Ethnic Kurta",
    )
    assert in_prod.country == "IN"
    assert in_prod.currency == "INR"

    # Indian review auto-corrects country to IN
    in_rev = CanonicalReview(
        canonical_review_id="fk_rev_1",
        source_review_id="1",
        canonical_product_id="flipkart_in_1",
        marketplace="flipkart",
        review_text="Very good material.",
    )
    assert in_rev.country == "IN"


def test_nullable_review_rating():
    # None rating remains None, not defaulted to 0.0 or 5.0
    rev_no_rate = CanonicalReview(
        canonical_review_id="rev_none",
        source_review_id="none",
        canonical_product_id="prod_1",
        marketplace="walmart",
        rating=None,
    )
    assert rev_no_rate.rating is None

    # Valid rating is cast to float
    rev_with_rate = CanonicalReview(
        canonical_review_id="rev_4",
        source_review_id="4",
        canonical_product_id="prod_1",
        marketplace="walmart",
        rating="4.5",
    )
    assert rev_with_rate.rating == 4.5


def test_unlinked_review_record():
    unlinked = UnlinkedReviewRecord(
        corpus_review_id="flipkart_corpus_101",
        marketplace="flipkart",
        country="IN",
        product_name_raw="boAt Rockerz 255F",
        product_price_raw=1199.0,
        review_title="Best bass",
        review_text="Sound quality and battery backup are wonderful.",
        rating=5.0,
        sentiment_label="positive",
        sentiment_code=2,
    )
    assert unlinked.corpus_review_id == "flipkart_corpus_101"
    assert unlinked.marketplace == "flipkart"
    assert unlinked.country == "IN"
    assert unlinked.linkage_status == "UNLINKED_RESEARCH_CORPUS"
    assert unlinked.sentiment_label == "positive"
    assert unlinked.sentiment_code == 2
    assert unlinked.rating == 5.0

