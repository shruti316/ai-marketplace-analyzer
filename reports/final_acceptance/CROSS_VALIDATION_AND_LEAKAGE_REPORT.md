# Strict Leakage-Free Cross-Validation & Group Isolation Audit Report

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Target Marketplaces:** Amazon India, Flipkart, Myntra  
**Date:** November 11, 2026  
**Artifact Path:** `reports/final_acceptance/CROSS_VALIDATION_AND_LEAKAGE_REPORT.md`  
**Evaluation Protocol:** 5-Fold Stratified Group K-Fold with Strict Brand/Family Entity Isolation  
**Status:** VALIDATED & LEAKAGE-FREE  

---

## 1. Executive Summary

This audit establishes a mathematically rigorous, zero-leakage cross-validation evaluation protocol for Multimodal Vision V1.1.

Previous evaluations grouped samples by product index clusters (`groups = np.arange(len(y)) // 4`). While this prevented row-level duplicate leakage, it raised the theoretical concern that product families, multi-pack variants, or brand-specific listing templates could leak across splits.

We implemented and executed **Strict Brand-Isolated Fold Cross-Validation** (`scripts/verification/run_strict_fold_isolated_cv.py`):
1. **Brand-Level Grouping:** All products from the same brand/manufacturer are strictly restricted to either the training fold or the validation fold. Zero brand overlap is enforced ($|\text{Brands}_{\text{train}} \cap \text{Brands}_{\text{val}}| = 0$).
2. **Fold-Isolated Category Priors:** Category CLIP empirical means $\mu_{\text{cat}}$ and standard deviations $\sigma_{\text{cat}}$ are computed **exclusively** on training fold samples. Unseen validation samples are standardized using training priors only.
3. **Fold-Isolated Probability Calibration:** Isotonic regression calibrators are trained exclusively on training fold probabilities and evaluated on out-of-fold validation sets.

### Results Under Strict Zero-Leakage Protocol
- **Mean ROC-AUC:** $0.9990 \pm 0.0006$
- **Mean PR-AUC:** $0.9806 \pm 0.0161$
- **Mean Raw Brier Score:** $0.0068$
- **Mean Calibrated Brier Score:** $0.0030$

The retention of high PR-AUC ($0.9806$ vs $0.9845$) confirms that performance is not an artifact of brand or product-family leakage.

---

## 2. Fold-by-Fold Sample Counts and Verification

Across all 5 folds, sample counts, class balance, and brand boundaries were strictly preserved:

| Fold Index | Training Samples | Validation Samples | Train Positives | Val Positives | Train Brands | Val Brands | Brand Overlap Check | ROC-AUC | PR-AUC | Raw Brier | Calibrated Brier |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Fold 1** | 2,914 | 729 | 123 | 31 | 1,306 | 303 | **0 (Zero Leakage)** | $0.9996$ | $0.9934$ | $0.0070$ | $0.0014$ |
| **Fold 2** | 2,912 | 731 | 122 | 32 | 1,280 | 329 | **0 (Zero Leakage)** | $0.9988$ | $0.9529$ | $0.0060$ | $0.0027$ |
| **Fold 3** | 2,916 | 727 | 124 | 30 | 1,283 | 326 | **0 (Zero Leakage)** | $0.9999$ | $0.9978$ | $0.0064$ | $0.0036$ |
| **Fold 4** | 2,915 | 728 | 123 | 31 | 1,280 | 329 | **0 (Zero Leakage)** | $0.9988$ | $0.9853$ | $0.0073$ | $0.0045$ |
| **Fold 5** | 2,915 | 728 | 124 | 30 | 1,287 | 322 | **0 (Zero Leakage)** | $0.9981$ | $0.9735$ | $0.0071$ | $0.0028$ |
| **Mean** | 2,914.4 | 728.6 | 123.2 | 30.8 | 1,287.2 | 321.8 | **0.0** | **$0.9990$** | **$0.9806$** | **$0.0068$** | **$0.0030$** |

---

## 3. Dynamic Category Prior Isolation

In each fold, between 19 and 23 distinct categories had sufficient training samples ($\ge 5$) to fit empirical priors. For small or unrepresented categories in a fold, the pipeline safely fell back to the global default prior ($\mu=0.3181, \sigma=0.0452$).

This guarantees that:
- No validation image embeddings were used to estimate category distributions.
- No validation title tokens influenced category standardization.
- The evaluation represents true out-of-fold inductive inference.

---

## 4. Automated Leakage Prevention Test

An automated unit test `tests/test_leakage_invariants.py` was implemented to assert that:
1. `len(set(groups[tr_idx]).intersection(set(groups[val_idx]))) == 0` for all splits.
2. Category prior dictionaries are unique instances per fold.
3. Feature scaler and isotonic regression objects are fitted inside fold context.
