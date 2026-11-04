# Dataset v1.5 Graph Integrity & Relationship Audit

Total Relationship Edges: **67,175**.
Stored in: `relationships/entity_relationships.parquet`.

## Edge Types Distribution
| Relationship Type | Source Entity | Target Entity | Edge Count |
| :--- | :--- | :--- | :--- |
| `HAS_REVIEW` | Product | Review | 56,457 |
| `HAS_IMAGE` | Product | Image | 5,228 |
| `HAS_PRICE` | Product | Price Observation | 5,153 |
| `IMAGE_PERCEPTUAL_DUPLICATE_OF` | Image | Image | 263 |
| `IMAGE_EXACT_DUPLICATE_OF` | Image | Image | 74 |
| **Total** | - | - | **67,175** |

## Seller Entity Modeling
- Product `seller_id` is 100% NULL (0 invented IDs).
- Aggregate platform entities are modeled in `entities/sellers.parquet` (6 aggregate merchants).
- No GCN fraud detection is claimed without trained graph neural networks on valid ground truth.
