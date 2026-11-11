# AI-Powered Indian Marketplace Trust Intelligence Platform

An explainable, evidence-grounded multimodal marketplace intelligence and trust evaluation platform designed for Indian e-commerce ecosystems (**Amazon India**, **Flipkart**, and **Myntra**).

---

## 1. Executive Overview & Multimodal Architecture

The platform combines five heterogeneous modality evidence streams into a **Gated Multimodal Fusion Engine** with Modality Dropout ($p=0.25$) and Isotonic Probability Calibration:

1. **Statistical Pricing Intelligence:** Non-parametric Median Absolute Deviation (MAD) robust z-scores, discount percentage distributions, and cross-seller price dispersion across 3,667 price observations.
2. **Review NLP Intelligence:** VADER sentiment-rating discordance, verified purchase ratios, and 3-gram text duplicate shingling across 3,659 customer reviews.
3. **Computer Vision Intelligence:** ResNet-18 512-dimensional visual embeddings, 64-bit dHash perceptual hashing, and SHA-256 bitwise duplicate detection across 4,708 catalog images (mAP: **$0.972$**).
4. **Cross-Modal Vision-Language Alignment:** OpenAI CLIP ViT-B/32 cosine similarity evaluated against 100 empirical hard-negative catalog pairs (ROC-AUC: **$0.9962$**, Separation Margin: **$+0.1824$**).
5. **Graph Network Intelligence:** Heterogeneous entity relationship graph across 41,372 edges connecting products, listings, brands, and sellers (PageRank, degree centrality, connected component isolation).

---

## 2. Empirical Benchmark & Ablation Highlights

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

## 3. Scientific Safeguards & Ethical Governance

1. **Zero-Penalty Invariant:** Missing modalities are represented as neutral nulls ($m_k = 0$) and do not artificially trigger anomaly penalties.
2. **Dynamic Epistemic Uncertainty:** Outputs include calibrated confidence intervals that dynamically expand when evidence is sparse ($w \in [\pm 0.05, \pm 0.15]$).
3. **Strict Target Separation:** Observable statistical anomalies are strictly differentiated from confirmed legal fraud verdicts.
4. **Blocked Models:**
   - `Track 2 Gold Review Classifier`: Marked **BLOCKED — HUMAN ANNOTATION REQUIRED** due to sample sparsity (100 reviews).
   - `Supervised Product Fraud Classifier`: Marked **BLOCKED — EXTERNAL DATA REQUIRED** due to lack of certified external enforcement data.

---

## 4. REST API & Inference Quickstart

### In-Process Python SDK:
```python
from src.trust_engine.api_service import TrustIntelligenceEngine

engine = TrustIntelligenceEngine()
assessment = engine.assess_product_learned_multimodal("amazon_in_B000052YQN")
print(assessment)
```

### REST Endpoints:
- `GET /api/v1/products/{product_id}/learned-multimodal`: Returns calibrated anomaly score, confidence interval, and multi-task heads.
- `GET /api/v1/ablations`: Returns 5-fold cross-validated modality ablation metrics.
- `GET /health`: Returns service health, dataset version (`v1.7`), and catalog entity statistics.

---

## 5. Running Tests

```bash
# Run advanced multimodal test suite
.venv\Scripts\python.exe -m pytest tests/test_advanced_multimodal_intelligence.py -v

# Run full system regression test suite
.venv\Scripts\python.exe -m pytest tests/
```
