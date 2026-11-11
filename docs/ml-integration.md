# Machine Learning Integration & API Contract Guide

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Target Systems:** Phase 3 Node.js / Express Backend, Python Microservices & React Frontend  
**Status:** Frozen ML V1.0 Architecture  

---

## 1. Overview & Integration Architecture

Phase 3 introduces an application backend (Node.js / Express or Python API) and user interface (React). The frozen ML layer provides two official integration entry points:

1. **In-Process Python SDK (`TrustIntelligenceEngine`):** Direct Python callable interface for batch jobs, Celery workers, or Python-based backends.
2. **Standard REST API Server (`TrustIntelligenceRestServer`):** Standard HTTP JSON endpoints for consumption by Node.js, Go, or web frontends.

```
                    +------------------------------------------+
                    |             React Frontend               |
                    +------------------------------------------+
                                         |
                                         v HTTP / JSON
                    +------------------------------------------+
                    |       Phase 3 Node.js Application        |
                    |           (Express / MySQL)              |
                    +------------------------------------------+
                                         |
                        +----------------+----------------+
                        | HTTP Call                       | In-Process (if Python)
                        v                                 v
        +-------------------------------+  +-------------------------------+
        |     REST API Service          |  |   TrustIntelligenceEngine     |
        |     (src/api/service.py)      |  | (src/trust_engine/api_service)|
        +-------------------------------+  +-------------------------------+
                        \                                 /
                         \                               /
                          v                             v
                    +------------------------------------------+
                    |         Frozen ML Pipeline V1.0          |
                    | - 5-Stream Gated Multimodal Fusion Model |
                    | - Isotonic Monotonic Calibrator          |
                    | - Deterministic Trust Rules (Fallback)   |
                    +------------------------------------------+
```

---

## 2. In-Process Python SDK

### 2.1 Initialization
The master interface is located at `src.trust_engine.api_service.TrustIntelligenceEngine`:

```python
from src.trust_engine.api_service import TrustIntelligenceEngine

# Initialize the engine (loads PyTorch checkpoints and database connections)
engine = TrustIntelligenceEngine()
```

### 2.2 Core Methods

#### 1. Single-Product Learned Multimodal Assessment
Returns calibrated multimodal anomaly risk, confidence interval, epistemic uncertainty, and modality contributions:

```python
result = engine.assess_product_learned_multimodal("amazon_in_B000052YQN")

print(f"Product: {result['product_title']}")
print(f"Calibrated Anomaly Score: {result['calibrated_risk_probability']:.4f}")
print(f"Confidence Interval: {result['confidence_interval']}")
print(f"Active Modalities: {result['active_modality_count']}/5")
```

#### 2. Multi-Product Comparison Engine
Compares 2 or more products across pricing, sentiment, visual integrity, and trust metrics:

```python
comparison = engine.compare_products([
    "amazon_in_B000052YQN",
    "flipkart_FURFGV8GUGUGTGYH"
])

print(f"Best Recommended Choice: {comparison['winner_product_id']}")
print(f"Comparison Matrix: {comparison['comparison_matrix']}")
```

#### 3. Ablation Study & Metric Inspection
Retrieves scientifically verified benchmark metrics across modality dropout ablations:

```python
ablations = engine.get_ablation_summary()
print(f"Full Model PR-AUC: {ablations['full_model']['pr_auc']}")
print(f"Graph-Only PR-AUC: {ablations['graph_only']['pr_auc']}")
```

---

## 3. REST API Contract

The REST API runs on port 8000 by default (`python -m src.api.service`).

### 3.1 Endpoints Summary

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/v1/health` | System health, loaded model fold & database status |
| `GET` | `/api/v1/products/{product_id}/learned-multimodal` | Full multimodal inference with calibration & uncertainty |
| `POST` | `/api/v1/products/compare` | Multi-product trust & feature comparison |
| `GET` | `/api/v1/ablations` | Scientific ablation performance metrics |

### 3.2 Response Schema: `MultimodalPredictionOutput`

`GET /api/v1/products/{product_id}/learned-multimodal`

```json
{
  "product_id": "amazon_in_B000052YQN",
  "product_title": "SanDisk 64GB Ultra microSDXC UHS-I Memory Card",
  "marketplace": "amazon_in",
  "calibrated_risk_probability": 0.3842,
  "uncalibrated_score": 0.4120,
  "predicted_risk_level": "LOW",
  "confidence_interval": [0.3142, 0.4542],
  "epistemic_uncertainty": 0.0700,
  "modality_availability": {
    "pricing": true,
    "review_nlp": true,
    "vision_cv": true,
    "clip_alignment": false,
    "graph": true
  },
  "active_modality_count": 4,
  "modality_contributions": {
    "pricing": 0.1240,
    "review_nlp": 0.0815,
    "vision_cv": 0.0450,
    "clip_alignment": 0.0000,
    "graph": 0.1337
  },
  "evidence_summary": {
    "pricing_mad_z": 1.15,
    "discount_percentage": 25.0,
    "review_sentiment": 0.78,
    "duplicate_images_found": false,
    "brand_network_size": 42
  },
  "deterministic_fallback_used": false
}
```

### 3.3 Field Definitions

- `calibrated_risk_probability` *(float, [0.0, 1.0])*: Monotonically calibrated probability that the listing triggers $\ge 2$ multi-domain anomalies.
- `uncalibrated_score` *(float, [0.0, 1.0])*: Raw output logit sigmoid from the gated neural fusion network.
- `predicted_risk_level` *(string: `"LOW"` \| `"MEDIUM"` \| `"HIGH"`)*: Discrete operational tier based on calibrated score thresholds:
  - `LOW`: $< 0.40$
  - `MEDIUM`: $0.40 \le \text{score} < 0.70$
  - `HIGH`: $\ge 0.70$
- `confidence_interval` *(list of 2 floats)*: Dynamic epistemic error interval $[P - w, P + w]$ expanding as observed modalities decrease.
- `epistemic_uncertainty` *(float)*: Half-width $w$ representing epistemic doubt.
- `modality_availability` *(object)*: Boolean flags indicating which of the 5 modalities were observed for this product.
- `modality_contributions` *(object)*: Gated attribution scores per modality stream, adhering to the Zero-Penalty Invariant.

---

## 4. UI Display & Presentation Policy

To maintain ethical and scientific integrity in the user-facing application:

### 4.1 Strict Terminology Guidelines
> [!IMPORTANT]
> The target predicted by this model is a **deterministic rule proxy** (`active_anomalies >= 2`), **NOT** externally verified legal fraud.

| Recommended Terminology | Strictly Prohibited Terminology |
|:---|:---|
| **"Multimodal Anomaly Score"** | "Fraud Score" |
| **"Trust & Anomaly Indicator"** | "Counterfeit Detector" |
| **"Elevated Listing Inconsistency"** | "Confirmed Fake / Scam" |
| **"Cross-Modal Discordance"** | "Illegal Listing" |

### 4.2 Presentation Invariants
1. **Always Display Confidence Interval:** Never present `calibrated_risk_probability` as a single point estimate without showing the confidence interval or epistemic uncertainty badge.
2. **Always Show Evidence Grounding:** The UI must display the supporting domain signals from `evidence_summary` so users understand *why* a listing received an elevated anomaly rating.
3. **Respect Missing Data:** When modalities are missing (e.g., no reviews yet), explicitly indicate "No reviews available (neutral)", and never visualize missing modalities as red or suspicious flags.
