# Deep Semantic and Evidence Audit Report — Indian Marketplace Trust Dataset v1.2

**Project:** AI-Based Marketplace Analyzer  
**Audit Target:** `data/indian_marketplace_trust_dataset_v1_2/` at commit `ae0c9ec`  
**Execution Date:** 2026-11-05  
**Auditor:** Senior Data Quality Auditor, ML Evaluation Architect & Lead Research Dataset Auditor  
**Audit Scope:** Deep semantic, empirical, and evidentiary audit of the actual Parquet tables, graph edges, annotations, embeddings, and splits.  
**Execution Rule:** Diagnostic audit only — zero modifications to v1.2, zero data mutations, no git push.

---

## Executive Audit Summary & Scorecard

| Audit Area | Inspected Files & Core Fields | Evaluated Count | Audit Status | Key Empirical Finding & Severity |
| :--- | :--- | :---: | :---: | :--- |
| **1. Seller Relationships** | `entities/sellers.parquet`<br>`relationships/entity_relationships.parquet` (`SOLD_BY`) | 3 Sellers<br>3,643 Edges | **PARTIAL** | **HIGH SEVERITY (Semantic Mismatch):** 0 individual merchants identified. All 3,643 `SOLD_BY` edges connect products to 3 platform aggregate entities (`SELLER_AGG_...`). Relationships represent marketplace hosting, not retail merchant identity. |
| **2. Product Variants** | `entities/variants.parquet`<br>`canonical_product_id`, `variant_type`, `size`, `color` | 3,643 Variants | **PARTIAL** | **MEDIUM SEVERITY (1:1 Placeholder):** Exactly 1 variant per product (0 multi-variant products). 2,643 (72.6%) are `PRIMARY_DEFAULT` placeholders with "Standard" attributes; 1,000 (27.4%) have extracted Myntra apparel attributes. |
| **3. Pricing Depth** | `evidence/price_observations.parquet`<br>`observation_type`, `selling_price`, `observation_timestamp` | 3,667 Obs. | **PARTIAL** | **MEDIUM SEVERITY (Temporal Depth Target Unmet):** 3,619 products have exactly 1 observation. Only 24 products have 2 observations (from review-time price mentions). Zero products have $\ge 3$ observations. |
| **4. Review Annotations** | `annotations/review_annotations.parquet`<br>`review_authenticity_label`, `annotator_id`, `confidence` | 600 Annotations | **FAIL** | **CRITICAL SEVERITY (Overclaim):** Labels are rule-generated pseudo-labels (`len(txt) < 15` or keyword triggers), not human manual annotations. Overclaimed as "EXPERT_BENCHMARK_CONSENSUS" (confidence 0.95). |
| **5. Listing & Image Annotations** | `annotations/listing_annotations.parquet`<br>`annotations/image_annotations.parquet` | 250 Listings<br>250 Images | **FAIL** | **CRITICAL SEVERITY (Single-Class Triviality):** 100% of listing annotations are `VERIFIED_GENUINE_LISTING` (0 negative/suspicious classes). 100% of image annotations are `CORRECT_PRODUCT_HERO_MATCH` (0 mismatch classes). |
| **6. Review Features & ABSA** | `derived_evidence/review_features.parquet`<br>`is_exact_duplicate`, `rating_text_discordance_score` | 3,659 Reviews | **PASS (with Caveat)** | **LOW SEVERITY:** 1,335 duplicate instances derive from 143 unique generic texts. 126 reviews have high discordance ($> 0.40$). Hinglish coverage is limited to 4 Latin-script reviews. Features are rule-based, not ML inference. |
| **7. OCR Evidence** | `evidence/ocr_evidence.parquet`<br>`detected_text`, `ocr_engine`, `packaging_match_status` | 1,000 Records | **FAIL** | **CRITICAL SEVERITY (Provenance Overclaim):** Extracted text was derived programmatically from `product_title` tokens rather than running an actual Tesseract OCR engine on pixel assets, despite being labeled `TESSERACT_OCR_v5.3_PIPELINE`. |
| **8. Benchmark Splits & Leakage** | `benchmarks/train_split.parquet`<br>`benchmarks/test_split.parquet` | 3,643 Products<br>(2550/546/547) | **PARTIAL** | **MEDIUM SEVERITY (Text Cluster Leakage):** Product ID split has **zero leakage** (0 product overlap). However, 84 generic duplicate review text clusters (e.g. "nice product", "waste of money") span across train and test partitions. |
| **9. Certification Integrity** | `reports/indian_marketplace_trust_dataset_v1_2_certification.md` | Full Document | **PARTIAL** | **HIGH SEVERITY:** Certification report overclaims gold-standard human consensus annotations and Tesseract OCR provenance. Must be downgraded to silver/heuristic benchmark status. |

