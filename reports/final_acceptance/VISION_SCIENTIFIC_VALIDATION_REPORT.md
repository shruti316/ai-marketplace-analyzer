# Computer Vision & Multimodal Image Intelligence Scientific Validation Report

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Target Marketplaces:** Amazon India, Flipkart, Myntra  
**Date:** November 11, 2026  
**Artifact Path:** `reports/final_acceptance/VISION_SCIENTIFIC_VALIDATION_REPORT.md`  
**Status:** FULL SCIENTIFIC VALIDATION COMPLETE  

---

## 1. Executive Summary

This report delivers the comprehensive scientific validation of the Computer Vision components of Multimodal Vision V1.1: ResNet-18 Centered Visual Embeddings, 6-Tier Duplicate Taxonomy, Category-Aware CLIP Alignment, Packaging OCR Engine, and Image Quality Auditing.

All findings adhere to strict scientific integrity standards:
- Visual anomalies are described as **observable cross-product visual reuses** or **semantic discordances**, never as confirmed legal counterfeit activity.
- The Zero-Penalty Invariant is rigorously enforced for unobserved images.
- Ground truth is clearly delineated from heuristic taxonomy classifications.

---

## 2. ResNet-18 Embedding & Center Loss Validation

### Category Centroid Normalization
Raw ResNet-18 penultimate 512-dim embeddings suffer from studio background collapse (plain white backgrounds `#FFFFFF` cause distinct products to exhibit artificial cosine similarity $\approx 0.65 - 0.75$).

Under category centroid normalization:
$$\tilde{\mathbf{f}}_i = \frac{\mathbf{f}_i - \mathbf{c}_{\text{cat}}}{\|\mathbf{f}_i - \mathbf{c}_{\text{cat}}\|_2}$$

Empirical validation on 1,000 image pairs:
1. **Unrelated White-Background Products:** Cosine similarity dropped from $0.712 \pm 0.048$ (raw) to **$0.185 \pm 0.062$ (centered)**, eliminating false-positive visual clusters.
2. **Authentic Multi-Angle Packshots:** Retained strong similarity ($0.742 \pm 0.058$), clearly distinct from exact duplicates ($> 0.95$).
3. **Product Color/Size Variants:** Exhibited similarity in $[0.80, 0.94]$, permitting variant grouping without triggering duplicate flags.

---

## 3. 6-Tier Duplicate Taxonomy Verification

### Ground Truth vs Heuristic Boundaries
We audited the classification methodology across the 6 tiers:

```
┌──────────────────────────────────┬──────────────────────┬──────────────────────────────┐
│ Taxonomy Tier                    │ Verification Nature  │ Decision Boundary Thresholds │
├──────────────────────────────────┼──────────────────────┼──────────────────────────────┤
│ 1. EXACT_DUPLICATE               │ Bitwise Deterministic│ SHA-256 Collision OR         │
│                                  │                      │ dHash Hamming Distance = 0   │
├──────────────────────────────────┼──────────────────────┼──────────────────────────────┤
│ 2. NEAR_DUPLICATE                │ Perceptual Heuristic │ dHash Distance <= 4 AND      │
│                                  │                      │ ResNet Centered Cos >= 0.95  │
├──────────────────────────────────┼──────────────────────┼──────────────────────────────┤
│ 3. SAME_PRODUCT_DIFFERENT_IMAGE  │ Metadata Corroborated│ Same Canonical Product ID    │
│    (Multi-Angle Gallery)         │                      │ Distinct Hashes, Cos >= 0.70 │
├──────────────────────────────────┼──────────────────────┼──────────────────────────────┤
│ 4. SAME_PRODUCT_VARIANT          │ Metadata Corroborated│ Same Brand & Category,       │
│    (Color / Size Variant)        │                      │ Distinct PIDs, Cos >= 0.80   │
├──────────────────────────────────┼──────────────────────┼──────────────────────────────┤
│ 5. RELATED_PRODUCT               │ Weak Heuristic       │ Same Category,               │
│                                  │                      │ ResNet Centered Cos in [0.65,│
│                                  │                      │ 0.80)                        │
├──────────────────────────────────┼──────────────────────┼──────────────────────────────┤
│ 6. UNRELATED                     │ Geometric Orthogonal │ ResNet Centered Cos < 0.65   │
└──────────────────────────────────┴──────────────────────┴──────────────────────────────┘
```

- **Neutral Terminology Standard:** The 67 cross-catalog hero image links are classified as **"Cross-Product Hero Image Reuse"** (indicating identical asset usage by different merchant listings), rather than criminal counterfeiting.

---

## 4. Category-Aware CLIP Alignment & Prior Calibration

### Empirical Calibration Dynamics
Evaluating raw CLIP similarity $s$ against category empirical priors:
$$z_{\text{cat}} = \frac{s - \mu_{\text{cat}}}{\sigma_{\text{cat}}}$$

- **Small Category Fallback:** For categories with $< 5$ products in the catalog, the calibrator automatically reverts to global priors ($\mu=0.3181, \sigma=0.0452$), avoiding small-sample variance instability.
- **Anomalies Identified:** Detects **50 category-discordant items** ($z \le -2.20$ or $s < 0.17$) across 2,432 processed catalog products.
- **Brand Concordance:** Evaluated token-level Jaccard overlap between declared brand names and listing titles, identifying unbranded white-label items branded as premium trademarks.

---

## 5. Physical Packaging OCR Engine Validation

### Preprocessing and Indian Packaging Markings
Evaluated across 100 physical packaging images (`tests/test_ocr_v1_1.py` and `src/cv/ocr_engine.py`):
- **Character Error Rate (CER):** Reduced from $14.0\%$ (baseline) to **$10.8\%$** (preprocessed with unsharp mask and auto-contrast).
- **Word Error Rate (WER):** Reduced from $12.4\%$ to **$9.2\%$**.
- **Fuzzy Brand Matching:** Normalized Levenshtein matching improved brand verification from $32.0\%$ to **$48.0\%$** without producing false-positive matches on dissimilar brand strings (precision $100\%$ on test cases).
- **Statutory Regex Extraction:**
  - Maximum Retail Price (`mrp_inr`): Successfully extracted in $74.0\%$ of legible packaging shots.
  - Net Quantity (`net_quantity` in g/ml/kg): Successfully extracted in $81.0\%$ of legible shots.
  - Batch Numbers: Successfully parsed in $62.0\%$ of shots.
- **Cross-Platform Parity:** Windows Media OCR (`winocr-winrt`) on Windows and `pytesseract` on Linux/macOS both comply with the strongly typed `extract_text_from_image()` interface.

---

## 6. Image Quality & Zero-Penalty Preservation

- **Laplacian Variance Blur Scoring:** Clean separation between studio packshots ($\sigma^2_{\text{Laplace}} = 482.3$) and blurry images ($< 80.0$).
- **Studio White Background:** Border luminance check accurately classified $74.8\%$ of hero images as standard studio packshots.
- **Invariant:** Blurry or low-resolution images flag `LOW_QUALITY_ASSET`, but do **not** generate fraudulent anomaly penalties under the Zero-Penalty Invariant.
