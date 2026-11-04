# Independent Baseline Audit of Release v1.4

**Project:** AI-Powered Marketplace Trust Intelligence Platform  
**Audit Target:** Release v1.4 (`data/marketplace_trust_dataset_v1.4/`)  
**Auditor:** Lead Data Architect, ML Evaluation Auditor & Release Engineer  
**Date:** November 2026  
**Status:** COMPLETE — CRITICAL DISCREPANCIES IDENTIFIED & ROOT CAUSES DIAGNOSED

---

## 1. Executive Summary of Audit Findings

An independent, byte-level and row-level inspection of the certified release `v1.4` was conducted across all 37 indexed tables, physical disk assets, evaluation manifests, and model baseline scripts.

### Key Audit Findings
1. **Review Inventory Claim vs. Reality (Critical):**
   - The v1.4 certification narrative claimed: BestBuy (4,812), Amazon US (25,482), Walmart (21,667), Flipkart (1,143), Amazon India (3,490 unlinked).
   - The **actual underlying Parquet table** (`evidence/reviews.parquet`, SHA-256: `e362abd4...`) is an **exact 100% bit-for-bit duplicate of v1.3**: BestBuy (44,965), Amazon US (8,073), Flipkart (3,260), Uncertain/Unlinked (240), Amazon India (159). Total = 56,697.
   - The v1.4 narrative was citing a completely separate, prospective cohort breakdown that was never actually written to the Parquet dataset.
2. **Image Inventory 396-Image Discrepancy (Critical):**
   - The narrative report claimed platform counts: Amazon India (1,432), Flipkart (0), Myntra (1,000), Amazon US (1,020), BestBuy (249), Walmart (1,131), totaling 4,832 images.
   - The actual `evidence/images.parquet` table contains **5,228 usable physical images**: Flipkart (**3,208** usable), Amazon India (**1,500** usable), Amazon US (**520** usable). Myntra, BestBuy, and Walmart have **0** physical images.
   - All 5,228 images physically exist on disk and were verified as valid JPEG/PNG decodable via PIL.
   - The 396 discrepancy ($5,228 - 4,832 = 396$) was caused by the report narrative assuming 1 image per product for Myntra, BestBuy, Walmart, and Amazon US, and claiming 0 for Flipkart.
3. **Price Observations Marketplace Distribution Discrepancy (Material):**
   - The report claimed 5,153 valid prices and 890 missing prices, matching the global total, but its marketplace breakdown was inverted:
   - Report claimed: Flipkart 163 missing, Walmart 727 missing, others 0.
   - Actual Parquet data: Amazon US 621 missing, BestBuy 249 missing, Amazon India 15 missing, Flipkart 5 missing. Walmart has 1,131 valid prices and 0 missing.
4. **Category Count Claim vs. Data Reality (Material):**
   - The v1.4 narrative claimed 12 categories in some sections and 6 categories in others.
   - The actual `entities/products.parquet` table contains **exactly 10 discrete categories** summing to 6,043 products.
5. **Multimodal Fusion Baseline Model Circularity (Critical Defect):**
   - The v1.4 baseline model claimed an explainable Random Forest fusion model with ROC-AUC 0.9124.
   - Inspection of `src/models/baseline_models.py` reveals that the target label `composite_risk_label` was defined as `((is_duplicate_image > 0) + (price_iqr_ratio > 1.5) + (rating_deviation_from_mean > 1.5)) >= 2`, which is a deterministic boolean combination of 3 of the input features.
   - The model was trained on its own definition, creating complete target circularity. This performance claim is retired.
6. **Evaluation Split Reality:**
   - Protocol 1, Protocol 2, and Protocol 3 all contain exactly 4,230 Train, 906 Val, and 907 Test products. The report's claim of 3,853 / 825 / 827 and 3,981 / 853 / 854 was inaccurate narrative text.

---

## 2. Review Inventory Discrepancy Analysis (Section 2.1)

### 2.1 Physical Parquet Inspection
An independent hash and record inspection was performed on `data/marketplace_trust_dataset_v1.3/evidence/reviews.parquet` and `data/marketplace_trust_dataset_v1.4/evidence/reviews.parquet`.

```
v1.3 reviews.parquet SHA-256: e362abd435701d4c121dd4897ead157c2f4d54c4b4741ccc8751e83dd4a18ecf
v1.4 reviews.parquet SHA-256: e362abd435701d4c121dd4897ead157c2f4d54c4b4741ccc8751e83dd4a18ecf
```

The files are **identical**.

### 2.2 Comparison Table: Claimed vs. Actual Records

| Marketplace Code | v1.3 Parquet Records | v1.4 Claimed in Narrative | v1.4 Actual Parquet Records | Discrepancy / Root Cause |
| :--- | :--- | :--- | :--- | :--- |
| **BestBuy** | 44,965 | 4,812 | 44,965 | Narrative recited hypothetical capped cohort (-40,153) |
| **Amazon US** | 8,073 | 25,482 | 8,073 | Narrative cited external uningested corpus (+17,409) |
| **Walmart** | 0 | 21,667 | 0 | Walmart reviews were never ingested into Parquet (+21,667) |
| **Flipkart** | 3,260 | 1,143 | 3,260 | Narrative cited a 127-product subset (-2,117) |
| **Uncertain** | 240 | 0 | 240 | Narrative omitted quarantined unlinked reviews (-240) |
| **Amazon India** | 159 | 3,490 | 159 | Narrative cited unlinked Amazon India crawl (+3,331) |
| **Total** | **56,697** | **56,697** | **56,697** | Global row count matched by coincidence; mappings diverged |

### 2.3 Verdict on Review Discrepancy
The v1.4 review table was **not** an intentional replacement cohort. It was an exact copy of v1.3, but the v1.4 report generator script had hardcoded strings reflecting an external prospective plan rather than calculating metrics from the actual dataframe.

