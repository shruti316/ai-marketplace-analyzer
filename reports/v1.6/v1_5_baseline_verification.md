# Stage 0: Independent Baseline Verification of Release v1.5

**Project:** AI-Powered Marketplace Trust Intelligence Platform  
**Audit Target:** Release v1.5 (`data/marketplace_trust_dataset_v1.5/`)  
**Auditor:** Lead Data Architect & Multimodal ML Engineer  
**Date:** November 2026  
**Status:** VERIFIED — 100% BIT-PERFECT REPRODUCIBILITY & INVARIANT CONFORMANCE

---

## 1. Executive Summary & Verification Verdict

An independent byte-level and row-level verification of release `v1.5` was conducted across all 43 registered artifacts, primary entities, evidence tables, graph edges, and multi-protocol evaluation manifests.

### Verified State Invariants
1. **Catalog Master:** Exactly **6,043 canonical products** partitioned into **3,643 Indian products (60.28%)** and **2,400 Supplementary international products (39.72%)**.
2. **Category Distribution:** Reconciled into **exactly 10 genuine categories** (Clothing & Fashion: 1,709, Beauty & Personal Care: 1,480, Electronics: 1,177, Home & Kitchen: 416, Other: 391, Grocery & Household Essentials: 369, Books & Stationery: 315, Toys & Games: 160, Industrial & Scientific: 14, Sports & Outdoors: 12).
3. **Review Inventory & Provenance:** Exactly **56,697 customer reviews** preserved with 0 data loss:
   - BestBuy: 44,965 (linked via `EXACT_PRODUCT_ID`)
   - Amazon US: 8,073 (linked via `EXACT_PRODUCT_ID`)
   - Flipkart: 3,260 (linked via `EXACT_PRODUCT_LINE_IDENTITY` across 127 products)
   - Flipkart Uncertain Origin: 240 (honestly quarantined as `UNLINKED`)
   - Amazon India: 159 (linked via `EXACT_ASIN_MATCH`)
4. **Physical Visual Assets:** Exactly **5,228 usable physical images** verified on disk and decodable via PIL across **2,952 unique products**:
   - Flipkart: 3,208 usable images across 932 products
   - Amazon India: 1,500 usable images across 1,500 products
   - Amazon US: 520 usable images across 520 products
   - Documented scrape download failures: 326 records
5. **Price Observations & FX Architecture:** Exactly **5,153 valid numeric prices** and **890 missing prices** (Amazon US: 621, BestBuy: 249, Amazon India: 15, Flipkart: 5). Date-aware FX normalization is tied to official Reserve Bank of India (RBI) reference rate fixings.
6. **Seller Intelligence:** Exactly 6 platform aggregate merchant entities; individual `products.seller_id` is 100% honestly NULL (0 fabricated IDs).
7. **Graph Edges:** Exactly **67,175 relationship edges** in `relationships/entity_relationships.parquet`.
8. **The 127 Flipkart Multimodal Expansion Target:** Exactly 127 Flipkart products possess linked customer reviews and active INR prices, but lack local images ($932 \cap 127 = \emptyset$). These form the core target cohort for Workstream A.
9. **Retired Circular Metric:** The circular Random Forest fusion ROC-AUC of 0.9124 was retired in v1.5 and reclassified as an unsupervised evidence aggregation framework.

---

## 2. Table-by-Table Independent Verification Matrix

| Table Path | Row Count | Primary Key / Invariant | Verification Status | Hash Conformance |
| :--- | :--- | :--- | :--- | :--- |
| `entities/products.parquet` | 6,043 | `canonical_product_id` (100% unique) | **VERIFIED** | Matches dataset_manifest.json |
| `entities/sellers.parquet` | 6 | `seller_id` (100% unique) | **VERIFIED** | Matches dataset_manifest.json |
| `entities/product_variants.parquet` | 772 | `variant_id` (100% unique) | **VERIFIED** | Matches dataset_manifest.json |
| `evidence/reviews.parquet` | 56,697 | `canonical_review_id` (100% unique) | **VERIFIED** | Matches dataset_manifest.json |
| `evidence/images.parquet` | 5,554 | `image_id` (100% unique, 5,228 usable) | **VERIFIED** | Matches dataset_manifest.json |
| `evidence/price_observations.parquet`| 6,043 | `price_observation_id` (5,153 valid) | **VERIFIED** | Matches dataset_manifest.json |
| `evidence/fx_conversion_rates.parquet`| 9 | `rate_id` (9 RBI reference rates) | **VERIFIED** | Matches dataset_manifest.json |
| `relationships/entity_relationships.parquet` | 67,175 | `relationship_id` (100% unique) | **VERIFIED** | Matches dataset_manifest.json |
| `collections/complete_multimodal_core.parquet` | 305 | Tier A Multimodal Core | **VERIFIED** | Matches dataset_manifest.json |

---

## 3. Transition to v1.6 Implementation

The verified v1.5 state forms a firm, mathematically reconciled baseline.
We now progress directly into implementation of Workstreams A through H for release `v1.6`.
