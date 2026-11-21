# Dataset v1.6 Data Dictionary
**Indian Marketplace Multimodal Trust Dataset v1.6**
*AI-Powered Indian Marketplace Trust Intelligence Platform*
*Release Date: November 9, 2026*

---

## 1. Overview

This document provides the definitive data dictionary for all primary entities, evidence observations, derived intelligence features, and relationship tables in **Indian Marketplace Multimodal Trust Dataset v1.6**.

---

## 2. Entity Master Tables (`entities/`)

### 2.1 `products.parquet` (3,643 rows × 30 columns)
Master canonical product table with cross-marketplace identity resolution.

| Column | Data Type | Nullable | Description & Invariant |
| :--- | :--- | :--- | :--- |
| `canonical_product_id` | `str` | No | Primary Key. Format: `{mkt}_{id}`. |
| `product_id` | `str` | No | Marketplace internal SKU/ASIN identifier. |
| `marketplace` | `str` | No | Marketplace: `amazon_in`, `flipkart`, `myntra`. |
| `source_product_id` | `str` | No | Raw source SKU/ASIN identifier. |
| `country` | `str` | No | ISO country code: `IN`. |
| `currency` | `str` | No | Currency code: `INR`. |
| `product_title` | `str` | No | Cleaned catalog product title. |
| `brand` | `str` | No | Cleaned and normalized brand entity name. |
| `category` | `str` | No | L1 parent taxonomy category (23 unique). |
| `subcategory` | `str` | No | L2 leaf taxonomy category (343 unique). |
| `product_description` | `str` | Yes | Raw text description from catalog crawl. |
| `product_url` | `str` | Yes | Canonical marketplace URL. |
| `extracted_attributes_json` | `str` | Yes | Parsed JSON key-value specifications. |
| `seller_id` | `object` | **Yes (100% Null)** | Strictly `NULL` to maintain Honest Null Governance. |
| `seller_name` | `object` | Yes | Strictly `NULL` for honest representation. |
| `has_image` | `bool` | No | `True` if product possesses physical hero image. |
| `has_review` | `bool` | No | `True` if product possesses customer reviews. |
| `has_price` | `bool` | No | `True` if product possesses price observations. |
| `modality_tier` | `str` | No | Modality coverage tier (`FULL_MULTIMODAL`, etc.). |
| `domain_partition` | `str` | No | Corporate domain partition. |
| `source_id` | `str` | No | Raw source provenance identifier. |
| `provenance` | `str` | No | Traceability statement. |
| `validation_status` | `str` | No | Entity validation status: `VALID`. |
| `reconciliation_version`| `str` | No | Canonical release version: `v1.6`. |
| `seller_id_semantics` | `str` | No | Always `HONEST_NULL_AGGREGATE_MERCHANT`. |
| `dataset_release` | `str` | No | Release tag: `v1.6`. |
| `taxonomy_source` | `str` | No | Classification source. |
| `taxonomy_confidence` | `float`| No | Classification confidence score [0, 1]. |
| `platform_id` | `str` | No | Foreign Key to `platforms.parquet`. |
| `brand_id` | `str` | No | Foreign Key to `brands.parquet`. |

### 2.2 `listings.parquet` (3,643 rows × 18 columns)
Marketplace listing entities with seller foreign keys.

