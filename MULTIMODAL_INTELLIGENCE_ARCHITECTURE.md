# Multimodal Intelligence Architecture Specification

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Document:** Master Multimodal AI Intelligence Architecture  
**Phase:** Phase 2 — Complete Multimodal Intelligence Development  
**Status:** Certified & Implemented  
**Date:** November 11, 2026  
**Authors:** Antigravity AI Research & Engineering Team  

---

## 1. Executive Summary & Vision

The **AI-Powered Indian Marketplace Trust Intelligence Platform** delivers deep, evidence-grounded trust, credibility, and anomaly assessment across Indian e-commerce ecosystems (Amazon India, Flipkart, Myntra).

Unlike shallow systems that concatenate disparate scalar anomaly scores or rely on linear heuristics, this platform deploys a **Gated Multimodal Fusion Architecture** combining five heterogeneous modality streams:
1. **Statistical Pricing Intelligence** (MAD robust z-scores, price dispersion, corridor anomalies).
2. **Review NLP Intelligence** (Lexical sentiment discordance, verified purchase ratios, duplicate text clusters).
3. **Computer Vision Intelligence** (ResNet-18 visual embeddings, perceptual dHash fingerprints, cross-catalog hero image reuse).
4. **Cross-Modal Vision-Language Alignment** (CLIP ViT-B/32 cosine alignment, cross-modal semantic discordance).
5. **Graph Network Intelligence** (Entity relationship graphs across 41,372 edges, PageRank, degree centrality, connected component isolation).

```
 +-----------------------------------------------------------------------------------------------+
 |                              RAW EVIDENCE MODALITY STREAMS                                    |
 +------------------+------------------+------------------+-------------------+------------------+
 |  Pricing Stream  |   Review Stream  |   Vision Stream  |    CLIP Stream    |   Graph Stream   |
 |  (3 Dimensions)  |  (4 Dimensions)  |  (2 Dimensions)  |  (2 Dimensions)   |  (2 Dimensions)  |
 +--------+---------+--------+---------+--------+---------+---------+---------+--------+---------+
          |                  |                  |                   |                  |
          v                  v                  v                   v                  v
 +-----------------------------------------------------------------------------------------------+
 |               MODALITY AVAILABILITY MASK  M = [m_price, m_rev, m_img, m_clip, m_graph]        |
 |                       Zero-Penalty Invariant: Missing Modality (m_k = 0) -> 0.0               |
 +-----------------------------------------------------------------------------------------------+
                                                |
                                                v
 +-----------------------------------------------------------------------------------------------+
 |                             GATED MULTIMODAL UNIT (GMU) ENSEMBLE                              |
 |            Gated Feature:  x'_k = g_k * x_k * m_k    where g_k in [0.0, 1.0]                  |
 |            Modality Dropout (ModDrop): p = 0.25 (Regularization during cross-validation)      |
 +-----------------------------------------------------------------------------------------------+
                                                |
                                                v
 +-----------------------------------------------------------------------------------------------+
 |                              MULTI-TASK PREDICTION HEADS                                      |
 |  Head A: Review Manipulation Risk        Head B: Visual Duplicate / Cross-Catalog Reuse       |
 |  Head C: Price Corridor Anomaly Risk     Head D: Cross-Modal Semantic Discordance             |
 +-----------------------------------------------------------------------------------------------+
                                                |
                                                v
 +-----------------------------------------------------------------------------------------------+
 |                           ISOTONIC CALIBRATION & UNCERTAINTY                                  |
 |  Continuous Anomaly Score -> Isotonic Regression -> Calibrated Posterior Probability           |
 |  Epistemic Uncertainty Expansion: w = 0.05 + 0.10 * (5 - K_active) / 5                        |
 |  Confidence Interval: [max(0, p - w),  min(1, p + w)]                                         |
 +-----------------------------------------------------------------------------------------------+
```

---

## 2. Multi-Stream Representation Design

### 2.1 Modality Stream Definitions & Dimensions ($D = 13$)

