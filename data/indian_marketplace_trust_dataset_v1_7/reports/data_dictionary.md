# Master Data Dictionary — Marketplace Trust Evidence Dataset (v1.1)

> [!NOTE]
> Defines schemas, datatypes, constraints, foreign keys, and valid enum values for all 19 relational tables and manifests in the v1.1 release.

---

## 1. Entities

### 1.1 `entities/products.parquet` (6,043 rows)
| Column Name | Data Type | Nullable | Description / Valid Values |
| :--- | :--- | :--- | :--- |
| `canonical_product_id` | STRING (PK) | No | Deterministic global ID: `<marketplace>_<source_product_id>`. |
| `product_id` | STRING | No | Alias for canonical product ID. |
| `marketplace` | STRING | No | `{'amazon_in', 'flipkart', 'myntra', 'amazon', 'walmart', 'bestbuy'}`. |
| `source_product_id` | STRING | No | Marketplace-native identifier (ASIN, SKU, Style ID). |
| `country` | STRING | No | `{'IN', 'US'}`. |
| `currency` | STRING | No | `{'INR', 'USD'}`. |
| `product_title` | STRING | No | Full product title from marketplace listing. |
| `brand` | STRING | Yes | Brand name, normalized where possible; `Generic` / `Unknown` if absent. |
| `category` | STRING | No | Top-level harmonized category. |
| `subcategory` | STRING | Yes | Native listing subcategory / taxonomy path. |
| `product_description` | STRING | Yes | Marketing description, features, or bullet points. |
| `product_url` | STRING | Yes | Canonical web URL of listing. |
| `extracted_attributes_json` | JSON STRING | Yes | Structured attributes (color, size, material) in JSON format. |
| `seller_id` | STRING (FK) | Yes | **Honestly null (100% null)**. Upstream crawls omitted merchant IDs. |
| `seller_name` | STRING | Yes | Platform aggregate merchant name (e.g. `Amazon.in Retail Merchant`). |
| `has_image` | BOOLEAN | No | True if usable visual hero image exists in `evidence/images.parquet`. |
| `has_review` | BOOLEAN | No | True if linked customer reviews exist in `evidence/reviews.parquet`. |
| `has_price` | BOOLEAN | No | True if positive price exists in `evidence/price_observations.parquet`. |
| `modality_tier` | STRING | No | `{'TIER_A_COMPLETE', 'TIER_B_PARTIAL'}`. |
| `sub_tier` | STRING | No | Fine-grained cohort assignment (e.g. `indian_multimodal_recovered`). |
| `source_id` | STRING (FK) | No | Reference to `metadata/source_registry.parquet`. |
| `domain_partition` | STRING | No | `{'INDIAN_MARKETPLACE', 'SUPPLEMENTARY_INTERNATIONAL'}`. |
| `validation_status` | STRING | No | `{'VALIDATED'}`. Integrity audit result. |

### 1.2 `entities/sellers.parquet` (6 rows)
| Column Name | Data Type | Nullable | Description / Valid Values |
| :--- | :--- | :--- | :--- |
| `seller_id` | STRING (PK) | No | Aggregate seller entity ID (e.g. `SELLER_AGG_AMAZON_IN`). |
| `marketplace` | STRING | No | Operating marketplace platform. |
| `seller_name` | STRING | No | Name of platform aggregate merchant. |
| `seller_type` | STRING | No | `{'PLATFORM_AGGREGATE_MERCHANT'}`. |
| `verification_status` | STRING | No | `{'UNVERIFIED_THIRD_PARTY_MERCHANT'}`. Honest status. |
| `provenance` | STRING | No | Audit documentation explaining aggregate status. |
| `limitations` | STRING | No | Detailed caveat documenting lack of individual merchant IDs. |

---

## 2. Evidence Tables

### 2.1 `evidence/images.parquet` (5,554 rows)
| Column Name | Data Type | Nullable | Description / Valid Values |
| :--- | :--- | :--- | :--- |
| `image_id` | STRING (PK) | No | Global image ID: `<product_id>_img_<idx>`. |
| `canonical_product_id` | STRING (FK) | No | Foreign key referencing `entities/products.parquet`. |
| `image_url` | STRING | Yes | Remote CDN URL captured during scrape. |
| `local_path` | STRING | Yes | Filesystem path to cached image asset. |
| `is_usable` | BOOLEAN | No | True for 5,228 verified physical files; False for 326 failed audits. |
| `image_type` | STRING | No | `{'HERO_LISTING_IMAGE', 'GALLERY_SECONDARY_IMAGE', 'FAILED_DOWNLOAD_AUDIT'}`. |
| `content_hash_sha256` | STRING | Yes | 64-character hexadecimal SHA-256 cryptographic hash. |
| `perceptual_hash_dhash` | STRING | Yes | 16-character hexadecimal difference perceptual hash (8x8). |
| `width` | INTEGER | Yes | Image pixel width (populated for usable images). |
| `height` | INTEGER | Yes | Image pixel height (populated for usable images). |
| `aspect_ratio` | FLOAT | Yes | Aspect ratio ($w / h$). |
| `file_format` | STRING | Yes | `{'JPEG', 'PNG'}`. |
| `is_hero_image` | BOOLEAN | No | True for primary catalog image. |
| `validation_status` | STRING | No | `{'VALIDATED', 'FAILED_DOWNLOAD'}`. |

