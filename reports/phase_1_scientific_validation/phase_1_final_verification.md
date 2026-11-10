# Phase 1 Final Verification Report — Pre-Model Freeze Audit

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Dataset Baseline:** Indian Marketplace Trust Dataset v1.7 (frozen v1.6 baseline preserved strictly intact)  
**Audit Scope:** Residual Multimodal Target Circularity, NLP Annotation Independence, Group Split Isolation, Training-to-Inference Compatibility  
**Date:** November 10, 2026  
**Status:** **AUDITED & CERTIFIED FOR CONTROLLED MODEL FREEZE**  

---

## Executive Summary & Verification Matrix

Before proceeding to model freezing and production backend integration, this audit investigated whether residual circularity, annotation selection biases, partition cross-contamination, or inference incompatibilities persist in the multimodal and NLP pipelines.

All findings are empirically grounded on the frozen dataset releases (`v1.6` and `v1.7`), without synthetic fabrication, label manipulation, or metric inflation.

| Verification Dimension | Focus Area | Status | Key Empirical Finding |
| :--- | :--- | :---: | :--- |
| **Check 1: Residual Target Circularity** | Multimodal Fusion Proxy Target Reconstruction | **PARTIALLY RESOLVED** | Direct boolean circular flags were eliminated from the 19-feature matrix. However, continuous features (`robust_z_score`, `discount_percentage`, `nlp_max_discordance`, `cv_has_duplicate_hash`) allow non-linear decision trees to reconstruct the deterministic proxy rule `active_anomalies >= 2` with up to **99.18% accuracy** and **ROC-AUC = 0.9999**. The model is formally classified as a **non-linear rule approximator / surrogate**, NOT an independent fraud detector. |
| **Check 2: NLP Annotation Independence** | Human Gold Label Selection Bias & Star Rating Coupling | **PARTIALLY RESOLVED** | While direct star-rating feature leakage was resolved via text-only TF-IDF evaluation ($F_1 = 0.2381$ to $0.4571$), inspection of `review_human_annotations.parquet` revealed **100% selection bias**: all 83 Genuine reviews have ratings $\ge 3.0$ (mean 4.43), while all 17 Suspicious/Deceptive reviews have ratings $\le 2.0$ (mean 1.29) and negative quality polarity. The single annotator violated Guideline Section 3, conflating customer dissatisfaction with fraud. |
| **Check 3: Group Split Isolation** | Multimodal Connected-Component Independence | **RESOLVED** | Certified **0 cross-fold leakage (0 overlap)** across all 5 folds of `StratifiedGroupKFold` over 3,397 connected components spanning: (1) Connected components, (2) Canonical product IDs, (3) Duplicate review clusters, (4) SHA-256 image hashes, (5) dHash perceptual hashes, and (6) ResNet visual similarity pairs ($\cos \ge 0.95$). |
| **Check 4: Training-to-Inference Compatibility** | Schema Integrity, Scaling, and REST Dispatch Smoke Test | **RESOLVED** | Canonical 19-feature schema ordering and `log1p` scaling verified. REST API dispatcher smoke tests on real catalog entities executed successfully with **sub-15ms latency** (0.52ms – 14.38ms), zero NaNs, and complete adherence to the Zero-Penalty Invariant for sparse catalog items. |

---

## 1. Residual Multimodal Target Circularity Analysis

### 1.1 Provenance of Target and Constituent Features
The supervised multimodal target `is_elevated_risk` is defined as:
$$\text{is\_elevated\_risk} = \mathbb{I}(\text{overall\_risk\_tier} == \text{'ELEVATED\_MULTIMODAL\_ANOMALY'})$$
which is assigned deterministically by `MultimodalFusionEngine.fuse_assessments` when:
$$\text{active\_anomaly\_modality\_count} \ge 2 \quad \text{and} \quad \text{available\_core\_modalities} \ge 2$$

