# Comprehensive Data Dictionary
## AI-Powered Marketplace Trust Intelligence Platform

---

## 1. Architectural Overview & Data Layers

The platform organizes data across three immutable, auditable tiers:

```text
data/
├── raw/                 → Immutable source datasets (Amazon, Walmart, BestBuy, Benchmarks, Images)
├── interim/             → Verified cohorts (Dense products/reviews, Pricing cohort, Image manifest)
└── processed/           → Canonical platform entities & backward-compatible baseline features
```

---

## 2. Canonical Product Schema (`canonical_products.parquet`)

| Field | Type | Description | Nullable | Example |
|---|---|---|---|---|
| `canonical_product_id` | String (PK) | Globally unique internal product ID (`{marketplace}_{source_id}`) | No | `amazon_B00176GTAG`, `walmart_152132` |
| `marketplace` | String | Source marketplace platform (`amazon`, `walmart`, `bestbuy`) | No | `amazon` |
| `source_product_id` | String | Platform-native item ID (ASIN, Walmart Item ID, BestBuy model slug) | No | `B00176GTAG` |
| `parent_product_id` | String | Parent grouping ID or model number for variants | Yes | `B00176GTAG`, `152132` |
| `title` | String | Normalized product listing title | No | `Koss EQ50 3-Band Stereo Equalizer` |
| `category` | String | Standardized platform taxonomy category | No | `Electronics`, `Beauty & Personal Care` |
| `subcategory` | String | Granular subcategory from source taxonomy | Yes | `Headphone Accessories`, `All Beauty` |
| `brand` | String | Brand or manufacturer name | Yes | `Koss`, `Philips` |
| `description` | String | Product description, specifications, or bullet points | Yes | `Compact portable stereo equalizer...` |
| `price` | Float | Product price normalized to numeric USD | Yes | `12.65` |
| `currency` | String | ISO 4217 currency code | No | `USD` |
| `rating` | Float | Historical average customer rating (1.0 to 5.0) | Yes | `4.3` |
| `rating_count` | Integer | Total customer ratings count | Yes | `340` |
| `product_url` | String | Canonical URL pointing to the listing | Yes | `https://www.amazon.com/dp/B00176GTAG` |
| `image_urls` | List[String] | Array of high-resolution and primary product image URLs | No | `['https://m.media-amazon.com/...']` |
| `seller_id` | String | Verified merchant account token (None unless verified) | Yes | `None` |
| `seller_name` | String | Storefront or merchant display name | Yes | `Walmart.com`, `Amazon` |
| `metadata_details` | Dict | Technical specifications, packaging dimensions, weight | No | `{'model_number': '152132'}` |
| `source_provenance` | String | Originating dataset and collection method | No | `Amazon Reviews'23 (Electronics)` |
| `collection_timestamp`| String | ISO timestamp when the record was ingested | No | `2026-10-21T11:18:22` |
| `field_availability` | Dict | Boolean flags indicating presence of title, price, rating, etc. | No | `{'has_price': True, 'has_rating': False}` |

---

## 3. Canonical Review Schema (`canonical_reviews.parquet`)

| Field | Type | Description | Nullable | Example |
|---|---|---|---|---|
| `canonical_review_id` | String (PK) | Globally unique internal review ID (`{marketplace}_{product_id}_{id}`) | No | `amazon_B001CN78PY_R123` |
| `source_review_id` | String | Native review ID or timestamp from source platform | No | `R123456789` |
| `canonical_product_id` | String (FK) | References `canonical_products.canonical_product_id` | No | `amazon_B001CN78PY` |
| `marketplace` | String | Platform (`amazon`, `bestbuy`, `walmart`) | No | `amazon` |
| `reviewer_id` | String | Anonymous customer / author identifier | Yes | `AG7W3S...`, `JohnDoe` |
| `review_title` | String | Customer review headline | Yes | `Amazing result after reading reviews` |
| `review_text` | String | Full review body text | No | `Works as expected. High build quality...` |
| `rating` | Float | Customer rating on a 1.0 to 5.0 star scale | No | `5.0` |
| `timestamp` | Integer | Unix epoch timestamp (seconds) | Yes | `1609459200` |
| `review_date` | String | Human-readable date string | Yes | `2021-01-01` |
| `verified_purchase` | Boolean | Confirms whether reviewer purchased through marketplace | Yes | `True` |
| `helpful_votes` | Integer | Helpful upvotes count | No | `4` |
| `language` | String | ISO 639-1 language code | No | `en` |
| `source_provenance` | String | Source dataset collection provenance | No | `Amazon Reviews'23 Dense Cohort` |
| `ground_truth_label` | String | Verified ground-truth label (None for observational data) | Yes | `None` |

---

## 4. Canonical Image Schema (`canonical_images.parquet`)

| Field | Type | Description | Nullable | Example |
|---|---|---|---|---|
| `image_id` | String (PK) | Unique image asset ID | No | `amazon_img_001` |
| `canonical_product_id` | String (FK) | References `canonical_products.canonical_product_id` | No | `amazon_B00176GTAG` |
| `marketplace` | String | Source platform | No | `amazon` |
| `image_url` | String | Remote CloudFront/CDN URL | Yes | `https://m.media-amazon.com/images/...` |
| `local_path` | String | Path to cached image on disk | Yes | `data/raw/images/cache/B00176GTAG_img_0.jpg` |
| `image_type` | String | Type (`primary`, `secondary`, `user_submission`) | No | `primary` |
| `download_status` | String | Status (`DOWNLOADED`, `PENDING`, `FAILED`) | No | `DOWNLOADED` |
| `content_hash_sha256` | String | Cryptographic SHA-256 hash | Yes | `9eb5444ca4e0...` |
| `perceptual_hash_dhash` | String | 64-bit difference hash for near-duplicate matching | Yes | `ffff0000ffff0000` |
| `ocr_text` | String | Text extracted from product packaging via WinRT OCR | Yes | `Pure Botanicals Face Moisturizer 50ml` |
| `source_provenance` | String | Origin dataset | No | `Amazon Reviews'23 Metadata` |

---

## 5. Category Taxonomy Standard Mapping

The platform maps heterogeneous marketplace categories into standardized cross-marketplace buckets:

| Standard Taxonomy Bucket | Included Source Categories & Subcategories |
|---|---|
| **Electronics** | Computers, Cell Phones & Accessories, Headphones, Cameras, Audio, Networking |
| **Beauty & Personal Care** | All Beauty, Premium Beauty, Skin Care, Hair Care, Cosmetics |
| **Clothing & Fashion** | Amazon Fashion, Clothing Shoes & Jewelry, Apparel, Footwear, Accessories |
| **Home & Kitchen** | Kitchen & Dining, Appliances, Home Décor, Storage, Furniture |
| **Toys & Games** | Board Games, Puzzles, Action Figures, Outdoor Play, Collectibles |
| **Books & Stationery** | Books, Office Products, Paper, Writing Supplies, Planners |
| **Sports & Outdoors** | Athletic Gear, Outdoor Recreation, Cycling, Fitness |
| **Grocery & Household** | Gourmet Food, Health & Household, Cleaning, Pantry |
| **Other** | Specialized tools, industrial components, unmapped categories |

---

## 6. Cautious Seller / Merchant Modeling

> [!IMPORTANT]
> **Brand names and store display names are NOT verified merchant accounts.**  
> Public marketplace datasets intentionally scrub merchant account identifiers. The platform strictly isolates brand display names into `seller_name` and leaves `seller_id` as `None` unless verified merchant tokens (e.g., via Amazon SP-API or retailer merchant registry) are authenticated.
