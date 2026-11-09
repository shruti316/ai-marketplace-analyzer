# Advanced Pricing Intelligence Report
**Indian Marketplace Multimodal Trust Dataset v1.6**
*AI-Powered Indian Marketplace Trust Intelligence Platform*
*Release Date: November 9, 2026*

---

## 1. Executive Summary

Pricing anomalies—such as severe price undercutting, artificially inflated list prices coupled with astronomical discounts, or selling prices that exceed declared Maximum Retail Prices (MRP)—are primary indicators of potential catalog misrepresentation, counterfeit merchandise, or unauthorized grey-market listings in Indian e-commerce.

Milestone 5 establishes an end-to-end **Advanced Pricing Intelligence Pipeline** for the platform, replacing simplistic Gaussian assumptions with robust, non-parametric statistical modeling suited to heavy-tailed e-commerce price distributions.

---

## 2. Statistical Methodology

### 2.1 Non-Parametric Robust Statistics
E-commerce catalog pricing exhibits high skewness and extreme outliers that invalidate standard mean and standard deviation metrics. We employ robust estimators:
- **Median ($M$):** Robust measure of central tendency.
- **Interquartile Range ($\text{IQR} = Q_3 - Q_1$):** Robust measure of statistical dispersion.
- **Median Absolute Deviation ($\text{MAD}$):**
  $$\text{MAD} = \text{median}(|X_i - \text{median}(X)|)$$
- **Robust Z-Score ($z_{\text{robust}}$):**
  $$z_{\text{robust}} = \frac{X_i - M}{1.4826 \times \text{MAD}}$$
  Where $1.4826$ scales the MAD to be asymptotically equivalent to the standard deviation under a normal distribution.

### 2.2 Hierarchical Price Corridor Fallback
A primary risk in e-commerce price benchmarking is over-segmentation: computing price corridors for brands with only 1 or 2 products results in zero variance ($MAD = 0$) and artificial outlier flags.
We implement a two-stage hierarchical fallback:
1. **Brand Benchmark Qualification:** Brands with $\ge 5$ catalog products are marked `RELIABLE_SAMPLE_SIZE`. For these brands, the brand corridor $[Q_1 - 1.5 \times \text{IQR}, Q_3 + 1.5 \times \text{IQR}]$ is utilized.
2. **Subcategory Fallback:** Brands with $< 5$ products are marked `INSUFFICIENT_SAMPLE_SIZE_WIDE_CORRIDOR`. For these listings, the system falls back to the broader subcategory benchmark corridor, preventing false anomaly flags on niche products.

---

## 3. Pricing Benchmark Findings

### 3.1 Subcategory Benchmarks
- **Total Subcategories Benchmarked:** 343 distinct subcategories across 23 parent categories.
- **Sample Distribution:** Subcategory sample counts range from 1 to 216 listings.
- **Corridor Bounds:** Lower corridor is bounded by $\max(0.0, Q_1 - 1.5 \times \text{IQR})$; upper corridor is $Q_3 + 1.5 \times \text{IQR}$.
- **Storage:** Persisted in `derived_evidence/pricing_category_benchmarks.parquet`.

### 3.2 Brand Benchmarks and Sample Size Stratification
- **Total Catalog Brands:** 1,608 unique brand entities.
- **Reliable Brands ($\ge 5$ listings):** **105 brands** (6.53% of brands, covering 1,842 products or 50.56% of the catalog). Top reliable brands include *CHOCOCRAFT* (74 listings), *Allure Auto* (48 listings), *Anouk* (34 listings), *Puma* (29 listings), *Roadster* (27 listings), and *FabIndia* (25 listings).
- **Sparse Brands ($< 5$ listings):** **1,503 brands** (93.47% of brands). All 1,503 sparse brands safely fall back to their parent subcategory corridors.
- **Storage:** Persisted in `derived_evidence/pricing_brand_benchmarks.parquet`.

### 3.3 Marketplace Comparisons

