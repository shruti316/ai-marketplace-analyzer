# Phase 2 — Stage 0: Existing Backend Technical Audit
## Deliverable 2: Target Backend Architecture Proposal

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Architecture Version:** 2.0.0-PROPOSAL  
**Date:** November 11, 2026  
**Auditor / Architect:** Antigravity AI Engineering Team  

---

## 1. Architectural Philosophy & Guiding Principles

1. **Preserve Phase 1 Scientific Foundation:**  
   The frozen datasets (`v1.6` baseline, `v1.7` multimodal release) and the certified Python trust intelligence modules must remain strictly intact. No AI logic will be ported or rewritten in JavaScript.
2. **Clear Separation of Concerns:**  
   - **Node.js / Express:** Dedicated **Application Backend** managing user authentication, authorization, user profiles, analysis history, saved products, search index proxies, rate limiting, and conversational orchestration (MarketMate).
   - **Python AI Engine:** Dedicated **Trust Intelligence Runtime** executing multimodal inference, deterministic evidence fusion, Zero-Penalty Invariant calculations, graph traversals, and explainable report rendering.
   - **MySQL 8.0:** Dedicated **Relational Application Database** persisting mutable user state, auth credentials, history, and cached evaluation summaries.
   - **React 18 + Vite:** Dedicated **Presentation Layer** consuming the Node.js API.
3. **No Unnecessary Complexity:**  
   We avoid heavyweight distributed microservices (e.g. Kubernetes, Kafka, gRPC) for this phase. A robust, modular two-service architecture (Node.js API Gateway + Python Inference Daemon) communicating over local HTTP with structured JSON contracts provides high throughput, sub-25ms latency, and maximum maintainability.

---

## 2. Multi-Tier Target Architecture Overview

```mermaid
flowchart TD
    subgraph ClientLayer ["Presentation Layer (Client)"]
        UI["React 18 + Vite + TypeScript Frontend\n(Tailwind CSS, TanStack Query, Zustand)"]
    end

    subgraph AppBackend ["Application Backend (Node.js / Express)"]
        GW["Express API Gateway & Router\n(Port 5000)"]
        AuthMid["JWT & RBAC Middleware"]
        RateLim["Rate Limiting & Helmet Security"]
        
        subgraph AppServices ["Application Services"]
            AuthSvc["Auth & User Service"]
            UserSvc["Profile & Preferences Service"]
            CatalogSvc["Catalog & Search Proxy Service"]
            HistorySvc["Analysis History & Watchlist Service"]
            ChatSvc["MarketMate Assistant Service\n(Context Grounding + LLM Pipe)"]
            AIClient["Python AI HTTP Client\n(Axios / HTTP Pool)"]
        end
    end

    subgraph StorageLayer ["Relational Persistence (MySQL 8.0)"]
        MySQL[("MySQL 8.0 Database\n• users & profiles\n• analysis_history\n• saved_products\n• assistant_sessions & messages\n• assessment_cache")]
    end

    subgraph AIRuntime ["AI Trust Intelligence Runtime (Python)"]
        PyAPI["Python REST / FastAPI Server\n(Port 8080)"]
        
        subgraph TrustCore ["Core Trust Intelligence Engine (Frozen Phase 1)"]
        direction TB
            TIE["TrustIntelligenceEngine\n(src/trust_engine/api_service.py)"]
            UEE["UnifiedEvidenceEngine\n(evidence_engine.py)"]
            TAE["TrustAssessmentEngine\n(trust_assessment.py)"]
            PCE["ProductComparisonEngine\n(comparison_engine.py)"]
            ERG["ExplainableReportGenerator\n(report_generator.py)"]
            GIS["GraphIntelligenceService\n(graph_intelligence.py)"]
            DFE["Deterministic Fusion Engine\n(multimodal_fusion.py)\n[Zero-Penalty Invariant Certified]"]
            MLF["Continuous Anomaly Surrogate\n(multimodal_learned_fusion.py)"]
        end
        
        subgraph DatasetParquet ["Certified Immutable Parquet Tables"]
            PData["data/indian_marketplace_trust_dataset_v1_7/\n• entities (products, listings, brands, sellers)\n• evidence (prices, reviews, images)\n• derived_evidence & relationships"]
        end
    end

    UI <-->|HTTP / REST + JSON| GW
    GW --> AuthMid --> RateLim
    RateLim --> AppServices
    
    AuthSvc <-->|mysql2 connection pool| MySQL
    UserSvc <-->|mysql2 connection pool| MySQL
    HistorySvc <-->|mysql2 connection pool| MySQL
    ChatSvc <-->|mysql2 connection pool| MySQL
    
    CatalogSvc --> AIClient
    HistorySvc --> AIClient
    ChatSvc --> AIClient
    
    AIClient <-->|Internal HTTP JSON (Port 8080)| PyAPI
    PyAPI <--> TIE
    TIE --> UEE
    TIE --> TAE
    TIE --> PCE
    TIE --> ERG
    TIE --> GIS
    TAE --> DFE
    TAE --> MLF
    UEE <--> DatasetParquet
```

---

## 3. Division of Responsibilities

