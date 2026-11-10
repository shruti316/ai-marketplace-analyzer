# Model Readiness & Machine Learning Evaluation Report
**Indian Marketplace Multimodal Trust Dataset v1.7**
*AI-Powered Indian Marketplace Trust Intelligence Platform*
*Release Date: November 10, 2026*

---

## 1. Executive Summary

Dataset v1.7 is explicitly structured to support downstream machine learning and deep learning architectures for multimodal trust intelligence, including Graph Neural Networks (GNNs), Gradient Boosted Decision Trees (GBDTs), and Vision-Language Foundation Models.

This report documents the **Model-Readiness Audit**, tabular feature schemas, visual tensor embeddings, graph adjacency structures, and benchmark split integrity in Dataset v1.7.

---

## 2. Multimodal Feature Assets & Tensor Dimensions

### 2.1 Deep Computer Vision Embeddings (`visual_embeddings_resnet18.npz`)
- **Architecture:** PyTorch ResNet-18 (ImageNet pre-trained backbone, average pooling layer).
- **Tensor Shape:** `(4708, 512)` float32 matrix.
- **Normalization:** L2-normalized and centered across catalog mean:
  $$\hat{\mathbf{v}}_i = \frac{\mathbf{v}_i - \boldsymbol{\mu}}{\|\mathbf{v}_i - \boldsymbol{\mu}\|_2}$$
- **Readiness:** Direct plug-and-play tensor input for visual similarity classifiers, k-NN search (FAISS), or multimodal projection layers.

### 2.2 NLP & Review Intelligence Features (`review_nlp_features.parquet`)
- **Sample Count:** 3,659 customer reviews across 148 review-bearing products.
- **Continuous Features:** `char_length`, `word_count`, `avg_word_length`, `capital_ratio`, `sentiment_score`, `rating_discordance_score`.
- **Categorical / One-Hot Features:** `detected_language` (English, Hindi, Hinglish), `detected_script` (Latn, Deva), `sentiment_polarity` (POSITIVE, NEGATIVE, NEUTRAL).
- **Aspect-Based Polarity Tensors:** 6 ABSA domains (Quality, Authenticity, Delivery, Packaging, Service, Value) with presence flags, polarity classes, and span character offsets.

### 2.3 Non-Parametric Pricing Features (`pricing_features.parquet`)
- **Sample Count:** 3,643 canonical catalog products.
- **Continuous Scaled Features:** `observed_price_inr`, `mrp_inr`, `discount_percentage`, `robust_z_score`, `corridor_lower_inr`, `corridor_upper_inr`.
- **Categorical Indicators:** `corridor_source` (`HIERARCHICAL_BRAND_CORRIDOR`, `SUBCATEGORY_BENCHMARK_CORRIDOR`), `mrp_consistency_status`.
- **Binary Outlier Flags:** `is_price_outlier`, `is_extreme_price_outlier`, `is_discount_anomaly`, `selling_exceeds_mrp`.

### 2.4 Knowledge Graph Adjacency Structure (`entity_relationships.parquet`)
- **Total Edges:** 41,372 verified edges across 12 semantic types.
- **Node Entities:** Products (3,643), Listings (3,643), Brands (1,593), Platforms (3), Sellers (4), Images (4,708), Reviews (3,659), Prices (3,667).
- **Heterogeneous Graph Formats:** Directly convertible to PyTorch Geometric `HeteroData` or DGL heterogeneous graph structures for Relational Graph Convolutional Networks (RGCN) or Graph Attention Networks (GAT).

---

## 3. Benchmark Splits & Leakage Prevention

Dataset v1.7 inherits certified benchmark splits located in `benchmarks/`:

| Split Name | File Path | Product Count | Percentage | Partitioning Standard |
| :--- | :--- | :--- | :--- | :--- |
| **Train Split** | `benchmarks/train_split.parquet` | 2,550 | 70.0% | Strict Canonical Product ID Disjointness |
| **Validation Split** | `benchmarks/validation_split.parquet` | 546 | 15.0% | Stratified Category & Marketplace Distribution |
| **Test Split** | `benchmarks/test_split.parquet` | 547 | 15.0% | Sealed Out-of-Sample Holdout |
| **TOTAL** | — | **3,643** | **100.0%** | **Zero Data Leakage** |

### Leakage Audit Guarantees
1. **Product Master Disjointness:** No canonical product ID appears in more than one split ($\text{Train} \cap \text{Val} = \emptyset$, $\text{Train} \cap \text{Test} = \emptyset$).
2. **Variant Cohort Grouping:** All parent-child SKU variants belonging to the same style family are strictly locked to the same partition, preventing variant-level target leakage.
3. **Duplicate Visual Clusters:** Images sharing identical perceptual dHashes are grouped to prevent test images from mirroring training instances.

---

## 4. Path to Supervised Learning & Calibration

Currently, Dataset v1.7 operates with a deterministic explainable fusion baseline. To train a fully supervised calibrated model (e.g. Logistic Regression with Platt Scaling or Isotonic Regression):
1. **Annotation Expansion:** Complete the 500 queued human review annotation tasks located in `annotations/human_annotation_pending_tasks.parquet`.
2. **Ground-Truth Calibration:** Evaluate model-predicted probabilities against verified human consensus labels using Brier Score and Expected Calibration Error (ECE):
   $$\text{ECE} = \sum_{m=1}^M \frac{|B_m|}{N} \left| \text{acc}(B_m) - \text{conf}(B_m) \right|$$
3. **Threshold Calibration:** Tune classification cutoffs based on cost-weighted precision-recall tradeoffs appropriate for e-commerce fraud operations.
