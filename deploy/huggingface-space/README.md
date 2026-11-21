---
title: TrustSphere ML Intelligence
emoji: 🛡️
colorFrom: blue
colorTo: indigo
sdk: gradio
sdk_version: 4.44.1
app_file: app.py
pinned: false
license: mit
---

# TrustSphere — AI-Powered Indian Marketplace Trust Intelligence Platform

**Target Space:** `06Remontada06/trustphere-ml`  
**Runtime:** Hugging Face ZeroGPU (Dynamic Nvidia A100/L4 Allocation)  
**SDK:** Gradio 4.44+  

---

## Architecture Overview

This Hugging Face Space hosts the decoupled Python Machine Learning & Computer Vision microservice for TrustSphere:

1. **Tab A — Product Image Analysis (ZeroGPU Accelerated):**
   - Zero-shot classification via `openai/clip-vit-base-patch32`.
   - Cross-modal title-to-image semantic alignment.
   - Photometric blur variance (Laplacian) and studio backdrop compliance.
2. **Tab B — OCR Analysis (CPU):**
   - Tesseract OCR (`tesseract-ocr-eng`) text extraction.
   - Legal Metrology Act mandatory packaging declarations (FSSAI, MRP, Batch, Country of Origin).
   - Zero-penalty invariant for clean product photography.
3. **Tab C — Marketplace Trust Assessment (CPU):**
   - Gated Multimodal Unit (GMU) feature fusion across 5 modalities (Pricing, Review NLP, Vision, CLIP, Graph).
   - Calibrated Brier score anomaly detection with confidence intervals ($CI_{\text{lower}}, CI_{\text{upper}}$).
   - Model version switching: **ML V1.0 Champion** vs **Multimodal Vision V1.1 Challenger**.
4. **Tab D — Health & Dataset Modalities:**
   - Real-time engine health, entity count lookups, and modality readiness probes.

---

## API Integration with Render Node.js Backend

The Node.js Express backend integrates seamlessly with this Gradio Space using standard HTTP REST or the `@gradio/client` SDK:

```typescript
import { Client } from "@gradio/client";

const client = await Client.connect("06Remontada06/trustphere-ml", {
  hf_token: process.env.HF_TOKEN // Optional for private spaces
});

// 1. Image Inspection
const imageResult = await client.predict("/product_image_analysis", {
  image: imageBlob,
  listing_title: "boAt Rockerz 450 Bluetooth On Ear Headphones",
  claimed_brand: "boAt"
});

// 2. Physical Packaging OCR
const ocrResult = await client.predict("/ocr_analysis", {
  packaging_image: packagingBlob,
  claimed_mrp: 1499.0,
  claimed_brand: "boAt"
});

// 3. Multimodal Trust Scoring
const trustResult = await client.predict("/marketplace_trust_assessment", {
  product_id: "amazon_in_B000052YQN",
  model_version: "v1.0"
});
```
