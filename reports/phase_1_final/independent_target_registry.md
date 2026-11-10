# Independent Multimodal Target Registry & Supervision Governance

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Phase:** Phase 1 Final — Scientific Architecture Finalization  
**Specification Document:** `independent_target_registry.md`  
**Governing Module:** [`src/data/target_registry.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/data/target_registry.py)  
**Provenance Matrix:** [`reports/phase_1_final/target_provenance.csv`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/reports/phase_1_final/target_provenance.csv)  
**Version:** 2.0.0  

---

## 1. Executive Rationale & Elimination of Circular Supervision

### 1.1 The Circularity Failure of Legacy Target `is_elevated_risk`
In earlier iterations, the supervised multimodal fusion model was trained against a synthetic binary target:
$$\text{is\_elevated\_risk} = \mathbb{I}(\text{active\_anomaly\_modality\_count} \ge 2)$$
This formulation created severe scientific defects:
1. **Rule Mimicry, Not Fraud Detection:** The target is a deterministic aggregation of heuristic flags, not ground-truth consumer fraud or statutory violation.
2. **Proxy Reconstruction:** Even when direct boolean flags (`is_price_outlier`, `is_discount_anomaly`, `cv_has_cross_catalog_reuse`) were excluded, non-linear decision trees split on raw continuous measurements (`robust_z_score \ge 3.0`, `discount_percentage \ge 90\%`) to reconstruct the target with **99.18% accuracy** and **ROC-AUC = 0.9999**.
3. **Flawed Baseline Comparison:** The model claimed to detect fraud, when in reality it was merely learning a non-linear surrogate approximation of its own rule engine.

### 1.2 The Clean Multimodal Dependency Graph
To ensure total scientific integrity, every predictive and evaluation task in the platform must adhere to the following acyclic dependency graph:

```
[Level 1: Raw Catalog Evidence]
    ├── Customer Review Text & Raw Timestamp
    ├── Raw Product Images (JPEG/PNG/WebP)
    ├── Point-in-Time Observed Price (INR) & Declared MRP
    ├── Marketplace Listing Metadata (Title, GTIN, Brand string)
    └── Canonical Knowledge Graph (Entities & Certified Bipartite Edges)
           │
           ▼
[Level 2: Independent Feature Extraction]
    ├── Review NLP: TF-IDF, text length, organic vocabulary entropy
    ├── Computer Vision: Normalized ResNet-18 embeddings, dHash, SHA-256
    ├── OCR: WinRT character streams, packaging brand token matches
    ├── Vision-Language: Zero-shot CLIP ViT-B/32 cosine similarity
    └── Pricing: Median Absolute Deviation (MAD) robust z-scores, discount ratios
           │
           ▼
[Level 3: Independent Prediction & Benchmarking Targets (TargetRegistry)]
    ├── Task A: Review Authenticity (Double-blind human labels ONLY)
    ├── Task B: Image Relationship Intelligence (Cryptographic & perceptual hashes)
    ├── Task C: Image-Listing Consistency (Zero-shot text-image match/mismatch)
    ├── Task D: Pricing Intelligence (Non-parametric statistical corridors)
    ├── Task E: Product-Listing Consistency (Cross-marketplace GTIN/Brand alignment)
    └── Task F: Deterministic Multimodal Fusion (Explainable rule engine, zero-penalty)
           │
           ▼
[Level 4: Supervised, Unsupervised & Deterministic Models]
    ├── Task A: Supervised Classifier (BLOCKED awaiting multi-annotator Gold labels)
    ├── Task B: Retrieval & Similarity Search (Validated on hash benchmarks)
    ├── Task C: Zero-shot Multimodal Ranking (Validated on contrastive title pairs)
    ├── Task D: Unsupervised Robust Anomaly Detection (Statistical MAD ranking)
    ├── Task E: Deterministic Cross-Catalog Alignment Service
    └── Task F: Deterministic Trust Engine (Zero-Penalty Invariant certified)
```

**Non-Negotiable Isolation Invariant:**  
No feature used by any model at Level 4 may contain information derived from Level 3 target assignment or downstream post-outcome evaluations.

---

## 2. Official Prediction & Evaluation Target Hierarchy

| Target ID | Task Name | Prediction Unit | Target Nature | Evaluation Eligibility | Recommended Architecture |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`TARGET_REVIEW_AUTHENTICITY`** | Task A: Review Authenticity | Review | Independent Ground Truth | **BLOCKED_AWAITING_HUMAN_GROUND_TRUTH** | Supervised Text-Only Classification |
| **`TARGET_IMAGE_RELATIONSHIP`** | Task B: Visual Duplicate Retrieval | Image Pair | Retrieval Similarity | **ELIGIBLE_FOR_INDEPENDENT_SUPERVISION** | Similarity Learning & Retrieval |
| **`TARGET_IMAGE_LISTING_CONSISTENCY`** | Task C: Image-Listing Consistency | Image-Listing Pair | Independent Ground Truth | **ELIGIBLE_FOR_INDEPENDENT_SUPERVISION** | Zero-Shot Cross-Modal Ranking |
| **`TARGET_PRICING_INTELLIGENCE`** | Task D: Pricing Intelligence | Listing Price | Unsupervised Anomaly | **ELIGIBLE_UNSUPERVISED_BENCHMARK** | Unsupervised Robust Anomaly Detection |
| **`TARGET_PRODUCT_LISTING_CONSISTENCY`** | Task E: Entity Alignment | Product-Listing Pair | Deterministic Evaluation | **ELIGIBLE_DETERMINISTIC_BENCHMARK** | Deterministic Knowledge Graph Fusion |
| **`TARGET_PRODUCT_TRUST_INTELLIGENCE`** | Task F: Multimodal Trust Assessment | Product | Deterministic Evaluation | **ELIGIBLE_DETERMINISTIC_BENCHMARK** | Deterministic Evidence Fusion Engine |
| **`TARGET_DEPRECATED_ELEVATED_RISK`** | Legacy Active Anomaly Surrogate | Product | Proxy Rule-Derived | **DEPRECATED_CIRCULAR_PROXY** | None (Deprecated & Excluded) |

---

## 3. Detailed Specifications per Target

### Task A: Review Authenticity (`TARGET_REVIEW_AUTHENTICITY`)
- **Unit:** Individual Customer Review (`review_id`).
- **Nature:** Independent Ground Truth.
- **Labels:**
  - `VERIFIED_GENUINE`: Organic customer product experience with verified physical usage evidence.
  - `SUSPICIOUS`: Substantiated behavioural anomalies, duplicate patterns, or verified non-buyer collusion.
  - `VERIFIED_DECEPTIVE`: Confirmed deceptive review fraud, syndicated bot submission, or paid incentive.
  - `UNCERTAIN`: Ambiguous feedback lacking sufficient evidentiary context.
- **Label Source:** Double-blind dual human annotation with lead adjudicator resolution and Cohen's Kappa $\ge 0.70$.
- **Allowed Features:** `review_text_tfidf`, `char_length`, `word_count`, `sentiment_polarity`, `subjectivity_score`.
- **Forbidden Features:** `rating`, `rating_discordance_score`, `active_anomalies`, `overall_risk_tier`.
- **Status & Blocking Condition:** **BLOCKED**. The historical 100 Gold annotations suffer from 100% negative-rating selection bias (rating $\le 2.0$). Supervised Gold training is blocked until the 500 pending tasks are adjudicated under the v2.0 double-blind protocol.

### Task B: Image Relationship Intelligence (`TARGET_IMAGE_RELATIONSHIP`)
- **Unit:** Image Pair (`image_id_1`, `image_id_2`).
- **Nature:** Retrieval Similarity.
- **Labels:**
  - `EXACT_FILE_DUPLICATE`: Cryptographic SHA-256 match.
  - `PERCEPTUAL_NEAR_DUPLICATE`: Perceptual dHash hamming distance $\le 4$.
  - `CROSS_CATALOG_REUSE`: Centered ResNet-18 cosine similarity $\ge 0.95$ across disparate products.
  - `UNRELATED_IMAGE`: Distinct visual assets ($\cos < 0.90$).
- **Allowed Features:** `resnet18_embedding_a`, `resnet18_embedding_b`, `dhash_hamming_distance`, aspect ratio, resolution.
- **Forbidden Features:** `overall_risk_tier`, `is_elevated_risk`.
- **Status:** **ELIGIBLE & IMPLEMENTED**. Validated on cryptographic and perceptual benchmarks. Image reuse alone is strictly disclaimed as non-fraudulent (e.g. authorized stock photography).

### Task C: Image-Listing Consistency (`TARGET_IMAGE_LISTING_CONSISTENCY`)
- **Unit:** Image-Listing Pair (`image_id`, `listing_id`).
- **Nature:** Independent Ground Truth.
- **Labels:**
  - `CONSISTENT`: Hero image depicts the exact merchandise and brand declared in the listing title.
  - `PARTIALLY_CONSISTENT`: Correct category but ambiguous brand or variant.
  - `INCONSISTENT`: Image depicts merchandise discordant with listing text or brand.
  - `INSUFFICIENT_EVIDENCE`: Image corrupt or placeholder.
- **Allowed Features:** Zero-shot CLIP ViT-B/32 cosine similarity, title token length, image sharpness.
- **Forbidden Features:** `overall_risk_tier`, `clip_is_discordant`, `is_elevated_risk`.
- **Status:** **ELIGIBLE & IMPLEMENTED**. Validated on contrastive matched vs. cross-category mismatched pairs.

### Task D: Pricing Intelligence (`TARGET_PRICING_INTELLIGENCE`)
- **Unit:** Listing Price Observation (`canonical_product_id`, `listing_id`).
- **Nature:** Unsupervised Anomaly Detection.
- **Labels:**
  - `CORRIDOR_CONSISTENT`: Price within Median $\pm 3.0 \times \text{MAD}$ category benchmark.
  - `PRICE_CORRIDOR_OUTLIER`: Price $|z_{\text{MAD}}| \ge 3.0$.
  - `EXTREME_DISCOUNT_ANOMALY`: Declared discount magnitude $\ge 90\%$.
  - `MRP_CONSISTENCY_BREACH`: Selling price strictly exceeds declared MRP.
- **Allowed Features:** Raw observed price, category median, category MAD, declared MRP, discount ratio.
- **Forbidden Features:** `is_price_outlier`, `is_discount_anomaly`, `overall_risk_tier`.
- **Status:** **ELIGIBLE & IMPLEMENTED**. Statistically calibrated; statistical dispersion is explicitly distinguished from statutory legal violations.

### Task E: Product-Listing Consistency (`TARGET_PRODUCT_LISTING_CONSISTENCY`)
- **Unit:** Product-Listing Pair.
- **Nature:** Deterministic Evaluation.
- **Labels:** `ALIGNED_IDENTICAL`, `BRAND_MISMATCH`, `SPECIFICATION_MISMATCH`, `CROSS_MARKETPLACE_IDENTITY_MISMATCH`.
- **Allowed Features:** Normalized brand tokens, GTIN/SKU, category strings.
- **Status:** **ELIGIBLE & IMPLEMENTED**. Deterministic entity resolution across Amazon India, Flipkart, and Myntra.

### Task F: Overall Product Trust Intelligence (`TARGET_PRODUCT_TRUST_INTELLIGENCE`)
- **Unit:** Canonical Product (`canonical_product_id`).
- **Nature:** Deterministic Evidence Fusion Engine.
- **Labels:** `CONSISTENT_VERIFIED_ALIGNMENT`, `MODERATE_SINGLE_MODALITY_ANOMALY`, `ELEVATED_MULTIMODAL_ANOMALY`, `UNASSESSED_SPARSE_DATA`.
- **Allowed Features:** Atomic evidence records across review, vision, price, seller, and graph modalities.
- **Status:** **OPERATIONAL AS DETERMINISTIC RULE ENGINE**. Supervised fraud prediction at the product level remains explicitly **BLOCKED** pending law enforcement ground truth.

---

## 4. Architectural Selection Matrix

| Task | Supervised ML | Weak Supervision | Unsupervised Anomaly | Retrieval / Ranking | Deterministic Rules | Hybrid Rules + ML | Selected Approach & Rationale |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Review Authenticity** | Yes (Target) | Yes (Baseline) | No | No | No | No | **Hybrid Two-Track**: Track 1 preserves Silver weak supervision; Track 2 (Gold) is held awaiting double-blind human labels. |
| **Image Relationships** | No | No | No | Yes | Yes | Yes | **Similarity Retrieval**: Exact SHA-256 + dHash ($H \le 4$) + ResNet-18 ($\cos \ge 0.95$). High precision without overfitting. |
| **Image-Listing Match** | No | No | No | Yes | No | Yes | **Zero-Shot Multimodal**: CLIP ViT-B/32 text-image cosine similarity ranking. High zero-shot transfer without label bias. |
| **Pricing Intelligence** | No | No | Yes | Yes | Yes | No | **Unsupervised Robust Statistics**: Median and MAD corridors with deterministic statutory MRP checks. |
| **Entity Alignment** | No | No | No | No | Yes | No | **Deterministic Graph Normalization**: Exact string matching and canonical brand dictionaries. |
| **Overall Product Trust** | **BLOCKED** | No | No | No | Yes | Yes | **Deterministic Evidence Fusion**: Corroboration across independent modalities with strict Zero-Penalty Invariant. |
