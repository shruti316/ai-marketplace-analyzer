# Comparison: Dataset Release v1.1 vs. Release v1.2

| Dimension | Release v1.1 | Release v1.2 | Delta / Improvement in v1.2 |
| :--- | :---: | :---: | :--- |
| **Complete Multimodal Core (Tier A)** | 105 products | **305 products** | **+200 products (+190.5% increase)** |
| **Amazon US Gold Coverage** | 100 products | **300 products** | **+200 products (100% of Gold cohort restored)** |
| **Amazon India Multimodal Core** | 5 products | **5 products** | Maintained 100% verified baseline |
| **Total Customer Reviews** | 51,839 | **56,697** | **+4,858 reviews restored (0 filtered out)** |
| **Total Image Records** | 5,554 | **5,554** | Gold image paths verified in cache |
| **Total Graph Edges** | 62,317 | **67,175** | **+4,858 review edges + new variant edges** |
| **Product Variants Table** | Not normalized | **`product_variants.parquet` (772 rows)** | Normalized variant clusters for Myntra, Amazon, Walmart |
| **Review Accounting Filtered** | 4,858 filtered | **0 filtered (100% retained)** | Complete reconciliation achieved |
| **Automated Validator Checks** | 76 checks | **159 checks** | **+83 additional invariant checks** |
| **Full Regression Suite** | 207 tests | **221 tests** | **+14 formal pytest release tests** |
