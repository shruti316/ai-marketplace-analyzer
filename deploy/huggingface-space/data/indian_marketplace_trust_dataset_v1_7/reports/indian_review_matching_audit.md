# Indian Review-to-Product Linkage Audit & Candidate Matching Report

**Project:** AI-Powered Marketplace Trust Intelligence Platform  
**Target Marketplaces:** Flipkart (`flipkart`), Amazon India (`amazon_in`), Myntra (`myntra`)  
**Task:** Task A — Genuine Review-Product Relationship Recovery  
**Date:** November 2, 2026  
**Status:** Audit Complete | 100% Deterministic Verification | Zero False-Positive Linkages  

---

## 1. Executive Summary

An exhaustive deterministic matching investigation was performed across all **3,500 genuine Indian customer review records** (`data/raw/flipkart/flipkart_reviews_raw.csv`) against all **3,500 master catalog products** across Amazon India (1,500), Flipkart (1,000), and Myntra (1,000).

In compliance with the strict mandate:
> *"Implement matching only when there is sufficient evidence... Never use text similarity alone to claim that a review belongs to a product. Do not automatically accept ambiguous matches."*

### Key Audit Findings:
1. **Zero Direct Structured Identifiers:** The raw review dataset contains columns `['product_name', 'product_price', 'Rate', 'Review', 'text', 'labels', 'sentiment_code']`. It omits Flipkart PIDs, ASINs, SKU identifiers, and catalog URLs.
2. **Zero Exact Title Matches:** An exact normalized title comparison across all 3,500 catalog products yielded **0 exact matches** (0.00%).
3. **Candidate Overlaps are Spurious Homonyms:** 45 candidate pairings were identified using an aggressive token overlap threshold ($\ge 3$ non-stopword tokens). Every single pairing was determined to be a spurious homonym or generic word overlap (e.g., hair dye vs. TV DTH stand, kettle combo vs. sports sipper).
4. **Linkage Decision:** In accordance with platform integrity safeguards, **0 false positive linkages were accepted**. `indian_reviews_linked.parquet` is strictly generated with **0 rows**, preserving **100% referential integrity** with **zero broken foreign keys**.
5. **Authentic Corpus Retention:** All 3,500 reviews are preserved in `indian_reviews.parquet` as an authentic unlinked research corpus (`UNLINKED_INDIAN_CORPUS`) with complete sentiment labels, ratings, and raw product titles.

---

## 2. Review Dataset Schema & Identifier Audit

| Feature | Field Present in Raw Reviews | Data Type | Notes / Limitations |
| :--- | :---: | :---: | :--- |
| **Product Name** | **YES** | string | 143 unique product names representing Indian consumer electronics & appliances |
| **Product Price** | **YES** | float64 | Static retail price in INR (e.g., ₹1,199.00 for boAt Rockerz 510) |
| **Customer Rating** | **YES** | float64 | 1.0 to 5.0 scale |
| **Review Title** | **YES** | string | Short review header |
| **Review Body Text** | **YES** | string | 100% non-empty authentic customer feedback |
| **Sentiment Label** | **YES** | string | `positive`, `neutral`, `negative` |
| **Sentiment Code** | **YES** | int64 | `0` (negative), `1` (neutral), `2` (positive) |
| **Flipkart PID** | **NO** | — | **Omitted in source scrape** |
| **Product URL** | **NO** | — | **Omitted in source scrape** |
| **ASIN / SKU** | **NO** | — | **Omitted in source scrape** |
| **Reviewer ID** | **NO** | — | **Omitted in source scrape** |
| **Timestamp / Date** | **NO** | — | **Omitted in source scrape** |

---

## 3. Disparate Domain Analysis: PromptCloud vs. ml-hub

The fundamental reason for zero valid linkages between the product catalog and the review corpus is **domain divergence** between two independently scraped sources:

```
┌────────────────────────────────────────────────────────┐
│ PROMPTCLOUD PRODUCT CATALOG (3,500 Products)           │
│ • Flipkart (1,000): Apparel, Curtains, Watches, Shoes  │
│ • Amazon India (1,500): Skin Care, Cosmetics, Grocery  │
│ • Myntra (1,000): Ethnic Wear, Western Tops, Dresses   │
└────────────────────────────────────────────────────────┘
                          ▲
                   ZERO OVERLAP (0.00%)
                          ▼
┌────────────────────────────────────────────────────────┐
│ ML-HUB CUSTOMER REVIEWS (3,500 Reviews / 143 Products) │
│ • Audio: boAt Rockerz, OnePlus Bullets, Aroma Neckband │
│ • Appliances: Bajaj Ceiling Fans, Wonderchef Blender   │
│ • Electronics: Canon DSLR, Google Nest, Seagate HDD    │
└────────────────────────────────────────────────────────┘
```

Linking reviews for a `boAt Rockerz 510 Headset` to `Sweet Angel Printed Girl's Track Pants` or `IMARA Women Black Solid Top` would be fraudulent data corruption.

---

## 4. Top 15 Rejected Candidate Match Pairings

The candidate search evaluated token overlaps with threshold $\ge 3$ non-stopword tokens. All 45 candidate matches were audited and **strictly rejected**.

