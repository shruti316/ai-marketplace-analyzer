# Workstream F: Computer Vision Data Quality, Resolution & Duplicate Taxonomy

## 1. Visual Asset Inventory
- Total image records in master: **5,554**.
- Usable physical images: **5,228 (94.13%)**.
- Documented missing/failed downloads: **326 (5.87%)**.
- Recovered Gold Standard images: **300 images** (100% verified present on disk).

## 2. Image Resolution & Dimension Distribution
- Minimum resolution: 100 x 100 px.
- Median resolution: 800 x 800 px.
- High-resolution (>1000 px): 42.1% of usable catalog.
- Low-resolution (<300 px): 3.2% of usable catalog (flagged with `low_resolution_warning=True`).

## 3. Resolution of Hash Collisions vs Graph Edges
Clarified in `src/vision/duplicate_taxonomy.py`:
- Exact dHash collisions (Hamming distance == 0): **60 disjoint clusters** containing 128 images.
- Near-duplicate visual graph edges (Hamming distance $\le 4$ across products): **337 pairwise relationship edges** in `relationships/entity_relationships.parquet`.
- Evaluation Split Protection: All 60 duplicate clusters are strictly isolated within individual splits in Protocol 1, ensuring 0 cross-split visual memorization.
