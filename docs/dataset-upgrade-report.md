# Comprehensive Dataset Audit & Upgrade Report

**Project:** AI-Based Marketplace Analyzer  
**Role:** Senior Data Scientist & ML Data Engineer  
**Status:** Audit Completed — Relational Upgrade Implemented & Empirically Validated  
**Date:** October 2026  

---

## 1. Executive Summary & Audit Verification

Following our detailed data engineering audit, we confirmed the strategic decision to **SUPPLEMENT and UPGRADE** the repository rather than replacing it.

### Preserved Foundational Work (Weeks 1 & 2)
The following completed assets are preserved without modification:
- `notebooks/01_eda.ipynb` (Week 1 Exploratory Data Analysis)
- `notebooks/02_data_cleaning.ipynb` (Week 2 Data Cleaning & Missingness Imputation)
- `notebooks/03_text_features.ipynb` (Week 2 Text Feature Engineering)
- `notebooks/04_nlp_analysis.ipynb` (Week 3 NLP Analysis — Ready to resume)
- `data/interim/all_beauty_sample.parquet` (20,000 raw sample)
- `data/processed/marketplace_cleaned.parquet` (19,991 cleaned records)
- `data/processed/marketplace_text_features.parquet` (19,991 rows × 30 columns)
- `data/raw/amazon/all_beauty_metadata.parquet` (112,590 products)
- `data/raw/amazon/all_beauty_reviews.parquet` (701,528 reviews)

### Independent Verification of Identified Limitations
An independent, programmatic audit verified:
1. **The Product-Density Bottleneck:** In `marketplace_text_features.parquet`, 10,086 out of 12,923 products (**78.0%**) possess only **1 review** (mean: 1.55 reviews/product). Intra-listing review similarity, rating variance, and review velocity cannot be computed for 78% of listings without clustered reviews.
2. **Price Missingness:** 14,729 out of 19,991 rows (**73.68%**) have null prices in the flat sample.
3. **Omitted Images:** Product image URLs were stripped during the initial sample creation in `src/create_sample.py`.
4. **Seller Reality Check:** The `store` column contains brand/storefront names, not verified third-party merchant IDs.
5. **Absence of Ground Truth:** Amazon Reviews'23 is an unlabelled observational catalog containing zero confirmed fraud labels.

---

## 2. Upgraded Relational Dataset Collection

To support each analysis module without monolithic data bloat, we generated a modular collection of relational tables and benchmark assets:

```text
data/
├── dataset_manifest.json                      → Machine-readable provenance and capability manifest
├── raw/
│   ├── amazon/                                → Raw All_Beauty archives (Preserved)
│   ├── benchmarks/
│   │   ├── deceptive_opinion_spam.parquet     → Ott et al. gold-standard NLP deception benchmark (1,600 rows)
│   │   ├── deceptive_opinion_spam.csv         → CSV mirror of NLP benchmark
│   │   ├── synthetic_stress_test_cases.parquet→ Controlled synthetic test suite (Cases A–E, is_synthetic=True)
│   │   ├── synthetic_stress_test_cases.csv    → CSV mirror of synthetic cases
│   │   └── README.md                          → Benchmark provenance and domain boundary documentation
│   └── images/cache/                          → Validated sample of downloaded packaging images
└── interim/
    ├── all_beauty_sample.parquet              → Preserved Week 1 baseline
    ├── dense_products.parquet                 → 300 products (100% valid price, >=10 reviews)
    ├── dense_reviews.parquet                  → 7,595 reviews linked by parent_asin (mean 25.3 revs/prod)
    ├── dense_product_images.parquet           → 3,489 live Amazon CDN image URLs
    ├── product_pricing_cohort.parquet         → 17,704 products with verified positive price & IQR fences
    ├── image_manifest.parquet                 → 50 validated images with SHA-256, dHash, and native WinOCR
    └── image_manifest.csv                     → CSV mirror of image manifest
```

---

## 3. Dataset Inventory & Exact File Statistics

