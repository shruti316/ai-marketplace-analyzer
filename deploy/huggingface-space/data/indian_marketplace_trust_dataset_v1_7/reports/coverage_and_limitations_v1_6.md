# Dataset v1.6 Coverage and Limitations
**Indian Marketplace Multimodal Trust Dataset v1.6**
*AI-Powered Indian Marketplace Trust Intelligence Platform*
*Release Date: November 9, 2026*

---

## 1. Executive Summary

A critical standard of scientific integrity in dataset curation is the transparent, honest disclosure of coverage boundaries, modality imbalances, and engineering constraints. This document details the exact coverage landscape and explicit known limitations of **Indian Marketplace Multimodal Trust Dataset v1.6**.

---

## 2. Multi-Dimensional Coverage Analysis

### 2.1 Marketplace Partitioning

| Marketplace | Products | Listings | Hero Images | ResNet-18 Embeddings | Reviews | Price Observations | Linked Seller Node |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Amazon India** | 1,500 | 1,500 | 2,427 | 2,427 | 159 | 1,514 | `SELLER_AGG_AMAZON_IN` |
| **Flipkart** | 1,143 | 1,143 | 1,141 | 1,141 | 3,500 | 1,153 | `SELLER_AGG_FLIPKART` |
| **Myntra** | 1,000 | 1,000 | 1,140 | 1,140 | 0 | 1,000 | `SELLER_AGG_MYNTRA` |
| **TOTAL** | **3,643** | **3,643** | **4,708** | **4,708** | **3,659** | **3,667** | **4 Certified Entities** |

### 2.2 Category & Subcategory Coverage
- **L1 Categories:** 23 parent categories. Top categories include *Clothing & Accessories* (1,048 listings), *Automotive* (894 listings), *Electronics* (652 listings), *Footwear* (412 listings), and *Beauty & Personal Care* (225 listings).
- **L2 Subcategories:** 343 leaf subcategories, providing granular statistical price benchmarking.
- **Brand Representation:** 1,608 unique brand entities. 105 brands possess $\ge 5$ products (`RELIABLE_SAMPLE_SIZE`); 1,503 brands have $< 5$ products (`INSUFFICIENT_SAMPLE_SIZE_WIDE_CORRIDOR`).

### 2.3 Cross-Modality Coverage Matrix

| Core Modality Combination | Available Modalities | Product Count | Provisional Risk Tier Assignment |
| :--- | :--- | :--- | :--- |
| **Price Only (Unimaged, No Reviews)** | 1 Modality | **1,068 products (29.32%)** | `UNASSESSED_SPARSE_DATA` (Zero Penalty) |
| **Price + Image (No Reviews)** | 2 Modalities | **2,427 products (66.62%)** | Evaluated on Image & Price Signals |
| **Price + Review (Unimaged)** | 2 Modalities | **143 products (3.93%)** | Evaluated on Review & Price Signals |
| **Full Multimodal (Price + Image + Review)**| 3 Modalities | **5 products (0.14%)** | Evaluated on Review, Image & Price Signals |
| **TOTAL** | — | **3,643 products (100.0%)**| — |

---

## 3. Explicit Known Limitations

### Limitation 1: Historical Pricing Snapshots (Cross-Sectional vs Longitudinal)
- **Status:** The primary dataset represents a high-fidelity cross-sectional point-in-time snapshot.
- **Distribution:** 3,643 products possess valid pricing observations; however, exactly 24 products possess repeated longitudinal price observations ($n > 1$), while 3,619 products possess a single point-in-time observation.
- **Impact:** Dynamic temporal price velocity algorithms (e.g. daily markdown tracking) cannot be trained on the single-observation cohort. The platform addresses this by utilizing non-parametric cross-sectional corridors ($z_{\text{robust}}$ against subcategory medians) rather than longitudinal time-series forecasting.

### Limitation 2: Upstream Retail Merchant Metadata Omission
- **Status:** The upstream PromptCloud catalog scrapes across Amazon India, Flipkart, and Myntra did not capture third-party merchant store IDs, merchant names, or GSTINs.
- **Governance:** In adherence to our Zero-Fabrication Directive, individual merchant profiles were **never artificially generated**.
- **Impact:** `products.seller_id` remains 100% strictly `NULL` (`HONEST_NULL_AGGREGATE_MERCHANT`). Listings are linked via foreign key to formal **Platform Aggregate Merchant Pools** (`SELLER_AGG_AMAZON_IN`, `SELLER_AGG_FLIPKART`, `SELLER_AGG_MYNTRA`).

### Limitation 3: Modality Availability Skew
- **Status:** Strong modality asymmetry exists across the dataset:
  - 100% of products have price observations (3,643 products).
  - 66.76% of products have physical hero images (2,432 products).
  - 4.06% of products have linked customer reviews (148 products).
- **Protection:** The platform strictly enforces the **Zero-Penalty Missing Modality Invariant**. Products lacking customer reviews or hero images are marked `MODALITY_UNAVAILABLE` and classified as `UNASSESSED_SPARSE_DATA`, guaranteeing that missing evidence is never conflated with fraud or risk.

### Limitation 4: Physical OCR Offline Dependency Blocker
- **Status:** Optical Character Recognition (OCR) requires native binary system installations (e.g., Tesseract OCR or EasyOCR C++ libraries) which are unavailable in this offline sandbox environment.
- **Resolution:** Rather than fabricating synthetic OCR strings or utilizing title-token heuristics as true OCR, physical OCR execution is documented as `BLOCKED_OFFLINE_DEPENDENCY_ABSENT`. Title tokens are strictly isolated in `evidence/title_token_packaging_proxy.parquet`.

### Limitation 5: Vision-Language Model Offline Dependency Blocker
- **Status:** Multi-modal Vision-Language Models (e.g. OpenAI CLIP ViT-B/32 or BLIP) require deep neural weights and specific package installations unavailable in this offline sandbox.
- **Resolution:** Cross-modal image-to-text consistency evaluation is marked as `BLOCKED_OFFLINE_DEPENDENCY_ABSENT` in `derived_evidence/image_text_consistency.parquet`.

---

## 4. Invariant Compliance Scorecard

| Invariant / Standard | Enforcement Mechanism | Verification Result |
| :--- | :--- | :--- |
| **Zero Synthetic Fabrication** | Prohibition of mock IDs, fake reviews, or synthetic GSTINs | **100% COMPLIANT** |
| **Honest Null Standard** | `products.seller_id` strictly NULL across all 3,643 rows | **100% COMPLIANT** |
| **Zero-Penalty Missing Modality**| All 1,068 products with $< 2$ modalities marked `UNASSESSED_SPARSE_DATA` | **100% COMPLIANT** |
| **Referential Integrity** | All 41,372 graph edges resolve to primary keys | **100% COMPLIANT** |
| **Non-Parametric Corridor Fallback**| Brands with $< 5$ products fall back to subcategory corridor | **100% COMPLIANT** |
| **SHA-256 Manifest Verification** | Cryptographic verification of all 136 dataset release files | **100% COMPLIANT** |
