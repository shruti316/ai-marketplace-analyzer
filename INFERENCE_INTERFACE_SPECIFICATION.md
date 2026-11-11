# Inference Interface Specification

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Document:** Learned Multimodal Inference API & Interface Specification  
**Phase:** Phase 2 — Complete Multimodal Intelligence Development  
**Status:** Certified Specification  
**Date:** November 11, 2026  

---

## 1. REST Endpoints Specification

### 1.1 Product Learned Multimodal Trust Assessment
- **Method:** `GET`
- **Route:** `/api/v1/products/{canonical_product_id}/learned-multimodal`
- **Description:** Performs calibrated gated multimodal inference across all observed evidence streams with epistemic uncertainty intervals and multi-task risk predictions.

#### Success Response (`200 OK`)
```json
{
  "canonical_product_id": "amazon_in_B000052YQN",
  "continuous_anomaly_score": 0.0842,
  "calibrated_risk_probability": 0.0842,
  "confidence_interval": [0.0342, 0.1342],
  "predicted_risk_tier": "LOW_OBSERVED_ANOMALY",
  "modality_availability": {
    "pricing": true,
    "review": true,
    "image": true,
    "clip": true,
    "graph": true
  },
  "active_modalities_count": 5,
  "modality_contributions": {
    "pricing": 0.0215,
    "review": 0.0110,
    "vision": 0.0000,
    "clip": 0.0410,
    "graph": 0.0107
  },
  "multi_task_risk_heads": {
    "review_manipulation_risk": 0.0315,
    "visual_duplicate_risk": 0.0000,
    "price_corridor_risk": 0.0450,
    "cross_modal_discordance_risk": 0.0410
  },
  "zero_penalty_invariant_applied": true,
  "model_version": "2.0.0",
  "assessment_timestamp": 1794370424.2328
}
```

#### Error Responses
- `404 Not Found`:
```json
{
  "error": true,
  "status_code": 404,
  "message": "Product 'non_existent_id' not found in catalog."
}
```
- `405 Method Not Allowed`:
```json
{
  "error": true,
  "status_code": 405,
  "message": "Method 'POST' not allowed."
}
```

---

### 1.2 Modality Ablation Studies Endpoint
- **Method:** `GET`
- **Route:** `/api/v1/ablations`
- **Description:** Returns the 5-fold cross-validated empirical metrics across all 10 multimodal and unimodal configurations.

#### Success Response (`200 OK`)
```json
{
  "Full_Multimodal_Gated_Model": {
    "mean_roc_auc": 0.9732,
    "mean_pr_auc": 0.6846,
    "mean_brier_score": 0.0753,
    "features_count": 13
  },
  "Pricing_Only": {
    "mean_roc_auc": 0.6828,
    "mean_pr_auc": 0.1657,
    "mean_brier_score": 0.1629,
    "features_count": 3
  },
  "Review_NLP_Only": {
    "mean_roc_auc": 0.5074,
    "mean_pr_auc": 0.0571,
    "mean_brier_score": 0.2355,
    "features_count": 4
  },
  "Vision_Only": {
    "mean_roc_auc": 0.7656,
    "mean_pr_auc": 0.1887,
    "mean_brier_score": 0.173,
    "features_count": 2
  },
  "CLIP_Only": {
    "mean_roc_auc": 0.4986,
    "mean_pr_auc": 0.0423,
    "mean_brier_score": 0.246,
    "features_count": 2
  },
  "Graph_Only": {
    "mean_roc_auc": 0.9755,
    "mean_pr_auc": 0.717,
    "mean_brier_score": 0.0709,
    "features_count": 2
  },
  "Ablation_Drop_Pricing": {
    "mean_roc_auc": 0.9768,
    "mean_pr_auc": 0.7176,
    "mean_brier_score": 0.0724,
    "features_count": 10
  },
  "Ablation_Drop_Review": {
    "mean_roc_auc": 0.9719,
    "mean_pr_auc": 0.7206,
    "mean_brier_score": 0.0664,
    "features_count": 9
  },
  "Ablation_Drop_Vision": {
    "mean_roc_auc": 0.9607,
    "mean_pr_auc": 0.5726,
    "mean_brier_score": 0.0937,
    "features_count": 11
  },
  "Ablation_Drop_Graph": {
    "mean_roc_auc": 0.8483,
    "mean_pr_auc": 0.3363,
    "mean_brier_score": 0.118,
    "features_count": 11
  }
}
```

---

## 2. Python Programmatic SDK Interface

```python
from src.models.advanced_multimodal_fusion import AdvancedMultimodalIntelligenceService

# Instantiate service (loads cached model and ablations)
service = AdvancedMultimodalIntelligenceService()

# Run inference on any canonical product ID
assessment = service.assess_product_multimodal("amazon_in_B000052YQN")

print(f"Risk Tier: {assessment.predicted_risk_tier}")
print(f"Calibrated Probability: {assessment.calibrated_risk_probability:.4f}")
print(f"Confidence Interval: {assessment.confidence_interval}")
print(f"Multi-Task Heads: {assessment.multi_task_risk_heads}")
```
