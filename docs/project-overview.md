# Project Overview: AI-Powered Indian Marketplace Trust Intelligence Platform

**Repository:** `ai-marketplace-analyzer`  
**Target Ecosystems:** Amazon India, Flipkart, Myntra  
**Current State:** ML V1.0 Baseline (Frozen Primary Champion), Multimodal Vision V1.1 (Hardened Challenger), Final ML Readiness Verified  
**Upcoming Milestone:** Phase 3 Backend Integration (Node.js / Express / MySQL)  

---

## 1. Executive Summary & Problem Statement

Indian e-commerce is uniquely complex. Across platforms like **Amazon India**, **Flipkart**, and **Myntra**, product listings frequently exhibit subtle patterns of manipulation and deception:
- **Price Gouging & Extreme Discounts:** Artificial Manufacturer's Suggested Retail Prices (MSRP/MRP) paired with deceptive $80\text{--}90\%$ discounts, or predatory off-market price corridor anomalies.
- **Review Astroturfing & Manipulation:** High star ratings paired with negative or discordant sentiment text, duplicated text shingles across multiple reviews, or sudden review volume bursts.
- **Cross-Seller Image Hijacking:** Identical product photographs reused across different seller IDs, brand entities, and product categories to create fake listings or spoof brand reputation.
- **Title-Image Bait-and-Switch Deception:** High-value product titles (e.g. flagship smartphones) paired with photographs of low-cost accessories or empty boxes.
- **Statutory Packaging Non-Compliance:** Packaging labels missing mandatory Legal Metrology markings (Maximum Retail Price in INR inclusive of all taxes, net quantity, batch numbers, or manufacturing details).
- **Collusive Seller Networks:** Dense bipartite seller-product cliques where a small cartel of seller accounts cross-lists identical assets to manipulate marketplace search algorithms.

Existing marketplace defenses frequently rely on isolated, unimodal heuristics that generate high false alarm rates or unfairly penalize small sellers with sparse data.

The **AI-Powered Indian Marketplace Trust Intelligence Platform** solves this by unifying **5 learned multimodal intelligence streams** into an explainable, calibrated trust assessment engine governed by the strict **Zero-Penalty Invariant**.

---

## 2. Core Objectives

1. **Multimodal Evidence Synthesis:** Synthesize pricing behavior, review text semantics, computer vision embeddings, vision-language alignment, and relationship graph topology into a single calibrated risk assessment.
2. **Deterministic Zero-Penalty Guarantee:** Ensure that missing data (such as a new listing with no customer reviews or an unreadable mobile photo) **never** increases predicted risk or penalizes the seller.
3. **Evidence Provenance & Explainability:** Provide human-readable, auditable evidence items with atomic event deduplication for investigator triage.
4. **Marketplace-Specific Policy Calibration:** Adapt decision thresholds to account for marketplace-specific norms (such as Flipkart's promotional festive discount spikes vs Amazon's catalog standardization).
5. **Decoupled Architecture:** Expose a clean, thread-safe Python REST inference service ready for seamless integration with the planned Phase 3 Node.js backend.

---

## 3. Scope & Target Marketplaces

| Dimension | Amazon India (`amazon_in`) | Flipkart (`flipkart`) | Myntra (`myntra`) |
|-----------|----------------------------|-----------------------|-------------------|
| **Catalog Scale** | $1,500$ canonical products | $1,143$ canonical products | $1,000$ canonical products |
| **Dominant Categories** | Electronics, Beauty, Home, Pantry | Electronics, Mobile, Lifestyle, Appliances | Fashion, Western Wear, Ethnic Apparel, Footwear |
| **Imaging Norms** | High-resolution white studio background | High promotional banner overlay frequency | Lifestyle model shots, non-white outdoor backdrops |
| **Pricing Dynamics** | Stable INR corridors, moderate discounts | High promotional discounting ($39.28\%$ baseline) | Segmented fashion markdowns |
| **Decision Threshold** | $0.50$ (Calibrated & Validated) | $0.65$ (Marketplace-Adapted) | $0.50$ (Exploratory / Unvalidated) |

---

## 4. Key Functional Capabilities

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           MULTIMODAL TRUST INTELLIGENCE                        │
└─────────────────────────────────────────────────────────────────────────────────┘
         │                           │                           │
         ▼                           ▼                           ▼
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│     PRICING     │         │   REVIEW NLP    │         │ COMPUTER VISION │
│ - Robust z-score│         │ - VADER sentiment│        │ - ResNet-18     │
│ - Discount %    │         │ - Discordance   │         │ - 64-bit dHash  │
│ - Corridor dispersion     │ - Duplicate shingle       │ - 6-tier taxonomy│
└─────────────────┘         └─────────────────┘         └─────────────────┘
         │                           │                           │
         ▼                           ▼                           ▼
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│ CLIP SEMANTICS  │         │ GRAPH TOPOLOGY  │         │  PACKAGING OCR  │
│ - ViT-B/32 alignment      │ - Shared image  │         │ - WinRT Native  │
│ - Category z-score        │ - PageRank      │         │ - Statutory MRP │
│ - Bait & Switch │         │ - Centrality    │         │ - Brand fuzzy   │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

---

## 5. Technology Stack

- **Core Runtime:** Python 3.10+ (Verified on Python 3.11.9)
- **Scientific Computing & Tabular Data:** NumPy, Pandas, SciPy, Apache PyArrow
- **Machine Learning & Calibration:** scikit-learn, Isotonic Regression, Random Forest, Joblib
- **Computer Vision & Perceptual Hashing:** Pillow (PIL), ResNet-18 embeddings, 64-bit dHash
- **Vision-Language Foundation Model:** OpenAI CLIP (ViT-B/32)
- **Natural Language Processing:** VADER Sentiment, Hinglish token lexicons
- **Graph Analytics:** NetworkX (Bipartite product-seller graph topology)
- **Optical Character Recognition:** WinRT native OCR (`Windows.Media.Ocr`), Tesseract fallback
- **Testing & Quality Assurance:** pytest (619 passing unit and integration tests)

---

## 6. Current Development Status & Roadmap

- :white_check_mark: **ML V1.0 Baseline:** Completed and immutably frozen (`models/advanced_multimodal_gated_model.joblib`).
- :white_check_mark: **Multimodal Vision V1.1:** Implemented, hardened, and versioned (`models/v1_1/advanced_multimodal_gated_model_v1_1.joblib`).
- :white_check_mark: **Final ML Readiness:** Comprehensive scientific audit completed across 12 master reports (`reports/final_ml_readiness/`).
- :white_check_mark: **Repository Professionalization:** Complete engineering hygiene, documentation, CI workflows, and GitHub-readiness (Current Release v1.8.0).
- :arrow_forward: **Phase 3 Backend Development:** Node.js API gateway, MySQL schema implementation, and Express endpoint orchestration (Next Milestone).
- :crystal_ball: **Phase 4 Frontend Development:** React web application, interactive trust scorecards, and visual evidence explorer.
- :crystal_ball: **Prospective Ground-Truth Study:** Collection and adjudication of 1,500 double-blind human labels using `GroundTruthIngestionPipeline`.
