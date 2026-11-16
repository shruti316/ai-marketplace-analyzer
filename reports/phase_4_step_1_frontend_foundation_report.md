# Phase 4 — Step 1: Frontend Foundation, Design System & Responsive Application Shell Report

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Application Name:** TrustSphere  
**Date:** November 14, 2026  
**Auditor & Lead Engineer:** Antigravity AI Engineering Team  
**Git Branch:** `main` (synchronized with `origin/main` at `43488f2`)  

---

## 1. Repository Audit Findings

Prior to authoring code, a thorough codebase and architecture audit was executed:

1. **Frontend State in Repository:**
   - No pre-existing frontend workspace, `package.json`, or UI source directory existed in the root repository.
   - The gap analysis document at `reports/backend_audit/FRONTEND_BACKEND_INTEGRATION_GAP.md` confirmed that the frontend needed to be established cleanly from the ground up without overwriting or displacing any existing assets.

2. **Backend API Contracts (Phase 3 Verified):**
   - **Express 5 Application Entrypoint:** Operating on default development port `5000` (`http://127.0.0.1:5000`).
   - **Authentication Routes (`/api/v1/auth`):**
     - `POST /api/v1/auth/login`: Accepts `{ email, password }` and returns `{ status: 'success', token, user: { id, email, role, fullName } }`.
     - `GET /api/v1/auth/me`: Validates JWT Bearer authorization and returns current user profile.
     - `POST /api/v1/auth/logout`: Revokes active session.
     - *Security Policy:* The initial bootstrap account (`00000000-0000-0000-0000-000000000001`) is locked for interactive login. Active accounts must be provisioned using `npm run admin:provision` in `backend/`.
   - **Health & Readiness Routes:** `/health`, `/ready`, `/live`, and `/api/v1/health` returning database latency and connection status without credential leakage.
   - **Catalog Domain Routes (`/api/v1`):**
     - `GET /api/v1/products`: Paginated canonical products with search and category filtering.
     - `GET /api/v1/products/:id`: Full canonical product metadata.
     - `GET /api/v1/platforms`: Connected platforms (`amazon_in`, `flipkart`, `myntra`).
     - `GET /api/v1/listings`: Multi-platform active marketplace listings.
     - `GET /api/v1/brands` & `GET /api/v1/sellers/:id`.
   - **Trust Intelligence Routes:** `/api/v1/products/:id/trust-assessment`, `/api/v1/products/:id/evidence`, `/api/v1/products/:id/report`, and `/api/v1/ablations`.
   - **Comparison & Annotation Routes:** `/api/v1/comparisons` and `/api/v1/annotations/tasks` guarded by JWT and role authorization.

3. **CORS Configuration:**
   - Backend `CORS_ALLOWED_ORIGINS` defaults to `http://localhost:3000,http://127.0.0.1:3000`.
   - Frontend Vite development server is configured on port `3000` with an active reverse proxy (`/api` -> `http://127.0.0.1:5000`), completely eliminating cross-origin preflight latency during development.

4. **Preserved Invariants:**
   - Frozen ML models (`models/*.joblib`), analytical data caches (`data/`), MySQL schema migrations (`backend/database/migrations/`), and seeded historical datasets (16,897 records across 16 tables) remain 100% untouched.

---

## 2. Frontend Technology Stack Decisions

The stack strictly aligns with the enterprise SaaS requirements:

| Technology | Version | Purpose & Rationale |
| :--- | :--- | :--- |
| **React** | `^18.3.1` | Modern declarative UI component library with robust concurrent rendering. |
| **Vite** | `^6.0.3` | Ultra-fast ESM-native build tool and dev server with HMR and optimized chunking. |
| **TypeScript** | `^5.7.2` | Strict compile-time typing across domain models, API responses, and UI props. |
| **Tailwind CSS** | `^3.4.16` | Utility-first CSS framework customized with centralized enterprise design tokens. |
| **React Router** | `^6.28.0` | Client-side declarative routing with nested layout hierarchy and auth guards. |
| **TanStack Query** | `^5.62.7` | Asynchronous server-state management with query caching, automatic refetching, and background hydration. |
| **Axios** | `^1.7.9` | Interceptor-driven HTTP client managing JWT injection, 401 token refresh/logout, and 429 rate limit errors. |
| **React Hook Form** | `^7.54.0` | Performant, un-opinionated form state management with isolated re-renders. |
| **Zod** | `^3.24.1` | Schema declaration and validation library paired with `@hookform/resolvers`. |
| **Recharts** | `^2.15.0` | SVG-based responsive data visualization library for risk distribution and coverage charts. |
| **Lucide React** | `^0.468.0` | Consistent, accessible enterprise icon library with 24px grid baselines. |
| **Vitest & RTL** | `^2.1.8` | Next-generation unit and component testing running in jsdom with testing-library. |

