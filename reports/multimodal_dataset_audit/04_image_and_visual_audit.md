# Independent Image & Visual Asset Audit Report

**Project:** AI-Powered Marketplace Trust Intelligence Platform  
**Target:** `data/indian_marketplace/phase3/images.parquet` & Local Image Storage  
**Asset Scale:** 5,034 Image Records (4,708 Usable Physical Images)  
**Date:** November 2, 2026  

---

## 1. Core Image Metrics & Usability Breakdown

| Metric | Measured Value | Percentage | Audit Finding / Evaluation |
| :--- | :---: | :---: | :--- |
| **Total Image Records** | **5,034** | 100.0% | Complete image database records |
| **Usable Physical Images** | **4,708** | 93.52% | Verified readable images on local disk |
| **Failed Image Records** | **326** | 6.48% | Unusable images from original scrape |
| **Physical Files on Disk** | **4,708 / 4,708** | 100.0% | 100% of usable images exist on disk |
| **Amazon India Images** | **1,500** | 31.86% of usable | Recovered high-resolution primary assets |
| **Flipkart Images** | **3,208** | 68.14% of usable | Validated cached PromptCloud assets |
| **Myntra Images** | **0** | 0.00% | 0 local images in project cache |
| **Recovered Electronics Images** | **0** | 0.00% | 0 local images for 143 recovered items |
| **Products Covered by Images** | **2,432 / 3,643** | 66.76% | 1,500 Amazon IN + 932 Flipkart |
| **Products Lacking Images** | **1,211 / 3,643** | 33.24% | 1,000 Myntra + 143 electronics + 68 FK |

---

## 2. Investigation of Prompt Questions

### Question 1: Explain the discrepancy between 5,034 image records and 4,708 usable physical images
- **Empirical Audit Finding:**
  The `images.parquet` table contains **5,034 total records**.
  - **Amazon India:** 1,500 records, all **1,500 VALIDATED** and usable (`is_usable = True`).
  - **Flipkart:** 3,534 records:
    - **`DOWNLOAD_FAILED`:** **326 records** (`is_usable = False`). These represent URLs from the original PromptCloud scrape that returned 404, connection timeouts, or corrupted bytes during Phase 1 cache ingestion.
    - **`VALIDATED`:** 2,436 records (`is_usable = True`).
    - **`DUPLICATE`:** 328 records (`is_usable = True`, exact image match).
    - **`NEAR_DUPLICATE`:** 444 records (`is_usable = True`, perceptual hash distance $\le 4$).
    - Total Flipkart usable: $2,436 + 328 + 444 = \mathbf(3, 208)$.
  - **Reconciliation:**
    `1,500 (Amazon IN) + 3,208 (Flipkart Usable) = 4,708 Usable Images`
    `4,708 Usable + 326 Failed = 5,034 Total Image Records`
  - **Verdict:** The discrepancy is **not an error or missing data**. The 326 records are deliberately preserved failed download records required for full provenance and audit traceability.

### Question 2: Explain why Phase 3 `images.parquet` has the same SHA-256 hash as Phase 2 `indian_images.parquet`
- **Empirical Audit Finding:**
  - Phase 2 `indian_images.parquet` SHA-256: `f605ae7aa29aba550900aaadd5771fe4193168bffc09412ab5bb4e6c4ac18499`
  - Phase 3 `images.parquet` SHA-256: `f605ae7aa29aba550900aaadd5771fe4193168bffc09412ab5bb4e6c4ac18499`
  - **Match Status:** **IDENTICAL (100% Match)**
- **Reason:** In Phase 3, sandbox security boundaries strictly blocked outbound network calls, preventing live image downloads for the 143 newly recovered Flipkart electronics products. As instructed by platform guidelines, the pipeline carried forward the complete, validated Phase 2 image dataset without row modifications or schema mutations. Because pyarrow writes deterministic parquet representations, the resulting binary file produced the exact same cryptographic SHA-256 signature.

---

## 3. Image Dimensions & Quality Metrics

### Usable Image Dimensions:
- **Amazon India (1,500 images):** High-resolution primary assets (median $1000 	imes 1000$ to $1500 	imes 1500$ px), 100% RGB JPEG.
- **Flipkart (3,208 images):** Catalog assets (median $450 	imes 600$ to $800 	imes 1000$ px), 100% RGB JPEG.
- **Aspect Ratios:** Standard e-commerce portrait ($3:4$) and square ($1:1$).
