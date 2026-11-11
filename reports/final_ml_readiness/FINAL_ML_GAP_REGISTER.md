# Final Master ML Gap Register & Component Readiness Audit

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Target Marketplaces:** Amazon India, Flipkart, Myntra  
**Date:** November 11, 2026  
**Artifact Path:** `reports/final_ml_readiness/FINAL_ML_GAP_REGISTER.md`  
**Milestone:** Final Master ML Readiness, Scientific Validation & Production Hardening  
**Audit Status:** STAGE A & STAGE B CONSOLIDATED AUDIT COMPLETE  

---

## 1. Executive Summary

This Master Gap Register provides the definitive, evidence-based audit of all machine learning, computer vision, natural language processing, and trust intelligence components of the **AI-Powered Indian Marketplace Trust Intelligence Platform**.

In strict accordance with the non-negotiable scientific rules of this release:
1. **Target Distinction:** The supervision target `overall_risk_tier == "ELEVATED_MULTIMODAL_ANOMALY"` ($N_{\text{pos}} = 154$, $N_{\text{neg}} = 3,489$) is an internally constructed deterministic policy anomaly label. It is **not** an independently verified counterfeit or fraud label.
2. **Model Freeze Preservation:** Both ML V1.0 baseline (`models/advanced_multimodal_gated_model.joblib`) and Multimodal Vision V1.1 candidate (`models/v1_1/advanced_multimodal_gated_model_v1_1.joblib`) remain strictly frozen with verified SHA-256 checksums.
3. **Zero-Penalty Invariant:** Missing modalities (`OBSERVED`, `UNAVAILABLE`, `PROCESSING_FAILED`, `NOT_APPLICABLE`) strictly attenuate evidence density or yield `UNASSESSED_SPARSE_DATA`, but never inflate anomaly risk.
4. **Honest Ground-Truth Accounting:** Real-world ground-truth annotations do not exist in the historical static catalog crawl. The prospective 1,500-sample collection plan is a deployment target, not an already completed experiment.

---

## 2. Consolidated Master Gap Register

Each platform capability is classified into one of five operational statuses:
- **`ALREADY_IMPLEMENTED_AND_VERIFIED`**: Functional, tested, and validated in codebase.
- **`IMPLEMENTED_INSUFFICIENTLY_VALIDATED`**: Code exists but requires deeper stress testing or empirical benchmarking.
- **`GENUINELY_MISSING`**: Critical capability absent that can be engineered with existing data/infrastructure.
- **`BLOCKED_BY_DATA_AVAILABILITY`**: Cannot be scientifically completed without external human-annotated ground truth.
- **`FUTURE_RESEARCH`**: Post-Phase 3 non-blocking architectural enhancement.

