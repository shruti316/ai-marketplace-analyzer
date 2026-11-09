# Comprehensive Product-Level Data Coverage Audit Report

**Platform:** AI-Powered Marketplace Trust Intelligence  
**Component:** Data Foundation & Multi-Modality Audit  
**Execution Date:** 2026-11-02  
**Audit Scope:** Read-Only Audit across Canonical Products, NLP Reviews, Computer Vision, Pricing, and Relationship Topologies  

---

## 1. Executive Summary

This report establishes the baseline product-level data coverage across all modalities in the AI-Based Marketplace Analyzer platform.

The canonical catalog contains **31,289 products** across six marketplaces: Walmart (22,074), Amazon US (5,466), Amazon India (1,500), Flipkart (1,000), Myntra (1,000), and BestBuy (249).

### Key Audit Findings:
1. **Canonical Product Integrity:** Exactly 31,289 unique canonical product IDs; 0 duplicate IDs; 0 null IDs; 100% complete titles, categories, subcategories, and currencies.
2. **Modality Availability:**
   - **Valid Pricing (`price > 0`):** 24,768 products (**79.16%**).
   - **Usable NLP Reviews (`review_count > 0`):** 3,627 products (**11.59%**), supported by 55,616 reviews.
   - **Usable Computer Vision (Unit L2 Embeddings):** 1,647 products (**5.26%**), supported by 5,887 usable images.
3. **Multi-Modality Overlap:**
   - **Triple Modality (NLP + CV + Price):** Exactly **300 products** (**0.96%**). All 300 reside on Amazon US in `Beauty & Personal Care`.
   - **Dual Modality (Any 2 of NLP, CV, Price):** **1,135 products** (**3.63%**), dominated by Flipkart (927) and Amazon US (207) with CV + Price.
   - **Single Modality (Only 1 of NLP, CV, Price):** **26,872 products** (**85.88%**), dominated by Walmart price-only records (19,214).
   - **Zero Usable Evidence (No NLP, No CV, No Price):** **2,982 products** (**9.53%**).
4. **Feasibility of 20,000-Product Cohort:**
   - An aspirational image-bearing cohort of 10,000–15,000 products is **mathematically impossible with current data**. Only 3,220 products have ever had image records, and only **1,647 products** possess usable images and embeddings.
   - A generic 20,000-product cohort selected on basic metadata would be **~85% Walmart price-only products** with zero reviews and zero images, severely biasing the platform and starving multimodal risk models.
   - Instead, we recommend a **balanced, multi-tiered curated cohort of 5,500–6,000 products** that includes 100% of all multimodal products (Tiers A and B) and a stratified sample of single-modality products across all 6 marketplaces.
5. **Relationship Graph Feasibility:**
   - `seller_id` is **100% missing** across all 31,289 products.
   - Seller names on Walmart, Flipkart, Myntra, BestBuy, and Amazon India are platform placeholders (e.g. `Walmart.com`, `Flipkart Seller`). Constructing seller-product graphs on these would create massive uninformative cliques.
   - Currently feasible graph topologies are restricted to **Product-Reviewer bipartite graphs** (55,616 reviews across 3,627 products), **Product-Image visual syndication** (53 products sharing 57 hashes), **Product-Brand attribute linkages** (27,768 edges), and **Style variant hierarchies** (1,000 Myntra clothing edges).

---

## 2. Authoritative Dataset Inventory

The audit inspected seven authoritative processed datasets and interim manifests:

