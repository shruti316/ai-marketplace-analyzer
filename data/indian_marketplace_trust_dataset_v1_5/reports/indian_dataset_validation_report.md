# Phase 2 Validation Report: Indian Marketplace Dataset

**Project:** AI-Powered Marketplace Trust Intelligence Platform  
**Phase:** Phase 2 — Indian Dataset Completion & AI Platform Data Foundation  
**Date:** November 2, 2026  
**Execution Environment:** Python 3.11.9 (`.venv`) on Windows  
**Validation Suite:** [src/data/curation/validate_indian_dataset.py](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/data/curation/validate_indian_dataset.py)  
**Formal Pytest Suite:** [tests/test_indian_dataset.py](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/tests/test_indian_dataset.py) & [tests/](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/tests)  
**Overall Status:** **PASSED (100% compliance)**  

---

## 1. Executive Summary

This validation report documents the empirical verification of the Phase 2 Indian Marketplace Dataset and AI Platform Data Foundation, including the two targeted corrections for stock status semantics and review provenance separation.

### Summary of Results
- **Automated Validation Suite (`validate_indian_dataset.py`):** **49 PASS, 0 FAIL, 1 WARN** (50 total checks).
  - The single warning is informative: `products_mrp_coverage: MRP available for 3473 products` (99.23% coverage against 3,500 products).
- **Formal Regression Test Suite (`pytest tests/`):** **93 PASS, 0 FAIL** in 67.15s.
  - Dedicated Indian dataset tests ([tests/test_indian_dataset.py](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/tests/test_indian_dataset.py)): **28 PASS, 0 FAIL** (100% pass rate).
  - Existing project regression tests: **65 PASS, 0 FAIL** (100% backward compatibility preserved).
- **Protected Baseline Files:** **10 / 10 intact** (100% cryptographically bit-perfect matching reference SHA-256 signatures).

---

## 2. Automated Validation Suite Results (`validate_indian_dataset.py`)

### Section 1: Deliverable Existence Checks (13 / 13 PASS)

| Check Name | Target Artifact | Size (bytes) | Status | Details |
| :--- | :--- | :---: | :---: | :--- |
| `exists_amazon_india_products_raw.csv` | `data/indian_marketplace/raw/products/amazon_india_products_raw.csv` | 1,409,275 | **PASS** | Source CSV present |
| `exists_flipkart_products_raw.csv` | `data/indian_marketplace/raw/products/flipkart_products_raw.csv` | 1,924,747 | **PASS** | Source CSV present |
| `exists_myntra_products_raw.csv` | `data/indian_marketplace/raw/products/myntra_products_raw.csv` | 1,592,100 | **PASS** | Source CSV present |
| `exists_flipkart_reviews_raw.csv` | `data/indian_marketplace/raw/reviews/flipkart_reviews_raw.csv` | 643,369 | **PASS** | Source CSV present |
| `exists_README.md` | `data/indian_marketplace/raw/images/README.md` | 497 | **PASS** | Image documentation present |
| `exists_amazon_india_images_manifest.parquet` | `data/indian_marketplace/raw/images/amazon_in/amazon_india_images_manifest.parquet` | 208,780 | **PASS** | Amazon India image manifest present |
| `exists_indian_products.parquet` | `data/indian_marketplace/processed/indian_products.parquet` | 1,186,289 | **PASS** | Enriched product catalog present |
| `exists_indian_reviews.parquet` | `data/indian_marketplace/processed/indian_reviews.parquet` | 179,818 | **PASS** | Partitioned review corpus present |
| `exists_indian_reviews_linked.parquet` | `data/indian_marketplace/processed/indian_reviews_linked.parquet` | 6,601 | **PASS** | Schema-enforced linked table present |
| `exists_indian_images.parquet` | `data/indian_marketplace/processed/indian_images.parquet` | 329,582 | **PASS** | Unified image evidence table present |
| `exists_indian_complete_multimodal.parquet` | `data/indian_marketplace/processed/indian_complete_multimodal.parquet` | 14,034 | **PASS** | Schema-enforced multimodal table present |
| `exists_indian_dataset_metadata.json` | `data/indian_marketplace/processed/indian_dataset_metadata.json` | 6,259 | **PASS** | Platform contract metadata present |
| `exists_indian_review_matching_audit.md` | `reports/indian_review_matching_audit.md` | 9,392 | **PASS** | Candidate rejection audit report present |

---

