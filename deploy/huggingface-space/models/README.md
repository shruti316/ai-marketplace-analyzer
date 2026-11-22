# Serialized Model Artifacts & Architecture Registry

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Target Marketplaces:** Amazon India, Flipkart, Myntra  

This directory contains trained, calibrated, and serialized model artifacts for the trust intelligence platform.

---

## 1. Frozen Model Inventory & Cryptographic Checksums

All trained models in this repository are **immutably frozen**. Under non-negotiable platform rules, models are never retrained or overwritten in place.

| Model Variant | File Path | File Size | SHA-256 Checksum | Operational Role |
|---------------|-----------|-----------|------------------|------------------|
| **ML V1.0 Baseline** | `models/advanced_multimodal_gated_model.joblib` | $858$ KB | `56F8304670C524B12A43F5BDE17D7AC6BF5E4EC16651079ED6BF246E141F9374` | Certified Primary Champion |
| **Multimodal Vision V1.1** | `models/v1_1/advanced_multimodal_gated_model_v1_1.joblib` | $660$ KB | `B7C00AFBCB54F5B05BBB8094746A7B3135DC01DA008EA3C1F0B7E49FC4F58564` | Hardened Challenger (Shadow/Canary) |
| **Hotel NLP Baseline** | `models/hotel_review_baseline.joblib` | $141$ KB | `4F92B54E691A083161C145FE07DF15DE8189D5AC3B11A1B436D81C3ACBA7AEB5` | Auxiliary Sentiment Prior |
| **Historical Fusion** | `models/multimodal_fusion_model.joblib` | $2.23$ MB | `A32F5DA55E0E8D9BD6B386450BF47C9200B093BF829285093A92A62C66A46307` | Pre-Gated Baseline (Archived) |

---

## 2. Model Architecture Comparison

### ML V1.0 Baseline (Primary Champion)
- **Feature Space:** 13 features across 5 streams:
  - Pricing (3): $\log(\text{INR Price})$, discount %, robust $z$-score
  - Review NLP (4): mean rating, mean sentiment, sentiment discordance, duplicate review indicator
  - Computer Vision (2): `has_duplicate_hash`, `is_cross_product_reuse`
  - CLIP (2): cosine similarity, global discordance
  - Graph (2): degree centrality, PageRank
- **Gated Multimodal Units (GMU):** 5-stream binary availability mask $M \in \{0, 1\}^5$, enforcing hard zero-gating ($m_k = 0 \implies x_{\text{gated}, k} \equiv 0$).
- **Calibration:** Out-of-fold Isotonic Regression (calibrated test Brier score: $0.0266$).

### Multimodal Vision V1.1 (Hardened Challenger)
- **Feature Space:** 16 features across 5 streams (adds `is_white_background`, `normalized_image_count`, and `clip_category_scaled_zscore`).
- **Category CLIP Calibration:** Normalized $z$-score relative to category priors ($\mu_{\text{cat}}, \sigma_{\text{cat}}$), eliminating false discordance in Indian ethnic apparel.
- **6-Tier Duplicate Taxonomy:** Fine-grained duplicate categorization (`EXACT`, `NEAR`, `VARIANT`, `RELATED`, etc.).

---

## 3. Loading Models in Code

```python
import joblib

# Load ML V1.0 Baseline
model_v1_0 = joblib.load("models/advanced_multimodal_gated_model.joblib")

# Load Multimodal Vision V1.1 Candidate
model_v1_1 = joblib.load("models/v1_1/advanced_multimodal_gated_model_v1_1.joblib")
```

For production service execution, use the high-level decoupled service interface:
```python
from src.trust_engine.api_service import TrustIntelligenceEngine

engine = TrustIntelligenceEngine()
# V1.0 inference
asmt_v1_0 = engine.assess_product_learned_multimodal("amazon_in_B000052YQN", version="v1.0")
# V1.1 inference
asmt_v1_1 = engine.assess_product_learned_multimodal("amazon_in_B000052YQN", version="v1.1")
```
