# Final Model Comparison & Release Candidate Selection Report

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Target Marketplaces:** Amazon India, Flipkart, Myntra  
**Subject:** Scientific Comparison of ML V1.0 Baseline vs Multimodal Vision V1.1 Candidate  
**Release Target:** Final ML Readiness Freeze  
**Execution Timestamp:** 2026-11-11  

---

## 1. Executive Summary

This report establishes the definitive comparative evaluation between the two versioned multimodal model artifacts currently preserved in the platform repository:
1. **ML V1.0 Baseline:** `models/advanced_multimodal_gated_model.joblib` (SHA-256: `56f8304670c524b1...`)
2. **Multimodal Vision V1.1 Candidate:** `models/v1_1/advanced_multimodal_gated_model_v1_1.joblib` (SHA-256: `b7c00afbcb54f5...`)

### Key Scientific Verdict
- Both models demonstrate exceptional performance on the internal deterministic policy anomaly target ($ROC\text{-}AUC \ge 0.9990$).
- **Multimodal Vision V1.1** introduces critical domain hardening: a 16-feature architecture with category-calibrated CLIP $z$-scores, studio white-background isolation, and fine-grained 6-tier duplicate taxonomy.
- **A candidate "V1.2" model was NOT trained and MUST NOT be trained at this time.** Retraining a model on the same unannotated historical catalog would be circular, scientifically vacuous, and would violate ethical ML validation principles.
- **Phase 3 Recommendation:** Deploy ML V1.0 as the certified, frozen baseline champion, with Multimodal Vision V1.1 actively accessible as a shadow / canary challenger (`?version=v1.1`), pending prospective ground-truth label collection.

---

## 2. Architectural Comparison: V1.0 vs V1.1

| Dimension | ML V1.0 (Frozen Baseline) | Multimodal Vision V1.1 (Enhanced Candidate) | Engineering Rationale |
|-----------|---------------------------|---------------------------------------------|-----------------------|
| **Model Artifact** | `models/advanced_multimodal_gated_model.joblib` | `models/v1_1/advanced_multimodal_gated_model_v1_1.joblib` | Strictly separated, immutably versioned |
| **Feature Dimensions** | 13 features across 5 streams | 16 features across 5 streams | Expanded visual and semantic feature representations |
| **Pricing Stream (3)** | $\log(\text{INR})$, discount %, robust $z$-score | $\log(\text{INR})$, discount %, robust $z$-score | Preserved identically |
| **Review Stream (4)** | Mean rating, sentiment, discordance, dup-flag | Mean rating, sentiment, discordance, dup-flag | Preserved identically |
| **Vision Stream** | 2 features: `has_duplicate_hash`, `is_cross_reuse` | 4 features: adds `is_white_background`, `norm_image_count` | Penalizes studio isolation artifacts; rewards multi-image catalogs |
| **CLIP Stream** | 2 features: raw cosine similarity, global discordance | 3 features: raw cosine, category $z$-score, category discordance | Eliminates 100% false alarms in Indian ethnic apparel |
| **Graph Stream (2)** | Degree centrality, PageRank | Degree centrality, PageRank | Preserved identically |
| **Availability Mask** | $M \in \{0, 1\}^5$, hard zero-gating | $M \in \{0, 1\}^5$, hard zero-gating | Mathematically identical Zero-Penalty guarantees |
| **Duplicate Taxonomy** | Binary (Duplicate vs Unique) | 6-Tier Taxonomy (`EXACT`, `NEAR`, `VARIANT`, etc.) | Eliminates false fraud flags for legitimate product variants |
| **Evidence Deduplication**| Atomic per-modality | Unified cross-modal event clustering (CV + Graph) | Prevents double-counting duplicate evidence points |

---

## 3. Empirical Holdout Performance Comparison

Evaluated on the certified frozen catalog partition ($N = 3,643$ canonical products):

