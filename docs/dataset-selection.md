# Dataset Selection & Stratification Rationale

**Project:** AI-Based Marketplace Analyzer  
**Scope:** Dataset Strategy, Provenance, and Multi-Tiered Stratification  

---

## 1. Primary Dataset Selection: Amazon Reviews'23 (All_Beauty)

### Provenance
- **Curator:** McAuley Lab, UC San Diego (Hou et al., 2024).
- **Official Portal:** [amazon-reviews-2023.github.io](https://amazon-reviews-2023.github.io/)
- **Category:** `All_Beauty` (112,590 products, 701,528 reviews).
- **Licensing:** Non-commercial academic research.

### Why All_Beauty Was Selected
1. **Manageable Scale:** Large enough to study complex statistical distributions (700k reviews) without requiring hundreds of gigabytes of disk storage or cluster compute.
2. **Multimodal Completeness:** Contains rich metadata, unconstrained text reviews, star ratings, helpful votes, and 100% active CloudFront image URLs.
3. **Risk Relevance:** Cosmetics and beauty products exhibit high real-world listing volatility (counterfeits, exaggerated packaging claims, deep price discounts, and unverified review rings).

---

## 2. Multi-Tiered Dataset Strategy

Rather than relying on a single flat file, the repository employs a multi-tiered relational architecture:

1. **Broad Representative Sample (`marketplace_text_features.parquet`):**
   - 19,991 reviews across 12,923 products.
   - Preserves the real-world long-tail distribution (78% single-review listings, 73.7% missing prices).
   - Serves as the category-wide baseline for vocabulary modeling and global sentiment.

2. **Dense Relational Cohort (`dense_products.parquet` & `dense_reviews.parquet`):**
   - 300 products, 7,595 reviews, 3,489 image records.
   - Filters to products with valid positive prices and $\ge 10$ source reviews (mean 25.3 reviews/product).
   - Enables intra-product review text cosine similarity, rating divergence, and review velocity analysis.

3. **Verified Pricing Cohort (`product_pricing_cohort.parquet`):**
   - 17,704 products with 100% valid positive prices.
   - Provides category-relative medians, IQRs, and Tukey fences for robust price anomaly detection.

4. **Product Image & OCR Manifest (`image_manifest.parquet`):**
   - 50 downloaded and validated primary product images.
   - Cryptographic SHA-256 and perceptual dHash signatures.
   - On-package text extracted via native Windows WinRT OCR (62% text detection rate).

5. **External NLP Deception Benchmark (`deceptive_opinion_spam.parquet`):**
   - 1,600 balanced reviews from Ott et al. (ACL 2011, EMNLP 2013).
   - 800 truthful vs 800 deceptive reviews; provides verified ground truth for stylometric fake-review classification.

6. **Controlled Synthetic Benchmark (`synthetic_stress_test_cases.parquet`):**
   - Five rule-based edge cases (Cases A–E) explicitly tagged `is_synthetic = True`.
   - Used exclusively for software verification and multi-signal explainability testing.
