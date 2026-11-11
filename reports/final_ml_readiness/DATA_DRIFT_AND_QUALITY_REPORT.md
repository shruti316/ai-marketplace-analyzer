# Catalog Data Drift, Covariate Shift & Quality Monitoring Report

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Target Marketplaces:** Amazon India, Flipkart, Myntra  
**Component:** Production Quality & Drift Monitoring Engine (`CatalogDriftDetector`)  
**Release Target:** Final ML Readiness (V1.0 Baseline / Multimodal Vision V1.1)  
**Execution Timestamp:** 2026-11-11  

---

## 1. Executive Summary

E-commerce marketplaces undergo continuous dynamic evolution. Catalogs experience festive seasonal shifts (e.g. Diwali sales, Great Indian Festival), category vocabulary shifts, seller churn, and crawling pipeline ingestion delays.

If statistical properties of incoming listing feeds drift significantly from the frozen calibration reference (`indian_marketplace_trust_dataset_v1_7`), model predictions can degrade.

To guard against silent model failure, we designed and validated the **`CatalogDriftDetector`** (`src/monitoring/catalog_drift_detector.py`). It monitors:
1. **Missing Modality Rates** across the 5 fusion streams.
2. **Marketplace & Category Distribution Drift** using the Population Stability Index (PSI).
3. **Continuous Feature Covariate Shift** using 2-sample Kolmogorov-Smirnov (KS) tests and quantile-binned PSI.
4. **Prediction Score Drift** to detect model output distortion.

---

## 2. Statistical Drift Monitoring Methodology

### 2.1 Categorical Population Stability Index (PSI)
For categorical distributions (Marketplaces, Categories):
$$\text{PSI} = \sum_{k=1}^K (q_k - p_k) \ln\left(\frac{q_k + \epsilon}{p_k + \epsilon}\right)$$
Where $p_k$ is the baseline reference proportion and $q_k$ is the target batch proportion.

### 2.2 Continuous Covariate Shift (Two-Sample Kolmogorov-Smirnov Test & Binned PSI)
For continuous features (e.g. $\log(\text{INR Price})$, discount %, review sentiment, calibrated risk):
$$D = \sup_x |F_{\text{baseline}}(x) - F_{\text{target}}(x)|$$
Where $F(x)$ represents the empirical cumulative distribution function (eCDF). A 10-bin reference quantile discretization is simultaneously applied to calculate a continuous PSI score.

---

## 3. Production Alert Triage & Drift Severity Policy

| Drift Severity Level | PSI Cutoff | KS Test Significance | Actionable Operational Protocol |
|----------------------|------------|----------------------|---------------------------------|
| **NEGLIGIBLE** | $\text{PSI} < 0.10$ | $p \ge 0.05$ | **Normal Operations:** System stable; predictions fully trustworthy. |
| **MODERATE** | $0.10 \le \text{PSI} < 0.25$ | $p < 0.05 \land \text{PSI} \ge 0.05$ | **Engineering Alert:** Log monitoring warning; trigger automated sampling of 100 listings for data engineering inspection. |
| **CRITICAL_RECALIBRATION_REQUIRED** | $\text{PSI} \ge 0.25$ | $p < 0.001 \land \text{PSI} \ge 0.15$ | **Recalibration Alert:** Isolate incoming crawl batch; halt automated risk classification; trigger policy recalibration or retrain challenger model. |

---

## 4. Baseline Catalog Statistical Snapshot ($N = 3,643$)

The reference distribution parameters frozen in dataset v1.7 establish the ground baseline for all future monitoring:

### 4.1 Marketplace Balance
- **Amazon India:** $41.17\%$ ($1,500$ canonical products)
- **Flipkart:** $31.38\%$ ($1,143$ canonical products)
- **Myntra:** $27.45\%$ ($1,000$ canonical products)

### 4.2 Missing Modality Rates

| Modality Stream | Baseline Missing Rate | Missing Rate Alert Threshold | Zero-Penalty Gating |
|-----------------|-----------------------|------------------------------|---------------------|
| **Pricing Stream** | $0.00\%$ | $> 5.0\%$ | $m_0 = 0 \implies \Delta \text{Risk} \le 0$ |
| **Review Stream** | $14.28\%$ | $> 30.0\%$ | $m_1 = 0 \implies \Delta \text{Risk} \le 0$ |
| **Vision Stream (Images)** | $2.14\%$ | $> 10.0\%$ | $m_2 = 0 \implies \Delta \text{Risk} \le 0$ |
| **CLIP Stream** | $2.14\%$ | $> 10.0\%$ | $m_3 = 0 \implies \Delta \text{Risk} \le 0$ |
| **Relationship Graph** | $0.00\%$ | $> 5.0\%$ | $m_4 = 0 \implies \Delta \text{Risk} \le 0$ |

---

## 5. Zero-Penalty Governance Invariant

A fundamental integrity requirement of the platform is that **data drift or ingestion pipeline degradation must NEVER penalize individual marketplace sellers**.

- If an ingestion crawler fails to scrape reviews or images for a seller's products, the missing rate on that batch will rise, triggering a `MODERATE` or `CRITICAL` drift alert to the data engineering team.
- At the individual product scoring level, the Gated Multimodal Unit (GMU) dynamically sets the availability mask $m_k = 0$, guaranteeing that missing reviews or absent images contribute **exactly 0 risk points**.
- Sellers with incomplete data are never misclassified as fraudsters due to crawl pipeline failures.

---

## 6. Automated Validation

The monitoring engine was validated through automated tests in `tests/test_drift_monitoring.py` (5 passing tests), verifying:
1. Exact zero PSI for stationary distributions.
2. Reliable detection of extreme covariate shift ($\text{PSI} \ge 0.25, p < 0.01$).
3. End-to-end generation of strongly typed `CatalogHealthReport` objects.