| Dataset Name | File Path | Record Count | Unique Products | Primary Modality & Description |
| :--- | :--- | :---: | :---: | :--- |
| **Canonical Products** | [`data/processed/canonical_products.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/processed/canonical_products.parquet) | 31,289 | 31,289 | Reference catalog master (titles, categories, brands, prices, seller names). |
| **Canonical Reviews** | [`data/processed/canonical_reviews.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/processed/canonical_reviews.parquet) | 55,616 | 3,627 | Raw textual reviews with ratings, reviewer IDs, verified purchase flags, and timestamps. |
| **Product Review Features** | [`data/processed/product_review_features.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/processed/product_review_features.parquet) | 27,789 | 27,789 | Product-level NLP features: review counts, listing states, sentiment, and intra-listing similarity. |
| **CV Product Features Expanded** | [`data/processed/cv_product_features_expanded.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/processed/cv_product_features_expanded.parquet) | 31,289 | 31,289 | Product-level visual features: 48 metrics covering counts, dimensions, sharpness, OCR, and syndication. |
| **CV Product Embeddings** | [`data/processed/cv_product_embeddings_expanded.npy`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/processed/cv_product_embeddings_expanded.npy) | 1,647 × 512 | 1,647 | Unit L2-normalized 512-dim pooled ResNet-18 embeddings for all products with usable images. |
| **Canonical Relationships** | [`data/processed/canonical_relationships.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/processed/canonical_relationships.parquet) | 153,381 | 31,179 | Heterogeneous graph edges: `has_review`, `written_by`, `belongs_to_brand`, `has_image`, `is_variant_of`. |
| **Expanded Image Manifest** | [`data/interim/expanded_image_manifest.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/interim/expanded_image_manifest.parquet) | 13,390 | 3,220 | Image-level manifest with download status, dimensions, SHA-256, dHash, and OCR results. |

---

## 3. Product-Level Modality Coverage

Each modality was evaluated against strict usability criteria:

### A. NLP Review Intelligence
- **Available Products (`review_count > 0`):** **3,627 products** (11.59% of catalog).
  - `SPARSE_SINGLE_REVIEW`: 3,047 products (84.01% of review-bearing products have exactly 1 review).
  - `DENSE_MULTI_REVIEW`: 580 products (15.99% of review-bearing products have $\ge 2$ reviews).
  - Review count range: min = 1, median = 1, mean = 15.33, 95th percentile = 40, max = 3,108.
- **Evaluated Zero-Review Products (`listing_state == 'ZERO_REVIEWS'`):** **24,162 products** (all 22,074 Walmart products + 2,088 Amazon US products).
- **Uncovered Review Sources (`NOT_COVERED`):** **3,500 products** (1,500 Amazon India, 1,000 Flipkart, 1,000 Myntra). In strict compliance with guidelines, missing review data is classified as `NOT_COVERED` and never assumed to be zero reviews.
- **Feature Richness:** Intra-listing review similarity (`max_intra_listing_similarity`) is populated for all 580 multi-review products; verified purchase ratio is populated for all 3,627 products.

### B. Computer Vision (CV) Intelligence
- **Total Image Records:** 13,390 records across 3,220 distinct products.
- **Downloaded Image Records:** 11,808 records (0 corrupted files).
- **Usable Images Identified:** 5,887 records (4,024 `VALIDATED` + 1,533 `NEAR_DUPLICATE` + 330 `DUPLICATE`).
- **Product Coverage:**
  - `USABLE_IMAGE_EVIDENCE` (100% usable): **1,335 products** (918 Flipkart, 417 Amazon US).
  - `PARTIAL_IMAGE_EVIDENCE` ($\ge 1$ usable): **312 products** (298 Amazon US, 14 Flipkart).
  - `NO_USABLE_IMAGES` (only thumbnails/tracking pixels): **1,573 products** (1,500 Amazon India, 68 Flipkart, 5 Amazon US).
  - `NO_IMAGE_RECORDS`: **28,069 products** (Walmart, BestBuy, Myntra, non-image Amazon).
- **Visual Embeddings:** Exactly **1,647 products** receive 512-dim unit L2-normalized pooled embeddings. The remaining 29,642 products strictly have `NaN`/`None` embeddings.
- **OCR Packaging Text:** 645 products have verified packaging text evaluated against listing titles (mean packaging consistency = 0.306).

### C. Price Intelligence
- **Valid Price (`price > 0`):** **24,768 products** (79.16% of catalog).
- **Missing Price (`price is null`):** **6,521 products** (20.84% of catalog).
  - 3,392 Amazon US products (62.06% of Amazon US).
  - 2,860 Walmart products (12.96% of Walmart).
  - 249 BestBuy products (100.00% of BestBuy).
  - 15 Amazon India products (1.00%).
  - 5 Flipkart products (0.50%).
