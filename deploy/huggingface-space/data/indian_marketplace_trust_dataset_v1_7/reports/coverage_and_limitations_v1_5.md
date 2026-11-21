# Multimodal Coverage & Known Limitations Report
**Release Version:** Indian Marketplace Trust Dataset v1.5  
**Component:** Dataset Coverage Matrix & Scientific Boundaries  
**Audited Tables:**
- [`derived_evidence/multimodal_coverage_matrix.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/derived_evidence/multimodal_coverage_matrix.parquet)
- [`derived_evidence/product_multimodal_summary.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/derived_evidence/product_multimodal_summary.parquet)

---

## 1. Multimodal Coverage Matrix Summary

The 3,643 canonical marketplace products in v1.5 represent real-world e-commerce data collected across Amazon India, Flipkart, and Myntra. Data completeness varies significantly by modality:

```
Total Products: 3,643
├── Metadata & Pricing: 3,643 (100.0%)
├── Usable Hero Images: 2,432 (66.8%)
│   └── 0 Images (Sparse): 1,211 (33.2%)
├── Customer Reviews: 148 (4.1%)
│   └── 0 Reviews (Unreviewed): 3,495 (95.9%)
└── Physical OCR / CLIP: 0 (0.0% - Offline Dependency Blocked)
```

### Coverage Tiers
- **Tier 1 (Dense Multimodal):** 115 products possess metadata, pricing, verified hero images, ResNet-18 embeddings, and customer reviews.
- **Tier 2 (Vision-Catalog):** 2,317 products possess metadata, pricing, and verified hero images with ResNet-18 embeddings, but lack customer reviews.
- **Tier 3 (Catalog-Only):** 1,211 products possess metadata, pricing, and variant specifications, but currently lack downloaded images and customer reviews.

---

## 2. Technical Limitations & Engineering Trade-Offs

### A. Review Sparsity & Platform Concentration
- **The Reality:** 3,500 of the 3,659 customer reviews originate from Flipkart, with 159 from Amazon India, and 0 from Myntra.
- **Root Cause:** Upstream scraping caches prioritize catalog attributes (apparel specifications on Myntra) over user reviews.
- **Engineering Response:** The multimodal fusion engine strictly enforces `review_modality_status = 'MODALITY_UNAVAILABLE'` for all 3,495 unreviewed products. Unreviewed products receive a neutral trust score and are never penalized.

### B. Single-Merchant vs Platform-Level Sellers
- **The Reality:** All 3,643 marketplace listings are currently associated with 3 platform-level seller entities (`PLATFORM_AMAZON_IN`, `PLATFORM_FLIPKART`, `PLATFORM_MYNTRA`).
- **Root Cause:** Individual third-party merchant IDs (e.g. GSTIN, merchant display names) were not exposed in the raw catalog dumps.
- **Engineering Response:** Fabricating synthetic merchant names was strictly rejected under the Zero Synthetic Fabrication Invariant. The entity schema preserves `seller_id` as a platform aggregate node, and graph edges document platform fulfillment.

### C. Physical OCR & Vision-Language Dependencies
- **The Reality:** Physical OCR and Vision-Language models (CLIP) cannot be executed in this offline Windows sandbox environment due to missing binary dependencies (`tesseract.exe`, `easyocr`, `open_clip`).
- **Engineering Response:** Rather than manufacturing synthetic text or guessing scores from product titles:
  1. Physical OCR status is formally documented as `BLOCKED_OFFLINE_DEPENDENCY_ABSENT` with 0.0 confidence and null text.
  2. The 1,000 title-token proxy records remain strictly isolated in `title_token_packaging_proxy.parquet`.
  3. Vision-language consistency is documented with a dedicated schema and dependency blocker.

### D. Native Script Indic Language Distribution
- **The Reality:** 3,656 of the 3,659 reviews are in English (`en`), and 3 are in Latin-script code-mixed Hinglish (`hi-en`). Native Devanagari Hindi or regional script reviews (Tamil, Telugu, Bengali) are 0 in the current crawl.
- **Engineering Response:** Transparently documented in the language distribution. Synthetic translation or fabrication was prohibited.

---

## 3. Recommended Next Steps for Future Milestones

1. **Phase 2 Expansion (NLP & Language):** Ingest targeted Indic-language reviews from multilingual e-commerce forums with human verification.
2. **Phase 2 Multimodal Ingestion (OCR & Vision):** In an environment with network access or preinstalled OCR binaries, run physical OCR across the 4,708 hero images.
3. **Dual-Blind Annotation Campaign:** Execute the 500 queued pending annotation tasks using the newly exported [`annotations/annotation_task_queue_v1_5.json`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/annotations/annotation_task_queue_v1_5.json) with two independent human annotators and formal Cohen's Kappa adjudication.
