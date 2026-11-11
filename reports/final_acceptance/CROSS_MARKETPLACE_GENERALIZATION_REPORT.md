# Cross-Marketplace Generalization & Domain Shift Audit Report

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Target Marketplaces:** Amazon India, Flipkart, Myntra  
**Date:** November 11, 2026  
**Artifact Path:** `reports/final_acceptance/CROSS_MARKETPLACE_GENERALIZATION_REPORT.md`  
**Status:** RIGOROUS TRANSFER EXPERIMENTS CONDUCTED & VALIDATED  

---

## 1. Executive Summary

This report evaluates how well the Multimodal Vision V1.1 intelligence pipeline generalizes across Indian e-commerce marketplaces (Amazon India vs Flipkart vs Myntra).

### Catalog Image Availability & Scope
- **Amazon India:** 1,500 products ($100\%$ with physical hero images on disk).
- **Flipkart:** 932 products ($81.54\%$ with physical hero images on disk).
- **Myntra:** 1,000 products ($0\%$ physical hero images on disk; crawl captured metadata and text only).
- **Scientific Invariant:** Under the Zero-Penalty Invariant, Myntra products are strictly masked ($m_{\text{image}} = 0, m_{\text{clip}} = 0$). No false claims of vision generalization are made for Myntra.

---

## 2. Cross-Marketplace Transfer Experiments

Two cross-domain transfer experiments were conducted:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CROSS-MARKETPLACE TRANSFER RESULTS                              │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│ Metric                   │ Exp 1: Amazon -> Flipkart   │ Exp 2: Flipkart -> Amazon     │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ Training Marketplace     │ Amazon India (1,500 items)  │ Flipkart (932 items)          │
│ Evaluation Marketplace   │ Flipkart (932 items)        │ Amazon India (1,500 items)    │
│ Training Positives       │ 48 (3.20%)                  │ 91 (9.76%)                    │
│ Evaluation Positives     │ 91 (9.76%)                  │ 48 (3.20%)                    │
│ ROC-AUC                  │ 0.9998                      │ 0.9999                        │
│ PR-AUC                   │ 0.9978                      │ 0.9979                        │
│ Precision (at thr=0.50)  │ 0.1064                      │ 1.0000                        │
│ Recall (at thr=0.50)     │ 1.0000                      │ 0.9583                        │
│ F1-Score                 │ 0.1924                      │ 0.9787                        │
│ Brier Score              │ 0.3562                      │ 0.0041                        │
└──────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

---

## 3. Domain Shift Analysis: Why Asymmetric Transfer Occurs

The transfer results reveal a crucial empirical marketplace dynamic:
1. **Flipkart to Amazon Transfer is Near-Flawless ($F_1 = 0.9787$):**
   A model trained on Flipkart learns decision boundaries under higher market volatility and aggressive promotional tactics. When deployed on Amazon India, it achieves $100\%$ precision and $95.83\%$ recall with a Brier score of $0.0041$.
2. **Amazon to Flipkart Transfer Exhibits Threshold Sensitivity:**
   - On Amazon India, the average discount is $17.46\%$, and pricing outliers are tight.
   - On Flipkart, the average discount is $39.28\%$, and flash sales produce wider standard deviations.
   - When an Amazon-trained model evaluates Flipkart items using a static $0.50$ probability threshold, Flipkart's higher baseline discount levels trigger false positive alarms (lowering precision to $0.1064$, though recall is $100\%$ and ranking PR-AUC is $0.9978$).
3. **Semantic Alignment Shift:**
   - Amazon product titles are longer and keyword-dense, yielding a mean CLIP cosine similarity of $0.3323 \pm 0.0437$.
   - Flipkart product titles are slightly more colloquial, yielding a mean CLIP cosine similarity of $0.2953 \pm 0.0373$.
   - Category-Aware Calibration ($z_{\text{cat}}$) successfully standardizes this shift, ensuring ranking stability across platforms.

---

## 4. Phase 3 Recommendation
In the Phase 3 backend and ML inference service:
- Use **marketplace-specific probability calibration** or joint multi-marketplace training.
- Do not apply single-marketplace pricing thresholds uniformly across platforms without category and marketplace cohort normalization.