- **Invalid / Negative Prices:** **0 products** (verified min prices: Walmart \$0.01, Amazon \$0.24, Amazon India ₹17.0, Flipkart ₹59.0, Myntra ₹307.0).
- **Currency Partition:** USD (21,288 products, median \$30.98) vs. INR (3,480 products, median ₹798.0). Currencies are strictly non-interchangeable.

### D. Relationships & Graph Coverage
- **Seller Identifiers (`seller_id`):** 0 / 31,289 (**0.00% coverage**). 100% missing in raw catalog.
- **Seller Names (`seller_name`):** 28,212 / 31,289 (**90.17% present**), but 26,072 of these are uninformative platform labels (`Walmart.com`, `Amazon.in Seller`, `Flipkart Seller`, `Myntra Brand Partner`, `Best Buy`). True store names exist only on Amazon US (2,288 products).
- **Product-Reviewer Graph:** 55,616 reviews connect 3,627 products to 55,607 reviewers. BestBuy provides a dense review subgraph (44,965 reviews across 249 products, avg 180.6 reviews/product).
- **Image Syndication Graph:** 53 products share 57 unique image hashes across listings.

---

## 4. Marketplace-Wise Coverage

| Marketplace | Total Products | Valid Price (%) | Usable NLP (%) | Usable CV (%) | Triple Modality (NLP+CV+Price) | Dual Modality | Single Modality | Zero Modality |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Walmart** | 22,074 | 19,214 (87.0%) | 0 (0.0%) | 0 (0.0%) | 0 | 0 | 19,214 | 2,860 |
| **Amazon US** | 5,466 | 2,074 (37.9%) | 3,378 (61.8%) | 715 (13.1%) | **300** | 208 | 4,851 | 107 |
| **Amazon India** | 1,500 | 1,485 (99.0%) | 0 (0.0%) | 0 (0.0%) | 0 | 0 | 1,485 | 15 |
| **Flipkart** | 1,000 | 995 (99.5%) | 0 (0.0%) | 932 (93.2%) | 0 | **927** | 73 | 0 |
| **Myntra** | 1,000 | 1,000 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 | 0 | 1,000 | 0 |
| **BestBuy** | 249 | 0 (0.0%) | 249 (100.0%) | 0 (0.0%) | 0 | 0 | 249 | 0 |
| **Total Catalog** | **31,289** | **24,768 (79.2%)** | **3,627 (11.6%)** | **1,647 (5.3%)** | **300 (1.0%)** | **1,135 (3.6%)** | **26,872 (85.9%)** | **2,982 (9.5%)** |

---

## 5. Category-Wise Coverage

| Standardized Category | Total Products | Valid Price | Usable NLP | Usable CV | Triple Modality | Dual Modality | Single Modality | Zero Modality |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Electronics** | 14,126 | 11,499 | 828 | 167 | 0 | 124 | 12,246 | 1,756 |
| **Other** | 5,068 | 4,447 | 0 | 125 | 0 | 110 | 4,352 | 606 |
| **Books & Stationery** | 3,188 | 2,282 | 603 | 84 | 0 | 79 | 2,811 | 298 |
| **Clothing & Fashion** | 3,076 | 2,290 | 562 | 596 | 0 | 519 | 2,410 | 147 |
| **Beauty & Personal Care** | 2,978 | 2,964 | 300 | 346 | **300** | 46 | 2,618 | 14 |
| **Home & Kitchen** | 1,726 | 846 | 682 | 232 | 0 | 191 | 1,378 | 157 |
| **Toys & Games** | 758 | 72 | 652 | 97 | 0 | 66 | 689 | 3 |
| **Grocery & Essentials** | 369 | 368 | 0 | 0 | 0 | 0 | 368 | 1 |
| **Total** | **31,289** | **24,768** | **3,627** | **1,647** | **300** | **1,135** | **26,872** | **2,982** |

---

## 6. Modality Overlap Matrix (Mutual Exclusivity Partition)

Every product in the catalog is partitioned into mutually exclusive modality combinations without double counting:

