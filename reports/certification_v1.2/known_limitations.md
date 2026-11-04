# Known Limitations and Frontier Boundaries (v1.2)

> [!WARNING]
> While dataset release v1.2 resolves the review reconciliation gap and expands Tier A to 305 products, specific empirical boundaries remain due to upstream scrape omissions:

---

## 1. Empirical Limitations Documented

1. **Merchant / Seller Identifiers:** Upstream PromptCloud scrapes omitted unique seller IDs. Handled by registering 6 platform aggregate merchant entities and setting `seller_id = None` in `products.parquet`.
2. **Missing Product Images (3,091 products):** Myntra (1,000), Walmart (1,131), BestBuy (249), Amazon US (500), and Flipkart review products (143) lack local image assets. Cataloged with search queries in `image_acquisition_manifest.csv`.
3. **Point-in-Time Pricing:** All prices represent static single-crawl snapshots (`STATIC_CRAWL_SNAPSHOT`). Longitudinal price tracking requires periodic continuous crawling.
4. **Disjoint Indian Modalities:** Flipkart review crawl (electronics) and product crawl (fashion) represent disjoint domains, precluding multi-modal triplets for Flipkart without live re-crawling.
