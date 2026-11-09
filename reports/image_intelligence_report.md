# Image & Computer Vision Intelligence Report
**Release Version:** Indian Marketplace Trust Dataset v1.5  
**Component:** Computer Vision Intelligence Pipeline  
**Execution Pipeline:** [`src/cv/image_intelligence.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/cv/image_intelligence.py)  
**Derived Tables:**
- [`derived_evidence/image_intelligence_features.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/derived_evidence/image_intelligence_features.parquet)
- [`derived_evidence/image_similarity_pairs.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/derived_evidence/image_similarity_pairs.parquet)
- [`derived_evidence/image_clusters.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/derived_evidence/image_clusters.parquet)

---

## 1. Physical Image Corpus & File Validation

All 4,708 accepted images in [`evidence/images.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/evidence/images.parquet) were physically audited on disk:
- **Total Usable Images:** 4,708
- **Files Verified on Disk:** 4,708 (100.0% physical presence)
- **Corrupt / Unreadable Images:** 0 (all 4,708 files passed decode and dimension extraction)
- **Format Distribution:**
  - JPEG: 4,705 images (99.94%)
  - WEBP: 3 images (0.06%)
- **Product Coverage:** Images belong to 2,432 distinct canonical products.
- **Unimaged Products:** 1,211 products currently have 0 images (`image_modality_status = 'MODALITY_UNAVAILABLE'`). Under the zero-penalty invariant, they receive 0 trust penalties.

### Dimension & Size Distributions
| Metric | Min | 25th % | Median | 75th % | Max |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Width (px)** | 100 | 300 | 416 | 600 | 2,000 |
| **Height (px)** | 100 | 380 | 500 | 800 | 2,500 |
| **Aspect Ratio ($w/h$)** | 0.25 | 0.75 | 0.83 | 1.00 | 2.50 |
| **File Size (KB)** | 1.8 | 14.2 | 28.6 | 54.1 | 682.4 |

---

## 2. Cryptographic & Perceptual Hashing

Three distinct layers of image identity were extracted to isolate duplicate catalog assets:

### A. Exact File Hashing (SHA-256)
- **Unique SHA-256 Hashes:** 4,376 unique hashes across 4,708 usable images.
- **Distinct Duplicate Hash Groups:** 323 hash groups with frequency $> 1$.
- **Total Images Belonging to Duplicate Groups:** 655 image records (`is_exact_file_duplicate = True`).
- **Redundant / Surplus Duplicate Instances:** 332 instances ($\text{Total Records} - \text{Unique Hashes} = 4,708 - 4,376 = 332$).
- **Domain Interpretation:** Exact bitwise duplicates occur primarily where multiple product variants (e.g. sizes S, M, L) link to the exact same product photography.

### B. Perceptual Hashing (dHash 64-bit)
- Difference hashing ($9 \times 8$ grayscale gradient) identifies visually identical images under recompression or resizing.
- **Unique dHash Values:** 4,059 unique hashes across 4,708 images.
- **Near-Duplicate Perceptual Instances:** 649 image records.

---

## 3. ResNet-18 Deep Feature Alignment & Anisotropy Removal

The 4,708 512-dimensional ResNet-18 embeddings in [`derived_evidence/visual_embeddings_resnet18.npz`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/derived_evidence/visual_embeddings_resnet18.npz) were audited.

### The Positive-Orthant Representation Anisotropy ("Cone Effect")
An initial inspection of raw unit L2-normalized embeddings revealed an off-diagonal pairwise cosine similarity mean of $0.994$ ($min=0.980, max=0.999$). Because features extracted immediately after ReLU activation contain only non-negative components ($\mathbf{e}_i \in \mathbb{R}_{\ge 0}^{512}$), all vectors lie inside the narrow positive orthant cone, rendering uncentered cosine similarity non-discriminative.

### Centering Transformation
To restore discriminative geometric angular distance, global mean centering was applied:
$$\bar{\mathbf{e}} = \frac{1}{N}\sum_{i=1}^N \mathbf{e}_i$$
$$\mathbf{e}'_i = \frac{\mathbf{e}_i - \bar{\mathbf{e}}}{\|\mathbf{e}_i - \bar{\mathbf{e}}\|_2}$$

This transformation removed representation anisotropy:
- **Raw Cosine Similarity Mean:** $0.994 \pm 0.003$
- **Centered Cosine Similarity Mean:** $0.138 \pm 0.343$ ($min=-0.666, max=0.939$)

---

## 4. Visual Similarity Matching & Clustering

Using centered embeddings, pairwise cosine similarities were computed across the $4,708 \times 4,708$ matrix:

| Similarity Threshold | Pair Count | Interpretation |
| :--- | :--- | :--- |
| **Centered $\cos \ge 0.95$** | 977 pairs | Very high visual similarity / near-identical staging |
| **Centered $\cos \ge 0.90$** | 2,936 pairs | High visual similarity / same product different angles |
| **Centered $\cos \ge 0.85$** | 10,855 pairs | Category/silhouette similarity |

### Visual Clusters & Cross-Product Reuse
- **Connected Component Clusters:** 694 visual similarity clusters identified.
- **Cross-Product Image Reuse:** 216 images were detected as shared across different canonical product IDs (`is_cross_product_image_reuse = True`).
- **Domain Context:** Cross-product reuse is common in manufacturer stock photography (e.g. brand-level generic packaging photos or accessory bundles). In the trust engine, cross-product reuse generates `IMAGE_REUSE_SIGNAL` for explainable investigation, but is never penalized as definitive fraud without confirming metadata conflicts.
