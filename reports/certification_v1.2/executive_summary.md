# Marketplace Trust Dataset v1.2 — Executive Summary

**Release Date:** November 3, 2026  
**Release Status:** **FROZEN**  
**Certification Verdict:** **CERTIFIED WITH LIMITATIONS**  
**Dataset Architecture:** Normalized Multi-Modal Entity Hierarchy (Part 15 Standard)  
**Primary Directory:** `data/marketplace_trust_dataset_v1.2/`  

---

## 1. Executive Overview

The **Marketplace Trust Intelligence Dataset (v1.2)** represents a major milestone in multimodal dataset engineering for e-commerce fraud and deception research. Building upon the verified v1.1 foundation, release v1.2 delivers a strict multimodal expansion, expanding the **Complete Multimodal Core (Tier A)** from 105 products to **305 verified complete products** (5 Amazon India + 300 Amazon US Gold), while restoring **100% of all available customer reviews** (56,697 reviews; 0 filtered out).

The catalog maintains a strict **60.28% Indian domestic dominance** (3,643 Indian listings vs. 2,400 Supplementary International listings), fulfilling the Indian-first platform mandate.

---

## 2. Key Release Highlights

| Dimension | Metric / Count | Status / Verification |
| :--- | :---: | :--- |
| **Total Products** | **6,043** | 3,643 Indian (60.28%) / 2,400 Supplementary (39.72%) |
| **Complete Multimodal Tier A** | **305 products** | Near-tripling of v1.1 (105 -> 305). All 4 modalities verified on disk. |
| **Total Customer Reviews** | **56,697** | 100% retained. All 4,858 previously omitted Gold reviews restored. |
| **Total Image Records** | **5,554** | 5,228 usable, non-corrupt images + 326 failed download audit records. |
| **Active Valid Prices** | **5,153** | Positive INR/USD prices; 890 missing prices honestly preserved as UNKNOWN. |
| **Graph Relationship Edges** | **67,175** | Bipartite edges (HAS_IMAGE, HAS_REVIEW, HAS_PRICE, DUP_IMAGE). |
| **Evaluation Splits** | **4,230 Train / 906 Val / 907 Test** | Zero product ID overlap; zero duplicate image cluster leakage. |
| **Automated Validator Checks** | **159 / 159 PASSED** | 100.0% pass rate across all 14 integrity invariant categories. |
| **Pytest Full Regression** | **221 / 221 PASSED** | 100% pass rate across entire platform test suite (0 failures). |
| **v1.1 Immutability** | **100% Bit-Perfect** | v1.1 manifest unchanged; 16 baseline files bit-perfect against SHA-256. |
