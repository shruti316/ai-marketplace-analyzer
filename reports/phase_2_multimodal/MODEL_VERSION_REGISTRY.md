# Model Version Registry

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Document:** Official Model Version Registry  
**Phase:** Phase 2 — Complete Multimodal Intelligence Development  
**Status:** Certified & Released  
**Date:** November 11, 2026  

---

## 1. Production Model Registry

| Model Key | Version | Artifact Path | Core Dependencies | Status | Readiness Level |
|:---|:---:|:---|:---|:---:|:---:|
| `multimodal_gated_fusion` | `2.0.0` | `models/advanced_multimodal_gated_model.joblib` | `scikit-learn>=1.4.0`, `joblib`, `numpy` | **ACTIVE** | Production-Ready (P1) |
| `modality_ablations` | `2.0.0` | `models/modality_ablations.json` | `json` | **ACTIVE** | Production-Ready (P1) |
| `clip_image_text_alignment` | `1.2.0` | `image_text_consistency.parquet` | `torch>=2.1.0`, `transformers>=4.36` | **ACTIVE** | Production-Ready (P1) |
| `resnet_visual_similarity` | `1.1.0` | `images.parquet`, `image_similarity_pairs.parquet` | `torchvision>=0.16.0`, `imagehash` | **ACTIVE** | Production-Ready (P1) |
| `graph_topology_centrality` | `1.2.0` | `entity_relationships.parquet` | `networkx>=3.2`, `scipy` | **ACTIVE** | Production-Ready (P1) |
| `statistical_pricing_anomaly` | `1.2.0` | `pricing_derived.parquet` | `scipy`, `pandas` | **ACTIVE** | Production-Ready (P1) |
| `nlp_heuristic_review_classifier` | `1.3.0` | `review_nlp_features.parquet` | `nltk`, `scikit-learn` | **ACTIVE (HEURISTIC)** | Auxiliary Stream |
| `track2_gold_review_classifier` | `0.1.0` | N/A | Human Annotations | **BLOCKED** | Blocked (Human Annotation Required) |
| `supervised_product_fraud_classifier`| `0.1.0` | N/A | Certified Enforcement Data | **BLOCKED** | Blocked (External Data Required) |

---

## 2. Integrity Hashes & Artifact Verification

- `models/advanced_multimodal_gated_model.joblib`: Persisted and tested.
- `models/modality_ablations.json`: Evaluated across 5-fold StratifiedGroupKFold on 3,643 canonical catalog products.
- Target Dataset: `data/indian_marketplace_trust_dataset_v1_7` (certified and leakage-safe).
