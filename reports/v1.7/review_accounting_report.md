# Marketplace Trust Intelligence Platform — v1.7
## Comprehensive Review Accounting & Behavioral Intelligence Report

**Execution Timestamp:** 2026-11-04  
**Dataset Version:** v1.7 Frozen Release Candidate  
**Total Reviews Analyzed:** 56,697  

---

### 1. Executive Summary & Review Accounting

Every review record out of the reported 56,697 reviews has been accounted for with 100% mathematical integrity across all source corpora.

| Marketplace | Total Reviews | Linked Reviews | Quarantined / Unlinked | Primary Linkage Type | Linkage Confidence | Status |
|---|---:|---:|---:|---|---:|---|
| **BestBuy** | 44,965 | 44,965 | 0 | EXACT_CATALOG_ID | 1.000 | VALIDATED_LINKED |
| **Amazon US** | 8,073 | 8,073 | 0 | EXACT_ASIN_MATCH | 1.000 | VALIDATED_LINKED |
| **Flipkart** | 3,260 | 3,260 | 0 | EXACT_PRODUCT_LINE_IDENTITY | 0.950 | VALIDATED_LINKED |
| **Amazon India** | 159 | 159 | 0 | EXACT_ASIN_MATCH | 1.000 | VALIDATED_LINKED |
| **Uncertain (Flipkart)** | 240 | 0 | 240 | QUARANTINED_NO_ENTITY | 0.000 | QUARANTINED_UNLINKED |
| **Total** | **56,697** | **56,457** | **240** | — | **0.995** | **100% ACCOUNTED** |

---

### 2. Definitive Resolution of Historical Inconsistencies

#### 2.1 The '3,490 Unlinked Amazon India Reviews' Myth
- **Historical Claim:** The v1.4 markdown report narrative claimed "3,490 Amazon India reviews unlinked".
- **Physical Reality:** Direct forensic inspection of the underlying Parquet files from v1.4, v1.5, and v1.6 confirms that `evidence/reviews.parquet` **never contained 3,490 Amazon India reviews**.
- **Root Cause:** In `data/raw/flipkart/flipkart_reviews_raw.csv`, there are exactly **3,500 reviews** (3,260 admitted + 240 quarantined). The v1.4 documentation author erroneously conflated the 3,500 Flipkart corpus with Amazon India, writing "3,490 Amazon India reviews unlinked" in prose.
- **Amazon India Reality:** The Amazon India beauty corpus (`data/raw/amazon_india/all_beauty_reviews.parquet`) has exactly **159 reviews** whose ASINs match the 1,500 Amazon India product catalog (`beauty_products.parquet`). All 159 are 100% linked with high confidence.

#### 2.2 The 240 Quarantined Flipkart Reviews
- **Origin:** `data/raw/flipkart/flipkart_reviews_raw.csv`.
- **Target Products:** Voltas Beko 8 Place Table Top Dishwasher (DT8B), IFB Neptune SXS Free Standing Dishwasher, Butterfly Rapid Electric Kettle, etc.
- **Root Cause:** The 6,043 product catalog does not contain dishwasher or kettle catalog entities from Flipkart; these appliances were omitted during the initial Flipkart product scrape.
- **Resolution:** In strict accordance with the **Zero Data Fabrication** rule, these 240 reviews are preserved in `reviews.parquet` with `canonical_product_id = None` and marked `QUARANTINED_NO_CATALOG_ENTITY`.

---

### 3. Representation Imbalance Analysis: Products vs Reviews

| Region | Marketplace Sources | Total Products | Product Share | Total Reviews | Review Share |
|---|---|---:|---:|---:|---:|
| **Indian Marketplace** | Amazon India, Flipkart, Myntra | 3,643 | **60.28%** | 3,659 | **6.45%** |
| **US Marketplace** | BestBuy, Amazon US, Walmart | 2,400 | **39.72%** | 53,038 | **93.55%** |
| **Total** | All 6 Marketplaces | 6,043 | 100.0% | 56,697 | 100.0% |

> [!WARNING]
> While Indian products constitute the majority (**60.28%**) of the product catalog, Indian reviews represent only **6.45%** of the review corpus. BestBuy alone accounts for **79.31%** of all reviews. It is scientifically invalid to describe this dataset as balanced or representative of Indian review dynamics without explicitly reporting this structural asymmetry.

---

### 4. Review Behavioral and Manipulation Signals

| Metric / Signal | Count / Value | Percentage of Corpus | Description |
|---|---:|---:|---|
| **Rating-Sentiment Discordant Reviews** | 28 | 0.049% | Extreme rating mismatch with text sentiment |
| **Exact Corpus-Wide Duplicate Reviews** | 22,147 | 39.06% | Reviews sharing identical text with at least 1 other review |
| **High Frequency Duplicate Reviews (Freq >= 5)** | 1,199 | 2.11% | Template / copy-paste boilerplate text across products |
| **Product-Level Duplicate Reviews** | 8,796 | 15.51% | Repeated reviews targeting the exact same product entity |
| **Syntax Shouting Reviews** | 16 | 0.028% | Uppercase ratio >= 40% with multiple exclamation marks |
| **Composite Suspicious Review Signal** | 9,155 | 16.15% | Weak supervision multi-signal heuristic trigger |

---

### 5. Verification & Immutability Compliance
- Input Table: `data/marketplace_trust_dataset_v1.6/evidence/reviews.parquet` (56,697 rows, unchanged).
- Output Table: `data/processed_v1_7/review_behavioral_features_v1_7.parquet` (56,697 rows, 29 engineered columns).
- Accounting Table: `data/processed_v1_7/review_accounting_v1_7.parquet`.
