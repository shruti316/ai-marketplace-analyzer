# Seller Intelligence and Merchant Availability Audit Report (v1.1)

> [!IMPORTANT]
> **Forensic Audit Finding**: Raw crawl data for all 6 marketplaces omitted individual third-party merchant IDs. The dataset enforces 100% honest null seller attribution.

---

## 1. Forensic Audit of Raw Marketplace Crawls

To investigate whether merchant identities could be recovered, data engineers conducted line-by-line inspection of all raw crawl source files:

1. **`amazon_india_products_raw.csv`**: Crawl captured ASIN, title, price, image URL, category. Seller ID field was entirely absent.
2. **`flipkart_products_raw.csv`**: Crawl captured product ID, title, retail price, discounted price, category tree. Merchant field was absent.
3. **`myntra_products_raw.csv`**: Crawl captured style ID, brand, price, category. Seller ID was absent.
4. **`walmart_products_raw.csv`**: Crawl captured item ID, name, list price. Seller ID was absent.
5. **`bestbuy/`**: Review collection captured SKU, review text, rating. Seller ID was absent.
6. **`amazon/`**: Metadata captured ASIN, title, brand. Seller ID was absent.

---

## 2. Strict Refusal of Synthetic Seller Identities

In commercial marketplace trust benchmarks, generating fake merchant IDs (e.g. `seller_12345`) with synthetic fraud ratings creates severe data falsification.
- **The Platform Decision**: In `products.parquet`, `seller_id` is **100% null (`None`)**.
- **Empirical Honesty**: The platform explicitly documents that merchant-level network graphs cannot be grounded in this crawl data.

---

## 3. Platform Aggregate Merchant Entities

To support schema-compliant relational foreign keys without creating false individual merchant identities, the `sellers.parquet` table defines 6 platform aggregate merchant entities representing the overarching retail platform policies:

| Seller Entity ID | Platform Merchant Name | Marketplace | Verification Status | Documented Products |
| :--- | :--- | :--- | :--- | :--- |
| `SELLER_AGG_AMAZON_IN` | **Amazon.in Marketplace Merchants** | amazon_in | `UNVERIFIED_THIRD_PARTY_MERCHANT` | `PLATFORM_AGGREGATE_MERCHANTS` | Individual merchant IDs omitted in upstream scrape cache. |
| `SELLER_AGG_FLIPKART` | **Flipkart Marketplace Merchants** | flipkart | `UNVERIFIED_THIRD_PARTY_MERCHANT` | `PLATFORM_AGGREGATE_MERCHANTS` | Individual merchant IDs omitted in upstream scrape cache. |
| `SELLER_AGG_MYNTRA` | **Myntra Fashion Merchants** | myntra | `UNVERIFIED_THIRD_PARTY_MERCHANT` | `PLATFORM_AGGREGATE_MERCHANTS` | Individual merchant IDs omitted in upstream scrape cache. |
| `SELLER_AGG_AMAZON_US` | **Amazon US 1P & 3P Merchants** | amazon | `UNVERIFIED_THIRD_PARTY_MERCHANT` | `PLATFORM_AGGREGATE_MERCHANTS` | Merchant details aggregated from public benchmark. |
| `SELLER_AGG_BESTBUY` | **BestBuy Retail** | bestbuy | `VERIFIED_FIRST_PARTY` | `FIRST_PARTY_RETAILER` | Direct retail store inventory. |
| `SELLER_AGG_WALMART` | **Walmart Stores & Marketplace** | walmart | `UNVERIFIED_THIRD_PARTY_MERCHANT` | `HYBRID_RETAIL_MARKETPLACE` | Store vs third-party merchant separation not captured. |

All entities are classified as `UNVERIFIED_THIRD_PARTY_MERCHANT` with platform policies documented.
