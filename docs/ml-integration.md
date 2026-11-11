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

print(f"Product: {result['canonical_product_id']}")
print(f"Calibrated Anomaly Score: {result['calibrated_risk_probability']:.4f}")
print(f"Confidence Interval: {result['confidence_interval']}")
print(f"Risk Tier: {result['predicted_risk_tier']}")
print(f"Active Modalities: {result['active_modalities_count']}/5")
print(f"Zero-Penalty Invariant Applied: {result['zero_penalty_invariant_applied']}")
```

#### 2. Multi-Product Comparison Engine
Compares 2 or more products across pricing, sentiment, visual integrity, and trust metrics:

```python
comparison = engine.compare_products([
    "amazon_in_B000052YQN",
    "amazon_in_B0000E3QL7"
])

print(f"Recommended Winner: {comparison['recommended_product_id']}")
print(f"Evidence Density Ranking: {comparison['evidence_density_ranking']}")
print(f"Risk Ranking: {comparison['risk_ranking']}")
print(f"Rationale: {comparison['recommendation_rationale']}")
```

#### 3. Ablation Study & Metric Inspection
Retrieves scientifically verified benchmark metrics across modality dropout ablations:

```python
ablations = engine.get_modality_ablations()
print(f"Full Model PR-AUC: {ablations['Full_Multimodal_Gated_Model']['mean_pr_auc']:.4f}")
print(f"Graph-Only PR-AUC: {ablations['Graph_Only']['mean_pr_auc']:.4f}")
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
  "canonical_product_id": "amazon_in_B000052YQN",
  "continuous_anomaly_score": 0.0824,
  "calibrated_risk_probability": 0.0000,
  "confidence_interval": [0.0000, 0.0700],
  "predicted_risk_tier": "LOW_OBSERVED_ANOMALY",
  "modality_availability": {
    "pricing": true,
    "review": true,
    "image": true,
    "clip": false,
    "graph": true
  },
  "active_modalities_count": 4,
  "modality_contributions": {
    "pricing": 0.0210,
    "review": 0.0150,
    "image": 0.0050,
    "clip": 0.0000,
    "graph": 0.0414
  },
  "multi_task_risk_heads": {
    "review_manipulation_risk": 0.0512,
    "visual_duplicate_risk": 0.0000,
    "price_corridor_risk": 0.0321,
    "cross_modal_discordance_risk": 0.0000
  },
  "zero_penalty_invariant_applied": true,
  "model_version": "2.0.0",
  "assessment_timestamp": 1731307200.0
}
```

### 3.3 Field Definitions

- `canonical_product_id` *(string)*: Unique identifier for the canonical marketplace product.
- `calibrated_risk_probability` *(float, [0.0, 1.0])*: Monotonically calibrated probability that the listing triggers $\ge 2$ multi-domain anomalies.
- `continuous_anomaly_score` *(float, [0.0, 1.0])*: Raw ensemble continuous anomaly ranking.
- `predicted_risk_tier` *(string)*: Operational tier:
  - `LOW_OBSERVED_ANOMALY`
  - `MODERATE_SINGLE_MODALITY_ANOMALY`
  - `ELEVATED_MULTIMODAL_ANOMALY`
  - `UNASSESSED_SPARSE_DATA`
- `confidence_interval` *(list of 2 floats)*: Dynamic epistemic error interval $[P - w, P + w]$ expanding as observed modalities decrease ($w \in [\pm 0.05, \pm 0.15]$).
- `modality_availability` *(object)*: Boolean flags indicating which of the 5 modalities were observed for this product.
- `active_modalities_count` *(int, 0 to 5)*: Total count of active modalities observed.
- `modality_contributions` *(object)*: Gated attribution scores per modality stream, adhering to the Zero-Penalty Invariant.
- `multi_task_risk_heads` *(object)*: Multi-task risk probabilities across review manipulation, visual duplicates, price corridors, and semantic discordance.
- `zero_penalty_invariant_applied` *(bool)*: Confirms missing modalities contributed 0 risk points.

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