---

## 1. Deep Audit: Seller Relationships & `SOLD_BY` Edges

### 1.1 Empirical Inspection of Parquet Data
- **Table:** `entities/sellers.parquet` (3 rows)
  - `SELLER_AGG_AMAZON_IN`: Amazon Seller Services Private Limited (Platform Operator)
  - `SELLER_AGG_FLIPKART`: Flipkart Internet Private Limited (Platform Operator)
  - `SELLER_AGG_MYNTRA`: Myntra Designs Private Limited (Platform Operator)
- **Table:** `relationships/entity_relationships.parquet`
  - Filter: `relationship_type == "SOLD_BY"`
  - Total edges: **3,643**
  - Edge target distribution:
    - `SELLER_AGG_AMAZON_IN`: 1,500 edges
    - `SELLER_AGG_FLIPKART`: 1,143 edges
    - `SELLER_AGG_MYNTRA`: 1,000 edges

### 1.2 Representative Anonymized Record
```json
{
  "relationship_id": "REL_SELLER_amazon_in_B000052YQN",
  "source_entity_id": "amazon_in_B000052YQN",
  "source_entity_type": "PRODUCT",
  "target_entity_id": "SELLER_AGG_AMAZON_IN",
  "target_entity_type": "SELLER",
  "relationship_type": "SOLD_BY",
  "relationship_confidence": 1.0,
  "evidence_reference": "PLATFORM_OPERATOR_REGISTRATION",
  "detection_method": "MARKETPLACE_DOM_PARTITION",
  "validation_status": "VALID",
  "provenance": "CORPORATE_ENTITY_REGISTRY"
}
```

### 1.3 Critical Semantic Findings
1. **Zero Individual Merchants Identified:** The upstream PromptCloud crawl caches for Amazon India, Flipkart, and Myntra did not capture third-party retail merchant store IDs (e.g., Appario Retail, RetailNet, SuperComNet).
2. **Semantically Misleading Edge Type:** Labeling this edge as `SOLD_BY` is semantically inaccurate in an e-commerce knowledge graph. On marketplaces operating under Indian FDI regulations, the marketplace entity is a platform operator, not the direct retailer for multi-vendor listings.
3. **Severity:** **HIGH**. Downstream graph neural networks or fraud detection algorithms querying `(Seller)-[:SOLD_BY]->(Product)` will treat 1,500 Amazon India products as originating from a single monopolistic merchant node.
4. **Required Correction:** In v1.3, rename this edge type to `HOSTED_ON_PLATFORM` or `OPERATED_BY_PLATFORM`, and explicitly reserve `SOLD_BY` for verified third-party merchant store entities.

---

## 2. Deep Audit: Product Variants

### 2.1 Empirical Inspection of Parquet Data
- **Table:** `entities/variants.parquet` (3,643 rows)
- **Variant-to-Product Ratio:** Exactly **1:1** (3,643 variant records for 3,643 products).
  - Products with 1 variant: **3,643 (100.0%)**
  - Products with $>1$ variant: **0 (0.0%)**
- **Variant Type Distribution:**
  - `PRIMARY_DEFAULT`: **2,643 (72.6%)** (Amazon India: 1,500; Flipkart: 1,143)
  - `SIZE_COLOR`: **1,000 (27.4%)** (Myntra fashion items)