---

## 3. Architecture & Modular Directory Structure

```text
frontend/
├── .env.example                          # Canonical environment configuration template
├── index.html                            # HTML5 entrypoint with Manrope/Inter typography
├── package.json                          # Explicit frontend dependencies and test scripts
├── postcss.config.js                     # PostCSS Tailwind and Autoprefixer pipeline
├── tailwind.config.js                    # Centralized Soft Modern Enterprise design tokens
├── tsconfig.json                         # Strict TypeScript configuration with @/* path aliases
├── vite.config.ts                        # Vite configuration with manual rollup chunking & API proxy
├── vitest.config.ts                      # Vitest test runner configuration with jsdom
├── public/
│   └── favicon.svg                       # Custom enterprise trust-shield geometric SVG icon
└── src/
    ├── main.tsx                          # React 18 createRoot mounting
    ├── App.tsx                           # Application root component
    ├── vite-env.d.ts                     # TypeScript declarations for Vite client and import.meta.env
    ├── app/
    │   ├── layouts/
    │   │   ├── AppLayout.tsx             # Master responsive layout with persistent sidebar collapse
    │   │   ├── Breadcrumbs.tsx           # Context-aware path navigation
    │   │   ├── MobileDrawer.tsx          # Touch-optimized mobile navigation drawer
    │   │   ├── Sidebar.tsx               # Midnight Navy collapsible enterprise navigation
    │   │   └── TopNavbar.tsx             # Live health status pill, search, and user badge
    │   ├── providers/
    │   │   ├── AppProviders.tsx          # Composition root for Query, Auth, and Router providers
    │   │   ├── AuthProvider.tsx          # JWT session lifecycle, login, and logout state
    │   │   └── QueryProvider.tsx         # TanStack Query client with 5-minute cache defaults
    │   └── router/
    │       ├── AppRoutes.tsx             # Route definitions and catch-all fallbacks
    │       └── ProtectedRoute.tsx        # Authentication guard with security verification screen
    ├── components/
    │   ├── charts/
    │   │   ├── MarketplaceComparisonChart.tsx # Amazon vs Flipkart vs Myntra coverage bar chart
    │   │   └── RiskDistributionChart.tsx      # Calibrated 4-tier risk distribution donut chart
    │   ├── common/
    │   │   ├── EmptyState.tsx            # Standardized empty data presentation
    │   │   ├── ErrorState.tsx            # Resilient error alert with retry triggers
    │   │   ├── StatCard.tsx              # Enterprise KPI metric card with loading skeleton
    │   │   └── StatusIndicator.tsx       # Real-time service connectivity pulse dot
    │   └── ui/
    │       ├── Alert.tsx                 # Semantic status alerts (info, success, warning, danger)
    │       ├── Badge.tsx                 # Risk-tier semantic badges (Low, Moderate, Elevated, Sparse)
    │       ├── Button.tsx                # Variant-styled button with loading spinner & touch targets
    │       ├── Card.tsx                  # Restrained glassmorphic card container with diffused shadows
    │       ├── Input.tsx                 # Accessible form input with error helpers & icon slots
    │       └── Skeleton.tsx              # Diffused pulse placeholder for loading states
    ├── features/
    │   ├── annotations/
    │   │   └── AnnotationStudioPage.tsx  # Human-in-the-loop expert annotation studio placeholder
    │   ├── auth/
    │   │   └── LoginPage.tsx             # Split-screen desktop & single-column mobile login
    │   ├── comparisons/
    │   │   └── ComparisonsPage.tsx       # Cross-platform price dispersion & comparison studio
    │   ├── dashboard/
    │   │   ├── DataAvailabilityCard.tsx  # 6-modality telemetry completeness monitor
    │   │   ├── MarketplaceCoverageCard.tsx # Active retail platform ingestion monitor
    │   │   ├── MetricCardsGrid.tsx       # 4-KPI metric grid connecting to catalog & health APIs
    │   │   ├── OverviewPage.tsx          # Master dashboard view combining telemetry & feeds
    │   │   └── RecentInvestigationsTable.tsx # Live catalog table with horizontal scroll protection
    │   ├── evidence/
    │   │   └── EvidenceExplorerPage.tsx  # Forensic atomic evidence provenance placeholder
    │   ├── model-insights/
    │   │   └── ModelInsightsPage.tsx     # Gated multimodal ablation diagnostics placeholder
    │   ├── products/
    │   │   └── ProductIntelligencePage.tsx # Product catalog trust exploration placeholder
    │   └── settings/
    │       └── SettingsPage.tsx          # Analyst profile, security policies, and alert preferences
    ├── hooks/
    │   └── useAuth.ts                    # Hook consuming AuthContext
    ├── lib/
    │   └── utils.ts                      # clsx and tailwind-merge styling utility + INR formatters
    ├── services/
    │   ├── apiClient.ts                  # Axios client with JWT interceptor & 429 rate limit handler
    │   ├── authService.ts                # Authentication API calls and token storage
    │   ├── catalogService.ts             # Products, platforms, listings, and seller endpoints
    │   └── healthService.ts              # System and database readiness probes
    ├── styles/
    │   ├── index.css                     # Tailwind layers, glassmorphism utilities, and reduced-motion
    │   └── tokens.css                    # CSS custom variables for design tokens
    ├── test/
    │   ├── setup.ts                      # Vitest environment setup (matchMedia & ResizeObserver mocks)
    │   ├── AppLayout.test.tsx            # Unit test for shell navigation and sidebar toggling
    │   ├── Button.test.tsx               # Unit test for button variants, loading, and states
    │   ├── LoginPage.test.tsx            # Unit test for login form validation & password toggle
    │   └── StatCard.test.tsx             # Unit test for metric cards and skeleton loaders
    └── types/
        ├── api.ts                        # Standardized error response typing
        ├── auth.ts                       # User, credentials, and authentication state contracts
        ├── catalog.ts                    # Canonical products, listings, brands, and platforms
        └── trust.ts                      # Risk tiers, modality scores, and system health contracts
```

