# Evaluation Split Manifests and Protocol Specification (v1.1)

> [!NOTE]
> **Evaluation Partitions**: Parquet manifests stored under `data/marketplace_trust_dataset_v1.1/evaluation/`.

---

## 1. Partition Inventory

The evaluation directory provides standard, leakage-free partitions for reproducible benchmarking:

| Manifest File | Record Count | Share | Target Modalities | Evaluation Role |
| :--- | :--- | :--- | :--- | :--- |
| `train_manifest.parquet` | 4,230 products | 70.00% | Text, Image, Price, Category | Model training and feature representation learning |
| `validation_manifest.parquet` | 906 products | 14.99% | Text, Image, Price, Category | Hyperparameter tuning and checkpoint selection |
| `test_manifest.parquet` | 907 products | 15.01% | Text, Image, Price, Category | Held-out generalization and benchmark reporting |
| `external_benchmark_manifest.parquet` | 42,126 reviews | N/A | Review Text, Ground Truth Labels | Zero-shot deception and synthetic text calibration |
| `stress_test_manifest.parquet` | 5 test cases | N/A | Edge-case Payloads | Pipeline resilience and adversarial stress testing |

---

## 2. Standard Evaluation Protocols

To ensure rigorous benchmarking across research papers and portfolio demonstrations, models trained on this dataset should adhere to the following protocols:

### Protocol 1: Multimodal Core Fusion (Tier A)
- **Target Population**: 105 Tier A products (Train: 74, Val: 15, Test: 16).
- **Inputs**: Visual hero image + customer review texts + observed price + product metadata.
- **Metric**: Macro F1-score across trust classes, Area Under Precision-Recall Curve (AUPRC).

### Protocol 2: Unimodal NLP Review Deception
- **Target Population**: Customer reviews from `reviews.parquet` partitioned by product ID.
- **Zero-Shot Transfer**: Models fine-tuned on `train_manifest` are evaluated against `test_manifest` and zero-shot calibrated on `external_benchmark_manifest`.
- **Metric**: Accuracy, Balanced Accuracy, Precision, Recall.

### Protocol 3: Cross-Sectional Price Anomaly Detection
- **Target Population**: 6,043 price observations partitioned by product ID.
- **Inputs**: Normalized INR price, category, brand, title embeddings.
- **Metric**: True Positive Rate at 1% False Positive Rate (TPR@1%FPR).

### Protocol 4: Adversarial Stress Testing
- **Inputs**: 5 synthetic edge cases from `stress_test_manifest`.
- **Criterion**: System must handle extreme outliers, null payloads, and oversized text without unhandled exceptions or service crashes.
