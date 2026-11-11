# Phase 2 — Stage 0: Existing Backend Technical Audit
## Deliverable 4: Frontend-Backend Integration Gap Analysis

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Audit Date:** November 11, 2026  
**Auditor:** Antigravity AI Engineering Team  

---

## 1. Current Frontend State in Repository

### 1.1 Empirical Findings
A rigorous file system search of the repository confirms:
- **No `package.json`** or `node_modules` exists.
- **No `vite.config.ts`**, `tsconfig.json`, or React entry point (`main.tsx`, `App.tsx`) exists.
- **No UI components**, stylesheets (`tailwind.config.js`), or asset folders exist.
- **No TypeScript interface definitions** or API clients (`axios`, `fetch`) exist.
- **No `localStorage` wrappers** or mock data stores exist in the workspace.

**Conclusion:**  
The React + Vite + TypeScript frontend application is **GENUINELY NOT YET CREATED** in the active repository. All user-facing views, pages, state management stores, and API clients must be built in Phase 2.

---

## 2. Required Frontend Pages & Component Hierarchy

To deliver the intended full-stack user experience, the frontend architecture requires the following 7 core pages and component trees:

### 2.1 Navigation & Layout Structure
- **Root Layout:**
  - Header: Logo, Search Bar, Marketplace Filter Pills (Amazon, Flipkart, Myntra), User Avatar / Login Button, Theme Toggle.
  - Sidebar: Dashboard, Catalog Explorer, Comparisons, Watchlist, Analysis History, MarketMate Assistant toggle.
  - Notification Toast Provider (for async task completion, errors, watchlist updates).

### 2.2 Core Application Pages

| Page Route | View / Page Name | Primary Components | Required Backend API | Data Source (Mock vs Backend) |
| :--- | :--- | :--- | :--- | :--- |
| `/` | **Dashboard** | MetricsBanner, MarketplaceStatsCards, RecentAnalysesCarousel, AnomalyTiersChart, HighRiskSpotlight | `GET /api/v1/products`, `GET /api/v1/health` | **Requires Backend Integration** |
| `/products` | **Catalog Explorer** | FilterSidebar, SearchInput, ProductGrid, ProductCard, PaginationControls | `GET /api/v1/products` | **Requires Backend Integration** |
| `/products/:id` | **Product Trust Analysis** | ProductHeroHeader, CompositeRiskBadge, ModalityRadarCard, ModalityBreakdownTabs, AtomicEvidenceTable, PositiveNegativeList, LimitationsNotice | `GET /api/v1/products/:id/trust-assessment`, `GET /api/v1/products/:id/evidence` | **Requires Backend Integration** |
| `/products/:id/report`| **Explainable Trust Report** | Report12SectionsViewer, PrintExportButton, MarkdownRenderer, GraphSubgraphVisualizer | `GET /api/v1/products/:id/report?format=json` | **Requires Backend Integration** |
| `/compare` | **Product Comparison** | ProductPickerMultiSelect, SideBySideComparisonMatrix, DensityVsRiskRanking, TradeoffsAlert | `POST /api/v1/compare` | **Requires Backend Integration** |
| `/history` | **Analysis History** | HistoryTable, RiskBadgeFilter, DateRangePicker, ClearHistoryButton | `GET /api/v1/history`, `DELETE /api/v1/history/:id` | **Requires Backend Integration** |
| `/watchlist` | **Saved Products** | WatchlistGrid, CustomNotesEditor, PriceAlertConfig, RemoveButton | `GET /api/v1/saved-products`, `POST/DELETE` | **Requires Backend Integration** |
| `/auth/login`, `/register` | **Auth Pages** | LoginForm, RegisterForm, FormValidationMessages, PasswordStrengthMeter | `POST /api/v1/auth/login`, `POST /api/v1/auth/register` | **Requires Backend Integration** |

### 2.3 Global MarketMate Drawer Component
- **Component:** `MarketMateDrawer.tsx`
- **Features:** Slide-out interactive chat panel accessible from any page.
- **Context Injection:** When opened on a product page (`/products/:id`), automatically binds the current product context and displays quick prompt pills:
  - *"Why is this rated as Moderate Risk?"*
  - *"Are the customer reviews genuine or repeated?"*
  - *"Is this price unusually low compared to competitors?"*
  - *"Does the packaging text match the product title?"*
- **Backend API:** `POST /api/v1/assistant/chat`, `GET /api/v1/assistant/sessions`.

---

## 3. Required TypeScript Interfaces & Data Models

The frontend must implement exact TypeScript types mirroring the backend contracts:

