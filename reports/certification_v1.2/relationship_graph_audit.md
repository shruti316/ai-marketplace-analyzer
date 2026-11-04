# Entity Relationship and Multimodal Graph Audit (v1.2)

## 1. Graph Edge Ontology & Counts

| Relationship Type | Source Entity | Target Entity | Edge Count | Role in Platform |
| :--- | :---: | :---: | :---: | :--- |
| `HAS_IMAGE` | PRODUCT | IMAGE | **5,228** | Connects product to usable hero/product image |
| `HAS_REVIEW` | PRODUCT | REVIEW | **56,457** | Connects product to linked customer review |
| `HAS_PRICE` | PRODUCT | PRICE_OBSERVATION | **5,153** | Connects product to valid price observation |
| `IMAGE_EXACT_DUPLICATE_OF` | IMAGE | IMAGE | **184** | Exact SHA-256 duplicate image collision |
| `IMAGE_PERCEPTUAL_DUPLICATE_OF` | IMAGE | IMAGE | **153** | Perceptual dHash d=0 visual duplicate |
| **Total Graph Edges** | **Bipartite & Similarity** | **Master Graph** | **67,175** | **Referentially Complete** |

---

## 2. Referential Integrity
- 100% of edge source product IDs exist in `entities/products.parquet`.
- 100% of edge target IDs exist in their respective evidence tables.