```
                    TOTAL CANONICAL PRODUCTS: 31,289
                                  │
       ┌──────────────────────────┴──────────────────────────┐
       ▼                                                     ▼
AT LEAST ONE MODALITY: 28,307 (90.47%)             ZERO MODALITIES: 2,982 (9.53%)
       │                                            (Walmart: 2,860, Amazon: 107, Amazon IN: 15)
       ├─────────────────────────────────────────┐
       ▼                                         ▼
MULTI-MODAL (>= 2): 1,435 (4.59%)         SINGLE-MODAL (== 1): 26,872 (85.88%)
       │                                         │
       ├─ Triple Modality (NLP+CV+Price): 300    ├─ Price Only: 23,333
       │  (Amazon US Beauty cohort)              │  (Walmart: 19,214, Amazon IN: 1,485, Myntra: 1,000, etc.)
       │                                         │
       └─ Dual Modality (Any 2): 1,135           ├─ NLP Only: 3,326
          ├─ CV + Price: 1,134                   │  (Amazon US: 3,077, BestBuy: 249)
          │  (Flipkart: 927, Amazon: 207)        │
          ├─ NLP + Price: 1                      └─ CV Only: 213
          └─ NLP + CV: 0 (All have price)           (Amazon US: 208, Flipkart: 5)
```

| Modality Overlap Cohort | Exact Product Count | % of Catalog | Primary Marketplaces & Characteristics |
| :--- | :---: | :---: | :--- |
| **Triple Modality (NLP + CV + Price)** | **300** | **0.96%** | Amazon US (100%), Beauty & Personal Care (100%). Rich reviews, valid price, and verified visual embeddings. |
| **Dual Modality: CV + Price** | **1,134** | **3.62%** | Flipkart (927), Amazon US (207). Clothing, Home, Electronics. Embeddings + valid prices. |
| **Dual Modality: NLP + Price** | **1** | **0.00%** | Amazon US. Review evidence + valid price, no usable image. |
| **Dual Modality: NLP + CV (No Price)** | **0** | **0.00%** | All products with both NLP and CV also possess valid prices. |
| **Single Modality: Price Only** | **23,333** | **74.57%** | Walmart (19,214), Amazon US (1,566), Amazon India (1,485), Myntra (1,000), Flipkart (68). |
| **Single Modality: NLP Only** | **3,326** | **10.63%** | Amazon US (3,077), BestBuy (249). Review intelligence without price or images. |
| **Single Modality: CV Only** | **213** | **0.68%** | Amazon US (208), Flipkart (5). Verified visual embeddings without price or reviews. |
| **Zero Usable Evidence** | **2,982** | **9.53%** | Walmart (2,860), Amazon US (107), Amazon India (15). Missing prices, no reviews, no usable images. |
| **Total Reconciled** | **31,289** | **100.00%** | **100% exact mathematical reconciliation.** |

---

## 7. Attribute Missingness Analysis

| Canonical Attribute | Total Present | Missing / Empty | Missingness Rate (%) | Marketplace Pattern & Downstream Impact |
| :--- | :---: | :---: | :---: | :--- |
| `canonical_product_id` | 31,289 | 0 | **0.00%** | Completely unique primary key across all 31,289 rows. |
| `title` | 31,289 | 0 | **0.00%** | 100% populated across all six marketplaces. |
| `category` | 31,289 | 0 | **0.00%** | 8 standardized taxonomy buckets; zero nulls. |
| `subcategory` | 31,289 | 0 | **0.00%** | Standardized taxonomy; zero nulls. |
| `currency` | 31,289 | 0 | **0.00%** | Explicit currency codes (`USD` or `INR`); zero nulls. |
| `brand` | 27,918 | 3,371 | **10.77%** | Missing predominantly on Amazon US (3,077 missing, 56.3%). |
| `description` | 28,212 | 3,077 | **9.83%** | Missing on Amazon US (3,077 missing, 56.3%). |
| `product_url` | 28,212 | 3,077 | **9.83%** | Missing on Amazon US (3,077 missing, 56.3%). |
| `seller_name` | 28,212 | 3,077 | **9.83%** | Missing on Amazon US (3,077 missing); remaining 28,212 mostly platform strings. |
| `price` | 24,768 | 6,521 | **20.84%** | Missing on BestBuy (100%), Amazon US (62.1%), Walmart (13.0%). |
| `rating` | 2,471 | 28,818 | **92.10%** | Catalog-level average rating missing for 92.1% of products. |
| `rating_count` | 2,389 | 28,900 | **92.36%** | Catalog-level rating count missing for 92.4% of products. |
| `seller_id` | 0 | 31,289 | **100.00%** | **Completely absent** across all products in the platform catalog. |
| `image_urls` | 3,086 | 28,203 | **90.14%** | Only 3,086 products have non-empty image URL arrays in `canonical_products`. |

