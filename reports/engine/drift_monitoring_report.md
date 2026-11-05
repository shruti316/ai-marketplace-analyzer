# Drift Monitoring & Model Health Report — v1.7
## Marketplace Trust Intelligence Platform

### 1. Statistical Drift Framework & Thresholds

| Feature Domain | Statistical Test | Warning Threshold | Critical Threshold | Baseline Reference |
|---|---|---|---|---|
| **Price Distribution** | Two-Sample Kolmogorov-Smirnov & PSI | p < 0.05 or PSI >= 0.10 | p < 0.01 or PSI >= 0.25 | 5,153 valid prices in v1.7 |
| **Rating Distribution** | Two-Sample Kolmogorov-Smirnov & PSI | p < 0.05 or PSI >= 0.10 | p < 0.01 or PSI >= 0.25 | 56,697 reviews in v1.7 |
| **Category Distribution** | Total Variation Distance (TVD) | TVD >= 0.10 | TVD >= 0.20 | 10 product categories in v1.7 |
| **Visual Embeddings** | Centroid Cosine Distance Shift | Distance >= 0.08 | Distance >= 0.15 | 5,228 ResNet-18 embeddings in v1.7 |

---

### 2. Operational Monitoring Capabilities
- Evaluated on demand via `MarketplaceTrustAPI.check_system_drift()`.
- Alerts automatically categorize into `NORMAL`, `WARNING`, and `CRITICAL`.
- Generates structured diagnostic messages for production data engineering and model operations teams.
