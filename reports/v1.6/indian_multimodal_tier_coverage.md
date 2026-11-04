# Indian Multimodal Tier Coverage Report (v1.6)

**Project:** AI-Powered Marketplace Trust Intelligence Platform  
**Milestone:** Release v1.6  
**Author:** Lead Data Architect & Machine Learning Engineer  
**Status:** Certified Analysis  

---

## 1. Executive Summary

In Release v1.6, we formalize an explicit **4-Tier Modality Coverage Architecture** across all 6,043 products in the marketplace trust intelligence dataset. This taxonomy provides mathematical clarity and eliminates misleading claims of multimodality by cleanly differentiating listings based on verified physical evidence.

```
       +-------------------------------------------------------------+
       |                  6,043 Total Products                       |
       +-------------------------------------------------------------+
                                      |
         +----------------------------+----------------------------+
         |                                                         |
[Indian Partition: 3,643 (60.28%)]            [Supplementary Partition: 2,400 (39.72%)]
         |                                                         |
 - Tier A (Complete):      5 ( 0.14%)          - Tier A (Complete):    300 (12.50%)
 - Tier B (Visual):    2,407 (66.07%)          - Tier B (Visual):       99 ( 4.12%)
 - Tier C (Textual):     127 ( 3.49%)          - Tier C (Textual):       0 ( 0.00%)
 - Tier D (Catalog):   1,104 (30.30%)          - Tier D (Catalog):   2,001 (83.38%)
```

---

## 2. Modality Tier Definitions

| Tier Code | Modality Tier Name | Definition & Evidence Requirements | Intended AI/ML Workload |
| :--- | :--- | :--- | :--- |
| **Tier A** | **Complete Multimodal Core** | Listing contains physically verified **Images** on disk (`has_image=True`) + Linked **Customer Reviews** (`has_review=True`) + Valid Observed **Price** (`has_price=True`). | Cross-modal trust fusion, text-image consistency analysis, multimodal anomaly detection. |
| **Tier B** | **Visual Commerce** | Listing contains verified **Images** on disk (`has_image=True`) + Valid Observed **Price** (`has_price=True`), but zero linked reviews (`has_review=False`). | Computer vision embedding, duplicate image detection, visual quality scoring, price-image regression. |
| **Tier C** | **Textual Commerce** | Listing contains Linked **Customer Reviews** (`has_review=True`) + Valid Observed **Price** (`has_price=True`), but lacks verified disk images (`has_image=False`). | NLP sentiment intelligence, multilingual review analysis, review duplicate detection, rating-price coherence. |
| **Tier D** | **Catalog / Single Modality** | Listing contains single-modality observation (Price-only, Review-only, or Catalog metadata-only). | Price distribution modeling, category hierarchy baselines, domain transfer benchmarking. |

---

## 3. Comprehensive Dataset Distribution

The cross-tabulation below displays the exact distribution across all platforms in Release v1.6:

| Marketplace | Country | Tier A (Complete) | Tier B (Visual) | Tier C (Textual) | Tier D (Catalog) | Total Products |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Amazon India (`amazon_in`)** | **IN** | 5 | 1,480 | 0 | 15 | 1,500 |
| **Flipkart (`flipkart`)** | **IN** | 0 | 927 | 127 | 89 | 1,143 |
| **Myntra (`myntra`)** | **IN** | 0 | 0 | 0 | 1,000 | 1,000 |
| **SUBTOTAL (Indian Marketplaces)** | **IN** | **5** | **2,407** | **127** | **1,104** | **3,643** |
| Amazon US (`amazon`) | US | 300 | 99 | 0 | 621 | 1,020 |
| Walmart (`walmart`) | US | 0 | 0 | 0 | 1,131 | 1,131 |
| BestBuy (`bestbuy`) | US | 0 | 0 | 0 | 249 | 249 |
| **SUBTOTAL (Supplementary)** | **US** | **300** | **99** | **0** | **2,001** | **2,400** |
| **TOTAL DATASET (All Platforms)** | — | **305** | **2,506** | **127** | **3,105** | **6,043** |

---

## 4. Indian Multimodal Expansion Roadmap

### 4.1 The Flipkart 127 Milestone
The 127 Flipkart review-bearing products (Tier C) represent **3,260 customer reviews** with complete INR pricing.
Upon ingesting the 127 images using the offline-governed adapter (`src/data/acquisition/flipkart_image_adapter_v1_6.py`), these 127 products immediately transition from **Tier C to Tier A**, expanding Indian Complete Multimodal listings by **2,540%** (from 5 to 132 products).

### 4.2 Visual Commerce Strength
With 2,407 products in Tier B across Amazon India (1,480) and Flipkart (927), the Indian partition provides **4,708 physically verified images on disk**, establishing a solid foundation for computer vision representation learning and duplicate listing detection.

---

## 5. Certification Invariants
1. `Tier A + Tier B + Tier C + Tier D == 6,043` (Strict totality).
2. Every product in Tier A possesses verified disk image paths, >= 1 customer review, and a non-null INR/USD normalized price.
3. Zero products are assigned to Tier A through synthetic fills or dummy image links.