---

## 4. Design Tokens & Visual Identity System

The visual identity embodies **SOFT MODERN ENTERPRISE** with restrained glassmorphism, muted palettes, and non-cliché styling.

### 4.1 Color System

| Token Name | Hex Code | Purpose & Semantic Role |
| :--- | :--- | :--- |
| **Midnight Navy** | `#0D1B2A` | Primary sidebar background, high-contrast brand headings, and dark accents. |
| **Muted Teal** | `#3D7584` | Primary call-to-action buttons, active navigation indicators, and brand highlights. |
| **Soft Blue** | `#89BBBE` | Secondary chart bars, accent borders, and subtle focus outlines. |
| **Mist** | `#E8EFF0` | Secondary surface backgrounds, card divider lines, and subtle input borders. |
| **Warm Ivory** | `#F6EFE3` / `#FAF7F2` | Main application background and warm neutral container backgrounds. |
| **Sage** | `#A3B18A` / `#4D7C5B` | Positive trust indicators, low-risk tags, and healthy service status. |
| **Muted Lavender** | `#B8B2D8` | Supporting accent badges and secondary notification highlights. |

### 4.2 Semantic Risk Tiers

| Tier Identifier | Text Color | Surface Background | Border Color | Semantic Meaning |
| :--- | :--- | :--- | :--- | :--- |
| `LOW_OBSERVED_ANOMALY` | `#2F6B3E` (Sage) | `#EEF6F0` | `#C3DFCA` | Normal baseline, verified seller, authentic review patterns. |
| `MODERATE_SINGLE_MODALITY_ANOMALY` | `#A65E1E` (Muted Amber) | `#FDF4EB` | `#F3D4B6` | Single modality deviation (e.g., suspicious discount or mild text repetition). |
| `ELEVATED_MULTIMODAL_ANOMALY` | `#A83232` (Terracotta) | `#FBECEC` | `#F3BFBF` | Cross-modal anomaly flags (e.g., severe price anomaly + OCR title mismatch). |
| `UNASSESSED_SPARSE_DATA` | `#475569` (Slate) | `#F1F5F9` | `#CBD5E1` | Sparse features or insufficient historical telemetry. |

