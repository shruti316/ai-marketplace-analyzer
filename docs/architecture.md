# System Architecture & Multimodal Data Flow

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Target Ecosystems:** Amazon India, Flipkart, Myntra  
**Status:** Frozen ML V1.0 Architecture  

---

## 1. High-Level Architectural Vision

The platform evaluates product listings, seller networks, pricing behavior, and visual assets across Indian e-commerce marketplaces to generate explainable, evidence-grounded trust assessments.

Rather than relying on black-box heuristics or single-modality classification, the system decouples:
1. **Atomic Evidence Extraction:** Independent domain engines that extract verifiable observations.
2. **Deterministic Trust Assessment:** Transparent, auditable rule policies enforcing the Zero-Penalty Invariant.
3. **Continuous Multimodal Anomaly Ranking:** A 5-stream Gated Multimodal Fusion Engine regularized via Modality Dropout ($p=0.25$) and calibrated via Isotonic Regression.

```
 +-------------------------------------------------------------------------------------------------+
 |                                    RAW MARKETPLACE DATA SOURCES                                 |
 |        Amazon India Crawl        |          Flipkart Crawl          |        Myntra Crawl       |
 +----------------------------------+----------------------------------+---------------------------+
                                                    |
                                                    v
 +-------------------------------------------------------------------------------------------------+
 |                                CANONICAL RELATIONAL DATA MATRIX                                 |
 |       Products (3,643)      |       Listings (3,643)       |       Brands (1,593)               |
 |       Reviews (3,659)       |       Images (4,708)         |       Graph Edges (41,372)         |
 +-------------------------------------------------------------------------------------------------+
                                                    |
                                                    v
 +-------------------------------------------------------------------------------------------------+
 |                                      DOMAIN EVIDENCE ENGINES                                    |
 |  [Pricing]       MAD robust z-scores, discount % distributions, cross-seller price dispersion   |
 |  [Review NLP]    VADER sentiment, rating-text discordance, 3-gram Jaccard duplicate shingling   |
 |  [Vision CV]     ResNet-18 512-dim visual embeddings, 64-bit dHash, SHA-256 duplicate hashing   |
 |  [CLIP Dual]     ViT-B/32 zero-shot vision-language title-image cosine similarity alignment     |
 |  [Graph Network] NetworkX degree centrality & scaled PageRank over 41,372 relationship edges   |
 |  [Packaging OCR] Windows WinRT / Tesseract brand-token Levenshtein matching (Audit-only)        |
 +-------------------------------------------------------------------------------------------------+
                                                    |
                         +--------------------------+--------------------------+
                         |                                                     |
                         v                                                     v
 +-----------------------------------------------+     +-----------------------------------------------+
 |         DETERMINISTIC TRUST ENGINE            |     |        GATED MULTIMODAL FUSION ENGINE         |
 |  - Evaluates per-modality anomalies           |     |  - 13 dense normalized input features         |
 |  - Strict Zero-Penalty Invariant              |     |  - Modality Availability Mask M in {0, 1}^5   |
 |  - Rule: active_modalities >= 2 -> ELEVATED   |     |  - Modality Dropout (p=0.25) during training  |
 |  - Synthesizes positive & negative evidence   |     |  - Isotonic Monotonic Probability Calibrator  |
 +-----------------------------------------------+     +-----------------------------------------------+
                         |                                                     |
                         v                                                     v
 +-------------------------------------------------------------------------------------------------+
 |                                APPLICATION SERVICE INTERFACES                                   |
 |  In-Process SDK: TrustIntelligenceEngine (src/trust_engine/api_service.py)                      |
 |  REST API Server: TrustIntelligenceRestServer (src/api/service.py)                              |
 +-------------------------------------------------------------------------------------------------+
```

---

## 2. Modality Participation & Feature Representation

The learned model operates on **13 dense continuous features** partitioned across 5 active modality streams:

| Stream | Features ($D$) | Input Indices | Signals Measured | Active Availability |
|:---|:---:|:---:|:---|:---:|
| **Pricing** | 3 | `x[0:3]` | `log_price_inr`, `discount_percentage`, `mad_robust_z` | 100% of catalog |
| **Review NLP** | 4 | `x[3:7]` | `mean_rating`, `mean_sentiment`, `rating_discordance`, `is_duplicate` | Products with reviews |
| **Vision (CV)** | 2 | `x[7:9]` | `cv_has_duplicate_hash`, `normalized_image_count` | Products with images |
| **CLIP** | 2 | `x[9:11]` | `clip_cosine_similarity`, `clip_is_discordant` | Precomputed benchmark set |
| **Graph** | 2 | `x[11:13]` | `graph_degree_centrality`, `graph_scaled_pagerank` | 100% of catalog |

### Why OCR is Not a Learned Modality Feature
Physical packaging OCR is available for only 100 benchmark products ($2.7\%$ of catalog). Forcing a 6th learned stream with $97.3\%$ missing data would introduce severe sparsity artifacts. OCR operates as an **independent deterministic evidence-only and audit engine** (`EvidenceModality.OCR`), remaining neutral under the Zero-Penalty Invariant when unobserved.

---

## 3. Mathematical Principles & Invariants

### 3.1 The Zero-Penalty Invariant
An unobserved modality must contribute exactly zero risk points:
$$\mathbf{M} = [m_{\text{price}}, m_{\text{review}}, m_{\text{vision}}, m_{\text{clip}}, m_{\text{graph}}] \in \{0, 1\}^5$$
$$\mathbf{x}'_k = \mathbf{g}_k \odot (\mathbf{x}_k \cdot m_k), \quad \lim_{m_k \to 0} \mathbf{x}'_k = \mathbf{0}$$

### 3.2 Epistemic Uncertainty Dynamic Expansion
Uncertainty half-width $w$ expands dynamically as observed modality density decreases:
$$w = 0.05 + 0.10 \times \frac{5 - K_{\text{active}}}{5}, \quad K_{\text{active}} = \sum_{k=1}^5 m_k$$
$$\text{Confidence Interval} = [\max(0.0, P - w), \; \min(1.0, P + w)]$$

---

## 4. Scientific Grounding & Ethical Limitations

1. **Proxy Target Reality:** The target predicted by `GatedMultimodalFusionModel` is a **deterministic rule proxy** (`active_anomalies >= 2`). It is **NOT** independent external fraud. Exactly $0\%$ of catalog labels are legal counterfeit takedowns.
2. **Weak Supervision in NLP:** Track 1 Silver NLP classifier is trained on 600 heuristic pseudo-labels ($F_1 = 0.749$). Track 2 Gold model is blocked ($n=100$ provisional reviews exhibit single-annotator rating bias).
3. **Keyword-Based Aspect Extraction:** Aspect extraction operates via lexical keyword rules (`LEXICAL_KEYWORD_SPAN_RULE_EXTRACTOR`), not fine-tuned neural transformers.
4. **Single-Snapshot Pricing:** Pricing anomalies reflect static snapshot deviations from category medians; longitudinal price histories over time are not yet tracked.
