# Seller Identity and Governance Audit
**Indian Marketplace Multimodal Trust Dataset v1.6**
*AI-Powered Indian Marketplace Trust Intelligence Platform*
*Release Date: November 9, 2026*

---

## 1. Executive Summary

A core vulnerability in many synthetic or unvetted marketplace datasets is "merchant conflation"—falsely treating platform corporate operators (e.g. Amazon Seller Services Private Limited, Flipkart Internet Private Limited) as individual 3rd-party retail merchants, or inventing artificial seller IDs when none exist in the raw source data.

Milestone 5 executes a rigorous **Seller Identity and Governance Audit** across the entire dataset. This audit establishes:
1. Ground-truth verification that individual merchant store IDs and GSTINs were omitted in the upstream crawls.
2. Complete elimination of synthetic seller identities.
3. Strict enforcement of the **Honest Null Standard** in `products.parquet` (`products.seller_id` is 100% null).
4. Formal modeling of certified **Platform Aggregate Merchant Pools** in `entities/sellers.parquet` and `derived_evidence/seller_features.parquet`.
5. Explicit foreign key resolution in `entities/listings.parquet` linking each listing to its platform aggregate fulfillment pool.

---

## 2. Raw Source Data Investigation

An exhaustive grep and schema inspection was conducted across all raw upstream crawl files located in `data/indian_marketplace/raw/products/`:

### 2.1 Amazon India Raw Crawl (`amazon_india_products_raw.csv`)
- **Records Inspected:** 1,500 catalog rows.
- **Fields Present:** Product title, category tree, ASIN/SKU, selling price, MRP, ratings, reviews, specifications JSON, and image URLs.
- **Merchant Fields:** No merchant name, merchant ID, seller store link, or GSTIN was captured during the crawl.
- **Result:** Third-party retail merchant identities are completely absent in the source data.

### 2.2 Flipkart Raw Crawl (`flipkart_products_raw.csv`)
- **Records Inspected:** 1,143 catalog rows.
- **Fields Present:** Product name, category tree, PID, retail price, discounted price, product rating, overall rating, brand, product specification, and description.
- **Keyword Audit:** A substring search for `"seller"` across all specification strings matched exactly 11 listings.
- **Inspection of Matches:** All 11 matches were warranty and service boilerplate strings (e.g., *"Installation and demo for this product is done free of cost as part of this purchase. Service will be provided by the seller or the brand within 48 to 72 hours of delivery"*).
- **Result:** No merchant identifier, store rating, or GSTIN exists in the Flipkart crawl.

### 2.3 Myntra Raw Crawl (`myntra_products_raw.csv`)
- **Records Inspected:** 1,000 catalog rows.
- **Fields Present:** Product ID, product name, brand, gender, category, subcategory, colour, style_attributes, and pricing.
- **Merchant Fields:** Myntra operates predominantly as a direct marketplace catalog; no seller identifiers or third-party store names were recorded.
- **Result:** Zero merchant-level identifiers exist in the raw Myntra crawl.

---

## 3. Seller Governance Principles

To maintain absolute data integrity and research credibility, the platform enforces three strict governance rules:

### Principle 1: No Conflation of Platforms with Merchants
A platform operator (e.g. Amazon India) is a multi-sided digital marketplace and logistics orchestrator, not a single monolithic retail merchant. Labeling Amazon India as a merchant with a unified fraud or trust risk score conflates millions of independent merchants into one entity.

### Principle 2: Honest Null Standards
In `entities/products.parquet`, `seller_id` is preserved as strictly `NULL` (`None`) across all 3,643 rows.
- Field: `products.seller_id`
- Null Count: **3,643 of 3,643 (100.0%)**
- Associated Metadata: `products.seller_id_semantics = 'HONEST_NULL_AGGREGATE_MERCHANT'`
This documents that merchant identities were omitted upstream, preventing any downstream model from hallucinating individual merchant features.

### Principle 3: Platform Aggregate Merchant Modeling
In `entities/listings.parquet` and `entities/sellers.parquet`, listings are linked via foreign key to formal **Platform Aggregate Merchant Nodes**. These nodes represent the collective pool of third-party merchants operating under each platform's fulfillment infrastructure.

