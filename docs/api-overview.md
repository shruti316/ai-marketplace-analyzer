# API Specification & Service Integration Overview

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Target Ecosystems:** Amazon India, Flipkart, Myntra  
**Component:** Python REST Inference Dispatcher (`TrustIntelligenceDispatcher`)  
**Service Implementation:** `src/api/service.py`  

---

## 1. Architectural Scope & Implementation Boundary

> [!IMPORTANT]
> This document specifies the **currently implemented and active Python ML REST service**.
> The planned Phase 3 Node.js backend API gateway and Express routing layer are **PLANNED** for the next development milestone and are not yet implemented.

```
[Phase 3 Node.js API Gateway] (PLANNED)
              │
              ▼ JSON over HTTP
[Python REST Inference Dispatcher] (ACTIVE & IMPLEMENTED)
              │
              ▼ In-Process Method Calls
[TrustIntelligenceEngine Master Service] (ACTIVE & IMPLEMENTED)
```

---

## 2. Implemented HTTP Endpoints

The service operates on default port `8000` (`http://127.0.0.1:8000`).

### 2.1 Health Check & Catalog Discovery
Returns catalog readiness status, entity counts, and available modalities.

- **Method:** `GET`
- **Route:** `/health` or `/api/v1/health`
- **Response `200 OK`:**
  ```json
  {
    "status": "HEALTHY",
    "version": "1.7.0",
    "dataset_version": "v1.7",
    "architecture": "Multimodal Trust Intelligence Platform",
    "entities": {
      "canonical_products": 3643,
      "marketplace_listings": 5684,
      "sellers": 1215
    },
    "modalities_ready": ["reviews", "images", "prices", "sellers", "graph"],
    "timestamp": 1794419800.124
  }
  ```

---

### 2.2 Gated Multimodal Inference
Executes calibrated multimodal inference with uncertainty intervals, supporting version toggling between baseline and candidate.

- **Method:** `GET`
- **Route:** `/api/v1/products/{canonical_product_id}/learned-multimodal`
- **Query Parameters:**
  - `version` (optional, string): Model version to execute. Choose `"v1.0"` (default frozen baseline) or `"v1.1"` (hardened challenger).
- **Example Request:**
  ```bash
  curl "http://127.0.0.1:8000/api/v1/products/amazon_in_B000052YQN/learned-multimodal?version=v1.0"
  ```
- **Response `200 OK`:**
  ```json
  {
    "canonical_product_id": "amazon_in_B000052YQN",
    "continuous_anomaly_score": 0.0,
    "calibrated_risk_probability": 0.0,
    "confidence_interval": [0.0, 0.07],
    "predicted_risk_tier": "LOW_OBSERVED_ANOMALY",
    "modality_availability": {
      "pricing": true,
      "review": false,
      "image": true,
      "clip": true,
      "graph": true
    },
    "active_modalities_count": 4,
    "modality_contributions": {
      "pricing": 0.0502,
      "review": 0.0,
      "vision": 0.0,
      "clip": 0.0,
      "graph": 0.35
    },
    "multi_task_risk_heads": {
      "review_manipulation_risk": 0.0,
      "visual_duplicate_risk": 0.0,
      "price_corridor_risk": 0.0502,
      "cross_modal_discordance_risk": 0.0
    },
    "zero_penalty_invariant_applied": true,
    "model_version": "2.0.0",
    "assessment_timestamp": 1794419487.494
  }
  ```

---

### 2.3 Atomic Evidence Retrieval
Retrieves deduplicated atomic evidence records with complete provenance metadata.

- **Method:** `GET`
- **Route:** `/api/v1/products/{canonical_product_id}/evidence`
- **Response `200 OK`:**
  ```json
  {
    "canonical_product_id": "amazon_in_B000052YQN",
    "evidence_count": 5,
    "evidence": [
      {
        "evidence_id": "ev_price_amazon_in_B000052YQN",
        "modality": "PRICING",
        "evidence_nature": "OBSERVATION",
        "confidence_score": 0.95,
        "summary": "Product listed at Rs. 26990.0 (-10.0% vs MRP).",
        "is_anomalous": false,
        "correlation_group_id": null,
        "provenance": "CERTIFIED_DATASET_V1_7"
      }
    ]
  }
  ```

---

### 2.4 Explainable Trust Investigation Report
Generates human-readable Markdown or JSON investigation reports.

- **Method:** `GET`
- **Route:** `/api/v1/products/{canonical_product_id}/report`
- **Query Parameters:**
  - `format` (optional, string): `"json"` (default) or `"markdown"`.
- **Example Request:**
  ```bash
  curl "http://127.0.0.1:8000/api/v1/products/amazon_in_B000052YQN/report?format=markdown"
  ```

---

### 2.5 Entity Subgraph Topology
Extracts egocentric bipartite seller-product graph neighborhood.

- **Method:** `GET`
- **Route:** `/api/v1/products/{canonical_product_id}/subgraph`
- **Query Parameters:**
  - `depth` (optional, integer): Graph traversal radius (default: `1`).

---

## 3. Error Handling Contract

The dispatcher enforces strict JSON error responses without unhandled server exceptions:

| HTTP Status Code | Condition | Response Payload Example |
|------------------|-----------|--------------------------|
| `404 Not Found` | Canonical product ID not present in catalog | `{"error": true, "status_code": 404, "message": "Product 'INVALID_ID' not found in catalog."}` |
| `404 Not Found` | Route or path does not match router patterns | `{"error": true, "status_code": 404, "message": "Path '/api/v1/invalid' not found."}` |
| `400 Bad Request` | Unsupported query format | `{"error": true, "status_code": 400, "message": "Unsupported format 'xml'."}` |

---

## 4. Planned Phase 3 Backend Integration

During **Phase 3 Backend Development**, an Express.js API gateway will be constructed around this service:
- `POST /api/v1/ingest/crawl`: Triggers ingestion pipeline and stores raw offers in MySQL.
- `GET /api/v1/trust/overview`: Aggregates portfolio trust analytics across marketplaces.
- `POST /api/v1/annotations/submit`: Submits double-blind human labels for `GroundTruthIngestionPipeline`.
- The Node.js service will communicate with this Python REST service via high-speed loopback HTTP.