```typescript
// src/types/trustEngine.ts

export type RiskTier = 
  | "UNASSESSED_SPARSE_DATA"
  | "LOW_OBSERVED_ANOMALY"
  | "MODERATE_SINGLE_MODALITY_ANOMALY"
  | "ELEVATED_MULTIMODAL_ANOMALY";

export type EvidenceModality = 
  | "REVIEW_NLP"
  | "IMAGE_CV"
  | "PRICING"
  | "SELLER_GOVERNANCE"
  | "GRAPH_TOPOLOGY"
  | "OCR";

export type SignalSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH";

export interface UnifiedEvidenceItem {
  evidence_id: string;
  entity_id: string;
  canonical_product_id: string;
  listing_id: string | null;
  evidence_modality: EvidenceModality;
  evidence_type: string;
  evidence_nature: "OBSERVED_EVIDENCE" | "HEURISTIC_SIGNAL" | "MODEL_PREDICTION";
  observed_value: string;
  signal_severity: SignalSeverity;
  detection_method: string;
  confidence: number;
  uncertainty_note: string;
  provenance: string;
  timestamp: string | null;
  modality_available: boolean;
  evidence_limitations: string;
}

export interface ModalityAssessment {
  modality: EvidenceModality;
  status: "AVAILABLE" | "MODALITY_UNAVAILABLE" | "BLOCKED_DEPENDENCY";
  has_anomaly: boolean;
  anomaly_type: string | null;
  summary_text: string;
  evidence_count: number;
  corroborating_evidence_ids: string[];
  limitations: string;
}

export interface ProductTrustAssessment {
  canonical_product_id: string;
  marketplace: string;
  brand: string;
  category: string;
  subcategory: string;
  overall_risk_tier: RiskTier;
  available_core_modalities_count: number;
  active_anomaly_modality_count: number;
  modality_breakdown: Record<string, ModalityAssessment>;
  positive_evidence: string[];
  negative_evidence: string[];
  missing_modalities: string[];
  assessment_limitations: string[];
  recommendation_summary: string;
  assessment_framework: string;
}

export interface ProductComparisonResult {
  compared_product_ids: string[];
  comparison_matrix: Record<string, any>;
  evidence_density_ranking: string[];
  risk_ranking: string[];
  recommended_product_id: string | null;
  recommendation_rationale: string;
  tradeoffs: string[];
}
```

---

## 4. State Management & Persistence Strategy

### 4.1 Server State (TanStack React Query v5)
- All remote API calls (products, assessments, evidence, comparisons, reports, user data) must use React Query.
- **Cache Invalidation:**
  - `trustAssessment`: `staleTime: 5 * 60 * 1000` (5 minutes).
  - `productCatalog`: `staleTime: 10 * 60 * 1000`.
  - `userWatchlist`: Invalidated on add/remove mutations.

### 4.2 Client State (Zustand)
- **Auth Store (`useAuthStore`):**
  - Current user profile, access token in memory, authentication status.
  - Automatically attempts token refresh on app launch.
- **UI Store (`useUIStore`):**
  - Active theme (light/dark), sidebar collapsed state, active marketplace filter.
  - MarketMate open/closed drawer state and active product context.

### 4.3 LocalStorage Policy
- **What is stored in `localStorage`:**
  - UI preferences (e.g. `theme: 'dark'`).
  - Active search filter draft.
- **What is NEVER stored in `localStorage`:**
  - JWT tokens or refresh tokens (stored in memory and HTTP-only cookies to prevent XSS credential theft).
  - Unsanitized HTML or sensitive user account details.

---

## 5. Implementation Roadmap to Bridge Frontend-Backend Gap

1. **Step 1: Scaffolding (Phase 2, Stage 6):**
   - Initialize Vite React + TypeScript template in `frontend/`.
   - Install Tailwind CSS, Lucide icons, Axios, TanStack Query, Zustand, React Router DOM v6.
2. **Step 2: API Client Configuration:**
   - Configure Axios instance with `baseURL: '/api/v1'`, request timeout (10s), and automatic 401 token refresh interceptor.
3. **Step 3: Component Library & Design System:**
   - Build reusable badges (`RiskTierBadge`), cards (`ModalityCard`), tables (`EvidenceTable`), and progress bars (`ConfidenceBar`).
4. **Step 4: Page Implementation & Route Wiring:**
   - Implement Dashboard, Catalog Explorer, Product Analysis, Report Viewer, Comparison, and History views.
5. **Step 5: MarketMate Drawer Integration:**
   - Build conversational drawer with quick prompts and evidence-grounding citations.
