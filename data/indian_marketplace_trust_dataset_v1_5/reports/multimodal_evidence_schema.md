# Unified Multimodal Evidence Schema & Integration Report
**Release Version:** Indian Marketplace Trust Dataset v1.5  
**Component:** Multimodal Evidence Integration Layer  
**Execution Pipeline:** [`src/multimodal/evidence_fusion.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/multimodal/evidence_fusion.py)  
**Derived Tables:**
- [`derived_evidence/multimodal_evidence_records.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/derived_evidence/multimodal_evidence_records.parquet) (9,072 atomic evidence records)
- [`derived_evidence/product_multimodal_summary.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/derived_evidence/product_multimodal_summary.parquet) (3,643 product summaries)

---

## 1. Architectural Philosophy: Explainable Evidence vs Black-Box Scoring

In multi-modal trust intelligence for e-commerce marketplaces, data is inherently sparse and heterogeneous:
- Only 148 products possess customer reviews (3,495 products have 0 reviews).
- 2,432 products possess hero images (1,211 products have 0 images).
- Physical OCR and Vision-Language models are offline in this environment.

To prevent ungrounded algorithmic bias:
1. **The Zero-Penalty Missing Modality Invariant:** Missing data is never penalized as negative trust or treated as zero risk. A product without reviews is not fraudulent; it is simply unreviewed.
2. **Atomic Evidence Separation:** Raw evidence observations (sentiment, discordance, image reuse, price outliers) are retained as individual atomic records, independent of composite aggregation.
3. **Absence of Fake Probabilities:** The system does not emit uncalibrated Bayesian pseudo-probabilities. Assessments are structured as explainable indicators with clear provenance.

---

## 2. Atomic Multimodal Evidence Records (9,072 Records)

The atomic evidence table [`derived_evidence/multimodal_evidence_records.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/derived_evidence/multimodal_evidence_records.parquet) standardizes observations across all 5 modalities.

### Schema Specification
| Column Name | Data Type | Nullable | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `evidence_id` | String | No | Primary Key of the evidence record | `ev_rev_sent_flipkart_rev_00000` |
| `entity_id` | String | No | Target entity ID (review, image, product, listing) | `flipkart_rev_00000` |
| `canonical_product_id`| String | No | Associated canonical product | `flipkart_MOBEY23ZHYPFFHYM` |
| `listing_id` | String | Yes | Associated marketplace listing (if applicable) | `list_flipkart_MOBEY23ZHYPFFHYM` |
| `evidence_modality` | String | No | Domain partition (`REVIEW_NLP`, `IMAGE_CV`, `PRICING`, `SELLER_GRAPH`, `OCR`) | `REVIEW_NLP` |
| `evidence_type` | String | No | Specific category of observation | `REVIEW_SENTIMENT`, `REVIEW_DISCORDANCE` |
| `evidence_signal_name`| String | No | Machine-readable signal tag | `RATING_TEXT_DISCORDANCE_SIGNAL` |
| `signal_value` | String | No | Quantitative or qualitative signal value | `0.65`, `CROSS_PRODUCT_IMAGE_REUSE` |
| `signal_severity` | String | No | Categorical impact (`INFO`, `LOW`, `MEDIUM`, `HIGH`)| `MEDIUM` |
| `detection_method` | String | No | Algorithmic method producing the signal | `RATING_SENTIMENT_NORMALIZED_DELTA` |
| `confidence` | Float64| No | Detection confidence score $\in [0.0, 1.0]$ | `0.85` |
| `modality_available` | Boolean| No | True if modality data exists, False if missing | `True` |
| `provenance` | String | No | Provenance pipeline tag | `REVIEW_NLP_FEATURE_EXTRACTION` |
| `timestamp` | String | No | ISO 8601 generation timestamp | `2026-11-09T05:24:56Z` |

### Modality Record Breakdown
- **`REVIEW_NLP`:** 8,822 records (sentiment, discordance, duplicate text clusters, temporal bursts)
- **`IMAGE_CV`:** 216 records (cross-product image reuse instances)
- **`PRICING`:** 33 records (statistical price corridor outliers)
- **`OCR`:** 1 record (system dependency audit status)
- **Total Atomic Records:** 9,072

---

## 3. Product Multimodal Summary (3,643 Canonical Products)

The product-level summary table [`derived_evidence/product_multimodal_summary.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/derived_evidence/product_multimodal_summary.parquet) compiles observed signals per canonical product with explicit missing modality status.

### Modality Availability Breakdown
- **Review Modality:**
  - `AVAILABLE`: 148 products (4.06%)
  - `MODALITY_UNAVAILABLE`: 3,495 products (95.94%)
- **Image Modality:**
  - `AVAILABLE`: 2,432 products (66.76%)
  - `MODALITY_UNAVAILABLE`: 1,211 products (33.24%)
- **Pricing Modality:**
  - `AVAILABLE`: 3,643 products (100.0%)
- **OCR Modality:**
  - `BLOCKED_OFFLINE_DEPENDENCY_ABSENT`: 3,643 products (100.0%)

### Explainable Risk Tiers
Products are categorized into transparent heuristic tiers:
1. **`UNASSESSED_SPARSE_DATA`:** 1,211 products — Products lacking 2 or more core modalities (e.g. no images and no reviews). Evaluated only on available metadata corridors.
2. **`LOW_OBSERVED_ANOMALY`:** 2,217 products — Products with available multimodal data and zero active anomaly flags.
3. **`MODERATE_SINGLE_MODALITY_ANOMALY`:** 182 products — Products with exactly 1 active risk signal (e.g. price outlier or review duplicate cluster).
4. **`ELEVATED_MULTIMODAL_ANOMALY`:** 33 products — Products exhibiting corroborating anomalies across multiple independent evidence sources (e.g. cross-product image reuse + price outlier).
