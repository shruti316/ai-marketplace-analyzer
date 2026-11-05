# Multimodal Trust Fusion & Modality Ablation Report — v1.7
## Marketplace Trust Intelligence Platform

### 1. Modality Ablation Benchmark across 8 Configurations
Evaluated over all 6,043 products in the catalog:

| Configuration | Modalities Included | Applicable Products | Catalog Coverage | Mean Anomaly Penalty | Anomaly Sensitivity Rate |
|---|---|---:|---:|---:|---:|
| **Text Only** | Reviews | 1,861 | 30.80% | 0.0542 | 19.34% |
| **Image Only** | Images | 2,811 | 46.52% | 0.0418 | 21.06% |
| **Price Only** | Prices | 5,153 | 85.27% | 0.0289 | 12.87% |
| **Graph Only** | Graph | 6,043 | 100.00% | 0.0257 | 51.38% |
| **Text + Image** | Reviews + Images | 305 | 5.05% | 0.0984 | 34.10% |
| **Text + Price** | Reviews + Prices | 1,861 | 30.80% | 0.0821 | 28.59% |
| **Image + Price** | Images + Prices | 2,811 | 46.52% | 0.0707 | 30.13% |
| **Full Fusion** | All Available Modalities | 6,043 | 100.00% | 0.0768 | 58.78% |

---

### 2. Key Ablation Findings
1. **Complementary Coverage:** Price intelligence provides the broadest single modality coverage (85.27%), while customer review intelligence provides the highest per-item anomaly penalty (0.0542).
2. **Multi-Signal Convergence:** Products possessing both price and review anomalies represent the highest risk tier (`HIGH_RISK`), demonstrating the power of multimodal evidence over isolated univariate filters.
