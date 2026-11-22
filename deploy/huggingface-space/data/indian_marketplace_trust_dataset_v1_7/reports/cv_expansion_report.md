# Computer Vision Dataset Expansion & Product-Level Visual Feature Engineering Report

**Date:** 2026-11-02
**Platform:** AI-Powered Marketplace Trust Intelligence
**Component:** Computer Vision Pipeline (`src/vision`)
**Scope:** Stages 1–4 (Acquisition, Multimodal Quality Assessment, ResNet-18 Embedding Extraction, and Product-Level Aggregation)

---

## 1. Executive Summary

This report documents the completion of the Computer Vision (CV) dataset expansion and product-level visual feature aggregation for the AI-Based Marketplace Analyzer platform.

The CV pipeline has expanded beyond the initial 520-image pilot dataset to cover the entire canonical image catalog (**13,390 image records**) and integrated visual features across all **31,289 products** in `canonical_products.parquet`.

### High-Level Milestones:
- **Total Canonical Image Records:** 13,390 across 3,220 distinct products.
- **Downloaded Images:** 11,808 images (88.19% retrieval success; 0 byte-stream corruptions).
- **Usable Images Identified:** 5,887 images (43.97% catalog usability; 49.86% of downloaded images).
- **ResNet-18 Embeddings Extracted:** 5,887 vectors (512-dimensional, unit L2-normalized).
- **Product-Level Dataset:** Exactly 31,289 products with 48 multimodal visual features and 1,647 unit L2-normalized 512-dimensional pooled embeddings.
- **Safety & Baseline Preservation:** All pre-existing baseline artifacts (`canonical_images.parquet`, 520-image pilot embeddings, `canonical_products.parquet`) remain 100% byte-for-byte identical (cryptographically verified).

---

## 2. Image Usability & Honest Coverage Reconciliation

While HTTP retrieval succeeded for 11,808 records (88.19%), usable image coverage reached **5,887 images (43.97%)**. In strict accordance with platform directives, image quality standards were never relaxed or compromised to artificially hit arbitrary numerical quotas.

### Honest Coverage Breakdown by Marketplace:

| Marketplace | Total Records | Successfully Downloaded | Usable Images | Usability Rate (%) | Primary Reason for Non-Usable Records |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Flipkart** | 3,534 | 3,208 | 3,208 | **90.78%** | 326 HTTP 404/timeouts on legacy CDN URLs (`static01.digital.flipkart.com`). |
| **Amazon US** | 3,909 | 3,909 | 2,679 | **68.53%** | 1,230 images were 40×40 thumbnails (`_SS40_`) categorized as `LOW_QUALITY`. |
| **Amazon India** | 5,947 | 4,691 | 0 | **0.00%** | Raw catalog contained 1,491 transparent 1×1 tracking GIFs (`IRRELEVANT`), 3,200 40×40 thumbnails (`LOW_QUALITY`), and 1,256 dead links (`DOWNLOAD_FAILED`). |
| **Total** | **13,390** | **11,808** | **5,887** | **43.97%** | All usable assets passed strict dimension, sharpness, and integrity criteria. |

---

## 3. Multimodal Quality Assessment Breakdown (Stage 2)

All 11,808 downloaded images were assessed for dimensions, aspect ratio, Laplacian sharpness, luminance, contrast, WinRT OCR readability, and cryptographic/perceptual hashes.

| Quality Classification | Count | Usable for Embeddings | Technical Criteria & Rationale |
| :--- | :---: | :---: | :--- |
| **VALIDATED** | 4,024 | Yes | Sharpness >= 100, resolution >= 64×64, distinct perceptual content. |
| **NEAR_DUPLICATE** | 1,533 | Yes | Perceptual dHash distance <= 4 against a representative lead image; retained as distinct visual evidence. |
| **DUPLICATE** | 330 | Yes | Cryptographic SHA-256 exact match with a usable lead asset; vector reused to avoid redundant inference. |
| **LOW_QUALITY** | 4,430 | No | Sub-64px thumbnail resolutions (predominantly 40×40 px) or extreme blur; rejected to avoid artifact contamination. |
| **IRRELEVANT** | 1,491 | No | 1×1 transparent tracking spacers (`transparent-pixel._V192234675_.gif`); rejected from deep learning. |
| **CORRUPTED** | 0 | No | Zero decodable byte-stream corruptions. |
| **DOWNLOAD_FAILED** | 1,582 | No | Remote CDN 404/400 errors or connection timeouts logged to failure audit CSV. |
| **Total Catalog** | **13,390** | **5,887 Usable** | **Strict partition across all catalog records.** |

