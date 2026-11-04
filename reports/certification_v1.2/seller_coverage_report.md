# Seller Coverage and Merchant Entity Report (v1.2)

## 1. Documented Platform Merchants

| Seller ID | Platform | Seller Name | Type | Verification Status |
| :--- | :--- | :--- | :--- | :--- |
| `SELLER_AGG_AMAZON_IN` | `amazon_in` | Amazon.in Marketplace Merchants | PLATFORM_AGGREGATE | UNVERIFIED_THIRD_PARTY_MERCHANT |
| `SELLER_AGG_FLIPKART` | `flipkart` | Flipkart Marketplace Merchants | PLATFORM_AGGREGATE | UNVERIFIED_THIRD_PARTY_MERCHANT |
| `SELLER_AGG_MYNTRA` | `myntra` | Myntra Fashion Merchants | PLATFORM_AGGREGATE | UNVERIFIED_THIRD_PARTY_MERCHANT |
| `SELLER_AGG_AMAZON_US` | `amazon` | Amazon US 1P & 3P Merchants | PLATFORM_AGGREGATE | UNVERIFIED_THIRD_PARTY_MERCHANT |
| `SELLER_AGG_BESTBUY` | `bestbuy` | BestBuy Retail | FIRST_PARTY_RETAILER | VERIFIED_FIRST_PARTY |
| `SELLER_AGG_WALMART` | `walmart` | Walmart Stores & Marketplace | HYBRID_RETAIL | UNVERIFIED_THIRD_PARTY_MERCHANT |

---

## 2. Data Integrity Policy
Upstream commercial scrapes completely omitted merchant identifiers. In strict compliance with scientific integrity rules, `seller_id` remains 100% `None` in `entities/products.parquet`. Zero fake seller ratings, reputation scores, or counterfeit seller IDs have been synthesized.
