# Marketplace Trust Evidence Dataset v1.0 — Layer 6 Cross-Modal Evidence Report

**Project:** AI-Powered Marketplace Trust Intelligence Platform  
**Dataset Release:** `Marketplace Trust Evidence Dataset v1.0`  
**Execution Date:** 2026-11-03  
**Auditor:** Senior Data Quality Auditor & Multimodal ML Architect  

---

## 1. Executive Summary

A core innovation of the AI-Powered Marketplace Trust Intelligence Platform is **Layer 6: Cross-Modal Evidence and Intelligence**. Unlike traditional platforms that analyze images, text, and pricing in isolation, Layer 6 explicitly detects contradictions, inconsistencies, and correlation anomalies across modalities. 

`evidence_relationships/cross_modal_evidence.parquet` catalogs **1,889** empirically detected cross-modal investigation records across 5 primary investigation categories.

---

## 2. Cross-Modal Investigation Matrix

| Investigation Type | Modality Pair | Detection Method | Records Detected | Example Signal |
|---|---|---|---|---|
| `REVIEW_RATING_MISMATCH` | Review Text ↔ Numeric Rating | Lexical Sentiment Contradiction | 1,248 | 1-star rating paired with "excellent superb product"; 5-star rating with "defective broken fake" |
| `REVIEW_REVIEW_DUPLICATION` | Review Text ↔ Review Text | Exact Text Collision | 184 | Identical 120-character review text posted across 4 different product listings |
| `IMAGE_IMAGE_REUSE` | Image Asset ↔ Image Asset | SHA-256 & dHash Collision | 288 | Identical hero product packaging image shared across 6 different brand listings |
| `PRODUCT_PRICE_ANOMALY` | Product Category ↔ Price | IQR Category Fence Analysis | 119 | Price ₹149,990 in a peer group with upper fence ₹12,499 |
| `TITLE_IMAGE_OCR_CONSISTENCY` | Product Title ↔ Image OCR Text | Jaccard Token Alignment | 50 | Product title claims "Brand X 500ml" but OCR detects "Brand Y 250ml" on packaging |
| **Total** | | | **1,889** | |

---

## 3. In-Depth Analysis of Cross-Modal Anomaly Types

### 3.1 Review Text ↔ Numeric Rating Mismatches (1,248 Records)
- **Investigation Goal:** Identify listings where customer sentiment contradicts the assigned numerical star rating.
- **Methodology:** Reviews with extreme star ratings ($\le 2.0$ or $\ge 5.0$) were evaluated for high-frequency contradictory lexical tokens.
- **Empirical Findings:**
  - 814 records featured ratings $\le 2.0$ containing enthusiastic praise (e.g., *"outstanding quality, best purchase ever"*).
  - 434 records featured 5.0-star ratings explicitly reporting severe defects (e.g., *"fake damaged broken product received, complete fraud"*).
- **Severity & Confidence:** Assigned `contradiction_score` between 0.85 and 0.90 with status `VALIDATED_SIGNAL`.
- **Interpretive Boundary:** Sarcasm, user interface error (misunderstanding 1-star as "rank 1"), or rating inversion can produce this signal without merchant fraud.

### 3.2 Review Text ↔ Review Text Duplication (184 Records)
- **Investigation Goal:** Detect syndicated or template-driven review spam campaigns.
- **Methodology:** Exact text hashing on cleaned review strings longer than 30 characters across distinct products and reviewers.
- **Empirical Findings:**
  - Multiple clusters of 3 to 12 identical reviews were identified.
  - The largest cluster spanned 9 separate products sharing identical review phrasing.
- **Severity & Confidence:** Assigned `contradiction_score` 0.95 with status `VALIDATED_SIGNAL`.

### 3.3 Image Asset ↔ Image Asset Reuse Across Listings (288 Records)
- **Investigation Goal:** Detect image recycling and unauthorized asset reuse across independent listings.
- **Methodology:** Exact SHA-256 collision and perceptual dHash Hamming distance ($d = 0$) across distinct `canonical_product_id` entities.
- **Empirical Findings:**
  - 142 distinct image hashes appeared across multiple product catalog entries.
  - While common in multi-pack or variant listings, several instances involved generic white-label products reusing branded manufacturer hero images.
- **Severity & Confidence:** Assigned `contradiction_score` 0.70 with status `VALIDATED_SIGNAL`.

### 3.4 Product Category ↔ Price Fence Anomalies (119 Records)
- **Investigation Goal:** Detect potential counterfeit pricing (below lower fence) or predatory price gouging (above upper fence).
- **Methodology:** Non-parametric Tukey fences on exact `(marketplace, currency, category)` peer groups with $n \ge 20$:
  $$\text{Upper Fence} = Q_3 + 1.5 \times \text{IQR}, \quad \text{Lower Fence} = \max(0, Q_1 - 1.5 \times \text{IQR})$$
- **Empirical Findings:**
  - 74 products exhibited prices significantly above the upper fence.
  - 45 products exhibited prices below the lower fence (e.g., ₹49 electronics accessories in groups averaging ₹1,200).
- **Severity & Confidence:** Assigned `contradiction_score` 0.60 with status `INVESTIGATION_SIGNAL`.

### 3.5 Title ↔ Packaging OCR Consistency (50 Records)
- **Investigation Goal:** Verify that text printed on physical product packaging matches the seller's catalog title claims.
- **Methodology:** Text extracted via Tesseract OCR from hero images was tokenized, normalized, and compared against product title tokens via Jaccard similarity.
- **Empirical Findings:**
  - In 38 of 50 sampled products, OCR packaging text corroborated the title claims (score $\ge 0.50$, status `CONSISTENT`).
  - In 12 cases, OCR revealed packaging text discrepancies (status `SUSPICIOUS_ANOMALY`).

---

## 4. Fundamental Methodological Boundary: Signal vs. Fraud

The platform maintains a strict scientific boundary:
> **A cross-modal mismatch is an INVESTIGATION SIGNAL, NOT automatic proof of merchant fraud.**

Factors causing benign mismatches include:
1. **Catalog Syndication:** Manufacturers legitimately use identical packaging images for variant stock keeping units (SKUs).
2. **Review Rating Scales:** Consumers frequently misunderstand review rating widgets (e.g., selecting 1 star intending "Top Tier").
3. **OCR Limitations:** Image resolution, lighting reflection, stylized typography, and angled perspective introduce OCR noise.
4. **Marketplace Pricing Dynamics:** Legitimate premium variants, bundled multipacks, or clearance liquidations naturally produce pricing fence outliers.

---

## 5. Summary Conclusion

Layer 6 provides an empirical, multi-angle dataset of cross-modal relationships. With 1,889 structured investigation records, future multimodal trust models can learn nuanced interaction weights rather than relying on brittle heuristic rules.
