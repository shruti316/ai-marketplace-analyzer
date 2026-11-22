# Independent Verification Report — Indian Marketplace Trust Dataset v1.1

**Project:** AI-Powered Marketplace Trust Intelligence Platform  
**Dataset Under Verification:** `data/indian_marketplace_trust_dataset_v1_1/`  
**Execution Date:** 2026-11-05  
**Auditor:** Senior Data Quality Auditor & Multimodal ML Architect  
**Objective:** Independent targeted verification of recovered review linkages, visual embeddings, graph topology, coverage matrix tiers, and category reclassifications without mutating frozen releases.

---

## Executive Summary & Scorecard

| Verification Area | Status | Key Findings | Action Required |
| :--- | :---: | :--- | :--- |
| **1. Recovered Review Associations** | **PASS (Corroborated)** | 240/240 reviews are `MULTI_FIELD_CONFIRMED` across 24 products (exact title + 100% exact INR price + brand + unique catalog title). `EXACT_ID` is 0 due to upstream raw schema lacking native product IDs. | Document as corroborated secondary matches in provenance registry. |
| **2. Visual Embedding Integrity** | **PASS** | Exactly 4,708 512-dim unit-normalized ResNet-18 vectors matching 4,708 usable images (1-to-1 parity, 0 missing, 0 foreign leakage, max norm error $1.19 \times 10^{-7}$). 100% physical image files verified on disk. | None. Fully certified. |
| **3. Graph Topology & Semantics** | **PARTIAL** | **Structural: PASS** (11,990 edges, 0 orphaned sources/targets, 0 duplicate edges, 0 self-loops, 100% review semantic consistency). **Merchant Graph: PARTIAL** (0 `SOLD_BY` merchant edges; sellers represented at platform level). | Clarify graph scope: Product-Evidence graph is complete; merchant subgraph is platform-level only. |
| **4. Coverage Matrix Recomputation** | **PASS** | Recomputed all 3,643 products independently. Exact reconciliation: Tier A = 5 (0.14%), Tier B = 2,550 (70.00%), Tier C = 1,088 (29.86%), Tier D = 0 (0.00%). | None. Reconciles bit-for-bit. |
| **5. Category Reclassification & Provenance** | **PARTIAL** | 127 products reclassified from "Other". 23 (18.1%) have explicit title keyword evidence; 104 (81.9%) rely on rule-based heuristic inference (96 mapped to `Home & Kitchen / Household Essentials`). Provenance and CC0/research licensing fully compliant. | Tag 96 products as `INFERRED_HEURISTIC` in metadata for refinement in v1.2. |

---

## 1. Recovered Review Association Audit (240 Reviews)

### 1.1 Methodology & Schema Reality
The 240 recovered reviews originate from `data/raw/flipkart/flipkart_reviews_raw.csv`. The raw source schema contains:
`['product_name', 'product_price', 'Rate', 'Review', 'text', 'labels', 'sentiment_code']`
**Crucial Architectural Finding:** The upstream scrape corpus did **not** collect a native Flipkart primary key (`product_id` or `fsn`). Therefore, direct exact primary-key joining (`EXACT_ID`) is impossible by schema definition.

### 1.2 Association Classification
Every recovered review was evaluated against our 5-tier classification standard:

| Classification | Count | % | Definition & Criteria |
| :--- | :---: | :---: | :--- |
| **`EXACT_ID`** | **0** | 0.0% | Upstream record contains native product ID or URL. Not possible due to raw schema. |
| **`MULTI_FIELD_CONFIRMED`** | **240** | 100.0% | Exact title string equality + unique catalog title occurrence (1:1) + 100% exact INR price agreement + marketplace agreement + brand verified from title. |
| **`TITLE_ONLY`** | **0** | 0.0% | Title matches without secondary corroborating price/brand evidence. |
| **`AMBIGUOUS`** | **0** | 0.0% | Title matches multiple products in the catalog. |
| **`REJECTED`** | **0** | 0.0% | Contradictory price, brand, or marketplace evidence. |

### 1.3 Detailed Corroboration Breakdown across 24 Matched Products
All 240 reviews map to **24 distinct Flipkart products**. In all 24 cases:
1. **Price Concordance:** `raw_price` matches `normalized_price_inr` **100% down to the exact rupee** (e.g., IFB Neptune SX1 @ ₹38,490, Bosch SMS66GW01I @ ₹44,890, Glun Water Tester @ ₹199).
2. **Catalog Uniqueness:** Each title appears exactly once in the 3,643 product catalog (frequency = 1).
3. **Brand & Model Concordance:** High-specificity identifiers (e.g. `DFB424FW`, `SMS66GW01I`, `15 Place Settings`, `1.5 Litre`, `0-990 PPM`) ensure zero variant ambiguity.

