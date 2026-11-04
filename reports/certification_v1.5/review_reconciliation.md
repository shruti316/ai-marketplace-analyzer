# Dataset v1.5 Review Reconciliation Report

Total Customer Reviews: **56,697**.

## Marketplace Distribution & Linkage Status
| Marketplace | Total Reviews | Linked Reviews | Unlinked Reviews | Linkage Type |
| :--- | :--- | :--- | :--- | :--- |
| **BestBuy** | 44,965 | 44,965 | 0 | EXACT_PRODUCT_ID |
| **Amazon US** | 8,073 | 8,073 | 0 | EXACT_PRODUCT_ID |
| **Flipkart** | 3,260 | 3,260 | 0 | EXACT_PRODUCT_LINE_IDENTITY |
| **Uncertain (Flipkart)** | 240 | 0 | 240 | UNLINKED (Quarantined) |
| **Amazon India** | 159 | 159 | 0 | EXACT_ASIN_MATCH |
| **Total** | **56,697** | **56,457** | **240** | - |

## Audit Notes
- In previous v1.4 narrative reports, a prospective uningested cohort was mistakenly cited (BestBuy 4,812, Amazon US 25,482, Walmart 21,667).
- In v1.5, review provenance is 100% reconciled against the actual Parquet evidence table (`evidence/reviews.parquet`).
