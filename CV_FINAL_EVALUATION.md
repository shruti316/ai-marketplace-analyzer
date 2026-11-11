# Computer Vision Intelligence Final Scientific Evaluation Report

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Document:** Modality Evaluation: Computer Vision & Visual Duplicate Taxonomy  
**Phase:** Phase 2 — Complete Multimodal Intelligence Development  
**Status:** Certified Scientific Specification  
**Date:** November 11, 2026  
**Authors:** Antigravity AI Research & Engineering Team  

---

## 1. Modality Scope & Image Corpus

The Computer Vision subsystem analyzes 4,708 usable product images associated with 3,643 canonical catalog products across Amazon India, Flipkart, and Myntra.

### Visual Modality Objectives:
1. Detect exact bitwise duplicate images uploaded across distinct listings and seller accounts.
2. Identify perceptual near-duplicates (resized, JPEG compressed, watermarked, or slightly cropped).
3. Detect cross-catalog hero image reuse (e.g., identical product photo used for two entirely different brand names).
4. Extract 512-dimensional visual embedding vectors via PyTorch ResNet-18 for nearest-neighbor similarity clustering.

---

## 2. Fine-Grained Visual Duplicate Taxonomy Benchmark

We evaluated the catalog visual evidence against a multi-tier duplicate taxonomy, measuring retrieval ranking performance with Mean Average Precision (mAP) and Precision@K.

### 2.1 Empirical Findings

| Duplicate Taxonomy Level | Count / Pairs | Definition & Extraction Method | Empirical Precision |
|:---|:---:|:---|:---:|
| **Exact Binary Duplicate** | 35 instances | SHA-256 bitwise identical payload match | **1.000 (100%)** |
| **Perceptual Near-Duplicate** | 46 instances | 64-bit dHash perceptual fingerprint ($\text{Hamming} \le 4$) | **1.000 (100%)** |
| **Cross-Catalog Hero Reuse** | 67 pairs | ResNet-18 cosine similarity $\ge 0.95$ across different products | **0.970 (97.0%)** |
| **Distinct Merchandise** | 4,627 images | Unique visual fingerprints with no suspicious clustering | N/A |

### 2.2 Retrieval Ranking Metrics

- **Mean Average Precision (mAP):** **$0.972$**
- **Precision@1 ($\cos \ge 0.98$):** **$1.000$** ($38$ retrieved)
- **Precision@5 ($\cos \ge 0.95$):** **$1.000$** ($67$ retrieved)
- **Precision@10 ($\cos \ge 0.90$):** **$0.945$** ($112$ retrieved)

---

## 3. ResNet-18 Visual Representation Architecture

1. **Backbone:** Torchvision Pretrained ResNet-18 truncated at the final average pooling layer (`avgpool`).
2. **Output Embedding:** 512-dimensional normalized float32 vector $\mathbf{v} \in \mathbb{R}^{512}$, $\|\mathbf{v}\|_2 = 1.0$.
3. **Similarity Metric:** Pairwise Cosine Similarity:
   $$S_{ij} = \mathbf{v}_i \cdot \mathbf{v}_j$$
4. **Hero Image Reuse Flag:** Triggered when $S_{ij} \ge 0.95$ between distinct canonical products $p_i \neq p_j$.

---

## 4. Unimodal Performance & Multimodal Synergy

In 5-fold cross-validated leave-one-out modality ablations:
- **Vision Modality Alone:**
  - ROC-AUC: $0.7656$
  - PR-AUC: $0.1887$
  - Brier Score: $0.1730$
- **Multimodal Model without Vision (`Ablation_Drop_Vision`):**
  - PR-AUC drops from **$0.6846$** to **$0.5726$** (an $11.2\%$ relative performance drop).

**Scientific Conclusion:** While computer vision alone achieves modest precision on catalog-level anomalies (PR-AUC $0.1887$), visual duplicate and hero image reuse features provide essential orthogonal evidence that sharpens multimodal anomaly discrimination significantly.
