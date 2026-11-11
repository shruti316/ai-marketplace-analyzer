# Phase 2 — Stage 0: Existing Backend Technical Audit
## Deliverable 3: Complete API Contract Proposal

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Specification:** OpenAPI / RESTful Contract Specification v2.0  
**Date:** November 11, 2026  
**Auditor / Architect:** Antigravity AI Engineering Team  

---

## 1. Global API Conventions

- **Base URL:** `http://localhost:5000/api/v1` (Application Backend)
- **Direct AI Daemon Base URL:** `http://127.0.0.1:8080/api/v1` (Internal Inference Engine)
- **Content-Type:** `application/json` (except multipart file uploads)
- **Standard Response Envelope:**
  ```json
  {
    "success": true,
    "status_code": 200,
    "data": {},
    "error": null,
    "timestamp": 1731315000.123,
    "request_id": "req_01HJ...X"
  }
  ```
- **Standard Error Envelope:**
  ```json
  {
    "success": false,
    "status_code": 400,
    "data": null,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Invalid request parameters.",
      "details": [
        { "field": "email", "issue": "Must be a valid email address." }
      ]
    },
    "timestamp": 1731315000.123,
    "request_id": "req_01HJ...X"
  }
  ```

---

## 2. Endpoint Master Inventory (Existing vs. Proposed New)

| Category | Method | Endpoint URL | Auth Required | Host Service | Status |
| :--- | :--- | :--- | :---: | :--- | :---: |
| **System** | `GET` | `/health` | No | Python AI & Node.js | **EXISTING (AI) / NEW (Node)** |
| **System** | `GET` | `/ready` | No | Node.js | **NEW** |
| **Auth** | `POST` | `/auth/register` | No | Node.js | **NEW** |
| **Auth** | `POST` | `/auth/login` | No | Node.js | **NEW** |
| **Auth** | `POST` | `/auth/refresh` | No (Cookie) | Node.js | **NEW** |
| **Auth** | `POST` | `/auth/logout` | Yes | Node.js | **NEW** |
| **Auth** | `GET` | `/auth/me` | Yes | Node.js | **NEW** |
| **User** | `GET` | `/user/profile` | Yes | Node.js | **NEW** |
| **User** | `PUT` | `/user/profile` | Yes | Node.js | **NEW** |
| **User** | `GET` | `/user/preferences` | Yes | Node.js | **NEW** |
| **User** | `PUT` | `/user/preferences` | Yes | Node.js | **NEW** |
| **Catalog** | `GET` | `/products` | No | Node.js (Proxy/Cache) | **NEW** |
| **Catalog** | `GET` | `/products/:id` | No | Node.js (Proxy) | **NEW** |
| **Catalog** | `POST` | `/products/ingest` | Yes | Node.js -> AI | **NEW** |
| **Trust Intelligence** | `GET` | `/products/:id/trust-assessment` | No | Node.js -> Python AI | **EXISTING (AI) / NEW (Node Gateway)** |
| **Trust Intelligence** | `GET` | `/products/:id/evidence` | No | Node.js -> Python AI | **EXISTING (AI) / NEW (Node Gateway)** |
| **Trust Intelligence** | `GET` | `/products/:id/report` | No | Node.js -> Python AI | **EXISTING (AI) / NEW (Node Gateway)** |
| **Trust Intelligence** | `GET` | `/listings/:id/trust-assessment` | No | Node.js -> Python AI | **EXISTING (AI) / NEW (Node Gateway)** |
| **Trust Intelligence** | `GET` | `/sellers/:id/trust-assessment` | No | Node.js -> Python AI | **EXISTING (AI) / NEW (Node Gateway)** |
| **Trust Intelligence** | `GET` | `/graph/:entityId/subgraph` | No | Node.js -> Python AI | **EXISTING (AI) / NEW (Node Gateway)** |
| **Trust Intelligence** | `POST` | `/compare` | No | Node.js -> Python AI | **EXISTING (AI) / NEW (Node Gateway)** |
| **Trust Intelligence** | `POST` | `/infer` | No | Node.js -> Python AI | **EXISTING (AI) / NEW (Node Gateway)** |
| **Trust Intelligence** | `GET` | `/recommendations/:id` | No | Node.js -> Python AI | **NEW (Gateway Route)** |
| **History** | `GET` | `/history` | Yes | Node.js (MySQL) | **NEW** |
| **History** | `POST` | `/history` | Yes | Node.js (MySQL) | **NEW** |
| **History** | `DELETE`| `/history/:id` | Yes | Node.js (MySQL) | **NEW** |
| **Watchlist** | `GET` | `/saved-products` | Yes | Node.js (MySQL) | **NEW** |
| **Watchlist** | `POST` | `/saved-products` | Yes | Node.js (MySQL) | **NEW** |
| **Watchlist** | `DELETE`| `/saved-products/:id` | Yes | Node.js (MySQL) | **NEW** |
| **MarketMate** | `POST` | `/assistant/chat` | Yes | Node.js (LLM + Context) | **NEW** |
| **MarketMate** | `GET` | `/assistant/sessions` | Yes | Node.js (MySQL) | **NEW** |
| **MarketMate** | `GET` | `/assistant/sessions/:id` | Yes | Node.js (MySQL) | **NEW** |
| **MarketMate** | `DELETE`| `/assistant/sessions/:id` | Yes | Node.js (MySQL) | **NEW** |

