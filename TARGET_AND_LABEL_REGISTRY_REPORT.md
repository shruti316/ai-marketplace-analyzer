# Target and Label Registry Report

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Document:** Target, Ground Truth & Label Registry  
**Phase:** Phase 2 — Complete Multimodal Intelligence Development  
**Status:** Certified Scientific Specification  
**Date:** November 11, 2026  
**Authors:** Antigravity AI Research & Engineering Team  

---

## 1. Ground Truth Principles & Scientific Integrity

A central principle of this platform is **zero synthetic ground truth treated as verified reality**.

In marketplace intelligence, the boundary between an *observable anomaly* and a *verified legal fraud verdict* must be maintained strictly:
- An anomaly is a statistically or semantically detectable divergence from expected behavior (e.g., price deviating by 4.5 MAD, identical hero image across competing brands, severe review-rating sentiment divergence).
- Confirmed fraud requires independent external ground truth (e.g., brand-owner trademark enforcement takedowns, forensic physical packaging inspections, chargeback registries).

Treating uncalibrated model outputs as confirmed fraud creates catastrophic legal, ethical, and operational liabilities.

---

## 2. Complete Target Registry & Operational Status

| Target / Model Component | Target Type | Modality Scope | Status | Scientific Reason / Block Condition |
|:---|:---|:---|:---|:---|
| **Continuous Multimodal Anomaly Rank** | Continuous $[0.0, 1.0]$ | All 5 Modalities | **ACTIVE & CALIBRATED** | Multi-stream Gated Multimodal Fusion with Isotonic Calibration. Evaluated via 5-fold cross-validation. |
| **Review Manipulation Risk Head** | Probability $[0.0, 1.0]$ | Review NLP | **ACTIVE** | Detects sentiment-rating divergence, review text duplicates, and unverified reviewer drops. |
| **Visual Duplicate Risk Head** | Probability $[0.0, 1.0]$ | Vision | **ACTIVE** | Detects SHA-256 bitwise duplicates, perceptual dHash clusters, and cross-catalog hero image reuse. |
| **Price Corridor Anomaly Head** | Probability $[0.0, 1.0]$ | Pricing | **ACTIVE** | Detects non-parametric Median Absolute Deviation (MAD) robust price outliers. |
| **Cross-Modal Discordance Head** | Probability $[0.0, 1.0]$ | Vision + Text (CLIP) | **ACTIVE** | Measures ViT-B/32 cosine distance against empirical catalog threshold ($0.20$). |
| **Track 1 Heuristic Silver Review Classifier** | Binary Classification | Review NLP | **ACTIVE (HEURISTIC)** | Trained on 600 Silver reviews with known heuristic rules. Useful for operational triage. |
| **Track 2 Gold Human-Annotated Review Classifier** | Supervised Classifier | Review NLP | **BLOCKED — HUMAN ANNOTATION REQUIRED** | Only 100 provisional reviews annotated (83 Genuine, 16 Suspicious, 1 Deceptive). Inadequate statistical support. |
| **Supervised Product Fraud Classifier** | Binary / Multi-class | All Modalities | **BLOCKED — EXTERNAL DATA REQUIRED** | Requires certified brand-owner takedown records or regulatory filings. Cannot be simulated. |

---

## 3. Detailed Target Definitions

### 3.1 Continuous Multimodal Anomaly Rank
- **Mathematical Definition:** $S_{\text{multimodal}} = \mathcal{I}\left(f_{\text{ensemble}}(\mathbf{x}'_1, \dots, \mathbf{x}'_5)\right)$ where $\mathcal{I}$ is Isotonic calibration.
- **Support Range:** $[0.0, 1.0]$.
- **Risk Tiers:**
  - `[0.00 - 0.35)`: **LOW_OBSERVED_ANOMALY** (Listing conforms to expected corridor across all observed dimensions).
  - `[0.35 - 0.65)`: **MODERATE_SINGLE_MODALITY_ANOMALY** (Isolated divergence in one modality, e.g., mild pricing outlier or studio stock photo).
  - `[0.65 - 1.00]`: **ELEVATED_MULTIMODAL_ANOMALY** (Multiple corroborating anomalies across independent modalities).
  - `SPARSE_DATA`: **UNASSESSED_SPARSE_DATA** ($K_{\text{active}} < 2$; epistemic uncertainty exceeds decision boundary).

### 3.2 Review Manipulation Risk Target
- Formulated from derived review features:
  $$y_{\text{rev}} = 0.70 \cdot \text{DuplicateReviewRatio} + 0.30 \cdot (1.0 - \text{VerifiedPurchaseRatio})$$
- Corroborated by lexical sentiment divergence: $|\text{DeclaredRating} - \text{LexicalSentimentNorm}| \ge 2.0$.

### 3.3 Visual Duplicate Risk Target
- Derived from catalog visual taxonomy:
  - Exact binary duplicate: $\text{SHA-256 match}$.
  - Perceptual near-duplicate: $\text{dHash Hamming Distance} \le 4$.
  - Cross-catalog reuse: $\text{ResNet-18 Cosine Similarity} \ge 0.95$ across distinct canonical product IDs.

### 3.4 Price Corridor Risk Target
- Non-parametric robust z-score:
  $$z_{\text{MAD}} = \frac{|\text{Price} - \text{Median}_{\text{cat}}|}{1.4826 \cdot \text{MAD}_{\text{cat}}}$$
- Anomaly threshold: $z_{\text{MAD}} \ge 3.0$ or $\text{DiscountPercentage} \ge 80\%$.

### 3.5 Cross-Modal Discordance Target
- Evaluated via OpenAI ViT-B/32 CLIP projection:
  $$\text{Discordant} = \mathbb{I}\left[\cos(\mathbf{e}_{\text{image}}, \mathbf{e}_{\text{title}}) < 0.20\right]$$
- Calibrated on empirical catalog pairs: Matched pairs mean = $0.3389$, Intra-category hard negatives mean = $0.1850$.

---

## 4. Blocked Model Protocols & Remediation Criteria

### 4.1 Track 2 Gold Review Classifier
- **Current State:** Blocked.
- **Why Blocked:** Training a supervised classifier on 100 human-annotated reviews yielded an inflated F1 of $0.9697$ and ROC-AUC of $0.9993$, which our Phase 1 scientific audit proved was an artifact of extreme sample sparsity and heuristic rating leakage.
- **Unblocking Criteria:**
  1. Minimum 1,000 double-blind human annotations following certified multi-annotator guidelines.
  2. Cohen's Kappa inter-annotator agreement $\kappa \ge 0.75$.
  3. Star rating strictly withheld from annotators and feature matrices.

### 4.2 Supervised Product Fraud Classifier
- **Current State:** Blocked.
- **Why Blocked:** No e-commerce platform provides public, verified legal fraud labels. Using synthetic or pseudo-labels creates circular confirmation bias.
- **Unblocking Criteria:**
  1. Integration with certified marketplace merchant enforcement feeds or brand protection APIs.
  2. A minimum of 500 confirmed counterfeit seizures / takedowns across Indian e-commerce platforms.
  3. Strict group-isolated train/test splits isolated at the brand and seller level.
