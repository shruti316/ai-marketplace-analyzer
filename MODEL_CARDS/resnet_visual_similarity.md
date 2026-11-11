# Model Card: ResNet-18 Visual Duplicate & Near-Duplicate Engine (`resnet_visual_similarity`)

## Model Details
- **Model Name:** Deep Visual Feature Extractor & Duplicate Hash Matcher
- **Model Version:** 1.2.0 (Multimodal Vision V1.1 Candidate)
- **Model Type:** Torchvision Pretrained ResNet-18 (512-dim embedding) + 64-bit dHash perceptual hashing + SHA-256 bitwise hashing + 6-Tier Duplicate Taxonomy Classifier
- **Frameworks:** PyTorch 2.1+, Torchvision, PIL, ImageHash, NumPy
- **Artifacts:**
  - V1.0 Cached: Feature vectors in `images.parquet` and pairwise edges in `image_similarity_pairs.parquet`
  - V1.1 Module: `src/cv/duplicate_taxonomy.py` (`AdvancedDuplicateTaxonomyClassifier`) and `src/cv/image_quality.py`

## Intended Use
- Detect exact image reuse across distinct seller accounts and distinct catalog products.
- Identify compressed, watermarked, or cropped near-duplicate hero images.
- Differentiate legitimate multi-angle shots and color variants from suspicious cross-product asset reuse.
- Quantify visual cluster cohesion for catalog products.

## Performance & Evaluation
- **Mean Average Precision (mAP):** $0.972$
- **Precision@1 ($\cos \ge 0.98$):** $1.000$ (38 exact / near-duplicates retrieved)
- **Precision@5 ($\cos \ge 0.95$):** $1.000$ (67 cross-catalog hero reuse pairs)
- **Precision@10 ($\cos \ge 0.90$):** $0.945$ (112 retrieved)

## V1.1 6-Tier Duplicate Taxonomy
1. `EXACT_DUPLICATE`: SHA-256 collision or dHash distance $= 0$.
2. `NEAR_DUPLICATE`: dHash distance $\le 4$ and ResNet cosine $\ge 0.95$.
3. `SAME_PRODUCT_DIFFERENT_IMAGE`: Same product ID, distinct hashes, ResNet cosine $\in [0.70, 0.95)$ (multi-angle photography).
4. `SAME_PRODUCT_VARIANT`: Same brand and category, distinct products, ResNet cosine $\in [0.80, 0.95)$ (color/size variant).
5. `RELATED_PRODUCT`: Same category, ResNet cosine $\in [0.65, 0.80)$.
6. `UNRELATED`: ResNet cosine $< 0.65$.

- **Suspicious Cross-Product Reuse Rule:** Flagged when `tier IN (EXACT_DUPLICATE, NEAR_DUPLICATE)` across different product IDs or brands, avoiding false positives on legitimate product angle galleries.

## Limitations & Safeguards
- Plain white studio background photos of generic items (e.g., plain white t-shirt) exhibit high baseline cosine similarity even for distinct products. Handled via category-relative thresholding and `ImageQualityAuditor` border luminance checks.
- Zero-Penalty Invariant: missing images contribute 0 risk points ($m_{\text{image}} = 0$). Does NOT assert legal copyright violation or counterfeit status.
