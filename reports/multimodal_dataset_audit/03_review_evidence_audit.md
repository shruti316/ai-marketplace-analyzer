# Independent Review Evidence & Linkage Audit Report

**Project:** AI-Powered Marketplace Trust Intelligence Platform  
**Target:** `data/indian_marketplace/phase3/reviews.parquet` & `review_product_matches.parquet`  
**Corpus Scale:** 3,500 Total Genuine Customer Reviews  
**Date:** November 2, 2026  

---

## 1. Review Evidence & Provenance Partitioning

| Metric | Measured Value | Percentage | Audit Finding / Evaluation |
| :--- | :---: | :---: | :--- |
| **Total Review Records** | **3,500** | 100.0% | Complete Indian review corpus |
| **Confirmed Flipkart Reviews** | **3,260** | 93.14% | Confirmed Flipkart customer scraping |
| **Uncertain Provenance Reviews** | **240** | 6.86% | Unverified marketplace provenance |
| **Catalog-Linked Reviews** | **3,260** | 93.14% | Linked to recovered Flipkart listings |
| **Unlinked Reviews** | **240** | 6.86% | Excluded from catalog linkage |
| **Distinct Linked Products** | **127** | — | Average 25.7 reviews/product |
| **Min / Max Reviews per Product** | **1 / 218** | — | Range of review density |
| **Exact Duplicate Review Bodies** | **1,187** | 33.91% | Repeated short praise (e.g. "Good", "Nice product") |
| **Unique Review Texts** | **2,313** | 66.09% | Distinct semantic review bodies |
| **Review Date Field** | **3,500 Null** | 100.0% Null | **Omitted in raw review scrape** |
| **Reviewer Identifier** | **3,500 Null** | 100.0% Null | **Omitted in raw review scrape** |
| **Verified Purchase Status** | **3,500 Null** | 100.0% Null | **Omitted in raw review scrape** |

---

## 2. Review Text & Rating Distribution

### Rating Statistics:
- **Mean Rating:** 4.10 / 5.0
- **Median Rating:** 5.0 / 5.0
- **Rating Breakdown:**
  - 5 Stars: 2,001 (57.2%)
  - 4 Stars: 726 (20.7%)
  - 3 Stars: 270 (7.7%)
  - 2 Stars: 115 (3.3%)
  - 1 Star:  388 (11.1%)

### Text Length Statistics:
- **Min Length:** 2 characters
- **Median Length:** 22 characters
- **Mean Length:** 59.0 characters
- **Max Length:** 494 characters
- **Language Analysis:** English (88.4%) and Hinglish / Romanized Hindi (11.6%, e.g., "acha product hai", "paisa vasool").

---

## 3. Independent Audit of the 3,260 Reported Linkages

### Evidence Grounding Assessment:
- **What Evidence Exists:** The raw review scraping source (`ml-hub/flipkart-reviews`) contained `product_name` strings (e.g., `boAt Rockerz 510 Super Extra Bass Bluetooth Headset (Raging Red, On the Ear)`) and `product_price` (₹1,199.00).
- **What Evidence Was Missing:** Raw reviews did NOT contain authentic Flipkart PIDs, order numbers, reviewer usernames, or listing URLs.
- **Validity of Linkage:** The linkage established in Phase 3 is an **exact product-line identity match** (`EXACT_PRODUCT_LINE_IDENTITY`) to recovered Flipkart catalog records created explicitly to represent those product lines.
- **Classification:**
  - `EXACT_MATCH`: 3,260 records (supported by exact product line title and INR price concordance).
  - `UNMATCHED`: 240 records (uncertain provenance; lack of verifiable marketplace flags).
  - `REJECTED_MATCH`: 45 homonym pairings against Phase 2 apparel catalog (correctly rejected).
  - `AMBIGUOUS_MATCH`: 0 records.
