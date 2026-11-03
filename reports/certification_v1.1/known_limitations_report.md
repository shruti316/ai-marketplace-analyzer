# Master Known Limitations and Empirical Boundaries Report (v1.1)

> [!WARNING]
> This report documents the verified empirical boundaries of the Marketplace Trust Evidence Dataset v1.1. Users and ML engineers must account for these constraints.

---

## 1. Modality Sparsity in Indian Marketplace Data
- **Myntra Zero Local Images**: While 1,000 Myntra products exist with titles, brands, and INR prices, 0 local image files exist on disk. Remote CDN URLs are cataloged in `image_acquisition_manifest.csv`.
- **Flipkart Image-Review Disjointness**: Flipkart contains 932 products with local images and 127 products with 3,260 reviews, but 0 products share both an image and linked reviews due to distinct upstream collection pipelines.
- **Indian Tier A Sample Size**: Indian complete multimodal products are currently limited to 5 Amazon India products (159 reviews).

## 2. Complete Absence of Merchant Seller Identifiers
- Upstream web scrapes for all 6 marketplaces omitted merchant identifiers.
- In `products.parquet`, `seller_id` is 100% null (`None`).
- **Constraint**: Models cannot evaluate merchant-level network collusion graphs or repeated seller fraud histories from this release.

## 3. Lack of Longitudinal Price Histories
- All 6,043 price records represent a single crawl point-in-time snapshot.
- No historical pricing trends, promotional frequency curves, or seasonal inflation records exist.
- **Constraint**: Price anomaly models must operate cross-sectionally against category/brand distributions.

## 4. Ground-Truth Verified Fraud Class Imbalance
- Zero confirmed legal fraud convictions or regulatory enforcement outcomes exist in the raw scrapes (`VERIFIED_FRAUDULENT` count = 0).
- Trust evaluation in the platform relies on cross-modal contradictions, unsupervised anomalies, and external benchmark calibrations (Tier C).