---

## 3. Detailed Endpoint Contracts

### 3.1 Authentication & User Management

#### `POST /auth/register`
- **Description:** Registers a new user account.
- **Auth:** Public.
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "name": "Jane Doe"
  }
  ```
- **Validation:** `email` must be RFC 5322 compliant; `password` must be $\ge 8$ chars with uppercase, lowercase, digit, and symbol; `name` 2–100 chars.
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "status_code": 201,
    "data": {
      "user": {
        "id": "usr_94a7e8b2",
        "email": "user@example.com",
        "name": "Jane Doe",
        "role": "USER",
        "created_at": "2026-11-11T08:50:00Z"
      },
      "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
      "expires_in": 900
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Validation failure.
  - `409 Conflict`: Email already registered.

#### `POST /auth/login`
- **Description:** Authenticates user credentials, sets HTTP-only refresh cookie, returns JWT.
- **Auth:** Public.
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Success Response (200 OK):**
  - Sets Cookie: `refreshToken=<token>; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`
  - Body: Returns user object and 15-minute access token.
- **Error Responses:**
  - `401 Unauthorized`: Invalid email or password.
  - `429 Too Many Requests`: Rate limit exceeded (5 attempts per 15 minutes).

---

### 3.2 Product Catalog & Search

#### `GET /products`
- **Description:** Retrieves paginated canonical products with optional search query and filters.
- **Auth:** Public.
- **Query Parameters:**
  - `q` (string, optional): Full-text keyword search across title and brand.
  - `marketplace` (string, optional): `amazon_in`, `flipkart`, `myntra`.
  - `category` (string, optional): E.g. `Electronics`, `Beauty_and_Personal_Care`.
  - `subcategory` (string, optional): E.g. `Headphones`, `Smartwatches`.
  - `risk_tier` (string, optional): `LOW_OBSERVED_ANOMALY`, `MODERATE_SINGLE_MODALITY_ANOMALY`, `ELEVATED_MULTIMODAL_ANOMALY`, `UNASSESSED_SPARSE_DATA`.
  - `min_price` / `max_price` (float, optional).
  - `page` (int, default: 1).
  - `limit` (int, default: 20, max: 100).
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "status_code": 200,
    "data": {
      "total_items": 3643,
      "page": 1,
      "limit": 20,
      "total_pages": 183,
      "items": [
        {
          "canonical_product_id": "amazon_in_B000052YQN",
          "product_title": "Audio-Technica ATH-M50x Professional Monitor Headphones",
          "marketplace": "amazon_in",
          "brand": "Audio-Technica",
          "category": "Electronics",
          "subcategory": "Headphones",
          "observed_price_inr": 11499.0,
          "mrp_inr": 15499.0,
          "overall_risk_tier": "LOW_OBSERVED_ANOMALY",
          "active_anomaly_modality_count": 0,
          "image_url": "https://m.media-amazon.com/images/I/..."
        }
      ]
    }
  }
  ```