### Duplicate & Secondary Record Reconciliation:
- Total unique SHA-256 hashes across downloaded images: **9,840**
- Total duplicate groups: **441 groups** spanning 2,409 records (1 lead + 1,968 secondary duplicate records).
- Breakdown of 1,968 secondary duplicate records:
  - 1,490 secondary 1×1 tracking GIFs (classified as `IRRELEVANT`).
  - 148 secondary 40×40 thumbnails (classified as `LOW_QUALITY`).
  - 330 secondary usable product images (classified as `DUPLICATE` and granted duplicate-vector reuse).

### OCR Performance:
- Denominator evaluated: 5,875 usable candidates (5,341 newly scanned + 204 pre-existing baseline + 330 inherited duplicates).
- Images with readable text detected: **2,004** (34.11% of usable images).
- Images without readable packaging text: **3,871**.
- OCR failure / error rate: **0** (Native Windows WinRT engine executed with 100% operational success).

---

## 4. ResNet-18 Embedding Extraction (Stage 3)

- **Model Architecture:** Pretrained ResNet-18 (Torchvision 0.20), final linear classification head replaced with `nn.Identity()`.
- **Output Dimensions:** 512 dimensions, unit L2-normalized (`||v||_2 = 1.0000 ± 1e-4`).
- **Batch Processing:** Forward passes executed on CPU in batches of 64 with standard ImageNet normalization (`mean=[0.485, 0.456, 0.406]`, `std=[0.229, 0.224, 0.225]`).
- **Duplicate Optimization:**
  - 5,557 forward passes executed (4,024 `VALIDATED` + 1,533 `NEAR_DUPLICATE`).
  - 330 exact duplicate vectors reused from identical SHA-256 lead images, avoiding redundant compute while preserving separate metadata entries and image IDs.
- **Artifacts Created:**
  - `data/processed/expanded_image_embeddings_resnet18.npy` (`(5887, 512)`, float32, 12.06 MB)
  - `data/processed/expanded_image_embeddings_metadata.parquet` (5,887 rows, 10 columns)
  - `data/processed/expanded_embedding_extraction_report.json`

---

## 5. Product-Level Visual Feature Aggregation (Stage 4)

The product-level dataset `data/processed/cv_product_features_expanded.parquet` preserves the full canonical catalog of **31,289 products**, guaranteeing 1 row per `canonical_product_id`.

### A. Product Coverage & Visual Evidence Status:

| Visual Evidence Status | Product Count | % of Catalog | Definition & Platform Treatment |
| :--- | :---: | :---: | :--- |
| **NO_IMAGE_RECORDS** | 28,069 | 89.71% | Products from text-only or non-scraped sources (e.g. Walmart, BestBuy, Myntra). Measurements set to `NaN`, counts to `0`. **Never penalized as fraud.** |
| **NO_USABLE_IMAGES** | 1,573 | 5.03% | Products with image records where all images were thumbnails, tracking pixels, or dead links (1,500 Amazon IN, 68 Flipkart, 5 Amazon US). Embeddings set to `NaN`. |
| **USABLE_IMAGE_EVIDENCE** | 1,335 | 4.27% | Products where 100% of image records are verified usable (918 Flipkart, 417 Amazon US). Fully populated 512-dim product embeddings. |
| **PARTIAL_IMAGE_EVIDENCE** | 312 | 1.00% | Products with at least 1 usable image alongside low-quality or failed images (298 Amazon US, 14 Flipkart). Fully populated 512-dim product embeddings. |
| **Total Products** | **31,289** | **100.00%** | **Complete catalog coverage.** |

### B. Embedding Aggregation Methodology:
- **Pooling over Unique Assets:** For products with multiple usable images, mean pooling was computed strictly across *unique SHA-256 assets* (`embedding_unique_asset_count`). This prevents sellers from artificially weighting product representations by repeatedly uploading identical image files.
- **Preservation of Near-Duplicates:** Distinct image captures of the same product (different angles, slight lighting variations with dHash <= 4) are retained as distinct visual assets in the pooled mean.
- **Unit L2 Normalization:** The resulting pooled vector is L2-normalized:
  $$\mathbf{v}_{\text{prod}} = \frac{\frac{1}{K}\sum_{k=1}^K \mathbf{v}_k}{\left\|\frac{1}{K}\sum_{k=1}^K \mathbf{v}_k\right\|_2}$$
- **Absence Representation:** Products without usable visual evidence have missing embeddings (`NaN`/`None`), strictly avoiding fabricated zero vectors that would distort cosine similarity computations.

