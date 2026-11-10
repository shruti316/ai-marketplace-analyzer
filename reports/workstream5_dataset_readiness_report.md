# WORKSTREAM 5 — Dataset Ground-Truth Readiness and Model-Training Eligibility Matrix

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Dataset Release:** Indian Marketplace Trust Dataset v1.7  
**Date:** November 2026  
**Status:** Definitively Reconciled & Documented  

---

## 1. Executive Summary

This report establishes the definitive **Model-Training Eligibility Matrix** for the AI-Powered Indian Marketplace Trust Intelligence Platform. By analyzing exact empirical record counts, modality sparsity, and label provenance across the entire catalog (3,643 products), this document draws the strict scientific boundary between tasks eligible for supervised machine learning versus those requiring unsupervised anomaly corridors, deterministic rule-based systems, or human-in-the-loop adjudication.

---

## 2. Complete Catalog Ground-Truth & Sparsity Audit

### 2.1 Modality Coverage & Sparsity

| Modality / Dimension | Total Entities | Entity Coverage | Unobserved / Sparsity Rate | Operational Significance |
|---|---|---|---|---|
| **Products** | **3,643** | 3,643 products (100.0%) | 0 (0.0%) | Master catalog backbone |
| **Marketplace Listings** | **3,643** | 3,643 listings (100.0%) | 0 (0.0%) | Platform offers (Flipkart, Amazon.in) |
| **Price Observations** | **3,667** | 3,643 products (100.0%) | 0 (0.0%) | Complete pricing coverage |
| **Images** | **4,708** usable (5,034 total) | 3,643 products (100.0%) | 0 (0.0%) | High visual coverage |
| **Customer Reviews** | **3,659** | **148 products (4.06%)** | **3,495 products (95.94%)** | **High Sparsity (Cold Start)** |
| **Physical OCR Execution** | **100** packaging images | 100 products (2.75%) | 3,543 products (97.25%) | Packaging character sample cohort |
| **Sellers (Individual Merchants)**| **0** | **0 merchants (0.0%)** | **100.0% unobserved** | **Zero Individual Seller KYC** |
| **Sellers (Platform Aggregates)** | **4** | 4 aggregate pools (100.0%) | 0 (0.0%) | Aggregate platform settlement pools |
| **Adjudicated Legal Fraud Verdicts**| **0** | **0 products (0.0%)** | **100.0% unobserved** | **Zero Legal Seizure Labels** |

---

## 3. Class Imbalance Across Platform Tasks

| Task Dimension | Negative Class (Genuine / Normal) | Positive Class (Suspicious / Outlier) | Positive Prevalence | Scientific Implication |
|---|---|---|---|---|
| **Review Deception (Gold Tier 2)** | 83 Genuine (83.0%) | 17 Suspicious/Deceptive (17.0%) | **17.00%** | Moderate imbalance; small support ($N=17$) |
| **Review Deception (Silver Tier 3)**| 368 Genuine (61.33%) | 232 Suspicious (38.67%) | **38.67%** | Heuristic bias over-represents suspicion |
| **Price Corridors (Subcategory/Brand)**| 3,199 Normal (87.81%) | 444 Corridor Breaches (12.19%) | **12.19%** | Long-tailed price variations |
| **Robust IQR Outliers** | 3,290 Normal (90.31%) | 353 IQR Outliers (9.69%) | **9.69%** | Severe price divergence |
| **Image Perceptual Hashing** | 4,385 Unique hashes (93.1%) | 323 Duplicate hashes (6.86%) | **6.86%** | Low duplicate rate |
| **Cross-Catalog Visual Reuse** | 3,505 Clean products (96.2%) | 138 Reuse occurrences (3.79%) | **3.79%** | Rare cross-listing image copying |
| **Packaging Brand OCR Alignment** | 32 Verified (32.0%) | 18 Absent / 44 Insufficient (62%)| **18.00% unobserved** | Textless products lack typography |

---

## 4. Definitive Model-Training Eligibility Matrix

```
+---------------------------------------------------------------------------------------------------------+
|                                  MODEL TRAINING ELIGIBILITY MATRIX                                      |
+------------------------------------+--------------------------+-----------------------+-----------------+
| Platform Intelligence Task         | Data Modality            | Eligibility Status    | Recommended Arch|
+------------------------------------+--------------------------+-----------------------+-----------------+
| 1. Review Authenticity & Deception | NLP + Engineered Tabular | SUPERVISED VIABLE     | Logistic / RF   |
| 2. Pricing Anomaly Detection       | Numerical / Econometric  | UNSUPERVISED ONLY     | Robust Median/IQR|
| 3. Image Perceptual Similarity     | Computer Vision (ResNet) | SELF-SUPERVISED       | dHash + Cosine  |
| 4. Packaging OCR & Brand Alignment | OCR (WinRT) + Subgraph   | DETERMINISTIC RULES   | Token Geometry  |
| 5. Seller Identity Governance      | Graph / Relational       | GOVERNANCE GUARDRAIL  | Platform Pools  |
| 6. Overall Product Fraud Verdict   | Fused Multimodal         | BAYESIAN EVIDENCE     | Unified Engine  |
+------------------------------------+--------------------------+-----------------------+-----------------+
```