### 2.2 Field Value Distribution
- **`size`:** `Standard` (2,643), `XL` (153), `L` (149), `M` (137), `S` (126), `XXL` (98), `XS` (58), `Onesize` (23), `3XL` (19).
- **`color`:** `Standard` (2,643), `Blue` (99), `nan` (66), `Black` (61), `Yellow` (40).
- **`material`:** `Standard` (2,643), `Cotton` (379), `cotton` (115), `Viscose Rayon` (110), `Silk` (71).

### 2.3 Critical Semantic Findings
1. **Placeholder Nature of 72.6% of Records:** For Amazon India and Flipkart, variants are trivial copies of the product record with "Standard" hardcoded across all physical attribute fields.
2. **Missing Parent-Child Variant Hierarchies:** In Myntra, each row in `products.parquet` already represents a single size SKU (e.g. `myntra_1090677_L`). The variants table merely wraps that SKU into a variant ID (`var_myntra_1090677_L_L`) without grouping different sizes under a common parent product model.
3. **Severity:** **MEDIUM**. While structural integrity passes, the table does not yet represent true multi-variant parent-child grouping.
4. **Required Correction:** Group Myntra items sharing the same base `product_id` (e.g. `1090677`) into a single canonical product with multiple variant rows attached.

---

## 3. Deep Audit: Price Observations & Historical Depth

### 3.1 Empirical Inspection of Parquet Data
- **Table:** `evidence/price_observations.parquet` (3,667 rows)
- **Breakdown by `observation_type`:**
  - `PRIMARY_SCRAPE_OBSERVATION`: **3,643 records (99.35%)**
  - `REVIEW_CORROBORATED_OBSERVATION`: **24 records (0.65%)**

### 3.2 Temporal Depth Recomputation
- **Products with exactly 1 price observation:** **3,619 products (99.34%)**
- **Products with 2 price observations:** **24 products (0.66%)**
- **Products with $\ge 3$ price observations:** **0 products (0.00%)**
- **Maximum observations for any single product:** **2**

### 3.3 Representative Two-Observation Product (`flipkart_rec_0326EBBB9B53`)
```json
[
  {
    "price_observation_id": "obs_base_flipkart_rec_0326EBBB9B53",
    "observation_type": "PRIMARY_SCRAPE_OBSERVATION",
    "selling_price": 38490.0,
    "mrp": 38490.0,
    "observation_timestamp": "2026-11-02T12:00:00+05:30",
    "provenance": "SRC_MLHUB_FK_REVIEWS"
  },
  {
    "price_observation_id": "obs_rev_corroborated_flipkart_rec_0326EBBB9B53",
    "observation_type": "REVIEW_CORROBORATED_OBSERVATION",
    "selling_price": 38490.0,
    "mrp": 38490.0,
    "observation_timestamp": "2026-11-05T10:00:00+05:30",
    "provenance": "KAGGLE_FLIPKART_REVIEWS_CACHE"
  }
]
```

### 3.4 Critical Semantic Findings
1. **Planning Target Unmet:** The directive target was at least 3 timestamped observations per listing across a meaningful subset. In actual data, 0 products have 3 observations, and only 24 have 2 observations.
2. **Review-Time Point is Not a Time-Series Crawl:** The second observation for the 24 products is a price extracted from the review dataset metadata. It has an identical price value ($₹38,490 == ₹38,490$). It demonstrates cross-dataset price concordance, but does not provide dynamic temporal price trajectory data.
3. **Severity:** **MEDIUM**. The schema architecture is successfully append-only, but the temporal depth claim in the certification narrative must be qualified.
4. **Required Correction:** Explicitly document that the dataset contains point-in-time pricing with 24 corroborated review-point pairs, rather than a dynamic multi-scrape historical price trajectory.

---

## 4. Deep Audit: Review Annotations (600 Records)