### Section 2: Indian Products Catalog Validation (12 PASS, 0 FAIL, 1 WARN)

| Check Name | Target Criterion | Observed Value | Status |
| :--- | :--- | :--- | :---: |
| `products_count` | Exactly 3,500 products | 3,500 products | **PASS** |
| `products_columns` | All 30 required schema columns | 30 / 30 present | **PASS** |
| `products_pk_validity` | `canonical_product_id` 100% unique & non-null | 3,500 unique, 0 nulls | **PASS** |
| `products_marketplaces` | Strictly Indian marketplaces | `['amazon_in', 'flipkart', 'myntra']` | **PASS** |
| `products_mkt_allocation` | Target allocation per marketplace | Amazon IN: 1,500, Flipkart: 1,000, Myntra: 1,000 | **PASS** |
| `products_country_currency` | 100% country == 'IN', 100% currency == 'INR' | 3,500 / 3,500 (100.0%) | **PASS** |
| `products_price_coverage` | Valid INR prices | 3,480 / 3,500 (99.43%) | **PASS** |
| `products_mrp_coverage` | MRP available for catalog products | 3,473 / 3,500 (99.23%) | **WARN** (Informative) |
| `products_stock_status` | Validated stock status semantics | 3,500 / 3,500 (100.0%). Flipkart semantics: 0 `OUT_OF_STOCK`, 5 `UNKNOWN` | **PASS** |
| `products_image_coverage_recovered` | Products with usable images expanded | 2,432 / 3,500 (69.49%) | **PASS** |
| `products_review_coverage` | Products with linked reviews | 0 / 3,500 (0.0% false-positive links) | **PASS** |
| `products_complete_multimodal` | Complete multimodal products | 0 / 3,500 (0.0% unverified claims) | **PASS** |

---

### Section 3: Indian Images Evidence Validation (6 / 6 PASS)

| Check Name | Target Criterion | Observed Value | Status |
| :--- | :--- | :--- | :---: |
| `images_count` | Total image records | 5,034 records (1,500 Amazon IN + 3,534 Flipkart) | **PASS** |
| `images_columns` | All 13 schema columns | 13 / 13 present | **PASS** |
| `images_pk_validity` | `image_id` 100% unique & non-null | 5,034 unique, 0 nulls | **PASS** |
| `images_fk_referential_integrity` | Foreign key referential integrity | 100% map to catalog (0 orphan images) | **PASS** |
| `images_usable_count` | Total usable images | 4,708 records (1,500 Amazon IN + 3,208 Flipkart) | **PASS** |
| `images_physical_availability` | Physical file existence on disk | 4,708 / 4,708 files exist on disk | **PASS** |

---

### Section 4: Indian Reviews Evidence Validation (7 / 7 PASS)

| Check Name | Target Criterion | Observed Value | Status |
| :--- | :--- | :--- | :---: |
| `reviews_source_count_match` | Row count matches source CSV | 3,500 reviews | **PASS** |
| `reviews_pk_validity` | `review_id` 100% unique & non-null | 3,500 unique, 0 nulls | **PASS** |
| `reviews_unlinked_status` | Status tagged as unlinked corpus | 3,500 / 3,500 `UNLINKED_INDIAN_CORPUS` | **PASS** |
| `reviews_rejection_reason` | Explicit rejection reason documented | 100% documented (`NO_GENUINE_CATALOG_PRODUCT_MATCH`) | **PASS** |
| `reviews_provenance_separation` | Rigorous provenance partitioning | 3,260 confirmed Flipkart vs 240 uncertain records | **PASS** |
| `linked_reviews_count` | Catalog-linked reviews | Exactly 0 rows (0 false positives) | **PASS** |
| `reviews_fk_referential_integrity` | Foreign key referential integrity | 0 orphan reviews in linked table | **PASS** |

---

### Section 5: Complete Multimodal Dataset Validation (1 / 1 PASS)

| Check Name | Target Criterion | Observed Value | Status |
| :--- | :--- | :--- | :---: |
| `complete_multimodal_truthfulness` | Honest multimodal count | Exactly 0 rows (zero fabricated entities) | **PASS** |

---

### Section 6: Protected Baseline Integrity Validation (11 / 11 PASS)