---

### 3.3 AI Trust Intelligence Endpoints

#### `GET /products/:id/trust-assessment`
- **Description:** Generates comprehensive explainable multimodal trust assessment for a canonical product.
- **Auth:** Public.
- **Path Parameter:** `id` (e.g. `amazon_in_B000052YQN`).
- **Backend Flow:** Node.js proxies request to Python AI daemon `GET http://127.0.0.1:8080/api/v1/products/{id}/trust-assessment`.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "status_code": 200,
    "data": {
      "canonical_product_id": "amazon_in_B000052YQN",
      "marketplace": "amazon_in",
      "brand": "Audio-Technica",
      "category": "Electronics",
      "subcategory": "Headphones",
      "overall_risk_tier": "LOW_OBSERVED_ANOMALY",
      "available_core_modalities_count": 3,
      "active_anomaly_modality_count": 0,
      "modality_breakdown": {
        "PRICING": {
          "modality": "PRICING",
          "status": "AVAILABLE",
          "has_anomaly": false,
          "anomaly_type": null,
          "summary_text": "Price INR 11,499.0 within robust corridor (robust z-score: -0.14).",
          "evidence_count": 1,
          "corroborating_evidence_ids": ["ev_pr_amazon_in_B000052YQN"],
          "limitations": "Cross-sectional point-in-time observation."
        },
        "REVIEW_NLP": {
          "modality": "REVIEW_NLP",
          "status": "AVAILABLE",
          "has_anomaly": false,
          "anomaly_type": null,
          "summary_text": "Customer reviews show organic sentiment distribution (4 items evaluated).",
          "evidence_count": 4,
          "corroborating_evidence_ids": [],
          "limitations": "Rule-based ABSA and MD5 hashing."
        },
        "IMAGE_CV": {
          "modality": "IMAGE_CV",
          "status": "AVAILABLE",
          "has_anomaly": false,
          "anomaly_type": null,
          "summary_text": "Hero image verified with unique visual fingerprint.",
          "evidence_count": 1,
          "corroborating_evidence_ids": [],
          "limitations": "dHash distance and SHA-256 exact match."
        }
      },
      "positive_evidence": [
        "Price INR 11,499.0 within robust corridor (robust z-score: -0.14).",
        "Hero image verified with unique visual fingerprint."
      ],
      "negative_evidence": [],
      "missing_modalities": ["PACKAGING_OCR"],
      "assessment_limitations": [
        "Point-in-time cross-sectional price observation.",
        "Individual 3rd-party retail merchant identities omitted upstream.",
        "Physical OCR execution blocked in offline sandbox."
      ],
      "recommendation_summary": "High consistency observed across all available modalities with zero detected anomalies. Verified catalog alignment.",
      "assessment_framework": "EXPLAINABLE_MULTIMODAL_TRUST_ENGINE_V1_7"
    }
  }
  ```
- **Error Responses:**
  - `404 Not Found`: Product ID not found in catalog.
  - `503 Service Unavailable`: Python AI inference daemon is offline.

#### `POST /compare`
- **Description:** Side-by-side evidence matrix and density/risk ranking for 2 or more products.
- **Auth:** Public.
- **Request Body:**
  ```json
  {
    "canonical_product_ids": [
      "amazon_in_B000052YQN",
      "amazon_in_B000CSH3YG"
    ]
  }
  ```
- **Validation:** `canonical_product_ids` must be an array of length $\ge 2$ and $\le 5$.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "status_code": 200,
    "data": {
      "compared_product_ids": ["amazon_in_B000052YQN", "amazon_in_B000CSH3YG"],
      "comparison_matrix": { ... },
      "evidence_density_ranking": ["amazon_in_B000052YQN", "amazon_in_B000CSH3YG"],
      "risk_ranking": ["amazon_in_B000052YQN", "amazon_in_B000CSH3YG"],
      "recommended_product_id": "amazon_in_B000052YQN",
      "recommendation_rationale": "Product amazon_in_B000052YQN has the highest verified evidence density with zero detected anomalies.",
      "tradeoffs": [
        "amazon_in_B000CSH3YG has lower price but lacks customer review evidence."
      ]
    }
  }
  ```

