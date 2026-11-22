# Dataset Release v1.8 Schema & Entity Dictionary
## AI-Powered Marketplace Trust Intelligence Platform

**Release Version:** `v1.8_CERTIFIED`  
**Certified Tables:** 61 tables  
**Entity Counts:** 6,043 products | 56,697 reviews | 5,228 usable images | 5,153 valid prices | 72,903 nodes | 87,954 edges

---

### 1. Core Entity Tables (`entities/`)

#### `entities/products.parquet` (6,043 rows, 25 columns)
Master registry of all certified marketplace listings:
- `canonical_product_id` (str): Unique cross-platform canonical identifier (e.g. `amazon_in_B000052YQN`).
- `product_id` (str): Source-specific product ID.
- `marketplace` (str): Origin marketplace (`amazon_in`, `flipkart`, `myntra`, `amazon`, `walmart`, `bestbuy`).
- `product_title` (str): Cleaned and normalized product title.
- `brand` (str): Normalized brand name.
- `category` (str): High-level category (10 canonical categories).
- `subcategory` (str): Granular domain subcategory.
- `product_description` (str): Product description text.
- `product_url` (str): Marketplace listing source URL.
- `seller_id` (str): Seller entity reference (`SELLER_AGG_...`).
- `seller_name` (str): Marketplace-displayed merchant name.
- `has_image` (bool): True if at least one usable physical image exists.
- `has_review` (bool): True if at least one customer review is linked.
- `has_price` (bool): True if valid observed listing price exists.
- `modality_tier` (str): Modality availability (`TIER_A_COMPLETE`, `TIER_B_VISUAL`, `TIER_C_TEXTUAL`, `TIER_D_CATALOG`).
- `domain_partition` (str): Geographic focus (`INDIAN_CORE` or `INTERNATIONAL_BENCHMARK`).
- `reconciliation_version` (str): Frozen release tag (`v1.8_CERTIFIED`).

#### `entities/canonical_product_registry.parquet` (6,043 rows, 32 columns)
Enriched product entities with token sets, attribute JSON, and multi-modal readiness metrics.

#### `entities/sellers.parquet` (6 rows, 12 columns)
Marketplace-level merchant aggregator entities avoiding false merchant collapsing.

#### `entities/product_variants.parquet` (772 rows, 8 columns)
Intra-catalog physical variant linkages (size, color, capacity) preserving distinct SKU identities.

---

### 2. Evidence Tables (`evidence/`)

#### `evidence/reviews.parquet` (56,697 rows, 26 columns)
Customer reviews with behavioral and sentiment features:
- `canonical_review_id` / `review_id` (str): Primary key.
- `product_id` (str): Linked product reference.
- `reviewer_id` (str): De-identified reviewer handle.
- `rating` (float): Numeric star rating [1.0, 5.0].
- `review_title` (str): Cleaned headline.
- `review_text_cleaned` (str): HTML-stripped, whitespace-normalized review body.
- `language` (str): Inferred review language (`en`, `hi_latin`).
- `verified_purchase_status` (bool): Marketplace verified purchase badge.
- `is_exact_text_duplicate` (bool): True if review text repeats across listings.

#### `evidence/images.parquet` (5,554 rows, 24 columns)
Physical product images metadata:
- `image_id` (str): Unique image asset key.
- `product_id` (str): Associated product listing.
- `local_path` (str): Relative path to decodable image on disk.
- `file_size_bytes` (int): Byte size.
- `width` / `height` (int): Pixel dimensions.
- `sha256` (str): Cryptographic hash.
- `perceptual_hash` (str): 64-bit difference hash (dHash).
- `is_usable` (bool): True if file decodes without corruption (5,228 valid).
- `validation_status` (str): `VALIDATED`, `NEAR_DUPLICATE`, `DUPLICATE`, `DOWNLOAD_FAILED`.

#### `evidence/price_observations.parquet` (6,043 rows, 23 columns)
Observed listing pricing:
- `observed_price` (float): Raw listing price.
- `retail_mrp` (float): Maximum Retail Price / List Price.
- `original_currency` (str): Source currency (`INR` or `USD`).
- `normalized_price_inr` (float): Normalized to INR using fixed FX reference.
- `is_valid_price` (bool): True for priced listings (5,153 valid).

---

### 3. Relationships & Derived Evidence (`relationships/`, `derived_evidence/`)

- `relationships/entity_relationships.parquet` (67,175 rows): Direct evidence graph edges (`HAS_REVIEW`, `HAS_IMAGE`, `HAS_PRICE`, `IMAGE_DUPLICATE`).
- `relationships/cross_marketplace_matches.parquet` (30 rows): Evaluated cross-marketplace candidate pairs.
- `derived_evidence/aspect_sentiment_features.parquet` (6,043 rows): Aggregated ABSA sentiment polarities across the 6 aspects.
- `derived_evidence/price_anomaly_features.parquet` (6,043 rows): Robust category MAD modified z-scores and deep discount anomaly flags.
- `derived_evidence/review_behavioral_features.parquet` (56,697 rows): 29 syntax and manipulation features per review.
- `derived_evidence/graph_features.parquet` (6,043 rows): Degree centrality, evidence degree, and component metrics.
- `derived_evidence/image_integrity_features.parquet` (5,228 rows): Aspect ratio, blur, and duplicate cluster metadata.
