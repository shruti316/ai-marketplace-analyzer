# Marketplace Trust Evidence Dataset v1.0 — Source Provenance & Data Governance Report

**Project:** AI-Powered Marketplace Trust Intelligence Platform  
**Dataset Release:** `Marketplace Trust Evidence Dataset v1.0`  
**Execution Date:** 2026-11-03  
**Auditor:** Senior Data Quality Auditor & Multimodal ML Architect  

---

## 1. Executive Summary

This report establishes the full legal, ethical, and technical provenance of all data sources integrated into the `Marketplace Trust Evidence Dataset v1.0`. The platform enforces strict traceability: every entity, image, review, and price observation references an authoritative `source_id` registered in `metadata/source_registry.parquet`. No anonymous or unverified records are included.

---

## 2. Source Registry Directory & Terms of Use

The table below catalogs all 11 approved project data sources:

| Source ID | Source Name & Domain | Acquisition Method & Timestamp | License & Usage Terms | Permitted Use Status |
|---|---|---|---|---|
| `SRC_PROMPTCLOUD_AMZ_IN` | PromptCloud Amazon India Product Scrape | Pre-existing crawl cache (2026-11-01) | Research & benchmark analytics | `PERMITTED_RESEARCH_BENCHMARK` |
| `SRC_PROMPTCLOUD_FK_PROD` | PromptCloud Flipkart Product Scrape | Pre-existing crawl cache (2026-11-01) | Research & benchmark analytics | `PERMITTED_RESEARCH_BENCHMARK` |
| `SRC_PROMPTCLOUD_MYN_PROD` | PromptCloud Myntra Product Scrape | Pre-existing crawl cache (2026-11-01) | Research & benchmark analytics | `PERMITTED_RESEARCH_BENCHMARK` |
| `SRC_KAGGLE_FK_REVS` | Flipkart Customer Reviews Scrape (127 Lines) | Kaggle Public Dataset Cache (2026-11-01) | CC0 Public Domain / Open Research | `PERMITTED_PUBLIC_RESEARCH` |
| `SRC_AMAZON_INDIA_IMG_RECOVERY` | Amazon India Primary Product Image Assets | Verified local disk image cache (2026-11-01) | Fair dealing for ML research | `PERMITTED_RESEARCH_BENCHMARK` |
| `SRC_AMAZON_US_REVIEWS_2023` | Amazon Reviews 2023 (UCSD McAuley Lab) | Curated academic benchmark (2026-11-01) | Non-commercial Academic Research | `PERMITTED_ACADEMIC_RESEARCH` |
| `SRC_BESTBUY_REVIEWS_2024` | BestBuy Electronics Customer Reviews | Curated developer API cache (2026-11-01) | Research & educational evaluation | `PERMITTED_RESEARCH_BENCHMARK` |
| `SRC_WALMART_PRODUCTS_2023` | Walmart Retail Products and Hierarchy | Curated public crawl cache (2026-11-01) | Research & benchmark analytics | `PERMITTED_RESEARCH_BENCHMARK` |
| `SRC_DECEPTIVE_OPINION_SPAM` | Ott et al. Deceptive Spam Benchmark | Cornell University ACL 2011 Corpus | Academic Research Use | `PERMITTED_ACADEMIC_RESEARCH` |
| `SRC_ECOMMERCE_FAKE_REVIEWS` | E-Commerce Manipulated Reviews Benchmark | Kaggle Open Benchmark Repository | Open Research Use | `PERMITTED_ACADEMIC_RESEARCH` |
| `SRC_SYNTHETIC_STRESS_CASES` | Antigravity Multimodal Trust Stress Cases | Hand-crafted adversarial suite | Internal Project IP | `PERMITTED_INTERNAL_TESTING` |

---

## 3. Provenance Analysis by Domain

### 3.1 Primary Indian Marketplace Domain (60.28% of Products)
1. **Amazon India (`amazon_in`):**
   - **Catalog:** 1,500 products covering Beauty, Personal Care, and Grocery. Ingested from PromptCloud commercial scrape cache.
   - **Visual Assets:** 1,500 primary hero JPEG images recovered from cached asset storage, matching ASINs bit-for-bit.
   - **Pricing:** 1,500 static point-in-time INR pricing observations.
   - **Reviews:** 0 customer reviews collected in upstream scrape.
2. **Flipkart (`flipkart`):**
   - **Catalog:** 1,143 products (1,000 baseline + 143 recovered electronics products) spanning Mobiles, Computers, and Electronics.
   - **Visual Assets:** 3,208 usable JPEG images on disk (plus 326 preserved download failure records).
   - **Reviews:** 3,260 customer reviews linked via exact product-line string matching and price concordance across 127 product lines.
   - **Pricing:** 980 valid INR price observations (163 listings had missing price fields in raw scrape).
3. **Myntra (`myntra`):**
   - **Catalog:** 1,000 products covering Fashion, Apparel, and Lifestyle.
   - **Visual Assets:** 0 physical images downloaded in baseline crawl (image URLs preserved).
   - **Reviews:** 0 customer reviews collected in raw crawl.
   - **Pricing:** 1,000 valid INR price observations.

### 3.2 Supplementary International Domain (39.72% of Products)
1. **Amazon US (`amazon`):**
   - 600 products (100 Gold triple modality with physical images on disk, customer reviews, and valid USD prices + 500 products with reviews). Sourced from UCSD McAuley Lab Amazon Reviews 2023.
2. **BestBuy (`bestbuy`):**
   - 249 electronics products with 44,965 customer reviews and USD retail prices. Sourced from BestBuy API benchmark collection.
3. **Walmart (`walmart`):**
   - 1,131 retail products with structured category hierarchy and USD prices. Sourced from Walmart public crawl cache.

### 3.3 Isolated Evaluation Benchmarks (Tier C)
1. **Ott et al. Deceptive Opinion Spam (1,600 reviews):**
   - Gold standard benchmark consisting of 800 truthful reviews and 800 deceptive reviews (Amazon Mechanical Turk crowdsourced) published in ACL 2011.
   - Preserved in `collections/isolated_benchmarks/deceptive_opinion_spam.parquet` strictly for testing NLP deception classifiers.
2. **E-Commerce Fake Reviews Benchmark (40,526 reviews):**
   - Synthetically generated and manipulated e-commerce reviews with binary ground truth labels (`CG` = Computer Generated, `OR` = Original).
   - Preserved in `collections/isolated_benchmarks/ecommerce_fake_reviews.parquet`.
3. **Synthetic Stress Test Suite (5 cases):**
   - Edge cases testing extreme boundary conditions (e.g. negative price, 0x0 image dimension, 10,000-character review, unicode injection).

---

## 4. Privacy, PII, and Ethical Safeguards

1. **Personally Identifiable Information (PII):**
   - No reviewer names, physical addresses, IP addresses, credit card details, or phone numbers are present in the dataset.
   - All reviewer identifiers are anonymized or set to `ANONYMOUS_REVIEWER`.
2. **Merchant Protection:**
   - No individual third-party merchant is falsely labeled as fraudulent. All platform merchants are categorized as `UNVERIFIED_THIRD_PARTY_MERCHANT` due to lack of merchant extraction in upstream crawls.
3. **Traceability:**
   - Every row across all 7 evidence tables maintains an immutable `source_id` pointing directly to `metadata/source_registry.parquet`.

---

## 5. Certification Statement

All sources are verified for legal research use under fair dealing and academic evaluation terms. The separation between Indian and supplementary records is strictly maintained.