| Column | Data Type | Nullable | Description & Invariant |
| :--- | :--- | :--- | :--- |
| `listing_id` | `str` | No | Primary Key. Format: `list_{mkt}_{id}`. |
| `canonical_product_id` | `str` | No | Foreign Key to `products.parquet`. |
| `marketplace` | `str` | No | Marketplace: `amazon_in`, `flipkart`, `myntra`. |
| `platform_id` | `str` | No | Foreign Key to `platforms.parquet`. |
| `brand_id` | `str` | No | Foreign Key to `brands.parquet`. |
| `marketplace_product_id`| `str` | No | Raw marketplace SKU/ASIN. |
| `listing_title` | `str` | No | Catalog title as displayed on marketplace. |
| `brand` | `str` | No | Brand display name. |
| `category` | `str` | No | L1 category. |
| `subcategory` | `str` | No | L2 subcategory. |
| `listing_url` | `str` | Yes | Marketplace listing URL. |
| `crawl_timestamp` | `str` | Yes | Ingestion timestamp. |
| `is_active_listing` | `bool` | No | Active catalog status. |
| `verification_status` | `str` | No | Verification flag. |
| `provenance` | `str` | No | Data origin statement. |
| `fulfillment_type` | `str` | No | Fulfillment classification. |
| `seller_id` | `str` | No | Foreign Key to `sellers.parquet` (`SELLER_AGG_*`). |
| `seller_resolution_status`| `str` | No | Always `UNRESOLVED_PLATFORM_AGGREGATE`. |
| `seller_resolution_notes`| `str` | No | Audit note explaining upstream crawl omission. |

### 2.3 `sellers.parquet` (4 rows × 19 columns)
Certified seller entities and platform aggregate merchant pools.

| Column | Data Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `seller_id` | `str` | No | Primary Key: `SELLER_AGG_AMAZON_IN`, etc. |
| `platform_id` | `str` | No | Foreign Key to `platforms.parquet`. |
| `marketplace` | `str` | No | Marketplace partition. |
| `seller_display_name` | `str` | No | Official entity display name. |
| `operator_entity` | `str` | No | Legal corporate entity name. |
| `seller_type` | `str` | No | `PLATFORM_AGGREGATE` or `UNRESOLVED_MERCHANT_POOL`.|
| `is_individual_merchant`| `bool` | No | `False` for platform aggregates; `True` for unassigned. |
| `merchant_resolution_status`| `str`| No | Resolution flag. |
| `registration_status` | `str` | No | `PLATFORM_OPERATOR_VERIFIED`. |
| `seller_rating` | `float`| Yes | NaN (omitted upstream). |
| `seller_review_count` | `int` | No | Total linked customer reviews. |
| `total_catalog_listings`| `int` | No | Total listings in aggregate pool (1,500 / 1,143 / 1,000). |
| `unique_brands_count` | `int` | No | Distinct brands offered. |
| `unique_categories_count`| `int`| No | Distinct categories offered. |
| `median_price_inr` | `float`| No | Median observed selling price. |
| `mean_price_inr` | `float`| No | Mean observed selling price. |
| `validation_status` | `str` | No | `CERTIFIED_PLATFORM_AGGREGATE_V1_6`. |
| `source_provenance` | `str` | No | Traceability statement. |
| `verification_notes` | `str` | No | Audit documentation. |

---

## 3. Evidence Tables (`evidence/`)

### 3.1 `price_observations.parquet` (3,667 rows × 14 columns)
Append-only price observation records.

| Column | Data Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `price_observation_id` | `str` | No | Primary Key. |
| `canonical_product_id` | `str` | No | Foreign Key to `products.parquet`. |
| `marketplace` | `str` | No | Marketplace partition. |
| `selling_price` | `float`| No | Ingested selling price (INR). |
| `mrp` | `float`| Yes | Declared Maximum Retail Price (INR). |
| `currency` | `str` | No | Always `INR`. |
| `normalized_price_inr` | `float`| No | Standardized selling price. |
| `discount_percentage` | `float`| Yes | Computed discount: $\frac{\text{MRP} - \text{Price}}{\text{MRP}} \times 100$. |
| `observation_timestamp`| `str` | No | Ingestion timestamp. |
| `is_active_price` | `bool` | No | Active observation flag. |
| `evidence_type` | `str` | No | `POINT_IN_TIME_SCRAPE`. |
| `data_quality_flags` | `str` | No | Validation status. |
| `provenance` | `str` | No | Data origin statement. |

---

## 4. Derived Pricing & Seller Intelligence Tables (`derived_evidence/`)