---

### 3.4 MarketMate Conversational Assistant

#### `POST /assistant/chat`
- **Description:** Sends user query to MarketMate assistant. Injects verified product evidence into LLM prompt.
- **Auth:** Bearer JWT required.
- **Request Body:**
  ```json
  {
    "session_id": "ses_01HJ89K...",
    "canonical_product_id": "amazon_in_B000052YQN",
    "message": "Why is this product rated as Low Risk? Are the reviews trustworthy?"
  }
  ```
- **Backend Flow:**
  1. Retrieve `canonical_product_id` trust assessment and atomic evidence items from Python AI daemon.
  2. Assemble grounded system prompt:
     - Strict rule: Answer ONLY using provided atomic evidence.
     - Never claim guaranteed authentic or fraudulent; cite observed signals.
  3. Dispatch to LLM service.
  4. Persist user message and assistant reply to MySQL `assistant_messages`.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "status_code": 200,
    "data": {
      "message_id": "msg_01HJ89M...",
      "session_id": "ses_01HJ89K...",
      "reply": "Based on our multimodal evidence analysis for this Audio-Technica listing:\n\n1. **Review Authenticity**: 4 customer reviews were analyzed. We found zero duplicate review clusters and no rating-sentiment discordances (meaning reviews praise the item while giving high ratings organically).\n2. **Pricing Integrity**: The observed price of ₹11,499.00 sits squarely within the expected price corridor for Electronics/Headphones (robust z-score of -0.14).\n3. **Image Verification**: The hero image has a unique perceptual hash with no unauthorized cross-brand reuse detected.\n\nNote: Packaging OCR text is unavailable for this listing, which incurs zero penalty under our Zero-Penalty Invariant.",
      "grounded_evidence_ids": [
        "ev_pr_amazon_in_B000052YQN",
        "ev_rev_amazon_in_B000052YQN_0",
        "ev_img_amazon_in_B000052YQN_0"
      ],
      "risk_tier_badge": "LOW_OBSERVED_ANOMALY"
    }
  }
  ```

---

### 3.5 User History & Saved Products

#### `GET /history`
- **Description:** Returns paginated product analysis history for authenticated user.
- **Auth:** Bearer JWT required.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "status_code": 200,
    "data": {
      "items": [
        {
          "history_id": "hist_101",
          "canonical_product_id": "amazon_in_B000052YQN",
          "product_title": "Audio-Technica ATH-M50x Headphones",
          "marketplace": "amazon_in",
          "risk_tier": "LOW_OBSERVED_ANOMALY",
          "active_anomalies": 0,
          "analyzed_at": "2026-11-11T08:30:00Z"
        }
      ],
      "total_count": 1
    }
  }
  ```

#### `POST /saved-products`
- **Description:** Saves a product to the user's watchlist.
- **Auth:** Bearer JWT required.
- **Request Body:**
  ```json
  {
    "canonical_product_id": "amazon_in_B000052YQN",
    "notes": "Checking discount before Black Friday"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "status_code": 201,
    "data": {
      "saved_id": "sav_501",
      "canonical_product_id": "amazon_in_B000052YQN",
      "saved_at": "2026-11-11T08:55:00Z"
    }
  }
  ```