| Asset ID | File Path | Entity Level | Rows | Cols | File Size | Checksum (SHA-256) | Key Constraints |
|---|---|---|---|---|---|---|---|
| `baseline_processed_features` | `data/processed/marketplace_text_features.parquet` | Review-flat | 19,991 | 30 | 9.29 MB | `1ca1f8680004...` | Preserved baseline sample |
| `dense_products` | `data/interim/dense_products.parquet` | Product | 300 | 11 | 187 KB | `4fbe48ba3351...` | Primary key: `parent_asin` (100% unique) |
| `dense_reviews` | `data/interim/dense_reviews.parquet` | Review | 7,595 | 11 | 2.26 MB | `cfbe3e85bf03...` | FK: `parent_asin` (0 orphans); PK: `review_id` |
| `dense_product_images` | `data/interim/dense_product_images.parquet` | Image URL | 3,489 | 5 | 80 KB | `2bb7e5c54c30...` | FK: `parent_asin` (0 orphans); PK: `image_id` |
| `product_pricing_cohort` | `data/interim/product_pricing_cohort.parquet` | Product | 17,704 | 12 | 1.54 MB | `5d6bfe90e756...` | 100% valid positive prices |
| `image_manifest` | `data/interim/image_manifest.parquet` | Image Batch | 50 | 19 | 21 KB | `9eb5444ca4e0...` | 100% HTTP 200, SHA-256, dHash, WinOCR |
| `deceptive_opinion_spam` | `data/raw/benchmarks/deceptive_opinion_spam.parquet` | Benchmark Review | 1,600 | 5 | 751 KB | `2c2d61eb4d35...` | 800 truthful, 800 deceptive |
| `synthetic_stress_test` | `data/raw/benchmarks/synthetic_stress_test_cases.parquet` | Benchmark Scenario | 5 | 21 | 16 KB | `6d61685a5301...` | 100% tagged `is_synthetic=True` |

---

## 4. Empirical Trade-Off & Density Analysis

A complete scan of the raw Amazon catalog (112,590 products) established the empirical trade-offs:
- **Price Availability:** Only 17,704 products (15.72%) have valid positive numeric prices.
- **Review Volume Skew:** 47,566 products (42.25%) have only 1 review; 14,276 products (12.68%) have 5–9 reviews; 13,257 products (11.77%) have $\ge 10$ reviews.
- **Price-Volume Correlation:** For products with 1 review, only 13.8% have prices. For products with $\ge 50$ reviews, 34.1% have prices.
- **Why Both Datasets Are Needed:** 
  - `marketplace_text_features.parquet` reflects the real marketplace long-tail distribution (including cold-start and sparse listings).
  - `dense_products.parquet` and `dense_reviews.parquet` provide dense clusters ($\ge 10$ reviews per listing) required for intra-product review similarity, sentiment dispersion, and burstiness.

---

## 5. Image & Native WinOCR Pipeline Results

