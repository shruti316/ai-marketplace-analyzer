# Model Card: Gated Multimodal Fusion Engine (`multimodal_gated_fusion`)

## Model Details
- **Model Name:** Gated Multimodal Fusion Classifier & Anomaly Ranker
- **Model Version:** 2.1.0 (ML V1.0 Release Freeze)
- **Model Type:** Gated Ensemble (Random Forest + Modality Dropout + Isotonic Calibration)
- **Frameworks:** Python 3.11, Scikit-Learn 1.4+, NumPy, Joblib
- **Artifact Path:** `models/advanced_multimodal_gated_model.joblib`
- **Release Date:** November 11, 2026

## Intended Use
- **Primary Use:** Continuous anomaly ranking and multi-task risk prediction across Indian e-commerce catalog products (Amazon India, Flipkart, Myntra).
- **Out of Scope:** Automatic legal fraud takedowns; solitary decision-making without human investigator review. The target represents a deterministic rule proxy (`active_anomalies >= 2`), NOT legal fraud.

## Input Modalities & Features (13 Dimensions)
1. **Pricing (3):** MAD robust z-score, discount percentage, price dispersion ratio.
2. **Review NLP (4):** Sentiment-rating discordance, average length, verified buyer ratio, text duplicate ratio.
3. **Vision (2):** Duplicate cluster cosine similarity, stock photo flag.
4. **CLIP (2):** Title-image cosine similarity, discordance index (catalog-wide coverage across 2,432 products).
5. **Graph (2):** Degree centrality, scaled PageRank.
- **Auxiliary Input:** 5-dimensional binary availability mask $\mathbf{M} \in \{0, 1\}^5$.

## Performance & Evaluation (5-Fold Stratified Group CV)

### ML V1.0 Release Baseline (13 Features)
- **Artifact:** `models/advanced_multimodal_gated_model.joblib` (SHA-256: `56f83046...`)
- **ROC-AUC:** $0.9709 \pm 0.0041$
- **PR-AUC:** $0.6632 \pm 0.0385$
- **Raw Brier Score:** $0.0657$
- **Calibrated Out-of-Fold Brier Score:** $0.0266$ (honest, leak-free out-of-fold calibration)

### Multimodal Vision V1.1 Candidate (16 Features)
- **Artifact:** `models/v1_1/advanced_multimodal_gated_model_v1_1.joblib` (SHA-256: `b7c00afb...`)
- **ROC-AUC:** $0.9988 \pm 0.0006$ (Full Ablation ROC-AUC: $0.9993$)
- **PR-AUC:** $0.9845 \pm 0.0082$ (Full Ablation PR-AUC: $0.9909$)
- **Raw Brier Score:** $0.0035$
- **Calibrated Out-of-Fold Brier Score:** $0.0069$ (Full Ablation CalBrier: $0.0019$)
- **Modality Contributions & Ablation Impact:**
  - `Full Model V1.1`: PR-AUC $= 0.9909$
  - `Ablation Drop Vision`: PR-AUC drops to $0.7964$ ($\Delta = -0.1945$), proving critical visual stream contribution.
  - `Ablation Drop Pricing`: PR-AUC $= 0.9441$ ($\Delta = -0.0468$).
  - `Ablation Drop Review`: PR-AUC $= 0.9845$ ($\Delta = -0.0064$).
  - `Ablation Drop CLIP`: PR-AUC $= 0.9907$ ($\Delta = -0.0002$).
  - `Ablation Drop Graph`: PR-AUC $= 0.9890$ ($\Delta = -0.0019$).
  - `Unimodal Vision Only`: PR-AUC $= 0.8947$ (up from $0.5726$ in V1.0 baseline).
  - `Unimodal CLIP Only`: PR-AUC $= 0.1273$ (up from $0.0848$ in V1.0 baseline).
- **Uncertainty Calibration:** Isotonic regression with dynamic confidence intervals $[\hat{y} - w, \hat{y} + w]$ based on tree-variance and missing modality penalty.

## Ethical & Scientific Safeguards
- **Zero-Penalty Invariant:** Unobserved modalities contribute strictly $0$ anomaly points ($m_k = 0 \implies \mathbf{x}_{\text{gated}, k} = 0$).
- **Group Isolation:** Zero node, reviewer, or variant cluster leakage between training and validation splits.
- **No Ground-Truth Hallucination:** Predictions are strictly classified as observable multi-modal anomalies, not confirmed legal fraud.
