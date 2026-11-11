# Multimodal Vision V1.1 Hardening & Component Gap Analysis

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Target Marketplaces:** Amazon India, Flipkart, Myntra  
**Date:** November 11, 2026  
**Artifact Path:** `reports/vision_v1_1_hardening/VISION_GAP_ANALYSIS.md`  
**Status:** COMPLETE READINESS AUDIT BEFORE PHASE 3 BACKEND INTEGRATION  

---

## 1. Executive Summary

Following the completion of the Multimodal Vision V1.1 implementation and its scientific acceptance audit, this gap analysis establishes the definitive operational baseline across all 15 platform components.

This analysis is conducted with strict engineering realism:
- **Supervision Target Reality:** The supervision target `overall_risk_tier == "ELEVATED_MULTIMODAL_ANOMALY"` ($N_{\text{pos}} = 154$, $N_{\text{neg}} = 3,489$) is a deterministic heuristic proxy constructed by the fusion engine, where $88.96\%$ of positive cases are driven by cross-product visual reuse represented across both visual and graph modalities.
- **Model Freeze Preservation:** Both ML V1.0 baseline (`models/advanced_multimodal_gated_model.joblib`) and Multimodal Vision V1.1 candidate (`models/v1_1/advanced_multimodal_gated_model_v1_1.joblib`) remain strictly frozen and preserved with bit-level reproducibility.
- **Objective:** Identify what is fully functional, what represents correlated double-counting, what is unvalidated across marketplaces, and what specific hardening steps are required before Phase 3 backend integration.

---

## 2. Comprehensive 15-Component Gap Analysis Matrix

The table below audits every component across seven functional dimensions:
1. **Status:** Working, Partially Implemented, Unvalidated, or Offline Blocked
2. **Current Implementation Artifacts:** Active code, models, and data tables
3. **Verified Strengths:** Empirically proven capabilities
4. **Identified Deficiencies & Gaps:** Scientific and architectural weaknesses
5. **Circularity / Leakage Status:** Relationship to supervision target
6. **Required Fix Before Backend Integration:** Concrete action items for this hardening milestone
7. **Postponable to Post-Phase 3:** Non-blocking future enhancements

