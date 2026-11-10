# Image Evidence Integrity, Cryptographic Hashing and Duplicate Analysis Report (v1.1)

> [!IMPORTANT]
> **Total Visual Evidence**: 5,554 records (5,228 usable physical images on local filesystem + 326 audited failed downloads).

---

## 1. Visual Evidence Overview

The visual intelligence layer serves as empirical evidence for packaging verification, visual brand consistency, and cross-listing image reuse detection.

| Cohort | Total Records | Usable Local Images | Failed Download Audits | Image Type | Local Storage Location |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Amazon India** | 1,500 | 1,500 | 0 | Hero Listing Images | `data/indian_marketplace/images/` |
| **Flipkart** | 3,534 | 3,208 | 326 | Hero & Gallery Assets | `data/indian_marketplace/images/` |
| **Amazon US Gold 100** | 100 | 100 | 0 | Physical Hero Images | `data/raw/amazon/images/` |
| **Amazon US Multi-Cat** | 420 | 420 | 0 | Physical Hero Images | `data/raw/amazon/images/` |
| **Total** | **5,554** | **5,228** | **326** | **JPEG / PNG** | **Multi-root filesystem** |

---

## 2. Cryptographic and Perceptual Hashing Architecture

For all 5,228 usable images, the pipeline generated two complementary hashes:
1. **Cryptographic SHA-256 (64 hex characters)**: Bit-exact file content verification.
2. **Perceptual dHash (16 hex characters, difference hash)**: Visual appearance fingerprinting invariant to minor compression, re-encoding, or metadata stripping.

### Verification Results
- **SHA-256 Completeness**: 5,228 / 5,228 usable images ($100.00\%$) have valid 64-char hex hashes.
- **dHash Completeness**: 5,228 / 5,228 usable images ($100.00\%$) have valid 16-char hex perceptual hashes.
- **Corrupted File Rate**: 0.00% (random sample verification confirmed 100% readable via PIL `Image.verify()`).

---

## 3. Duplicate and Cross-Listing Image Reuse Analysis

Cross-listing image reuse is a primary fraud and counterfeit signal (e.g. fraudulent sellers reusing stock manufacturer photos across counterfeit products).

### Empirical Duplicate Statistics
- **Exact SHA-256 Duplicate Clusters**: 60 clusters spanning 130 images.
  - Generates **83 pairwise `IMAGE_EXACT_DUPLICATE_OF` edges** in the entity relationship graph.
- **Perceptual dHash ($d=0$) Duplicate Clusters**: 81 clusters spanning 218 images.
  - Generates **300 pairwise `IMAGE_PERCEPTUAL_DUPLICATE_OF` edges** in the entity relationship graph.
- **Combined Duplicate Edges**: **383 verified relationship edges**.

### Evaluation Split Leakage Isolation
To prevent severe data leakage where a model recognizes duplicate images in the test set that it memorized during training:
- In v1.1, the evaluation partition algorithm executes **Union-Find clustering** across all 383 duplicate image edges.
- All products belonging to the same duplicate-image cluster are assigned atomically as an indivisible unit to either Train, Validation, or Test.
- **Audited Cross-Split Duplicate Leakage**: **0 pairs** ($100.0\%$ leakage-free).
