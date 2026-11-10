# Model Inventory & Operational Capability Matrix

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Phase:** Phase 1 Final — Scientific Architecture Finalization  
**Specification:** [`reports/phase_1_final/model_inventory.md`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/reports/phase_1_final/model_inventory.md)  
**Manifest:** [`reports/phase_1_final/model_artifact_manifest.json`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/reports/phase_1_final/model_artifact_manifest.json)  
**Version:** 2.0.0  

---

## 1. Complete Model Inventory

| Model Identifier | Architecture / Engine | Target Task | Training Data | Input Features | Output Format | Operational Role | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **`MultimodalLearnedFusion`** | Random Forest (100 estimators, balanced) | Task F (Proxy Surrogate) | 3,643 Catalog Products (Connected-Component Split) | 19 Clean Tabular Features | Risk Probability & Class [0, 1] | Continuous Anomaly Ranking Surrogate | **VALIDATED SURROGATE** |
| **`DeterministicTrustEngine`** | Rule-Based Multimodal Corroboration Engine | Task F (Overall Product Trust) | Certified Atomic Evidence Tables | Unified Evidence Items (5 Modalities) | Explainable Risk Tier & Evidence List | Primary Production Trust Engine | **CERTIFIED PRODUCTION** |
| **`OpenAICLIP_ViTB32`** | Zero-Shot ViT-B/32 Cross-Modal Transformer | Task C (Image-Listing Consistency) | OpenAI Pretrained Checkpoint | Hero Image + Listing Title | Cosine Similarity $[-1, 1]$ & Discordance Flag | Zero-Shot Text-Image Alignment | **BENCHMARKED (AUC 0.99)** |
| **`ResNet18_Visual`** | Centered 512-D ResNet-18 Embeddings | Task B (Image Relationship Intelligence) | ImageNet Pretrained Checkpoint | Normalized Hero Image Tensor (224x224) | 512-D Embedding Vector & Cosine Match | Visual Near-Duplicate & Reuse Retrieval | **OPERATIONAL RETRIEVAL** |
| **`WinRT_PackagingOCR`** | Native Windows Media OCR Subsystem | Task E (Packaging Text Verification) | Local Offline Physical Execution | Raw Packaging Crop (JPEG/PNG) | Detected Text Stream & Words Bounding Boxes | Physical Packaging Brand Extraction | **VALIDATED ON 100 IMAGES** |
| **`ReviewClassifier_Track1`** | TF-IDF + Logistic Regression / Random Forest | Task A (Weak Supervision) | 600 Silver Reviews (Heuristic Pseudo-Labels) | Review Text TF-IDF (1,000 features) | Authenticity Pseudo-Probability | Historical Weak Supervision Baseline | **PRESERVED BASELINE** |
| **`ReviewClassifier_Track2`** | TF-IDF (Pure Text-Only) + Logistic Regression | Task A (Independent Gold) | 100 Gold Reviews (Audited) | Review Text TF-IDF (500 features) | Binary Authenticity Prediction | Independent Review Authenticity Model | **BLOCKED (Awaiting Labels)** |
| **`HotelReviewBaseline`** | Domain Transfer TF-IDF Logistic Regression | Task A (Domain Shift Comparison) | External Deceptive Hotel Reviews Corpus | Review Text TF-IDF | Deception Probability | Out-of-Domain Contrastive Baseline | **HISTORICAL BASELINE** |

---

## 2. Operational Capability & Deployment Classification

```
========================================================================================
MODEL DEPLOYMENT & READINESS CLASSIFICATION
========================================================================================
[PRODUCTION-READY]
  1. Deterministic Trust Engine (Multimodal Corroboration & Zero-Penalty Invariant)
  2. CLIP ViT-B/32 Vision-Language Alignment (Calibrated threshold cos < 0.20)
  3. ResNet-18 Visual Duplicate Retrieval (Threshold cos >= 0.95)
  4. Robust Pricing Intelligence (Non-parametric MAD corridors, |z| >= 3.0)
  5. WinRT Physical Packaging OCR (Deterministic brand matching)

[SURROGATE & EXPERIMENTAL RANKERS]
  6. Multimodal Learned Fusion (19-feature RF surrogate for audit prioritization)
  7. Track 1 Weakly Supervised NLP (Heuristic proxy benchmark)

[EXPLICITLY BLOCKED PENDING DATA]
  8. Track 2 Supervised NLP Gold Model: Blocked awaiting double-blind human labels
  9. Supervised Product Fraud Prediction: Blocked awaiting external law enforcement labels
========================================================================================
```
