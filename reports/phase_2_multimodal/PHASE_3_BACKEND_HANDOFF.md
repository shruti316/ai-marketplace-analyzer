# Phase 3 Application Backend Handoff Specification

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Document:** Backend Engineering Integration Handoff  
**Phase:** Phase 2 $\rightarrow$ Phase 3 Transition  
**Status:** Certified Engineering Specification  
**Date:** November 11, 2026  

---

## 1. Executive Summary

This document provides complete architectural handoff instructions for the Backend Engineering Team transitioning from the Model Development Phase (Phase 2) to the Application Backend and API Development Phase (Phase 3).

The multimodal AI model layer is completely frozen, calibrated, and certified. Backend engineers can integrate model predictions into REST APIs, background task workers, and persistent databases without retraining or modifying model weights.

---

## 2. Integration Pathways

### 2.1 Direct In-Process Python SDK (Recommended for FastAPI / Python Backends)

```python
from src.trust_engine.api_service import TrustIntelligenceEngine

# Initialize the master engine facade (singleton recommended)
engine = TrustIntelligenceEngine()

# Retrieve calibrated multimodal assessment for any canonical product
assessment = engine.assess_product_learned_multimodal("amazon_in_B000052YQN")

# Returns dict matching MultimodalPredictionOutput:
# {
#   "canonical_product_id": "amazon_in_B000052YQN",
#   "continuous_anomaly_score": 0.0842,
#   "calibrated_risk_probability": 0.0842,
#   "confidence_interval": [0.0342, 0.1342],
#   "predicted_risk_tier": "LOW_OBSERVED_ANOMALY",
#   "modality_availability": {...},
#   "active_modalities_count": 5,
#   "modality_contributions": {...},
#   "multi_task_risk_heads": {...},
#   "zero_penalty_invariant_applied": true,
#   "model_version": "2.0.0"
# }
```

### 2.2 Built-in REST Dispatcher (For Microservices / Node.js Backends)

The existing REST server dispatcher (`src/api/service.py`) provides ready-to-mount handlers:
- `GET /api/v1/products/{product_id}/learned-multimodal`
- `GET /api/v1/ablations`

In Node.js / Express:
```javascript
// Express reverse-proxy or direct HTTP client to Python inference service:
const response = await fetch(`http://inference-service:8000/api/v1/products/${productId}/learned-multimodal`);
const assessment = await response.json();
```

---

## 3. Database Persistence & Schema Recommendations

For PostgreSQL / SQLite backend persistence:

```sql
CREATE TABLE product_multimodal_assessments (
    id SERIAL PRIMARY KEY,
    canonical_product_id VARCHAR(64) NOT NULL UNIQUE,
    continuous_anomaly_score FLOAT NOT NULL,
    calibrated_risk_probability FLOAT NOT NULL,
    confidence_interval_lower FLOAT NOT NULL,
    confidence_interval_upper FLOAT NOT NULL,
    predicted_risk_tier VARCHAR(32) NOT NULL,
    active_modalities_count INT NOT NULL,
    modality_availability JSONB NOT NULL,
    modality_contributions JSONB NOT NULL,
    multi_task_risk_heads JSONB NOT NULL,
    zero_penalty_invariant_applied BOOLEAN NOT NULL DEFAULT TRUE,
    model_version VARCHAR(16) NOT NULL DEFAULT '2.0.0',
    assessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_multimodal_risk_tier ON product_multimodal_assessments(predicted_risk_tier);
CREATE INDEX idx_multimodal_calibrated_prob ON product_multimodal_assessments(calibrated_risk_probability);
```

---

## 4. Production Caching & Performance Guidelines

1. **Redis Caching:**
   - Key pattern: `cache:product:multimodal:{canonical_product_id}`.
   - Recommended TTL: 3600 seconds (1 hour) for active listings; 86400 seconds (24 hours) for static catalog archives.
2. **Batch Asynchronous Workers:**
   - Celery / BullMQ queue: `multimodal_batch_scoring`.
   - The Python pipeline processes batch inference at $> 120$ products/second on CPU via vectorized matrices.
3. **Frontend UI Display Rules:**
   - **Never display raw continuous anomaly score as a confirmed fraud verdict.**
   - Display `calibrated_risk_probability` as a percentage alongside the `confidence_interval`:
     *"Estimated Risk: 8.4% (95% CI: 3.4% - 13.4%)"*.
   - When `active_modalities_count < 2`, show the badge: *"Preliminary Assessment — Limited Evidence"*.