```
Sample Corroborated Products:
• flipkart_rec_0326EBBB9B53: "IFB Neptune SX1 Free Standing 15 Place Settings..." | 23 reviews | Price: ₹38,490 == ₹38,490
• flipkart_rec_37787B083236: "Bosch Free Standing 13 Place Settings Dishwasher..."  | 30 reviews | Price: ₹44,890 == ₹44,890
• flipkart_rec_6A863527673D: "Glun Water Quality Purity Tester 0-990 PPM..."       | 36 reviews | Price: ₹199 == ₹199
• flipkart_rec_DD0BEF8739CC: "Butterfly Rapid Kettle 1.5 Litre + Eco 750 Ml..."     | 15 reviews | Price: ₹849 == ₹849
```

**Scientific Caveat:** In dataset documentation and downstream ML training, these 240 records must remain classified as `MULTI_FIELD_CONFIRMED` (secondary corroboration) rather than promoted to native ground truth.

---

## 2. Visual Embedding Integrity Audit

### 2.1 Embedding Vector & Metadata Audit
- **Artifact:** `data/indian_marketplace_trust_dataset_v1_1/derived_evidence/visual_embeddings_resnet18.npz`
- **Embedding Dimensions:** Exactly `(4,708, 512)` (float32).
- **Physical Parity:** Exactly 4,708 embeddings matching 4,708 usable images in `evidence/images.parquet` (1-to-1 parity).
  - Missing image embeddings: **0**
  - Unrecognized / foreign embeddings: **0** (520 Walmart/BestBuy vectors from v1.7 completely eradicated)
  - Duplicate image IDs in NPZ: **0**
- **Numerical Validity:**
  - `has_nans`: **False**
  - `has_infs`: **False**
  - Unit-norm verification: Mean norm = $1.000000$, Max deviation from $1.0 = 1.192 \times 10^{-7}$ ($\ll 10^{-4}$ tolerance).
- **Model Provenance:**
  - Architecture: `torchvision.models.resnet18`
  - Weights: `ResNet18_Weights.DEFAULT` (ImageNet1k_v1)
  - Normalization: $L_2$ unit normalization applied.

### 2.2 Physical Asset Availability & Bit-for-Bit Checksums
- **Local File Existence:** All **4,708 of 4,708** usable image files physically exist on local disk at `data/indian_marketplace/raw/images/...`.
- **Cryptographic Sample Validation:** Evaluated 100 randomly sampled local image files against recorded `content_hash_sha256`:
  - Matching SHA-256 hashes: **100 / 100 (100.0%)**
  - Corrupted or modified files: **0**
- **Verdict:** **PASS**.

---

## 3. Graph Semantic & Structural Integrity Audit

### 3.1 Structural Edge Validation (11,990 Edges)
- **Table:** `relationships/entity_relationships.parquet`
- **Edge Counts by Type:**
  - `HAS_IMAGE`: 4,708 edges
  - `HAS_REVIEW`: 3,659 edges
  - `HAS_PRICE`: 3,623 edges
  - Total: **11,990 edges**
- **Structural Integrity Checks:**
  - Duplicate edges: **0**
  - Self-referential edges: **0**
  - Orphaned source entities (not in `products.parquet`): **0**
  - Orphaned target entities (not in `images`, `reviews`, or `price_observations`): **0**
- **Structural Verdict:** **PASS**.

### 3.2 Semantic Verification & Merchant Graph Status
- **Review Semantic Association:**
  - Verified every `HAS_REVIEW` edge against `evidence/reviews.parquet`.
  - Mismatched product-review associations: **0** (100% semantic concordance).
- **Seller Identity Verification:**
  - `SOLD_BY` edges count: **0** in `entity_relationships.parquet`.
  - The catalog entities table `entities/sellers.parquet` registers 3 marketplace platform entities (`amazon_in_platform`, `flipkart_platform`, `myntra_platform`).
  - Raw public web crawl dumps do not contain individual third-party merchant IDs.
- **Semantic Verdict:** **PARTIAL**. The product-evidence graph is fully verified; merchant node analysis is limited to platform-level entities.

---

## 4. Coverage Matrix Independent Recomputation

### 4.1 Product-Level Reconciliation
- **Coverage Matrix Table:** `derived_evidence/multimodal_coverage_matrix.parquet` (3,643 rows, 20 columns).
- **Product Set Symmetry:** Symmetrically identical to `entities/products.parquet` ($3,643 = 3,643$, 0 missing, 0 extra).

### 4.2 Independent Recomputation vs. Matrix File

