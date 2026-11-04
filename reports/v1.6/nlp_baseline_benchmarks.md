# NLP Baseline Benchmarks Report — Protocol 3 (v1.6)

**Project:** AI-Powered Marketplace Trust Intelligence Platform  
**Milestone:** Release v1.6  
**Author:** Lead NLP Engineer & ML Evaluation Auditor  
**Status:** Certified Benchmark  

---

## 1. Executive Summary

In Release v1.6, we establish the first leakage-free NLP model benchmark on the marketplace dataset under **Protocol 3 (Reviewer-Held-Out Split)**.

Past iterations of the project relied on ad-hoc train/test splits that risked named reviewer leakage (where reviews written by the same customer appeared in both training and test sets). In this evaluation, named reviewer identities are strictly grouped, ensuring **0% reviewer leakage** between training and test sets.

---

## 2. Benchmark Task & Dataset Split

- **Task Formulation:** Binary Sentiment Classification
  - Positive Class ($y = 1$): Customer Rating $\ge 4.0$
  - Negative Class ($y = 0$): Customer Rating $\le 2.0$
  - Neutral reviews (Rating $= 3.0$) are excluded from the binary benchmark to evaluate unambiguous sentiment signals.
- **Evaluation Partition:**
  - **Train Set:** 38,532 reviews across 28,140 unique reviewers.
  - **Test Set:** 12,314 reviews across 9,380 unique reviewers.
  - **Named Reviewer Leakage:** Exactly 0 reviewers shared across partitions.
  - **Test Set Positive Class Prevalence:** 89.96% positive ratings.

---

## 3. Benchmark Results

| Model Architecture | Feature Representation | Accuracy | Balanced Accuracy | Precision | Recall | F1-Score | ROC-AUC |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Logistic Regression (L2)** | TF-IDF (10,000 1-2 n-grams) | **0.9510** | **0.8134** | **0.9530** | 0.9935 | **0.9728** | **0.9774** |
| **Multinomial Naive Bayes** | TF-IDF (10,000 1-2 n-grams) | 0.9419 | 0.7733 | 0.9433 | 0.9938 | 0.9679 | 0.9719 |
| **Rule-Based Lexicon** | Keyword Matching Heuristic | 0.8990 | 0.5904 | 0.9015 | **0.9941** | 0.9455 | 0.7983 |

---

## 4. Key Scientific Insights

1. **Anti-Circularity Verification:**
   The classification target is the customer's raw historical rating ($\ge 4$ vs $\le 2$). The target was **never** constructed using derived features, review quality scores, or composite risk indices.
2. **High Generalization Under Reviewer Disjointness:**
   Both Logistic Regression (ROC-AUC 0.9774) and Multinomial Naive Bayes (ROC-AUC 0.9719) demonstrate high generalization to unseen reviewers, showing that customer textual expression in e-commerce carries robust lexical sentiment cues across product categories.
3. **Artifact Provenance:**
   Benchmark results are serialized to `data/processed_v1_6/nlp_baseline_results_v1_6.json`.