| Marketplace | Product Count | Median Price (INR) | Q1 Price (INR) | Q3 Price (INR) | IQR (INR) | Mean Discount (%) | Median Discount (%) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Amazon India** | 1,500 | ₹680.00 | ₹349.00 | ₹1,499.00 | ₹1,150.00 | 29.42% | 25.00% |
| **Flipkart** | 1,143 | ₹499.00 | ₹249.00 | ₹1,199.00 | ₹950.00 | 44.18% | 45.00% |
| **Myntra** | 1,000 | ₹899.00 | ₹549.00 | ₹1,499.00 | ₹950.00 | 38.65% | 40.00% |

- **Observations:** Amazon India catalog listings reflect a broader spread into premium electronics and specialty gifting; Flipkart exhibits the highest median discount depth (45.00%); Myntra exhibits the highest median selling price (₹899.00) driven by fashion and lifestyle catalog pricing.
- **Storage:** Persisted in `derived_evidence/pricing_marketplace_benchmarks.parquet`.

---

## 4. Anomaly Detection and Signal Calibration

### 4.1 MRP vs. Selling Price Consistency Audit
Under Indian Consumer Protection (E-Commerce) Rules and Legal Metrology Regulations, selling a packaged commodity at a price exceeding the declared MRP is strictly prohibited.
- **Total Validated Records:** 3,643 listings.
- **Selling Price Exceeds Declared MRP:** **0 listings** (0.00%). All 3,643 listings conform strictly to $P_{\text{selling}} \le \text{MRP}$.
- **Unstated MRP:** 16 listings did not declare an MRP in the raw crawl (`mrp_consistency_status = 'MRP_NOT_DECLARED'`).

### 4.2 Extreme Discount Anomalies ($\ge 90\%$)
Extreme discounts ($\ge 90\%$) are common hallmarks of deceptive promotional pricing ("flash sale bait") or clearance liquidation of discontinued inventory:
- **Total Extreme Discount Listings:** **2 listings** (0.05% of catalog).
  1. `canonical_product_id: flipkart_PROD_1049`: Declared MRP ₹9,999, Selling Price ₹499 (95.01% discount).
  2. `canonical_product_id: flipkart_PROD_2841`: Declared MRP ₹4,999, Selling Price ₹399 (92.02% discount).
- Both listings were assigned `EXTREME_DISCOUNT_OUTLIER_SIGNAL` with `signal_severity = 'HIGH'`.

### 4.3 Price Corridor Outliers and Robust Z-Scores
- **Total Corridor Outliers:** **444 listings** (12.19% of catalog).
  - Upper Corridor Outliers: 421 listings (luxury or high-end variants relative to subcategory median).
  - Lower Corridor Outliers: 23 listings (extreme budget or accessory items).
- **Extreme Price Outliers ($|z_{\text{robust}}| \ge 3.0$):** **353 listings** (9.69% of catalog).
- **Signal Breakdown:**
  - `WITHIN_EXPECTED_CORRIDOR`: 3,197 listings (87.76%)
  - `EXTREME_PRICE_CORRIDOR_OUTLIER`: 353 listings (9.69%)
  - `MODERATE_PRICE_CORRIDOR_OUTLIER`: 91 listings (2.50%)
  - `EXTREME_DISCOUNT_OUTLIER_SIGNAL`: 2 listings (0.05%)
  - `SELLING_EXCEEDS_DECLARED_MRP_SIGNAL`: 0 listings (0.00%)

---

## 5. Artifact Schema and Storage

The pricing intelligence engine produces four certified parquet tables in `data/indian_marketplace_trust_dataset_v1_6/derived_evidence/`:

1. **`pricing_features.parquet` (3,643 rows × 25 columns):** Product-level pricing features, robust z-scores, corridor bounds, and risk flags.
2. **`pricing_category_benchmarks.parquet` (343 rows × 10 columns):** Subcategory median, Q1, Q3, IQR, MAD, and corridor boundaries.
3. **`pricing_brand_benchmarks.parquet` (1,608 rows × 11 columns):** Brand median, IQR, MAD, and reliability indicators.
4. **`pricing_marketplace_benchmarks.parquet` (3 rows × 8 columns):** Marketplace-level distribution summaries.
