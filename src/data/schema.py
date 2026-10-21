"""
src/data/schema.py
------------------
Canonical Multi-Category and Multi-Marketplace Data Schema for the
AI-Powered Marketplace Trust Intelligence Platform.

Defines:
- CanonicalProduct: Standardized product record across marketplaces & categories.
- CanonicalReview: Standardized review record linked by canonical_product_id.
- CanonicalImage: Multimodal image record with download status, hashes, and OCR.
- CanonicalSeller: Verified seller/merchant account records (quarantined when unverified).
- CategoryTaxonomy: Standard cross-marketplace category normalization mapping.
"""

from dataclasses import dataclass, field, asdict
from typing import Optional, List, Dict, Any
import datetime
import re


# Standard Category Taxonomy for Multi-Category Normalization
STANDARD_CATEGORIES = {
    "electronics": "Electronics",
    "cell_phones_and_accessories": "Electronics",
    "computers": "Electronics",
    "camera_and_photo": "Electronics",
    "headphones": "Electronics",
    "beauty": "Beauty & Personal Care",
    "all_beauty": "Beauty & Personal Care",
    "premium_beauty": "Beauty & Personal Care",
    "beauty_and_personal_care": "Beauty & Personal Care",
    "fashion": "Clothing & Fashion",
    "amazon_fashion": "Clothing & Fashion",
    "clothing_shoes_and_jewelry": "Clothing & Fashion",
    "apparel": "Clothing & Fashion",
    "home_and_kitchen": "Home & Kitchen",
    "kitchen_and_dining": "Home & Kitchen",
    "appliances": "Home & Kitchen",
    "toys_and_games": "Toys & Games",
    "books": "Books & Stationery",
    "office_products": "Books & Stationery",
    "sports_and_outdoors": "Sports & Outdoors",
    "grocery_and_gourmet_food": "Grocery & Household",
    "health_and_household": "Grocery & Household",
    "unknown": "Other",
}


def normalize_category_name(raw_cat: Optional[str]) -> str:
    """Normalize raw marketplace categories into the platform standard taxonomy."""
    if not raw_cat or not str(raw_cat).strip():
        return "Other"

    cleaned = str(raw_cat).strip().lower().replace("&", "and").replace("-", "_").replace(" ", "_")
    cleaned = re.sub(r"[^\w_]", "", cleaned)

    for key, standard in STANDARD_CATEGORIES.items():
        if key in cleaned:
            return standard

    # Capitalize cleanly if unmatched
    return str(raw_cat).strip().title()


@dataclass
class CanonicalProduct:
    """
    Standardized product listing representation across all marketplaces.
    """
    canonical_product_id: str             # e.g., 'amazon_B00176GTAG', 'walmart_152132'
    marketplace: str                      # 'amazon', 'walmart', 'bestbuy', 'target'
    source_product_id: str                # Raw source ID: ASIN, SKU, Item ID
    parent_product_id: Optional[str] = None  # Parent ASIN or variant group ID
    title: str = ""                       # Product title / name
    category: str = "Other"               # Standardized platform category
    subcategory: Optional[str] = None     # Granular category from source
    brand: Optional[str] = None           # Brand or manufacturer
    description: Optional[str] = None     # Product description / bullet points
    price: Optional[float] = None         # Price normalized to numeric float
    currency: str = "USD"                 # ISO 4217 currency code
    rating: Optional[float] = None        # Average customer rating (1.0 to 5.0)
    rating_count: Optional[int] = None    # Total number of customer ratings
    product_url: Optional[str] = None     # Listing URL
    image_urls: List[str] = field(default_factory=list)  # Primary and secondary image URLs
    seller_id: Optional[str] = None       # REAL merchant account ID if genuine
    seller_name: Optional[str] = None     # Storefront display name
    metadata_details: Dict[str, Any] = field(default_factory=dict)  # Technical specs, dimensions
    source_provenance: str = ""           # Origin dataset / collection method
    collection_timestamp: str = field(default_factory=lambda: datetime.datetime.utcnow().isoformat())
    field_availability: Dict[str, bool] = field(default_factory=dict)

    def __post_init__(self):
        # Auto-populate field availability
        self.field_availability = {
            "has_title": bool(self.title and self.title.strip()),
            "has_price": bool(self.price is not None and self.price > 0),
            "has_rating": bool(self.rating is not None and self.rating > 0),
            "has_description": bool(self.description and self.description.strip()),
            "has_brand": bool(self.brand and self.brand.strip()),
            "has_images": bool(len(self.image_urls) > 0),
            "has_verified_seller_id": bool(self.seller_id and self.seller_id.strip()),
        }
        self.category = normalize_category_name(self.category)


@dataclass
class CanonicalReview:
    """
    Standardized review representation across all marketplaces.
    """
    canonical_review_id: str              # e.g., 'amazon_R123456789'
    source_review_id: str                 # Raw review ID
    canonical_product_id: str             # Foreign key referencing CanonicalProduct
    marketplace: str                      # 'amazon', 'walmart', 'bestbuy'
    reviewer_id: Optional[str] = None     # Customer / reviewer identifier
    review_title: Optional[str] = None    # Review headline
    review_text: str = ""                 # Review body text
    rating: float = 0.0                   # Review star rating (1.0 to 5.0)
    timestamp: Optional[int] = None       # Unix timestamp in seconds or ms
    review_date: Optional[str] = None     # ISO date string
    verified_purchase: Optional[bool] = None  # Verified buyer flag
    helpful_votes: Optional[int] = 0      # Helpful vote count
    language: str = "en"                  # Detected or declared language
    source_provenance: str = ""           # Origin dataset
    ground_truth_label: Optional[str] = None  # Genuine ground-truth ONLY (never heuristic!)

    def __post_init__(self):
        if not self.review_text:
            self.review_text = ""
        self.rating = float(self.rating) if self.rating is not None else 0.0


@dataclass
class CanonicalImage:
    """
    Multimodal image asset record linked to a CanonicalProduct.
    """
    image_id: str                         # Unique image identifier
    canonical_product_id: str             # FK to CanonicalProduct
    marketplace: str                      # Source platform
    image_url: Optional[str] = None       # Source CDN URL
    local_path: Optional[str] = None      # Local cached path if downloaded
    image_type: str = "primary"           # 'primary', 'secondary', 'user_submission'
    download_status: str = "PENDING"      # 'DOWNLOADED', 'FAILED', 'PENDING', 'MISSING_URL'
    file_size_bytes: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    content_hash_sha256: Optional[str] = None  # Cryptographic SHA-256
    perceptual_hash_dhash: Optional[str] = None  # Visual difference hash (dHash)
    ocr_text: Optional[str] = None        # Text extracted from packaging via OCR
    ocr_packaging_match_score: Optional[float] = None  # Consistency with listing title/brand
    source_provenance: str = ""


@dataclass
class CanonicalSeller:
    """
    Verified seller account record.
    NOTE: Only instantiated when genuine merchant account IDs exist.
    Brand names alone are NOT treated as verified seller entities.
    """
    seller_id: str                        # Merchant token / account ID
    marketplace: str                      # Platform
    legal_name: Optional[str] = None      # Registered legal entity
    display_name: str = ""                # Storefront name
    country: Optional[str] = None         # Registration country
    account_creation_date: Optional[str] = None
    is_verified_merchant: bool = False
    positive_feedback_pct: Optional[float] = None
    total_feedback_count: Optional[int] = None
    source_provenance: str = ""
