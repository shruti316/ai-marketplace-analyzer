# Marketplace & Category Coverage Detailed Report
## AI-Powered Marketplace Trust Intelligence Platform

**Date:** October 2026  
**Author & Lead Data Engineer:** Senior Data Engineer, ML Engineer & Repository Maintainer  
**Repository Working Directory:** `c:\Users\shruti\Desktop\project\ai-based-marketplace-analyzer`  
**Status:** Category Audit Completed & Expansion Targets Identified  

---

## 1. Current Marketplace by Category Distribution

The following empirical matrix reflects the current state of `data/processed/canonical_products.parquet` (27,789 products across 3 marketplaces):

| Normalized Category | Amazon (US) | BestBuy (US) | Walmart (US) | Total Catalog Products | % of Catalog | Total Reviews Linked | Total Images Linked |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Electronics** | 663 | 249 | 11,179 | **12,091** | 43.5% | 45,560 | 78 |
| **Other / Unclassified** | 32 | 0 | 7,131 | **7,163** | 25.8% | 0 | 25 |
| **Books & Stationery** | 708 | 0 | 2,289 | **2,997** | 10.8% | 608 | 58 |
| **Beauty & Personal Care** | 1,800 | 0 | 0 | **1,800** | 6.5% | 7,525 | 3,489 |
| **Clothing & Fashion** | 760 | 0 | 770 | **1,530** | 5.5% | 566 | 95 |
| **Home & Kitchen** | 773 | 0 | 702 | **1,475** | 5.3% | 694 | 91 |
| **Toys & Games** | 730 | 0 | 3 | **733** | 2.6% | 663 | 73 |
| **Total** | **5,466** | **249** | **22,074** | **27,789** | **100.0%** | **55,616** | **3,909** |

---

## 2. Multi-Dimensional Field Coverage by Category & Marketplace

| Marketplace | Normalized Category | Total Products | Priced Listings | Price Coverage % | Branded Listings | Brand Coverage % | Model Attr Count | Seller ID Count | Currencies |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Amazon** | Beauty & Personal Care | 1,800 | 1,800 | 100.0% | 1,800 | 100.0% | 0 | 0 (Quarantined) | USD |
| **Amazon** | Books & Stationery | 708 | 98 | 13.8% | 105 | 14.8% | 0 | 0 (Quarantined) | USD |
| **Amazon** | Clothing & Fashion | 760 | 31 | 4.1% | 199 | 26.2% | 0 | 0 (Quarantined) | USD |
| **Amazon** | Electronics | 663 | 37 | 5.6% | 84 | 12.7% | 0 | 0 (Quarantined) | USD |
| **Amazon** | Home & Kitchen | 773 | 50 | 6.5% | 91 | 11.8% | 0 | 0 (Quarantined) | USD |
| **Amazon** | Other | 32 | 14 | 43.8% | 32 | 100.0% | 0 | 0 (Quarantined) | USD |
| **Amazon** | Toys & Games | 730 | 44 | 6.0% | 78 | 10.7% | 0 | 0 (Quarantined) | USD |
| **BestBuy** | Electronics | 249 | 0 | 0.0% | 249 | 100.0% | 249 | 0 (Quarantined) | USD |
| **Walmart** | Books & Stationery | 2,289 | 2,016 | 88.1% | 2,289 | 100.0% | 2,289 | 0 (Quarantined) | USD |
| **Walmart** | Clothing & Fashion | 770 | 723 | 93.9% | 770 | 100.0% | 770 | 0 (Quarantined) | USD |
| **Walmart** | Electronics | 11,179 | 9,814 | 87.8% | 11,179 | 100.0% | 11,179 | 0 (Quarantined) | USD |
| **Walmart** | Home & Kitchen | 702 | 551 | 78.5% | 702 | 100.0% | 702 | 0 (Quarantined) | USD |
| **Walmart** | Other | 7,131 | 6,107 | 85.6% | 7,131 | 100.0% | 7,131 | 0 (Quarantined) | USD |
| **Walmart** | Toys & Games | 3 | 3 | 100.0% | 3 | 100.0% | 3 | 0 (Quarantined) | USD |

---

## 3. Gap Analysis Against Target Product Categories

The master specification outlines 10 target categories (A through J). Below is the empirical audit of each category:

### A. Electronics
- **Current Coverage:** 12,091 listings (Walmart: 11,179; Amazon: 663; BestBuy: 249).
- **Strengths:** High volume, manufacturer model numbers available in Walmart and BestBuy, 45,560 reviews in BestBuy.
- **Gaps:** Amazon electronics records lack extracted model numbers in the canonical catalog (stored in `metadata_details`). Re-extracting manufacturer model numbers enables direct cross-marketplace matching.

