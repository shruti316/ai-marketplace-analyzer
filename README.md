# AI-Powered Indian Marketplace Trust Intelligence Platform

An explainable, evidence-grounded multimodal marketplace intelligence and trust evaluation platform designed for Indian e-commerce ecosystems (**Amazon India**, **Flipkart**, and **Myntra**).

---

## 1. Documentation Index

- [System Architecture & Multimodal Data Flow](docs/architecture.md) — Mathematical foundations, 5-stream feature pipeline, and Zero-Penalty Invariant.
- [Developer Setup & Testing Guide](docs/development.md) — Local environment configuration, test suite commands, and VS Code setup.
- [ML Integration & API Contract](docs/ml-integration.md) — Python SDK, REST API endpoints, JSON schemas, and UI presentation policy.
- [Production Model Cards](MODEL_CARDS/) — Technical specifications for the Gated Multimodal Fusion Engine and domain models.
- [Phase 2 Scientific Evaluations](reports/phase_2_multimodal/) — Cross-validation ablations, calibration reports, and benchmark metrics.
- [Backend Audit & Gap Analysis](reports/backend_audit/) — Phase 2 Stage 0 architecture proposals and system gaps.

---

## 2. Executive Overview & Multimodal Architecture

The platform combines five heterogeneous modality evidence streams into a **Gated Multimodal Fusion Engine** with Modality Dropout ($p=0.25$) and Isotonic Probability Calibration:

1. **Statistical Pricing Intelligence:** Non-parametric Median Absolute Deviation (MAD) robust z-scores, discount percentage distributions, and cross-seller price dispersion across 3,667 price observations.
2. **Review NLP Intelligence:** VADER sentiment-rating discordance, verified purchase ratios, and 3-gram text duplicate shingling across 3,659 customer reviews.
3. **Computer Vision Intelligence:** ResNet-18 512-dimensional visual embeddings, 64-bit dHash perceptual hashing, and SHA-256 bitwise duplicate detection across 4,708 catalog images (mAP: **$0.972$**).
4. **Cross-Modal Vision-Language Alignment:** OpenAI CLIP ViT-B/32 cosine similarity evaluated against 100 empirical hard-negative catalog pairs (ROC-AUC: **$0.9962$**, Separation Margin: **$+0.1824$**).
5. **Graph Network Intelligence:** Heterogeneous entity relationship graph across 41,372 edges connecting products, listings, brands, and sellers (PageRank, degree centrality, connected component isolation).

```
 +-----------------------------------------------------------------------------------------------+
 |                              RAW EVIDENCE MODALITY STREAMS                                    |
 |      Pricing (3D)  |  Review NLP (4D)  |  Vision (2D)  |  CLIP (2D)  |  Graph (2D)            |
 +-----------------------------------------------------------------------------------------------+
                                                |
                                                v
 +-----------------------------------------------------------------------------------------------+
 |                 EXPLICIT MODALITY AVAILABILITY MASK  M in {0, 1}^5                             |
 |                 Strict Zero-Penalty Invariant: Missing Modality (m_k = 0) -> 0.0              |
 +-----------------------------------------------------------------------------------------------+
                                                |
                                                v
 +-----------------------------------------------------------------------------------------------+
 |                        GATED MULTIMODAL FUSION & MODDROP (p=0.25)                             |
 |                     Non-Linear Ensemble with Isotonic Probability Calibration                 |
 +-----------------------------------------------------------------------------------------------+
                                                |
                                                v
 +-----------------------------------------------------------------------------------------------+
 |                                  MULTI-TASK PREDICTION HEADS                                  |
 |  Master Continuous Anomaly Score | Review Manipulation | Visual Duplicate | Price Corridor    |
 +-----------------------------------------------------------------------------------------------+
                                                |
                                                v
 +-----------------------------------------------------------------------------------------------+
 |                            EPISTEMIC UNCERTAINTY QUANTIFICATION                               |
 |                  Calibrated Confidence Interval: [max(0, P - w), min(1, P + w)]               |
 |                  Dynamic Expansion: w = 0.05 + 0.10 * (5 - K_active) / 5                      |
 +-----------------------------------------------------------------------------------------------+
```

---

## 3. Empirical Benchmark & Ablation Highlights

Evaluated across all 3,643 canonical catalog products using 5-fold Stratified Group Cross-Validation (`StratifiedGroupKFold`):

