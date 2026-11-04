# Indian Marketplace Multimodal Coverage Report (v1.2)

## 1. Indian Multimodal Reality (3,643 Products)

| Platform | Products | With Local Images | With Linked Reviews | With Valid Price | Complete Multimodal (All 4) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Amazon India** | 1,500 | 1,500 (100.0%) | 5 (0.33%) | 1,485 (99.0%) | **5 (0.33%)** |
| **Flipkart** | 1,143 | 932 (81.5%) | 127 (11.1%) | 1,138 (99.6%) | **0 (0.00%)** |
| **Myntra** | 1,000 | 0 (0.0%) | 0 (0.0%) | 1,000 (100.0%) | **0 (0.00%)** |
| **Total Indian** | **3,643** | **2,432 (66.76%)** | **132 (3.62%)** | **3,623 (99.45%)** | **5 (0.14%)** |

---

## 2. Forensic Analysis of Disjointness
- **Flipkart Review vs Product Disjointness:** The 1,000 product catalog scrape (Fashion & Footwear) and the 3,500 review crawl (Mobiles & Electronics) represent non-overlapping domains. The 143 recovered review products have prices and genuine reviews, but zero images exist on disk.
- **Amazon India ASIN Matches:** Exhaustive cross-referencing against 701,528 beauty reviews yielded exactly 5 ASIN matches. All 5 possess physical hero images, verified customer reviews, INR prices, and complete metadata, forming the genuine Indian Complete Multimodal Core.
- **Myntra Zero Images:** Upstream crawl captured variant URLs but omitted image asset downloads. Prioritized in `image_acquisition_manifest.csv`.