| # | Component | Status | Implementation Artifacts | Verified Strengths | Identified Deficiencies & Gaps | Target Leakage / Circularity | Pre-Backend Action Item | Postponable Item |
|---|---|---|---|---|---|---|---|---|
| **1** | **Review NLP & Silver/Gold Classifiers** | Working | `src/nlp/`, `review_nlp_features.parquet` | Fast MD5 text deduplication; rating discordance detection; 5-component silver rules. | Lexical analyzer lacks deep Hinglish dialect transformer embeddings; zero longitudinal review velocity. | High circularity: `review_has_duplicate` and `review_max_discordance` directly trigger `review_nlp_has_anomaly`. | Maintain Zero-Penalty Invariant when reviews are absent (1,088 catalog products). | Fine-tuned IndicBERT transformer deployment. |
| **2** | **Sentiment & Aspect-Based Sentiment (ABSA)** | Working | `src/nlp/sentiment.py`, `src/nlp/absa.py` | Aspect extraction (packaging, authenticity, delivery) with domain lexicons. | Rule-based lexicon cannot resolve sarcasm or colloquial Indian marketplace phrases ("first copy", "duplicate lagta hai"). | Low/Indirect: influences rating discordance metric. | Standardize sentiment polarity output contract for backend ingestion. | Active learning pipeline for annotating Hinglish aspect datasets. |
| **3** | **Computer Vision & ResNet-18** | Working | `src/cv/`, `image_intelligence_features.parquet` | Pretrained Torchvision ResNet-18 extracting 512-d embeddings; centered cosine similarity; Laplacian blur detection. | Embeddings extracted on static hero images; cannot detect packaging tampering or seal breaches. | CRITICAL: `cv_is_cross_product_reuse` mirrors `image_cv_has_anomaly` predicate. | Ensure visual evidence exposes 6-tier duplicate taxonomy and sanitized asset paths. | Fine-tuning ResNet-18 or Swin Transformer on Indian packaging datasets. |
| **4** | **Duplicate Image Detection & Taxonomy** | Working | `src/cv/image_quality.py`, `src/cv/pipeline_v1_1.py` | 6-tier classification (`EXACT_DUPLICATE`, `NEAR_DUPLICATE_LIGHTING`, etc.); 64-bit dHash Hamming distance. | dHash vulnerable to heavy cropping or extreme rotations beyond $90^\circ$. | High: directly correlates with visual reuse flag. | Validate visual robustness under synthetic perturbations (blur, compression, rotation). | Multi-scale perceptual hashing and feature point matching (ORB/SIFT). |
| **5** | **CLIP Image-Title Alignment** | Working | `src/cv/clip_service.py`, `image_text_consistency_v1_1.parquet` | Pretrained ViT-B/32; category-specific prior normalization; calibrated z-scores. | Only covers products with hero images ($2,555 / 3,643 = 70.13\%$); fails on multi-lingual Indian titles. | **ZERO LEAKAGE:** Completely independent of target construction rules. | Expose CLIP category discordance flag in unified evidence contract. | Multi-lingual CLIP (M-CLIP) fine-tuned on Indic catalog text. |
| **6** | **Packaging OCR & Cross-Platform Engine** | Partially Implemented (Offline Blocked) | `src/cv/ocr_engine.py` | Windows native WinRT OCR with fallback to Tesseract; regex parser for MRP, Net Qty, Batch; fuzzy brand matcher. | Offline environment blocks Tesseract binaries; static dataset lacks physical packaging photos for majority of products. | Zero: OCR is not a fusion modality input. | Define `OCRConfidenceRecord` and graceful offline fallback; enforce Zero-Penalty Invariant. | Cloud Vision OCR integration or on-premise PaddleOCR container in Phase 3. |
| **7** | **Pricing Anomaly Detection** | Working | `src/pricing/`, `pricing_features.parquet` | Non-parametric IQR/MAD corridor benchmarks by subcategory; legal metrology MRP violation check ($SP > MRP$). | Subcategory-level corridors mix budget and luxury brands; Amazon vs Flipkart discount distribution shift ($17.5\%$ vs $39.3\%$). | Moderate: `pricing_robust_z` and `selling_exceeds_mrp` trigger pricing anomaly flag. | Implement marketplace-specific decision thresholds (Flipkart discount adjustment). | Dynamic longitudinal price scrapers tracking sale event velocity. |
| **8** | **Relationship Graph Intelligence** | Working | `src/trust_engine/graph_intelligence.py`, `entity_relationships.parquet` | Bipartite product-image graph; degree centrality and PageRank; egocentric subgraph extraction. | Graph topology anomaly is driven by the exact same physical image sharing as CV modality (137 overlapping edges). | CRITICAL: Graph shared image edge duplicates CV reuse finding, creating pseudo-corroboration. | Link `IMAGE_CV` and `GRAPH_TOPOLOGY` evidence via shared `evidence_event_id` and `correlation_group_id`. | Cross-seller co-purchasing and seller network community detection. |
| **9** | **Multimodal Feature Extraction & Availability Masks** | Working | `src/cv/pipeline_v1_1.py`, `src/models/advanced_multimodal_fusion.py` | 16-feature multi-stream matrix; 5-stream binary availability mask $M \in \{0, 1\}^5$; Zero-Penalty preservation. | Missing modalities zeroed out, but baseline features can drift if data formats change. | Direct: masks enforce valid evaluation. | Add unit tests verifying mask invariants under simulated sparse input scenarios. | Automated schema validator for incoming streaming catalog listings. |
| **10** | **Gated Multimodal Fusion & Probability Calibration** | Working (Frozen) | `models/advanced_multimodal_gated_model.joblib`, `models/v1_1/...` | Soft gating network conditioned on $M$; Random Forest ensemble with Modality Dropout ($p=0.25$); Isotonic calibration. | High performance ($F_1 = 0.98$) reflects deterministic target reconstruction; Flipkart cross-market precision drops to $10.6\%$. | Central: models learn the deterministic rule boundary. | Document frozen model hashes; expose marketplace-aware decision policies in API layer. | Retraining on human ground-truth labels once collected. |
| **11** | **Uncertainty Estimation** | Working | `src/trust_engine/contracts.py`, `src/cv/pipeline_v1_1.py` | 3-tier uncertainty taxonomy: probability calibration, ensemble tree variance, missing-modality sparsity bands. | Downstream API consumers must not conflate epistemic uncertainty with low risk. | Neutral. | Standardize uncertainty metrics in `ProductTrustAssessment` response. | Conformal prediction intervals for bounded error guarantees. |
| **12** | **Evidence Extraction & Provenance** | Partially Implemented (Needs Hardening) | `src/trust_engine/evidence_engine.py`, `contracts.py` | Unified evidence items with type, nature, confidence, limitations, and provenance tracking. | Lacks event-level grouping; image reuse in CV and Graph reported as separate corroborations. | High: double-counting image reuse creates artificial corroboration. | Add `evidence_event_id`, `correlation_group_id`, `related_product_ids`, and `source_reference`. | Blockchain / cryptographic audit ledger for enterprise compliance. |
| **13** | **Trust Assessment & Explainability** | Working | `src/trust_engine/report_generator.py`, `src/trust_engine/trust_assessment.py` | 12-section GitHub markdown & JSON report; explains positive vs negative evidence; disclaims fraud claims. | Visual section outputs raw dHash and local filesystem paths; lacks structured duplicate taxonomy. | Neutral. | Sanitize local paths; embed structured visual explanation object into report payload. | Interactive React visual comparison modal in frontend. |
| **14** | **Product Comparison & Recommendations** | Working | `src/trust_engine/comparison_engine.py` | Compares $N$ products; ranks by evidence density and risk tier; generates tradeoff rationale. | Comparison heuristic favors products with more observed modalities over sparse listings. | Neutral. | Ensure product comparison uses marketplace-calibrated thresholds. | Multi-criteria optimization ranking (price-performance-trust trade-off). |
| **15** | **Python SDK & API Service** | Working | `src/trust_engine/api_service.py`, `src/api/service.py` | Clean service class; version routing (`?version=v1.0` vs `?version=v1.1`); REST-ready dict payloads. | Lacks explicit marketplace threshold override endpoint and ground-truth ingestion contract. | Neutral. | Expose marketplace decision policies and evidence provenance fields via service methods. | FastAPI OpenAPI documentation and Node.js gRPC bindings. |