---

## 8. Data Quality Issues & Diagnostic Findings

1. **Synthetic / Platform Seller Placeholders:**
   - In `canonical_products.parquet`, 22,074 products have `seller_name == 'Walmart.com'`, 1,500 have `'Amazon.in Seller'`, 1,000 have `'Flipkart Seller'`, 1,000 have `'Myntra Brand Partner'`, and 249 have `'Best Buy'`.
   - **Risk:** Treating `seller_name` as a distinct merchant node in a graph would collapse 22,074 Walmart products into a single mega-seller node, destroying graph modularity.
2. **Indian Marketplace Review Disconnection:**
   - Amazon India (1,500), Flipkart (1,000), and Myntra (1,000) have zero linked reviews in `canonical_reviews.parquet` and were excluded from `product_review_features.parquet`.
   - **Preservation:** The platform correctly classifies them as `NOT_COVERED` rather than `ZERO_REVIEWS`.
3. **Currency Incompatibility in Pricing:**
   - 21,288 products use USD (Amazon US, Walmart), while 3,480 products use INR (Amazon India, Flipkart, Myntra).
   - **Risk:** Price anomaly models must normalize or segment by marketplace/currency. A naive global median or z-score would flag all Indian products as massive price gougers (₹798 vs \$30).
4. **BestBuy Complete Price Absence:**
   - All 249 BestBuy products have `price == NaN`. However, BestBuy possesses the richest review text in the repository (44,965 reviews, avg 180.6 reviews/product).
   - **Impact:** BestBuy cannot be evaluated for price anomalies, but is the premier dataset for reviewer ring detection and review manipulation scoring.

---

## 9. Potential Leakage Risks & Safeguards

1. **Cross-Product Image Asset Leakage:**
   - Exactly **53 products** share **57 unique SHA-256 image hashes** across listings (spanning 121 image records).
   - **Leakage Risk:** If products are randomly partitioned into train and test sets, products sharing identical images will appear on both sides, causing visual embedding leakage.
   - **Safeguard:** Train/test splits must use **GroupKFold grouped by `content_hash_sha256`** so that all products sharing an image hash remain in the same split.
2. **Reviewer Astroturfing Ring Leakage:**
   - 55,607 unique reviewer IDs exist in `canonical_reviews.parquet`. Reviewers who review multiple products must not be split across train and test sets during NLP model training.
   - **Safeguard:** Splitting should be performed at the product level or bipartite connected-component level.
3. **Placeholder Spacers Treated as Syndication:**
   - 1,491 Amazon India products share the identical 1×1 transparent tracking pixel GIF (`transparent-pixel._V192234675_.gif`).
   - **Safeguard:** Stage 4 aggregation successfully isolated tracking pixels into `IRRELEVANT`. Downstream risk engines must never use raw image sharing as fraud signals without filtering to `is_usable == True`.

---

## 10. Evaluation of Proposed Curated Dataset & Recommended Criteria

### Evaluation of Tentative Targets:
- **Target A: 10,000–15,000 Image-Bearing Cohort:**
  - **Verdict: INFEASIBLE.**
  - The entire repository contains only 3,220 products with any image records, and only **1,647 products** have usable images. Achieving 10,000 image-bearing products is mathematically impossible without external data collection for at least 8,353 new products.
- **Target B: 20,000 Products Overall:**
  - **Verdict: TECHNICALLY FEASIBLE BUT STRONGLY ILL-ADVISED.**
  - If 20,000 products are selected based on available metadata (e.g. price and title), the cohort will be **~85% Walmart price-only records** (19,214 products) with zero reviews and zero images.
  - This would introduce severe marketplace sampling bias and reduce the multimodal evaluation of the platform to a single-modality price outlier detector.

