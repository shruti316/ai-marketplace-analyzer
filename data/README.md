# Dataset Directory & Storage Governance

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Target Marketplaces:** Amazon India, Flipkart, Myntra  

This directory contains research datasets, certified release snapshots, image assets, and annotation templates used by the platform.

---

## 1. Directory Structure

```text
data/
├── annotation/                                  # Human annotation schemas & research pilot
│   ├── cv_manual_evaluation_50.csv             # Template for manual CV duplicate validation
│   ├── human_annotation_sample_template.csv     # Double-blind prospective annotation template
│   └── sample_adjudicated_research_annotations.parquet # Synthetic research pilot (30 items)
│
├── curated/                                     # Curated SKU cohorts for cross-platform matching
│   ├── cohort_membership.parquet
│   └── curated_products_5684.parquet
│
├── indian_marketplace/                          # Raw marketplace crawl partitions
│   └── raw/images/                             # Local hero image cache for catalog products
│       ├── amazon_in/
│       ├── flipkart/
│       └── myntra/
│
├── indian_marketplace_trust_dataset_v1_6/       # Frozen baseline dataset release (3,643 products)
│   ├── entities/ (products, listings, sellers)
│   ├── derived_evidence/ (pricing, reviews, images, clip)
│   └── relationships/ (graph topology)
│
└── indian_marketplace_trust_dataset_v1_7/       # Certified production dataset release (Current)
    ├── entities/ (canonical products, marketplace offers, seller entities)
    ├── derived_evidence/ (16-feature matrix tables, v1.1 calibrated CLIP)
    ├── evidence/ (100-sample physical packaging OCR evidence)
    └── relationships/ (cross-seller shared image bipartite graph)
```

---

## 2. Certified Release Versions

1. **Dataset Release V1.6 (`data/indian_marketplace_trust_dataset_v1_6`):**
   - Certified baseline dataset corresponding to the **ML V1.0** model release.
   - 3,643 canonical products, 5,684 marketplace listings, 1,215 sellers, and 12,480 reviews.
   - Supervision target: `overall_risk_tier == "ELEVATED_MULTIMODAL_ANOMALY"` ($N_{\text{pos}} = 154$, $N_{\text{neg}} = 3,489$).
   - **Immutably frozen.**

2. **Dataset Release V1.7 (`data/indian_marketplace_trust_dataset_v1_7`):**
   - Active production dataset supporting **Multimodal Vision V1.1** and the **Final ML Readiness** audit.
   - Contains expanded visual feature tables (`image_text_consistency_v1_1.parquet`) and certified packaging OCR evidence (`evidence/ocr_evidence.parquet`).
   - Retains 100% backward compatibility with V1.0.

---

## 3. Data Governance & Invariants

- **Zero Ground-Truth Fabrication:** Historical catalog tables contain point-in-time e-commerce crawls with deterministic policy anomaly labels. They do NOT contain legally verified counterfeit labels. The prospective 1,500-sample human annotation study is managed via `src/data/ground_truth_pipeline.py`.
- **Zero-Penalty Missing Data Semantics:** Incomplete listings (e.g. missing customer reviews or unreadable packaging imagery) are assigned `OBSERVED = 0` availability masks. The Gated Multimodal Units guarantee that missing modalities contribute **0 risk points**.
- **Privacy & Sanitization:** Personal reviewer emails and physical seller addresses have been stripped or pseudonymized. Image identifiers are resolved via sanitized abstract URIs (`asset://...`).
