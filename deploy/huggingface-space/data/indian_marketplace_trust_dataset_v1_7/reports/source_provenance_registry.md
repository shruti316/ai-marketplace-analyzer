# Source Provenance and Academic Registry (v1.1)

> [!NOTE]
> Every entity, image, review, and price observation in the Marketplace Trust Dataset v1.1 is cryptographically traceable to an approved raw scrape or academic dataset.

---

## 1. Provenance Registry Table

The dataset integrates evidence from 11 distinct sources across Indian e-commerce, international reference benchmarks, and synthetic stress testbeds:

| Source ID | Source Name | Marketplace | Country | License / Terms | Records Contributed | Audit Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `SRC_PROMPTCLOUD_AMZ_IN` | **PromptCloud Amazon India Product Scrape (Beauty, Skin Care, Grocery)** | amazon_in | `Research & benchmark analytics usage` | Prods: 1,500, Imgs: 1,500, Revs: 159 | `PERMITTED_RESEARCH_BENCHMARK` |
| `SRC_PROMPTCLOUD_FK_PROD` | **PromptCloud Flipkart Product Scrape (Mobiles, Computers, Electronics)** | flipkart | `Research & benchmark analytics usage` | Prods: 1,143, Imgs: 3,534, Revs: 0 | `PERMITTED_RESEARCH_BENCHMARK` |
| `SRC_PROMPTCLOUD_MYN_PROD` | **PromptCloud Myntra Product Scrape (Fashion, Apparel, Accessories)** | myntra | `Research & benchmark analytics usage` | Prods: 1,000, Imgs: 0, Revs: 0 | `PERMITTED_RESEARCH_BENCHMARK` |
| `SRC_KAGGLE_FK_REVS` | **Flipkart Customer Reviews Scrape (127 Electronics Product Lines)** | flipkart | `CC0 Public Domain / Open Research` | Prods: 0, Imgs: 0, Revs: 3,260 | `PERMITTED_PUBLIC_RESEARCH` |
| `SRC_AMAZON_INDIA_IMG_RECOVERY` | **Amazon India Primary Product Image Assets** | amazon_in | `Fair dealing for machine learning research and trust verification` | Prods: 0, Imgs: 1,500, Revs: 0 | `PERMITTED_RESEARCH_BENCHMARK` |
| `SRC_AMAZON_US_REVIEWS_2023` | **Amazon Reviews 2023 (Beauty & Personal Care, Gold Triple Modality Cohort)** | amazon | `Academic Research Use (UCSD / McAuley Lab)` | Prods: 1,020, Imgs: 520, Revs: 3,215 | `PERMITTED_ACADEMIC_RESEARCH` |
| `SRC_BESTBUY_REVIEWS_2024` | **BestBuy Electronics Customer Reviews & Product Ratings** | bestbuy | `Research & educational evaluation` | Prods: 249, Imgs: 0, Revs: 44,965 | `PERMITTED_RESEARCH_BENCHMARK` |
| `SRC_WALMART_PRODUCTS_2023` | **Walmart Retail Products, Prices, and Category Hierarchy** | walmart | `Research & benchmark analytics usage` | Prods: 1,131, Imgs: 0, Revs: 0 | `PERMITTED_RESEARCH_BENCHMARK` |
| `SRC_DECEPTIVE_OPINION_SPAM` | **Ott et al. Deceptive Opinion Spam Ground Truth Benchmark** | benchmark_isolated | `Open Research Use (Cornell University / Ott et al. ACL 2011)` | Prods: 0, Imgs: 0, Revs: 1,600 | `PERMITTED_ACADEMIC_RESEARCH` |
| `SRC_ECOMMERCE_FAKE_REVIEWS` | **E-Commerce Manipulated and Fake Reviews Benchmark** | benchmark_isolated | `Open Research Use` | Prods: 0, Imgs: 0, Revs: 40,526 | `PERMITTED_ACADEMIC_RESEARCH` |
| `SRC_SYNTHETIC_STRESS_CASES` | **Antigravity Multimodal Trust Architecture Stress Cases** | synthetic | `Internal Project IP` | Prods: 5, Imgs: 5, Revs: 5 | `PERMITTED_INTERNAL_TESTING` |

---

## 2. In-Depth Source Lineage

### 2.1 Indian Marketplace Product Crawls (Amazon India, Flipkart, Myntra)
- **Amazon India (`SRC_AMAZON_IN_PRODUCTS_2023`)**:
  - Origin: Scraped from Amazon India listings (`amazon.in`) across Consumer Electronics, Personal Care, and Household Goods.
  - Raw Location: `data/indian_marketplace/raw/amazon_india_products_raw.csv`.
  - Contribution: 1,500 products, 1,500 INR price observations, 1,500 localized hero images.
  - Transformation: Canonical ID prefixing (`amazon_in_{asin}`), INR currency harmonization, brand normalization.