---

## 3. Image Discrepancy Analysis (Section 2.2)

### 3.1 Physical Disk and Usability Verification
An automated script processed all 5,554 rows in `evidence/images.parquet`:
- Total image records: **5,554**
- Documented scrape failures (`is_usable == False`): **326**
- Usable image records (`is_usable == True`): **5,228**
- Physical files present on disk: **5,228 / 5,228 (100.0%)**
- Decodable by `PIL.Image.open` and verified: **5,228 / 5,228 (100.0%)**

### 3.2 Marketplace Distribution of Usable Images

| Marketplace | Products in Catalog | Narrative Claimed Images | Actual Parquet Images | Actual Unique Products with Images |
| :--- | :--- | :--- | :--- | :--- |
| **Flipkart** | 1,143 | 0 | **3,208** | 932 |
| **Amazon India** | 1,500 | 1,432 | **1,500** | 1,500 |
| **Amazon US** | 1,020 | 1,020 | **520** | 520 |
| **Myntra** | 1,000 | 1,000 | **0** | 0 |
| **BestBuy** | 249 | 249 | **0** | 0 |
| **Walmart** | 1,131 | 1,131 | **0** | 0 |
| **Total** | **6,043** | **4,832** | **5,228** | **2,952** |

### 3.3 Explanation of the 396-Image Difference
- The narrative author assumed that every product in Myntra (1,000), Walmart (1,131), BestBuy (249), and Amazon US (1,020) had exactly one image, and Flipkart had 0 images ($1,432 + 1,000 + 1,020 + 249 + 1,131 = 4,832$).
- In reality, Flipkart has 3,208 multi-angle images across 932 products, Amazon India has 1,500 images across 1,500 products, and Amazon US has 520 images across 520 products ($3,208 + 1,500 + 520 = 5,228$).
- The mathematical difference $5,228 - 4,832 = 396$ was entirely an artifact of narrative fabrication. The 5,228 physical images are genuine, verified, and decodable.

---

## 4. Product, Price & Category Discrepancy (Section 2.3)

### 4.1 Product Catalog Verification
- Total products: **6,043** (100% unique primary key `canonical_product_id`).
- Indian Marketplace: **3,643 (60.28%)** (Amazon India: 1,500, Flipkart: 1,143, Myntra: 1,000).
- Supplementary: **2,400 (39.72%)** (Amazon US: 1,020, BestBuy: 249, Walmart: 1,131).

### 4.2 Price Observations Discrepancy

| Marketplace | Total Catalog | Valid Prices (Narrative) | Valid Prices (Actual Parquet) | Missing Prices (Actual Parquet) |
| :--- | :--- | :--- | :--- | :--- |
| **Amazon India** | 1,500 | 1,500 | 1,485 | 15 |
| **Flipkart** | 1,143 | 980 | 1,138 | 5 |
| **Walmart** | 1,131 | 404 | 1,131 | 0 |
| **Myntra** | 1,000 | 1,000 | 1,000 | 0 |
| **Amazon US** | 1,020 | 1,020 | 399 | 621 |
| **BestBuy** | 249 | 249 | 0 | 249 |
| **Total** | **6,043** | **5,153** | **5,153** | **890** |

Global totals match exactly (5,153 valid, 890 missing), but the marketplace distribution was completely misstated in the report.

### 4.3 Category Distribution Discrepancy
The actual `entities/products.parquet` table contains **10 distinct categories**:
1. Clothing & Fashion: 1,709 (28.28%)
2. Beauty & Personal Care: 1,480 (24.49%)
3. Electronics: 1,177 (19.48%)
4. Home & Kitchen: 416 (6.88%)
5. Other: 391 (6.47%)
6. Grocery & Household Essentials: 369 (6.11%)
7. Books & Stationery: 315 (5.21%)
8. Toys & Games: 160 (2.65%)
9. Industrial & Scientific: 14 (0.23%)
10. Sports & Outdoors: 12 (0.20%)
Total: **6,043**.

All claims of 12 or 6 categories were narrative errors.

---

## 5. Other Baseline Checks (Section 2.4)

### 5.1 Multimodal Fusion Baseline Model Circularity
In `src/models/baseline_models.py`, `composite_risk_label` was constructed as:
```python
df["composite_risk_label"] = (
    (df["is_duplicate_image"] > 0).astype(int) +
    (df["price_iqr_ratio"] > 1.5).astype(int) +
    (df["rating_deviation_from_mean"] > 1.5).astype(int)
) >= 2
```
Because the Random Forest classifier used these exact columns as its input features `X`, the reported ROC-AUC of 0.9124 was circular self-prediction.

### 5.2 Currency Conversion Architecture
`evidence/fx_conversion_rates.parquet` contains 9 RBI benchmark fixings, but `price_observations.parquet` multiplied all USD prices by ~83.25 regardless of their observation timestamp. Dynamic date-aware FX matching was not implemented.

### 5.3 Protected Baselines and Prior Releases
- All 16 protected baseline files match their SHA-256 hashes bit-for-bit.
- Releases `v1.1`, `v1.2`, and `v1.3` are verified FROZEN.

---

## 6. Audit Action Items for Release v1.5

1. Reconcile reviews table: Ensure exact provenance and accurate reporting.
2. Fix narrative reports: Calculate all report statistics dynamically from Parquet tables.
3. Retire circular fusion model: Rebuild explainable fusion architecture without claiming unvalidated predictive accuracy.
4. Implement date-aware FX matching against RBI benchmark fixings.
5. Generate complete v1.5 release artifacts under `data/marketplace_trust_dataset_v1.5/` and `reports/certification_v1.5/`.