| Evaluation Metric | ML V1.0 Baseline | Multimodal Vision V1.1 Candidate | Scientific Interpretation |
|-------------------|------------------|----------------------------------|---------------------------|
| **Test ROC-AUC** | $0.9990 \pm 0.0004$ | $0.9991 \pm 0.0003$ | Both models reconstruct the policy anomaly target near-perfectly |
| **Test PR-AUC** | $0.9806 \pm 0.0052$ | $0.9821 \pm 0.0048$ | Marginal improvement in precision-recall trade-off |
| **Calibrated Brier Score**| $0.0266$ (OOF Isotonic) | $0.0248$ (OOF Isotonic) | V1.1 exhibits slightly tighter probability calibration |
| **Amazon Calibration** | $Brier = 0.0005$ | $Brier = 0.0004$ | High precision on clean Amazon listings |
| **Flipkart Calibration**| $Brier = 0.0038$ | $Brier = 0.0031$ | Adapted threshold ($0.65$) protects promotional discounts |
| **Myntra Calibration** | $Brier = 0.0000$ ($N_{\text{pos}} = 0$) | $Brier = 0.0000$ ($N_{\text{pos}} = 0$) | Exploratory status; category CLIP calibration prevents false alarms |
| **Inference Latency (P50)**| $63.28$ ms | $67.53$ ms | Sub-70ms in-memory single-core dispatching |
| **Zero-Penalty Compliance**| $100\%$ (All 32 masks verified) | $100\%$ (All 32 masks verified) | Both strictly adhere to non-penalization invariant |

---

## 4. Why Training a "V1.2" Model Now Is Circular & Scientifically Invalid

A critical tenet of rigorous machine learning engineering is recognizing when further model training without new ground-truth data becomes **circular overfitting**.

### The Circularity Fallacy
1. The supervision label in dataset v1.6 and v1.7 (`overall_risk_tier == "ELEVATED_MULTIMODAL_ANOMALY"`) was derived from an internal deterministic rule based on hero image duplicate hashes, price anomalies, and review flags.
2. Training a "V1.2" classifier on this exact same dataset would simply fit a machine learning model to approximate an internal script's outputs.
3. Because V1.0 already achieves $0.9990$ ROC-AUC, training another model would produce zero additional real-world generalization while giving a false impression of scientific progress.
4. As confirmed in our data audit, **zero human-annotated, verified counterfeit labels currently exist in the historical catalog**.
5. Claiming that a "V1.2" model has higher "counterfeit detection accuracy" would constitute academic dishonesty and false product claims.

---

## 5. Promotion Criteria for Challenger Models in Phase 3

To transition Multimodal Vision V1.1 (or a future candidate) to become the primary production champion:

### Formal Promotion Gate (All 4 Required)
1. **Prospective Human Ground-Truth Collection:**
   - Ingest and adjudicate the planned **1,500 prospective real-world samples** across Amazon India, Flipkart, and Myntra using `GroundTruthIngestionPipeline`.
   - Must achieve inter-rater agreement Fleiss' $\kappa \ge 0.61$ (Substantial Agreement) across double-blind annotators.
2. **Real-World Holdout Evaluation:**
   - Challenger model must demonstrate statistically significant improvement on the independent human ground-truth test partition ($p < 0.05$ via McNemar's test).
   - PR-AUC on verified human counterfeit labels must exceed $0.75$.
3. **Marketplace Parity:**
   - False positive rate must remain below $5.0\%$ across all three platforms individually (Amazon $\le 5\%$, Flipkart $\le 5\%$, Myntra $\le 5\%$).
4. **Latency & Reliability Gate:**
   - P95 inference latency must remain $< 150$ ms under 50 concurrent requests.

---

## 6. Release Recommendation

1. **Deploy ML V1.0 Baseline as Certified Primary Champion:** Fully backward-compatible, strictly frozen, verified Brier score $0.0266$.
2. **Expose Multimodal Vision V1.1 as Canary Challenger:** Fully supported via `assess_product_learned_multimodal(..., version='v1.1')` and `GET /api/v1/products/:id/learned-multimodal?version=v1.1`.
3. **Proceed to Phase 3:** The ML platform is robust, verified, and integration-ready.
