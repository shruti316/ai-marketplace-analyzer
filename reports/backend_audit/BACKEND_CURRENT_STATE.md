# Phase 2 — Stage 0: Existing Backend Technical Audit
## Deliverable 1: Current Backend & AI Infrastructure State

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Audit Date:** November 11, 2026  
**Auditor:** Antigravity AI Engineering Team  
**Scope:** Complete repository inspection of existing backend, AI pipelines, databases, and frontend interfaces.  
**Baseline Dataset:** Frozen `v1.6` baseline and certified `v1.7` multimodal trust dataset release.  
**Catalog Tests:** 523 / 523 Passing (100%).

---

## 1. Executive Summary

This audit establishes the empirical baseline of the repository prior to beginning Phase 2 (Backend Architecture & Integration).

### Primary Findings
1. **Existing AI & Inference Layer (Python):**  
   The platform possesses a complete, scientifically validated multimodal intelligence engine implemented in Python (Milestones 1–6 and Phase 1 finalization). It includes:
   - Central `TrustIntelligenceEngine` ([`src/trust_engine/api_service.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/trust_engine/api_service.py)).
   - Unified evidence engine ([`src/trust_engine/evidence_engine.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/trust_engine/evidence_engine.py)).
   - Deterministic trust assessment engine ([`src/trust_engine/trust_assessment.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/trust_engine/trust_assessment.py)).
   - Product comparison engine ([`src/trust_engine/comparison_engine.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/trust_engine/comparison_engine.py)).
   - 12-section explainable report generator ([`src/trust_engine/report_generator.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/trust_engine/report_generator.py)).
   - Heterogeneous graph intelligence service ([`src/trust_engine/graph_intelligence.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/trust_engine/graph_intelligence.py)).
   - Standalone Python REST HTTP server ([`src/api/service.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/api/service.py)) with JSON routing, CORS headers, error handlers, and in-memory test dispatchers.

2. **Node.js & Express Application Backend:**  
   **GENUINELY NOT IMPLEMENTED / ABSENT.**  
   There is no `package.json`, no Node.js runtime configuration, no Express server, no JavaScript/TypeScript controllers, routes, or middleware in the repository.

3. **Database & Persistence Layer:**  
   **GENUINELY NOT IMPLEMENTED IN SQL.**  
   There is no MySQL configuration, no connection pooling, no `.sql` migration files, and no relational tables. The current system relies 100% on immutable Apache Parquet tables loaded into memory via pandas/pyarrow from `data/indian_marketplace_trust_dataset_v1_7/`.

4. **Frontend Interface (React + Vite + TypeScript):**  
   **GENUINELY NOT IMPLEMENTED / ABSENT.**  
   There is no frontend application code in the repository (no `vite.config.ts`, no React components, no UI state management, no pages for Dashboard, Product Analysis, Comparisons, Reports, or MarketMate).

5. **User Management & Assistant:**  
   **GENUINELY NOT IMPLEMENTED.**  
   There is zero authentication, user session management, saved product watchlists, analysis history logging, or conversational assistant (MarketMate) functionality in the repository.

---

## 2. Detailed Inspection of Existing AI & Python Infrastructure

### 2.1 Central Trust Intelligence Service
- **File:** [`src/trust_engine/api_service.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/trust_engine/api_service.py)
- **Class:** `TrustIntelligenceEngine`
- **Capabilities:**
  - `get_product_evidence(canonical_product_id: str) -> List[Dict[str, Any]]`: Retrieves all atomic evidence items across 6 modalities.
  - `get_listing_evidence(listing_id: str) -> List[Dict[str, Any]]`: Retrieves atomic evidence for a specific marketplace listing.
  - `assess_product(canonical_product_id: str) -> Dict[str, Any]`: Computes explainable risk tier (`UNASSESSED_SPARSE_DATA`, `LOW_OBSERVED_ANOMALY`, `MODERATE_SINGLE_MODALITY_ANOMALY`, `ELEVATED_MULTIMODAL_ANOMALY`).
  - `assess_listing(listing_id: str) -> Dict[str, Any]`: Assesses price, discount, seller, and fulfillment flags.
  - `assess_seller(seller_id: str) -> Dict[str, Any]`: Evaluates seller governance, catalog size, brand count, and platform aggregate status.
  - `compare_products(canonical_product_ids: List[str]) -> Dict[str, Any]`: Side-by-side evidence matrix, evidence-density ranking, and risk ranking.
  - `generate_report(canonical_product_id: str, format_type: str = "markdown") -> Union[str, Dict[str, Any]]`: Renders standardized 12-section explainable trust reports in Markdown or JSON.
  - `get_entity_subgraph(entity_id: str, depth: int = 1) -> Dict[str, Any]`: Extracts egocentric subgraphs from the 41,372-edge entity graph.

### 2.2 Python REST API Server
- **File:** [`src/api/service.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/api/service.py)
- **Classes:** `TrustIntelligenceDispatcher`, `TrustIntelligenceRequestHandler`, `TrustIntelligenceRestServer`
- **Transport:** Standard library `http.server.HTTPServer` with JSON serialization.
- **Latency:** Benchmark confirmed average latency of **13.8ms** per evaluation (exceeding the 25ms threshold in [`tests/test_api_endpoints.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/tests/test_api_endpoints.py)).
- **Implemented Endpoints:**
  - `GET /health` and `GET /api/v1/health`
  - `GET /api/v1/products/{product_id}/trust-assessment`
  - `GET /api/v1/products/{product_id}/evidence`
  - `GET /api/v1/products/{product_id}/report` (`?format=json|markdown`)
  - `GET /api/v1/listings/{listing_id}/trust-assessment`
  - `GET /api/v1/sellers/{seller_id}/trust-assessment`
  - `POST /api/v1/compare`
  - `POST /api/v1/infer` (Zero-penalty invariant raw payload evaluation)