### 4.1 `pricing_features.parquet` (3,643 rows × 25 columns)
Product-level pricing intelligence, robust z-scores, and anomaly flags.

| Column | Data Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `canonical_product_id` | `str` | No | Foreign Key to `products.parquet`. |
| `marketplace` | `str` | No | Marketplace: `amazon_in`, `flipkart`, `myntra`. |
| `category` | `str` | No | L1 category. |
| `subcategory` | `str` | No | L2 subcategory. |
| `brand` | `str` | No | Brand entity name. |
| `observed_price_inr` | `float`| Yes | Latest observed selling price. |
| `mrp_inr` | `float`| Yes | Declared MRP. |
| `discount_percentage` | `float`| No | Observed discount percentage. |
| `mrp_consistency_status`| `str` | No | Audit classification (`CONSISTENT_CATALOG_PRICING`, etc.). |
| `subcategory_median_price_inr`| `float`| No| Subcategory robust median. |
| `subcategory_mad_inr` | `float`| No | Subcategory Median Absolute Deviation (MAD). |
| `corridor_lower_inr` | `float`| No | Expected lower price corridor boundary. |
| `corridor_upper_inr` | `float`| No | Expected upper price corridor boundary. |
| `corridor_source` | `str` | No | `HIERARCHICAL_BRAND_CORRIDOR` or `SUBCATEGORY_BENCHMARK_CORRIDOR`. |
| `robust_z_score` | `float`| No | Robust standardized score: $\frac{P - M}{1.4826 \times \text{MAD}}$. |
| `price_robust_zscore` | `float`| No | Alias for backward compatibility. |
| `is_price_outlier` | `bool` | No | `True` if price exceeds corridor or $|z| \ge 3.0$. |
| `is_extreme_price_outlier`| `bool` | No | `True` if $|z| \ge 3.0$. |
| `is_discount_anomaly` | `bool` | No | `True` if discount percentage $\ge 90.0\%$. |
| `selling_exceeds_mrp` | `bool` | No | `True` if selling price exceeds declared MRP. |
| `pricing_risk_signal` | `str` | No | Primary pricing risk classification. |
| `historical_observations_count`| `int`| No | Number of price observations. |
| `is_historical_pricing_available`| `bool`| No| `True` if $> 1$ observation. |
| `validation_status` | `str` | No | `CALIBRATED_PRICING_INTELLIGENCE_V1_6`. |

### 4.2 `pricing_category_benchmarks.parquet` (343 rows × 10 columns)
Subcategory robust non-parametric benchmarks.

| Column | Data Type | Description |
| :--- | :--- | :--- |
| `category` | `str` | L1 Category. |
| `subcategory` | `str` | L2 Subcategory. |
| `sample_count` | `int` | Number of products in subcategory. |
| `median_price_inr` | `float` | Median selling price. |
| `q1_price_inr` | `float` | 25th percentile price. |
| `q3_price_inr` | `float` | 75th percentile price. |
| `iqr_inr` | `float` | Interquartile Range ($Q_3 - Q_1$). |
| `mad_inr` | `float` | Median Absolute Deviation. |
| `corridor_lower_inr`| `float` | Lower fence: $\max(0, Q_1 - 1.5 \times \text{IQR})$. |
| `corridor_upper_inr`| `float` | Upper fence: $Q_3 + 1.5 \times \text{IQR}$. |

### 4.3 `pricing_brand_benchmarks.parquet` (1,608 rows × 11 columns)
Brand robust non-parametric benchmarks with sample size reliability indicator.

