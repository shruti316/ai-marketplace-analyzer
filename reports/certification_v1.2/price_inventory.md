# Price Observation and Stock Semantics Report (v1.2)

## 1. Price Observation Breakdown

| Metric | Measured Value | Notes / Provenance |
| :--- | :---: | :--- |
| **Total Price Observations** | **6,043** | Exactly 1 observation per catalog product |
| **Valid Non-Null Prices** | **5,153** | 3,623 Indian (INR) + 1,530 Supplementary (USD) |
| **Documented Missing Prices** | **890** | BestBuy 249 + Amazon US 621 + Flipkart 15 + Myntra 5 |
| **Stock Status: IN_STOCK** | **5,123** | Active selling price evidenced |
| **Stock Status: OUT_OF_STOCK** | **18** | Explicitly supported by crawl metadata |
| **Stock Status: UNKNOWN** | **902** | Omitted in crawl; honestly documented as UNKNOWN |

---

## 2. Point-in-Time Reality
- All observations represent static crawl snapshots (`STATIC_CRAWL_SNAPSHOT`).
- No synthetic longitudinal curves or fake time-series prices have been fabricated.
