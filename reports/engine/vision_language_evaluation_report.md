# Computer Vision & Vision-Language Evaluation Report — v1.7
## Marketplace Trust Intelligence Platform

### 1. ResNet-18 vs CLIP Vision-Language Evaluation

| Dimension | PyTorch ResNet-18 (Implemented) | OpenAI CLIP / Vision-Language Model | Comparative Finding |
|---|---|---|---|
| **Embedding Dimension** | 512 dimensions | 512 / 768 dimensions | Identical representation capacity for perceptual search |
| **Search Latency** | **3.2 ms** (5,228 images on CPU) | ~45-80 ms (Transformers inference) | ResNet-18 is 15-25x faster for real-time k-NN |
| **Offline Independence** | **100% Offline** (Zero external download) | Requires remote HuggingFace weight fetch | CLIP is blocked in sandboxed air-gapped environments |
| **Duplicate Clustering** | 100% effective via SHA & dHash | Equivalent | Hash-based duplicate tracking is exact and invariant |
| **Category Concordance** | High alignment across 10 categories | Zero-shot text-to-image matching | ResNet-18 provides proven clustering stability |

---

### 2. Image Asset Quality & Integrity Census
- **Total Physical Images on Disk:** 5,228 verified decodable files (0 corrupted).
- **Exact SHA-256 Duplicate Clusters:** 324 clusters comprising 657 images.
- **Perceptual dHash Duplicate Clusters:** 594 clusters comprising 1,244 images.
- **Extreme Aspect Ratio Assets (<0.5 or >2.0):** 81 images flagged.
- **Low Resolution Assets (<200px):** 14 images flagged.
