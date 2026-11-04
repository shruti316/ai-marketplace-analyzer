# Dataset v1.5 Model Evaluation & Baseline Performance

## 1. Deceptive Opinion Spam Baseline (Ott Benchmark)
Trained strictly on the isolated Cornell psycholinguistic lab benchmark (1,600 reviews):
- **Task Type:** Deceptive Opinion Spam Classification (Hotel benchmark, NOT confirmed marketplace fraud).
- **Split:** 80% Train (1,280 reviews) / 20% Test (320 reviews), random seed 42.

| Model Architecture | Precision | Recall | F1-Score | ROC-AUC | PR-AUC | Confusion Matrix |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TF-IDF + Logistic Regression** | 0.9006 | 0.8529 | **0.8761** | **0.9490** | **0.9549** | `[[134, 16], [25, 145]]` |
| **Multinomial Naive Bayes** | 0.9030 | 0.8765 | **0.8896** | **0.9573** | **0.9616** | `[[134, 16], [21, 149]]` |

## 2. Retirement of Circular Fusion Metric
- In v1.4, a Random Forest fusion model reported ROC-AUC 0.9124.
- Audit revealed that `composite_risk_label` was constructed as `((is_duplicate_image > 0) + (price_iqr_ratio > 1.5) + (rating_deviation_from_mean > 1.5)) >= 2`, which was a deterministic combination of the input features.
- In v1.5, this metric is **permanently retired**. Multi-modal evidence aggregation is implemented as an unsupervised index without false predictive claims.
