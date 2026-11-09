# Seller & Brand Identity Audit — Indian Marketplace Trust Dataset v1.4

## 1. Executive Summary
This audit evaluates the grounding of marketplace merchants, platform operators, and registered brands across the 3,643 Indian marketplace products.

## 2. Platform Operator Entities
Marketplace platforms operate as digital multi-vendor infrastructure rather than merchant retailers:
- **`PLATFORM_AMAZON_IN`**: Amazon Seller Services Private Limited (Amazon India)
- **`PLATFORM_FLIPKART`**: Flipkart Internet Private Limited (Flipkart Marketplace)
- **`PLATFORM_MYNTRA`**: Myntra Designs Private Limited (Myntra Fashion Marketplace)

All 3 platforms are registered in `entities/platforms.parquet` and connected to listings via 3,643 `HOSTED_ON_PLATFORM` graph edges.

## 3. Merchant Resolution Status
Upstream PromptCloud web crawls for Amazon India, Flipkart, and Myntra did not record individual third-party retail merchant store IDs or GSTINs.
To avoid synthetic data fabrication:
- 3 platform aggregate merchant nodes (`SELLER_AGG_AMAZON_IN`, `SELLER_AGG_FLIPKART`, `SELLER_AGG_MYNTRA`) are recorded with `is_individual_merchant=False`.
- 1 unresolved third-party merchant pool entity (`SELLER_UNRESOLVED_THIRD_PARTY`) explicitly isolates uncaptured retail merchants with `is_individual_merchant=True` and `merchant_resolution_status='AWAITING_SOURCE_DATA'`.
- Zero misleading `SOLD_BY` platform edges exist in the knowledge graph.

## 4. Brand Entity Disambiguation
- **Total Registered Brands:** 1,593 distinct brands identified across product titles and brand attributes.
- **Top Brands by Catalog Size:**
- **24 Mantra Organic**: 2 products
- **3nh**: 3 products
- **4700Bc**: 1 products
- **47krate**: 1 products
- **612 league**: 1 products
- **720 Armour**: 1 products
- **7Hevn**: 1 products
- **7Seven**: 1 products
- **999store**: 1 products
- **99Auth**: 1 products
- **Knowledge Graph Grounding:** 3,643 `BELONGS_TO_BRAND` edges link each canonical product to its disambiguated brand entity.