### 4.3 Typography & Surface Rules
- **Typography:** Primary sans-serif stack utilizing Inter and Manrope with tabular numerals (`font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11'`).
- **Corner Radii:** 10px on interactive buttons, 14px on content cards (`rounded-card`), 18px on modal dialogs (`rounded-modal`).
- **Shadows:** Soft diffused shadows (`shadow-soft`: `0 2px 8px -1px rgba(13, 27, 42, 0.05)`) without heavy dark drop shadows.
- **Glassmorphism:** Restrained `.glass-card` using `rgba(255, 255, 255, 0.88)` with `backdrop-filter: blur(12px)`.
- **Restraint Invariants:** Zero emojis in the UI; no cartoon illustrations; no neon glows; no flying animations.

---

## 5. Implemented Screens & Components

### 5.1 Login Experience (`LoginPage.tsx`)
- **Desktop (>=1024px):** Split-screen layout. Left side presents the enterprise product identity, geometric wireframe accents, and three capability badges (Multimodal Fusion Architecture, Cross-Seller Price Anomaly Radar, and Full Evidence Provenance). Right side renders the focused login card.
- **Mobile (<1024px):** Converts automatically into a clean single-column view with a compact brand header, avoiding all split-screen overflow.
- **Form Controls:** Work email input, password field with toggleable show/hide eye icon, remember-session checkbox, and loading spinner state during submission.
- **Security Guidance:** Prominently displays the security notice informing users that the bootstrap account is locked and documents the command `npm run admin:provision` to generate active credentials.

### 5.2 Application Shell (`AppLayout.tsx`, `Sidebar.tsx`, `TopNavbar.tsx`, `MobileDrawer.tsx`)
- **Sidebar Navigation:** Contains the exact 7 enterprise sections:
  1. *Overview* (`/`)
  2. *Product Intelligence* (`/products`)
  3. *Evidence Explorer* (`/evidence`)
  4. *Comparisons* (`/comparisons`)
  5. *Annotation Studio* (`/annotations`)
  6. *Model Insights* (`/model-insights`)
  7. *Settings* (`/settings`)
- **Collapsible Sidebar:** Supports smooth toggle between expanded (256px) and compact icon-only (74px) states, with state persistence stored in `localStorage`.
- **Top Navigation Bar:** Contextual breadcrumbs (`Breadcrumbs.tsx`), global search trigger with keyboard shortcut (`⌘K`), real-time database health pill polling `/api/v1/health`, and analyst avatar.
- **Mobile Navigation Drawer:** Slide-in drawer with frosted backdrop (`MobileDrawer.tsx`), automatically closing on route change or touch outside.

### 5.3 Overview Dashboard (`OverviewPage.tsx`)
- **KPI Metrics Grid:** 4 responsive cards showing:
  - *Products in Catalog* (real total from catalog API with `Historical Staging` tag).
  - *Elevated Anomalies* (7.2% gated multimodal flag rate).
  - *Marketplace Coverage* (Amazon, Flipkart, Myntra active feeds).
  - *Trust Engine Health* (real-time MySQL database ping latency).
- **Risk Distribution Chart:** Responsive donut chart visualizing the 4 calibrated anomaly tiers using Recharts with custom enterprise tooltip.
- **Marketplace Comparison Chart:** Responsive dual-bar chart comparing canonical products against active listings across Amazon India, Flipkart, and Myntra.
- **Ingestion Feeds Card:** Telemetry status for connected marketplace endpoints.
- **Modality Telemetry Card:** Coverage completeness across all 6 evidence dimensions.
- **Investigations Table:** Data table listing canonical products from the database with category, brand, truncated ID, anomaly tier badge, and direct audit action, with horizontal scroll safety.

---

## 6. Responsive Implementation Details

The frontend was engineered from the foundation for four standard responsive tiers:

