# Workstream L: Comparative Analysis — Release v1.3 vs Release v1.4

| Metric / Dimension | Release v1.3 | Release v1.4 | Delta / Improvement |
| :--- | :--- | :--- | :--- |
| **Total Products** | 6,043 | 6,043 | 0 (Preserved Master) |
| **Indian Products** | 3,643 (60.28%) | 3,643 (60.28%) | 0 (Preserved Domestic Primacy) |
| **Supplementary Products** | 2,400 (39.72%) | 2,400 (39.72%) | 0 (Preserved Supplementary) |
| **Total Reviews Retained** | 56,697 (100%) | 56,697 (100%) | 0 (100% Retained) |
| **Usable Images** | 5,228 | 5,228 | 0 (Preserved) |
| **Gold Recovered Images** | 300 | 300 | 0 (Verified on disk) |
| **Price Observations** | 6,043 | 6,043 | 0 (Preserved) |
| **Dynamic FX Architecture** | Static scalar ₹83.25 | **`evidence/fx_conversion_rates.parquet` (9 RBI fixings)** | Traceable Central Bank Benchmark |
| **Variant Overlap Leakage** | 64 variant parent groups (142 prods) | **0 groups (Protocol 2 Variant-Held-Out)** | Complete Variant Leakage Elimination |
| **Reviewer Overlap Leakage** | 2,160 multi-product reviewers | **0 named reviewers (Protocol 3 Reviewer-Held-Out)** | Complete Reviewer Leakage Elimination |
| **Duplicate Image Leakage** | 0 clusters (Protocol 1) | **0 clusters across all protocols** | Fully Protected |
| **AI Model Readiness** | Precomputed feature stores only | **Trained & benchmarked transparent ML models** | TF-IDF+LR, IQR/IForest, dHash, Fusion RF |
| **Validation Checks** | 162 checks passed | **169 checks passed (100%)** | +7 automated protocol assertions |
| **Pytest Suite** | 236 tests passed | **255 tests passed (100%)** | +19 dedicated v1.4 tests |
| **Historical Immutability** | v1.1 & v1.2 Frozen | **v1.1, v1.2 & v1.3 Frozen** | Triple-Release Immutability Verified |