An automated empirical download and OCR pipeline ([`src/build_image_manifest.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/build_image_manifest.py)) was executed across 50 distinct products from the dense cohort:
- **Download Success:** **50 / 50 URLs returned HTTP 200 OK** (100.0% reachable on Amazon CloudFront CDN).
- **Image Dimensions:** Width 110–612 px (median 500 px); Height 281–612 px (median 500 px). File sizes: 4.3 KB to 61.9 KB (median 24.7 KB).
- **Hashing Signatures:** 100% computed cryptographic SHA-256 and 64-bit difference hashes (dHash) for exact and near-duplicate visual detection.
- **Native WinOCR Execution:** Executed Microsoft's native WinRT Windows OCR engine:
  - **31 out of 50 images (62.0%)** yielded extracted text directly from bottles, jars, and packaging (e.g. brand names *Mia Secret*, *Aunt Jackie's*, *Jergens*, *TriDerma*, *Soak-Off Gel Polish*).
  - 19 images contained no text (e.g. plain makeup brushes, sponges, cosmetic liquids).
  - Zero OCR runtime crashes or dependency failures.

---

## 6. Seller-Data Findings & Future Architecture

### Empirical Findings
- In Amazon Reviews'23, `store` represents brand names (e.g., *PHILIPS*, *Bath & Body Works*) or 'Unknown', not seller accounts.
- **No seller account attributes exist** (no Merchant IDs, registration dates, seller feedback scores, or cancellation rates).
- Public e-commerce datasets intentionally scrub merchant account identifiers.

### Defensible Future Schema (Amazon SP-API Integration)
When seller credentials or merchant registry feeds become available, the system is designed to link via:
- `seller_id`: Unique Amazon Merchant Token
- `seller_legal_name`: Registered corporate entity
- `seller_country`: Country of incorporation
- `tenure_days`: Account age in days
- `feedback_score_positive_pct`: 30/90/365-day positive rating ratio
- `fulfillment_channel`: FBA vs FBM
- `listing_velocity`: ASINs introduced per month

---

## 7. Fraud Ground Truth & Leakage Prevention Protocol

### Reality Check on Ground Truth
No public e-commerce dataset contains verified, legally confirmed seller fraud or counterfeit takedowns. Kaggle datasets claiming "fake Amazon reviews" rely on circular heuristics (e.g. non-verified purchase = fake). To preserve academic and portfolio integrity:
1. **Observational Anomaly Detection:** Real Amazon listings are evaluated for *risk signals and investigation alerts*, not definitive fraud.
2. **Validated NLP Ground Truth:** The Ott et al. benchmark (1,600 reviews) is preserved for text stylometry evaluation.
3. **Controlled Synthetic Benchmark:** Five clearly labeled stress tests (`is_synthetic=True`) evaluate edge cases (Price Dumping, Review Burst, Information Deficit, Compound Risk).

### Data Leakage Constraints
- **Interim Verification:** Confirmed that no train/test splits have been generated yet; zero split leakage exists.
- **Protocol for Week 3+ Modeling:**
  1. **Group-ASIN Splitting:** All reviews for a product must be assigned strictly to train or test. Never split reviews of the same product across sets.
  2. **Temporal Cutoff:** Where time-series signals are evaluated, train on historical dates ($\le 2020$) and evaluate on future dates ($2021–2023$).
  3. **Vectorizer Isolation:** TF-IDF vectorizers and embedding normalizers must be fit exclusively on training splits.

---

## 8. Capability Readiness Classification

| Module | Planned Analysis | Readiness Classification | Technical Justification |
|---|---|---|---|
| **Week 3: Review NLP** | Sentiment, TF-IDF cosine similarity, boilerplate review rings | **Ready for a validated prototype** | Intra-listing review similarity supported by `dense_reviews.parquet` (25.3 revs/prod). Deceptive stylometry supported by Ott et al. benchmark. |
| **Week 4: Pricing & Rating** | Category median/IQR, Z-scores, rating divergence | **Ready for a validated prototype** | Full 17,704-product pricing cohort provides verified positive prices and category Tukey fences. |
| **Week 5: Computer Vision** | Packaging OCR, image reachability, perceptual dHash | **Ready for a validated prototype** | Image manifest verifies 100% download success, SHA-256/dHash integrity, and functional WinOCR on packaging. |
| **Week 6: Storefront Signals** | Brand naming consistency, listing breadth | **Ready for exploratory analysis** | Brand/storefront attributes can be modeled. Caveat: documented as brand proxy, not merchant ID. |
| **Seller Account History** | Merchant tenure, account churn, cancellation rates | **Blocked by missing source data** | Amazon Reviews'23 does not contain Merchant IDs. Defensible SP-API schema documented for future work. |
| **Week 7: Explainable Risk Scoring** | Multi-signal fusion, confidence calibration | **Ready for a validated prototype** | All prerequisite signal tables are populated with high feature completeness. |
| **Week 8: Benchmark Evaluation** | Multi-tiered evaluation (Baseline, NLP, Synthetic) | **Ready for evaluation** | Segregated benchmark tables prevent confirmation bias and data leakage. |

---

## 9. Reproducible Script Architecture

The following modular scripts in `src/` manage data extraction, validation, and manifest generation:
1. [`src/build_dense_product_sample.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/build_dense_product_sample.py): Generates dense relational cohort tables (`--target_products 300`, `--min_reviews 10`, `--max_reviews 40`).
2. [`src/build_pricing_cohort.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/build_pricing_cohort.py): Extracts 17,704 products with verified positive prices and computes category median/IQR outlier metrics.
3. [`src/build_image_manifest.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/build_image_manifest.py): Downloads, hashes (SHA-256, dHash), and runs native WinOCR across product images.
4. [`src/acquire_nlp_benchmark.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/acquire_nlp_benchmark.py): Downloads, validates, and formats the Ott et al. deceptive review benchmark.
5. [`src/generate_synthetic_benchmark.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/generate_synthetic_benchmark.py): Generates controlled synthetic stress-test cases (Cases A–E).
6. [`src/validate_dataset_integrity.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/validate_dataset_integrity.py): Automated validation suite (22 PASS, 2 WARN, 0 FAIL).
7. [`src/generate_dataset_manifest.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/generate_dataset_manifest.py): Generates machine-readable `data/dataset_manifest.json`.
