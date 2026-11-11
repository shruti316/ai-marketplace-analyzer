# Model Card: ML V1.0 Gated Multimodal Fusion Baseline (Primary Champion)

**Model Identifier:** `models/advanced_multimodal_gated_model.joblib`  
**Model Version:** `1.0.0` (Frozen Release)  
**SHA-256 Checksum:** `56F8304670C524B12A43F5BDE17D7AC6BF5E4EC16651079ED6BF246E141F9374`  
**Model Developer:** Senior ML Engineering Team, AI-Powered Marketplace Trust Intelligence Platform  
**Release Date:** 2026-11-10  

---

## 1. Model Details

### 1.1 Architecture
- **Base Classifier:** Random Forest Classifier (`n_estimators=100`, `max_depth=5`, `class_weight="balanced"`, `random_state=42`).
- **Gating Architecture:** Hard availability masking over 5 streams ($M \in \{0, 1\}^5$).
- **Input Dimension:** 13 dense continuous features across Pricing (3), Review NLP (4), Vision (2), CLIP (2), and Graph (2).
- **Calibration Engine:** Honest out-of-fold monotonic Isotonic Regression fitted strictly on cross-validation training folds.

### 1.2 Intended Use
- **Primary Use:** Automated continuous risk ranking and anomaly detection for e-commerce product listings across Amazon India, Flipkart, and Myntra.
- **Decision Support:** Serves explainable evidence features to trust-and-safety investigators and platform compliance auditors.
- **Out-of-Scope Use:** Legal determination of trademark infringement or criminal counterfeit fraud. The model assesses catalog policy anomaly risk, not legal liability.

---

## 2. Training & Supervision Target

- **Training Dataset:** `data/indian_marketplace_trust_dataset_v1_6` (3,643 canonical products).
- **Target Variable:** `overall_risk_tier == "ELEVATED_MULTIMODAL_ANOMALY"` ($N_{\text{pos}} = 154$, $N_{\text{neg}} = 3,489$).
- **Nature of Target:** Internal deterministic rule reflecting cross-product hero image reuse ($89.0\%$), extreme price dispersion, and review astroturfing.

---

## 3. Performance Metrics (Holdout & Cross-Validation)

Evaluated via 5-fold Stratified Group K-Fold cross-validation grouped by brand to prevent leakage:

| Evaluation Metric | Baseline Value | Configuration / Split Attribution |
|-------------------|:--------------:|-----------------------------------|
| **Test ROC-AUC** | $0.9990 \pm 0.0004$ | 5-Fold Stratified Group K-Fold (Brand Grouped) |
| **Test PR-AUC** | $0.9806 \pm 0.0052$ | 5-Fold Stratified Group K-Fold (Brand Grouped) |
| **Calibrated Brier Score** | **$0.0266$** | Leak-free out-of-fold Isotonic calibration |
| **Raw Brier Score** | $0.0384$ | Pre-calibration baseline |
| **Amazon Holdout Brier** | $0.0005$ | Holdout evaluation partition ($N = 1,500$) |
| **Flipkart Holdout Brier** | $0.0038$ | Holdout evaluation partition ($N = 1,143$) |
| **Myntra Holdout Brier** | $0.0000$ | Holdout evaluation partition ($N = 1,000, N_{\text{pos}} = 0$) |

---

## 4. Invariants & Missing Modality Behavior

- **Zero-Penalty Invariant:** When a modality stream is unobserved ($m_k = 0$), all corresponding features are zeroed: $x_{\text{gated}, k} = 0$.
- **Monotonicity:** In `tests/test_zero_penalty_stress.py`, masking modalities was proven never to increase predicted anomaly probability or escalate risk tier.
- **Sparse Data Guard:** Listings with fewer than 2 active modalities are assigned risk tier `UNASSESSED_SPARSE_DATA` rather than an elevated risk flag.

---

## 5. Limitations

1. **No Human Counterfeit Labels:** Trained on internal policy targets; real-world counterfeit detection on unobserved novel deception requires human ground-truth calibration.
2. **Myntra Unvalidated:** Zero positive training cases in Myntra; decision threshold marked `UNVALIDATED_THRESHOLD`.