In the initial audit, direct boolean constituent flags (`is_price_outlier`, `is_extreme_price_outlier`, `is_discount_anomaly`, `cv_has_cross_catalog_reuse`) and post-outcome late-ensemble probabilities (`heur_prob_all = active_anomalies / 3.0`) were identified as direct circular leakage and purged, creating the 19-feature clean matrix:

```
FEATURE_COLS_CLEAN = [
    'price_inr', 'discount_percentage', 'robust_z_score', 'has_reviews', 'review_count',
    'nlp_mean_rating', 'nlp_mean_sentiment', 'nlp_max_discordance', 'nlp_has_duplicate',
    'has_images', 'image_count', 'cv_has_duplicate_hash', 'ocr_observed', 'ocr_word_count',
    'ocr_brand_verified', 'clip_observed', 'clip_cosine_similarity', 'clip_is_discordant',
    'graph_degree'
]
```

### 1.2 Feature-to-Target Association Analysis
To test whether the continuous and raw features retain proxy dependency with `is_elevated_risk`, we calculated Mutual Information and Spearman rank correlation across all 3,643 catalog products:

| Feature | Mutual Information | Spearman $\rho$ | $p$-value | Underlying Deterministic Rule Proxy |
| :--- | :---: | :---: | :---: | :--- |
| `robust_z_score` | **0.0193** | 0.0300 | 0.0703 | Direct basis of `PRICE_CORRIDOR_OUTLIER` ($|z| \ge 3.0$) |
| `cv_has_duplicate_hash` | **0.0193** | **0.2625** | $1.73 \times 10^{-58}$ | Direct indicator of perceptual duplicate image clusters |
| `price_inr` | **0.0170** | 0.0223 | 0.1786 | Raw pricing observation |
| `discount_percentage` | **0.0158** | 0.0427 | 0.0099 | Direct basis of `PRICE_DISCOUNT_ANOMALY` ($\text{discount} \ge 90\%$) |
| `image_count` | **0.0152** | **0.1722** | $1.23 \times 10^{-25}$ | Image modality availability prerequisite |
| `review_count` | **0.0079** | 0.0745 | $6.69 \times 10^{-06}$ | Review modality availability prerequisite |
| `nlp_max_discordance` | **0.0058** | 0.0761 | $4.22 \times 10^{-06}$ | Direct basis of `RATING_TEXT_DISCORDANCE_ANOMALY` |
| `nlp_has_duplicate` | **0.0054** | 0.0707 | $1.96 \times 10^{-05}$ | Direct basis of `REVIEW_DUPLICATE_CLUSTER` |
| `has_images` | **0.0046** | 0.1048 | $2.28 \times 10^{-10}$ | Prerequisite for multi-modality corroboration |
| `nlp_mean_rating` | **0.0032** | 0.0822 | $6.82 \times 10^{-07}$ | Rating component of discordance score |
| `nlp_mean_sentiment` | **0.0024** | 0.0770 | $3.31 \times 10^{-06}$ | Sentiment component of discordance score |

### 1.3 Target Reconstruction Capacity
We evaluated the ability of decision trees with constrained depths ($d \in \{1, 2, 3, 5, \infty\}$) and Random Forest to reconstruct `is_elevated_risk` strictly from the 19 clean features:

| Model Architecture | Max Depth | Accuracy | Precision | Recall | $F_1$ Score | ROC-AUC | PR-AUC |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Decision Tree (Stump)** | 1 | 0.9072 | 0.2125 | 0.4416 | 0.2869 | 0.6847 | 0.1174 |
| **Decision Tree (Shallow)** | 2 | 0.8935 | 0.2104 | 0.5519 | 0.3047 | 0.7378 | 0.1943 |
| **Decision Tree** | 3 | 0.8891 | 0.2210 | 0.6429 | 0.3289 | 0.7845 | 0.2323 |
| **Decision Tree** | 5 | 0.9229 | 0.3046 | 0.6429 | 0.4134 | 0.8872 | 0.4372 |
| **Random Forest** | 5 | 0.8883 | 0.2381 | 0.7468 | 0.3611 | **0.9316** | 0.5864 |
| **Decision Tree (Unconstrained)** | None | **0.9918** | **0.8370** | **1.0000** | **0.9112** | **0.9999** | **0.9979** |