### Recommended Multi-Tiered Curated Cohort (Target: ~5,500 – 6,000 Products):

We recommend structuring the curated dataset into three explicit, defensible tiers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CURATED DATASET DESIGN                          │
├────────────────────────────────────────────────────────────────────────┤
│ TIER A: Gold Multimodal Cohort (300 products)                          │
│   • Criteria: Triple Modality (NLP review_count > 0 + Usable CV + Price)│
│   • Source: Amazon US Beauty & Personal Care                           │
│   • Purpose: Benchmark end-to-end 5-modality risk fusion & discordance │
├────────────────────────────────────────────────────────────────────────┤
│ TIER B: High-Value Dual-Modality Cohort (~1,384 products)              │
│   • Sub-tier B1 (CV + Price): 1,134 products (927 Flipkart, 207 Amazon)│
│   • Sub-tier B2 (NLP Dense Reviews): 249 BestBuy products (45k reviews)│
│   • Sub-tier B3 (NLP + Price): 1 Amazon US product                     │
│   • Purpose: Evaluate pairwise modality interaction (CV+Price, NLP+Graph)│
├────────────────────────────────────────────────────────────────────────┤
│ TIER C: Stratified Single-Modality Benchmark Cohort (~4,000 products) │
│   • Amazon India: 1,000 products (INR pricing, marketplace breadth)    │
│   • Myntra: 1,000 products (INR fashion pricing + variant graph)       │
│   • Walmart: 1,500 products (Stratified by category for USD pricing)   │
│   • Amazon US (NLP Single-Review): 500 products                        │
│   • Purpose: Marketplace diversity, category calibration, price baselines│
├────────────────────────────────────────────────────────────────────────┤
│ TOTAL RECOMMENDED CURATED COHORT: ~5,684 Products                      │
└────────────────────────────────────────────────────────────────────────┘
```

### Proposed Tier Selection Criteria:
1. **Tier A (Triple Modality - 300 products):**
   - `has_product_embedding == True` AND `review_count > 0` AND `price > 0`.
   - 100% of eligible products included.
2. **Tier B (Dual Modality / High-Density - 1,384 products):**
   - All 1,134 products with `has_product_embedding == True` AND `price > 0`.
   - All 249 BestBuy products (rich review text and reviewer graphs, even though price is absent).
   - 1 Amazon US product with `review_count > 0` AND `price > 0`.
3. **Tier C (Stratified Single Modality - ~4,000 products):**
   - 1,000 Amazon India products with valid price and complete catalog metadata.
   - 1,000 Myntra products with valid price and style-variant hierarchy.
   - 1,500 Walmart products stratified across all 8 categories (replacing the unstratified 19,214 block).
   - 500 Amazon US single-review products.

---

## 11. Limitations and Unresolved Questions

1. **Indian Marketplace Review Gap:** No customer reviews currently exist for Flipkart, Amazon India, or Myntra in the canonical datasets.
2. **Missing Product URLs on Amazon US:** 3,077 Amazon US products lack listing URLs in `canonical_products.parquet`.
3. **Seller Graph Modularity:** Because `seller_id` is 100% missing and 90% of `seller_name`s are platform strings, seller-based fraud networks cannot be reliably evaluated without external merchant enrichment.
4. **BestBuy Pricing Omission:** BestBuy products lack retail price data, precluding price anomaly detection on the highest-density review dataset.

---

## 12. Clear Next Steps

1. **Awaiting User Approval:** Stop here and await explicit user approval of the recommended multi-tiered curated cohort design (~5,684 products).
2. **Cohort Filter Implementation:** Upon approval, implement `src/data/curate_cohort.py` to create `data/processed/curated_products_cohort.parquet` without modifying underlying canonical files.
3. **GroupKFold Split Generation:** Implement leakage-safe cross-validation splits grouped by `content_hash_sha256` and `reviewer_id`.
4. **Multimodal Risk Engine Integration:** Proceed to calibrate risk scoring modules against Tier A and Tier B cohorts.
