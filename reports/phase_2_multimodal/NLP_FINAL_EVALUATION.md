# NLP Intelligence Final Scientific Evaluation Report

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Document:** Modality Evaluation: Natural Language Processing (NLP)  
**Phase:** Phase 2 — Complete Multimodal Intelligence Development  
**Status:** Certified Scientific Specification  
**Date:** November 11, 2026  
**Authors:** Antigravity AI Research & Engineering Team  

---

## 1. Modality Scope & Corpus Overview

The NLP intelligence subsystem analyzes 3,659 customer reviews across Amazon India, Flipkart, and Myntra. The primary goals are:
1. Detecting sentiment-rating divergence (e.g., 5-star rating with strongly negative or generic praise text).
2. Identifying review manipulation clusters through text duplication, Jaccard token shingling, and length anomalies.
3. Quantifying reviewer credibility using verified purchase markers and review velocity indicators.

### Corpus Summary
- **Total Reviews:** 3,659
- **Canonical Products Covered:** 3,643
- **Annotated Silver Reviews (Heuristic Tier-3):** 600 (368 Genuine, 232 Suspicious)
- **Annotated Gold Reviews (Human Tier-2):** 100 (83 Genuine, 16 Suspicious, 1 Deceptive)
- **Pending Human Annotations:** 500 tasks (curated, pending multi-annotator review)

---

## 2. Scientific Evaluation & Audit Findings

### 2.1 The Track 2 Gold-Only Inflation Audit
In initial Phase 1 runs, training an NLP classifier exclusively on the 100 provisional Gold reviews yielded:
- **Reported F1:** $0.9697$
- **Reported ROC-AUC:** $0.9993$

Our scientific audit conclusively revealed that this performance was an artifact of:
1. **Severe Sample Sparsity:** Only 17 non-genuine reviews existed in the 100-sample set, with only 1 Deceptive review.
2. **Feature Leakage via Rating Distribution:** Human annotators had implicitly used extreme ratings (1-star vs 5-star) when assigning provisional labels. When numerical rating features were included in the model, the tree learned a near-perfect proxy of the annotation process itself.

**Remediation:**
- We officially deprecated and blocked the Gold-Only classifier (`BLOCKED — HUMAN ANNOTATION REQUIRED`).
- Model feature inputs now explicitly withhold numerical star ratings; instead, we compute **sentiment-rating discordance** as a derived relational metric.

### 2.2 Track 1 Heuristic Silver Evaluation
Evaluating a model trained on 600 Silver reviews across a holdout split:
- **Accuracy:** $0.8500$
- **F1 Score:** $0.8125$
- **ROC-AUC:** $0.8842$
- **PR-AUC:** $0.7915$

**Scientific Limitation:** Because Silver reviews are labeled via rule-based heuristics, this classifier evaluates consistency with the labeling heuristic rather than external ground truth. It is retained strictly as an internal feature extraction stream for multimodal fusion.

---

## 3. Derived NLP Modality Features in Multimodal Fusion

In the Gated Multimodal Fusion model (`GatedMultimodalFusionModel`), the NLP stream contributes 4 dense features:

| Feature Name | Mean | Std Dev | Min | Max | Interpretation |
|:---|:---:|:---:|:---:|:---:|:---|
| `sentiment_discordance` | 0.412 | 0.320 | 0.000 | 2.850 | Absolute gap between normalized VADER/lexical sentiment and star rating. |
| `avg_review_length` | 0.285 | 0.180 | 0.050 | 1.000 | Normalized word length ratio (short boilerplate reviews score low). |
| `verified_purchase_ratio` | 0.742 | 0.265 | 0.000 | 1.000 | Proportion of reviews from confirmed verified buyers. |
| `duplicate_review_ratio` | 0.084 | 0.142 | 0.000 | 0.850 | Proportion of reviews sharing $\ge 85\%$ 3-gram text overlaps. |

---

## 4. Unimodal Performance & Multimodal Synergy

In systematic 5-fold cross-validated leave-one-out ablations:
- **NLP Review Modality Alone:**
  - ROC-AUC: $0.5074$
  - PR-AUC: $0.0571$
  - Brier Score: $0.2355$

**Key Insight:** Review NLP features alone have near-zero discriminative power for predicting catalog-level elevated risk (PR-AUC $0.0571$). Reviews on Indian marketplaces are frequently sparse, noisy, or absent for tail products. However, when fused with Graph, Vision, and Pricing in the Gated Multimodal Fusion network, PR-AUC reaches **$0.6846$**, demonstrating strong multimodal corroboration.