| # | Catalog Product ID | Marketplace | Catalog Product Title | Review Product Title | Overlapping Tokens | Jaccard | Rejection Rationale |
| :---: | :--- | :---: | :--- | :--- | :--- | :---: | :--- |
| 1 | `flipkart_WBTEDVH6WXGPER53` | flipkart | Imported Sports Sipper 750 ml Water Bott... | Butterfly Rapid Kettle 1.5 Litre + Eco 7... | `750, bottle, water` | 0.2727 | Spurious token overlap; incompatible product categories |
| 2 | `amazon_in_B07MP27JH6` | amazon_in | Anself Digital Moisture Monitor for Skin... | YUV Digital LCD Pre-Calibrated TDS Meter... | `analyzer, digital, lcd, pen` | 0.1471 | Spurious token overlap; incompatible product categories |
| 3 | `amazon_in_B06W5S7FS9` | amazon_in | Degree Men Dry Protection Anti-Perspiran... | STYLERA 5 PAIR Anti Cutting Cut Resistan... | `anti, dry, protection` | 0.1429 | Spurious token overlap; incompatible product categories |
| 4 | `flipkart_RSFEHYBRPRRCKZQM` | flipkart | Transtal 'Triangle' Corner 8" Acrylic Wa... | SQUARO ONLINE STORE Unbreakable Setup Bo... | `acrylic, shelf, wall` | 0.1429 | Spurious token overlap; incompatible product categories |
| 5 | `flipkart_RSFEHYBRPRRCKZQM` | flipkart | Transtal 'Triangle' Corner 8" Acrylic Wa... | SQUARO ONLINE STORE Unbreakable Setup Bo... | `acrylic, shelf, wall` | 0.1429 | Spurious token overlap; incompatible product categories |
| 6 | `amazon_in_B07Y7K2L72` | amazon_in | BeautyNeeds Reusable Spa Gel Socks & Glo... | F8WARES 14inch Reusable Dishwashing Indu... | `gloves, hand, reusable` | 0.12 | Spurious token overlap; incompatible product categories |
| 7 | `amazon_in_B00BR44YIM` | amazon_in | Carapex Natural Body Butter Heavy Duty H... | SSWW Multipurpose Heavy-Duty Reusable Wa... | `duty, hand, heavy` | 0.1154 | Spurious token overlap; incompatible product categories |
| 8 | `amazon_in_B07Y5QDX39` | amazon_in | Pinkdose 2018 Non-Woven Fabric Disposabl... | Qiisx Motorcycle Detachable Mask Goggle ... | `face, mask, masks, windproof` | 0.1053 | Spurious token overlap; incompatible product categories |
| 9 | `amazon_in_B07W56JY76` | amazon_in | Ancient flower - Rose Water & A Royal St... | Inalsa Verve 800W Food Processor with 10... | `100, gold, rose` | 0.1034 | Spurious token overlap; incompatible product categories |
| 10 | `amazon_in_B07Y7K2L72` | amazon_in | BeautyNeeds Reusable Spa Gel Socks & Glo... | SSWW Multipurpose Heavy-Duty Reusable Wa... | `gloves, hand, reusable` | 0.0968 | Spurious token overlap; incompatible product categories |
| 11 | `amazon_in_B07R6DHYB8` | amazon_in | Jenna Spiral Wink Eye Cartoon Face Sleep... | Qiisx Motorcycle Detachable Mask Goggle ... | `eye, face, mask` | 0.0938 | Spurious token overlap; incompatible product categories |
| 12 | `amazon_in_B07VCZWHDC` | amazon_in | World Beautys New Eye cream anti aging 1... | Inalsa Verve 800W Food Processor with 10... | `100, gold, pure` | 0.0938 | Spurious token overlap; incompatible product categories |
| 13 | `amazon_in_B07X56JF4T` | amazon_in | Frackkon ANKLE Silicone Gel Moisturising... | STYLERA 5 PAIR Anti Cutting Cut Resistan... | `anti, dry, protection` | 0.0833 | Spurious token overlap; incompatible product categories |
| 14 | `amazon_in_B07C1HRSRZ` | amazon_in | Anti Aging Line LASER LIKE system serum,... | Qiisx Motorcycle Detachable Mask Goggle ... | `eye, face, mask` | 0.0811 | Spurious token overlap; incompatible product categories |
| 15 | `amazon_in_B07PNBW9KN` | amazon_in | Ubervia Pack of 80/ bottle Gold Osmanthu... | Qiisx Motorcycle Detachable Mask Goggle ... | `eye, face, mask` | 0.0769 | Spurious token overlap; incompatible product categories |

---

## 5. Formal Disposition & Deliverable Status

1. **`indian_reviews_linked.parquet`:** Written with **0 rows** and strict schema definitions.
2. **`indian_reviews.parquet`:** Retains all **3,500 genuine reviews** tagged with `linkage_status = 'UNLINKED_INDIAN_CORPUS'` and explicit rejection reasons.
3. **`indian_complete_multimodal.parquet`:** Accurately retains **0 rows**, preserving scientific honesty and zero unverified multimodal claims.
