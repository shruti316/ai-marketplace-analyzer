# Seller Identity and Reputation Audit (v1.2)

## 1. Forensic Seller Identity Findings

- **Raw Scrape Omissions:** None of the upstream crawls for Amazon India, Flipkart, Myntra, Amazon US, or Walmart captured unique seller IDs.
- **Strict Data Truthfulness:** `seller_id` is set to `None` for all 6,043 products in `entities/products.parquet`.
- **Platform Aggregates:** 6 aggregate merchant entities are documented in `entities/sellers.parquet` to provide structural compatibility without inventing fake merchant ratings.
- **BestBuy First-Party:** BestBuy 249 products are certified as `VERIFIED_FIRST_PARTY` direct retail inventory.
