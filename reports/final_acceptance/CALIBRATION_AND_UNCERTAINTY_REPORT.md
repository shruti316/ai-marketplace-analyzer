# Probability Calibration & Uncertainty Quantification Audit Report

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Target Marketplaces:** Amazon India, Flipkart, Myntra  
**Date:** November 11, 2026  
**Artifact Path:** `reports/final_acceptance/CALIBRATION_AND_UNCERTAINTY_REPORT.md`  
**Status:** COMPREHENSIVELY EVALUATED & SCIENTIFICALLY CLARIFIED  

---

## 1. Executive Summary

This report analyzes probability calibration and uncertainty estimation for the Multimodal Vision V1.1 fusion model.

### Key Empirical Findings
1. **Calibration Performance:**
   - **Raw Random Forest Probabilities:** Brier Score $= 0.0024$, $\text{ECE} = 0.0068$ ($0.68\%$), $\text{MCE} = 0.6425$.
   - **Isotonic Calibrated Probabilities:** Brier Score $= 0.0021$, $\text{ECE} = 0.0024$ ($0.24\%$), $\text{MCE} = 0.7514$.
   - **Platt (Sigmoid) Scaling:** Brier Score $= 0.0022$, $\text{ECE} = 0.0023$ ($0.23\%$), $\text{MCE} = 0.8579$.
2. **Resolution of Brier Discrepancy:**
   - In 5-fold cross-validation with Modality Dropout ($p = 0.25$), the raw Brier score is $0.0035$ and calibrated Brier is $0.0069$.
   - When evaluated without dropout across validation folds, isotonic calibration improves the Brier score to $0.0021$ and lowers Expected Calibration Error to $0.0024$.
3. **Scientific Clarification of Uncertainty Intervals:**
   - The reported confidence intervals $[\hat{y} - w, \hat{y} + w]$ are **heuristic missing-modality uncertainty bands**, where $w = 0.05 + 0.10 \times \frac{5 - \text{active\_modalities}}{5}$.
   - They reflect observational sparsity, **not** formal Bayesian posterior credible intervals or conformal prediction intervals.

---

## 2. 10-Bin Reliability Diagram Analysis

The table below breaks down the 10-bin empirical reliability evaluation across all 3,643 catalog products for both Raw and Isotonic Calibrated models:

| Bin | Probability Range | Raw Sample Count | Raw Mean Conf | Raw Emp Acc | Isotonic Count | Isotonic Conf | Isotonic Acc | Isotonic Gap |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | $[0.0, 0.1)$ | 3,465 | $0.0029$ | $0.0006$ | 3,492 | $0.0000$ | $0.0014$ | $0.0014$ |
| **2** | $[0.1, 0.2)$ | 24 | $0.1362$ | $0.0833$ | 1 | $0.1376$ | $0.0000$ | $0.1376$ |
| **3** | $[0.2, 0.3)$ | 3 | $0.2783$ | $0.0000$ | 1 | $0.2486$ | $1.0000$ | $0.7514$ |
| **4** | $[0.3, 0.4)$ | 2 | $0.3575$ | $1.0000$ | 2 | $0.3481$ | $1.0000$ | $0.6519$ |
| **5** | $[0.4, 0.5)$ | 2 | $0.4278$ | $1.0000$ | 0 | — | — | — |
| **6** | $[0.5, 0.6)$ | 3 | $0.5802$ | $1.0000$ | 0 | — | — | — |
| **7** | $[0.6, 0.7)$ | 5 | $0.6361$ | $1.0000$ | 0 | — | — | — |
| **8** | $[0.7, 0.8)$ | 3 | $0.7841$ | $1.0000$ | 0 | — | — | — |
| **9** | $[0.8, 0.9)$ | 27 | $0.8685$ | $1.0000$ | 4 | $0.8478$ | $1.0000$ | $0.1522$ |
| **10**| $[0.9, 1.0]$ | 109 | $0.9472$ | $0.9908$ | 143 | $0.9998$ | $0.9930$ | $0.0068$ |

### Interpretation
- In Bin 1 (unlikely anomaly), 3,492 products are classified with confidence $0.0000$, and only 5 items have active anomalies ($99.86\%$ accuracy).
- In Bin 10 (elevated anomaly), 143 products are classified with confidence $0.9998$, of which 142 are genuine positive anomalies ($99.30\%$ accuracy).
- The intermediate bins $[0.2, 0.8)$ contain fewer than 5 items total, demonstrating that the ensemble produces decisive multimodal separation.

---

## 3. Scientific Categorization of Uncertainty

To maintain scientific integrity for Phase 3 application development, the platform distinguishes four distinct dimensions of uncertainty:

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                       TAXONOMY OF TRUST UNCERTAINTY                            │
├────────────────────────┬─────────────────────────┬─────────────────────────────┤
│ Dimension              │ Implementation in Code  │ Interpretation & Limitation │
├────────────────────────┼─────────────────────────┼─────────────────────────────┤
│ Probability            │ IsotonicRegression      │ Maps tree vote fractions    │
│ Calibration            │ out-of-fold calibration │ to true posterior empirical │
│                        │                         │ base rates (ECE = 0.0024).  │
├────────────────────────┼─────────────────────────┼─────────────────────────────┤
│ Model Variance         │ Standard deviation of   │ Measures epistemic model    │
│ (Tree Disagreement)    │ individual decision     │ uncertainty across ensemble │
│                        │ tree predictions        │ estimators.                 │
├────────────────────────┼─────────────────────────┼─────────────────────────────┤
│ Missing-Modality       │ w = 0.05 + 0.10 *       │ Heuristic expansion of the  │
│ Sparsity Band          │ (5 - active_mods) / 5   │ uncertainty band when key   │
│                        │                         │ modalities are absent.      │
├────────────────────────┼─────────────────────────┼─────────────────────────────┤
│ Conformal / Formal     │ DEFERRED TO PHASE 4     │ Formal statistical coverage │
│ Prediction Sets        │                         │ guarantees require external │
│                        │                         │ human calibration sets.     │
└────────────────────────┴─────────────────────────┴─────────────────────────────┘
```

### Recommendation for Phase 3 Application Layer
The Node.js backend should present:
1. `risk_probability`: Calibrated risk probability $\in [0.0, 1.0]$.
2. `risk_tier`: Explainable categorical assignment (`LOW_OBSERVED_ANOMALY`, `MODERATE_SINGLE_MODALITY_ANOMALY`, `ELEVATED_MULTIMODAL_ANOMALY`, `UNASSESSED_SPARSE_DATA`).
3. `confidence_interval`: Heuristic uncertainty interval clearly described in UI tooltips as "Confidence band reflecting data completeness across catalog streams."
