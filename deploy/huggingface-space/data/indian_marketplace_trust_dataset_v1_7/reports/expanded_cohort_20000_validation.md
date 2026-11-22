# Expanded Cohort (20,000 Products) Implementation & Validation Report

**Date:** 2026-11-02  
**Platform:** AI-Powered Marketplace Trust Intelligence  
**Component:** Data Curation Engine (`src/data/curation`)  
**Cohort Size:** Exactly **20,000 products**  
**Core Preservation:** Exactly **5,684 products** (100% preserved unmodified from `curated_products_5684.parquet`)  
**Expanded Additions:** Exactly **14,316 products** (100% disjoint, verified evidence-bearing)  
**Random Seed:** 42 (Deterministic)  

---

## 1. Executive Summary

This report documents the implementation, generation, automated verification, and deterministic reproducibility testing of the expanded **20,000-product analytical cohort** for the AI-Based Marketplace Trust Intelligence Platform.

The cohort was constructed using a dedicated expansion module ([`src/data/curation/build_expanded_cohort_20000.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/data/curation/build_expanded_cohort_20000.py)) and validated with an independent validation suite ([`src/data/curation/validate_expanded_cohort_20000.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/data/curation/validate_expanded_cohort_20000.py)).

### Primary Results:
- **Total Unique Product IDs:** Exactly **20,000 unique `canonical_product_id`s** (0 duplicates, 0 nulls).
- **Core Cohort Preservation:** All **5,684 products** from the approved core cohort are 100% preserved unmodified with identical tier, sub-tier, and sampling attributes.
- **Strict Disjointness:** The **14,316 additional products** share exactly **0 overlap** with the core 5,684 cohort ($\left|\text{Core} \cap \text{Additions}\right| = 0$).
- **Approved Allocations:** Marketplace and category distributions match approved targets down to the individual product ID.
- **Multimodal Evidence Retention:**
  - **Review Intelligence (NLP):** **100.0%** ($3,627 / 3,627$) of all catalog products with usable reviews are retained.
  - **Visual Embeddings (CV):** **100.0%** ($1,647 / 1,647$) of all catalog products with ResNet-18 embeddings are retained.
  - **Price Intelligence:** **16,461 products** with valid positive prices (**66.46%** of canonical valid-price universe; **100.0%** of non-Walmart valid prices).
- **Deterministic Reproducibility:** A full independent re-run confirmed 100% identity of product IDs and row order.
- **Cryptographic Baseline Preservation:** All 11 protected baseline files plus the 3 original 5,684 cohort files remain bit-perfect and intact.

---

## 2. Generated Artifacts Inventory

All generated artifacts were written to [`data/curated/`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/curated/):

| Artifact Path | Format | Record Count | File Size | SHA-256 Checksum | Description |
| :--- | :---: | :---: | :---: | :---: | :--- |
| [`data/curated/curated_products_20000.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/curated/curated_products_20000.parquet) | Parquet | 20,000 rows × 35 cols | ~5.8 MB | `b2df7c98b8fb95d66e07727028b7b778e28cca615f376480a26e5c29b1145cc4` | Expanded analytical dataset containing complete canonical fields, modality flags, and cohort hierarchy. |
| [`data/curated/cohort_membership_20000.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/curated/cohort_membership_20000.parquet) | Parquet | 20,000 rows × 6 cols | ~238 KB | `961f992eeebd4df5dd6c0c7ac811e14a5ee0d45797c792caa99fbffe7675b461` | Lightweight lookup table mapping `canonical_product_id` to `cohort_role`, `tier`, `sub_tier`, `selection_method`, and `random_seed`. |
| [`data/curated/cohort_metadata_20000.json`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/curated/cohort_metadata_20000.json) | JSON | 110 lines | ~4.1 KB | `050656b487b1a0321d009b2cfbd3972a959e4758deca973f33ebe57f500acf2c` | Machine-readable provenance documentation, source hashes, tier definitions, and category allocations. |

---

## 3. Cohort Architecture & Tier Structure

```
                                  EXPANDED COHORT: 20,000 PRODUCTS
                                                 │
            ┌────────────────────────────────────┴────────────────────────────────────┐
            ▼                                                                         ▼
     CORE COHORT: 5,684                                                      EXPANDED ADDITIONS: 14,316
     (cohort_role: "core_5684")                                              (cohort_role: "expanded_addition")
            │                                                                         │
   ┌────────┼────────┐                                                                ▼
   ▼        ▼        ▼                                                      TIER D: Catalog Expansion (14,316)
Tier A   Tier B   Tier C                                                    • exp_walmart_stratified_price: 9,407
(300)   (1,384)  (4,000)                                                    • exp_amazon_evidence: 4,351
                                                                            • exp_amazon_in_price: 485
                                                                            • exp_flipkart_evidence: 73
```

