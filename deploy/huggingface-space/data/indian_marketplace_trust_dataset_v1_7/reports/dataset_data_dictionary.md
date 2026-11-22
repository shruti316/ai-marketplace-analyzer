# Marketplace Trust Evidence Dataset v1.0 — Data Dictionary & Schema Specification

**Project:** AI-Powered Marketplace Trust Intelligence Platform  
**Dataset Release:** `Marketplace Trust Evidence Dataset v1.0`  
**Execution Date:** 2026-11-03  
**Auditor:** Senior Data Quality Auditor & Multimodal ML Architect  

---

## 1. Overview & Schema Standards

This document specifies the exact schema, data types, physical constraints, and semantic definitions for all 14 tables in the `Marketplace Trust Evidence Dataset v1.0`. All tables are serialized using Apache Parquet (with Snappy compression) and CSV for manifests.

---

## 2. Table Specifications

### 2.1 Products Master Table (`entities/products.parquet`)
- **Row Count:** 6,043
- **Primary Key:** `canonical_product_id` (Unique, Non-Null)

| Column Name | Data Type | Nullable | Description & Domain Rules |
|---|---|---|---|
| `canonical_product_id` | `string` | No | Unique canonical product identifier across all marketplaces. Format: `{marketplace}_{source_id}`. |
| `product_id` | `string` | No | Functional alias matching `canonical_product_id` for backward compatibility. |
| `marketplace` | `string` | No | Platform domain: `amazon_in`, `flipkart`, `myntra`, `amazon`, `walmart`, `bestbuy`. |
| `source_product_id` | `string` | No | Original catalog identifier from source scrape (e.g., ASIN, Flipkart PID). |
| `country` | `string` | No | Country of primary listing: `IN` (India), `US` (United States). |
| `currency` | `string` | No | Listing currency: `INR`, `USD`. |
| `product_title` | `string` | No | Cleaned, un-truncated commercial product title. |
| `brand` | `string` | Yes | Commercial brand name or `"Unknown"`. |
| `category` | `string` | No | Primary high-level taxonomy node (e.g., `Beauty & Personal Care`, `Electronics`). |
| `subcategory` | `string` | Yes | Fine-grained taxonomy child node. |
| `product_description`| `string` | Yes | Raw textual description provided by seller or manufacturer. |
| `product_url` | `string` | Yes | Original canonical web listing URL. |
| `extracted_attributes_json` | `string` | Yes | JSON string containing extracted key-value pairs (specs, sizes, tiers). |
| `seller_id` | `string` | **Yes (100% Null)** | Individual merchant identifier. Explicitly set to `None` due to scrape absence. |
| `seller_name` | `string` | Yes | Platform aggregate merchant name (e.g., `"Amazon.in Seller"`). |
| `has_image` | `boolean` | No | `True` if at least one usable physical image exists on local disk. |
| `has_review` | `boolean` | No | `True` if at least one customer review is linked to this product. |
| `has_price` | `boolean` | No | `True` if a valid numeric price ($>0$) was recorded. |
| `modality_tier` | `string` | No | Evidence tier classification: `TIER_A_COMPLETE` or `TIER_B_PARTIAL`. |
| `domain_partition` | `string` | No | Geographic partition: `INDIAN_MARKETPLACE` or `SUPPLEMENTARY_INTERNATIONAL`. |
| `source_id` | `string` | No | Foreign key referencing `metadata/source_registry.parquet`. |
| `provenance` | `string` | No | Human-readable lineage description. |
| `validation_status` | `string` | No | Data quality audit flag: `VALIDATED`. |

---

### 2.2 Sellers Master Table (`entities/sellers.parquet`)
- **Row Count:** 6
- **Primary Key:** `seller_id` (Unique, Non-Null)

| Column Name | Data Type | Nullable | Description & Domain Rules |
|---|---|---|---|
| `seller_id` | `string` | No | Primary key: `SELLER_AGG_AMAZON_IN`, `SELLER_AGG_FLIPKART`, etc. |
| `marketplace` | `string` | No | Associated marketplace platform. |
| `seller_name` | `string` | No | Entity display name. |
| `seller_type` | `string` | No | Architecture type: `PLATFORM_AGGREGATE_MERCHANTS`, `FIRST_PARTY_RETAILER`. |
| `verification_status`| `string` | No | Integrity status: `UNVERIFIED_THIRD_PARTY_MERCHANT` or `VERIFIED_FIRST_PARTY`. |
| `provenance` | `string` | No | Data collection lineage. |
| `limitations` | `string` | No | Documented limitations regarding merchant identity absence. |

---