### 4.1 Detailed Task Specifications

#### Task 1: Review Authenticity & Deception Detection
- **Eligibility:** `SUPERVISED_BENCHMARK_VIABLE`
- **Recommended Architecture:** Logistic Regression or Random Forest with balanced class weighting.
- **Scientific Boundaries:** Must train on Silver heuristics only for out-of-domain transfer evaluation, or use stratified $k$-fold cross-validation on the 100 Gold human annotations. Models must not claim universal fraud detection until the 500 pending tasks are double-blind adjudicated.

#### Task 2: Pricing Anomaly Detection
- **Eligibility:** `STATISTICAL_UNSUPERVISED_ONLY`
- **Recommended Architecture:** Rolling median and Interquartile Range (IQR) pricing corridors grouped by canonical subcategory and brand.
- **Scientific Boundaries:** Zero external gold labels exist for "predatory undercutting" or "counterfeit price points". Price anomalies must be strictly communicated as statistical deviations, never as legal violations.

#### Task 3: Image Similarity, Perceptual Hashing, and Cross-Listing Reuse
- **Eligibility:** `SELF_SUPERVISED_AND_DETERMINISTIC`
- **Recommended Architecture:** Frozen ResNet-18 (512-dimensional $\ell_2$-normalized visual embeddings) + Perceptual difference hashing (dHash with Hamming distance $\le 10$).
- **Scientific Boundaries:** Image reuse across listings often reflects legitimate manufacturer-supplied catalog photography. Reuse alone must never elevate an item to high suspicion without secondary corroboration.

#### Task 4: Packaging OCR & Brand Token Verification
- **Eligibility:** `DETERMINISTIC_EXTRACTION_AND_RULE_VERIFIED`
- **Recommended Architecture:** Windows Native WinRT OCR + spatial bounding-box geometry matching against the catalog canonical brand entity subgraph.
- **Scientific Boundaries:** 26% of packaging images legitimately have zero typography (e.g., jewelry, plain containers). Missing packaging text must never trigger an automated counterfeit penalty.

#### Task 5: Seller Identity Governance & Platform Pool Separation
- **Eligibility:** `GOVERNANCE_RULE_BASED_ONLY`
- **Recommended Architecture:** Deterministic platform aggregate pool mapping (`SELLER_AGG_FLIPKART`, `SELLER_AGG_AMAZON_IN`) with strict Zero-Individual-Reputation guardrails.
- **Scientific Boundaries:** Supervised merchant risk scoring is strictly prohibited until individual merchant identification (e.g. GSTIN, PAN, bank settlement accounts) is present in the dataset.

#### Task 6: Overall Product Counterfeit / Fraud Verdict
- **Eligibility:** `FUSED_BAYESIAN_EVIDENCE_ENGINE`
- **Recommended Architecture:** Central Unified Multimodal Evidence Engine (v1.7) combining cross-modality corroboration with zero-penalty handling for missing modalities.
- **Scientific Boundaries:** Supervised end-to-end binary classification (Fraud vs Genuine) is scientifically indefensible because zero legal seizure ground-truth labels exist. A deterministic, explainable evidence accumulator must be utilized.

---

## 5. Explicit Manual Data Annotation Requirements

To transition the remaining unsupervised and provisional modules to fully supervised production capabilities, the following four targeted data acquisition initiatives are required:

1. **Workstream A (Review Queue Adjudication):**
   - Ingest the 500 records in `human_annotation_pending_tasks.parquet`.
   - Execute double-blind dual annotation with a required agreement threshold of $\kappa \ge 0.70$.
   - Yields 500 new Tier 1 Adjudicated Gold records, enabling full supervised review retraining.
2. **Workstream B (Vision-Language Alignment Fixture):**
   - Manually annotate 250 image-title pairs to distinguish between promotional styling vs physical packaging discordance.
3. **Workstream C (Individual Merchant KYC Collection):**
   - Acquire verified business credentials (GSTIN / trade licenses) for 100 active marketplace sellers to replace platform aggregate pools.
4. **Workstream D (External Counterfeit Verification):**
   - Partner with brand protection organizations to source 50-100 confirmed counterfeit enforcement notices.