### Complete Sub-Tier Roster

| Tier Name | Sub-Tier Identifier | Cohort Role | Marketplace | Selection Method | Target Count | Actual Count | Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **Tier A** | `gold_triple_modality` | `core_5684` | Amazon US | `deterministic_all_eligible` | 300 | **300** | **PASS** |
| **Tier B** | `b1_cv_price` | `core_5684` | Flipkart & Amazon US | `deterministic_all_eligible` | 1,134 | **1,134** | **PASS** |
| | `b2_bestbuy_reviews` | `core_5684` | BestBuy | `deterministic_all_eligible` | 249 | **249** | **PASS** |
| | `b3_nlp_price` | `core_5684` | Amazon US | `deterministic_all_eligible` | 1 | **1** | **PASS** |
| **Tier C** | `c1_amazon_in_price` | `core_5684` | Amazon India | `deterministic_random_sampling` | 1,000 | **1,000** | **PASS** |
| | `c2_myntra_variants` | `core_5684` | Myntra | `deterministic_all_eligible` | 1,000 | **1,000** | **PASS** |
| | `c3_walmart_price` | `core_5684` | Walmart | `deterministic_category_stratified_sampling` | 1,500 | **1,500** | **PASS** |
| | `c4_amazon_us_reviews`| `core_5684` | Amazon US | `deterministic_category_stratified_sampling` | 500 | **500** | **PASS** |
| **Tier D** | `exp_walmart_stratified_price` | `expanded_addition` | Walmart | `deterministic_category_stratified_sampling` | 9,407 | **9,407** | **PASS** |
| | `exp_amazon_evidence` | `expanded_addition` | Amazon US | `deterministic_all_eligible` | 4,351 | **4,351** | **PASS** |
| | `exp_amazon_in_price` | `expanded_addition` | Amazon India | `deterministic_all_eligible` | 485 | **485** | **PASS** |
| | `exp_flipkart_evidence`| `expanded_addition` | Flipkart | `deterministic_all_eligible` | 73 | **73** | **PASS** |
| **Total** | | | | | **20,000** | **20,000** | **PASS** |

---

## 4. Approved Allocations Verification

### Marketplace Allocations (Actual Canonical Product IDs)

| Marketplace | Core 5,684 | 14,316 Additions | Final 20,000 Cohort | % of 20,000 Cohort | Canonical Universe | Catalog Coverage |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Walmart** | 1,500 | 9,407 | **10,907** | 54.54% | 22,074 | 49.41% |
| **Amazon US** | 1,008 | 4,351 | **5,359** | 26.80% | 5,466 | 98.04% |
| **Amazon India** | 1,000 | 485 | **1,485** | 7.42% | 1,500 | 99.00% |
| **Flipkart** | 927 | 73 | **1,000** | 5.00% | 1,000 | 100.00% |
| **Myntra** | 1,000 | 0 | **1,000** | 5.00% | 1,000 | 100.00% |
| **BestBuy** | 249 | 0 | **249** | 1.24% | 249 | 100.00% |
| **Total** | **5,684** | **14,316** | **20,000** | **100.00%** | **31,289** | **63.92%** |

### Category Allocations (Actual Canonical Product IDs)

| Category | Core 5,684 | 14,316 Additions | Final 20,000 Cohort | % of 20,000 Cohort | Canonical Universe | Catalog Coverage |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Electronics** | 1,364 | 6,089 | **7,453** | 37.26% | 14,126 | 52.76% |
| **Beauty & Personal Care** | 1,102 | 1,862 | **2,964** | 14.82% | 2,978 | 99.53% |
| **Clothing & Fashion** | 1,626 | 980 | **2,606** | 13.03% | 3,076 | 84.72% |
| **Other** | 462 | 2,137 | **2,599** | 13.00% | 5,068 | 51.28% |
| **Books & Stationery** | 344 | 1,613 | **1,957** | 9.78% | 3,188 | 61.39% |
| **Home & Kitchen** | 373 | 926 | **1,299** | 6.49% | 1,726 | 75.26% |
| **Toys & Games** | 168 | 586 | **754** | 3.77% | 758 | 99.47% |
| **Grocery & Household Essentials** | 245 | 123 | **368** | 1.84% | 369 | 99.73% |
| **Total** | **5,684** | **14,316** | **20,000** | **100.00%** | **31,289** | **63.92%** |

### Walmart Additions Stratified Sampling Detail