| Viewport Tier | Width Range | Layout Adaptation Strategy |
| :--- | :--- | :--- |
| **Mobile** | `<640px` (tested at 375px, 390px, 430px) | Single-column login without horizontal scroll; desktop sidebar hidden; compact top navbar with hamburger button; full-screen touch drawer; single-column KPI cards; horizontally scrollable data tables with sticky padding; minimum 44px touch targets on buttons and inputs. |
| **Tablet** | `640px–1023px` (tested at 768px) | 2-column KPI cards; responsive charts adapting to 100% container width; mobile drawer navigation; search bar placeholder collapsed. |
| **Desktop** | `1024px–1439px` (tested at 1024px, 1366px) | Split-screen login; collapsible left sidebar (256px -> 74px); 4-column KPI cards; 2-column analytics and telemetry charts. |
| **Wide Desktop** | `>=1440px` (tested at 1440px) | Fixed maximum width (`max-w-7xl mx-auto`) preventing excessive chart stretching; expanded search input with shortcut indicators. |

---

## 7. Animation & Interaction Design

- **Page Transitions:** Gentle fade-in (`animate-fadeIn`, 200ms duration) on route changes.
- **Sidebar & Drawers:** Smooth transform and width transitions (150–200ms cubic-bezier).
- **Cards & Buttons:** Subtle scale on click (`active:scale-[0.98]`) and soft hover elevation (`hover:shadow-soft-md`).
- **Loading States:** Diffused pulse skeletons (`Skeleton.tsx`) mirroring the layout dimensions of the target cards.
- **Accessibility & Reduced Motion:** Full `@media (prefers-reduced-motion: reduce)` override disabling all CSS transitions, animations, and smooth scroll for sensitive users.

---

## 8. Backend Integration Status

- **API Client:** `src/services/apiClient.ts` configured to communicate with the Express 5 API.
- **Proxy Configuration:** Vite development server proxies all `/api/*` requests directly to `http://127.0.0.1:5000`.
- **Bearer Token Handling:** Transparently attaches `Authorization: Bearer <token>` from `localStorage` on all outgoing requests.
- **Error Handling:** Standardized Axios response interceptors mapping HTTP 401 to automatic session invalidation and HTTP 429 to clear rate-limit retry warnings.
- **Real Backend Queries:** `OverviewPage` executes live queries against `/api/v1/products`, `/api/v1/platforms`, and `/api/v1/health`.

---

## 9. Verification & Test Results

### 9.1 Unit & Integration Test Suite (`vitest`)
Vitest test suite executed across 4 test suites:
- `StatCard.test.tsx` (2 tests): Verified metric rendering, subtitles, badges, and skeleton states.
- `Button.test.tsx` (4 tests): Verified primary and danger variants, click handlers, loading spinner, and disabled behavior.
- `LoginPage.test.tsx` (3 tests): Verified form fields, Zod email validation, and password visibility toggle.
- `AppLayout.test.tsx` (2 tests): Verified rendering of all 7 navigation sections and sidebar collapse toggling.

**Result:** **11/11 tests passed (100% success rate, 0 failed).**

### 9.2 TypeScript Compilation & Production Build
- **Type Checking:** `tsc -b` executed with **0 errors**.
- **Vite Bundler:** Optimized production bundle generated with manual chunk splitting:
  - `dist/assets/vendor-ui-*.js` (39.08 kB)
  - `dist/assets/vendor-router-query-*.js` (204.90 kB)
  - `dist/assets/index-*.js` (209.99 kB)
  - `dist/assets/vendor-charts-*.js` (422.77 kB)
  - `dist/assets/index-*.css` (33.70 kB)

**Result:** **Build completed successfully with zero chunk-size warnings.**

---

## 10. Known Limitations & Next Milestones

### 10.1 Current Milestone Scope
- In this foundation milestone (Step 1), placeholder views are provided for *Product Intelligence*, *Evidence Explorer*, *Comparisons*, *Annotation Studio*, and *Model Insights*.
- The live dashboard displays real catalog products and platform health from the backend, supplemented with baseline multi-modal anomaly distributions pending Phase 4 Step 2 deep integration.

### 10.2 Recommended Next Milestone (Step 2)
1. **Catalog Explorer & Product Trust Intelligence View (`/products` & `/products/:id`):**
   - Implement searchable, filterable product grid with faceted filters for brand, platform, and category.
   - Build the comprehensive 12-section trust report viewer including composite anomaly radar, atomic evidence tables, and model limitations notice.
2. **Interactive Cross-Platform Comparison Studio (`/comparisons`):**
   - Side-by-side product attribute and pricing dispersion matrix across Amazon India, Flipkart, and Myntra.
3. **Annotation Studio (`/annotations`):**
   - Active task queue, human expert labeling interface, and consensus metrics calculation.
