# Trust Engine Architecture Report
**Indian Marketplace Multimodal Trust Dataset v1.7**
*AI-Powered Indian Marketplace Trust Intelligence Platform*
*Release Date: November 10, 2026*

---

## 1. Architectural Philosophy

The **AI-Powered Indian Marketplace Trust Intelligence Engine** is engineered to resolve a core challenge in e-commerce risk intelligence: combining heterogeneous, incomplete, and noisy marketplace signals into a single, explainable assessment without fabricating artificial certainty or penalizing sparse catalog items.

### Core Architectural Principles
1. **Separation of Concerns:** Strict decoupling between data ingestion, evidence normalization, modality evaluation, cross-modal fusion, and client-facing report generation.
2. **Tri-Tier Evidence Classification:** Every atomic piece of evidence is tagged with its nature:
   - `OBSERVED_EVIDENCE`: Empirical observations (raw review text, physical image dimensions, scraped price, listing URLs).
   - `HEURISTIC_SIGNAL`: Rule-based statistical checks (IQR corridor bounds, rating-review discordance deltas, MD5 duplicate clustering).
   - `MODEL_PREDICTION`: Machine-learned inferences (ResNet-18 visual embeddings, cosine similarity scores, lexical sentiment polarities).
3. **Statutory & Governance Boundary Protection:** Distinguishes multi-sided marketplace platform operators from 3rd-party retail merchants, preserving the Honest Null invariant.
4. **API-First Decoupling:** Fully callable via Python SDK, CLI, or backend REST/FastAPI endpoints without frontend or notebook dependencies.

---

## 2. Pipeline Data Flow

```
                      ┌──────────────────────────────────────┐
                      │    Certified Dataset Release v1.7    │
                      │  (Entities, Evidence, Derived Graph) │
                      └──────────────────┬───────────────────┘
                                         │
                                         ▼
                      ┌──────────────────────────────────────┐
                      │     Unified Evidence Engine          │
                      │ (Review, Image, Price, Seller, Graph)│
                      └──────────────────┬───────────────────┘
                                         │ UnifiedEvidenceItem[]
                                         ▼
                      ┌──────────────────────────────────────┐
                      │    Multimodal Evidence Fusion        │
                      │  - Anti-correlation de-duplication   │
                      │  - Zero-Penalty Missing Modality     │
                      │  - Independent corroboration check   │
                      └──────────────────┬───────────────────┘
                                         │
                                         ▼
                      ┌──────────────────────────────────────┐
                      │       Trust Assessment Engine        │
                      │ (Product, Listing, Seller Evaluation)│
                      └──────────┬───────────────────┬───────┘
                                 │                   │
                  ProductTrustAssessment             ListingTrustAssessment
                                 │                   │
                                 ├───────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
                 ▼                               ▼
┌─────────────────────────────────┐   ┌─────────────────────────────────┐
│   Product Comparison Engine     │   │   Explainable Report Generator  │
│ - Evidence density ranking      │   │ - 12-section standardized format│
│ - Anti-sparsity recommendation  │   │ - Markdown & JSON exports       │
└─────────────────────────────────┘   └─────────────────────────────────┘
```

---

## 3. Subsystem Specifications

### 3.1 Unified Evidence Engine (`evidence_engine.py`)
- Ingests all tables from `entities/`, `evidence/`, `derived_evidence/`, and `relationships/`.
- Maintains O(1) in-memory index dictionaries for instant primary key lookups across all 3,643 products, 3,643 listings, 4,708 images, 3,659 reviews, and 41,372 graph edges.
- Generates standardized `UnifiedEvidenceItem` records with complete provenance, timestamps, detection methods, confidence scores, and limitation disclosures.

### 3.2 Multimodal Fusion Engine (`multimodal_fusion.py`)
- Evaluates individual modalities independently:
  - `REVIEW_NLP`: De-duplicates exact text duplicates and rating discordance into a single review-manipulation finding.
  - `IMAGE_CV`: Inspects file integrity and centered ResNet-18 visual clusters for cross-product reuse ($\cos \ge 0.95$).
  - `PRICING`: Consolidates non-parametric IQR corridors, extreme markdowns ($\ge 90\%$), and MRP consistency checks.
  - `SELLER_GOVERNANCE`: Assesses platform fulfillment routing while enforcing honest null governance.
  - `GRAPH_TOPOLOGY`: Evaluates egocentric graph connectivity and cross-brand image recycling edges.
- Enforces the **Zero-Penalty Missing Modality Invariant**: products with $< 2$ core modalities are strictly classified as `UNASSESSED_SPARSE_DATA`.
- Enforces **Independent Cross-Modal Corroboration**: `ELEVATED_MULTIMODAL_ANOMALY` requires corroborating anomalies across at least 2 independent modalities.

### 3.3 Trust Assessment Engine (`trust_assessment.py`)
- Coordinates product-level, listing-level, and seller-level evaluations.
- Generates strongly-typed `ProductTrustAssessment`, `ListingTrustAssessment`, and `SellerTrustAssessment` dataclass structures.

### 3.4 Product Comparison Engine (`comparison_engine.py`)
- Compares multiple products across pricing corridors, review sentiments, image fingerprints, and data completeness.
- **Anti-Sparsity Recommendation Invariant:** Prohibits recommending a product simply because it has 0 detected anomalies if that product has sparse evidence ($< 2$ modalities). Prioritizes fully-instrumented products with verified cross-modal consistency.

### 3.5 Explainable Report Generator (`report_generator.py`)
- Renders comprehensive 12-section reports explaining *why* an assessment was assigned:
  1. Product & Listing Metadata
  2. Overall Trust Assessment & Risk Tier
  3. Modality-Level Assessment Breakdown
  4. Positive Evidence (Corroborating Consistency)
  5. Negative Evidence (Anomalies & Discrepancies)
  6. Supporting Review Evidence
  7. Supporting Image Evidence
  8. Supporting Price Evidence
  9. Seller Identity & Governance Status
  10. Graph & Relationship Evidence
  11. Missing Information & Offline Blockers
  12. Confidence, Limitations & Recommended Next Steps

### 3.6 API Service Orchestrator (`api_service.py`)
- High-level `TrustIntelligenceEngine` class wrapping all subsystems into clean, decoupled service methods:
  - `get_product_evidence(pid)`
  - `get_listing_evidence(lid)`
  - `assess_product(pid)`
  - `assess_listing(lid)`
  - `assess_seller(sid)`
  - `compare_products([pid1, pid2, ...])`
  - `generate_report(pid, format_type='markdown'|'json')`
  - `get_entity_subgraph(entity_id, depth=1)`
