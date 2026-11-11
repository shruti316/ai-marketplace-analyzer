# Final Repository Structure Map

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Document:** Complete Codebase and Directory Map  
**Phase:** Phase 2 — Complete Multimodal Intelligence Development  
**Date:** November 11, 2026  

---

```
ai-based-marketplace-analyzer/
├── data/
│   ├── indian_marketplace_trust_dataset_v1_6/   # FROZEN baseline dataset (370 protected tests)
│   └── indian_marketplace_trust_dataset_v1_7/   # Current active derived dataset
│       ├── entities/                            # products.parquet, sellers.parquet, listings.parquet, brands.parquet
│       ├── evidence/                            # reviews.parquet, prices.parquet, images.parquet, ocr_evidence.parquet
│       ├── relationships/                       # entity_relationships.parquet (41,372 edges)
│       ├── derived_evidence/                    # image_text_consistency.parquet, trust_assessments_products.parquet
│       └── splits/                              # leakage_safe_splits.json, group_splits.parquet
│
├── models/
│   ├── advanced_multimodal_gated_model.joblib   # Certified Phase 2 Gated Multimodal Model
│   ├── modality_ablations.json                  # Pre-computed 5-fold cross-validated ablation metrics
│   ├── multimodal_anomaly_rf.joblib             # Phase 1 baseline model
│   └── silver_nlp_model.joblib                  # Heuristic Silver review classifier
│
├── MODEL_CARDS/
│   ├── multimodal_gated_fusion.md               # Master Gated Multimodal Fusion Model Card
│   ├── clip_image_text_alignment.md             # CLIP ViT-B/32 Cross-Modal Alignment Card
│   ├── resnet_visual_similarity.md              # ResNet-18 Deep Visual Similarity Card
│   ├── nlp_heuristic_review_classifier.md       # NLP Sentiment-Rating Discordance Card
│   ├── statistical_pricing_anomaly.md           # Statistical Pricing Corridor Card
│   ├── graph_topology_centrality.md             # Graph Network Centrality Card
│   └── ocr_packaging_verification.md            # Physical Packaging OCR Verification Card
│
├── src/
│   ├── api/
│   │   ├── __init__.py
│   │   └── service.py                           # REST dispatcher with /learned-multimodal and /ablations
│   ├── evaluation/
│   │   ├── empirical_multimodal_benchmarks.py   # Empirical hard-negative CLIP, visual taxonomy & graph benchmarks
│   │   └── leakage_audit.py                     # Scientific leakage audit suite
│   ├── models/
│   │   ├── advanced_multimodal_fusion.py        # Gated Multimodal Fusion Engine with ModDrop & Isotonic Calibration
│   │   ├── clip_alignment.py                    # CLIP ViT-B/32 embedding extraction
│   │   ├── deep_vision.py                       # ResNet-18 visual feature extraction
│   │   ├── multimodal_learned_fusion.py         # Phase 1 baseline fusion model
│   │   ├── nlp_review.py                        # NLP lexical and shingle feature pipeline
│   │   ├── ocr_packaging.py                     # Packaging OCR engine and portability abstraction
│   │   ├── pricing_intelligence.py              # MAD robust z-score pricing analyzer
│   │   └── relationship_graph.py                # Graph topology and sub-graph service
│   └── trust_engine/
│       ├── api_service.py                       # TrustIntelligenceEngine master facade
│       ├── evidence_engine.py                   # Unified evidence extraction engine
│       ├── model_engine.py                      # Multi-model evaluation orchestrator
│       └── rule_engine.py                       # Deterministic trust scoring and policy rules
│
├── tests/
│   ├── test_advanced_multimodal_intelligence.py # Dedicated test suite for Phase 2 multimodal model & API
│   ├── test_api_endpoints.py                    # REST server endpoint integration tests
│   ├── test_clip_alignment.py                   # CLIP alignment tests
│   ├── test_multimodal_learned_fusion.py        # Multimodal fusion tests
│   ├── test_phase1_final_architecture.py        # Phase 1 architecture verification tests
│   └── ... (35+ additional unit & integration test suites, 523+ tests passing)
│
├── reports/
│   ├── phase_1/                                 # Phase 1 scientific audit & validation reports
│   └── phase_2_multimodal/                      # Empirical benchmarks & ablation study artifacts
│
├── COMPLETE_MODEL_GAP_AUDIT.md                  # Stage 0 Complete Model Layer Technical Gap Audit
├── MULTIMODAL_INTELLIGENCE_ARCHITECTURE.md      # Master Multimodal AI Intelligence Architecture
├── TARGET_AND_LABEL_REGISTRY_REPORT.md          # Complete Target & Ground Truth Registry
├── NLP_FINAL_EVALUATION.md                      # NLP Modality Scientific Evaluation Report
├── CV_FINAL_EVALUATION.md                       # Computer Vision & Visual Duplicate Taxonomy Report
├── OCR_FINAL_EVALUATION.md                      # Packaging OCR & Portability Report
├── CLIP_FINAL_EVALUATION.md                     # CLIP Cross-Modal Alignment & Hard Negatives Report
├── PRICING_INTELLIGENCE_EVALUATION.md           # Statistical Pricing Intelligence Report
├── GRAPH_INTELLIGENCE_EVALUATION.md             # Graph Network Intelligence & Topology Report
├── MULTIMODAL_FUSION_EVALUATION.md              # Gated Multimodal Fusion Final Evaluation Report
├── ABLATION_STUDY_REPORT.md                     # 5-Fold Leave-One-Out Modality Ablation Report
├── MODEL_CALIBRATION_AND_UNCERTAINTY.md         # Isotonic Calibration & Uncertainty Intervals Report
├── MODEL_VERSION_REGISTRY.md                    # Production Model Version Registry
├── INFERENCE_INTERFACE_SPECIFICATION.md         # REST API & SDK Interface Specification
├── REPRODUCIBILITY_GUIDE.md                     # Step-by-Step Scientific Reproducibility Guide
├── FINAL_MODEL_READINESS_REPORT.md              # Final Readiness & Sign-Off Report
├── FINAL_REPOSITORY_STRUCTURE.md                # Codebase Directory Map (this document)
├── PHASE_3_BACKEND_HANDOFF.md                   # Application Backend Engineering Handoff
└── README.md                                    # Platform README
```
