# Dataset Source-to-Release Reconciliation Report — v1.8
## AI-Powered Marketplace Trust Intelligence Platform

**Audit Timestamp:** 2026-11-04  
**Audit Scope:** Multi-source catalog discovery, 20K cohort investigation, entity-level link reconciliation, and quarantine tracking.

---

### 1. Master Source Reconciliation Table

The table below reconciles all raw, interim, baseline, and curated sources against the active release catalog:

| Source | Domain | Raw Records | Valid Records | Integrated | Quarantined | Excluded | Missing | Quarantine / Exclusion Reason |
|---|---|---:|---:|---:|---:|---:|---:|---|
| **Raw Walmart Products** | Products | 22,074 | 22,074 | 22,074 | 0 | 0 | 0 | Ingested into source staging |
| **Raw Flipkart Products** | Products | 1,000 | 1,000 | 1,000 | 0 | 0 | 0 | Ingested into source staging |
| **Raw Myntra Products** | Products | 1,000 | 1,000 | 1,000 | 0 | 0 | 0 | Ingested into source staging |
| **Raw Amazon India Products** | Products | 1,500 | 1,500 | 1,500 | 0 | 0 | 0 | Ingested into source staging |
| **Curated 5,684 Core Cohort** | Products | 5,684 | 5,684 | 5,206 | 478 | 0 | 0 | Core foundation subset from Phase 1 curation |
| **Curated 20,000 Expanded Cohort** | Products | 20,000 | 20,000 | 5,883 | 14,117 | 0 | 0 | 14,117 records quarantined: 100% US products lacking image evidence (98.6% NO_IMAGE) |
| **Indian Products Processed** | Products | 3,500 | 3,500 | 3,500 | 0 | 0 | 0 | Ingested into source staging |
| **Canonical Products Baseline** | Products | 31,289 | 31,289 | 6,043 | 25,246 | 0 | 0 | Historical candidate universe from multi-source crawl |
| **Raw Flipkart Reviews** | Reviews | 3,500 | 3,500 | 3,500 | 0 | 0 | 0 | Ingested into source staging |
| **Raw BestBuy Reviews** | Reviews | 44,965 | 44,965 | 44,965 | 0 | 0 | 0 | Ingested into source staging |
| **Indian Reviews Processed** | Reviews | 3,500 | 3,500 | 3,500 | 0 | 0 | 0 | Ingested into source staging |
| **Canonical Reviews Baseline** | Reviews | 55,616 | 55,616 | 55,616 | 0 | 0 | 0 | Canonical linked reviews with valid product IDs |
| **Unlinked Review Corpus Baseline** | Reviews | 3,500 | 3,500 | 1,081 | 2,419 | 0 | 0 | 2,419 unlinked reviews lack valid product matches |
| **Canonical Images Baseline** | Images | 13,390 | 13,390 | 5,228 | 326 | 7,836 | 0 | 7,836 historical CDN URLs expired or lack local physical storage |
| **Indian Images Processed** | Images | 5,034 | 5,034 | 5,034 | 0 | 0 | 0 | Ingested into source staging |
| **Deceptive Opinion Spam** | Benchmarks | 1,600 | 1,600 | 0 | 0 | 1,600 | 0 | Strictly isolated from training/evaluation catalog to prevent leakage |
| **E-commerce Fake Reviews Benchmark** | Benchmarks | 40,526 | 40,526 | 0 | 0 | 40,526 | 0 | Strictly isolated from training/evaluation catalog to prevent leakage |
| **Synthetic Stress Test Cases** | Benchmarks | 5 | 5 | 0 | 0 | 5 | 0 | Strictly isolated from training/evaluation catalog to prevent leakage |

---

### 2. Deep-Dive Audit: The 20,000 Curated Product Cohort

A central mandate of this audit was to determine the exact relationship between:
- `data/curated/curated_products_20000.parquet`
- `data/curated/cohort_membership_20000.parquet`
- `data/curated/cohort_metadata_20000.json`
- The certified catalog (6,043 products).

#### Key Audit Findings:
1. **Total Unique Identifiers in 20K Cohort:** Exactly 20,000 unique `canonical_product_id` records.
2. **Overlap with Active Certified Catalog:** **5,883 products** (97.35% of the 6,043 catalog products originate from the 20K cohort; the remaining 160 products are newly recovered Indian listings from Flipkart and Amazon India).
3. **Quarantined Candidate Pool:** Exactly **14,117 products** from the 20K cohort are not currently integrated into the certified catalog.

#### Analysis of the 14,117 Quarantined Candidates:
- **Geographic Composition:** 100% US / International listings:
  - **Walmart (US):** 9,776 products (69.25%)
  - **Amazon (US):** 4,341 products (30.75%)
  - **Indian Marketplaces:** **0 products (0.00%)**
- **Evidence Quality & Multimodal Density:**
  - **NO_IMAGE_RECORDS:** 13,920 products (**98.60%**) possess zero physical or CDN image records.
  - **Usable Images:** Only 197 products possess any image evidence.
  - **Review Density:** 11,539 products possess zero customer reviews.
- **Scientific Impact of Inclusion:**
  - Integrating these 14,117 sparse records would expand the total catalog to 20,160 products.
  - However, **Indian product representation would plummet from 60.28% down to 18.07%**.
  - Multimodal Tier A coverage would drop from 5.05% down to **1.51%**.
  - Average catalog image availability would collapse.

#### Audit Verdict on 20K Cohort:
The 14,117 unintegrated products represent a **sparse catalog expansion pool**, not unintegrated multimodal products. They are safely retained in `data/curated/` as a reference expansion pool and must **not** be indiscriminately merged into the Indian-first multimodal catalog.

---

### 3. Entity-Level Provenance & Linkage Summary

#### A. Products Reconciliation
- **Total Certified Catalog:** 6,043 products.
- **Indian Marketplace Products:** 3,643 products (60.28%)
  - Amazon India: 1,485
  - Flipkart: 1,158
  - Myntra: 1,000
- **Supplementary International:** 2,400 products (39.72%)
  - Walmart: 1,151
  - Amazon US: 1,000
  - BestBuy: 249

#### B. Customer Reviews Reconciliation
- **Total Linked Reviews in Catalog:** 56,697 reviews.
  - Canonical base linked: 55,616 reviews.
  - Recovered Amazon India reviews: 1,081 reviews.
- **Quarantined Reviews:** 2,419 reviews from `review_corpus_unlinked.parquet` remain quarantined due to lack of verified product ID resolution.

#### C. Physical Images Reconciliation
- **Total Physical Image Files on Disk:** 5,228 verified decodable image files.
- **Quarantined Failed Downloads:** 326 image URLs audited with failure signatures (HTTP 403, 404, or invalid MIME type).
- **Target Flipkart Manifest:** 127 Flipkart review products awaiting external image acquisition (`BLOCKED_EXTERNAL`).

#### D. Pricing Observations Reconciliation
- **Valid Price Records:** 5,153 products (85.27%).
- **Unpriced / Missing Price Listings:** 890 products (14.73%, e.g., BestBuy catalog items without retail price). Governed under neutral zero-penalty policy.
