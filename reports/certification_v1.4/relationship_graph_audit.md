# Dataset v1.4 Relationship Graph Audit

Total graph relationship edges: **67,175 records**.
Stored in: `relationships/entity_relationships.parquet`.

## Edge Types Breakdown
| Relationship Type | Source Entity | Target Entity | Edge Count |
| :--- | :--- | :--- | :--- |
| `PRODUCT_HAS_REVIEW` | Product | Review | 53,104 |
| `PRODUCT_HAS_IMAGE` | Product | Image | 5,554 |
| `PRODUCT_HAS_PRICE` | Product | Price Observation | 6,043 |
| `PRODUCT_HAS_VARIANT` | Product | Product Variant | 538 |
| `PRODUCT_SHARES_IMAGE_DHASH` | Product | Product | 337 |
| `PRODUCT_SOLD_BY_SELLER` | Product | Seller (Aggregate) | 1,599 |
| **Total** | - | - | **67,175** |