| Configuration | Modalities Included | Features | Mean ROC-AUC | Mean PR-AUC | Mean Brier Score | Status |
|:---|:---|:---:|:---:|:---:|:---:|:---:|
| **Full Multimodal Gated Model** | **All 5 Streams** | **13** | **$0.9732$** | **$0.6846$** | **$0.0753$** | **Certified Baseline** |
| **Pricing Only** | Pricing | 3 | $0.6828$ | $0.1657$ | $0.1629$ | Unimodal Baseline |
| **Review NLP Only** | Review NLP | 4 | $0.5074$ | $0.0571$ | $0.2355$ | Unimodal Baseline |
| **Vision Only** | Vision (ResNet-18 + dHash) | 2 | $0.7656$ | $0.1887$ | $0.1730$ | Unimodal Baseline |
| **CLIP Only** | Vision-Language Alignment | 2 | $0.4986$ | $0.0423$ | $0.2460$ | Unimodal Baseline |
| **Graph Only** | Graph Topology (PageRank + Degree) | 2 | $0.9755$ | $0.7170$ | $0.0709$ | Structural Backbone |
| **Ablation: Drop Vision** | Pricing, Review, CLIP, Graph | 11 | $0.9607$ | $0.5726$ | $0.0937$ | $-16.4\%$ PR-AUC Drop |
| **Ablation: Drop Graph** | Pricing, Review, Vision, CLIP | 11 | $0.8483$ | $0.3363$ | $0.1180$ | **$-50.9\%$ PR-AUC Collapse** |

---

## 4. Repository Structure

```
ai-based-marketplace-analyzer/
├── .vscode/               # Portable workspace editor settings & extensions
├── data/                  # Frozen catalog datasets & benchmarks
├── docs/                  # System architecture, developer guides & API contracts
├── manifests/             # Benchmark verification & split manifests
├── models/                # Trained model artifacts & calibrators
├── MODEL_CARDS/           # Production model cards for all active models
├── notebooks/             # Exploratory analysis & evaluation notebooks
├── reports/               # Archived audit findings & Phase 2 evaluations
├── scripts/               # Training, evaluation & verification CLI tools
├── src/                   # Active Python source code
└── tests/                 # 534 unit, integration, and regression tests
```

---

## 5. Scientific Safeguards & Ethical Governance

1. **Zero-Penalty Invariant:** Missing modalities are represented as neutral nulls ($m_k = 0$) and do not artificially trigger anomaly penalties.
2. **Dynamic Epistemic Uncertainty:** Outputs include calibrated confidence intervals that dynamically expand when evidence is sparse ($w \in [\pm 0.05, \pm 0.15]$).
3. **Strict Target Separation:** Observable statistical anomalies are strictly differentiated from confirmed legal fraud verdicts. The model predicts a proxy target (`active_anomalies >= 2`), not verified counterfeits.
4. **Blocked Models:**
   - `Track 2 Gold Review Classifier`: Marked **BLOCKED — HUMAN ANNOTATION REQUIRED** due to sample sparsity (100 reviews).
   - `Supervised Product Fraud Classifier`: Marked **BLOCKED — EXTERNAL DATA REQUIRED** due to lack of certified external enforcement data.

---

## 6. Quickstart: Inference & Comparison

### In-Process Python SDK:
```python
from src.trust_engine.api_service import TrustIntelligenceEngine

engine = TrustIntelligenceEngine()

# Single-product multimodal assessment
assessment = engine.assess_product_learned_multimodal("amazon_in_B000052YQN")
print(f"Risk Score: {assessment['calibrated_risk_probability']:.4f}")
print(f"Confidence Interval: {assessment['confidence_interval']}")

# Multi-product comparison
comparison = engine.compare_products(["amazon_in_B000052YQN", "amazon_in_B0000E3QL7"])
print(f"Recommended Product: {comparison['recommended_product_id']}")
```

### Master REST API Server:
```powershell
python -m src.api.service
```
- `GET /api/v1/health`: Service health and catalog stats.
- `GET /api/v1/products/{product_id}/learned-multimodal`: Calibrated anomaly score, confidence interval, and multi-task heads.
- `POST /api/v1/products/compare`: Multi-product trust comparison.
- `GET /api/v1/ablations`: Modality ablation metrics.

---

## 7. Running Tests

Execute the full regression test suite:

```powershell
python -m pytest tests/ -q
```
