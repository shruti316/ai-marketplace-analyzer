# Graph Evidence Reconciliation & Topology Audit Report — v1.8
## AI-Powered Marketplace Trust Intelligence Platform

**Date:** 2026-11-04  
**Audit Scope:** Direct Evidence Relationships vs Heterogeneous Knowledge Graph, Endpoint Integrity, Orphan Entities, and False Risk Propagation Governance.

---

### 1. Structural Reconciliation: 67,175 Evidence Edges vs 87,954 Graph Edges

A core mandate of Workstream 8 was to clarify the exact structural relationship between:
1. `relationships/entity_relationships.parquet` (67,175 rows)
2. The full NetworkX Heterogeneous Graph (72,903 nodes, 87,954 edges).

#### Reconciliation Finding:
- **`entity_relationships.parquet`** records **direct empirical evidence linkages only**:
  - `HAS_REVIEW`: 56,457 edges linking products to verifiable reviews.
  - `HAS_IMAGE`: 5,228 edges linking products to physical image assets.
  - `HAS_PRICE`: 5,153 edges linking products to observed pricing records.
  - `IMAGE_PERCEPTUAL_DUPLICATE_OF`: 263 edges between near-duplicate images.
  - `IMAGE_EXACT_DUPLICATE_OF`: 74 edges between byte-identical images.
  - **Subtotal Evidence Edges:** **67,175 edges**.

- **Full Knowledge Graph (`graph_edges_v1_7.parquet`)** expands this topology with **ontological categorization and variant edges**:
  - `SOLD_ON`: 6,043 edges to Marketplace entities.
  - `BELONGS_TO_CATEGORY`: 6,043 edges to Category entities.
  - `SOLD_BY`: 6,043 edges to Seller entities.
  - `VARIANT_OF`: 2,957 edges between intra-catalog product variants.
  - `CROSS_MARKETPLACE_CANDIDATE`: 30 candidate cross-listing edges.
  - **Total Graph Edges:** **87,954 edges** across **72,903 nodes**.

---

### 2. Referential Integrity & Topology Audit

| Metric | Measured Value | Standard / Requirement | Verdict |
|---|---:|---:|:---:|
| **Missing Endpoint References** | **0** | Exactly 0 (Every edge must link valid nodes) | **VALIDATED** |
| **Orphan Product Nodes (Degree = 0)** | **0** | Exactly 0 (All products connected to ontology/evidence) | **VALIDATED** |
| **Total Connected Components** | **1** | Graph cleanly segmented into category/marketplace clusters | **VALIDATED** |

---

### 3. False Risk Propagation Governance

> [!IMPORTANT]
> **Common entities must NEVER cause transitive fraud contamination.**  
> - Two unrelated legitimate products selling on the same marketplace (e.g. `Flipkart`) or belonging to the same category (`Electronics`) share ontological nodes.  
> - The Trust Engine enforces strict edge-type filtering: risk penalties propagate **ONLY** across `IMAGE_EXACT_DUPLICATE_OF`, `IMAGE_PERCEPTUAL_DUPLICATE_OF`, and `VARIANT_OF` edges with an exponential damping factor ($\alpha = 0.50$, max 2 hops).  
> - Bipartite categorization edges (`SOLD_ON`, `BELONGS_TO_CATEGORY`, `SOLD_BY`) are strictly blocked from risk propagation.
