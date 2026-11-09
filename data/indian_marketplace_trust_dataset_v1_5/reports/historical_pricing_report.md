# Historical Pricing & Price Corridor Report — Indian Marketplace Trust Dataset v1.4

## 1. Executive Summary
Documents the append-only pricing architecture, observation provenance, and robust pricing corridor baselines across the 3,643 products.

## 2. Observation Provenance & Depth
- **Total Price Observations:** 3,667 records in `evidence/price_observations.parquet`.
- **Primary Scrape Observations:** 3,643 observations captured during primary catalog crawls.
- **Review-Corroborated Observations:** 24 historical price points corroborated from customer review text mentions.
- **Timestamp Standard:** 100% of observations formatted in strict ISO-8601 UTC timestamps.

## 3. Robust Statistical Pricing Corridors
To prevent distortion from extreme price outliers, corridors are computed using median and interquartile range (IQR) by subcategory:
\[ z_{\text{robust}} = \frac{p - \text{median}}{\text{IQR}} \]

- **Subcategories Analyzed:** 341 subcategories.
- **High Corridor Deviations:** Products with $|z_{\text{robust}}| > 2.5$ are flagged in `pricing_features.parquet`.
- **Separation from Fraud:** In `annotations/listing_annotations.parquet`, high price deviations are classified as `PRICE_ANOMALY_SIGNAL` (39 records) rather than fraudulent listings.