Furthermore, applying explicit raw threshold logic ($|z| \ge 3.0$ for price, $\text{discount} \ge 90\%$, and $\text{discordance} \ge 0.5$ or duplicate reviews) yielded **100% precision** against the elevated risk target.

### 1.4 Scientific Verdict on Multimodal Circularity
> [!IMPORTANT]
> **Proxy Target Circularity Finding:**  
> Although direct boolean flags were excised, the clean continuous measurements are the exact parent inputs of those flags. Consequently, a non-linear model splits on thresholds (e.g. `robust_z_score >= 3.0`, `cv_has_duplicate_hash >= 1.0`) to reconstruct the heuristic rule.
> 
> **Operational Rule:** The multimodal learned model must NOT be documented or deployed as an independent external fraud detector. It is officially designated as a **continuous rule surrogate and multi-modal risk ranker**. Claims of "detecting counterfeit or legal fraud" are strictly prohibited.

---

## 2. NLP Annotation Independence & Label Bias Audit

### 2.1 Annotation Guidelines vs. Empirical Reality
The Human Annotation Guidelines (`data/indian_marketplace_trust_dataset_v1_7/annotations/annotation_guidelines.md`) explicitly declare in Section 3:
> *"Product Experience vs. Seller Experience: Dissatisfaction with courier or delivery is not product defect.*  
> *Negative Sentiment vs. Deception: A 1-star review complaining about build quality is genuine criticism, NOT deceptive review fraud."*

We conducted an audit of all 100 human annotations in `review_human_annotations.parquet` to evaluate whether the annotator adhered to this rule.

### 2.2 Rating and Sentiment Cross-Tabulation

#### Customer Star Rating vs. Assigned Authenticity Label:
| Authenticity Label | Rating 1.0 | Rating 2.0 | Rating 3.0 | Rating 4.0 | Rating 5.0 | Total | Mean Rating |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **VERIFIED_GENUINE** | 0 | 0 | 11 | 25 | 47 | 83 | **4.43** |
| **SUSPICIOUS** | 12 | 4 | 0 | 0 | 0 | 16 | **1.25** |
| **VERIFIED_DECEPTIVE** | 0 | 1 | 0 | 0 | 0 | 1 | **2.00** |
| **Total** | 12 | 5 | 11 | 25 | 47 | 100 | — |

- Minimum rating for `VERIFIED_GENUINE`: **3.0** (0% below 3.0).
- Maximum rating for `SUSPICIOUS` or `VERIFIED_DECEPTIVE`: **2.0** (0% above 2.0).
- **Separation Boundary:** A simple split at $\text{rating} \le 2.5$ achieves **100% classification accuracy** on the Gold dataset.

#### Negative Sentiment Flag (`is_negative_sentiment_only`):
| Authenticity Label | `is_negative_sentiment_only = False` | `is_negative_sentiment_only = True` | Total |
| :--- | :---: | :---: | :---: |
| **VERIFIED_GENUINE** | 83 (100.0%) | 0 (0.0%) | 83 |
| **SUSPICIOUS** | 0 (0.0%) | 16 (100.0%) | 16 |
| **VERIFIED_DECEPTIVE** | 1 (100.0%) | 0 (0.0%) | 1 |

#### Aspect Polarity Breakdown for Non-Genuine Reviews ($N=17$):
- `aspect_quality_polarity`: **17 / 17 NEGATIVE** (100%).
- `aspect_authenticity_polarity`: **16 / 17 NEUTRAL**, **1 / 17 NEGATIVE**.
- The single review where `aspect_authenticity_polarity == NEGATIVE` is the sole `VERIFIED_DECEPTIVE` sample (`flipkart_rev_00270`).
- The remaining 16 reviews were labeled `SUSPICIOUS` exclusively because the customer complained about product quality with negative sentiment and a 1- or 2-star rating.