| Column | Data Type | Description |
| :--- | :--- | :--- |
| `brand` | `str` | Normalized brand entity name. |
| `sample_count` | `int` | Number of catalog listings for brand. |
| `is_brand_benchmark_reliable`| `bool` | `True` if sample count $\ge 5$; `False` otherwise. |
| `sample_size_flag` | `str` | `RELIABLE_SAMPLE_SIZE` or `INSUFFICIENT_SAMPLE_SIZE_WIDE_CORRIDOR`. |
| `median_price_inr` | `float` | Brand median selling price. |
| `q1_price_inr` | `float` | Brand 25th percentile price. |
| `q3_price_inr` | `float` | Brand 75th percentile price. |
| `iqr_inr` | `float` | Brand Interquartile Range. |
| `mad_inr` | `float` | Brand Median Absolute Deviation. |
| `corridor_lower_inr`| `float` | Lower corridor boundary. |
| `corridor_upper_inr`| `float` | Upper corridor boundary. |

### 4.4 `seller_features.parquet` (3 rows × 21 columns)
Operational features for certified platform aggregate merchant pools.

| Column | Data Type | Description |
| :--- | :--- | :--- |
| `seller_id` | `str` | Primary Key (`SELLER_AGG_*`). |
| `marketplace` | `str` | Marketplace partition. |
| `total_catalog_listings` | `int` | Total listings in pool. |
| `unique_brands_count` | `int` | Distinct brands offered. |
| `top_brand` | `str` | Brand with highest listing frequency. |
| `categories_represented` | `int` | Distinct L1 categories. |
| `unique_subcategories_count`| `int` | Distinct L2 subcategories. |
| `min_price_inr` | `float` | Minimum observed selling price. |
| `max_price_inr` | `float` | Maximum observed selling price. |
| `median_price_inr` | `float` | Median observed selling price. |
| `mean_price_inr` | `float` | Mean observed selling price. |
| `price_iqr_inr` | `float` | Price Interquartile Range. |
| `fulfillment_distribution_json`| `str` | JSON breakdown of fulfillment types. |
| `total_reviews_count` | `int` | Number of linked customer reviews. |
| `mean_review_sentiment` | `float` | Average sentiment polarity score. |
| `pricing_anomalies_count`| `int` | Total pricing corridor/discount outliers. |
| `is_single_merchant_verified`| `bool` | Always `False` (pool of merchants). |
| `governance_classification`| `str` | Always `PLATFORM_OPERATOR_PROXY`. |
| `data_quality_flag` | `str` | Always `AGGREGATE_PROXY_METADATA_LIMITATION`. |
| `validation_status` | `str` | `CERTIFIED_PLATFORM_AGGREGATE_V1_6`. |

---

## 5. Multimodal Evidence & Fusion Tables (`derived_evidence/`)

### 5.1 `multimodal_evidence_records.parquet` (6,064 rows × 13 columns)
Atomic multimodal evidence records.

| Column | Data Type | Description |
| :--- | :--- | :--- |
| `evidence_id` | `str` | Primary Key. Unique atomic evidence ID. |
| `entity_id` | `str` | Subject entity ID (`review_id`, `image_id`, `product_id`). |
| `canonical_product_id` | `str` | Associated canonical product ID. |
| `listing_id` | `str` | Associated listing ID (where applicable). |
| `evidence_modality` | `str` | Modality: `REVIEW_NLP`, `IMAGE_CV`, `PRICING`, `OCR`. |
| `evidence_type` | `str` | Specific signal type (`PRICE_CORRIDOR_OUTLIER`, etc.). |
| `evidence_signal_name` | `str` | Standardized signal name. |
| `signal_value` | `str` | Quantitative or categorical signal payload. |
| `signal_severity` | `str` | `INFO`, `LOW`, `MEDIUM`, `HIGH`. |
| `detection_method` | `str` | Algorithm/model used. |
| `confidence` | `float` | Confidence score [0, 1]. |
| `modality_available` | `bool` | `True` if modality was observed and evaluated. |
| `timestamp` | `str` | Generation timestamp. |

### 5.2 `product_multimodal_summary.parquet` (3,643 rows × 28 columns)
Product-level multimodal summary with zero-penalty missing modality handling.

