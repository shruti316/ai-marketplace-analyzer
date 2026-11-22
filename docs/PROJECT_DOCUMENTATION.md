# TrustSphere — Complete Project & Technical Documentation

> **AI-Powered Indian Marketplace Trust Intelligence Platform**  
> *Target Ecosystems:* Amazon India, Flipkart, Myntra, Decathlon, Croma, Adidas & Independent E-commerce Webstores  
> *Deployment Architecture:* Zero-Dollar Hybrid Multi-Cloud (Vercel + Render + Hugging Face Spaces + TiDB Cloud)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Features](#3-features)
4. [Technology Stack](#4-technology-stack)
5. [System Architecture](#5-system-architecture)
6. [Frontend Architecture](#6-frontend-architecture)
7. [Backend Architecture](#7-backend-architecture)
8. [Python ML/CV Architecture](#8-python-mlcv-architecture)
9. [Trust Scoring Methodology](#9-trust-scoring-methodology)
10. [NLP & Review Analysis](#10-nlp--review-analysis)
11. [Product Extraction & Price Validation](#11-product-extraction--price-validation)
12. [Database Schema Overview](#12-database-schema-overview)
13. [API Overview](#13-api-overview)
14. [Authentication & Security](#14-authentication--security)
15. [Local Installation Instructions](#15-local-installation-instructions)
16. [Environment Variables Reference](#16-environment-variables-reference)
17. [Database Setup & Migration Instructions](#17-database-setup--migration-instructions)
18. [Deployment Architecture](#18-deployment-architecture)
19. [Hugging Face Deployment Instructions](#19-hugging-face-deployment-instructions)
20. [Vercel & Render Deployment Instructions](#20-vercel--render-deployment-instructions)
21. [Testing Instructions](#21-testing-instructions)
22. [Known Limitations](#22-known-limitations)
23. [Future Improvements](#23-future-improvements)

---

## 1. Project Overview

**TrustSphere** is an independent, evidence-driven e-commerce trust intelligence platform specifically engineered to protect Indian consumers from online retail manipulation, counterfeit goods, deceptive discounts, astroturfed reviews, and seller fraud.

Rather than relying on black-box heuristics or single-store ratings, TrustSphere provides a transparent, multimodal evaluation pipeline that combines:
- Aspect-Based Sentiment Analysis (ABSA) with Hinglish code-mixed support.
- Deep Computer Vision (ResNet-18, perceptual dHash, CLIP cross-modal text-image alignment).
- Statistical pricing corridor analysis with robust outlier detection.
- Seller network graph topology and governance tiers.
- A decoupled 5-dimension trust engine governed by the mathematically proven **Non-Masking Invariant**.

The platform is accessible via an interactive web interface featuring a Light Plum / Pastel theme, offering instant product scans, side-by-side product comparisons, automated report generation, and persistent investigation histories.

---

## 2. Problem Statement

Indian e-commerce is characterized by dynamic catalog volatility and sophisticated deceptive practices that deceive traditional e-commerce metrics:
1. **Extreme Promotional Markdowns & Artificial MRPs:** Sellers artificially inflate claimed Maximum Retail Prices (MRP) to advertise deceptive $70\text{--}90\%$ discounts, obscuring true market values.
2. **Review Astroturfing & Bot-Farm Manipulation:** Products accumulate hundreds of identical 5-star reviews containing generic praise or discordant text (e.g. 5-star rating with text stating *"duplicate product delivered"*).
3. **Cross-Seller Image Hijacking & Re-use:** Unverified third-party sellers copy high-resolution hero images from established brands or platform warehouses to list inferior or counterfeit replicas.
4. **Title-Image Bait-and-Switch:** High-end electronic or designer titles paired with photos of budget accessories or non-branded variants.
5. **Brand Masking Bias in Existing Tools:** Traditional trust systems often award high trust scores to counterfeit or broken items simply because they are listed on established domains like Amazon India or Flipkart.
6. **Code-Mixed Dialects (Hinglish):** Millions of Indian reviews use transliterated Hindi (e.g. *"yeh bilkul nakli hai"*, *"quality ekdum bekar"*), which breaks standard English sentiment analyzers like baseline VADER.

TrustSphere addresses these challenges through an open, reproducible, and verifiable multimodal intelligence framework.

---

## 3. Features

- **Decoupled 5-Dimension Trust Scorecard:** Independent evaluation of:
  1. *Product Quality* ($Q$): Star distributions, review consensus, and defect isolation.
  2. *Seller Reliability* ($S$): Governance tier (Brand Direct, Warehouse Direct, 3rd Party), age, and historical dispute rates.
  3. *Listing Authenticity* ($A$): Price corridor anomalies, discount plausibility, and duplicate image checks.
  4. *Website Legitimacy* ($W$): Transport security, corporate registry, and platform credibility.
  5. *Overall Purchase Risk*: Synthesized risk level governed by the Non-Masking Invariant.
- **Non-Masking Invariant Guarantee:** If any evaluated dimension indicates a critical failure (e.g. counterfeit alerts, extreme price fraud, or toxic reviews), the overall trust score is strictly capped at $\le 45$ (`HIGH_OBSERVED_RISK` or `CRITICAL_RISK`). Platform legitimacy is forbidden from masking product or seller defects.
- **Layered Multi-Marketplace Extraction Waterfall:** Robust 4-stage waterfall (`JSON-LD` $\to$ `Embedded State` $\to$ `Semantic DOM` $\to$ `URL Heuristics`) extracting clean titles, SKUs, and prices across Amazon India, Flipkart, Myntra, Decathlon, Croma, Adidas, and generic webstores.
- **Clause-Level Aspect-Based Sentiment Analysis (ABSA):** Evaluates 9 dimensions (*Build Quality, Performance, Battery & Power, Audio & Sound, Display & Visuals, Comfort & Fit, Value for Money, Packaging & Delivery, Authenticity & Legitimacy*). Handles adversatives (*"but"*, *"lekin"*, *"par"*) and Hinglish intensifiers (*"bilkul"*, *"ekdum"*).
- **Price Corridor Anomaly Engine:** Computes robust Median Absolute Deviation (MAD) $z$-scores against category and brand baselines, flagging discrepancies $> 15\%$ as conflicting candidates.
- **Zero-Penalty Invariant for Unassessed Data:** Missing modalities (such as an independent store with zero reviews) are marked `UNASSESSED` and excluded from weight normalization rather than penalized with arbitrary point deductions.
- **Cross-Offering Comparison Studio:** Side-by-side analysis of 2 to 5 offerings across Indian marketplaces, identifying best pricing, superior seller reputation, and feature trade-offs.
- **Persistent Investigation Workspace:** Authenticated user histories with auto-save, risk badges, interactive radar breakdown, and exportable JSON/HTML evidence dossiers.

---

## 4. Technology Stack

### Frontend
- **Framework:** React 18 + Vite 6 + TypeScript (Strict Mode)
- **Styling:** Tailwind CSS (Custom Light Plum / Soft Slate design tokens)
- **Icons & Animation:** Lucide React, Framer Motion
- **HTTP Client:** Axios with JWT auto-refresh and connection health tracking
- **Testing:** Vitest + React Testing Library + jsdom
- **Hosting:** Vercel Edge Network (Single-Page Application rewrite rules)

### Backend API & Orchestration
- **Runtime:** Node.js 20+ / Express 5 + TypeScript
- **Database:** TiDB Cloud Serverless (MySQL 8.0 wire-compatible distributed SQL)
- **Database Driver:** `mysql2/promise` with connection pooling and rollback safety
- **Security:** `helmet`, `cors` (explicit origin whitelist), `express-rate-limit`, `cookie-parser`, `jsonwebtoken`
- **Testing:** Native `tsx` test runners, Vitest, Node test suites
- **Hosting:** Render Free Web Service (Oregon region, containerized build)

### Machine Learning & Vision Microservice
- **Runtime:** Python 3.11
- **API Framework:** Gradio 4+ (`@gradio/client` zero-copy HTTP/WebSocket interface)
- **Inference Hardware:** Hugging Face Spaces on ZeroGPU (dynamic Nvidia A100 allocation)
- **Computer Vision:** PyTorch, torchvision, ResNet-18 feature extractor, OpenAI CLIP (`ViT-B/32`)
- **Perceptual Hashing:** 64-bit difference hash (`dHash`), Hamming distance thresholding
- **NLP / ABSA:** VADER Sentiment, custom Hinglish e-commerce lexicons, scikit-learn
- **Optical Character Recognition:** Tesseract OCR, WinRT native fallback

---

## 5. System Architecture

TrustSphere operates on a modern decoupled multi-tier architecture:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       TRUSTSPHERE USER CLIENT (REACT 18 SPA)                │
│             Vercel Edge CDN • Light Plum UI • Workspace & Comparisons       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS / REST (JSON)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     BACKEND API GATEWAY (NODE.JS / EXPRESS 5)                │
│                 Render Free Web Service • TypeScript • JWT Auth             │
│                                                                             │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────────┐ │
│  │ Layered URL Retriever │  │ DecoupledTrustEngine  │  │ ReviewNlpEngine │ │
│  │ (Amazon, Flipkart...) │  │ (Non-Masking Invariant│  │ (9 ABSA Hinglish│ │
│  └───────────────────────┘  └───────────────────────┘  └─────────────────┘ │
└──────────────┬───────────────────────────────────────────────┬──────────────┘
               │                                               │
               ▼ mysql2 Connection Pool                        ▼ Gradio Client (@gradio/client)
┌─────────────────────────────────────────┐  ┌─────────────────────────────────────────┐
│       DATABASE TIER (TIDB CLOUD)        │  │     ML INFERENCE (HUGGING FACE ZEROGPU) │
│  TiDB Cloud Serverless (MySQL 8.0 Wire) │  │  Gradio Space • ZeroGPU (Nvidia A100)   │
│  • Investigations & Assessments         │  │  • CLIP ViT-B/32 Cross-Modal Alignment │
│  • Canonical Products & Listings        │  │  • ResNet-18 Visual Embeddings          │
│  • Users, Roles & Session Tokens        │  │  • Tesseract OCR Statutory Inspection  │
└─────────────────────────────────────────┘  └─────────────────────────────────────────┘
```

---

## 6. Frontend Architecture

The frontend is structured modularly in `frontend/src`:
- **`app/`**:
  - `router/`: Declarative route definitions (`AppRoutes.tsx`, `ProtectedRoute.tsx`).
  - `layouts/`: Master application shell (`AppLayout.tsx`, `Sidebar.tsx`, `TopNavbar.tsx`) featuring collapsible navigation, active route pills, and connection status indicators.
- **`features/`**:
  - `auth/`: Clean Light Plum sign-in and registration pages (`LoginPage.tsx`, `MarketplaceNetworkVisual.tsx`).
  - `investigation/`: Core product scanner (`InvestigationWorkspacePage.tsx`), automated auto-fill triggers, price badge verifiers, and multimodal detail dossiers (`InvestigationDetailPage.tsx`).
  - `comparison/`: Side-by-side offering matrix (`ComparisonStudioPage.tsx`).
  - `dashboard/`: Overview of scanned items, trust distributions, and saved reports (`DashboardPage.tsx`).
  - `settings/`: Platform preferences, model version toggling, and API connection monitors (`SettingsPage.tsx`).
- **`services/`**:
  - `apiClient.ts`: Axios instance configured with base URL resolution, JWT bearer interceptors, 401 refresh handlers, and offline error catching.
  - `investigateService.ts`: Investigation lifecycle dispatchers (`previewUrl`, `runInvestigation`, `getInvestigationById`).
  - `authService.ts`: User authentication, registration, token refresh, and profile management.
- **`components/ui/`**: Reusable design system primitives (`Button.tsx`, `Input.tsx`, `Card.tsx`, `StatCard.tsx`, `Badge.tsx`).

---

## 7. Backend Architecture

The backend lives in `backend/src` and is divided into cohesive domains:
- **`config/`**:
  - `env.ts`: Strict schema validation of environment variables (`JWT_SECRET`, `DB_HOST`, `CORS_ALLOWED_ORIGINS`, `HF_SPACE_URL`).
  - `database.ts`: Connection pool management with connection retries, SSL support, and automatic transaction rollback wrappers.
- **`modules/auth/`**:
  - `auth.controller.ts`, `auth.service.ts`: Bcrypt-hashed password authentication, dual-token JWT lifecycle (15-min access token in header, 30-day refresh token in HttpOnly cookie).
- **`modules/investigate/`**:
  - `url_retriever.ts`: Layered extraction waterfall fetching live metadata, resolving product titles, SKUs, and prices while filtering out bot-block artifacts.
  - `decoupled_trust_engine.ts`: Core trust assessment engine implementing the 5 decoupled dimensions and the Non-Masking Invariant.
  - `review_nlp_engine.ts`: High-performance clause-level sentiment analysis and 9-dimension ABSA.
  - `marketplace_adapters/`: Specialized parsers for Amazon India, Flipkart, Myntra, Decathlon, Croma, and Adidas.
- **`modules/trust/`**:
  - `hf_gradio.client.ts`: Resilient client communicating with Hugging Face ZeroGPU Space via `@gradio/client` with 60-second timeouts and automatic fallback.
- **`middleware/`**:
  - `auth.middleware.ts`: JWT signature verification and role-based access control.
  - `error.middleware.ts`: Centralized 404 and structured JSON error formatting.
  - `logging.middleware.ts`: Sanitized HTTP request logging with credential redaction.

---

## 8. Python ML/CV Architecture

The ML subsystem runs on Hugging Face Spaces (`06remontada06-trustphere-ml.hf.space`) using Gradio and ZeroGPU:
- **`app.py`**: ZeroGPU entry point using `@spaces.GPU` decorators for on-demand hardware acceleration.
- **Computer Vision Pipeline (`src/vision/`)**:
  - *ResNet-18*: Generates 512-dimensional visual embeddings for catalog images, detecting cross-seller re-use.
  - *64-bit dHash*: Perceptual difference hashing tolerant of compression, watermarks, and aspect ratio alterations.
  - *Studio White Background Detector*: Measures border luminance ($> 240/255$) to distinguish catalog studio photography from casual seller uploads.
- **Vision-Language Alignment (`src/multimodal/`)**:
  - *OpenAI CLIP (`ViT-B/32`)*: Embeds both listing title and image into a shared 512-dimensional semantic space. Cosine similarities $< 0.18$ trigger `SEVERELY_DISCORDANT_IMAGE_TITLE` (bait-and-switch flag).
- **Optical Character Recognition (`src/ocr/`)**:
  - *Tesseract OCR*: Transcribes physical packaging images, extracting statutory Legal Metrology markings (MRP in INR, net quantity, batch numbers, manufacturer FSSAI licenses).
- **Gated Multimodal Fusion Unit (`src/models/multimodal_learned_fusion.py`)**:
  - Multi-layer Random Forest trained with Modality Dropout ($p = 0.25$) and calibrated via Isotonic Regression to enforce monotonic risk probabilities.

---

## 9. Trust Scoring Methodology

TrustSphere evaluates 4 independent dimensions:

$$\text{Dimensions: } Q \text{ (Product Quality)}, \; S \text{ (Seller Reliability)}, \; A \text{ (Listing Authenticity)}, \; W \text{ (Website Legitimacy)}$$

### Weight Normalization
For all assessed dimensions ($Score_i \neq \text{null}$), the canonical base weights are:
$$\omega_Q = 0.35, \quad \omega_S = 0.25, \quad \omega_A = 0.25, \quad \omega_W = 0.15$$

When a dimension is unassessed (e.g. no reviews available, $Q = \text{null}$):
$$\Omega = \sum_{i \in \text{Assessed}} \omega_i, \quad \hat{\omega}_i = \frac{\omega_i}{\Omega}$$

### The Non-Masking Invariant
Let $m = \min_{i \in \text{Assessed}} (\text{Score}_i)$.

The overall score $T$ and risk tier $R$ are defined as:

$$T = \begin{cases} 
\min(m + 6, 45) & \text{if } m < 40 \\
\sum_{i \in \text{Assessed}} \hat{\omega}_i \cdot \text{Score}_i & \text{if } m \ge 40 
\end{cases}$$

$$R = \begin{cases}
\text{CRITICAL\_RISK} & \text{if } m < 25 \\
\text{HIGH\_OBSERVED\_RISK} & \text{if } 25 \le m < 40 \text{ or } T < 60 \\
\text{MODERATE\_RISK} & \text{if } 40 \le m \text{ and } 60 \le T < 78 \\
\text{MINIMAL\_RISK} & \text{if } 40 \le m \text{ and } T \ge 78
\end{cases}$$

**Mathematical Guarantee:** If any dimension reveals an acute hazard ($m < 40$), the overall trust score cannot exceed $45$, regardless of how reputable the marketplace ($W$) or seller ($S$) appears.

---

## 10. NLP & Review Analysis

The `ReviewNlpEngine` executes clause-level Aspect-Based Sentiment Analysis (ABSA) across 9 dimensions:
1. `build_quality`: Materials, durability, finish, stitching.
2. `performance`: Speed, functionality, effectiveness.
3. `battery_power`: Battery life, charging rate, overheating.
4. `audio_sound`: Clarity, bass, noise cancellation.
5. `display_visuals`: Screen resolution, brightness, colors.
6. `comfort_fit`: Sizing, ergonomics, wearability.
7. `value_for_money`: Pricing justification, worth.
8. `packaging_delivery`: Shipping speed, box condition.
9. `authenticity_legitimacy`: Originality, duplicate complaints, fake reports.

### Hinglish & Code-Mixed Handling
- **Intensifiers:** Tokens such as `bilkul`, `ekdum`, `bohot`, `bahut`, `super`, `extremely` multiply base token sentiment weights by $1.4\times$.
- **Compound Negation:** Differentiates between solitary intensifiers (*"bilkul kachra"* $\to -1.0$) and compound negative phrases (*"bilkul nahi"* $\to$ flips following polarity within a 3-token window).
- **Adversative Clause Splitting:** Sentences containing `but`, `however`, `although`, `par`, `lekin`, `magar`, or `kintu` are split into independent clauses so positive and negative sentiments in different aspects are isolated without canceling each other out.
- **Manipulation Detection:** Flags identical review text shingles across multiple customer reviews as coordinated bot-farm astroturfing.

---

## 11. Product Extraction & Price Validation

The URL extraction engine implements a 4-tier waterfall:

```
Product URL
    │
    ▼
[ Tier 1: JSON-LD Schema ] ─────────────► Match? ──► Return clean title, brand, SKU, price
    │ (schema.org/Product)
    ▼
[ Tier 2: Embedded State Script ] ──────► Match? ──► Extract hydrated JSON data
    │ (__INITIAL_STATE__, Next.js)
    ▼
[ Tier 3: Semantic DOM Matchers ] ──────► Match? ──► Query selector extraction
    │ (Marketplace-specific selectors)
    ▼
[ Tier 4: Sanitized URL Slug Parsing ] ─► Fallback ─► Extract clean SKU & sanitized title
```

### Price Conflict Resolution
If multiple price candidates are discovered with a relative discrepancy:
$$\Delta = \frac{|P_1 - P_2|}{\min(P_1, P_2)} > 0.15 \quad (15\%)$$
The item is assigned `price_verification_status = 'CONFLICTING_SOURCES'`, all candidates are recorded in the diagnostic report, and the user is alerted to verify the price manually.

---

## 12. Database Schema Overview

Deployed on TiDB Cloud Serverless (MySQL 8.0 wire-compatible) across two migration batches:

### Migration 001 (`001_initial_schema.up.sql`)
- `platforms`: Marketplace configurations (Amazon India, Flipkart, Myntra).
- `brands`: Brand entities with official domain tracking and category links.
- `sellers`: Merchant accounts, registration numbers, verification status, and ratings.
- `canonical_products`: Catalog products with canonical titles, MSRP, and categories.
- `marketplace_listings`: Specific seller offerings with pricing, stock status, and listing URLs.
- `price_history`: Longitudinal price snapshots with promotional flags.
- `trust_assessments`: Assessment scores, risk levels, and explainability JSON payloads.
- `annotation_tasks` & `ground_truth_annotations`: Reviewer calibration tables.

### Migration 002 (`002_investigations.up.sql`)
- `users`: User authentication table (`id`, `email`, `password_hash`, `full_name`, `role`, `created_at`).
- `user_sessions`: Refresh token storage for persistent multi-device sessions.
- `investigations`: Saved user investigation records with decoupled dimension scores ($Q, S, A, W$), risk tiers, and complete JSON diagnostic blobs.

---

## 13. API Overview

All backend endpoints are prefixed with `/api/v1` (with root `/health` and `/live` probes):

| Method | Endpoint | Auth | Purpose |
|---|---|:---:|---|
| `GET` | `/live` | None | Kubernetes/Render liveness probe |
| `GET` | `/health` | None | System readiness and database connectivity probe |
| `POST` | `/api/v1/auth/signup` | None | Register new user account |
| `POST` | `/api/v1/auth/login` | None | User authentication; returns JWT and session cookie |
| `POST` | `/api/v1/auth/refresh` | Cookie | Refreshes expired 15-minute access token |
| `POST` | `/api/v1/auth/logout` | Token | Revokes active session and clears cookies |
| `GET` | `/api/v1/auth/me` | Token | Returns profile details of authenticated user |
| `POST` | `/api/v1/investigate/url-preview` | Token | Extracts metadata, clean title, price, and brand from URL |
| `POST` | `/api/v1/investigate/run` | Token | Executes multimodal trust assessment and saves investigation |
| `GET` | `/api/v1/investigate/history` | Token | Retrieves paginated investigation history for current user |
| `GET` | `/api/v1/investigate/:id` | Token | Fetches complete 5-dimension scorecard and findings for an ID |
| `POST` | `/api/v1/comparison/run` | Token | Analyzes 2 to 5 offerings side-by-side with trade-off analysis |
| `GET` | `/api/v1/products/search` | Token | Searches catalog products by keyword or category |

---

## 14. Authentication & Security

1. **Password Security:** Salted and hashed using `bcrypt` (10 rounds). Plaintext passwords are never logged or stored.
2. **Dual-Token JWT Lifecycle:**
   - *Access Token:* 15-minute expiration, sent in `Authorization: Bearer <token>` header.
   - *Refresh Token:* 30-day expiration, stored in a secure `HttpOnly`, `SameSite=Lax` cookie.
3. **CORS Hardening:** Strict origin whitelist enforcing requests only from authorized Vercel production domains and local development origins.
4. **Rate Limiting:**
   - Auth endpoints: 10 requests / 15 minutes.
   - ML & Investigation runs: 30 requests / minute.
5. **Data Protection:** Zero database credentials, cloud keys, or tokens exposed to frontend bundles or client logs.
6. **SQL Injection Defense:** All database interactions utilize prepared statements with parameterized inputs via `mysql2/promise`.

---

## 15. Local Installation Instructions

### Prerequisites
- **Node.js:** v20.x or v22.x LTS
- **npm:** v10.x or higher
- **Python:** v3.11.x (for local ML development or test execution)
- **Git**

### Step-by-Step Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/shruti316/ai-marketplace-analyzer.git
   cd ai-marketplace-analyzer
   ```

2. **Install root dependencies:**
   ```bash
   npm install
   ```

3. **Install backend dependencies:**
   ```bash
   npm --prefix backend install
   ```

4. **Install frontend dependencies:**
   ```bash
   npm --prefix frontend install
   ```

5. **Configure environment files:**
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
   *Edit `backend/.env` with your database credentials and a 32+ character `JWT_SECRET`.*

6. **Start local development servers:**
   ```bash
   npm run dev
   ```
   - Frontend starts on: `http://localhost:3000`
   - Backend API starts on: `http://localhost:5000`

---

## 16. Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|:---:|---|---|
| `NODE_ENV` | Yes | `development` | Runtime environment (`development` or `production`) |
| `PORT` | No | `5000` | HTTP port for Express backend |
| `CORS_ALLOWED_ORIGINS` | Yes | `http://localhost:3000` | Comma-delimited list of allowed origins |
| `JWT_SECRET` | Yes | — | Secret string (minimum 32 characters) for signing JWTs |
| `DB_HOST` | Yes | `127.0.0.1` | MySQL/TiDB database host |
| `DB_PORT` | No | `4000` | Database port (3306 for MySQL, 4000 for TiDB) |
| `DB_USER` | Yes | — | Database username |
| `DB_PASSWORD` | Yes | — | Database user password |
| `DB_NAME` | Yes | `ai_marketplace_trust` | Database schema name |
| `DB_SSL` | No | `true` | Set to `true` for managed SSL cloud databases |
| `HF_SPACE_URL` | No | `https://06remontada06-trustphere-ml.hf.space` | URL of deployed Hugging Face ZeroGPU Space |
| `HF_SPACE_ID` | No | `06Remontada06/trustphere-ml` | Hugging Face Space repository ID |
| `HF_TOKEN` | No | — | Optional Hugging Face access token for private Spaces |
| `TRUST_PROXY` | No | `1` | Number of reverse proxy hops (e.g. Render/Cloudflare) |

### Frontend (`frontend/.env`)

| Variable | Required | Default | Description |
|---|:---:|---|---|
| `VITE_API_BASE_URL` | Yes | `http://127.0.0.1:5000` | Base URL of deployed Render backend |
| `VITE_APP_ENV` | No | `development` | Client environment flag |

---

## 17. Database Setup & Migration Instructions

The platform includes a built-in TypeScript migration runner supporting transactions and destructive rollback guards.

1. **Verify Database Connectivity:**
   Ensure `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` are populated in `backend/.env`.

2. **Run Migrations (Apply Up):**
   ```bash
   npm --prefix backend run migrate
   ```
   This executes:
   - `001_initial_schema.up.sql`: Core marketplace, catalog, listing, and assessment tables.
   - `002_investigations.up.sql`: Authentication, user session, and investigation persistence tables.

3. **Verify Migration Status:**
   ```bash
   npx --prefix backend tsx backend/database/verify_live_schema.ts
   ```

4. **Rollback Safety Guard:**
   Down migrations (`npm run migrate:down`) permanently drop tables. In production, down migrations require explicit confirmation:
   ```bash
   npm --prefix backend run migrate:down -- --confirm
   ```

---

## 18. Deployment Architecture

TrustSphere uses an entirely zero-cost hosting architecture leveraging cloud free tiers:

| Component | Cloud Provider | Tier | Configuration File |
|---|---|---|---|
| **Frontend SPA** | Vercel | Hobby (Free) | `vercel.json` |
| **Backend API** | Render | Free Web Service (Node 20) | `render.yaml` |
| **ML Engine** | Hugging Face Spaces | ZeroGPU (Nvidia A100 Free) | `deploy/huggingface-space/` |
| **Database** | TiDB Cloud | Serverless (Free 5 GiB Storage) | TiDB Console |

---

## 19. Hugging Face Deployment Instructions

The self-contained Hugging Face Space deployment files reside in `deploy/huggingface-space/`:

1. **Create Space on Hugging Face:**
   - Space Name: `trustphere-ml` (or custom name)
   - SDK: `Gradio`
   - Hardware: `ZeroGPU` (Free dynamic A100 allocation)
2. **Synchronize Code & Models:**
   - Clone the Space repository via Git:
     ```bash
     git clone https://huggingface.co/spaces/<your-username>/trustphere-ml hf-space-repo
     ```
   - Copy all contents from `deploy/huggingface-space/` into `hf-space-repo/`.
   - Commit and push to Hugging Face:
     ```bash
     cd hf-space-repo
     git add .
     git commit -m "deploy: sync ZeroGPU ML microservice"
     git push origin main
     ```
3. **Verify Space Startup:**
   Check the Gradio interface at `https://<your-username>-trustphere-ml.hf.space` to verify that the `/predict` and `/health` endpoints return healthy JSON responses.

---

## 20. Vercel & Render Deployment Instructions

### A. Deploy Backend to Render

1. Log into the [Render Dashboard](https://dashboard.render.com).
2. Click **New +** > **Blueprint**.
3. Connect your repository: `https://github.com/shruti316/ai-marketplace-analyzer`.
4. Render detects `render.yaml` and provisions the `ai-marketplace-backend` web service.
5. In the service settings, supply your TiDB Cloud database credentials (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).
6. Build and start commands configured in `render.yaml`:
   - Build Command: `npm install --include=dev && npm run build`
   - Start Command: `npm run start`
   - Health Check Path: `/live`

### B. Deploy Frontend to Vercel

1. Log into the [Vercel Dashboard](https://vercel.com).
2. Import repository `shruti316/ai-marketplace-analyzer`.
3. Configure settings:
   - Framework Preset: `Vite`
   - Root Directory: `frontend` (or keep root `/` using preconfigured root `vercel.json`)
   - Output Directory: `dist`
4. Add Environment Variables:
   - `VITE_API_BASE_URL`: `https://ai-marketplace-backend-9c29.onrender.com`
   - `VITE_APP_ENV`: `production`
5. Click **Deploy**. Vercel will build the frontend assets in ~20 seconds. Single-page routing rewrites are handled automatically by `vercel.json`.

---

## 21. Testing Instructions

TrustSphere maintains comprehensive test suites covering unit logic, adversarial cases, database migrations, and UI rendering:

### 1. Independent Adversarial Validation Suite
Executes 12 adversarial stress scenarios, labeled NLP benchmark evaluation, and adapter parsing tests:
```bash
npx --prefix backend tsx backend/tests/independent_model_validation.ts
```

### 2. Mandated Intelligence Benchmark
Executes the 10 mandated e-commerce scenarios verifying non-masking, unassessed handling, and duplicate detection:
```bash
npx --prefix backend tsx backend/tests/intelligence_benchmark.test.ts
```

### 3. Marketplace Intelligence Suite
Tests individual retailer adapters and extraction pipelines:
```bash
npx --prefix backend tsx backend/tests/marketplace_intelligence.test.ts
```

### 4. Frontend Vitest Suite
Runs 18 React component tests, UI renders, and service mocks:
```bash
npm --prefix frontend test -- --run
```

### 5. Production Compilation Checks
Verifies zero TypeScript or bundling errors:
```bash
npm --prefix backend run build
npm --prefix frontend run build
```

---

## 22. Known Limitations

In adherence to ethical AI engineering and transparent reporting standards, the following verified limitations are documented:
1. **Catalog Bot Gating:** Marketplaces such as Amazon India employ aggressive anti-scraping perimeter defenses (CAPTCHAs/bot blocks). When a bot gate prevents live HTML retrieval, TrustSphere gracefully falls back to URL slug extraction and prompts the user to verify observed pricing manually.
2. **Absence of Legal Trademark Ground Truth:** High confidence scores indicate strict adherence to consumer trust and data integrity policies rather than legally adjudicated judicial counterfeit rulings.
3. **Indic Dialect Script Variance:** While Hinglish (Latin transliteration) is fully supported by the ABSA lexicon, native Devanagari script reviews (`हिन्दी`) currently require OCR or translation preprocessing.
4. **Free Tier Cold Starts:** Render Free and Hugging Face ZeroGPU spin down after periods of inactivity. Initial requests may experience a 30-to-50 second cold-start delay while containers awaken.

---

## 23. Future Improvements

1. **Browser Extension:** Package TrustSphere's URL preview and non-masking trust scoring as a Chrome/Firefox extension that highlights trust metrics directly on Amazon and Flipkart product pages.
2. **Dynamic Price History Crawling:** Implement scheduled background workers collecting daily price snapshots to detect historical artificial price spikes before major festival sales.
3. **Multilingual Speech & Video OCR:** Expand multimodal inspection to analyze unboxing videos and short-form video reviews on platforms like Instagram and YouTube Shorts.
4. **Multi-Region Cross-Border Expansion:** Adapt price corridors and statutory compliance checks to international Southeast Asian marketplaces (Shopee, Lazada).