| Walmart Category | Eligible Pool Remaining | Proportional Quota | Selected Additions | Total in 20k Cohort | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Electronics** | 10,485 | 5,567.87 | **5,568** | 6,455 | **MATCH** |
| **Other** | 3,972 | 2,109.28 | **2,109** | 2,445 | **MATCH** |
| **Books & Stationery** | 1,989 | 1,056.23 | **1,056** | 1,224 | **MATCH** |
| **Clothing & Fashion** | 690 | 366.41 | **367** | 425 | **MATCH** |
| **Home & Kitchen** | 576 | 305.87 | **306** | 355 | **MATCH** |
| **Toys & Games** | 2 | 1.06 | **1** | 2 | **MATCH** |
| **Grocery & Household Essentials** | 0 | 0.00 | **0** | 1 | **MATCH** |
| **Beauty & Personal Care** | 0 | 0.00 | **0** | 0 | **MATCH** |
| **Total Walmart Additions** | **17,714** | **9,407.00** | **9,407** | **10,907** | **MATCH** |

---

## 5. Price & Multimodal Evidence Reconciliation

### Exact Price Reconciliation Table (ID-Level Verified)

$$\text{Core } (4,935) + \text{Additions } (11,526) = \text{Final 20,000 } (\mathbf{16,461})$$
$$\text{Final 20,000 } (16,461) + \text{Unselected } (8,307) = \text{Canonical Universe } (\mathbf{24,768})$$

| Marketplace | Canonical Universe Valid Price | Core 5,684 Valid Price | 14,316 Additions Valid Price | Final 20,000 Valid Price | Unselected Valid Price | % of Available Valid Prices Captured |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Walmart** | 19,214 | 1,500 | 9,407 | **10,907** | 8,307 | **56.77%** |
| **Amazon US** | 2,074 | 508 | 1,566 | **2,074** | 0 | **100.00%** |
| **Amazon India** | 1,485 | 1,000 | 485 | **1,485** | 0 | **100.00%** |
| **Myntra** | 1,000 | 1,000 | 0 | **1,000** | 0 | **100.00%** |
| **Flipkart** | 995 | 927 | 68 | **995** | 0 | **100.00%** |
| **BestBuy** | 0 | 0 | 0 | **0** | 0 | N/A (0 exist) |
| **Total** | **24,768** | **4,935** | **11,526** | **16,461** | **8,307** | **66.46%** |

### Multimodal Evidence Retention
- **NLP Review Intelligence:** **100.0%** ($3,627 / 3,627$) of all catalog products with usable reviews are retained.
- **CV Visual Embeddings:** **100.0%** ($1,647 / 1,647$) of all catalog products with ResNet-18 embeddings are retained.
- **Pricing Intelligence:** **66.46%** ($16,461 / 24,768$) overall valid-price coverage; **100.00%** ($5,554 / 5,554$) for non-Walmart marketplaces.

---

## 6. Automated Validation Suite Results

