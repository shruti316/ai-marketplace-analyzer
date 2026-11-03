# Marketplace Trust Evidence Dataset v1.0 — Known Limitations & Negative Scope Report

**Project:** AI-Powered Marketplace Trust Intelligence Platform  
**Dataset Release:** `Marketplace Trust Evidence Dataset v1.0`  
**Execution Date:** 2026-11-03  
**Auditor:** Senior Data Quality Auditor & Multimodal ML Architect  

---

## 1. Executive Summary

A scientifically defensible AI platform requires explicit demarcation of what its data **can** and **cannot** substantiate. Overclaiming dataset capabilities leads directly to model failure in production. This document records the empirical boundaries, structural limitations, and negative scope of `Marketplace Trust Evidence Dataset v1.0`.

---

## 2. Structural & Modality Limitations

### 2.1 Absence of Merchant / Seller Identifiers
- **Limitation:** The upstream web scrapes (PromptCloud) completely omitted seller/merchant IDs, storefront names, business registrations, GSTIN numbers, and fulfillment identifiers.
- **Unsupported Claims:**
  - ❌ **CANNOT** claim to detect "fraudulent seller rings" or "coordinated merchant syndicates".
  - ❌ **CANNOT** claim to calculate seller-level trust scores or merchant recidivism rates.
  - ❌ **CANNOT** train graph neural networks on seller-product bipartite topologies.
- **Permitted Operational Scope:**
  - ✔️ Graph analysis is strictly limited to product-image-review bipartite relationships, duplicate image clusters, and cross-listing asset reuse.

### 2.2 The Complete Multimodal Core Distribution
- **Limitation:** In the primary Indian marketplace collection (3,643 products), there is **zero overlap** between products with local physical images and products with customer reviews.
  - Exactly **100 products** in Tier A qualify for complete multimodal modeling, and all 100 originate from the supplementary Amazon US cohort.
- **Unsupported Claims:**
  - ❌ **CANNOT** claim to have a production-scale Indian multimodal dataset where Indian listings possess simultaneous images, reviews, and prices.
  - ❌ **CANNOT** train end-to-end Indian multimodal fusion models without recognizing Tier B partial modality constraints.
- **Permitted Operational Scope:**
  - ✔️ Use the 100 Tier A products for cross-attention calibration and architecture validation.
  - ✔️ Use the 3,643 Indian Tier B products for individual vision, NLP, and pricing modules.

### 2.3 Static Point-in-Time Pricing Snapshots
- **Limitation:** All prices in `evidence/price_observations.parquet` represent static, single-observation crawl snapshots.
- **Unsupported Claims:**
  - ❌ **CANNOT** claim to model longitudinal price volatility, dynamic repricing algorithms, flash-sale manipulation, or historical price inflation.
  - ❌ **CANNOT** evaluate LSTM or time-series forecasting models on pricing trends.
- **Permitted Operational Scope:**
  - ✔️ Non-parametric category peer-group fence analysis (Tukey IQR fences) evaluating whether a static price is an extreme outlier relative to comparable listings.

### 2.4 Review Linkage & Attribution Boundaries
- **Limitation:** The 3,260 linked Flipkart reviews originate from an open electronics review crawl matching 127 product lines. The raw data contained no order IDs, Flipkart PIDs, buyer usernames, or verified-purchase flags.
- **Unsupported Claims:**
  - ❌ **CANNOT** describe linked reviews as "authenticated customer purchases" or "verified buyer reviews".
  - ❌ **CANNOT** evaluate buyer account trust, reviewer collusion rings, or purchase-history fraud.
- **Permitted Operational Scope:**
  - ✔️ Evaluation of linguistic text quality, sentiment-rating alignment, review duplication, and product-line text consistency (`linkage_confidence = 0.95`).

### 2.5 Linguistic and Regional Imbalance
- **Limitation:** 99.99% of customer reviews are in standard English. Only 2 confirmed Hindi-Latin (`hi-Latn` / Hinglish) reviews exist in the Indian collection.
- **Unsupported Claims:**
  - ❌ **CANNOT** claim production-grade trust intelligence across multilingual India or regional Indic languages (Hindi, Tamil, Telugu, Bengali, Kannada, Marathi).
- **Permitted Operational Scope:**
  - ✔️ English-language text analytics and sentiment calibration. Multilingual models must be trained on external Indic corpora.

---

## 3. Methodological Boundary: Signal vs. Fraud

The platform strictly enforces the following core principle:
$$\mathbf{Evidence\ Mismatch} \ne \mathbf{Fraud}$$

An anomaly in Layer 6 (e.g. a low price, an OCR packaging discrepancy, or a low star rating with positive words) is an **investigation signal**, not proof of illicit merchant conduct.
- A price below the lower fence may indicate clearance inventory, a refurbished accessory, or loss-leader marketing.
- Image reuse across listings frequently represents shared OEM components or multi-variant product families.
- An OCR mismatch often stems from image compression artifacts or typography distortion.

Models built on this dataset must output **probabilistic risk factors with calibrated uncertainty**, never definitive accusations of fraud.

---

## 4. Unsupported Deployment Targets

The dataset is certified exclusively for research, architectural prototyping, and offline model benchmarking. It is **NOT certified for**:
1. Live automated merchant banning or account termination.
2. Financial credit scoring of marketplace vendors.
3. Automated regulatory legal enforcement actions.

---

## 5. Conclusion

By establishing these limitations clearly, the dataset provides a transparent, scientifically defensible platform that avoids false claims and focuses on genuine data evidence.
