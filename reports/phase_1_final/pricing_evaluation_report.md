# Pricing Intelligence & Anomaly Evaluation Report

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Phase:** Phase 1 Final — Scientific Architecture Finalization  
**Specification:** [`reports/phase_1_final/pricing_evaluation_report.md`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/reports/phase_1_final/pricing_evaluation_report.md)  
**Methodology:** Non-Parametric Median Absolute Deviation (MAD) & Statutory MRP Guardrails  

---

## 1. Pricing Observations & Benchmark Coverage

- **Total Price Observations:** 3667
- **Currency Normalization:** INR (100% Indian Marketplace Provenance)
- **Benchmark Peer Categories:** 0 categories
- **Minimum Benchmark Sample Size:** $N \ge 5$ (Mean $N = 45.0$)
- **Statistical Invariant:** Corridors are only computed when peer group size satisfies $N \ge 5$.

---

## 2. Statistical Outliers vs Statutory MRP Breaches

| Anomaly Signal Category | Count Observed | Percentage | Regulatory & Scientific Status |
| :--- | :---: | :---: | :--- |
| **Robust Corridor Outliers ($|z| \ge 3.0$)** | 444 | 12.11% | Statistical dispersion; NOT proof of fraud. |
| **Extreme Outliers ($|z| \ge 5.0$)** | 353 | 9.63% | Deep discount clearances or premium editions. |
| **Extreme Discount Anomaly ($\ge 90\%$)** | 2 | 0.05% | Potential promotional badge distortion. |
| **Statutory MRP Breaches ($SP > MRP$)** | **0** | **0.00%** | **ZERO breaches** (100% statutory price compliance). |

---

## 3. Robust Z-Score Threshold Sensitivity

| Robust $z$-Score Threshold | Anomaly Count | Catalog Percentage | Operational Action |
| :---: | :---: | :---: | :--- |
| **$|z| \ge 2.0$** | 567 | 15.56% | Informational Monitoring |
| **$|z| \ge 2.5$** | 451 | 12.38% | Informational Monitoring |
| **$|z| \ge 3.0$** | 353 | 9.69% | Corroboration Flag |
| **$|z| \ge 3.5$** | 287 | 7.88% | Corroboration Flag |
| **$|z| \ge 4.0$** | 245 | 6.73% | Corroboration Flag |

---

## 4. Policy Separation Rationale
> [!IMPORTANT]
> **No Fraud Accusations Based on Pricing Alone:**  
> A product offered at a steep discount is not automatically counterfeit, nor is an expensive niche item automatically deceptive. Statistical price dispersion is strictly treated as an **atomic anomaly signal** requiring multi-modal corroboration before risk elevation.