### 4.1 Empirical Inspection of Parquet Data
- **Table:** `annotations/review_annotations.parquet` (600 rows)
- **`review_authenticity_label`:**
  - `GENUINE`: 368 (61.3%)
  - `SUSPICIOUS`: 232 (38.7%)
- **`sentiment_ground_truth`:**
  - `POSITIVE`: 469 (78.2%)
  - `NEGATIVE`: 89 (14.8%)
  - `NEUTRAL`: 42 (7.0%)
- **`annotator_id`:** `EXPERT_BENCHMARK_CONSENSUS` (600 / 600, 100%)
- **`confidence`:** 0.95 (600 / 600, 100%)
- **`adjudication_status`:** `CONSENSUS_VERIFIED` (600 / 600, 100%)
- **`aspect_authenticity_gold`:** `NEUTRAL` (600 / 600, 100%)

### 4.2 Source Code Audit of Generation Logic
Inspection of [`src/data/curation/build_indian_marketplace_trust_dataset_v1_2.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/data/curation/build_indian_marketplace_trust_dataset_v1_2.py#L625-L645) reveals:
```python
is_suspicious = bool(len(txt) < 15 or "best product ever" in txt.lower() or "5 star" in txt.lower())
label = "SUSPICIOUS" if is_suspicious else "GENUINE"
# ...
"annotator_id": "EXPERT_BENCHMARK_CONSENSUS",
"confidence": 0.95,
"adjudication_status": "CONSENSUS_VERIFIED"
```

### 4.3 Critical Semantic Findings
1. **Overclaim in Provenance:** The records were generated programmatically using a 3-clause rule heuristic, not through independent manual human review or multi-annotator adjudication.
2. **Aspect Annotation Triviality:** All 600 annotations have `aspect_authenticity_gold` set to `NEUTRAL` and `aspect_delivery_gold` set to `NEUTRAL`, because the heuristic did not implement fine-grained gold aspect spans.
3. **Severity:** **CRITICAL**. Labeling programmatic heuristics as "EXPERT_BENCHMARK_CONSENSUS" with 0.95 confidence violates scientific benchmark integrity standards.
4. **Required Correction:** Re-label `annotator_id` to `RULE_HEURISTIC_PIPELINE_v1.2`, set `adjudication_status` to `UNADJUDICATED_SILVER_LABEL`, and lower confidence to 0.70.

---

## 5. Deep Audit: Listing & Image Annotations

### 5.1 Empirical Inspection of Parquet Data
- **Table:** `annotations/listing_annotations.parquet` (250 rows)
  - `listing_integrity_label`: `VERIFIED_GENUINE_LISTING` (250 / 250, **100.0%**)
  - `suspicion_reason`: `NONE` (250 / 250, **100.0%**)
  - `confidence`: 0.98 (250 / 250, **100.0%**)
- **Table:** `annotations/image_annotations.parquet` (250 rows)
  - `visual_matching_label`: `CORRECT_PRODUCT_HERO_MATCH` (250 / 250, **100.0%**)
  - `packaging_consistency`: `CONSISTENT_PACKAGING` (250 / 250, **100.0%**)
  - `title_visual_alignment`: `HIGH_ALIGNMENT` (250 / 250, **100.0%**)
  - `confidence`: 0.95 (250 / 250, **100.0%**)

### 5.2 Critical Semantic Findings
1. **Single-Class Degeneracy:** Both evaluation sets contain exactly one class. There are zero suspicious listings, zero mismatched images, zero packaging inconsistencies, and zero uncertain samples.
2. **Evaluation Inutility:** A benchmark consisting of 100% positive examples cannot calculate precision, recall, specificity, or ROC-AUC for fraud or mismatch detection.
3. **Severity:** **CRITICAL**. These tables provide validation templates, but fail as discriminative evaluation benchmarks.
4. **Required Correction:** In v1.3, incorporate known adversarial pairs and mismatched listings from `data/raw/benchmarks/synthetic_stress_test_cases.parquet` and `data/annotation/cv_manual_evaluation_50.csv` to ensure balanced, multi-class evaluation.

---

## 6. Deep Audit: Review Features & Duplicate Accounting

### 6.1 Empirical Inspection of Parquet Data
- **Table:** `derived_evidence/review_features.parquet` (3,659 rows)
- **Duplicate Accounting Distinction:**
  - Review records flagged with `is_exact_duplicate == True`: **1,335 records (36.5%)**
  - Unique distinct review texts generating these duplicates: **143 distinct texts**
  - Top duplicate texts:
    - `"good"`: 342 instances
    - `"very good"`: 285 instances
    - `"nice product"`: 198 instances
    - `"awesome product"`: 84 instances
    - `"waste of money"`: 62 instances
- **Rating-Text Discordance Distribution:**
  - Score $\le 0.10$: 3,533 reviews (96.56%)
  - Score in $(0.40, 0.80]$: 124 reviews (3.39%)
  - Score in $(0.80, 1.00]$: 2 reviews (0.05%)
- **Hinglish Coverage:** Exactly **4 reviews** out of 3,659 (0.11%):
  - Example 1: *"very good cooler amazing cooling paisa wasool"* (Rating 4.0)
  - Example 2: *"nice product with paisa vasool"* (Rating 5.0)

### 6.2 Critical Semantic Findings
1. **Duplicate Clustering is Valid:** The duplicate detection accurately isolates repetitive short feedback texts. The count of 1,335 correctly refers to review instances, not 1,335 clusters.
2. **Minimal Hinglish Representation:** While the 4 reviews are genuine Latin Hinglish, 4 instances do not constitute comprehensive multilingual Indic coverage.
3. **Severity:** **LOW**. Feature extraction is mathematically sound, but claims of multilingual coverage must be moderated.

---

## 7. Deep Audit: OCR Evidence Quality

### 7.1 Empirical Inspection of Parquet Data
- **Table:** `evidence/ocr_evidence.parquet` (1,000 rows)
- **`packaging_match_status`:**
  - `MATCHED_TITLE_PACKAGING`: 714 (71.4%)
  - `PARTIAL_VISUAL_TEXT`: 286 (28.6%)
- **`ocr_engine`:** `TESSERACT_OCR_v5.3_PIPELINE` (1,000 / 1,000, 100%)
- **`detected_mrp`:** `NaN` (1,000 / 1,000, 100%)

### 7.2 Source Code Audit of Generation Logic
Inspection of [`src/data/curation/build_indian_marketplace_trust_dataset_v1_2.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/data/curation/build_indian_marketplace_trust_dataset_v1_2.py#L420-L440) reveals:
```python
extracted_tokens = [w for w in re.findall(r'\b[A-Za-z0-9]+\b', prod_title) if len(w) > 2][:6]
detected_text = " ".join(extracted_tokens)
ocr_engine = "TESSERACT_OCR_v5.3_PIPELINE"
```

### 7.3 Critical Semantic Findings
1. **Simulated Text Labeled as Live Engine Output:** The pipeline did not execute Tesseract OCR over image pixels; it extracted the first 6 alphanumeric tokens from the product title and labeled the engine as `TESSERACT_OCR_v5.3_PIPELINE`.
2. **Severity:** **CRITICAL**. Claiming that text extracted from metadata titles is Tesseract OCR packaging output is an ungrounded provenance assertion.
3. **Required Correction:** Re-label `ocr_engine` to `TITLE_TOKEN_PROXY_v1.2` or execute actual `pytesseract` image text extraction on local JPEG files.

---

## 8. Deep Audit: Benchmark Splits & Leakage

### 8.1 Product Partitioning Verification
- **Table:** `benchmarks/train_split.parquet` (2,550 products, 70.0%)
- **Table:** `benchmarks/validation_split.parquet` (546 products, 15.0%)
- **Table:** `benchmarks/test_split.parquet` (547 products, 15.0%)
- **Product Overlap:**
  $$\text{Train} \cap \text{Val} = 0, \quad \text{Train} \cap \text{Test} = 0, \quad \text{Val} \cap \text{Test} = 0$$
  Product ID leakage is **strictly 0**.

### 8.2 Review Text Cluster Cross-Split Leakage
- **Cross-Split Text Cluster Overlap:** **84 duplicate review text clusters** cross split boundaries.
- **Root Cause:** Common short generic reviews (e.g. `"nice product"`, `"very good"`, `"waste of money"`) exist across multiple distinct products. When products are randomly partitioned, different products sharing the exact same review text fall into both train and test partitions.
- **Severity:** **MEDIUM**. For product-level trust scoring models, product-grouped splitting prevents leakage. However, for review-level NLP language models, memorization of identical generic text strings could leak across splits.
- **Required Correction:** Implement dual-grouping K-fold splits that group by both `canonical_product_id` and duplicate text cluster hash.

---

## 9. Comparison with Certification Report Claims

| Claim in `reports/indian_marketplace_trust_dataset_v1_2_certification.md` | Actual Audited Reality in v1.2 Parquet Files | Discrepancy & Overclaim Assessment |
| :--- | :--- | :--- |
| *"600 gold-standard review evaluation records... consensus verified"* | Programmatic 3-clause heuristic (`len < 15` or keyword) with hardcoded 0.95 confidence. | **OVERCLAIM:** Silver heuristic pseudo-labels, not human gold consensus. |
| *"250 gold-standard listing annotations... 250 image annotations"* | 100% single-class positive assignment. Zero negative/suspicious cases. | **OVERCLAIM:** Trivial single-class template, not discriminative benchmark. |
| *"1,000 packaging / hero image OCR extracted text records (Tesseract OCR v5.3)"* | Derived from first 6 words of product title strings. Pytesseract was not run on images. | **OVERCLAIM:** Title token proxy labeled as physical OCR engine output. |
| *"3,643 variants tracking size, color, material"* | Exactly 1 variant per product. 72.6% are hardcoded "Standard" placeholders. | **PARTIAL CLAIM:** 1:1 wrapper, not parent-child variant grouping. |
| *"Append-only temporal pricing depth"* | 3,619 products have 1 observation; 24 products have 2; 0 have $\ge 3$. | **PARTIAL CLAIM:** Append-only schema ready, but temporal depth is minimal. |
| *"Knowledge Graph with 3,643 SOLD_BY merchant relationships"* | Connects products to 3 platform aggregate entities, not individual merchants. | **SEMANTIC MISMATCH:** Represents platform hosting, not retail seller identity. |

---

## 10. Final Recommendation: PUSH AFTER DOCUMENTED QUALIFICATIONS

### Verdict: **PUSH AFTER DOCUMENTED QUALIFICATIONS (OR REMEDIATE IN PLACE)**

The current dataset v1.2 release is **structurally solid, 100% genuine (zero synthetic products/prices/reviews), and passes all automated regression tests (19/19 passed)**. The underlying catalog, 4,708 usable images, 4,708 unit-normalized ResNet-18 embeddings, 3,659 reviews, and 22,919 graph edges are mathematically sound and internally consistent.

However, commit `ae0c9ec` **MUST NOT be pushed to GitHub with the current certification narrative**, because doing so would publish overclaims regarding human gold consensus annotations and Tesseract OCR provenance.

### Two Remediation Paths:

1. **Option A (Documented Qualifications Push):**
   - Update `reports/indian_marketplace_trust_dataset_v1_2_certification.md` to transparently state that review/listing/image annotations are **heuristic silver baselines**, OCR is a **title token packaging proxy**, and `SOLD_BY` represents **platform-level hosting**.
   - With those qualifications documented, commit and push safely.

2. **Option B (In-Place Remediation before Release):**
   - Update `ocr_engine` to `TITLE_TOKEN_PROXY` or execute real optical OCR on local JPEG assets.
   - Re-type `SOLD_BY` to `HOSTED_ON_PLATFORM`.
   - Re-label programmatic annotations as silver pseudo-labels (`RULE_HEURISTIC_PIPELINE`) with calibrated confidence (0.70).
   - Once corrected and re-verified, proceed to commit and push.
