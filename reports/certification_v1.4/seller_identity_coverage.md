# Workstream C: Seller Identity & Graph Expansion

## 1. Problem Statement & Root Cause (LIM-02)
Standard e-commerce web scrapes capture consumer-facing listing details but omit backend merchant entities (such as GSTIN, CIN, or legal entity names).
In previous versions, `seller_id` on products was left as NULL. In v1.4, this design choice is formally codified and defended.

## 2. Honest Seller Modeling
- **Zero Fabrication:** No synthetic seller IDs (e.g. `SELLER_001`) have been invented.
- **Aggregate Platform Merchants:** Exactly 6 platform aggregate entities are modeled in `entities/sellers.parquet`:
  1. `SELLER_AGG_AMAZON_IN`: Aggregate marketplace merchants for Amazon India.
  2. `SELLER_AGG_FLIPKART`: Aggregate marketplace merchants for Flipkart India.
  3. `SELLER_AGG_MYNTRA`: Aggregate retail suppliers for Myntra India.
  4. `SELLER_AGG_AMAZON_US`: Aggregate merchants for Amazon US.
  5. `SELLER_AGG_BESTBUY`: Verified first-party retail entity for BestBuy.
  6. `SELLER_AGG_WALMART`: Aggregate third-party merchants for Walmart US.
- All aggregate third-party merchants are marked `UNVERIFIED_THIRD_PARTY_MERCHANT` with documented crawl limitations.
- BestBuy is marked `VERIFIED_FIRST_PARTY`.

## 3. Future Graph Expansion
When external crawls expose GSTIN / merchant registration, the schema seamlessly links `products.seller_id` directly to verified legal entity nodes in the trust relationship graph.