---

## 4. Certified Seller Entity Schemas

Four seller entities are maintained in `entities/sellers.parquet`:

| Seller ID | Platform ID | Marketplace | Seller Display Name | Operator Corporate Entity | Seller Type | Is Individual Merchant | Resolution Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `SELLER_AGG_AMAZON_IN` | `PLATFORM_AMAZON_IN` | `amazon_in` | Amazon India Aggregate Merchant Pool | Amazon Seller Services Private Limited | `PLATFORM_AGGREGATE` | `False` | `UNRESOLVED_THIRD_PARTY_MERCHANT` |
| `SELLER_AGG_FLIPKART` | `PLATFORM_FLIPKART` | `flipkart` | Flipkart Marketplace Aggregate Merchant Pool | Flipkart Internet Private Limited | `PLATFORM_AGGREGATE` | `False` | `UNRESOLVED_THIRD_PARTY_MERCHANT` |
| `SELLER_AGG_MYNTRA` | `PLATFORM_MYNTRA` | `myntra` | Myntra Marketplace Aggregate Merchant Pool | Myntra Designs Private Limited | `PLATFORM_AGGREGATE` | `False` | `UNRESOLVED_THIRD_PARTY_MERCHANT` |
| `SELLER_UNRESOLVED_THIRD_PARTY` | `PLATFORM_MULTI` | `all` | Unresolved Third-Party Marketplace Retail Merchants | UNRESOLVED_RETAIL_ENTITIES | `UNRESOLVED_MERCHANT_POOL` | `True` | `AWAITING_SOURCE_DATA` |

---

## 5. Operational and Reputation Profiling

Detailed operational metrics are computed and persisted in `derived_evidence/seller_features.parquet`:

| Metric | Amazon India Pool | Flipkart Pool | Myntra Pool |
| :--- | :--- | :--- | :--- |
| **Total Catalog Listings** | 1,500 | 1,143 | 1,000 |
| **Unique Brands Represented** | 897 | 549 | 168 |
| **Top Brand (by listings)** | *CHOCOCRAFT* (74) | *Allure Auto* (48) | *Anouk* (34) |
| **Categories Represented** | 2 | 22 | 4 |
| **Subcategories Represented**| 48 | 247 | 48 |
| **Min Observed Price (INR)** | ₹55.00 | ₹65.00 | ₹149.00 |
| **Max Observed Price (INR)** | ₹24,125.00 | ₹79,999.00 | ₹12,999.00 |
| **Median Observed Price** | ₹680.00 | ₹499.00 | ₹899.00 |
| **Mean Observed Price** | ₹1,556.12 | ₹1,438.45 | ₹1,124.78 |
| **Price IQR (INR)** | ₹1,150.00 | ₹950.00 | ₹950.00 |
| **Fulfillment Breakdown** | 1,500 Amazon Fulfilled | 1,094 Standard Merchant, 49 Flipkart Advantage | 1,000 Myntra Direct |
| **Total Linked Reviews** | 159 | 3,500 | 0 (unlinked upstream) |
| **Mean Review Sentiment** | +0.428 (Positive) | +0.472 (Positive) | Null (No reviews) |
| **Pricing Anomalies Count** | 167 | 212 | 65 |
| **Governance Classification**| `PLATFORM_OPERATOR_PROXY` | `PLATFORM_OPERATOR_PROXY` | `PLATFORM_OPERATOR_PROXY` |
| **Data Quality Flag** | `AGGREGATE_PROXY_METADATA_LIMITATION` | `AGGREGATE_PROXY_METADATA_LIMITATION` | `AGGREGATE_PROXY_METADATA_LIMITATION` |

---

## 6. Audit Conclusion

The seller intelligence infrastructure in Dataset v1.6 strictly satisfies all governance and integrity standards:
1. No synthetic merchant profiles or artificial GSTINs were manufactured.
2. All 3,643 listings have verified foreign keys to platform aggregate merchant nodes.
3. `products.seller_id` remains 100% honestly null.
4. Downstream trust models can utilize platform fulfillment features while respecting the boundary between platform operators and individual merchants.
