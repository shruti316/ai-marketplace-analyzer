# Model Card: Statistical Pricing Intelligence Engine (`statistical_pricing_anomaly`)

## Model Details
- **Model Name:** Non-Parametric Robust Pricing Corridor Analyzer
- **Model Version:** 1.2.0
- **Model Type:** Median Absolute Deviation (MAD) robust z-score estimator + dispersion tracker
- **Frameworks:** Python 3.11, SciPy, NumPy, Pandas
- **Artifact:** Derived price corridor tables in `pricing_derived.parquet`

## Intended Use
- Detect predatory discount inflation (fictitious MRPs showing artificial $80\%+$ markdowns).
- Identify price volatility and unauthorized grey-market sellers through cross-seller dispersion metrics.

## Evaluation & Metrics
- **Corridor Outlier Detection Margin:** Flags prices with $|z_{\text{MAD}}| \ge 3.0$.
- **Dispersion Threshold:** Cross-seller price dispersion $> 0.60$.
- **Ablation Performance:** Unimodal ROC-AUC $0.6828$, PR-AUC $0.1657$. Provides stable continuous signals when fused into the multimodal network.

## Limitations
- Volatile categories (e.g., clearance electronics or refurbished goods) naturally exhibit higher baseline price variance.
