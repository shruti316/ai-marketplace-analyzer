# Marketplace Trust Intelligence Dataset (v1.2) — Data Dictionary

## 1. Overview & Architecture
The v1.2 release provides an Indian-first multimodal dataset designed for research and production engineering of e-commerce trust, deception detection, and fraud intelligence systems. It strictly segregates real-world evidence from synthetic benchmarks.

---

## 2. Table Specifications

### 2.1 `entities/products.parquet` (6,043 rows)
Master normalized product entity catalog.
- `canonical_product_id` (string, PK): Stable identifier (`amazon_in_{asin}`, `flipkart_{id}`, `myntra_{id}`, `amazon_{asin}`, `bestbuy_{sku}`, `walmart_{id}`).
- `marketplace` (string): Marketplace slug (`amazon_in`, `flipkart`, `myntra`, `amazon`, `bestbuy`, `walmart`).
- `source_product_id` (string): Original marketplace listing identifier.
- `country` (string): Two-letter ISO country code (`IN` [60.28%], `US` [39.72%]).
- `currency` (string): Three-letter ISO currency code (`INR` or `USD`).
- `product_title` (string): Cleaned product listing title.
- `brand` (string): Normalized brand name.
- `category` (string): Primary high-level category.
- `subcategory` (string): Granular subcategory.
- `product_description` (string): Product description text or provenance-noted description.
- `product_url` (string): Original listing or search canonical URL.
- `extracted_attributes_json` (string): JSON payload of scraped attributes and specifications.
- `seller_id` (string, nullable): Unique merchant identifier (strictly null for scraped listings).
- `seller_name` (string): Documented merchant entity label.
- `has_image` (boolean): Flag indicating presence of verified physical image file.
- `has_review` (boolean): Flag indicating presence of at least one linked customer review.
- `has_price` (boolean): Flag indicating presence of positive, valid price observation.
- `modality_tier` (string): `TIER_A_COMPLETE` (all 4 modalities present) or `TIER_B_PARTIAL`.
- `domain_partition` (string): `INDIAN_MARKETPLACE` (3,643) or `SUPPLEMENTARY_INTERNATIONAL` (2,400).
- `source_id` (string): FK to `manifests/source_registry.parquet`.
- `validation_status` (string): `VALIDATED`.

### 2.2 `evidence/reviews.parquet` (56,697 rows)
Customer reviews and ratings (100% retained, 0 filtered out).
- `canonical_review_id` (string, PK): Stable unique review ID.
- `canonical_product_id` (string, FK, nullable): FK to `products.parquet` (null for 240 unlinked reviews).
- `marketplace` (string): Marketplace source.
- `reviewer_id` (string): Anonymized reviewer identifier.
- `review_title` (string): Review headline text.
- `review_text_cleaned` (string): Normalized review body text.
- `rating` (float): Numeric rating (1.0 to 5.0).
- `review_date` (string): ISO format observation date (`YYYY-MM-DD`).
- `language` (string): ISO language tag (`en`).
- `verified_purchase_status` (string): `VERIFIED_TRUE`, `VERIFIED_FALSE`, or `NOT_SUPPLIED`.
- `helpful_votes` (integer): Community helpfulness count.
- `linkage_type` (string): `EXACT_ASIN_MATCH`, `EXACT_PRODUCT_LINE_IDENTITY`, `EXACT_PRODUCT_ID`, or `UNLINKED`.
- `linkage_confidence` (float): Degree of matching certainty (0.0 to 1.0).
- `domain_partition` (string): `INDIAN_MARKETPLACE` or `SUPPLEMENTARY_INTERNATIONAL`.

### 2.3 `evidence/images.parquet` (5,554 rows)
Image asset inventory with physical integrity verification.
- `image_id` (string, PK): Stable image identifier.
- `canonical_product_id` (string, FK): FK to `products.parquet`.
- `marketplace` (string): Marketplace source.
- `image_url` (string): Upstream source URL.
- `local_path` (string, nullable): Verified local disk path.
- `image_type` (string): `HERO_PRIMARY`.
- `download_status` (string): `DOWNLOADED` (5,228) or `DOWNLOAD_FAILED` (326).
- `width` / `height` (integer): Image dimensions.
- `content_hash_sha256` (string): Cryptographic image hash.
- `perceptual_hash_dhash` (string): 64-bit difference hash for visual similarity clustering.
- `is_usable` (boolean): Flag indicating image is downloaded, non-corrupt, and verified.

### 2.4 `evidence/price_observations.parquet` (6,043 rows)
Point-in-time pricing observations.
- `price_observation_id` (string, PK): Unique price observation ID.
- `canonical_product_id` (string, FK): FK to `products.parquet`.
- `original_currency` (string): `INR` or `USD`.
- `original_price` (float, nullable): Observed selling price.
- `normalized_price_inr` (float, nullable): Normalized price in INR (converted at 83.25 for USD).
- `retail_mrp` (float, nullable): Maximum Retail Price / List Price where available.
- `discount_percentage` (float): Discount rate.
- `stock_status` (string): `IN_STOCK`, `UNKNOWN`, or `OUT_OF_STOCK` (only when explicitly evidenced).
- `observation_type` (string): `STATIC_CRAWL_SNAPSHOT`.

### 2.5 `relationships/entity_relationships.parquet`
Bipartite and similarity graph edges:
- `HAS_IMAGE`: Product -> Image
- `HAS_REVIEW`: Product -> Review
- `HAS_PRICE`: Product -> Price Observation
- `IMAGE_EXACT_DUPLICATE_OF`: Image <-> Image (identical SHA-256 collision across distinct listings)
- `IMAGE_PERCEPTUAL_DUPLICATE_OF`: Image <-> Image (dHash distance = 0 across distinct listings)

### 2.6 `derived_evidence/`
Derived feature stores:
- `review_quality_features.parquet`: NLP text length, word count, uppercase ratio, rating divergence.
- `image_integrity_features.parquet`: Aspect ratio, file size, perceptual hash clusters, download status.
- `price_anomaly_features.parquet`: Category-aware IQR fences, outlier indicators, and price Z-scores.
- `cross_modal_evidence.parquet`: Cross-modal anomaly investigation records across 5 anomaly types.

### 2.7 `collections/`
Curated analytical cohorts:
- `complete_multimodal_core.parquet`: Tier A core (305 products with verified metadata + image + review + price).
- `indian_complete_multimodal.parquet`: Tier A Indian core (5 Amazon India products).
- `indian_partial_modalities.parquet`: Tier B Indian partial modalities (3,638 products).
- `international_supplementary.parquet`: 2,400 Supplementary products (300 complete + 2,100 partial).
- `isolated_benchmarks/`: Isolated benchmark test beds for NLP deception and stress testing.

### 2.8 `evaluation/`
Leakage-safe splits ensuring zero product or duplicate image cluster overlap:
- `train_manifest.parquet` (~70%)
- `validation_manifest.parquet` (~15%)
- `test_manifest.parquet` (~15%)
- `benchmark_manifests/`: Manifests for external benchmarks and synthetic stress test cases.
