# Marketplace Trust Evidence Dataset v1.0 — Data Leakage & Algorithmic Bias Audit

**Project:** AI-Powered Marketplace Trust Intelligence Platform  
**Dataset Release:** `Marketplace Trust Evidence Dataset v1.0`  
**Execution Date:** 2026-11-03  
**Auditor:** Senior Data Quality Auditor & Multimodal ML Architect  

---

## 1. Executive Summary

This report delivers a critical examination of data leakage risks, duplicate representations, source biases, and linguistic imbalances within the `Marketplace Trust Evidence Dataset v1.0`. Machine learning models trained on marketplace data are highly prone to spurious correlations if duplicates bridge train/test partitions or if geographic differences are conflated with trust signals. This audit defines the exact bias parameters and operational safeguards.

---

## 2. Data Leakage Audit & Mitigations

### 2.1 Product-Level Leakage (Entity Contamination)
- **Risk:** If multiple reviews or images associated with the same physical product are split across training and evaluation folds, models will memorize product-specific idiosyncrasies rather than learning generalizable trust signals.
- **Audit Findings:**
  - In `evidence/reviews.parquet`, 476 products have multiple customer reviews (ranging from 2 to 2,450 reviews per product).
  - In `evidence/images.parquet`, 812 products possess multiple multi-angle images.
- **Mandated Mitigation:**
  - All future model evaluation must employ **strict GroupKFold partitioning on `canonical_product_id`**.
  - All reviews, images, and price observations for a given product must reside entirely within a single fold.

### 2.2 Cross-Product Near-Duplicate Leakage
- **Risk:** Identical manufacturer descriptions, syndicated reviews, or stock images appearing across distinct product listings can cause cross-fold information leakage.
- **Audit Findings:**
  - **Image Duplication:** 142 unique image content hashes (SHA-256) appear across more than one product listing, totaling 288 duplicate edges in `evidence_relationships/entity_relationships.parquet`.
  - **Review Duplication:** 184 exact review text collisions were detected across different product listings.
- **Mandated Mitigation:**
  - Evaluation pipelines must check test instances against train instances using `content_hash_sha256` and exact review text hash to purge identical cross-product pairs from test sets.

---

## 3. Algorithmic & Dataset Bias Analysis

### 3.1 Geographic and Marketplace Source Bias
- **Composition:** 60.28% Indian Marketplace (`amazon_in`, `flipkart`, `myntra`) vs. 39.72% Supplementary International (`amazon`, `bestbuy`, `walmart`).
- **Currency & Purchasing Power Parity (PPP) Bias:**
  - Supplementary data operates entirely in USD with price points reflecting North American retail norms.
  - Indian marketplace data operates in INR.
  - Direct numeric concatenation without currency-specific normalization will cause pricing anomaly models to falsely flag Indian products as low-value outliers.
  - *Architectural Safeguard:* The dataset strictly preserves `currency` (`INR` vs. `USD`). Cross-currency comparison without explicit PPP adjustment is prohibited.

### 3.2 Category Representation Bias
- **Distribution:**
  - Beauty & Personal Care: 34.7% (2,100 products)
  - Electronics & Mobiles: 23.0% (1,392 products)
  - Fashion & Apparel: 16.5% (1,000 products)
  - General Retail & Home: 25.7% (1,551 products)
- **Bias Consequence:**
  - Visual models trained primarily on Beauty bottles and Electronics hardware may fail to generalize to soft goods in Fashion & Apparel.
  - *Architectural Safeguard:* Category-stratified sampling is enforced, and evaluation metrics must be reported per category.

### 3.3 Modality Asymmetry Bias
- **Observed Asymmetry:**
  - Indian products have rich images (Amazon India, Flipkart) or rich reviews (Flipkart electronics), but 0 overlap.
  - Supplementary products (Amazon US Gold cohort) provide all 4 modalities.
- **Bias Consequence:**
  - A model could inadvertently learn that "US products have high trust because they are complete, while Indian products have low trust because modalities are missing".
  - *Architectural Safeguard:* Missing modalities are explicitly flagged as `MISSING_EVIDENCE`, not low trust. Tier A is documented as an international calibration core, not a geographic trust benchmark.

### 3.4 Linguistic and Script Imbalance
- **Observed Distribution:**
  - 99.99% of customer reviews are written in standard English.
  - Only 2 reviews in the Indian collection are identified as Hindi in Latin script (`hi-Latn` / Hinglish tokens like *"paisa vasool"*, *"bahut achha"*).
- **Audit Reality:**
  - The PromptCloud / Kaggle review scrapes filtered heavily for English-language reviews.
  - Real-world Indian e-commerce contains significant code-mixed Hinglish and regional vernaculars (Tamil, Telugu, Bengali, Marathi).
  - *Defensive Guidance:* Current NLP modules cannot claim generalized Hindi / Hinglish trust detection without acquiring dedicated multilingual corpora.

---

## 4. Summary Matrix of Safeguards

| Leakage / Bias Vector | Empirical Exposure | Severity | Implemented Safeguard |
|---|---|---|---|
| Product ID Leakage | High (476 multi-review products) | Critical | Mandated GroupKFold on `canonical_product_id` |
| Image Re-use Leakage | Moderate (142 duplicated hashes) | High | Hash-based deduplication in train/test splits |
| Currency Conflation | High (INR vs USD) | Critical | Strict currency isolation; no mixing |
| Modality Asymmetry | High (0 complete Indian products) | High | Tier A/B separation; missing evidence != fraud |
| Linguistic Uniformity | High (99.99% English) | Moderate | Documented boundary; no unsupported multilingual claims |

---

## 5. Certification Conclusion

All known data leakage and bias vectors have been empirically quantified and documented with explicit mitigation protocols, preventing model distortion during future AI training.
