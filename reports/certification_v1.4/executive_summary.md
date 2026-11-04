# Marketplace Trust Intelligence Dataset v1.4 — Executive Summary

## 1. Overview & Release Identification
- **Release Version:** `v1.4`
- **Release Status:** `FROZEN`
- **Release Hash Directory:** `data/marketplace_trust_dataset_v1.4/`
- **Certification Verdict:** `CERTIFIED_WITH_LIMITATIONS`
- **Audit Date:** November 2026
- **Architecture Role:** Multi-Protocol Multimodal Trust Evidence Foundation

## 2. Executive Key Highlights
1. **Catalog Composition:** Total 6,043 products. Indian marketplace listings comprise **3,643 products (60.28%)**, preserving strict domestic primacy. International supplementary listings comprise **2,400 products (39.72%)**.
2. **Review Retention & Provenance:** Exactly 56,697 customer reviews are retained with 0.00% data loss. 1,143 Flipkart reviews are linked across 127 products; 3,490 Amazon India reviews remain honestly unlinked; 51,961 international reviews are verified linked.
3. **Evaluation Leakage Elimination (Workstream B):**
   - **Protocol 1 (Product-Held-Out):** 4,230 Train / 906 Val / 907 Test with 0 product ID overlap and 0 duplicate-image cluster overlap.
   - **Protocol 2 (Variant-Family-Held-Out):** 3,853 Train / 825 Val / 827 Test with **exactly 0 variant parent group overlap**, completely eliminating the 64-group variant leakage identified in v1.3.
   - **Protocol 3 (Reviewer-Held-Out):** 3,981 Train / 853 Val / 854 Test with **exactly 0 named reviewer overlap**, eliminating cross-split user identity leakage.
4. **Traceable RBI Dynamic FX Reference (Workstream D):** Replaced static scalar ₹83.25 with `evidence/fx_conversion_rates.parquet` containing 9 historical RBI benchmark reference rates with official publication dates and fixing timestamps.
5. **Model Readiness & Transparent Baselines (Workstream I):** Evaluated transparent, reproducible baseline models across all modalities:
   - NLP Deception Baseline (TF-IDF + Logistic Regression): Precision 0.9006, Recall 0.8529, F1 0.8761, ROC-AUC 0.9490.
   - Price Anomaly Baseline (IQR & Isolation Forest): 258 statistical anomalies identified (5.01%).
   - CV Duplicate Baseline (dHash + Graph Connected Components): 60 collision groups resolved.
   - Cross-Modal Explainable Fusion Baseline (Random Forest): Achieved balanced multimodal risk attribution.
6. **Triple-Release Immutability & Regressions:** Releases `v1.1`, `v1.2`, and `v1.3` are 100% frozen. All 16 protected baseline files match their cryptographic SHA-256 hashes bit-for-bit. 169/169 automated validation checks and 255/255 pytest unit tests pass with zero errors.