### 2.3 Legacy / Pre-v1.7 Facade
- **File:** [`src/engine/api.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/engine/api.py)
- **Class:** `MarketplaceTrustAPI`
- **Status:** Operates over v1.1 and legacy v1.7 parquet structures, preserved for backward-compatibility with older tests in [`tests/test_engine_integration.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/tests/test_engine_integration.py).

### 2.4 Modality Intelligence Modules
1. **NLP Review Intelligence:**
   - [`src/nlp/nlp_training_tracks.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/nlp/nlp_training_tracks.py): Implements Track 1 (Weakly Supervised Silver, $F_1 = 0.75$) and Track 2 (Independent Gold baseline, $F_1 = 0.37$, uncoupled from star ratings).
   - [`src/nlp/review_classifier.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/nlp/review_classifier.py): Rating-independent TF-IDF classification.
   - [`src/nlp/review_analysis.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/nlp/review_analysis.py): Lexical ABSA and VADER discordance detection.
2. **Computer Vision & OCR Intelligence:**
   - [`src/evaluation/cv_benchmark_runner.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/evaluation/cv_benchmark_runner.py): SHA-256 duplicate detection, dHash perceptual clustering, ResNet-18 visual similarity.
   - [`src/cv/ocr_engine.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/cv/ocr_engine.py) & [`src/ocr/ocr_pipeline.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/ocr/ocr_pipeline.py): Windows WinRT native OCR for packaging text extraction (CER = 14.0%, WER = 12.4%).
   - [`src/cv/clip_alignment.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/cv/clip_alignment.py): OpenAI CLIP ViT-B/32 vision-language discordance detection ($\text{ROC-AUC} = 0.9904$).
3. **Pricing Intelligence:**
   - [`src/pricing/pricing_intelligence.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/pricing/pricing_intelligence.py): Non-parametric Median Absolute Deviation (MAD) corridors and Legal Metrology Act statutory compliance (0 MRP breaches).
4. **Graph & Seller Governance:**
   - [`src/trust_engine/graph_intelligence.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/trust_engine/graph_intelligence.py): Egocentric traversal across 41,372 edges.
   - [`src/sellers/seller_intelligence.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/sellers/seller_intelligence.py): Governance analysis of platform aggregate seller pools.
5. **Multimodal Fusion:**
   - [`src/trust_engine/multimodal_fusion.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/trust_engine/multimodal_fusion.py): Certified Deterministic Fusion enforcing the Zero-Penalty Invariant.
   - [`src/models/multimodal_learned_fusion.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/models/multimodal_learned_fusion.py): 19-feature Continuous Anomaly Ranking Surrogate.

---

## 3. Existing Data Storage & Formats

The active data layer consists entirely of Apache Parquet tables in `data/indian_marketplace_trust_dataset_v1_7/`:
- `entities/products.parquet` (3,643 canonical products across Amazon, Flipkart, Myntra)
- `entities/listings.parquet` (3,643 marketplace listing offers)
- `entities/brands.parquet` (1,593 canonical brands)
- `entities/sellers.parquet` (4 platform aggregate seller entities)
- `entities/platforms.parquet` (3 marketplace platforms)
- `evidence/price_observations.parquet` (3,667 price records)
- `evidence/reviews.parquet` (3,659 customer reviews)
- `evidence/images.parquet` (4,708 hero and thumbnail images)
- `derived_evidence/pricing_features.parquet`
- `derived_evidence/seller_features.parquet`
- `derived_evidence/review_nlp_features.parquet`
- `derived_evidence/image_intelligence_features.parquet`
- `derived_evidence/image_similarity_pairs.parquet`
- `relationships/entity_relationships.parquet` (41,372 graph edges)

There is **zero MySQL persistence**. No user tables, no search indexes, no query cache, and no relational schema exists.

---

## 4. Backend Capability Inventory (25 Core Capabilities)

