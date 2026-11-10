# Computer Vision Intelligence Evaluation Report

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Phase:** Phase 1 Final — Scientific Architecture Finalization  
**Specification:** [`reports/phase_1_final/cv_evaluation_report.md`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/reports/phase_1_final/cv_evaluation_report.md)  
**Governing Modules:** ResNet-18 Embeddings, dHash, SHA-256 Retrieval Engine  

---

## 1. Visual Asset Overview & Duplication Findings

- **Total Usable Images Evaluated:** 5034
- **Exact Cryptographic Duplicates (SHA-256):** 655 files
- **Perceptual Near-Duplicates (dHash $H \le 4$):** 1482 files

---

## 2. ResNet-18 Embedding Retrieval Threshold Sensitivity

| Cosine Threshold ($\cos \theta$) | Retrieved Pairs Count | Cross-Catalog Reuse Pairs | Within-Product Variant Pairs | Precision on Visual Duplicate Benchmark |
| :---: | :---: | :---: | :---: | :---: |
| **0.85** | 2936 | 2235 | 701 | **0.96** |
| **0.9** | 2936 | 2235 | 701 | **0.96** |
| **0.92** | 1685 | 997 | 688 | **0.96** |
| **0.95** | 977 | 300 | 677 | **1.0** |
| **0.98** | 815 | 147 | 668 | **1.0** |

---

## 3. Scientific Interpretation & Policy Separation
> [!NOTE]
> **Stock Photography vs Fraud:**  
> Identical visual assets shared across listings occur legitimately when multiple authorized retailers source standard hero images from manufacturers. Catalog image reuse is a **relational similarity signal**, NEVER standalone proof of counterfeiting or fraud.
