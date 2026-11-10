# Longitudinal Price Monitoring Readiness Report — v1.8
## AI-Powered Marketplace Trust Intelligence Platform

**Date:** 2026-11-04  
**Audit Scope:** Temporal Price Collection Architecture, $T_0$ Baseline Preservation, and Dynamic Price Manipulation Algorithms.

---

### 1. The Temporal Limitation & Non-Fabrication Guarantee

> [!IMPORTANT]
> The current certified release dataset contains **a single cross-sectional snapshot ($T_0$)**.  
> In strict accordance with the Master Engineering Rules:
> - **Zero synthetic $T_1$ or $T_2$ price observations were fabricated.**
> - True longitudinal tracking (e.g. Diwali pre-sale price hikes vs flash sale drops) requires prospective real-world cron polling.
> - The platform implements the **append-only schema and anomaly algorithms**, ready for scheduled ingestion.

---

### 2. Immutable $T_0$ Baseline Ledger

The initial baseline state has been serialized to `data/monitoring/price_snapshots_longitudinal.parquet`:
- **Total Registered $T_0$ Observations:** 6,043 products.
- **Valid Listing Prices:** 5,153 products (85.27%).
- **Unpriced / Missing Price Listings:** 890 products (14.73%).

| Marketplace | Total $T_0$ Listings | Valid Price Count | Mean Price (Local Currency) |
|---|---:|---:|---:|
| **amazon** | 1,020 | 399 | 27.37 USD |
| **amazon_in** | 1,500 | 1,485 | 2009.69 INR |
| **bestbuy** | 249 | 0 | 0.00 N/A |
| **flipkart** | 1,143 | 1,138 | 2801.19 INR |
| **myntra** | 1,000 | 1,000 | 1297.96 INR |
| **walmart** | 1,131 | 1,131 | 102.75 USD |

---

### 3. Dynamic Temporal Anomaly Detection Framework

The service evaluates:
1. **Sudden Price Surge:** An increase $\Delta P > +50\%$ over baseline without specification change ($+0.25$ penalty).
2. **Discount Inflation (Fake Clearance):** An artificial MRP mark-up $\Delta \text{MRP} > +25\%$ accompanied by an advertised 'deep discount' ($+0.35$ penalty).
3. **Rolling Volatility:** Standard deviation over rolling 30-day window to identify price-gouging volatility.
