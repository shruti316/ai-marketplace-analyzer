# Price & Temporal Intelligence Audit Report — v1.7
## Marketplace Trust Intelligence Platform

**Execution Timestamp:** 2026-11-04  
**Total Product Entities Analyzed:** 6,043  
**Valid Price Observations:** 5,153 (85.27%)  
**Missing / Unpriced Observations:** 890 (14.73%)  

---

### 1. Price Validity by Marketplace

| Marketplace | Total Products | Valid Prices | Missing / Unpriced | Coverage Rate | Primary Currency |
|---|---:|---:|---:|---:|---|
| **Amazon India** | 1,500 | 1,485 | 15 | 99.00% | INR (₹) |
| **Flipkart** | 1,143 | 1,138 | 5 | 99.56% | INR (₹) |
| **Walmart** | 1,131 | 1,131 | 0 | 100.00% | USD ($) |
| **Myntra** | 1,000 | 1,000 | 0 | 100.00% | INR (₹) |
| **Amazon US** | 1,020 | 399 | 621 | 39.12% | USD ($) |
| **BestBuy** | 249 | 0 | 249 | 0.00% | USD ($) |
| **Total** | **6,043** | **5,153** | **890** | **85.27%** | — |

---

### 2. Price Distribution and Anomaly Metrics

| Category | Valid Count | Median Price (INR) | MAD (INR) | Extreme High Outliers | Extreme Low Outliers | Deep Discount (>85%) |
|---|---:|---:|---:|---:|---:|---:|
| **Beauty & Personal Care** | 1,466 | ₹1,190.0 | ₹900.5 | 143 | 0 | 2 |
| **Books & Stationery** | 214 | ₹1,842.7 | ₹1,319.5 | 29 | 0 | 0 |
| **Clothing & Fashion** | 1,567 | ₹845.0 | ₹351.0 | 138 | 0 | 4 |
| **Electronics** | 797 | ₹2,379.3 | ₹1,780.3 | 126 | 0 | 0 |
| **Grocery & Household Essentials** | 368 | ₹595.0 | ₹303.0 | 35 | 0 | 0 |
| **Home & Kitchen** | 294 | ₹1,332.0 | ₹963.0 | 62 | 0 | 0 |
| **Industrial & Scientific** | 14 | ₹389.5 | ₹185.5 | 0 | 0 | 0 |
| **Other** | 380 | ₹1,448.5 | ₹866.6 | 63 | 0 | 0 |
| **Sports & Outdoors** | 12 | ₹300.5 | ₹51.5 | 0 | 0 | 0 |
| **Toys & Games** | 41 | ₹724.3 | ₹596.3 | 2 | 0 | 0 |

---

### 3. Temporal Multi-Snapshot Audit & Policy Compliance
- **Snapshot T0 (Baseline):** `BATCH_20261102_BASELINE_T0` is the single verified historical observation.
- **Rule 1 (Zero Data Fabrication):** In strict accordance with platform directives, no synthetic price histories, fake past dates, or artificial price drop trajectories were manufactured.
- **Longitudinal Mathematical Engine:** The schema implements multi-snapshot delta, price velocity (\(\Delta P / \Delta t\)), and coefficient of variation volatility metrics, ready to compute signals once longitudinal observation `BATCH_T1` is acquired.
