# Model Card: Multimodal Vision V1.1 Hardened Challenger

**Model Identifier:** `models/v1_1/advanced_multimodal_gated_model_v1_1.joblib`  
**Model Version:** `1.1.0` (Candidate Release)  
**SHA-256 Checksum:** `B7C00AFBCB54F5B05BBB8094746A7B3135DC01DA008EA3C1F0B7E49FC4F58564`  
**Model Developer:** Senior ML Engineering Team, AI-Powered Marketplace Trust Intelligence Platform  
**Release Date:** 2026-11-11  

---

## 1. Model Details

### 1.1 Architecture
- **Base Classifier:** Random Forest Classifier (`n_estimators=100`, `max_depth=5`, `class_weight="balanced"`, `random_state=42`).
- **Gating Architecture:** Hard availability masking over 5 streams ($M \in \{0, 1\}^5$).
- **Input Dimension:** 16 dense continuous features:
  - Pricing (3): `pricing_log_inr`, `pricing_discount_pct`, `pricing_robust_z`
  - Review NLP (4): `review_mean_rating`, `review_mean_sentiment`, `review_max_discordance`, `review_has_duplicate`
  - Computer Vision (4): `cv_has_duplicate_hash`, `cv_is_cross_product_reuse`, `cv_is_white_background`, `cv_normalized_image_count`
  - CLIP (3): `clip_cosine_similarity`, `clip_category_scaled_zscore`, `clip_is_category_discordant`
  - Graph (2): `graph_degree_centrality`, `graph_scaled_pagerank`
- **Calibration Engine:** Out-of-fold Isotonic Probability Calibrator.

### 1.2 Enhancements over V1.0
1. **Category-Aware CLIP Calibration:** Standardized category $z$-scores eliminate high false discordance rates in Indian ethnic apparel ($11.4\% \to 0.0\%$).
2. **Studio White Background Normalization:** Penalizes duplicate false alarms caused by uniform studio backdrops.
3. **Gallery Image Count Feature:** Rewards comprehensive multi-angle product photography.
4. **6-Tier Duplicate Taxonomy:** Distinguishes genuine product variants from suspicious cross-product reuse.

---

## 2. Training & Supervision Target

- **Training Dataset:** `data/indian_marketplace_trust_dataset_v1_7` (3,643 canonical products).
- **Target Variable:** `overall_risk_tier == "ELEVATED_MULTIMODAL_ANOMALY"` ($N_{\text{pos}} = 154$, $N_{\text{neg}} = 3,489$).

---

## 3. Performance Metrics (Holdout & Cross-Validation)

| Evaluation Metric | Multimodal Vision V1.1 | ML V1.0 Baseline | Variance / Improvement |
|-------------------|:----------------------:|:----------------:|:----------------------:|
| **Test ROC-AUC** | **$0.9991 \pm 0.0003$** | $0.9990 \pm 0.0004$ | $+0.0001$ |
| **Test PR-AUC** | **$0.9821 \pm 0.0048$** | $0.9806 \pm 0.0052$ | $+0.0015$ |
| **Calibrated Brier Score** | **$0.0248$** | $0.0266$ | $-0.0018$ (Tighter calibration) |
| **Raw Brier Score** | $0.0362$ | $0.0384$ | $-0.0022$ |
| **Amazon Holdout Brier** | $0.0004$ | $0.0005$ | $-0.0001$ |
| **Flipkart Holdout Brier**| $0.0031$ | $0.0038$ | $-0.0007$ |
| **Myntra False Discordance**| **$0.0\%$ (0/1000)** | $11.4\%$ (114/1000)| **Eliminated 100% false alarms** |

---

## 4. Invariants & Safety Verification

- **Zero-Penalty Compliance:** All 32 binary availability masks verified in `tests/test_zero_penalty_stress.py`.
- **Orthogonal CLIP Defense:** Catches novel bait-and-switch deception when ResNet-18 has zero duplicate collisions (`tests/test_clip_semantic_isolation.py`).
- **Visual Robustness:** dHash distance $\le 8$ bits across 12 real-world image perturbations (`tests/test_visual_robustness_extended.py`).

---

## 5. Promotion Criteria to Champion

To promote Multimodal Vision V1.1 to the primary default champion:
1. Ingest prospective 1,500 double-blind human ground-truth labels.
2. Demonstrate statistically significant superiority on human ground truth ($p < 0.05$ via McNemar's test).
3. Confirm false positive rate $< 5.0\%$ across Amazon, Flipkart, and Myntra simultaneously.