| Modality Tier | Independent Recomputation | Recorded in Matrix | Status | Details |
| :--- | :---: | :---: | :---: | :--- |
| **Tier A (Complete Multimodal)** | **5** (0.14%) | **5** (0.14%) | **PASS** | Title + Image + Reviews + Price |
| **Tier B (3 Modalities)** | **2,550** (70.00%) | **2,550** (70.00%) | **PASS** | 2,407 Image+Price, 143 Review+Price |
| **Tier C (2 Modalities)** | **1,088** (29.86%) | **1,088** (29.86%) | **PASS** | 1,068 Metadata+Price, 20 Metadata+Image |
| **Tier D (Single Modality)** | **0** (0.00%) | **0** (0.00%) | **PASS** | 0 abandoned products |
| **Total Products** | **3,643** (100.0%) | **3,643** (100.0%) | **PASS** | Exact 100% reconciliation |

### 4.3 Evidence Modality Breakdown
- `valid_price_available`: 3,623 / 3,643 (99.45%)
- `valid_image_count` > 0: 2,432 / 3,643 (66.76%)
- `valid_review_count` > 0: 148 / 3,643 (4.06%)
- Missing modalities correctly identified:
  - Products missing reviews: 3,495 (95.94%)
  - Products missing usable images: 1,211 (33.24%) (1,143 missing, 68 invalid)
  - Products missing prices: 20 (0.55%)
- **Verdict:** **PASS**.

---

## 5. Category Reclassification & Provenance Audit

### 5.1 Category Reclassification Breakdown (127 Products)
The 127 products categorized as "Other" in v1.0 were reclassified in v1.1 into four e-commerce categories:
- **Home & Kitchen:** 97 products
  - `Household Essentials`: 96 products
  - `Bedding & Linen`: 1 product
- **Automotive & Accessories:** 25 products
  - `Vehicle Accessories`: 25 products
- **Clothing & Fashion:** 3 products
  - `Innerwear & Apparel`: 3 products
- **Beauty & Personal Care:** 2 products
  - `Hair & Skin Care`: 2 products

### 5.2 Defensibility & Heuristic Inference Analysis
- **Explicit Keyword Concordance:** 23 / 127 products (18.1%) have direct title keyword matches (e.g. *"Two wheeler Cover"*, *"Cotton Cartoon Bedspread"*, *"Men's Boxer"*, *"Conditioner"*).
- **Heuristic Fallback:** 104 / 127 products (81.9%) were assigned via default taxonomy assignment, with 96 unclassified general goods assigned to `Home & Kitchen / Household Essentials`.
- **Finding:** While eliminating vague "Other" buckets is beneficial for database indexing, mapping 96 disparate items into `Household Essentials` is an **inferred heuristic**, not ground truth.
- **Verdict:** **PARTIAL**. Defensible for baseline downstream training, but must be explicitly documented and flagged.

### 5.3 Source Provenance & Licensing Status
- **Catalogs:** PromptCloud Amazon India, Flipkart, and Myntra crawl caches (`PERMITTED_RESEARCH_BENCHMARK`).
- **Review Benchmark:** Kaggle Flipkart Reviews dataset (`PERMITTED_PUBLIC_RESEARCH`, CC0 Public Domain).
- **Redistribution Terms:** All assets are compliant for academic and research evaluation.
- **Collection Timestamps:** Baseline collected 2026-11-01 / 2026-11-02; v1.1 enrichment executed 2026-11-05.

---

## 6. Release Certification Retention & Roadmap Recommendations

### 6.1 Certification Verdict
**v1.1 RETAINS ITS CERTIFICATION** for multimodal marketplace trust benchmarking with the following formal qualifications:
1. **Review Provenance:** The 240 recovered reviews are certified as `MULTI_FIELD_CONFIRMED` secondary associations.
2. **Visual Parity:** ResNet-18 embeddings are certified at 100% exact 1-to-1 physical parity (4,708 / 4,708).
3. **Graph Topology:** The Product-Evidence graph (11,990 edges) is certified structurally and semantically; merchant graph analysis is certified at the platform level.
4. **Coverage Matrix:** Certified 100% reproducible and reconciled bit-for-bit.

### 6.2 Recommended Refinements for v1.2
1. **Taxonomy Granularity:** Run a zero-shot LLM / embedding-based categorizer over the 96 `Household Essentials` products to extract native granular categories (e.g., *Hardware & Tools*, *Electrical Fittings*).
2. **Review Linkage Metadata:** Add an explicit column `linkage_corroboration_type` (`PRIMARY_KEY_EXACT` vs `MULTI_FIELD_CORROBORATED`) to `evidence/reviews.parquet`.
3. **Merchant Subgraph:** When merchant ID scraping becomes feasible outside sandbox environments, attach explicit merchant nodes and `SOLD_BY` relationships.

---
*Report certified by Independent Technical Verification Pipeline.*
