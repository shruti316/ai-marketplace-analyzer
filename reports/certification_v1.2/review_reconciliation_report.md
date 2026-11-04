# Review Reconciliation and Accounting Report (v1.2)

> [!IMPORTANT]
> **100% Retention Achieved**: All 56,697 customer reviews across all 5 raw sources are retained. Zero reviews filtered out.

---

## 1. Source-Wise Review Accounting Table

| Source | Input Count | Retained | Filtered | Linked | Unlinked | Exclusion / Inclusion Reason |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| BestBuy Electronics Customer Reviews | 44,965 | 44,965 | 0 | 44,965 | 0 | None - 100% retained for BestBuy 249 product cohort. |
| Amazon Reviews 2023 (Gold 300 Cohort) | 7,525 | 7,525 | 0 | 7,525 | 0 | None - 100% retained in v1.2; all 4,858 previously excluded Gold reviews restored. |
| Amazon Reviews 2023 (Amazon 500 Review-Dense Cohort) | 548 | 548 | 0 | 548 | 0 | None - 100% retained for Amazon US 500 product cohort. |
| Flipkart Customer Reviews Scrape (Kaggle) | 3,500 | 3,500 | 0 | 3,260 | 240 | None - 100% retained (3,260 linked to 127 recovered products; 240 preserved unlinked). |
| Amazon India Recovered Reviews (All Beauty) | 159 | 159 | 0 | 159 | 0 | None - Newly recovered for 5 Amazon India complete multimodal products. |


---

## 2. Reconciliation of the 4,858 Review Discrepancy
In release v1.1, 4,858 Gold reviews were excluded because their parent products were omitted due to unpopulated `local_path` fields. In v1.2, all 300 Gold products were forensically matched to verified image files in `data/raw/images/cache/`, restoring all 200 omitted products and all 4,858 reviews.