### 2.3 Provenance and Adjudication Audit
- **Annotator ID:** `HUMAN_EXPERT_ANNOTATOR_01` (100 / 100 reviews).
- **Adjudication Status:** `SINGLE_ANNOTATOR_VERIFIED` (100 / 100 reviews).
- **Multi-Annotator Adjudication:** `False` for all rows.
- **Inter-Annotator Agreement (Cohen's Kappa):** `NaN` (0 available calculations).

### 2.4 Scientific Verdict on NLP Annotation Independence
> [!WARNING]
> **Severe Annotation Selection Bias Identified:**  
> Despite explicit guideline instructions stating that negative sentiment is NOT deception, the human annotator systematically assigned `SUSPICIOUS` to low-star dissatisfied reviews and `VERIFIED_GENUINE` to positive high-star reviews.
> 
> **Consequence:**  
> While removing star rating from model features eliminates direct input leakage, the *ground-truth labels themselves* are contaminated by rating/sentiment selection bias. A text-only model trained on these labels is essentially learning to detect customer dissatisfaction.
> 
> **Status:** Classified as **PARTIALLY RESOLVED**. Feature leakage is resolved in code, but human annotation bias cannot be rectified until the 500 pending annotations are adjudicated by independent, multi-annotator panels.

---

## 3. Multimodal Group Split Isolation Audit

### 3.1 Grouping Graph Specification
To prevent train/test contamination, `src/data/curation/split_generator.py` constructs a unified multimodal grouping graph connecting products via:
1. Product variant hierarchies (`variants.parquet`).
2. Exact and near-duplicate review clusters (`review_nlp_features.parquet`).
3. SHA-256 exact image file hashes (`images.parquet`).
4. Perceptual dHash image matches (`images.parquet`).
5. Centered ResNet-18 visual similarity pairs at $\cos \ge 0.95$ (`image_similarity_pairs.parquet`).

**Graph Topology:**
- **Total Nodes (Canonical Products):** 3,643
- **Total Multimodal Relationship Edges:** 4,146
- **Connected Components:** 3,397 independent subgraphs

### 3.2 5-Fold Stratified Group Isolation Audit
We conducted an independent audit across all 5 folds of `StratifiedGroupKFold(n_splits=5, groups=component_id)`. The audit evaluated whether any entity or relational link crossed fold boundaries:

| Fold | Train Products | Test Products | Train Comps | Test Comps | Comp Overlap | Product Overlap | Rev Duplicate Cluster Overlap | SHA-256 Overlap | dHash Overlap | ResNet ($\cos \ge 0.95$) Overlap | Leakage Certified |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Fold 1** | 2,916 | 727 | 2,792 | 605 | **0** | **0** | **0** | **0** | **0** | **0** | **TRUE** |
| **Fold 2** | 2,911 | 732 | 2,707 | 690 | **0** | **0** | **0** | **0** | **0** | **0** | **TRUE** |
| **Fold 3** | 2,915 | 728 | 2,699 | 698 | **0** | **0** | **0** | **0** | **0** | **0** | **TRUE** |
| **Fold 4** | 2,915 | 728 | 2,695 | 702 | **0** | **0** | **0** | **0** | **0** | **0** | **TRUE** |
| **Fold 5** | 2,915 | 728 | 2,695 | 702 | **0** | **0** | **0** | **0** | **0** | **0** | **TRUE** |

### 3.3 Scientific Verdict on Partitioning
> [!NOTE]
> **Certified Zero-Leakage Guarantee:**  
> The component-aware partitioning achieves **0 crossing entities** across all 5 dimensions. All cross-validation benchmarks reported in Phase 1 adhere to this strict isolation standard.

---

## 4. Training-to-Inference Compatibility & Smoke Tests

### 4.1 Schema and Preprocessing Alignment
1. **Schema Consistency:** The tabular extractor generates exactly 19 clean features matching `FEATURE_COLS_CLEAN`.
2. **Missing-Value Imputation:** Non-punitive zero imputation (`fillna(0.0)`) is uniformly applied across all numerical arrays without creating `NaN` or `Inf` states.
3. **Log1p Scaling:** Price scaling is standardized as $x_{\text{price}} = \ln(1 + \max(0, p)) / 10.0$, ensuring identical representation between training and online inference.

### 4.2 Real Catalog Inference Smoke Test Results
To ensure inference compatibility without fabricated data, real catalog products from Amazon India and Flipkart were evaluated through both the core `TrustIntelligenceEngine` and the REST `TrustIntelligenceDispatcher`:

| Canonical Product ID | Marketplace | Core Modalities Available | Active Anomaly Modalities | Assigned Risk Tier | Zero-Penalty Invariant | Engine Latency | REST Dispatch Latency | Smoke Test Status |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: |
| `amazon_in_B000CSH3YG` | Amazon | 3 (Price, CV, NLP) | 1 (Price) | `MODERATE_SINGLE_MODALITY_ANOMALY` | Satisfied | 10.15 ms | 14.38 ms | **PASSED (200 OK)** |
| `amazon_in_B000052YQN` | Amazon | 2 (Price, CV) | 0 | `LOW_OBSERVED_ANOMALY` | Satisfied | 0.52 ms | 1.75 ms | **PASSED (200 OK)** |
| `flipkart_BRAE4A6UCHSWTURJ` | Flipkart | 1 (Price only) | 0 | `UNASSESSED_SPARSE_DATA` | **Zero Penalty Enforced** | 0.65 ms | 1.01 ms | **PASSED (200 OK)** |

### 4.3 Key Inference Invariants Verified
1. **Zero-Penalty Missing Modality Invariant:** Products with $< 2$ core modalities (`flipkart_BRAE4A6UCHSWTURJ`) are cleanly routed to `UNASSESSED_SPARSE_DATA` without adverse risk scoring.
2. **Sub-15ms Latency:** High-speed in-memory indexing achieves sub-millisecond core engine evaluation (0.52ms) and sub-15ms total REST dispatch.
3. **No Fabricated Fallbacks:** Missing fields return clean honest nulls or zero defaults without generating synthetic OCR or seller data.

---

## 5. Pre-Freeze Readiness & Integration Directive

### 5.1 Final Readiness Summary

```
========================================================================================
PRE-MODEL FREEZE COMPLIANCE CHECKLIST
========================================================================================
[x] 1. Multimodal Direct Leakage Flags Purged (19 clean features enforced)
[x] 2. Residual Circularity Documented (Rule surrogate status established)
[x] 3. NLP Feature Leakage Eliminated (Text-only F1 = 0.2381 to 0.4571 recorded)
[!] 4. NLP Human Annotation Selection Bias Documented (Rating <= 2 bias transparent)
[x] 5. Group Split Zero Leakage Certified (3,397 components, 0 fold leakage)
[x] 6. Regression Test Suite Expanded & Passing (516 / 516 tests passing)
[x] 7. Training-to-Inference Compatibility Smoke Tests Verified (200 OK, < 15ms)
========================================================================================
```

### 5.2 Directives for Model Freeze and Next Phases
1. **Model Freeze Scope:**
   - The multimodal fusion Random Forest and Logistic Regression models trained on the **clean 19 features** under component-aware splits are approved for pre-freeze packaging.
   - The models must be registered as **surrogate confidence rankers**, with strict documentation preventing external fraud claims.
2. **NLP Review Classifier:**
   - The text-only Random Forest and Logistic Regression review classifiers ($F_1 \approx 0.24 - 0.46$) are frozen as the baseline.
   - The 500 pending annotation tasks must undergo multi-annotator adjudication before deploying standalone deception classifiers.
3. **Zero Git Modifications Committed:**
   - Per project directives, all files, audit runners, and test scripts are preserved locally in the active workspace without premature Git commits.
