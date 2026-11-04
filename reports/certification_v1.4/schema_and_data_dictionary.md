# Dataset v1.4 Schema and Data Dictionary

## Core Entity Tables

### 1. `entities/products.parquet`
- `canonical_product_id` (string, PK): Unique platform-wide identifier.
- `marketplace` (string): Marketplace name.
- `domain_partition` (string): `INDIAN_MARKETPLACE` or `SUPPLEMENTARY_INTERNATIONAL`.
- `title` (string): Normalized product title.
- `brand` (string): Brand name.
- `category` (string): Primary category.
- `currency` (string): ISO currency (`INR` or `USD`).
- `seller_id` (string, nullable): Foreign key to sellers table.
- `modality_tier` (string): `TIER_A_COMPLETE` or `TIER_B_PARTIAL`.

### 2. `evidence/reviews.parquet`
- `canonical_review_id` (string, PK): Unique review identifier.
- `canonical_product_id` (string, FK, nullable): Associated product.
- `marketplace` (string): Origin marketplace.
- `rating` (float): Numeric star rating (1.0 to 5.0).
- `review_text` (string): Complete original review text.
- `reviewer_id` (string, nullable): Unique reviewer handle.
- `linkage_type` (string): `VERIFIED_PRODUCT_LINK` or `UNLINKED`.

### 3. `evidence/images.parquet`
- `canonical_image_id` (string, PK): Unique image identifier.
- `canonical_product_id` (string, FK): Associated product.
- `image_path` (string): Relative file path to physical JPEG/PNG.
- `is_usable` (bool): True if physically readable by PIL.
- `image_sha256` (string): Cryptographic hash.
- `dhash` (string): 64-bit difference perceptual hash.

### 4. `evidence/price_observations.parquet`
- `canonical_price_id` (string, PK): Unique price observation identifier.
- `canonical_product_id` (string, FK): Associated product.
- `observed_price` (float, nullable): Numeric price in native currency.
- `currency` (string): `INR` or `USD`.
- `normalized_price_inr` (float, nullable): Normalized price in INR using RBI benchmark fixing.
- `stock_status` (string): `IN_STOCK`, `OUT_OF_STOCK`, or `UNKNOWN`.
- `is_valid_price` (bool): True if observed price is non-null and positive.

### 5. `evidence/fx_conversion_rates.parquet`
- `conversion_pair` (string): e.g. `USD_TO_INR`.
- `reference_rate` (float): Official exchange rate fixing.
- `observation_date` (string): YYYY-MM-DD.
- `source_authority` (string): e.g. `Reserve Bank of India (RBI)`.
- `is_benchmark_fixing` (bool): True for dataset crawl baseline fixing.