- **Flipkart Products (`SRC_FLIPKART_PRODUCTS_2023`)**:
  - Origin: Scraped from Flipkart listings across Footwear, Apparel, Electronics, and Home Care.
  - Raw Location: `data/indian_marketplace/raw/flipkart_products_raw.csv`.
  - Contribution: 1,143 products, 932 verified local hero images, 1,143 price records.
  - Transformation: Canonical ID prefixing (`flipkart_{id}`), stock status extraction, image URL resolution.

- **Myntra Fashion Catalog (`SRC_MYNTRA_PRODUCTS_2023`)**:
  - Origin: Scraped from Myntra fashion catalog covering Men's and Women's apparel and accessories.
  - Raw Location: `data/indian_marketplace/raw/myntra_products_raw.csv`.
  - Contribution: 1,000 products, 1,000 INR price observations, 0 local images (URLs cataloged in acquisition manifest).
  - Transformation: Canonical ID prefixing (`myntra_{id}`), category standardization.

### 2.2 Customer Review Repositories
- **Flipkart Reviews Scrape (`SRC_FLIPKART_REVIEWS_KAGGLE`)**:
  - Origin: Publicly available Flipkart product review collection from Kaggle.
  - Raw Location: `data/indian_marketplace/raw/flipkart_reviews_raw.csv`.
  - Contribution: 3,500 genuine Indian reviews (3,260 linked to 127 products; 240 preserved unlinked).
  - Semantics: Scrape lacked verified buyer flag; `verified_purchase_status` is documented as `NOT_SUPPLIED`.

- **Amazon India Beauty Reviews (`SRC_AMAZON_IN_REVIEWS_BEAUTY`)**:
  - Origin: Amazon Customer Reviews Dataset (All_Beauty cohort filtered for Indian marketplace ASINs).
  - Raw Location: `data/raw/amazon/all_beauty_reviews.parquet`.
  - Contribution: 159 genuine customer reviews linked to 5 complete multimodal Amazon India products.
  - Verification: Genuine Amazon verified purchase tags preserved (`VERIFIED_TRUE` / `VERIFIED_FALSE`).

- **BestBuy Electronics Reviews (`SRC_BESTBUY_REVIEWS_2024`)**:
  - Origin: Kaggle BestBuy Electronics Reviews Dataset.
  - Raw Location: `data/raw/bestbuy/`.
  - Contribution: 44,965 reviews linked to 249 electronics products. Provides dense rating distributions for rating-text sentiment contradiction modeling.

- **Amazon US Multi-Category Reviews (`SRC_AMAZON_US_REVIEWS_2023`)**:
  - Origin: Amazon Customer Reviews Dataset (McAuley Lab / UCSD).
  - Raw Location: `data/raw/amazon/`.
  - Contribution: 3,215 reviews (2,667 linked to 100 Gold multimodal products; 548 linked to 500 review-dense products).

### 2.3 Supplementary Product Benchmarks
- **Walmart US Products (`SRC_WALMART_PRODUCTS_2023`)**:
  - Origin: Kaggle Walmart Product Catalog.
  - Raw Location: `data/raw/walmart/`.
  - Contribution: 1,131 products with positive USD prices and detailed descriptions. Provides pricing reference baselines.

### 2.4 External Calibration & Stress Benchmarks
- **Deceptive Opinion Spam (`SRC_DECEPTIVE_OPINION_SPAM`)**:
  - Origin: Ott et al. (2011, 2013) Cornell University benchmark.
  - Raw Location: `data/benchmarks/deceptive_opinion_spam/`.
  - Contribution: 1,600 reviews with gold standard truth/deception labels (400 truthful positive, 400 deceptive positive, 400 truthful negative, 400 deceptive negative).
  - Role: NLP Deception score calibration without catalog leakage.

- **E-Commerce Fake Reviews Benchmark (`SRC_ECOMMERCE_FAKE_REVIEWS`)**:
  - Origin: Kaggle Fake E-Commerce Review dataset.
  - Raw Location: `data/benchmarks/ecommerce_fake_reviews/`.
  - Contribution: 40,526 labeled reviews (20,263 computer-generated fake, 20,263 authentic).
  - Role: Synthetic text pattern detection calibration.

- **Synthetic Stress Test Cases (`SRC_SYNTHETIC_STRESS_CASES`)**:
  - Origin: Handcrafted pipeline stress test vectors.
  - Contribution: 5 extreme edge cases (negative pricing, 10,000 char emoji spam, 1x1 corrupt images, null payloads, SQLi).
