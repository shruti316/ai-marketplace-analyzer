# Milestone 1: Dataset Readiness & Finalisation Report
**Platform:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Dataset Release:** `v1.7` (Baseline: `v1.6` Preserved)  
**Date:** November 10, 2026  
**Auditor / Architect:** Senior Data Engineer & ML Researcher

---

## 1. Executive Summary

This report evaluates the readiness of the **Indian Marketplace Trust Dataset v1.7** for statistical modeling, multimodal evidence fusion, and machine learning development. 

The catalog comprises **3,643 canonical products**, **3,643 marketplace listings**, **3,659 customer reviews**, **4,708 physical images**, **3,667 price observations**, and **41,372 entity relationship edges** across **Amazon India**, **Flipkart**, and **Myntra**.

### Readiness Verdict
1. **Multimodal Trust Intelligence & Heuristic Assessment Engine:** **PRODUCTION-READY** (Operational in `src/trust_engine/`).
2. **Review-Level Supervised Deception Classifier:** **FEASIBLE FOR BASELINE TRAINING** (700 labeled reviews: 100 gold human-annotated + 600 silver heuristic).
3. **Product-Level End-to-End Supervised Fraud Detection:** **NOT SCIENTIFICALLY FEASIBLE FOR SUPERVISED TRAINING** due to the absence of multi-annotator adjudicated, legally verified product fraud labels. Product-level trust must operate as an **unsupervised anomaly detection and explainable evidence fusion system**, strictly enforcing the **Zero-Penalty Missing Modality Invariant**.

---

## 2. Multi-Entity Catalog Inventory

| Entity / Modality Table | Record Count | Modality / Coverage Details | Primary Identifier |
| :--- | :--- | :--- | :--- |
| **Canonical Products** | 3,643 | 100% catalog coverage across 14 categories | `canonical_product_id` |
| **Marketplace Listings** | 3,643 | 1:1 listing-to-product mapping (Amazon, Flipkart, Myntra) | `listing_id` |
| **Customer Reviews** | 3,659 | Covers 148 products; 3,495 products have 0 reviews | `canonical_review_id` |
| **Physical Images** | 4,708 | 3,643 products have $\ge 1$ hero image; ResNet-18 embeddings available | `image_id` |
| **Price Observations** | 3,667 | Selling prices, MRP, discounts, observation timestamps | `observation_id` |
| **Entity Relationships** | 41,372 | Graph edges across products, listings, brands, sellers, images | Edge tuple `(src, rel, dst)` |
| **Seller Entities** | 4 | 3 platform aggregates (`amazon_in_retail_aggregate`, etc.) + 1 unmapped pool | `seller_id` |

---

## 3. Missing Modality Distribution & Zero-Penalty Enforcement

In Indian marketplace scrapes, cross-modal coverage is naturally heterogeneous. The system strictly categorizes products by observed modality depth:

```
Total Products: 3,643
├── Sparse Products (< 2 core modalities): 1,068 (29.32%) -> UNASSESSED_SPARSE_DATA
└── Multimodal Products (>= 2 core modalities): 2,575 (70.68%)
    ├── Low Observed Anomaly: 2,037 (55.92%)
    ├── Moderate Single-Modality Anomaly: 516 (14.16%)
    └── Elevated Multimodal Corroborated Anomaly: 22 (0.60%)
```

### Invariant Guarantee:
Missing reviews or missing secondary images are classified as `MODALITY_UNAVAILABLE`. Under no circumstances are missing modalities penalized as suspicious. Sparse products are routed directly to `UNASSESSED_SPARSE_DATA`.

---

## 4. Class Distribution & Supervised Readiness Assessment

### A. Review Deception / Authenticity Labels
- **Human Gold Annotations (`review_human_annotations.parquet`):** 100 records
  - `VERIFIED_GENUINE`: 83 (83.0%)
  - `SUSPICIOUS`: 16 (16.0%)
  - `VERIFIED_DECEPTIVE`: 1 (1.0%)
- **Silver Heuristic Annotations (`review_silver_annotations.parquet`):** 600 records
  - `GENUINE`: 368 (61.3%)
  - `SUSPICIOUS`: 232 (38.7%)
- **Unlabeled Reviews:** 2,959 records (80.9% of catalog reviews)
- **Pending Human Queue:** 500 records in `human_annotation_pending_tasks.parquet`

### B. Product-Level Trust Labels
- **Verified Ground-Truth Fraud Labels:** 0 (Zero legal fraud judgments exist in open Indian marketplace data).
- **Derived Risk Tiers (Deterministic Fusion):**
  - `UNASSESSED_SPARSE_DATA`: 1,068 (29.32%)
  - `LOW_OBSERVED_ANOMALY`: 2,037 (55.92%)
  - `MODERATE_SINGLE_MODALITY_ANOMALY`: 516 (14.16%)
  - `ELEVATED_MULTIMODAL_ANOMALY`: 22 (0.60%)

---

## 5. Explicit List of Remaining Manual Data Requirements

To transition the platform from heuristic anomaly fusion to fully certified supervised deep learning, the following manual data collection initiatives are required:

1. **Adjudicated Review Annotation Queue:**
   - Execute multi-annotator evaluation on the 500 pending tasks (`human_annotation_pending_tasks.parquet`).
   - Require minimum 2 independent annotators per review with Cohen's Kappa $\ge 0.70$.
2. **Physical Mystery Shopping Cohort (Ground Truth Verification):**
   - Conduct physical test purchases across 100 products flagged with `ELEVATED_MULTIMODAL_ANOMALY` or extreme discount anomalies to inspect physical packaging, genuine barcodes, and authorized warranty cards.
3. **Individual Merchant Identity Registration:**
   - Extract legal GSTIN / CIN / merchant registration numbers from marketplace invoice PDFs or delivery slips to enable merchant-level trust modeling beyond platform aggregates.
4. **Indic Language Native Annotation:**
   - Expand Hindi, Tamil, Telugu, and Hinglish code-mixed review annotations to establish localized NLP deception benchmarks.
