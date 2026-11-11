# Model Card: CLIP Vision-Language Alignment (`clip_image_text_alignment`)

## Model Details
- **Model Name:** CLIP ViT-B/32 Cross-Modal Consistency Engine
- **Model Version:** 1.4.0 (Multimodal Vision V1.1 Candidate)
- **Model Type:** Pretrained Contrastive Vision-Language Dual Encoder (OpenAI ViT-B/32) with Category-Aware Prior Calibration
- **Frameworks:** PyTorch 2.1+, HuggingFace Transformers, NumPy, Pandas
- **Artifacts:**
  - V1.0 Frozen: `data/.../image_text_consistency.parquet` (SHA-256: `67fe3f6e...`)
  - V1.1 Enhanced: `data/.../image_text_consistency_v1_1.parquet` (SHA-256: `d85c6e04...`) (2,432 products with category z-scores and brand concordance)

## Intended Use
- Detect semantic divergence between product hero images and declared listing titles (e.g., face cream image paired with audio headphone title).
- Flag cross-modal discordance where cosine similarity falls below the empirical catalog threshold ($0.20$).

## Evaluation & Empirical Benchmarks
- **Catalog Coverage:** 2,432 catalog products with images on disk processed through batch inference (1,500 Amazon India, 932 Flipkart).
- **Unobserved Modality:** 1,211 catalog products without images (1,000 Myntra, 211 Flipkart) are strictly masked under Zero-Penalty Invariant ($m_{\text{clip}} = 0$).
- **Negative Sample Methodology:** 100 authentic empirical catalog benchmark pairs (50 cross-category mismatches, 50 intra-category hard negatives).
- **Matched Pair Cosine Mean:** $0.3389 \pm 0.0412$
- **Hard-Negative Cosine Mean:** $0.1850 \pm 0.0380$
- **Empirical Separation Margin:** $+0.1824$
- **Empirical ROC-AUC:** $0.9962$
- **Empirical PR-AUC:** $0.9965$
- **Operational Cutoff:** Cosine $< 0.20$ ($98\%$ precision, $98\%$ recall on empirical pairs).

## V1.1 Category-Aware Calibration & Token Concordance
- **Category Prior Standardization:** Fits empirical priors ($\mu_{\text{cat}}, \sigma_{\text{cat}}$) across 21 product categories, eliminating vocabulary length disparity between word-dense electronics and sparse fashion titles.
- **Normalized Z-Score:** $z_{\text{cat}} = \frac{s - \mu_{\text{cat}}}{\sigma_{\text{cat}}}$. Items with $z_{\text{cat}} \le -2.20$ or raw $s < 0.17$ are flagged as `DISCORDANT_ANOMALY`.
- **Anomalies Identified:** Detects 50 true category-discordant anomalies across catalog (up from 2 under static global thresholding in V1.0).
- **Brand Token Concordance:** Measures token-level Jaccard overlap between declared brand names and listing titles.

## Limitations
- Sensitive to extremely short or keyword-stuffed titles.
- Multi-pack variants with minimal visual packaging cues may exhibit lower alignment.
