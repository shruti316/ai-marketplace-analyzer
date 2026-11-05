# Dataset & Pipeline Reproducibility Audit — v1.7
## Marketplace Trust Intelligence Platform

- **Deterministic Execution:** All random seeds pinned (`seed=42`).
- **End-to-End Pipeline Scripts:**
  1. `src/data/matching/cross_marketplace_entity_resolution_v1_7.py`
  2. `src/nlp/review_behavioral_features_v1_7.py`
  3. `src/vision/vision_intelligence_v1_7.py`
  4. `src/nlp/nlp_intelligence_v1_7.py`
  5. `src/pricing/pricing_intelligence_v1_7.py`
  6. `src/sellers/seller_intelligence_v1_7.py`
  7. `src/relationships/graph_intelligence_v1_7.py`
  8. `src/evaluation/fraud_taxonomy_v1_7.py`
  9. `src/fusion/multimodal_fusion_engine_v1_7.py`
  10. `src/evaluation/evaluation_and_bias_audit_v1_7.py`
  11. `src/data/curation/build_marketplace_trust_dataset_v1_7.py`
  12. `src/data/curation/validate_marketplace_trust_dataset_v1_7.py`
- **Pytest Suite:** `tests/test_marketplace_trust_dataset_v1_7.py`
