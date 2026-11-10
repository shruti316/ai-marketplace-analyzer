# Milestone 5: Model Benchmark & Classification Report
**Platform:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Dataset Release:** `v1.7`  
**Date:** November 10, 2026

---

## 1. Benchmark Overview & Problem Formulation

The primary supervised machine learning task in the platform is **Review Deception and Inauthenticity Detection**:
- **Input:** Customer review text (`review_text_normalized`), star rating (`rating`), character length, VADER sentiment polarity, rating-text discordance score, and duplicate cluster indicators.
- **Output:** Binary classification $\hat{y} \in \{0 = \text{Genuine}, 1 = \text{Suspicious/Deceptive}\}$.
- **Evaluation Set:** Independent, held-out test split ($N=105$) from a stratified 70/15/15 split of 700 labeled marketplace reviews.

---

## 2. Model Performance Benchmarks

| Metric | Majority Class Baseline | Heuristic Rule Baseline | Logistic Regression | Random Forest Classifier |
| :--- | :--- | :--- | :--- | :--- |
| **Accuracy** | 64.76% | 85.71% | 84.76% | **87.62%** |
| **Precision (Class 1)** | 0.00% | 78.95% | 78.38% | **83.33%** |
| **Recall (Class 1)** | 0.00% | 81.08% | 78.38% | **81.08%** |
| **F1-Score (Macro)** | 0.0000 | 0.8000 | 0.7838 | **0.8219** |
| **PR-AUC (Avg Precision)** | N/A | N/A | **0.8601** | 0.8488 |
| **ROC-AUC** | N/A | N/A | 0.8756 | **0.8810** |

---

## 3. Error Analysis

From the Random Forest confusion matrix on the 105 test reviews:
- **False Positives ($N=6$):** Reviews containing extreme negative sentiment ("very bad quality broken on day 1") that the model flagged as potential manipulation due to high rating discordance or short text length, but which the human annotator marked genuine customer frustration.
- **False Negatives ($N=7$):** Subtle promotional or incentivized reviews that used diverse, non-repetitive vocabulary without explicit discount keywords, slipping past both the TF-IDF vocabulary and heuristic rules.

---

## 4. Distinction Between Heuristic and Supervised Artifacts

1. **Supervised Artifacts:**
   - `ReviewDeceptionClassifier` (Random Forest, Logistic Regression): Trained and evaluated on empirical ground-truth review labels.
2. **Heuristic & Statistical Artifacts:**
   - Pricing IQR benchmark corridors ($[Q_1 - 1.5\text{IQR}, Q_3 + 1.5\text{IQR}]$)
   - Perceptual image hashing (dHash) and cosine similarity thresholding ($\cos \ge 0.95$)
   - Graph ego-subgraph traversal and platform seller aggregation
   - Multimodal Corroboration Engine: Deterministic rule-based fusion enforcing Zero-Penalty and Cross-Modal Corroboration.
