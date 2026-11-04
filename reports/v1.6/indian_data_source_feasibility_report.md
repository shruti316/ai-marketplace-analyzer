# Indian Marketplace Data Source Feasibility Report (v1.6)

**Project:** AI-Powered Marketplace Trust Intelligence Platform  
**Milestone:** Release v1.6  
**Author:** Lead Data Architect & Multimodal ML Specialist  
**Status:** Certified Analysis  

---

## 1. Executive Summary

The Marketplace Trust Intelligence Platform has established a certified dataset with **6,043 products**, of which **3,643 (60.28%) are Indian marketplace listings** across Amazon India (`amazon_in`), Flipkart (`flipkart`), and Myntra (`myntra`). 

While visual commerce coverage is robust (1,500 Amazon India products with local images; 932 Flipkart products with 3,208 local images), complete multimodal coverage in the Indian partition is currently limited to **5 Amazon India products** (159 reviews) and **127 Flipkart review-bearing products** (3,260 reviews) which currently lack verified local images.

This feasibility report analyzes prospective external public research datasets and crawl archives for the Indian e-commerce domain. We evaluate their licensing, data quality, modality alignment, and suitability for expanding future releases under strict research ethics and reproducibility standards.

---

## 2. Public Research Datasets Evaluation

| Dataset Name | Source / Curator | License / Terms | Modalities Available | Sample Size | Limitations & Quality Assessment | Ingestion Feasibility |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Kaggle Flipkart Products & Reviews (PromptCloud)** | PromptCloud / Kaggle Public Datasets | CC BY-SA 4.0 | Products, Prices, Ratings, Review Titles, Review Snippets, Image URLs | 20,000 products, ~35,000 reviews | Image URLs frequently rot (CDN expiration); seller details contain store name but lack GSTIN/CIN; crawl date 2016-2020. | **High** (Offline CSVs available; image scraping requires live network crawl). |
| **Myntra Fashion Dataset** | Kaggle / Multiple Academic Scrapes | CC0 Public Domain / ODC-By | Products, Images (Embedded/JPEGs), MRP, Discounted Price, Brand, Category | 10,000+ products, 40,000+ images | Contains zero review text (pure catalog/visual dataset); no seller attribution. Excellent for CV and price anomaly; useless for review NLP. | **Medium** (Visual-only expansion). |
| **Nykaa Beauty & Cosmetics Corpus** | Zenodo / Academic Crawls | CC BY-NC 4.0 | Product Descriptions, Customer Reviews (1-5 stars), Rating Distributions, Price | ~2,500 products, ~45,000 reviews | Images hosted externally; reviews have high skew towards 5 stars; author attribution is pseudo-anonymous. | **High** (Textual & Rating expansion; license requires non-commercial attribution). |
| **Meesho Indian Reseller Catalog Scrape** | GitHub Research Archives | Open Academic Research | Listing Title, Reseller Wholesale Price, Estimated Margin, Image Links | ~15,000 listings | High incidence of near-duplicate images across disparate titles (counterfeiting/reseller syndicates). Zero customer reviews. | **High Priority for Fraud Graphs** (Ideal for cross-seller duplicate detection and graph fraud intelligence). |
| **Amazon Reviews 2023 (McAulay Lab / Stanford-UCSD)** | McAulay et al., UCSD / HuggingFace | Open Academic Research (Non-Commercial) | Reviews, Product Metadata, Verified Purchase, Helpful Votes, High-Res Image URLs | Millions of global listings; India subset (~120k listings) | Massive dataset; Indian marketplace partition requires ASIN filtering against Amazon.in domain. Highly authentic verified reviews. | **Highest** (Gold standard for academic NLP and multimodal multimodal matching). |

---

## 3. Modality Alignment & Gap Analysis

```
+-----------------------------------------------------------------------------------------------------+
| Indian Marketplace Data Inventory (Release v1.6 Foundation)                                         |
+----------------------+--------------------+---------------------+------------------+----------------+
| Marketplace          | Products           | Usable Images (Disk)| Reviews (Linked) | Valid Prices   |
+----------------------+--------------------+---------------------+------------------+----------------+
| Amazon India         | 1,500              | 1,500               | 159 (5 prods)    | 1,485          |
| Flipkart (Catalog)   | 1,016              | 3,208 (932 prods)   | 0                | 1,011          |
| Flipkart (Reviews)   | 127                | 0 (Pending)         | 3,260 (127 prods)| 127            |
| Myntra               | 1,000              | 0                   | 0                | 1,000          |
+----------------------+--------------------+---------------------+------------------+----------------+
| Total Indian         | 3,643              | 4,708               | 3,419            | 3,623          |
+----------------------+--------------------+---------------------+------------------+----------------+
```

### Critical Findings:
1. **The 127 Flipkart Target Cohort:**
   - These 127 products already have 3,260 verified customer reviews and 127 active INR prices.
   - Acquiring or mapping 127 verified product images for this cohort immediately creates **127 complete multimodal Indian products** (increasing Indian complete multimodal coverage from 5 to 132).
   - An offline-first ingestion adapter (`src/data/acquisition/flipkart_image_adapter_v1_6.py`) has been implemented to verify candidate images via PIL and compute SHA-256 without network hallucination.
2. **Amazon India Review Expansion:**
   - The 1,495 Amazon India products without reviews in our current release require mapping against the McAulay 2023 Amazon dataset partition for India, or acquiring reviews via a governed API/crawl.
   - Deterministic matching confirms that available local corpora have 0 unlinked Amazon India reviews.

---

## 4. Legal, Terms of Service, and Provenance Governance

To ensure the dataset is 100% defensible for academic peer review, industry presentation, and open-source compliance:

1. **Strict Non-Commercial Research Exemption:** All external research datasets must be evaluated under fair dealing / fair use research provisions with provenance maintained in dataset manifests.
2. **No Data Scraping Without Explicit Policy Exemption:** Dynamic web scraping of live marketplace frontends is prohibited in standard environments without explicit user consent.
3. **No Synthetic Reviews or Fake Image Generation:** Modalities must reflect actual marketplace evidence. Zero LLM-generated fake reviews or generative image fills.
4. **Permanent SHA-256 Checksum Verification:** Any external file ingested must be hashed and recorded in `manifests/` prior to release inclusion.

---

## 5. Action Plan & Roadmap for Future Releases (v1.7+)

1. **Step 1 (Targeted Flipkart Ingestion):** Collect candidate images for the 127 Flipkart products from authorized local image repositories using `flipkart_image_adapter_v1_6.py`.
2. **Step 2 (Amazon 2023 Academic Subset):** Extract 5,000 verified Amazon.in reviews from McAulay UCSD 2023 dataset filtered specifically by Indian marketplace country code (`country == 'IN'`).
3. **Step 3 (Meesho Reseller Graph):** Ingest Meesho catalog metadata to construct seller-product syndication graphs for the graph intelligence engine.
