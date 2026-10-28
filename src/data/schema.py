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


# Standardized Core Parent Categories Supported by Platform
STANDARD_CATEGORIES = [
    "Electronics",
    "Beauty & Personal Care",
    "Clothing & Fashion",
    "Home & Kitchen",
    "Books & Stationery",
    "Toys & Games",
    "Grocery & Household Essentials",
    "Home Appliances",
]

# Comprehensive Category Taxonomy Mapping (Subcategories -> Standardized Parent Categories)
CATEGORY_MAPPING_RULES = {
    # Electronics & Accessories
    "electronics": "Electronics",
    "cell_phones": "Electronics",
    "cell_phone": "Electronics",
    "phones": "Electronics",
    "phone": "Electronics",
    "mobiles": "Electronics",
    "mobile": "Electronics",
    "computers": "Electronics",
    "computer": "Electronics",
    "camera": "Electronics",
    "cameras": "Electronics",
    "audio": "Electronics",
    "video": "Electronics",
    "headphones": "Electronics",
    "headphone": "Electronics",
    "headset": "Electronics",
    "headsets": "Electronics",
    "speaker": "Electronics",
    "speakers": "Electronics",
    "mice": "Electronics",
    "mouse": "Electronics",
    "keyboard": "Electronics",
    "keyboards": "Electronics",
    "monitor": "Electronics",
    "monitors": "Electronics",
    "laptop": "Electronics",
    "laptops": "Electronics",
    "projector": "Electronics",
    "projectors": "Electronics",
    "hard_drive": "Electronics",
    "flash_drive": "Electronics",
    "memory_card": "Electronics",
    "memory": "Electronics",
    "cable": "Electronics",
    "cables": "Electronics",
    "adapter": "Electronics",
    "adapters": "Electronics",
    "charger": "Electronics",
    "chargers": "Electronics",
    "battery": "Electronics",
    "batteries": "Electronics",
    "router": "Electronics",
    "routers": "Electronics",
    "network": "Electronics",
    "networking": "Electronics",
    "switch": "Electronics",
    "switches": "Electronics",
    "modem": "Electronics",
    "modems": "Electronics",
    "tv": "Electronics",
    "tvs": "Electronics",
    "television": "Electronics",
    "gps": "Electronics",
    "radio": "Electronics",
    "radios": "Electronics",
    "mp3": "Electronics",
    "surveillance": "Electronics",
    "security_system": "Electronics",
    "camcorder": "Electronics",
    "tripod": "Electronics",
    "scanners": "Electronics",
    "scanner": "Electronics",

    # Beauty & Personal Care
    "beauty": "Beauty & Personal Care",
    "all_beauty": "Beauty & Personal Care",
    "premium_beauty": "Beauty & Personal Care",
    "personal_care": "Beauty & Personal Care",
    "cosmetics": "Beauty & Personal Care",
    "skin_care": "Beauty & Personal Care",
    "hair_care": "Beauty & Personal Care",
    "fragrance": "Beauty & Personal Care",
    "makeup": "Beauty & Personal Care",
    "bath_and_shower": "Beauty & Personal Care",
    "bath_shower": "Beauty & Personal Care",

    # Clothing & Fashion
    "fashion": "Clothing & Fashion",
    "clothing": "Clothing & Fashion",
    "shoes": "Clothing & Fashion",
    "footwear": "Clothing & Fashion",
    "jewelry": "Clothing & Fashion",
    "jewellery": "Clothing & Fashion",
    "apparel": "Clothing & Fashion",
    "dress": "Clothing & Fashion",
    "dresses": "Clothing & Fashion",
    "shirt": "Clothing & Fashion",
    "shirts": "Clothing & Fashion",
    "pants": "Clothing & Fashion",
    "wear": "Clothing & Fashion",
    "bags_cases": "Clothing & Fashion",
    "cases_bags": "Clothing & Fashion",
    "briefcases": "Clothing & Fashion",

    # Home & Kitchen
    "home": "Home & Kitchen",
    "kitchen": "Home & Kitchen",
    "dining": "Home & Kitchen",
    "appliances": "Home & Kitchen",
    "appliance": "Home & Kitchen",
    "furniture": "Home & Kitchen",
    "bedding": "Home & Kitchen",
    "bath": "Home & Kitchen",
    "decor": "Home & Kitchen",
    "storage": "Home & Kitchen",
    "lighting": "Home & Kitchen",
    "light": "Home & Kitchen",
    "bulbs": "Home & Kitchen",
    "lamps": "Home & Kitchen",
    "air_purifiers": "Home & Kitchen",
    "clocks": "Home & Kitchen",

    # Toys & Games
    "toys": "Toys & Games",
    "toy": "Toys & Games",
    "games": "Toys & Games",
    "game": "Toys & Games",
    "puzzles": "Toys & Games",
    "action_figures": "Toys & Games",
    "collectibles": "Toys & Games",
    "hobbies": "Toys & Games",

    # Books & Stationery
    "books": "Books & Stationery",
    "book": "Books & Stationery",
    "stationery": "Books & Stationery",
    "office": "Books & Stationery",
    "printer_ink": "Books & Stationery",
    "printer_toner": "Books & Stationery",
    "inkjet": "Books & Stationery",
    "laser_printer": "Books & Stationery",
    "laminating": "Books & Stationery",
    "presentation": "Books & Stationery",
    "paper": "Books & Stationery",
    "binders": "Books & Stationery",
    "labels": "Books & Stationery",
    "shredders": "Books & Stationery",
    "pens": "Books & Stationery",
    "markers": "Books & Stationery",
    "calculators": "Books & Stationery",
    "labeling_tapes": "Books & Stationery",
    "label_makers": "Books & Stationery",

    # Computer Accessories & Unclassified Electronics
    "cases_sleeves": "Electronics",
    "projection_screens": "Electronics",
    "projection_screen": "Electronics",
    "printers": "Electronics",
    "printer": "Electronics",
    "graphics_cards": "Electronics",
    "graphics_card": "Electronics",
    "webcam": "Electronics",
    "webcams": "Electronics",
    "docking_stations": "Electronics",
    "docking_station": "Electronics",
    "screen_protectors": "Electronics",
    "screen_protector": "Electronics",
    "blank_media": "Electronics",
    "data_cartridges": "Electronics",

    # Home & Kitchen: Crockery, Cookware, Tableware & Decor
    "crockery": "Home & Kitchen",
    "dinner_set": "Home & Kitchen",
    "dinner_sets": "Home & Kitchen",
    "cookware": "Home & Kitchen",
    "kitchen_dining": "Home & Kitchen",
    "kitchen_and_dining": "Home & Kitchen",
    "tableware": "Home & Kitchen",
    "cutlery": "Home & Kitchen",
    "glassware": "Home & Kitchen",
    "plates": "Home & Kitchen",
    "bowls": "Home & Kitchen",
    "cups_mugs": "Home & Kitchen",
    "mugs": "Home & Kitchen",
    "utensils": "Home & Kitchen",
    "home_furnishing": "Home & Kitchen",
    "furnishing": "Home & Kitchen",
    "home_decor": "Home & Kitchen",
    "festive_needs": "Home & Kitchen",

    # Home Appliances
    "refrigerator": "Home Appliances",
    "washing_machine": "Home Appliances",
    "microwave": "Home Appliances",
    "mixer": "Home Appliances",
    "grinder": "Home Appliances",
    "air_conditioner": "Home Appliances",
    "home_appliances": "Home Appliances",
    "appliances": "Home Appliances",

    # Grocery & Household Essentials
    "grocery": "Grocery & Household Essentials",
    "gourmet_foods": "Grocery & Household Essentials",
    "packaged_food": "Grocery & Household Essentials",
    "food": "Grocery & Household Essentials",
    "tea": "Grocery & Household Essentials",
    "coffee": "Grocery & Household Essentials",
    "spices": "Grocery & Household Essentials",
    "household_essentials": "Grocery & Household Essentials",
    "cleaning_supplies": "Grocery & Household Essentials",
    "detergent": "Grocery & Household Essentials",
    "detergents": "Grocery & Household Essentials",
    "dishwash": "Grocery & Household Essentials",
    "dishwashing": "Grocery & Household Essentials",
}


