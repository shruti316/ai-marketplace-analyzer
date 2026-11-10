# Multimodal Fusion Intelligence Evaluation Report

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Phase:** Phase 1 Final — Scientific Architecture Finalization  
**Specification:** [`reports/phase_1_final/multimodal_fusion_evaluation.md`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/reports/phase_1_final/multimodal_fusion_evaluation.md)  
**Engines Evaluated:** Deterministic Evidence Fusion Engine & Learned Multimodal Surrogate Architecture  
**Date:** November 10, 2026  

---

## 1. Executive Fusion Architecture: Deterministic Baseline vs. Learned Models

To ensure defensible, explainable marketplace intelligence, the platform maintains two distinct fusion systems:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        UNIFIED CATALOG ENTITY EVIDENCE STREAM                          │
│        (Reviews NLP, Hero Images CV, Packaging OCR, Pricing Observations, Graph)       │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    ▼                                             ▼
┌───────────────────────────────────────┐     ┌──────────────────────────────────────────┐
│      DETERMINISTIC FUSION ENGINE      │     │         LEARNED MULTIMODAL FUSION        │
│   (src/trust_engine/multimodal_fusion)│     │  (src/models/multimodal_learned_fusion)  │
├───────────────────────────────────────┤     ├──────────────────────────────────────────┤
│ • Cross-modal corroboration (>= 2)    │     │ • 19-feature clean matrix                │
│ • Intra-modal signal deduplication    │     │ • Component-aware Group-CV (3,397 comps) │
│ • Strict Zero-Penalty Invariant       │     │ • Non-linear rule surrogate ranker       │
│ • Deterministic reason codes          │     │ • Calibrated uncertainty bounds          │
│ • Status: CERTIFIED PRODUCTION ENGINE │     │ • Status: CONTINUOUS RANKING SURROGATE   │
└───────────────────────────────────────┘     └──────────────────────────────────────────┘
```

---

## 2. Deterministic Evidence Fusion Engine (Production Baseline)

### 2.1 Intra-Modal Correlated Signal Deduplication
A single underlying defect (e.g., a review-bombing burst or stock photo reuse) can trigger multiple related flags. The deterministic fusion engine prevents artificial risk compounding by collapsing correlated flags within each modality:

1. **Review NLP Modality:**
   - Multiple duplicate review clusters + rating discordance $\to$ Consolidated into **one atomic `REVIEW_NLP` modality anomaly**.
2. **Pricing Modality:**
   - Statistical corridor outlier ($|z| \ge 3.0$) + Extreme discount ($\ge 90\%$) + MRP check $\to$ Consolidated into **one atomic `PRICING` modality anomaly**.
3. **Computer Vision Modality:**
   - Exact hash duplicate + ResNet cross-catalog similarity link $\to$ Consolidated into **one atomic `IMAGE_CV` modality anomaly**.
4. **Seller Governance Modality:**
   - Always evaluates as `has_anomaly = False` due to platform aggregate semantics (avoiding false individual merchant penalties).

### 2.2 Independent Cross-Modal Corroboration Rule
Risk elevation requires independent agreement across disparate physical modalities:
- **`CONSISTENT_VERIFIED_ALIGNMENT`:** $\ge 2$ core modalities available, **0** active anomaly modalities.
- **`MODERATE_SINGLE_MODALITY_ANOMALY`:** Exactly **1** modality exhibits anomaly (e.g., clearance pricing or stock photo).
- **`ELEVATED_MULTIMODAL_ANOMALY`:** $\ge 2$ independent modalities exhibit corroborating anomalies (e.g., anomalous price AND discordant image).
- **`UNASSESSED_SPARSE_DATA`:** $< 2$ core modalities instrumented; **zero penalty applied**.

### 2.3 Verification of the Zero-Penalty Invariant
A product with sparse data (e.g. newly listed item with no reviews or packaging images) must NEVER be penalized.

| Instrumentation State | Modalities Available | Anomalies Detected | Assigned Risk Tier | Zero-Penalty Compliance |
| :--- | :---: | :---: | :--- | :---: |
| **Fully Instrumented** | 3 (Price, Image, Review) | 0 | `CONSISTENT_VERIFIED_ALIGNMENT` | Satisfied |
| **Price Only (Sparse)** | 1 (Price only) | 0 | `UNASSESSED_SPARSE_DATA` | **Zero Penalty Enforced** |
| **Price + Image (Partial)**| 2 (Price, Image) | 0 | `CONSISTENT_VERIFIED_ALIGNMENT` | Satisfied |
| **Price + Image Anomaly** | 2 (Price, Image) | 1 (Price) | `MODERATE_SINGLE_MODALITY_ANOMALY`| Non-Compounded |
| **Multi-Modal Anomaly** | 3 (Price, Image, Review) | 2 (Price + Image) | `ELEVATED_MULTIMODAL_ANOMALY` | Verified Corroboration |

---

## 3. Learned Multimodal Fusion: Surrogate & Ranking Evaluation

### 3.1 Dataset & Feature Matrix Specification
- **Catalog Population:** All 3,643 canonical catalog products across Amazon India, Flipkart, and Myntra.
- **Feature Set:** Clean 19-feature matrix (`FEATURE_COLS_CLEAN`), 100% purged of direct circular boolean flags (`is_price_outlier`, `is_extreme_price_outlier`, `is_discount_anomaly`, `cv_has_cross_catalog_reuse`) and post-outcome probabilities.
- **Split Protocol:** Component-aware `StratifiedGroupKFold(n_splits=5)` over 3,397 connected components (0 crossing leakage).

### 3.2 Catalog-Wide 5-Fold Cross-Validation Benchmark

| Model Architecture | Feature Subset | Mean Accuracy | Mean Precision | Mean Recall | Mean $F_1$ Score | Mean ROC-AUC | PR-AUC | Scientific Classification |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Majority Baseline** | None | 0.9577 | 0.0000 | 0.0000 | 0.0000 | 0.5000 | 0.0423 | Trivial Null Class |
| **Deterministic Corroboration Engine** | Atomic Evidence | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | Exact Ground Target Rule |
| **Early Fusion Logistic Regression** | 19 Clean Features | 0.8842 | 0.1429 | 0.3896 | 0.2089 | 0.7612 | 0.1684 | Linear Continuous Proxy |
| **Early Fusion Random Forest** | 19 Clean Features | 0.9481 | 0.2432 | 0.1169 | 0.1579 | 0.8241 | 0.2215 | Non-Linear Tree Proxy |
| **Late Fusion Ensemble (Clean)** | 19 Clean Features | 0.9248 | 0.1875 | 0.2338 | 0.2081 | 0.7925 | 0.1950 | Multimodal Continuous Ranker |

### 3.3 Target Circularity & Surrogate Diagnosis
1. **Rule Reconstruction Finding:** Even without boolean flags, the continuous measurements (`robust_z_score`, `discount_percentage`, `nlp_max_discordance`, `cv_has_duplicate_hash`) allow non-linear decision trees to approximate the rule target with **ROC-AUC = 0.9999** and **$F_1 = 0.9112$**.
2. **True Generalization:** When evaluated under strict group-aware splits, the clean models achieve $F_1 \approx 0.16 - 0.21$, reflecting natural boundary variance when continuous thresholds approximate step-functions.
3. **Scientific Status:** The learned fusion model is **strictly classified as a continuous risk ranker and rule surrogate**. It does not possess independent ground-truth fraud detection capability.

---

## 4. Pre-Freeze Fusion Directives

1. **Production Deployment Choice:**  
   The primary explainable trust engine for product assessments remains the **Deterministic Evidence Fusion Engine** ([`src/trust_engine/multimodal_fusion.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/trust_engine/multimodal_fusion.py)). It provides 100% auditability, zero-penalty safety, and human-readable evidence summaries.
2. **Learned Fusion Role:**  
   The learned fusion Random Forest is preserved as a **continuous anomaly ranking model** for prioritizing items in manual audit queues, with explicit model cards warning against automated punitive actions.
3. **Supervised Product-Level Fraud Detection:**  
   Formally marked as **BLOCKED** pending external ground-truth partnerships with regulatory agencies or verified marketplace enforcement registries.
