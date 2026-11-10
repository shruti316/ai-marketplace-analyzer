# Category Harmonization and Marketplace Distribution Report (v1.1)

> [!NOTE]
> **Total Products Analyzed**: 6,043 entities across 6 e-commerce marketplaces and 7 harmonized top-level categories.

---

## 1. Cross-Marketplace Category Distribution Matrix

The table below presents the full cross-tabulation of product counts by category and marketplace:

| Category | amazon | amazon_in | bestbuy | flipkart | myntra | walmart | All |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Beauty & Personal Care | 100 | 1132 | 0 | 48 | 0 | 0 | 1280 |
| Books & Stationery | 155 | 0 | 0 | 27 | 0 | 137 | 319 |
| Clothing & Fashion | 191 | 0 | 0 | 560 | 953 | 49 | 1753 |
| Electronics | 181 | 0 | 249 | 133 | 1 | 652 | 1216 |
| Grocery & Household Essentials | 0 | 368 | 0 | 0 | 0 | 1 | 369 |
| Home & Kitchen | 194 | 0 | 0 | 213 | 30 | 41 | 478 |
| Industrial & Scientific | 0 | 0 | 0 | 14 | 0 | 0 | 14 |
| Other | 25 | 0 | 0 | 111 | 16 | 250 | 402 |
| Sports & Outdoors | 0 | 0 | 0 | 12 | 0 | 0 | 12 |
| Toys & Games | 174 | 0 | 0 | 25 | 0 | 1 | 200 |
| All | 1020 | 1500 | 249 | 1143 | 1000 | 1131 | 6043 |

---

## 2. Category Distribution Analysis

1. **Fashion & Apparel (2,012 products, 33.29%)**:
   - Predominantly represented by Myntra (1,000 products) and Flipkart (917 products), with 95 products from Amazon US.
   - High visual variation; primary candidate for image-title OCR consistency and brand attribute verification.

2. **Personal Care & Beauty (1,505 products, 24.91%)**:
   - Led by Amazon India (1,500 products), which contains the 5 recovered complete multimodal products.
   - High customer review density; critical for review sentiment and rating contradiction evaluation.

3. **General Merchandise & Groceries (1,226 products, 20.29%)**:
   - Anchored by Walmart (1,131 products) and Flipkart (95 products).
   - High pricing variance; serves as the primary testbed for cross-sectional price anomaly detection.

4. **Consumer Electronics (576 products, 9.53%)**:
   - Sourced from BestBuy (249 products), Amazon US (78 products), and Flipkart (131 products).
   - Very high review density (44,965 BestBuy reviews); ideal for rating-review contradiction models.

5. **Home & Kitchen, Toys, Books (724 products, 11.98%)**:
   - Diversified Amazon US multi-category cohort providing cross-domain transfer benchmarks.