### 2.3 Visual Evidence Master Table (`evidence/images.parquet`)
- **Row Count:** 5,554 (5,228 usable + 326 failed downloads)
- **Primary Key:** `image_id` (Unique, Non-Null)
- **Foreign Key:** `canonical_product_id` $\rightarrow$ `entities/products.parquet`

| Column Name | Data Type | Nullable | Description & Domain Rules |
|---|---|---|---|
| `image_id` | `string` | No | Primary key for visual asset. |
| `canonical_product_id`| `string` | No | Foreign key linking image to product catalog. |
| `product_id` | `string` | No | Backward-compatible alias matching `canonical_product_id`. |
| `marketplace` | `string` | No | Source platform domain. |
| `image_url` | `string` | Yes | Original remote asset URL. |
| `local_path` | `string` | Yes | Relative filesystem path to JPEG asset on disk. |
| `image_type` | `string` | No | Role of image: `primary` (hero) or `variant`. |
| `format` | `string` | Yes | File container format: `JPEG`. |
| `download_status` | `string` | No | Crawl status: `DOWNLOADED` or `DOWNLOAD_FAILED`. |
| `file_size_bytes` | `float` | Yes | Physical file size in bytes. |
| `width` | `float` | Yes | Pixel width. |
| `height` | `float` | Yes | Pixel height. |
| `content_hash_sha256`| `string` | Yes | Cryptographic 64-hex SHA-256 hash of file bytes. |
| `perceptual_hash_dhash`| `string`| Yes | 16-hex difference hash (dHash) for visual similarity. |
| `is_usable` | `boolean` | No | `True` if file exists on disk, $>0$ bytes, and PIL readable. |
| `validation_status`| `string` | No | Audit status: `VALIDATED` or `FAILED_INGESTION`. |
| `domain_partition` | `string` | No | `INDIAN_MARKETPLACE` or `SUPPLEMENTARY_INTERNATIONAL`. |
| `source_id` | `string` | No | Foreign key referencing `metadata/source_registry.parquet`. |

---

### 2.4 Review Intelligence Master Table (`evidence/reviews.parquet`)
- **Row Count:** 51,680
- **Primary Key:** `canonical_review_id` (Unique, Non-Null)
- **Foreign Key:** `canonical_product_id` $\rightarrow$ `entities/products.parquet` (Nullable for unlinked reviews)

| Column Name | Data Type | Nullable | Description & Domain Rules |
|---|---|---|---|
| `canonical_review_id`| `string` | No | Unique review identifier. |
| `review_id` | `string` | No | Backward-compatible alias matching `canonical_review_id`. |
| `canonical_product_id`| `string`| Yes | Associated product ID (`None` for 240 unlinked reviews). |
| `source_review_id` | `string` | No | Original review ID from scrape source. |
| `marketplace` | `string` | No | Originating platform domain. |
| `reviewer_id` | `string` | No | Anonymized reviewer string or `"ANONYMOUS_REVIEWER"`. |
| `review_title` | `string` | Yes | Headline or title of review. |
| `review_text_original`| `string`| No | Raw unmodified review text. |
| `review_text_cleaned` | `string`| No | Trimmed and normalized review text. |
| `rating` | `float` | No | Numeric star rating in range $[1.0, 5.0]$. |
| `review_date` | `string` | Yes | ISO date string (`YYYY-MM-DD`). |
| `language` | `string` | No | BCP-47 language tag: `en`, `hi-Latn`. |
| `verified_purchase` | `boolean` | No | Authenticated order indicator (`False` for PromptCloud/Kaggle). |
| `helpful_votes` | `integer` | No | Helpful endorsement count. |
| `linkage_type` | `string` | No | `EXACT_PRODUCT_ID`, `EXACT_PRODUCT_LINE_IDENTITY`, `UNLINKED`. |
| `linkage_confidence`| `float` | No | Confidence score: $1.0$ (exact ID), $0.95$ (product line), $0.0$ (unlinked). |
| `linkage_evidence` | `string` | No | Methodological basis of association. |
| `domain_partition` | `string` | No | `INDIAN_MARKETPLACE` or `SUPPLEMENTARY_INTERNATIONAL`. |
| `source_id` | `string` | No | Foreign key referencing `metadata/source_registry.parquet`. |

---

### 2.5 Price Observations Master Table (`evidence/price_observations.parquet`)
- **Row Count:** 6,043
- **Primary Key:** `price_observation_id` (Unique, Non-Null)
- **Foreign Key:** `canonical_product_id` $\rightarrow$ `entities/products.parquet`