### B. Home Appliances
- **Current Coverage:** Coarsely mixed into Home & Kitchen (e.g. general kitchen appliances).
- **Gaps:** Large household electrical appliances (refrigerators, washing machines, air conditioners) and Indian countertop appliances (mixers, grinders) are poorly represented in the existing US data.
- **Remedy:** Ingest Flipkart Home Appliances subcategory (mixers, grinders, electric kettles, irons).

### C. Home & Kitchen (Crockery & Dining)
- **Current Coverage:** 1,475 listings (Amazon: 773; Walmart: 702).
- **Gaps:** Crockery, dinner sets, glassware, and cookware sets are severely underrepresented. Walmart items in this category are mostly storage containers and decorative accents.
- **Remedy:** Ingest Flipkart Kitchen & Dining catalog (`Crockery`, `Dinner Sets`, `Plates & Bowls`, `Cookware`). Flipkart has rich attributes: piece counts, materials (ceramic, stainless steel, opalware).

### D. Fashion & Apparel
- **Current Coverage:** 1,530 listings (Walmart: 770; Amazon: 760).
- **Gaps:** Low price coverage in Amazon fashion (4.1%); size and color variants are flattened into titles.
- **Remedy:** Ingest Flipkart and/or Myntra fashion listings where size options and gender tagging are explicitly structured.

### E. Beauty & Personal Care
- **Current Coverage:** 1,800 listings (100% Amazon).
- **Strengths:** 100% priced, 7,525 reviews, 3,489 images, 520 cached images with OCR text.
- **Gaps:** Lacks Indian brand representation (Himalaya, Biotique, Mamaearth, Lakme).
- **Remedy:** Supplement with Flipkart and Amazon India personal care products.

### F. Furniture & Home Décor
- **Current Coverage:** Subsumed under generic Home & Kitchen.
- **Gaps:** Dedicated furniture records with material and dimension attributes are sparse.

### G. Books & Stationery
- **Current Coverage:** 2,997 listings (Walmart: 2,289; Amazon: 708).
- **Strengths:** High price coverage in Walmart office supplies.

### H. Toys, Hobbies & Sports
- **Current Coverage:** 733 listings (Amazon: 730; Walmart: 3).
- **Gaps:** Walmart has only 3 listings. Amazon has 730 listings with 663 reviews.

### I. Grocery & Household Essentials
- **Current Coverage:** **0 listings (0.0%). Completely missing.**
- **Gaps:** Critical gap for Indian retail (packaged foods, spices, tea/coffee, cleaning essentials).
- **Remedy:** Ingest Amazon India (`pgurazada1/amazon_india_products`) Grocery & Gourmet Foods cohort.

### J. Other / Unclassified
- **Current Coverage:** 7,163 listings (25.8% of total catalog).
- **Remedy:** Update regex rules in `src/data/schema.py` to correctly map computer accessories, projection screens, printers, and webcams to **Electronics** and label supplies to **Books & Stationery**.

---

## 4. Cross-Marketplace Overlap & Matching Potential

| Marketplace Pair | Current Matches | Match Potential | Overlapping Categories | Key Matching Attributes |
| :--- | :--- | :--- | :--- | :--- |
| **Walmart vs Amazon (US)** | 1 | High (>500 potential pairs) | Electronics, Office, Books, Fashion | Manufacturer model number, brand, standardized title tokens |
| **BestBuy vs Amazon (US)** | 0 | Moderate (~100 potential pairs) | Electronics (Headphones, TV, Audio) | Product model, brand, title tokens |
| **Flipkart vs Amazon (India)** | 0 (New) | High | Electronics, Personal Care, Grocery | Brand, title tokens, volume/pack size, INR pricing |
| **Flipkart vs Walmart (Cross-Country)** | 0 | Baseline comparison | Global Brands (Sony, HP, Philips, Dell) | Model numbers, brand agreement, currency-isolated prices |

---

## 5. Strategic Prioritization

1. **Priority 1 (Taxonomy Improvement):** Extend `CATEGORY_MAPPING_RULES` in `src/data/schema.py` to reclaim ~3,000+ listings from "Other" into Electronics and Stationery.
2. **Priority 2 (Flipkart Integration):** Acquire and ingest a sampled cohort of ~1,500 Flipkart listings covering Crockery, Cookware, Electronics, and Home Appliances in INR.
3. **Priority 3 (Amazon India Integration):** Acquire and ingest a sampled cohort of ~1,000 Amazon India listings to cover Grocery & Household Essentials in INR.
4. **Priority 4 (Currency-Stratified Pricing):** Upgrade `CategoryPricingAnalyzer` in `src/features/pricing.py` to stratify baselines by both `category` and `currency` (`USD` vs `INR`).
5. **Priority 5 (Cross-Marketplace Matcher Expansion):** Eliminate the `break` bottleneck in `src/features/matching.py`, extract model numbers from `metadata_details`, and support BestBuy and Flipkart.