Execution of [`src/data/curation/validate_expanded_cohort_20000.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/data/curation/validate_expanded_cohort_20000.py) evaluated all 5 validation suites:

```
==================================================
Starting 20,000-Product Expanded Cohort Validation
==================================================
Suite 1: Dataset Integrity Validation...
[INFO] Suite 1 PASSED: Exactly 20,000 unique canonical product IDs.
Suite 2: Core Cohort Preservation & Disjointness...
[INFO] Suite 2 PASSED: Core 5,684 cohort 100% preserved; 14,316 additions 100% disjoint.
Suite 3: Approved Marketplace & Category Allocations...
[INFO] Suite 3 PASSED: All 6 marketplaces, 8 categories, and Walmart strata match exact approved counts.
Suite 4: Price Coverage & Evidence Modality Retention...
[INFO] Suite 4 PASSED: Price count 16,461 (66.46%); NLP 3,627 (100%); CV 1,647 (100%).
Suite 5: Protected Baseline Cryptographic Preservation...
[INFO] Suite 5 PASSED: All 14 baseline and core files bit-perfect and cryptographically preserved.
==================================================
ALL VALIDATION SUITES PASSED SUCCESSFULLY
==================================================
```

### Cryptographic Baseline Preservation (14 Files Verified)

| Protected File Path | Expected SHA-256 Checksum | Actual SHA-256 Checksum | Validation Result |
| :--- | :---: | :---: | :---: |
| `data/processed/canonical_products.parquet` | `b0a27e4803d5bf76d025da1abea2045e3920e61b26cf72343c5a0e6465e5cd0e` | `b0a27e4803d5bf76d025da1abea2045e3920e61b26cf72343c5a0e6465e5cd0e` | **MATCH** |
| `data/processed/canonical_reviews.parquet` | `17aa47d8aa60e447ce673e83fe2d8336e10c357c3afeb4e0a63503e46a01323c` | `17aa47d8aa60e447ce673e83fe2d8336e10c357c3afeb4e0a63503e46a01323c` | **MATCH** |
| `data/processed/canonical_images.parquet` | `bdae434ef284fa8e7f600c65b4dd6a8be04c77b464d20bce0d7641005cbc5187` | `bdae434ef284fa8e7f600c65b4dd6a8be04c77b464d20bce0d7641005cbc5187` | **MATCH** |
| `data/processed/image_embeddings_resnet18.npy` | `204d3c4269de94bb628cf6963a3ab524d20a0a1d462db1ee4117a225e3957e4c` | `204d3c4269de94bb628cf6963a3ab524d20a0a1d462db1ee4117a225e3957e4c` | **MATCH** |
| `data/processed/image_embeddings_resnet18_metadata.parquet` | `2efe37104caf761bf44c1710672f84c415cd623cef17bf7a8e675550ebb1f6f8` | `2efe37104caf761bf44c1710672f84c415cd623cef17bf7a8e675550ebb1f6f8` | **MATCH** |
| `data/processed/product_review_features.parquet` | `53bfe8d88446c241f41c4006d241da305a894106727f37c31eac6ebc20aff244` | `53bfe8d88446c241f41c4006d241da305a894106727f37c31eac6ebc20aff244` | **MATCH** |
| `data/processed/cv_product_features_expanded.parquet` | `ec5193486d76771c97ea649d1f8a76a993dd83aa68fa87ce2a431b3f0ad12ffd` | `ec5193486d76771c97ea649d1f8a76a993dd83aa68fa87ce2a431b3f0ad12ffd` | **MATCH** |
| `data/processed/cv_product_embeddings_expanded.npy` | `e0216dfc6bc0ae481e7003ac638278a427749bc874dc48085c39490207d3430b` | `e0216dfc6bc0ae481e7003ac638278a427749bc874dc48085c39490207d3430b` | **MATCH** |
| `data/processed/cv_product_embeddings_metadata.parquet` | `b638ed83907f656319fed644b08511418b23cfaa106bb3dba6b21a3de067a20c` | `b638ed83907f656319fed644b08511418b23cfaa106bb3dba6b21a3de067a20c` | **MATCH** |
| `data/processed/image_quality_report.parquet` | `4acfcbeff74ba226ab69a7f513d6b0d487980e8b3f4631b7979e0c5a6616ca9a` | `4acfcbeff74ba226ab69a7f513d6b0d487980e8b3f4631b7979e0c5a6616ca9a` | **MATCH** |
| `data/interim/product_pricing_cohort.parquet` | `0b4b7b6fd7835224c4438838f3ed012e991245232f1901c3cd896955f120b3c0` | `0b4b7b6fd7835224c4438838f3ed012e991245232f1901c3cd896955f120b3c0` | **MATCH** |
| `data/curated/curated_products_5684.parquet` | `abcdb9e0e729d26113d9781910c614a8f36f1fee5f88aabbe18430666baa9024` | `abcdb9e0e729d26113d9781910c614a8f36f1fee5f88aabbe18430666baa9024` | **MATCH** |
| `data/curated/cohort_membership.parquet` | `17ab50e37f5a9313fc44296db41eb4ce3dcab41745fb3de1bbb6b9caa8312d1e` | `17ab50e37f5a9313fc44296db41eb4ce3dcab41745fb3de1bbb6b9caa8312d1e` | **MATCH** |
| `data/curated/cohort_metadata.json` | `67899824b9803d126fcc19ceacd085e9a02d949678a99b1fe5207e02a5db2d54` | `67899824b9803d126fcc19ceacd085e9a02d949678a99b1fe5207e02a5db2d54` | **MATCH** |

---

## 7. Focused Reproducibility Test Suite Results

Execution of [`scratch/test_expanded_reproducibility.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/scratch/test_expanded_reproducibility.py) verified:

```
==================================================
Testing 20,000-Cohort Deterministic Reproducibility
==================================================

[Test 1] Running independent generation with seed 42...
PASS: Run 1 and Run 2 produce 100% identical canonical product IDs (20,000 / 20,000).
PASS: Row ordering and ID alignment are 100% identical.

[Test 2] Testing seed sensitivity (seed 999 vs seed 42)...
Walmart sample overlap between seed 42 and seed 999: 4938 / 9407 (52.49%)
PASS: Seed sensitivity confirmed. Sampling is truly parameterized by random_seed.

[Test 3] Testing core subset invariance...
PASS: Core 5,684 cohort is 100% invariant and preserved.

==================================================
ALL REPRODUCIBILITY TESTS PASSED!
==================================================
```

---

## 8. Conclusion & Operational Status

The expanded 20,000-product analytical cohort is fully generated, validated, and reproducible.
- **Dataset location:** [`data/curated/curated_products_20000.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/curated/curated_products_20000.parquet)
- **Membership location:** [`data/curated/cohort_membership_20000.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/curated/cohort_membership_20000.parquet)
- **Metadata location:** [`data/curated/cohort_metadata_20000.json`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/curated/cohort_metadata_20000.json)
- **Core 5,684 cohort:** 100% preserved unmodified.
- **Source catalog & CV artifacts:** Cryptographically protected and intact.