| Baseline Artifact | Expected SHA-256 Hash | Status |
| :--- | :--- | :---: |
| `canonical_products.parquet` | `b0a27e4803d5bf76d025da1abea2045e3920e61b26cf72343c5a0e6465e5cd0e` | **PASS** |
| `canonical_reviews.parquet` | `17aa47d8aa60e447ce673e83fe2d8336e10c357c3afeb4e0a63503e46a01323c` | **PASS** |
| `canonical_images.parquet` | `bdae434ef284fa8e7f600c65b4dd6a8be04c77b464d20bce0d7641005cbc5187` | **PASS** |
| `canonical_relationships.parquet` | `490a37c8dfab90195778a6f43003c2704d9a5beb8a1204544037ce81c1ebced9` | **PASS** |
| `image_quality_report.parquet` | `4acfcbeff74ba226ab69a7f513d6b0d487980e8b3f4631b7979e0c5a6616ca9a` | **PASS** |
| `review_corpus_unlinked.parquet` | `7d7abde9d0962fdb03655a877cf327930a889f0e12b9dd5fced0525fe7e59613` | **PASS** |
| `curated_products_5684.parquet` | `abcdb9e0e729d26113d9781910c614a8f36f1fee5f88aabbe18430666baa9024` | **PASS** |
| `curated_products_20000.parquet` | `b2df7c98b8fb95d66e07727028b7b778e28cca615f376480a26e5c29b1145cc4` | **PASS** |
| `cohort_membership_20000.parquet` | `961f992eeebd4df5dd6c0c7ac811e14a5ee0d45797c792caa99fbffe7675b461` | **PASS** |
| `cohort_metadata_20000.json` | `050656b487b1a0321d009b2cfbd3972a959e4758deca973f33ebe57f500acf2c` | **PASS** |
| `all_baseline_hashes_intact` | Summary of all 10 baseline hashes | **PASS** (100% bit-perfect) |

---

## 3. Formal Test Suite Execution Results (`pytest tests/`)

Execution Command: `.venv\Scripts\python.exe -m pytest tests/`  
Total Test Execution Time: 67.15s  
Summary: **93 passed, 0 failed, 0 warnings**

### Module Breakdown

| Test File | Tests Passed | Domain Tested |
| :--- | :---: | :--- |
| [tests/test_indian_dataset.py](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/tests/test_indian_dataset.py) | **28 / 28** | Indian exclusivity, referential integrity, image recovery, pricing enrichment, stock semantics, review provenance separation, baseline hashes |
| [tests/test_pricing.py](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/tests/test_pricing.py) | **15 / 15** | Marketplace-specific price anomaly models, IQR & z-score anomaly flags |
| [tests/test_matching.py](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/tests/test_matching.py) | **11 / 11** | Product matching, canonical schema matching, token similarity |
| [tests/test_pipeline.py](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/tests/test_pipeline.py) | **8 / 8** | End-to-end data processing pipelines |
| [tests/test_schema.py](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/tests/test_schema.py) | **7 / 7** | Canonical schema validation and types |
| [tests/test_nlp.py](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/tests/test_nlp.py) | **6 / 6** | NLP review processing, sentiment analysis, fake review scoring |
| [tests/test_vision.py](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/tests/test_vision.py) | **6 / 6** | Core computer vision image loading, quality metrics |
| [tests/test_risk_engine.py](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/tests/test_risk_engine.py) | **5 / 5** | Multi-modal risk scoring engine and weighting |
| [tests/test_expanded_vision.py](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/tests/test_expanded_vision.py) | **4 / 4** | Expanded visual downloader, feature aggregation, embeddings |
| [tests/test_relationships.py](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/tests/test_relationships.py) | **3 / 3** | Relationship graph edges and cross-marketplace links |
| **Total** | **93 / 93** | **100% test pass rate** |

---

## 4. Referential Integrity & Safety Audits

1. **Primary Key Validity:**
   - `canonical_product_id` in `indian_products.parquet`: 3,500 unique values, 0 nulls.
   - `image_id` in `indian_images.parquet`: 5,034 unique values, 0 nulls.
   - `review_id` in `indian_reviews.parquet`: 3,500 unique values, 0 nulls.
2. **Foreign Key Integrity:**
   - 100% of images reference a valid `canonical_product_id` in `indian_products.parquet`. Exactly 0 orphan images.
   - Zero orphan reviews in `indian_reviews_linked.parquet`.
3. **Physical File Verification:**
   - All 4,708 usable image paths recorded in `indian_images.parquet` physically exist on disk and were verified with PIL.
4. **Data Isolation:**
   - Zero records from US Amazon, Walmart, or BestBuy are present.
   - 100% of products specify `country = 'IN'` and `currency = 'INR'`.
