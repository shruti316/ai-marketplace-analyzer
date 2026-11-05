# Multimodal Trust Fusion & Modality Ablation Report — v1.7
## Marketplace Trust Intelligence Platform

**Execution Timestamp:** 2026-11-04  
**Total Products Evaluated:** 6,043  
**Architecture:** Non-Circular Explainable Evidence Aggregation  

---

### 1. Modality Ablation Benchmark (8 Configurations)

| Configuration | Required Modalities | Applicable Products | Catalog Coverage | Mean Anomaly Penalty | Anomaly Detection Rate |
|---|---|---:|---:|---:|---:|
| **Text Only** | CUSTOMER_REVIEWS | 1,181 | 19.54% | 0.0098 | 4.4% |
| **Image Only** | PRODUCT_IMAGES | 2,952 | 48.85% | 0.0292 | 21.82% |
| **Price Only** | PRICE_INTELLIGENCE | 5,153 | 85.27% | 0.0234 | 11.72% |
| **Graph Only** | RELATIONSHIP_GRAPH | 6,043 | 100.0% | 0.0 | 0.0% |
| **Text + Image** | CUSTOMER_REVIEWS, PRODUCT_IMAGES | 305 | 5.05% | 0.0049 | 1.97% |
| **Text + Price** | CUSTOMER_REVIEWS, PRICE_INTELLIGENCE | 432 | 7.15% | 0.0345 | 16.67% |
| **Image + Price** | PRODUCT_IMAGES, PRICE_INTELLIGENCE | 2,811 | 46.52% | 0.0468 | 29.03% |
| **Full Fusion** | CUSTOMER_REVIEWS, PRODUCT_IMAGES, PRICE_INTELLIGENCE, RELATIONSHIP_GRAPH | 305 | 5.05% | 0.0141 | 6.56% |

---

### 2. Modality Tier Distribution & Confidence Calibration

| Modality Tier | Product Count | Percentage | Calibrated Confidence | Description |
|---|---:|---:|:---:|---|
| **Tier A (Complete)** | 305 | 5.05% | **1.00** | Text + Verified Image + Valid Price |
| **Tier B (Visual)** | 2,506 | 41.47% | **0.75** | Product + Verified Image + Valid Price |
| **Tier C (Textual)** | 127 | 2.10% | **0.70** | Product + Linked Reviews + Valid Price |
| **Tier D (Catalog)** | 3,105 | 51.38% | **0.40** | Raw catalog listing lacking reviews/images |

---

### 3. Explainable Fusion Governance Rules
1. **Traceability:** Every penalty point is mapped to an explicit behavioral or physical anomaly (e.g. `RATING_SENTIMENT_DISCORDANCE`, `EXTREME_PRICE_OUTLIER_MAD`).
2. **Missing Modality Safety:** Products lacking reviews or images receive lower confidence scores, but their trust penalty is **0.00**. Missingness is never penalized as fraud.
3. **Target Leakage Prohibition:** Unsupervised composite evidence scores are strictly separated from supervised classification targets.