### 3.1 Node.js / Express Application Backend (Port 5000)
- **Primary Role:** User-facing application gateway, authentication boundary, session manager, and persistence coordinator.
- **Key Responsibilities:**
  1. **User Identity & Access Management:**
     - User registration, login, token refresh, and logout.
     - Argon2id / bcrypt password hashing (work factor 12).
     - Stateless JWT issuance (15-minute access token) + HTTP-only secure refresh cookie (7-day duration).
     - Role-Based Access Control (`USER`, `AUDITOR`, `ADMIN`).
  2. **Product Catalog & Search Proxy:**
     - Fast keyword search, multi-facet filtering (marketplace, category, subcategory, price range, brand, risk tier).
     - Pagination over the 3,643 catalog products with caching.
  3. **User State & Activity Tracking:**
     - Recording user product analysis history with timestamps and summary badges.
     - Managing saved product watchlists with custom user notes and alert thresholds.
  4. **MarketMate Conversational Assistant Orchestrator:**
     - Manages multi-turn conversation sessions and message history.
     - Injects atomic evidence items and trust assessment findings into the LLM system prompt.
     - Enforces that MarketMate answers strictly from observed marketplace evidence, never hallucinating product safety or brand legitimacy.
  5. **API Security & Ingress Governance:**
     - Request body validation via Zod schemas.
     - Rate limiting (e.g. 100 req/min per IP; 20 req/min for auth).
     - Helmet security headers (HSTS, CSP, X-Frame-Options).
     - Unified error handling and correlation ID logging.

### 3.2 Python AI Trust Intelligence Runtime (Port 8080)
- **Primary Role:** High-performance, deterministic AI inference and evidence synthesis daemon.
- **Key Responsibilities:**
  1. **Dataset Ingestion & Graph Indexing:**
     - Memory-mapped index of 3,643 canonical products, listings, brands, reviews, and 41,372 relationship edges.
  2. **Deterministic Evidence Fusion:**
     - Evaluates 6 modalities (`REVIEW_NLP`, `IMAGE_CV`, `PRICING`, `SELLER_GOVERNANCE`, `GRAPH_TOPOLOGY`, `OCR`).
     - Strictly enforces the **Zero-Penalty Invariant** (unobserved modalities add 0 penalty points and expand uncertainty bounds).
     - Correlated signal deduplication (prevents double-counting review duplicates and burst patterns).
  3. **Continuous Anomaly Ranking Surrogate:**
     - Evaluates 19 clean, non-circular features via `MultimodalLearnedFusion`.
     - Returns continuous risk scores $[0.0, 1.0]$ for triage ranking.
  4. **Egocentric Graph Traversal:**
     - Extracts local $k$-hop subgraphs around products, brands, and platform sellers.
  5. **Comparative & Recommendation Intelligence:**
     - Side-by-side multi-product evidence comparison matrices.
     - Density-ranked alternative recommendations in identical categories.
  6. **Report Generation:**
     - Renders standardized 12-section explainable markdown and structured JSON trust dossiers.

### 3.3 MySQL 8.0 Relational Database
- **Primary Role:** Structured, transactional persistence for application state.
- **Key Responsibilities:**
  1. Stores users, password hashes, and profile settings.
  2. Stores historical product analysis records for auditing and user history.
  3. Stores user saved product watchlists.
  4. Stores MarketMate conversation threads and message transcripts.
  5. Stores cached assessments (TTL 24h) to minimize redundant inference compute.

### 3.4 Storage & Media Assets
- **Primary Role:** Local static file serving and image asset retrieval.
- **Key Responsibilities:**
  1. Static image assets located in `data/raw/` served via an Express static mount or reverse proxy.
  2. Multer upload handler for ad-hoc user-submitted packaging images (quarantined, sanitized, validated magic bytes).

---

## 4. Communication & Protocol Design

### 4.1 Client-to-Backend Protocol
- **Transport:** HTTP / 1.1 (JSON payload) over TLS in production.
- **Authentication:** Bearer JWT in `Authorization` header (`Bearer <token>`).
- **Data Format:** Standard JSON response envelope:
  ```json
  {
    "success": true,
    "status_code": 200,
    "data": { ... },
    "error": null,
    "timestamp": "2026-11-11T08:45:00.000Z",
    "request_id": "req_abc123"
  }
  ```

### 4.2 Backend-to-AI Runtime Protocol
- **Transport:** Local HTTP keep-alive connection pool (`http://127.0.0.1:8080`).
- **Timeout:** 3,000ms standard timeout; 10,000ms for heavy comparison matrices.
- **Fallback / Circuit Breaker:**
  - If Python AI daemon is unreachable, Node.js returns a graceful `503 Service Unavailable` with message: `"AI Trust Intelligence Engine is currently initializing or unreachable."`
- **Data Exchange:** Strongly-typed JSON contracts matching Phase 1 [`model_input_output_schemas.json`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/reports/phase_1_final/model_input_output_schemas.json).

---

## 5. Non-Negotiable AI Governance & Scientific Guardrails

1. **Zero-Penalty Invariant Preservation:**  
   The application backend must never assign default penalty scores or negative trust values when an API request lacks certain modalities (e.g. no packaging image or no reviews). The response must explicitly flag `UNASSESSED_SPARSE_DATA` or neutral modality status.
2. **Anomaly vs. Fraud Boundary:**  
   The Node.js backend and React frontend must display risk tiers as **Listing Anomaly Risk** (`LOW`, `MODERATE`, `ELEVATED`), never as "Confirmed Fraud" or "Counterfeit Verdict".
3. **Explicit Blocking of Unvalidated Models:**  
   - NLP Track 2 Gold Review Classifier remains labeled as `BLOCKED — HUMAN ANNOTATION REQUIRED`.
   - Supervised Product Fraud Classifier remains labeled as `BLOCKED — EXTERNAL DATA REQUIRED`.
4. **Audit Provenance Retention:**  
   Every trust score returned by the backend must carry the `evidence_id`, `detection_method`, `confidence`, and `evidence_limitations` arrays supplied by the Python `UnifiedEvidenceEngine`.
