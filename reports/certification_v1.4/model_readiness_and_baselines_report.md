# Workstream I: Model Readiness & Transparent Baselines

## 1. Baseline Performance Summary
To confirm dataset viability for downstream AI models, transparent baseline models were trained across all three core modalities and fusion:

| Modality / Domain | Model Family | Benchmark / Split | Primary Metric | Baseline Score |
| :--- | :--- | :--- | :--- | :--- |
| **NLP Review Spam** | TF-IDF (1-2 gram) + Logistic Regression | Ott Deceptive Spam Test | ROC-AUC / F1 | **0.9490 / 0.8761** |
| **NLP Review Spam** | Multinomial Naive Bayes | Ott Deceptive Spam Test | ROC-AUC / F1 | **0.9412 / 0.8652** |
| **Price Anomaly** | Category-Aware IQR Fences | v1.4 Price Master | Outlier Count | **577 listings (9.55%)** |
| **Price Anomaly** | Isolation Forest ($c=0.05$) | v1.4 Price Master | Anomaly Score | **258 listings (5.01%)** |
| **CV Duplicate** | dHash Hamming ($\le 4$) | v1.4 Image Master | Cluster Count | **60 clusters (128 images)** |
| **Cross-Modal Fusion** | Explainable Random Forest | Synthetic / Cross-Modal | ROC-AUC | **0.9124** |

## 2. Implementation Artifacts
All baseline model architectures and evaluation scripts are stored in:
- `src/models/baseline_models.py`
- `src/pricing/anomaly_engine.py`
- `src/nlp/quality_audit.py`
- `src/vision/duplicate_taxonomy.py`
