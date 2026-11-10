# Entity Relationship Graph Intelligence Report

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Phase:** Phase 1 Final — Scientific Architecture Finalization  
**Specification:** [`reports/phase_1_final/graph_evaluation_report.md`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/reports/phase_1_final/graph_evaluation_report.md)  
**Database:** Parquet-Native Bipartite Entity Relationship Graph  

---

## 1. Graph Topology & Connected-Component Metrics

- **Total Graph Nodes:** 28185
- **Total Relational Edges:** 41372
- **Independent Connected Components:** 1
- **Provenance Standard:** 100% of graph edges contain explicit relation_type, source_id, target_id, and provenance metadata.

---

## 2. Relational Edge Distribution

| Relationship Type | Edge Count | Description & Semantic Meaning |
| :--- | :---: | :--- |
| **`HAS_IMAGE`** | 4708 | Bipartite catalog linkage with verified provenance. |
| **`HAS_PRICE_OBSERVATION`** | 3667 | Bipartite catalog linkage with verified provenance. |
| **`HAS_REVIEW`** | 3659 | Bipartite catalog linkage with verified provenance. |
| **`HAS_LISTING`** | 3643 | Bipartite catalog linkage with verified provenance. |
| **`HAS_VARIANT`** | 3643 | Bipartite catalog linkage with verified provenance. |
| **`HOSTED_ON_PLATFORM`** | 3643 | Bipartite catalog linkage with verified provenance. |
| **`BELONGS_TO_BRAND`** | 3643 | Bipartite catalog linkage with verified provenance. |
| **`SELLER_OFFERS_LISTING`** | 3643 | Bipartite catalog linkage with verified provenance. |
| **`LISTING_OF_PRODUCT`** | 3643 | Bipartite catalog linkage with verified provenance. |
| **`LISTING_ON_PLATFORM`** | 3643 | Bipartite catalog linkage with verified provenance. |
| **`HAS_PRICE`** | 3623 | Bipartite catalog linkage with verified provenance. |
| **`SHARED_IMAGE_BETWEEN_PRODUCTS`** | 214 | Bipartite catalog linkage with verified provenance. |

---

## 3. Seller Identity Governance & Honest Null Standards

- **Total Sellers Registered:** 4
- **Platform Aggregate Fulfillment Pools:** 3
- **Individual 3rd-Party Merchants:** 0

> [!CAUTION]
> **No Fabricated Seller Identities:**  
> Upstream marketplace scrapes omitted individual merchant GSTIN tax IDs. The platform enforces **honest null modeling**: seller nodes represent platform aggregate merchant pools (e.g. RetailNet, Cloudtail, Myntra Dedicated). The platform strictly forbids fabricating synthetic seller reputation scores.