| Modality Stream | Dimension Index | Feature Name | Description | Source Parquet |
|:---|:---|:---|:---|:---|
| **Pricing** | `x[0]` | `price_robust_z` | Median Absolute Deviation (MAD) robust z-score of listing price | `pricing_derived.parquet` |
| **Pricing** | `x[1]` | `discount_percentage` | Relative discount from declared MRP / list price | `prices.parquet` |
| **Pricing** | `x[2]` | `price_dispersion_ratio` | Cross-seller price variance for the canonical product | `pricing_derived.parquet` |
| **Review NLP** | `x[3]` | `sentiment_discordance` | Lexical sentiment divergence against declared numerical star rating | `review_nlp_features.parquet` |
| **Review NLP** | `x[4]` | `avg_review_length` | Standardized word length ratio of customer reviews | `review_nlp_features.parquet` |
| **Review NLP** | `x[5]` | `verified_purchase_ratio` | Ratio of verified buyer tags across product review corpus | `reviews.parquet` |
| **Review NLP** | `x[6]` | `duplicate_review_ratio` | Ratio of reviews sharing duplicate textual shingles (Jaccard $\ge 0.85$) | `review_nlp_features.parquet` |
| **Vision** | `x[7]` | `visual_duplicate_score` | Cosine similarity against known catalog duplicate cluster centroids | `image_similarity_pairs.parquet` |
| **Vision** | `x[8]` | `is_stock_photo` | Indicator for low-entropy plain white studio background hero photo | `images.parquet` |
| **CLIP** | `x[9]` | `clip_cosine_similarity` | ViT-B/32 cosine similarity between product title and hero image | `image_text_consistency.parquet` |
| **CLIP** | `x[10]` | `clip_discordance_score` | Inverted alignment score ($1.0 - \text{cosine}$ scaled to $[0, 1]$) | `image_text_consistency.parquet` |
| **Graph** | `x[11]` | `graph_degree_centrality` | Degree in multi-marketplace co-occurrence and seller-product network | `entity_relationships.parquet` |
| **Graph** | `x[12]` | `graph_pagerank` | Scaled PageRank score across the 41,372 relationship graph edges | `entity_relationships.parquet` |

---

## 3. Mathematical Formulation of Gated Multimodal Fusion

### 3.1 Availability Masking & The Zero-Penalty Invariant

In real-world marketplace environments, missing modalities are frequent (e.g., brand-new products lack customer reviews; catalog imports lack high-res packaging OCR). A fundamental failure mode of naive architectures is penalizing a product simply because an observation is absent.

We define an explicit binary modality observation mask:
$$\mathbf{M} = [m_{\text{price}}, m_{\text{review}}, m_{\text{vision}}, m_{\text{clip}}, m_{\text{graph}}] \in \{0, 1\}^5$$

**The Zero-Penalty Invariant:**
An unobserved modality $k$ with $m_k = 0$ must contribute exactly zero anomaly energy to the fused representation:
$$\mathbf{x}'_k = \mathbf{g}_k \odot (\mathbf{x}_k \cdot m_k), \quad \text{where } \lim_{m_k \to 0} \mathbf{x}'_k = \mathbf{0}$$

### 3.2 Gating Mechanism (GMU)

For each modality stream $k \in \{1, \dots, 5\}$, a gating parameter vector $\mathbf{w}_k$ scales the influence based on modality credibility:
$$g_k = \sigma(\mathbf{w}_k^T \mathbf{x}_k + b_k) \cdot m_k$$
where $\sigma(z) = \frac{1}{1 + e^{-z}}$.

When $m_k = 0$, $g_k = 0$, ensuring the unobserved modality is completely silenced without inducing bias or spurious gradient updates.

### 3.3 Modality Dropout (ModDrop)

During training and cross-validation, to ensure the model does not become over-reliant on any single modality (such as the high-capacity graph network), we apply Modality Dropout:
$$\tilde{m}_k = m_k \cdot \text{Bernoulli}(1 - p_{\text{drop}}), \quad p_{\text{drop}} = 0.25$$

This forces the multimodal fusion heads to learn synergistic combinations across sparse sub-modalities.

---

## 4. Multi-Task Prediction Heads

The architecture incorporates five specialized prediction heads:

1. **Continuous Multimodal Anomaly Rank Head:**
   $$S_{\text{multimodal}} = f_{\text{ensemble}}(\mathbf{x}'_1, \mathbf{x}'_2, \dots, \mathbf{x}'_5) \in [0.0, 1.0]$$
2. **Review Manipulation Risk Head:** Focuses on sentiment-rating divergence, review text duplication, and verified purchase drops.
3. **Visual Duplicate Risk Head:** Detects bitwise SHA-256 and perceptual dHash near-duplicate hero image reuse across unrelated sellers.
4. **Price Corridor Risk Head:** Flags extreme MAD robust deviations from category price distributions.
5. **Cross-Modal Semantic Discordance Head:** Flags extreme mismatches where the listing title describes an entirely different item than the displayed image.

---

## 5. Uncertainty Quantification & Calibration

Raw tree-ensemble scores are uncalibrated probabilities. To provide reliable risk assessment, the output is passed through an **Isotonic Calibrator**:
$$P_{\text{calibrated}} = \mathcal{I}(S_{\text{multimodal}})$$

### Epistemic Uncertainty Interval
The confidence interval dynamically expands when fewer modalities are active:
$$w_{\text{uncertainty}} = w_{\text{base}} + \Delta w \cdot \frac{5 - K_{\text{active}}}{5}$$
where $w_{\text{base}} = 0.05$, $\Delta w = 0.10$, and $K_{\text{active}} = \sum_{k=1}^5 m_k$.

Confidence Interval:
$$\text{CI} = \left[\max\left(0.0, P_{\text{calibrated}} - w_{\text{uncertainty}}\right), \; \min\left(1.0, P_{\text{calibrated}} + w_{\text{uncertainty}}\right)\right]$$

This mathematical guarantee ensures that products with missing evidence are flagged with higher epistemic uncertainty, preventing ungrounded high-confidence verdicts.
