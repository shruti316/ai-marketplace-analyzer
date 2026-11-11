# Evidence Provenance & Event-Level Deduplication Implementation Report

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Target Marketplaces:** Amazon India, Flipkart, Myntra  
**Date:** November 11, 2026  
**Artifact Path:** `reports/vision_v1_1_hardening/EVIDENCE_PROVENANCE_IMPLEMENTATION.md`  
**Milestone:** V1.1 Hardening & Evidence Integrity — Workstream 1  
**Status:** IMPLEMENTED & EMPIRICALLY VERIFIED  

---

## 1. Context & Problem Statement

In the target provenance audit (`reports/final_acceptance/TARGET_PROVENANCE_AND_LEAKAGE_REPORT.md`), a critical structural circularity was uncovered in the supervision target $y \in \{0, 1\}$ (`overall_risk_tier == "ELEVATED_MULTIMODAL_ANOMALY"`):

1. **Target Formulation:** The target is assigned when $\ge 2$ active anomaly modalities are observed for a product listing.
2. **Double-Counting Mechanism:** Of the 154 positive items in the dataset, **137 ($88.96\%$)** were elevated because a single physical asset sharing event was captured twice in upstream derived tables:
   - Modality 1 (`IMAGE_CV`): `image_intelligence_features.parquet` marked `is_cross_product_image_reuse = True` (anomaly type `CROSS_PRODUCT_IMAGE_REUSE`).
   - Modality 2 (`GRAPH_TOPOLOGY`): `entity_relationships.parquet` contained an edge with `relationship_type = "SHARED_IMAGE_BETWEEN_PRODUCTS"` (anomaly type `CROSS_PRODUCT_GRAPH_LINK_ANOMALY`).
3. **The Circularity:** Because both modalities evaluated the exact same image asset, the system registered 2 "active anomaly modalities" for what was fundamentally **one single physical event**. When the machine learning model was trained with both `cv_is_cross_product_reuse` and `graph_degree_centrality`, it learned to reconstruct this deterministic 2-view link rather than discovering independent multi-modal corroboration.

---

## 2. Technical Architecture of the Hardened Solution

To resolve this circularity and prevent downstream consumers from mistaking multi-view observations for independent corroboration, we implemented an **Event-Level Provenance & Correlation Architecture**:

```
[Physical Reality: Asset Sharing]
           │
           ├── Asset: img_vis_cluster_00000 (shared across 38 products)
           │
           ▼
[Event-Level Normalization Layer]
  evidence_event_id    = "EVENT_VISUAL_REUSE_img_vis_cluster_00000"
  correlation_group_id = "CORR_CROSS_PRODUCT_IMAGE_ASSET"
           │
           ├───────────────────────────────┬───────────────────────────────┐
           ▼                                                               ▼
[View 1: IMAGE_CV Modality]                                     [View 2: GRAPH_TOPOLOGY Modality]
  evidence_id: ev_img_reuse_amazon_in_B008617U3K_0                evidence_id: ev_graph_shared_img_...
  evidence_event_id: EVENT_VISUAL_REUSE_img_vis_cluster_00000      evidence_event_id: EVENT_VISUAL_REUSE_img_vis_cluster_00000
  correlation_group_id: CORR_CROSS_PRODUCT_IMAGE_ASSET             correlation_group_id: CORR_CROSS_PRODUCT_IMAGE_ASSET
  source_ref: DERIVED_EVIDENCE_IMAGE_INTELLIGENCE                  source_ref: ENTITY_RELATIONSHIPS
           │                                                               │
           └───────────────────────────────┬───────────────────────────────┘
                                           ▼
                 [MultimodalFusionEngine.analyze_cross_modal_correlation]
                   ├── Grouping: (EVENT_VISUAL_REUSE_img_vis_cluster_00000, CORR_CROSS_PRODUCT_IMAGE_ASSET)
                   ├── Subsumed Modality: GRAPH_TOPOLOGY marked as multi-view representation
                   ├── is_single_physical_event: True
                   └── independent_corroboration_count: 1 (NOT 2)
```

---

## 3. Implementation Details

### 3.1 Contract Enhancements (`src/trust_engine/contracts.py`)

