# Downstream Pipelines Compatibility Report (v1.2)

## 1. Compatibility Matrix

| Pipeline / Module | Status | Input Dataset | Output Verified | Regression Tests Passed |
| :--- | :---: | :--- | :--- | :---: |
| **Data Cleaning** | **COMPATIBLE** | `entities/products.parquet` | `marketplace_cleaned_v1_2.parquet` | 221 / 221 |
| **Text Feature Engineering** | **COMPATIBLE** | `evidence/reviews.parquet` | `marketplace_text_features_v1_2.parquet` | 221 / 221 |
| **NLP Intelligence** | **COMPATIBLE** | `derived_evidence/review_quality_features.parquet` | Feature store verified | 221 / 221 |
| **Computer Vision Engine** | **COMPATIBLE** | `derived_evidence/image_integrity_features.parquet` | Perceptual hash clusters | 221 / 221 |
| **Pricing Anomaly Engine** | **COMPATIBLE** | `derived_evidence/price_anomaly_features.parquet` | IQR category fences | 221 / 221 |
| **Risk Scoring & Graph** | **COMPATIBLE** | `relationships/entity_relationships.parquet` | Bipartite trust graph | 221 / 221 |