| ID | Component / Capability | Current Implementation Artifacts | Existing Status | Required Work in this Master Phase | Priority | Acceptance Test |
|:---|:---|:---|:---:|:---|:---:|:---|
| **GAP-01** | **Independent Human Ground Truth** | `src/data/ground_truth_schema.py`, `data/annotation/` | `BLOCKED_BY_DATA_AVAILABILITY` | Build reproducible ingestion & multi-rater adjudication pipeline; calculate Cohen's Kappa; document that prospective 1,500 collection is blocked until Phase 3 human annotation. | **CRITICAL** | `test_double_blind_ground_truth_protocol` |
| **GAP-02** | **Evidence Provenance & Deduplication** | `contracts.py`, `evidence_engine.py`, `multimodal_fusion.py` | `ALREADY_IMPLEMENTED_AND_VERIFIED` | Validate that 137/154 image-reuse events share `evidence_event_id`; run controlled tests proving distinct events are not merged and inference is unaltered. | **CRITICAL** | `test_cross_modal_image_graph_event_linkage` |
| **GAP-03** | **Zero-Penalty Missing Modality Invariant** | `multimodal_fusion.py`, `pipeline_v1_1.py` | `IMPLEMENTED_INSUFFICIENTLY_VALIDATED` | Execute full combinatorial stress testing (all 32 availability masks $M \in \{0, 1\}^5$, image failure, review absence, sparse items). | **CRITICAL** | `test_zero_penalty_stress_combinatorial` |
| **GAP-04** | **Marketplace-Specific Calibration Policies** | `marketplace_policy.py`, `CROSS_MARKETPLACE_GENERALIZATION_REPORT.md` | `IMPLEMENTED_INSUFFICIENTLY_VALIDATED` | Verify holdout calibration on Amazon ($0.50$), Flipkart ($0.65$), and Myntra (unvalidated disclaimer); evaluate false-positive rate under discount shifts. | **CRITICAL** | `test_marketplace_decision_policy` |
| **GAP-05** | **Visual Model Robustness & Invariance** | `image_quality.py`, `test_visual_robustness.py` | `IMPLEMENTED_INSUFFICIENTLY_VALIDATED` | Extend perturbation benchmark to 12 dimensions (collages, lighting, noise, compression, crops, rotations); document stability boundaries. | **HIGH** | `test_visual_robustness_extended` |
| **GAP-06** | **Packaging OCR Confidence & Uncertainty** | `ocr_engine.py`, `OCRConfidenceRecord` | `IMPLEMENTED_INSUFFICIENTLY_VALIDATED` | Benchmark under blur, glare, rotation, and multilingual packaging; verify that OCR failure never assert fraudulent packaging violations. | **HIGH** | `test_ocr_confidence_record_and_isolation` |
| **GAP-07** | **CLIP Modality Contribution & Utility** | `clip_service.py`, `pipeline_v1_1.py`, ablation reports | `IMPLEMENTED_INSUFFICIENTLY_VALIDATED` | Scientifically isolate CLIP contribution: evaluate semantic title-image mismatch on discordant pairs independent of the composite policy target. | **HIGH** | `test_clip_semantic_discordance_isolation` |
| **GAP-08** | **Python Inference Service Reliability** | `src/trust_engine/api_service.py`, `src/api/service.py` | `IMPLEMENTED_INSUFFICIENTLY_VALIDATED` | Measure P50/P95/P99 latency, throughput, memory consumption, concurrency, malformed inputs, and recovery after failure. | **HIGH** | `test_inference_service_performance_and_resilience` |
| **GAP-09** | **Data Quality, Leakage & Drift Monitoring** | `src/monitoring/` (Lacking formal detector) | **`GENUINELY_MISSING`** | Implement `CatalogDriftDetector` tracking feature drift (PSI/KS), marketplace shifts, category anomalies, and calibration degradation alerts. | **HIGH** | `test_catalog_drift_detector` |
| **GAP-10** | **End-to-End Evidence Traceability** | `report_generator.py`, `contracts.py` | `ALREADY_IMPLEMENTED_AND_VERIFIED` | Verify that all displayed findings trace cleanly to modality, atomic evidence, physical event, and sanitized URI without local path leaks. | **HIGH** | `test_visual_evidence_taxonomy_and_path_sanitization` |
| **GAP-11** | **Challenger Model Justification** | `models/v1_1/` vs potential `v1_2` | `ALREADY_IMPLEMENTED_AND_VERIFIED` | Scientifically analyze whether retraining is justified without ground truth: prove that retraining on the same proxy target would be circular/harmful. | **MEDIUM** | `test_leakage_invariants` |
| **GAP-12** | **Deep Indic Language ABSA Transformer** | `src/nlp/` (Rule-based lexical analyzer) | `FUTURE_RESEARCH` | Requires fine-tuning IndicBERT/mBERT on colloquial Hinglish reviews; postponable to Phase 3+ application active learning loop. | **LOW** | Post-Phase 3 Milestone |

---

## 3. Work Allocation and Execution Roadmap

In Stage C, we will address all items classified as `GENUINELY_MISSING` and `IMPLEMENTED_INSUFFICIENTLY_VALIDATED`:

1. **Workstream 1:** Complete `src/data/ground_truth_pipeline.py` with multi-rater ingestion, Fleiss/Cohen Kappa calculation, and honest data availability gating.
2. **Workstream 2:** Author dedicated controlled correlation tests proving non-merging of distinct events and non-interference with frozen model inference.
3. **Workstream 3:** Build `tests/test_zero_penalty_stress.py` testing all 32 binary availability masks and produce empirical stress curves.
4. **Workstream 4:** Validate holdout calibration curves and false-alarm mitigation across Amazon, Flipkart, and Myntra.
5. **Workstream 5:** Author `tests/test_visual_robustness_extended.py` evaluating 12 perturbation transforms and ResNet-18/dHash degradation curves.
6. **Workstream 6:** Benchmark OCR statutory extraction across distorted, blurred, and multilingual packaging.
7. **Workstream 7:** Scientifically evaluate CLIP independent utility on title-image mismatch detection.
8. **Workstream 8:** Benchmark inference reliability, concurrency, error recovery, and P50/P95/P99 latency in `tests/test_inference_reliability.py`.
9. **Workstream 9:** Implement `src/monitoring/catalog_drift_detector.py` and automated drift tests in `tests/test_drift_monitoring.py`.
10. **Workstream 10:** Verify full explainability and produce the 12 master final readiness reports.
