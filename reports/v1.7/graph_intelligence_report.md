# Graph Intelligence & Multi-Entity Topology Report — v1.7
## Marketplace Trust Intelligence Platform

**Execution Timestamp:** 2026-11-04  
**Total Graph Nodes:** 72,903  
**Total Graph Edges:** 87,954  
**Connected Components:** 1  

---

### 1. Heterogeneous Node Census

| Entity Type | Node Count | Description |
|---|---:|---|
| **PRODUCT** | 6,043 | Canonical marketplace product entities |
| **REVIEW** | 56,457 | Verified linked customer review entities |
| **IMAGE** | 5,228 | Decodable physical images on disk |
| **PRICE** | 5,153 | Validated selling price observations |
| **MARKETPLACE** | 6 | Marketplace domains (Amazon, Flipkart, etc.) |
| **CATEGORY** | 10 | Standardized product categories |
| **SELLER** | 6 | Verified platform-level seller entities |
| **Total Nodes** | **72,903** | Fully indexed multi-entity topology |

---

### 2. Relationship Edge Census

| Relationship Type | Edge Count | Description |
|---|---:|---|
| **HAS_REVIEW** | 56,457 | Product to Customer Review |
| **HAS_IMAGE** | 5,228 | Product to Usable Image File |
| **HAS_PRICE** | 5,153 | Product to Valid Price Observation |
| **SOLD_ON** | 6,043 | Product to Marketplace Domain |
| **BELONGS_TO_CATEGORY** | 6,043 | Product to Taxonomy Category |
| **SOLD_BY** | 6,043 | Product to Platform Seller Entity |
| **VARIANT_OF** | 2,957 | Intra-catalog variant family linkage |
| **CROSS_MARKETPLACE_CANDIDATE** | 30 | Cross-marketplace entity match candidate |
| **Total Edges** | **87,954** | Multi-relational evidence graph |

---

### 3. Graph Analysis & Modeling Defensibility
1. **Connectivity:** Due to structural edges (Marketplace, Category, Seller), the graph forms a single connected giant component.
2. **Evidence Isolation:** When filtering structural edges, 0 products have 0 linked reviews, images, or prices (Tier D catalog records).
3. **Graph Neural Network (GNN) Recommendation:** Supervised GNN training is withheld because fraud ground truth labels are absent. Graph topological degree and centrality are exported as tabular features for multimodal fusion.
