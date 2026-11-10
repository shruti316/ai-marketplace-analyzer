# Model Limitations, Boundaries & Scientific Disclaimers

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Phase:** Phase 1 Final — Scientific Architecture Finalization  
**Specification:** [`reports/phase_1_final/model_limitations.md`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/reports/phase_1_final/model_limitations.md)  
**Effective Date:** November 10, 2026  

---

## 1. Absolute Scientific Boundaries & Legal Disclaimers

> [!CAUTION]
> **No Automated Fraud Claims:**  
> The AI-Powered Marketplace Trust Intelligence Platform is a statistical intelligence, anomaly detection, and explainable audit system. It does NOT assert legal fraud, intellectual property counterfeit, criminal collusion, or statutory violation against any marketplace seller or catalog brand.

### 1.1 Statistical Anomalies vs. Fraud
- **Pricing:** An observed selling price that deviates substantially from category benchmarks ($|z_{\text{MAD}}| \ge 3.0$) or carries a heavy discount ($\ge 90\%$) indicates statistical price dispersion, clearance sales, or refurbished merchandise. It is **never standalone proof of deceptive pricing**.
- **Imagery:** Identical hero images across different product listings occur routinely when authorized third-party sellers utilize standard manufacturer press assets. Catalog visual reuse is a **similarity signal**, never standalone proof of listing piracy.
- **Reviews:** Low star ratings (1- or 2-star reviews) and critical customer sentiments represent genuine consumer feedback on build quality, courier delays, or sizing. They must **never be treated as evidence of review fraud**.

---

## 2. Specific Modality Limitations

### 2.1 Review NLP Intelligence
1. **Historical Human Annotation Bias:** The historical 100 Gold review annotations exhibit 100% rating selection bias (all genuine reviews rated $\ge 3$ stars; all suspicious reviews rated $\le 2$ stars). Supervised authenticity classification is **strictly blocked** until the 500 pending tasks complete double-blind adjudication.
2. **Single-Sample Deceptive Deficit:** The entire catalog contains only **1 verified deceptive sample** (`flipkart_rev_00270`). Multiclass classification distinguishing suspicious from deceptive reviews is mathematically unestimable.
3. **Linguistic Scope:** ABSA and TF-IDF models are trained on Latin-script Indian English. Vernacular Indian scripts (Devanagari, Tamil, Bengali) and informal code-mixing are currently supported only via transliterated keywords.

### 2.2 Computer Vision & Multimodal Alignment
1. **ResNet-18 Stock Photo Confounding:** Centered ResNet embeddings capture visual identity but cannot verify physical possession. A fraudulent dropshipper and an authorized distributor using the same stock photo produce identical embeddings.
2. **CLIP Zero-Shot Sensitivity:** OpenAI CLIP ViT-B/32 achieves strong zero-shot category and merchandise separation ($\text{ROC-AUC} = 0.99$), but can miss fine-grained packaging typography or subtle packaging shade differences without high-resolution crops.
3. **Packaging OCR Physical Constraints:** WinRT OCR is limited to clear, legible packaging crops. Curved surfaces, glossy reflections, or low-resolution thumbnails (< 300px) frequently produce unreadable text, which is handled as an honest null under the Zero-Penalty Invariant.

### 2.3 Pricing Intelligence
1. **Cross-Sectional Point-in-Time Crawl:** Observed prices represent a single point-in-time snapshot. The platform lacks longitudinal price history, intraday price velocity, or dynamic pricing API feeds. Historical price predictions must not be asserted.
2. **Sample Size Requirements:** Reliable MAD corridors require a minimum peer sample size of $N \ge 5$ within the same subcategory. Small luxury or niche categories fall back to unassessed baselines.

### 2.4 Entity Graph & Seller Governance
1. **Platform Aggregate Seller Omission:** Upstream marketplace crawls omitted individual merchant tax IDs (GSTINs). Seller entities in the database represent **platform aggregate merchant pools** (RetailNet, Cloudtail, Myntra Dedicated). The system explicitly disclaims individual merchant reputation scoring.
2. **Bipartite Graph Semantics:** Graph edges represent structural catalog links (`SELLER_OFFERS_LISTING`, `LISTING_OF_PRODUCT`), not evidence of coordinated merchant syndicates.

---

## 3. Multimodal Learned Fusion Limitations
1. **Surrogate Model Role:** The 19-feature Random Forest model approximates the multi-modal rule engine ($F_1 \approx 0.91$ unconstrained). It functions as a continuous risk ranker for triage, NOT as independent ground-truth fraud detection.
2. **Zero-Penalty Requirement:** When modalities are missing, the model must maintain non-inflated risk probabilities.