### 2.2 `evidence/reviews.parquet` (51,839 rows)
| Column Name | Data Type | Nullable | Description / Valid Values |
| :--- | :--- | :--- | :--- |
| `canonical_review_id` | STRING (PK) | No | Unique review ID. |
| `canonical_product_id` | STRING (FK) | Yes | Product FK (null for 240 unlinked Indian reviews). |
| `marketplace` | STRING | No | `{'bestbuy', 'flipkart', 'amazon', 'amazon_in', 'uncertain'}`. |
| `review_title` | STRING | Yes | Headline or summary of review. |
| `review_text` | STRING | No | Full customer review text. |
| `rating` | FLOAT | No | Star rating bounded in $[1.0, 5.0]$. |
| `verified_purchase_status` | STRING | No | `{'VERIFIED_TRUE', 'VERIFIED_FALSE', 'NOT_SUPPLIED'}`. |
| `review_date` | STRING | Yes | ISO date string or raw timestamp if available. |
| `helpful_votes` | INTEGER | Yes | Number of helpful votes received. |
| `total_votes` | INTEGER | Yes | Total votes received. |
| `language` | STRING | No | Language tag (`en` or `hi-Latn`). |
| `linkage_type` | STRING | No | `{'DIRECT_CRAWL', 'RECOVERED_MATCH', 'UNLINKED'}`. |
| `linkage_confidence` | FLOAT | No | Confidence score $[0.0, 1.0]$ of product relationship. |
| `source_id` | STRING (FK) | No | Reference to `metadata/source_registry.parquet`. |
| `validation_status` | STRING | No | `{'VALIDATED'}`. |

### 2.3 `evidence/price_observations.parquet` (6,043 rows)
| Column Name | Data Type | Nullable | Description / Valid Values |
| :--- | :--- | :--- | :--- |
| `price_observation_id` | STRING (PK) | No | Unique observation identifier. |
| `canonical_product_id` | STRING (FK) | No | Foreign key referencing `entities/products.parquet`. |
| `original_currency` | STRING | No | Native currency (`INR` or `USD`). |
| `original_price` | FLOAT | Yes | Price extracted from crawl (null if unpriced). |
| `normalized_price_inr` | FLOAT | Yes | Harmonized price in INR (converted at 83.5 INR/USD for US). |
| `retail_mrp` | FLOAT | Yes | Maximum Retail Price / List Price if available. |
| `discount_percentage` | FLOAT | Yes | Calculated percentage discount. |
| `stock_status` | STRING | No | `{'IN_STOCK', 'UNKNOWN'}` (honest semantics). |
| `observation_timestamp` | STRING | No | ISO timestamp of crawl. |
| `observation_type` | STRING | No | `{'STATIC_CRAWL_SNAPSHOT'}`. |
| `is_valid_price` | BOOLEAN | No | True if price > 0; False if unpriced. |

---

## 3. Relationships and Cross-Modal Evidence

### 3.1 `evidence_relationships/entity_relationships.parquet` (62,271 rows)
- `relationship_id` (PK): Unique edge ID (`rel_<idx>`).
- `source_entity_id`: Entity ID (e.g. `canonical_product_id` or `image_id`).
- `source_entity_type`: `{'PRODUCT', 'IMAGE'}`.
- `target_entity_id`: Target entity ID (`image_id`, `review_id`, `price_id`).
- `target_entity_type`: `{'IMAGE', 'REVIEW', 'PRICE_OBSERVATION'}`.
- `relationship_type`: `{'HAS_IMAGE', 'HAS_REVIEW', 'HAS_PRICE', 'IMAGE_EXACT_DUPLICATE_OF', 'IMAGE_PERCEPTUAL_DUPLICATE_OF'}`.
- `relationship_confidence`: Confidence score $[0.0, 1.0]$.
- `detection_method`: `{'DIRECT_CRAWL_GRAPH', 'EXACT_SHA256_MATCH', 'DHASH_HAMMING_DISTANCE_ZERO'}`.

### 3.2 `evidence_relationships/cross_modal_evidence.parquet` (1,889 rows)
- `evidence_id` (PK): Cross-modal record ID (`xmod_<idx>`).
- `product_id` (FK): Related product ID.
- `modality_1` / `modality_2`: Modalities investigated (`TEXT`, `RATING`, `IMAGE`, `PRICE`).
- `investigation_type`: `{'REVIEW_RATING_MISMATCH', 'REVIEW_REVIEW_DUPLICATION', 'IMAGE_IMAGE_REUSE', 'PRODUCT_PRICE_ANOMALY', 'TITLE_IMAGE_OCR_CONSISTENCY'}`.
- `contradiction_score`: Float $[0.0, 1.0]$. Higher means stronger contradiction.
- `confidence`: Assessment confidence $[0.0, 1.0]$.
