# Source Inventory and Provenance Registry (v1.2)

> [!NOTE]
> All 11 raw source inputs are registered with immutable SHA-256 hashes, documented usage permissions, and explicit crawl limitations.

---

## 1. Upstream Source Registry Table

| Source ID | Source Name | Marketplace | License / Permitted Use | Products | Reviews | Images |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `SRC_PROMPTCLOUD_AMZ_IN` | PromptCloud Amazon India Product Scrape (Beauty, Skin Care, Grocery) | `amazon_in` | `PERMITTED_RESEARCH_BENCHMARK` | 1,500 | 159 | 1,500 |
| `SRC_PROMPTCLOUD_FK_PROD` | PromptCloud Flipkart Product Scrape (Mobiles, Computers, Electronics) | `flipkart` | `PERMITTED_RESEARCH_BENCHMARK` | 1,143 | 0 | 3,534 |
| `SRC_PROMPTCLOUD_MYN_PROD` | PromptCloud Myntra Product Scrape (Fashion, Apparel, Accessories) | `myntra` | `PERMITTED_RESEARCH_BENCHMARK` | 1,000 | 0 | 0 |
| `SRC_KAGGLE_FK_REVS` | Flipkart Customer Reviews Scrape (127 Electronics Product Lines) | `flipkart` | `PERMITTED_PUBLIC_RESEARCH` | 0 | 3,260 | 0 |
| `SRC_AMAZON_INDIA_IMG_RECOVERY` | Amazon India Primary Product Image Assets | `amazon_in` | `PERMITTED_RESEARCH_BENCHMARK` | 0 | 0 | 1,500 |
| `SRC_AMAZON_US_REVIEWS_2023` | Amazon Reviews 2023 (Beauty & Personal Care, Gold Triple Modality Cohort) | `amazon` | `PERMITTED_ACADEMIC_RESEARCH` | 1,020 | 8,073 | 520 |
| `SRC_BESTBUY_REVIEWS_2024` | BestBuy Electronics Customer Reviews & Product Ratings | `bestbuy` | `PERMITTED_RESEARCH_BENCHMARK` | 249 | 44,965 | 0 |
| `SRC_WALMART_PRODUCTS_2023` | Walmart Retail Products, Prices, and Category Hierarchy | `walmart` | `PERMITTED_RESEARCH_BENCHMARK` | 1,131 | 0 | 0 |
| `SRC_DECEPTIVE_OPINION_SPAM` | Ott et al. Deceptive Opinion Spam Ground Truth Benchmark | `benchmark_isolated` | `PERMITTED_ACADEMIC_RESEARCH` | 0 | 1,600 | 0 |
| `SRC_ECOMMERCE_FAKE_REVIEWS` | E-Commerce Manipulated and Fake Reviews Benchmark | `benchmark_isolated` | `PERMITTED_ACADEMIC_RESEARCH` | 0 | 40,526 | 0 |
| `SRC_SYNTHETIC_STRESS_CASES` | Antigravity Multimodal Trust Architecture Stress Cases | `synthetic` | `PERMITTED_INTERNAL_TESTING` | 5 | 5 | 5 |


---

## 2. Integrity Commitments
- **Zero Synthetic Content Presented as Real Evidence:** All synthetic stress cases are isolated in Tier C.
- **Traceable Identifiers:** Every entity carries a foreign key to `source_id`.
- **Honest Missing Data:** Upstream crawl omissions (e.g., missing seller IDs, uncaptured prices) are preserved as explicit nulls.