| Column Name | Data Type | Nullable | Description & Domain Rules |
|---|---|---|---|
| `price_observation_id`| `string`| No | Unique observation identifier: `PRC_OBS_{canonical_product_id}`. |
| `canonical_product_id`| `string`| No | Target product catalog ID. |
| `marketplace` | `string` | No | Associated platform domain. |
| `original_currency` | `string` | No | Ingested currency: `INR` or `USD`. |
| `original_price` | `float` | Yes | Observed selling price in original currency. |
| `normalized_price_inr`| `float` | Yes | Standardized INR equivalent (FX rate: 83.25 for USD). |
| `retail_mrp` | `float` | Yes | Maximum Retail Price or manufacturer list price. |
| `discount_percentage`| `float` | No | Calculated discount: $\max(0, \frac{\text{mrp}-\text{price}}{\text{mrp}} \times 100)$. |
| `stock_status` | `string` | No | Stock availability: `IN_STOCK`, `OUT_OF_STOCK`, `UNKNOWN`. |
| `observation_timestamp`| `string`| No | Point-in-time timestamp of observation capture. |
| `is_valid_price` | `boolean` | No | `True` if `original_price` is non-null and $>0$. |
| `domain_partition` | `string` | No | `INDIAN_MARKETPLACE` or `SUPPLEMENTARY_INTERNATIONAL`. |
| `source_id` | `string` | No | Foreign key referencing `metadata/source_registry.parquet`. |

---

### 2.6 Entity Relationships Table (`evidence_relationships/entity_relationships.parquet`)
- **Row Count:** 61,812
- **Primary Key:** `relationship_id` (Unique, Non-Null)

| Column Name | Data Type | Nullable | Description & Domain Rules |
|---|---|---|---|
| `relationship_id` | `string` | No | Primary key: `REL_IMG_{id}`, `REL_REV_{id}`, `REL_PRC_{id}`. |
| `source_entity_id` | `string` | No | Origin node ID (typically `canonical_product_id`). |
| `source_entity_type` | `string` | No | Node type: `PRODUCT`, `IMAGE`, `REVIEW`. |
| `target_entity_id` | `string` | No | Destination node ID. |
| `target_entity_type` | `string` | No | Node type: `IMAGE`, `REVIEW`, `PRICE_OBSERVATION`. |
| `relationship_type` | `string` | No | Edge type: `HAS_IMAGE`, `HAS_REVIEW`, `HAS_PRICE`, `IMAGE_EXACT_DUPLICATE_OF`. |
| `relationship_confidence`| `float`| No | Confidence score $[0.0, 1.0]$. |
| `evidence_reference` | `string` | No | Technical trace supporting the edge. |
| `detection_method` | `string` | No | Extraction method (e.g., `DIRECT_CATALOG_ASSOCIATION`). |
| `validation_status` | `string` | No | Validation flag: `VALIDATED`. |

---

### 2.7 Cross-Modal Evidence Table (`evidence_relationships/cross_modal_evidence.parquet`)
- **Row Count:** 1,889
- **Primary Key:** `evidence_id` (Unique, Non-Null)

| Column Name | Data Type | Nullable | Description & Domain Rules |
|---|---|---|---|
| `evidence_id` | `string` | No | Primary key: `XMOD_ANOM_{06d}`. |
| `primary_entity_id` | `string` | No | Associated `canonical_product_id` or `"MULTIPLE_PRODUCTS"`. |
| `primary_entity_type` | `string`| No | Entity type: `PRODUCT`. |
| `investigation_type` | `string` | No | Anomaly category: `REVIEW_RATING_MISMATCH`, `REVIEW_REVIEW_DUPLICATION`, `IMAGE_IMAGE_REUSE`, `PRODUCT_PRICE_ANOMALY`, `TITLE_IMAGE_OCR_CONSISTENCY`. |
| `modality_pair` | `string` | No | Intersecting modalities (e.g., `TEXT_REVIEW_VS_NUMERIC_RATING`). |
| `source_evidence_ids` | `string` | No | JSON array of involved evidence record IDs. |
| `comparison_method` | `string` | No | Algorithmic test (e.g., `LEXICAL_SENTIMENT_CONTRADICTION`). |
| `observed_result` | `string` | No | Quantitative or empirical description of finding. |
| `contradiction_score` | `float` | No | Discrepancy metric bounded in $[0.0, 1.0]$. |
| `signal_severity` | `string` | No | Signal rank: `INVESTIGATION_SIGNAL`, `SUSPICIOUS_ANOMALY`, `CONSISTENT`. |
| `validation_status` | `string` | No | Audit flag: `VALIDATED_SIGNAL`. |
| `limitations` | `string` | No | Caveat warning that signal $\ne$ fraud. |

---

## 3. Data Dictionary Summary

This specification represents the immutable contract for all models, feature extractors, and risk scorers developed on `Marketplace Trust Evidence Dataset v1.0`.
