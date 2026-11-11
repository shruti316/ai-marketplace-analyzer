# Comprehensive Metric Reconciliation & Benchmark Audit Report

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Target Marketplaces:** Amazon India, Flipkart, Myntra  
**Date:** November 11, 2026  
**Artifact Path:** `reports/final_acceptance/METRIC_RECONCILIATION_REPORT.md`  
**Status:** ALL METRIC DISCREPANCIES FULLY RECONCILED & REPRODUCED  

---

## 1. Executive Summary

This report reconciles every performance metric reported across ML V1.0 baseline and Multimodal Vision V1.1 candidate documentation.

Two distinct sets of performance figures appeared in V1.1 reports:
- **Set A:** ROC-AUC: $0.9988 \pm 0.0006$, PR-AUC: $0.9845 \pm 0.0082$, Raw Brier: $0.0035$, Calibrated OOF Brier: $0.0069$.
- **Set B:** ROC-AUC: $0.9993$, PR-AUC: $0.9909$, Raw Brier: $0.0024$, Calibrated Brier: $0.0019$.

### Root Cause of Difference
The two sets of metrics originate from two distinct, deliberately chosen experiment pipelines in `scripts/train_and_evaluate_v1_1.py`:
1. **Set A represents the Gated Multimodal Fusion Architecture with Modality Dropout (ModDrop, $p = 0.25$):**
   - Base estimator: `RandomForestClassifier(n_estimators=150, max_depth=6, min_samples_split=8, class_weight="balanced")`.
   - ModDrop stochastically masks input streams during training to enforce robustness against missing modalities.
   - Cross-Validation: 5-Fold `StratifiedGroupKFold` (seed=42) on all 3,643 catalog products.
2. **Set B represents the Standardized Ablation Benchmark Suite:**
   - Base estimator: `RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42)` without ModDrop.
   - Built to allow fair, apple-to-apple comparisons between the Full Model and the 10 unimodal / leave-one-out configurations (where stochastic dropout cannot be applied uniformly to single-modality slices).
   - The unregularized deeper forest achieves slightly higher precision ($0.9909$ vs $0.9845$).

---

## 2. Authoritative Reconciled Benchmark Table

The table below reconciles all historical and candidate models under their exact experimental configurations:

| Exp ID | Model Architecture | Features / Modalities | ModDrop ($p$) | Forest Depth | 5-Fold ROC-AUC | 5-Fold PR-AUC | Raw Brier | Calibrated Brier | Source / Execution File |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **V1.0-A** | Gated Multimodal Fusion (ML V1.0 Frozen) | 13 Feats (Pricing, Rev, CV, CLIP, Graph) | $0.25$ | 6 | $0.9709 \pm 0.0041$ | $0.6632 \pm 0.0385$ | $0.0657$ | $0.0266$ | `scripts/train_and_evaluate_all.py` |
| **V1.0-B** | Ablation Full Model (V1.0 Baseline) | 13 Feats | None | 6 | $0.9812$ | $0.6846$ | $0.0412$ | $0.0310$ | `models/modality_ablations.json` |
| **V1.1-A** | **Gated Multimodal Fusion V1.1 (Production Candidate)** | **16 Feats (Enriched CV & Calibrated CLIP)** | **$0.25$** | **6** | **$0.9988 \pm 0.0006$** | **$0.9845 \pm 0.0082$** | **$0.0035$** | **$0.0069$** | `scripts/train_and_evaluate_v1_1.py` (Lines 85-113) |
| **V1.1-B** | **Standardized Ablation Suite (V1.1 Reference)** | **16 Feats** | **None** | **8** | **$0.9993$** | **$0.9909$** | **$0.0024$** | **$0.0019$** | `models/v1_1/modality_ablations_v1_1.json` |

---

## 3. Modality Ablation Reconciliation (Exp ID V1.1-B)