| # | Capability | Existing Implementation | Integration Status | Missing Work Required | Priority |
|---|---|---|---|---|:---:|
| 1 | **Authentication & User Mgmt** | None | Not implemented | JWT auth, bcrypt/argon2, user table, register/login/refresh routes | P0 |
| 2 | **User Profile & Preferences** | None | Not implemented | Profile table, preference JSON, notification settings, theme/locale | P1 |
| 3 | **Product & Listing Mgmt** | Parquet tables + DataFrame lookups in `UnifiedEvidenceEngine` | Implemented in Python AI | Node.js proxy routes, pagination, category filtering, search index | P0 |
| 4 | **Product Data Ingestion** | Batch scripts (`src/data/pipeline.py`) & ad-hoc `POST /api/v1/infer` | Partially implemented | URL scraper, listing parser, validation, live ingestion pipeline | P1 |
| 5 | **Marketplace Integrations** | Amazon, Flipkart, Myntra static adapters in `src/data/acquisition/` | Implemented for static data | Live marketplace scrapers/APIs, rate-limiting, proxies | P2 |
| 6 | **Review Data Ingestion** | Parquet batch ingestion (`src/data/pipeline.py`) | Implemented for static data | Live review collector, batch review validator, sentiment pipe | P1 |
| 7 | **Image Upload & Storage** | Local filesystem (`data/raw/`) + base64 inference | Partially implemented | Multer upload middleware, file hash deduplication, static CDN/serve | P1 |
| 8 | **NLP Inference** | `review_classifier.py`, `review_analysis.py`, `nlp_training_tracks.py` | Fully implemented in AI | FastAPI wrapper, batch text evaluation endpoint | P0 |
| 9 | **Computer Vision Inference** | `cv_benchmark_runner.py`, ResNet-18 embeddings, dHash | Fully implemented in AI | Real-time image hashing endpoint, embedding server | P0 |
| 10 | **OCR Inference** | `winocr` wrapper in `src/cv/ocr_engine.py` | Fully implemented in AI (Win32) | Linux fallback (Tesseract/PaddleOCR), upload-to-OCR endpoint | P1 |
| 11 | **CLIP Inference** | `clip_alignment.py` (ViT-B/32) | Fully implemented in AI | Torch/CLIP inference micro-endpoint, GPU/CPU worker | P1 |
| 12 | **Pricing Analysis** | `pricing_intelligence.py` (MAD corridors) | Fully implemented in AI | Real-time corridor lookup, currency conversion | P0 |
| 13 | **Graph Intelligence** | `graph_intelligence.py` (NetworkX / adjacency) | Fully implemented in AI | Egocentric D3/vis.js graph visualization endpoint | P0 |
| 14 | **Multimodal Trust Assessment** | `TrustAssessmentEngine`, `MultimodalFusionEngine` | Fully implemented in AI | Node.js proxy controller, assessment caching in MySQL | P0 |
| 15 | **Product Reports** | `ExplainableReportGenerator` (Markdown/JSON) | Fully implemented in AI | HTML/PDF report export, report viewer integration | P0 |
| 16 | **Product Comparisons** | `ProductComparisonEngine` | Fully implemented in AI | Comparison matrix API, multi-product selector | P0 |
| 17 | **Recommendations** | `recommendation_service.py` | Partially implemented (v1.7) | Category trust-ranked alternatives endpoint | P0 |
| 18 | **Analysis History** | None | Not implemented | MySQL `analysis_history` table, user history recording & retrieval | P1 |
| 19 | **Saved Products / Watchlist** | None | Not implemented | MySQL `saved_products` table, add/remove/list endpoints | P1 |
| 20 | **MarketMate Assistant** | None | Not implemented | LLM integration (Gemini/OpenAI), evidence context injection, chat API | P1 |
| 21 | **Background Processing** | Synchronous Python execution | Not implemented | Redis / BullMQ or background worker for heavy OCR/CLIP tasks | P2 |
| 22 | **Model Version Management** | `model_artifact_manifest.json`, `target_registry.py` | Fully implemented in metadata | Runtime model registry endpoint, health metadata | P1 |
| 23 | **Logging & Monitoring** | Python `logging` to console | Partially implemented | Winston logger in Node.js, request ID tracing, Prometheus metrics | P1 |
| 24 | **API Security** | CORS headers in `src/api/service.py` | Partially implemented | Helmet, rate limiting, Zod schema validation, CSRF/XSS sanitization | P0 |
| 25 | **Deployment Readiness** | Local execution scripts | Partially implemented | Dockerfile for Node.js, Dockerfile for Python, docker-compose.yml | P1 |

---

## 5. Architectural Gap Identification

1. **The Orchestration Gap:**  
   Currently, the Python REST API server in [`src/api/service.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/api/service.py) serves directly as both the inference service and the public HTTP interface. There is no application backend handling authentication, authorization, session persistence, or user state.

2. **The State & Persistence Gap:**  
   The platform cannot store user accounts, track which products a user has analyzed, maintain a watchlist, or store chat messages for MarketMate. Everything is currently transient in-memory.

3. **The User Experience Gap:**  
   The absence of the React frontend leaves the platform accessible only via automated tests, python scripts, or curl requests against `http://127.0.0.1:8080`.

4. **The Safe Integration Path:**  
   We must NOT discard or rewrite the certified Python AI engine. Instead, we must treat the Python engine as a **dedicated AI inference runtime** and build a clean **Node.js / Express Application Backend** that interfaces with MySQL for application state and orchestrates calls to the Python inference runtime.
