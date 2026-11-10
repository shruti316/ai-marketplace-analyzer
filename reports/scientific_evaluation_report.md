# Milestone 5: Scientific Evaluation & Empirical Validation Report
**Platform:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Dataset Release:** `v1.7` Certified Benchmark Splits  
**Date:** November 10, 2026

---

## 1. Executive Summary

This report provides empirical, evidence-based evaluation of the machine learning, computer vision, pricing, and multimodal fusion engines.

All evaluations are conducted either on:
1. Certified leakage-safe test splits (`test_split.parquet`, 547 products),
2. Review-level benchmark splits with de-duplicated test partitions (105 test reviews), or
3. Full catalog statistical audits across 3,643 canonical marketplace products.

No performance metrics or confusion matrices are synthetic. Every value is derived directly from executable pipelines.

---

## 2. Supervised Review Deception Classification Benchmark

Evaluated on 700 labeled reviews (100 Tier-2 Gold Human Annotations + 600 Tier-3 Silver Heuristic Annotations), partitioned into Train (490), Validation (105), and Test (105) splits (Positive rate: 35.57%).

| Model / Algorithm | Accuracy | Precision | Recall | F1-Score | PR-AUC | ROC-AUC |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Majority Class Baseline** | 0.6476 | 0.0000 | 0.0000 | 0.0000 | N/A | N/A |
| **Heuristic Rule Baseline** | 0.8571 | 0.7895 | 0.8108 | 0.8000 | N/A | N/A |
| **Logistic Regression (TF-IDF + Numeric)** | 0.8476 | 0.7838 | 0.7838 | 0.7838 | **0.8601** | 0.8756 |
| **Random Forest Classifier (100 Trees)** | **0.8762** | **0.8333** | **0.8108** | **0.8219** | 0.8488 | **0.8810** |

### Confusion Matrix on Test Split ($N=105$)

#### Random Forest Classifier:
$$\begin{pmatrix} \text{TN}=62 & \text{FP}=6 \\ \text{FN}=7 & \text{TP}=30 \end{pmatrix}$$

#### Logistic Regression:
$$\begin{pmatrix} \text{TN}=60 & \text{FP}=8 \\ \text{FN}=8 & \text{TP}=29 \end{pmatrix}$$

---

## 3. Computer Vision & Visual Embedding Benchmark

- **Total Images Analyzed:** 5,034
- **Unique SHA-256 Checksums:** 4,376 (658 exact duplicate files)
- **Unique Perceptual dHash Checksums:** 4,059 (975 perceptual duplicates)
- **High-Similarity ResNet-18 Embedding Pairs ($\cos \ge 0.95$):** 977 pairs
- **Moderate-Similarity ResNet-18 Embedding Pairs ($0.90 \le \cos < 0.95$):** 1,959 pairs
- **Cross-Product Image Sharing Pairs:** 2,235 pairs

### Blocked Dependencies Audit:
- **Physical OCR:** Blocked due to missing system `tesseract-ocr` binary and uninstalled `easyocr`. Interface reports `BLOCKED_DEPENDENCY_UNAVAILABLE` with clear actionable remediation.
- **Vision-Language CLIP:** Blocked due to uninstalled HuggingFace `transformers` library. Interface reports `BLOCKED_DEPENDENCY_UNAVAILABLE`.

---

## 4. Pricing Intelligence & Benchmark Corridor Evaluation

- **Total Price Observations:** 3,643
- **Robust Category Corridors Generated:** 343 subcategory benchmarks
- **Corridor Outliers ($k=1.5 \times \text{IQR}$):** 444 (12.19% outlier rate)
- **Extreme Corridor Outliers ($k=3.0 \times \text{IQR}$):** 353
- **Discount Anomalies ($\text{Discount} > 90\%$ or Discordant):** 2 records
- **Selling Price Exceeds MRP Violations:** 0 (0% legal violations in verified records)

---

## 5. Multimodal Ablation & Corroboration Study

| Modality / Architecture Configuration | Flagged Anomalies | Promoted to High Risk | Filtered as Isolated | False-Positive Reduction |
| :--- | :--- | :--- | :--- | :--- |
| **Review NLP Only** | 129 products | 129 | 0 | 0.0% |
| **Pricing Only** | 446 products | 446 | 0 | 0.0% |
| **Image CV Only** | 138 products | 138 | 0 | 0.0% |
| **Full Multimodal Fusion (Corroborated)** | **713 total flags** | **154 products** | **413 products** | **57.92%** |

### Robustness to Sparse Data (Zero-Penalty Invariant):
- 1,088 catalog products have $<2$ core modalities.
- **False-Positive Rate on Sparse Products:** **0.00%** (100% assigned to `UNASSESSED_SPARSE_DATA`).
- **Verified Consistent Products:** 1,988 products in `LOW_OBSERVED_ANOMALY`.
