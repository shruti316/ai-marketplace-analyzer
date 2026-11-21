# Milestone 1: Label Provenance & Quality Report
**Platform:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Dataset Release:** `v1.7`  
**Date:** November 10, 2026

---

## 1. Label Provenance Hierarchy

Every target and feature label within the dataset release `v1.7` is strictly classified into one of four scientific provenance tiers:

```
┌─────────────────────────────────────────────────────────────┐
│ Tier 1: Gold Adjudicated Human Labels (Kappa >= 0.70)       │
│ - None currently present in catalog (Target for future)    │
├─────────────────────────────────────────────────────────────┤
│ Tier 2: Provisional Single-Annotator Human Labels           │
│ - 100 customer reviews (review_human_annotations.parquet)   │
├─────────────────────────────────────────────────────────────┤
│ Tier 3: Silver Heuristic / Algorithmic Annotations          │
│ - 600 reviews (review_silver_annotations.parquet)           │
│ - 250 listings (listing_annotations.parquet)                │
│ - 250 images (image_annotations.parquet)                    │
├─────────────────────────────────────────────────────────────┤
│ Tier 4: Statistical Outlier / Anomaly Signals (Unlabeled)   │
│ - 2,959 reviews, 3,393 listings, 4,458 images               │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Table-by-Table Label Audit

### A. Review Human Annotations (`review_human_annotations.parquet`)
- **Row Count:** 100
- **Provenance:** `TIER_2_PROVISIONAL_SINGLE_ANNOTATOR`
- **Fields:** `sentiment_label`, `authenticity_label`, aspect polarities (`aspect_authenticity_polarity`, `aspect_quality_polarity`, etc.).
- **Authenticity Breakdown:**
  - `VERIFIED_GENUINE`: 83 records (83.0%)
  - `SUSPICIOUS`: 16 records (16.0%)
  - `VERIFIED_DECEPTIVE`: 1 record (1.0%)
- **Inter-Annotator Agreement:** Single annotator verified; Cohen's Kappa unadjudicated. Must be treated as provisional ground truth.

### B. Review Silver Annotations (`review_silver_annotations.parquet`)
- **Row Count:** 600
- **Provenance:** `SILVER_HEURISTIC` (Synthesized via lexical consistency, duplicate clusters, and rating discordance rules).
- **Authenticity Breakdown:**
  - `GENUINE`: 368 records (61.3%)
  - `SUSPICIOUS`: 232 records (38.7%)
- **Utility:** Serves as silver training/validation data for baseline review deception modeling when combined with Tier 2 data.

### C. Listing Annotations (`listing_annotations.parquet`)
- **Row Count:** 250
- **Provenance:** Heuristic / rule-based validation fixtures.
- **Breakdown:**
  - `VERIFIED_CONSISTENT`: 200 (80.0%)
  - `PRICE_ANOMALY_SIGNAL`: 39 (15.6%)
  - `LISTING_INFORMATION_CONFLICT`: 7 (2.8%)
  - `POTENTIAL_VARIANT_MISMATCH`: 4 (1.6%)

### D. Image Annotations (`image_annotations.parquet`)
- **Row Count:** 250
- **Provenance:** Visual matching heuristics (ResNet-18 cosine threshold + packaging consistency).
- **Breakdown:**
  - `CORRECT_PRODUCT_HERO_MATCH`: 200 (80.0%)
  - `LEGITIMATE_MANUFACTURER_IMAGE_REUSE`: 39 (15.6%)
  - `SUSPICIOUS_IMAGE_REUSE`: 10 (4.0%)
  - `VARIANT_MISMATCH`: 1 (0.4%)

---

## 3. Label Quality Safeguards & Scientific Defensibility

1. **No Target Leakage into Features:** Heuristic signals (`REVIEW_SIMILARITY_SIGNAL`, `PRICE_CORRIDOR_OUTLIER`) are computed strictly from independent modality pipelines.
2. **Explicit Uncertainty Distinction:** The dataset never labels a statistical outlier as "counterfeit" or "fraudulent". Outliers are classified as `ANOMALOUS_OBSERVATION` or `SUSPICIOUS_UNVERIFIED`.
3. **Training Boundary Enforcement:** When training supervised classifiers, Tier 3 silver labels must be segregated from Tier 2 evaluation sets, or reported with clear provenance flags.