| Column | Data Type | Description |
| :--- | :--- | :--- |
| `canonical_product_id` | `str` | Primary Key. Foreign Key to `products.parquet`. |
| `marketplace` | `str` | Marketplace partition. |
| `brand` | `str` | Brand name. |
| `category` | `str` | L1 Category. |
| `review_modality_status` | `str` | `AVAILABLE` (148) or `MODALITY_UNAVAILABLE` (3,495). |
| `image_modality_status` | `str` | `AVAILABLE` (2,432) or `MODALITY_UNAVAILABLE` (1,211). |
| `price_modality_status` | `str` | Always `AVAILABLE` (3,643). |
| `ocr_modality_status` | `str` | Always `BLOCKED_OFFLINE_DEPENDENCY_ABSENT`. |
| `image_text_modality_status`| `str` | Always `BLOCKED_OFFLINE_DEPENDENCY_ABSENT`. |
| `available_core_modalities_count`| `int`| Number of available modalities (1, 2, or 3). |
| `review_count` | `int` | Number of reviews. |
| `mean_sentiment_score` | `float`| Mean sentiment (null if sparse). |
| `discordant_review_count` | `int` | Discordant reviews count. |
| `duplicate_review_count` | `int` | Duplicate reviews count. |
| `temporal_burst_review_count`| `int`| Reviews in temporal burst. |
| `review_risk_signal` | `str` | Review risk signal. |
| `usable_image_count` | `int` | Usable physical images count. |
| `corrupt_image_count` | `int` | Corrupt images count. |
| `cross_product_reuse_image_count`| `int`| Reused images count. |
| `image_risk_signal` | `str` | Image risk signal. |
| `observed_price_inr` | `float`| Latest observed price. |
| `mrp_inr` | `float`| Declared MRP. |
| `discount_percentage` | `float`| Discount percentage. |
| `corridor_source` | `str` | Source corridor benchmark. |
| `price_robust_zscore` | `float`| Robust price z-score. |
| `corridor_lower_inr` | `float`| Lower corridor price fence. |
| `corridor_upper_inr` | `float`| Upper corridor price fence. |
| `is_price_outlier` | `bool` | Price outlier flag. |
| `is_extreme_price_outlier`| `bool` | Extreme price outlier flag ($|z| \ge 3.0$). |
| `is_discount_anomaly` | `bool` | Extreme discount flag ($\ge 90\%$). |
| `selling_exceeds_mrp` | `bool` | Selling exceeds MRP flag. |
| `price_risk_signal` | `str` | Pricing risk classification. |
| `seller_id` | `str` | Linked platform aggregate seller. |
| `seller_resolution_status` | `str` | `UNRESOLVED_PLATFORM_AGGREGATE`. |
| `active_risk_flag_count` | `int` | Number of active anomaly signals (0 to 3). |
| `provisional_risk_tier` | `str` | Explainable risk tier. |
| `assessment_framework` | `str` | `EXPLAINABLE_MULTIMODAL_EVIDENCE_V1_6`. |

---

## 6. Relationships (`relationships/`)

### 6.1 `entity_relationships.parquet` (41,372 rows × 11 columns)
Master heterogeneous property graph.

| Column | Data Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `relationship_id` | `str` | No | Primary Key. Strictly unique edge identifier. |
| `source_entity_id` | `str` | No | Source entity identifier. |
| `source_entity_type` | `str` | No | Type: `PRODUCT`, `LISTING`, `SELLER`. |
| `target_entity_id` | `str` | No | Target entity identifier. |
| `target_entity_type` | `str` | No | Type: `IMAGE`, `PRICE_OBSERVATION`, `REVIEW`, `LISTING`, `VARIANT`, `PLATFORM`, `BRAND`, `PRODUCT`. |
| `relationship_type` | `str` | No | Semantic edge type (12 unique types). |
| `relationship_confidence`| `float`| No | Confidence score [0, 1]. |
| `evidence_reference` | `str` | No | Traceable evidence identifier or file hash. |
| `detection_method` | `str` | No | Edge creation methodology. |
| `validation_status` | `str` | No | Verification flag. |
| `provenance` | `str` | No | Origin statement. |