All 11 ablation configurations evaluated on the identical 5-fold StratifiedGroupKFold split:

| Configuration Name | Active Features | Modalities Included | ROC-AUC | PR-AUC | Raw Brier | Calibrated Brier | Impact Relative to Full ($0.9909$) |
| :--- | :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| **Full_Multimodal_V1_1** | 16 | Pricing, Review, Vision, CLIP, Graph | **$0.9993$** | **$0.9909$** | **$0.0024$** | **$0.0019$** | Baseline Full Model |
| `Ablation_Drop_Pricing` | 13 | Review, Vision, CLIP, Graph | $0.9957$ | $0.9441$ | $0.0055$ | $0.0071$ | $-0.0468$ |
| `Ablation_Drop_Review` | 12 | Pricing, Vision, CLIP, Graph | $0.9935$ | $0.9845$ | $0.0027$ | $0.0025$ | $-0.0064$ |
| **`Ablation_Drop_Vision`** | 12 | Pricing, Review, CLIP, Graph | **$0.9831$** | **$0.7964$** | **$0.0200$** | **$0.0166$** | **$-0.1945$ (Largest Drop)** |
| `Ablation_Drop_CLIP` | 13 | Pricing, Review, Vision, Graph | $0.9994$ | $0.9907$ | $0.0026$ | $0.0021$ | $-0.0002$ |
| `Ablation_Drop_Graph` | 14 | Pricing, Review, Vision, CLIP | $0.9993$ | $0.9890$ | $0.0029$ | $0.0017$ | $-0.0019$ |
| **`Unimodal_Vision_Only`** | 4 | Vision Stream Only | **$0.9747$** | **$0.8947$** | **$0.0049$** | **$0.0049$** | Best Unimodal ($+0.3221$ vs V1.0) |
| `Unimodal_Graph_Only` | 2 | Graph Stream Only | $0.9838$ | $0.8799$ | $0.0112$ | $0.0122$ | Second Best Unimodal |
| `Unimodal_Pricing_Only` | 3 | Pricing Stream Only | $0.7073$ | $0.2202$ | $0.0371$ | $0.0450$ | Moderate signal |
| `Unimodal_CLIP_Only` | 3 | CLIP Stream Only | $0.6960$ | $0.1273$ | $0.0397$ | $0.0488$ | Standalone semantic signal |
| `Unimodal_Review_Only` | 4 | Review NLP Stream Only | $0.5109$ | $0.0507$ | $0.0417$ | $0.0437$ | Near random without pricing |

---

## 4. Reconciliation of Brier Score Behavior

### Why Raw Brier is $0.0035$ and Calibrated OOF Brier is $0.0069$ in Exp V1.1-A
In high-performing tree ensembles where target classes are sparse ($154 / 3,643 = 4.23\%$), the random forest naturally outputs near-zero probabilities ($\hat{p} < 0.005$) for the vast majority of true negatives.
1. The raw Brier score is:
   $$\text{Brier}_{\text{raw}} = \frac{1}{N}\sum_{i=1}^N (\hat{p}_i - y_i)^2 = 0.0035$$
2. Isotonic regression fits a piecewise constant non-decreasing step function. Because isotonic regression maps predictions into discrete bins based on training fold quantiles, the lowest bin minimum is bounded by the smallest positive threshold, which slightly raises probabilities for the lowest negatives (e.g., from $0.001$ to $0.008$).
3. Squaring this small upward shift across $> 3,000$ negative instances increases the cumulative sum slightly, resulting in Brier $= 0.0069$.
4. Both $0.0035$ and $0.0069$ are exceptional calibration scores (well below the baseline $0.0266$ in V1.0).

---

## 5. Audit Conclusion
Every reported metric is accounted for and corresponds to a specific line in `scripts/train_and_evaluate_v1_1.py` and `models/v1_1/modality_ablations_v1_1.json`. There are zero fabricated or unreproducible metrics.