`UnifiedEvidenceItem` was extended with backwards-compatible provenance fields:
- `evidence_event_id: Optional[str]`: Unique deterministic identifier for the underlying real-world event (e.g. `EVENT_VISUAL_REUSE_img_vis_cluster_00000`).
- `correlation_group_id: Optional[str]`: Taxonomic grouping for correlated signals (e.g. `CORR_CROSS_PRODUCT_IMAGE_ASSET`).
- `related_product_ids: List[str]`: Canonical IDs of peer catalog products sharing this asset.
- `source_reference: Optional[str]`: Physical provenance trace back to the generating dataset partition and primary key.
- `modality_status: ModalityStatus`: Explicit availability state (`OBSERVED`, `UNAVAILABLE`, `PROCESSING_FAILED`, `NOT_APPLICABLE`).

`ProductTrustAssessment` was enriched with:
- `correlated_findings: List[Dict[str, Any]]`: Explicit structured declarations of multi-view correlations.
- `independent_corroboration_count: int`: Deduplicated count of truly independent physical anomaly events.

### 3.2 Evidence Engine Indexing (`src/trust_engine/evidence_engine.py`)

In `UnifiedEvidenceEngine._load_tables()`:
- `self.product_to_visual_cluster: Dict[str, str]` maps each product to its visual cluster ID.
- `self.cluster_to_products: Dict[str, List[str]]` tracks all peer products sharing the cluster.
- When generating `IMAGE_CV` reuse items:
  `evidence_event_id = f"EVENT_VISUAL_REUSE_{cluster_str}"`
  `correlation_group_id = "CORR_CROSS_PRODUCT_IMAGE_ASSET"`
  `related_product_ids = [peers]`
  `source_reference = f"DERIVED_EVIDENCE_IMAGE_INTELLIGENCE:{iid}"`
- When generating `GRAPH_TOPOLOGY` shared image items:
  `evidence_event_id = f"EVENT_VISUAL_REUSE_{cluster_str}"`
  `correlation_group_id = "CORR_CROSS_PRODUCT_IMAGE_ASSET"`
  `related_product_ids = [peer_id]`
  `source_reference = f"ENTITY_RELATIONSHIPS:{edge['relationship_id']}"`

### 3.3 Fusion & Assessment Orchestration (`src/trust_engine/multimodal_fusion.py` & `trust_assessment.py`)

`MultimodalFusionEngine.analyze_cross_modal_correlation`:
- Scans all active anomaly items.
- Aggregates by `(evidence_event_id, correlation_group_id)`.
- If $|\text{modalities}| > 1$, emits a structured record:
  ```json
  {
    "event_id": "EVENT_VISUAL_REUSE_img_vis_cluster_00000",
    "correlation_group_id": "CORR_CROSS_PRODUCT_IMAGE_ASSET",
    "modalities": ["GRAPH_TOPOLOGY", "IMAGE_CV"],
    "is_single_physical_event": true,
    "explanation": "Modalities ['GRAPH_TOPOLOGY', 'IMAGE_CV'] both observe the same physical event (EVENT_VISUAL_REUSE_img_vis_cluster_00000). This finding represents multiple views of a single asset link, not independent cross-modal corroboration."
  }
  ```
- Decrements the active modality count to establish `independent_corroboration_count`.

---

## 4. Empirical Validation & Test Results

The implementation was validated via automated integration tests in `tests/test_vision_v1_1_hardening.py`:

| Test Name | Target Invariant | Result | Evidence |
| :--- | :--- | :---: | :--- |
| `test_cross_modal_image_graph_event_linkage` | CV and Graph shared image items share identical `evidence_event_id` and `correlation_group_id` | **PASSED** | Verified on `amazon_in_B008617U3K` |
| `test_fusion_engine_correlation_analysis` | `analyze_cross_modal_correlation` identifies multi-view representations and computes `independent_corroboration_count` | **PASSED** | Grouped 2 views into 1 physical event |
| Full Repository Suite | All 571 existing + 13 new tests pass without regressions | **PASSED** | 584 / 584 tests passing |

---

## 5. Architectural Guidance for Phase 3 Backend Developers

1. **Do NOT Count Modalities Blindly:** When presenting trust metrics in the frontend UI or risk dashboards, do not sum raw positive modality flags. Always inspect `independent_corroboration_count`.
2. **Present Correlated Findings as a Unified Card:** In the React UI, display the shared hero image and the graph relationship link within a single "Visual Asset Reuse" card, highlighting the list of `related_product_ids`.
3. **Trace Provenance Cleanly:** Use `source_reference` for audit drill-downs, linking to the specific edge ID or image record without querying raw filesystem paths.