---

## 3. Detailed Component Breakdown

### 3.1 What is Working Defensively?
1. **Model Architecture & Gated Fusion:**
   - Both V1.0 (13-feature) and V1.1 (16-feature) pipelines correctly enforce the Zero-Penalty Invariant ($m_k = 0 \implies x_{\text{gated}, k} = 0$).
   - Isotonic calibration provides low empirical calibration error ($ECE = 0.0024, \text{Brier} = 0.0021$) against the frozen proxy target.
2. **CLIP ViT-B/32 Semantic Prior:**
   - 100% clean, leak-free multimodal alignment signal with zero target circularity.
   - Successfully identifies cross-modal title-image discordances across catalog products.
3. **Image Quality Auditing:**
   - Laplacian blur, luminance contrast, border studio background detection, and RGBA alpha-compositing are fully operational and robust.
4. **Graph Topology Intelligence:**
   - Efficient egocentric subgraph queries and relationship traversal over $15,000+$ edges.

### 3.2 What is Broken or Compromised?
1. **Target Provenance Circularity (Double-Counting):**
   - 137 of 154 positive instances are caused by counting the same image reuse event twice: once in `IMAGE_CV` and once in `GRAPH_TOPOLOGY`.
   - The model learns this circular link as "independent cross-modal corroboration" when it is in fact a single physical asset link.
2. **Cross-Marketplace Threshold Transfer (Flipkart Discount Collapse):**
   - Applying Amazon's default threshold ($0.50$) to Flipkart listings collapses precision to $10.64\%$ because Flipkart's baseline promotional discount is $39.28\%$ (vs Amazon's $17.46\%$). Normal Flipkart promotional discounts get falsely classified as anomalous markdowns.
3. **Local File System Path Leakage:**
   - Evidence records in several modules expose local machine paths (`C:\Users\shruti\...`), which violates privacy, portability, and clean API design.

### 3.3 What is Missing or Partially Implemented?
1. **Event-Level Deduplication:**
   - `UnifiedEvidenceItem` lacks fields to bind multi-view representations of the same underlying event together (`evidence_event_id`, `correlation_group_id`).
2. **Missing-Modality Transparency Taxonomy:**
   - Assessments currently report binary availability rather than rich operational statuses (`OBSERVED`, `UNAVAILABLE`, `PROCESSING_FAILED`, `NOT_APPLICABLE`).
3. **Structured Visual Evidence Schema:**
   - Detailed visual comparison records (side-by-side comparison URLs, crop/rotation flags, 6-tier duplicate category) are not structured as machine-readable contracts.
4. **OCR Verification & Confidence Contract:**
   - Lacks an explicit `OCRConfidenceRecord` that documents field-level confidence and isolates OCR failures from inflating product risk.
5. **Ground-Truth Adjudication Protocol:**
   - No standardized schema exists for future human-in-the-loop double-blind ground-truth validation.

---

## 4. Prioritized Action Plan for V1.1 Hardening

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       V1.1 HARDENING WORKSTREAMS                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  WS1: Evidence Provenance & Event Deduplication (CRITICAL)                  │
│       Enrich UnifiedEvidenceItem; link Image & Graph shared-image events.    │
│  WS2: Visual Evidence Explainability (HIGH)                                 │
│       Structured 6-tier duplicate taxonomy; sanitize all local paths.        │
│  WS3: Missing-Modality Transparency (HIGH)                                  │
│       Define ModalityStatus enum; enforce Zero-Penalty Invariant.           │
│  WS4: Marketplace Calibration & Thresholds (HIGH)                           │
│       MarketplaceDecisionPolicy (Amazon 0.50, Flipkart 0.65, Myntra unval). │
│  WS5: OCR Confidence & Verification (MEDIUM)                                │
│       OCRConfidenceRecord with field confidences and safe offline fallback. │
│  WS6: Visual Robustness Testing (MEDIUM)                                     │
│       Perturbation test suite (watermark, lighting, compression, rotation). │
│  WS7: Ground-Truth Evaluation Readiness (HIGH)                              │
│       Define double-blind human adjudication schema in src/data/.           │
└─────────────────────────────────────────────────────────────────────────────┘
```

All 7 workstreams will now be implemented directly into the codebase and validated via comprehensive automated tests.
