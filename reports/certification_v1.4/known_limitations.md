# Workstream L: Documented Known Limitations & Mitigation Roadmap

The v1.4 dataset release is certified under **CERTIFIED_WITH_LIMITATIONS**. The following limitations are documented with complete scientific honesty:

## 1. LIM-01: Flipkart Review Product Physical Images
- **Description:** 127 Flipkart review products have verified metadata and reviews, but lack local product hero images on disk.
- **Impact:** Limits Indian complete multimodal products (Tier A) to 5 products.
- **Mitigation:** An external acquisition proposal (`scripts/acquire_flipkart_images.py`) has been prepared with SHA-256 pre-registration, awaiting user network authorization.

## 2. LIM-02: Seller Entity Crawl Granularity
- **Description:** Marketplaces crawl listings without exposing third-party seller registration numbers (GSTIN/CIN).
- **Impact:** Products have NULL `seller_id`; sellers are modeled at aggregate platform level (6 merchants).
- **Mitigation:** Graph schema supports zero-friction linking once registration crawls are authorized.

## 3. LIM-05: Native Indic Regional Scripts
- **Description:** 98.4% of customer reviews are English; 1.6% are Hinglish/Latinized Indic. Native scripts (Devanagari, Tamil, Telugu) are not represented in the current crawl.
- **Mitigation:** Phase 4 multi-lingual Indic corpus expansion proposal documented.

## 4. LIM-07: Unlinked Amazon India Reviews
- **Description:** 3,490 Amazon India reviews lack ASIN matching due to crawl payload truncation.
- **Impact:** Maintained as an unlinked corpus in `data/processed/review_corpus_unlinked.parquet` to avoid false relationships.
- **Mitigation:** Fuzzy title-matching proposal documented for optional silver-standard linkage.
