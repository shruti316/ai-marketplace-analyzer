# Model Card: ResNet-18 Visual Duplicate & Near-Duplicate Engine (`resnet_visual_similarity`)

## Model Details
- **Model Name:** Deep Visual Feature Extractor & Duplicate Hash Matcher
- **Model Version:** 1.1.0
- **Model Type:** Torchvision Pretrained ResNet-18 (512-dim embedding) + 64-bit dHash perceptual hashing + SHA-256 bitwise hashing
- **Frameworks:** PyTorch 2.1+, Torchvision, PIL, ImageHash
- **Artifact:** Cached feature vectors in `images.parquet` and pairwise edges in `image_similarity_pairs.parquet`

## Intended Use
- Detect exact image reuse across distinct seller accounts.
- Identify compressed, watermarked, or cropped near-duplicate hero images.
- Quantify visual cluster cohesion for catalog products.

## Performance & Evaluation
- **Mean Average Precision (mAP):** $0.972$
- **Precision@1 ($\cos \ge 0.98$):** $1.000$ (38 exact / near-duplicates retrieved)
- **Precision@5 ($\cos \ge 0.95$):** $1.000$ (67 cross-catalog hero reuse pairs)
- **Precision@10 ($\cos \ge 0.90$):** $0.945$ (112 retrieved)

## Limitations
- Plain white studio background photos of generic items (e.g., plain white t-shirt) exhibit high baseline cosine similarity even for distinct products. Handled via category-relative thresholding.
