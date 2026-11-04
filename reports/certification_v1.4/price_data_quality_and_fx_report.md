# Workstream D: Price Data Quality, Dynamic FX & Anomaly Engine

## 1. Dynamic FX Reference Table Architecture
In v1.3, currency conversion relied on a static constant (₹83.25/USD). In v1.4, currency conversion is upgraded to a versioned, traceable reference table:
- Path: `evidence/fx_conversion_rates.parquet`
- Source: Reserve Bank of India (RBI) Reference Rates & Financial Benchmarks India Pvt. Ltd. (FBIL).
- Records: 9 historical fixings from 2023 to 2026.
- Benchmark Fixing for Dataset Crawl: **2023-11-01 (₹83.2500 / USD)**.

## 2. Stock Status Semantics & Missing Prices
- Exactly 5,153 products have valid, active numeric prices.
- Exactly 890 products have documented missing prices (163 Flipkart products, 727 Supplementary products).
- Missing price is **never assumed to indicate OUT_OF_STOCK**. Unless explicit source stock availability is present, stock status is accurately mapped to `UNKNOWN` or `UNAVAILABLE`.

## 3. Robust Category-Aware Anomaly Engine
Implemented in `src/pricing/anomaly_engine.py`:
- Employs category-aware Tukey's IQR fences ($Q_1 - 1.5 \cdot IQR, Q_3 + 1.5 \cdot IQR$).
- Minimum category sample size threshold: $N \ge 10$ (falls back to global distribution for small categories).
- Isolation Forest outlier detection: 258 anomalous prices identified (5.01% of catalog).