def normalize_category_name(raw_cat: Optional[str]) -> str:
    """
    Hierarchically normalize raw marketplace categories into the platform's
    six standardized parent categories:
    1. Electronics
    2. Beauty & Personal Care
    3. Clothing & Fashion
    4. Home & Kitchen
    5. Books & Stationery
    6. Toys & Games
    (or 'Other' if unclassified)
    """
    if not raw_cat or not str(raw_cat).strip():
        return "Other"

    raw_clean = str(raw_cat).strip().lower().replace("&", "and").replace("-", "_").replace(" ", "_")
    raw_clean = re.sub(r"[^\w_]", "", raw_clean)

    for keyword, parent in CATEGORY_MAPPING_RULES.items():
        if keyword in raw_clean:
            return parent

    return "Other"


@dataclass
class CanonicalProduct:
    """
    Standardized product listing representation across all marketplaces.
    """
    canonical_product_id: str             # e.g., 'amazon_B00176GTAG', 'walmart_152132'
    marketplace: str                      # 'amazon', 'walmart', 'bestbuy', 'target'
    source_product_id: str                # Raw source ID: ASIN, SKU, Item ID
    parent_product_id: Optional[str] = None  # Parent ASIN or variant group ID
    country: str = "US"                   # Country of marketplace storefront (e.g., 'US', 'IN')
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
    marketplace: str                      # 'amazon', 'walmart', 'bestbuy', 'flipkart'
    country: str = "US"                   # Country of marketplace storefront (e.g., 'US', 'IN')
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
