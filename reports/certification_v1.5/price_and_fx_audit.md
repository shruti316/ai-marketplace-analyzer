# Dataset v1.5 Price Observations & FX Reference Audit

Total Price Observations: **6,043**.

## Observed vs. Missing Prices by Marketplace
| Marketplace | Currency | Total Products | Valid Numeric Prices | Missing / Unobserved | Stock Status Breakdown |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Amazon India | INR | 1,500 | 1,485 | 15 | IN_STOCK (1,485) / UNKNOWN (15) |
| Flipkart | INR | 1,143 | 1,138 | 5 | IN_STOCK (1,138) / UNKNOWN (5) |
| Walmart | USD | 1,131 | 1,131 | 0 | IN_STOCK (1,131) |
| Myntra | INR | 1,000 | 1,000 | 0 | IN_STOCK (1,000) |
| Amazon US | USD | 1,020 | 399 | 621 | IN_STOCK (399) / OUT_OF_STOCK / UNKNOWN (621) |
| BestBuy | USD | 249 | 0 | 249 | UNKNOWN / UNAVAILABLE (249) |
| **Total** | - | **6,043** | **5,153** | **890** | - |

## FX Normalization Semantics
- Indian Rupee (INR) Prices: Domestic identity conversion (`normalized_price_inr = original_price`).
- USD Prices: Normalized using official Reserve Bank of India (RBI) crawl benchmark fixing (2023-11-01 @ ₹83.2500 / USD).
- Stored reference rates: `evidence/fx_conversion_rates.parquet` (9 RBI reference rates from 2023 to 2024).