### C. Syndication & Duplication Evidence for Risk Scoring:
- **Cross-Product Duplicate Sharing:** 1,549 products share identical image hashes with at least one other distinct canonical product (spanning 1,698 total duplicate image instances).
- **Within-Product Duplication:** 290 products contain internal duplicate uploads.
- **OCR Packaging Consistency:** 645 products have verified packaging text evaluated against listing titles and brands (mean consistency score: **0.306**).

---

## 6. Output Artifacts Directory

| Artifact Path | Format | Size / Dimensions | Description |
| :--- | :---: | :---: | :--- |
| `data/processed/cv_product_features_expanded.parquet` | Parquet | 31,289 rows × 48 cols (~6.5 MB) | Master product visual feature table covering all 31,289 canonical products. |
| `data/processed/cv_product_embeddings_expanded.npy` | NumPy | `(1647, 512)` float32 (3.37 MB) | Unit L2-normalized pooled embeddings for all 1,647 products with usable visual evidence. |
| `data/processed/cv_product_embeddings_metadata.parquet` | Parquet | 1,647 rows × 6 cols (49 KB) | Aligns row index in `.npy` to `canonical_product_id`, asset counts, and marketplace. |
| `data/processed/cv_product_aggregation_report.json` | JSON | 51 lines (2.1 KB) | Machine-readable validation metrics and coverage counts. |
| `data/processed/expanded_image_embeddings_resnet18.npy` | NumPy | `(5887, 512)` float32 (12.06 MB) | Image-level 512-dim ResNet-18 embeddings for all 5,887 usable images. |
| `data/processed/expanded_image_embeddings_metadata.parquet` | Parquet | 5,887 rows × 10 cols (177 KB) | Image-level embedding metadata and source linkage. |
| `data/interim/expanded_image_manifest.parquet` | Parquet | 13,390 rows × 35 cols (~3.2 MB) | Complete image-level manifest with download, quality, hashing, and OCR fields. |
| `data/processed/image_quality_report.parquet` | Parquet | 13,390 rows × 27 cols (~2.8 MB) | Formal quality assessment report across all canonical records. |

---

## 7. Mandatory Validation Results

All 14 independent verification checks passed:

1. **[PASS] Catalog Preservation:** Exactly 31,289 rows in `cv_product_features_expanded.parquet`.
2. **[PASS] ID Uniqueness:** All 31,289 `canonical_product_id`s are unique.
3. **[PASS] Exact ID Match:** 100.0% set equivalence with `canonical_products.parquet`.
4. **[PASS] Image Count Reconciliation:** $\sum \text{total} = 13,390$, $\sum \text{downloaded} = 11,808$, $\sum \text{usable} = 5,887$.
5. **[PASS] Embedding Image Reconciliation:** $\sum \text{embedding\_image\_count} = 5,887$.
6. **[PASS] Missing Embedding Integrity:** All 29,642 products without usable images have `NaN`/`None` embeddings (zero fabricated vectors).
7. **[PASS] Embedding Dimensionality:** Populated product embedding matrix has shape `(1647, 512)`.
8. **[PASS] Numerical Finiteness:** Zero `NaN` or `Inf` values in populated embeddings.
9. **[PASS] Unit L2 Normalization:** All 1,647 product embeddings have $\|v\|_2 = 1.000000 \pm 10^{-6}$.
10. **[PASS] Unique Asset Pooling:** Exact duplicate assets did not inflate pooling weights.
11. **[PASS] Near-Duplicate Preservation:** Distinct near-duplicate images preserved as independent visual assets.
12. **[PASS] Absence Integrity:** Products with 0 images have `NaN` for coverage ratios, sharpness, and packaging scores.
13. **[PASS] Status Partition:** Evidence status partitioned into `NO_IMAGE_RECORDS` (28,069), `NO_USABLE_IMAGES` (1,573), `USABLE_IMAGE_EVIDENCE` (1,335), and `PARTIAL_IMAGE_EVIDENCE` (312).
14. **[PASS] Baseline Preservation:** Cryptographic SHA-256 checks confirm `canonical_images.parquet`, `image_embeddings_resnet18.npy`, `image_embeddings_resnet18_metadata.parquet`, and `canonical_products.parquet` remain 100% byte-for-byte identical.

---

## 8. Operational Boundaries & Next Steps

In compliance with instructions:
- **No changes** have been made to the risk engine, canonical pipeline, NLP baseline models, or scoring algorithms.
- **No code** has been committed, pushed, or deployed.
- Stage 4 is concluded and awaiting user review and explicit authorization.
