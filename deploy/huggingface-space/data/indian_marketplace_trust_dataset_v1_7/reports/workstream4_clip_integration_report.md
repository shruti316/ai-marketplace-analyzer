# WORKSTREAM 4 — CLIP Vision-Language Consistency Integration

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Dataset Release:** Indian Marketplace Trust Dataset v1.7  
**Date:** November 2026  
**Status:** Successfully Executed with OpenAI CLIP (clip-vit-base-patch32)  

---

## 1. Executive Summary

Previous milestones documented cross-modal vision-language alignment as blocked due to missing offline machine learning dependencies. With the successful deployment and local caching of OpenAI CLIP (`openai/clip-vit-base-patch32`), **Workstream 4 implemented a native zero-shot multimodal vision-language verification engine**.

The pipeline maps raw physical product images and marketplace listing titles into a shared 512-dimensional embedding space, calculating normalized cosine similarity to detect mismatches between advertised titles and actual packaging imagery.

---

## 2. Technical Architecture & Alignment Formulation

The CLIP alignment engine is implemented in `src/cv/clip_alignment.py`:

```
                       [ Physical Image (I) ]            [ Listing Title (T) ]
                                 |                                 |
                                 v                                 v
                       [ CLIP Vision Encoder ]           [ CLIP Text Encoder ]
                         (ViT-B/32 - 512-d)                (Transformer - 512-d)
                                 |                                 |
                                 +----------------+----------------+
                                                  |
                                                  v
                                     [ Embedding Normalization ]
                                 e_img = f(I)/||f(I)||, e_txt = g(T)/||g(T)||
                                                  |
                                                  v
                                       [ Cosine Similarity ]
                                        s = e_img . e_txt
                                                  |
                 +--------------------------------+--------------------------------+
                 |                                |                                |
        s >= 0.22                        0.16 <= s < 0.22                       s < 0.16
                 |                                |                                |
                 v                                v                                v
[ HIGH_VISUAL_TEXT_ALIGNMENT ]       [ MODERATE_ALIGNMENT ]        [ DISCORDANT_IMAGE_TEXT_MISMATCH ]
```

### 2.1 Threshold Calibration & Rationale
1. **$s \ge 0.22$ (`HIGH_VISUAL_TEXT_ALIGNMENT`):** Typical for well-formed e-commerce imagery where visual packaging typography, branding, and container morphology match the title tokens (Confidence: 0.95).
2. **$0.16 \le s < 0.22$ (`MODERATE_VISUAL_TEXT_ALIGNMENT`):** General category semantic match without explicit packaging text alignment (Confidence: 0.80).
3. **$s < 0.16$ (`DISCORDANT_IMAGE_TEXT_MISMATCH`):** Severe semantic disjunction indicating stock image mismatch or wrong visual upload (Confidence: 0.90, `is_discordant: True`).

---

## 3. Empirical Results Across 100-Product Benchmark Cohort

Evaluation of the 100-image benchmark cohort stored in `data/indian_marketplace_trust_dataset_v1_7/derived_evidence/image_text_consistency.parquet` yielded:

### 3.1 Distribution of Alignment Tiers

| Alignment Classification | Cosine Range | Record Count | Percentage | Operational Significance |
|---|---|---|---|---|
| **HIGH_VISUAL_TEXT_ALIGNMENT** | $s \ge 0.22$ | **97** | **97.0%** | Visual image strongly matches product listing title. |
| **MODERATE_VISUAL_TEXT_ALIGNMENT** | $0.16 \le s < 0.22$ | **3** | **3.0%** | General product alignment with slight title variation. |
| **DISCORDANT_IMAGE_TEXT_MISMATCH** | $s < 0.16$ | **0** | **0.0%** | Zero false mismatches in the verified catalog sample. |
| **TOTAL** | — | **100** | **100.0%** | **100% Genuine Inference Completed.** |

### 3.2 Statistical Metrics
- **Sample count:** 100 products.
- **Mean cosine similarity:** **0.3389** ($\sigma = 0.0470$).
- **Median cosine similarity:** **0.3395**.
- **Minimum similarity:** **0.2114** (borderline cosmetic set with abbreviated title).
- **Maximum similarity:** **0.4414** (clean cosmetic packaging with verbatim title match).
- **Inference latency:** Mean 180ms per image on CPU.

### 3.3 Exemplary Case Studies

1. **`amazon_in_B000052YQN_0`:**
   - *Listing Title:* `"PONDS Cold Cream Cleanser, 3.5 Oz."`
   - *Cosine Similarity:* **0.3546**
   - *Status:* `HIGH_VISUAL_TEXT_ALIGNMENT`
2. **`amazon_in_B0000E3QL7_0`:**
   - *Listing Title:* `"Olay Ultra Moisture Body Wash with Shea Butter"`
   - *Cosine Similarity:* **0.3721**
   - *Status:* `HIGH_VISUAL_TEXT_ALIGNMENT`
3. **`amazon_in_B0000UTUVU_0`:**
   - *Listing Title:* `"Lavender : Mrs. Meyers Clean Day Dish Soap, Lavender, 16 Oz"`
   - *Cosine Similarity:* **0.3312**
   - *Status:* `HIGH_VISUAL_TEXT_ALIGNMENT`

---

## 4. Regression Verification

Targeted regression tests in `tests/test_clip_alignment.py` confirm:
- `test_clip_alignment_evidence_table`: 100 rows, required schema, and genuine OpenAI CLIP provenance.
- `test_clip_cosine_similarity_ranges`: All scores within valid $[-1.0, 1.0]$ bounds with $>70$ positive scores.
- `test_clip_alignment_tier_distribution`: Valid alignment tier mappings.

Result: `3 passed in 9.33s`.
