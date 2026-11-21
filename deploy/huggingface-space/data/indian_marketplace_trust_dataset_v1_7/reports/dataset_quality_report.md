# Dataset Quality Scorecard — Indian Marketplace Trust Dataset v1.4

## 1. Executive Summary
Comprehensive quality scorecard covering schema conformance, primary-key uniqueness, nullability constraints, and embedding consistency.

## 2. Primary-Key Uniqueness (0 Collisions)
- `canonical_product_id` in `products.parquet`: 3,643 unique of 3,643 rows (100%)
- `listing_id` in `listings.parquet`: 3,643 unique of 3,643 rows (100%)
- `variant_id` in `variants.parquet`: 3,643 unique of 3,643 rows (100%)
- `brand_id` in `brands.parquet`: 1,593 unique of 1,593 rows (100%)
- `platform_id` in `platforms.parquet`: 3 unique of 3 rows (100%)
- `seller_id` in `sellers.parquet`: 4 unique of 4 rows (100%)
- `image_id` in `images.parquet`: 5,034 unique of 5,034 rows (100%)
- `review_id` in `reviews.parquet`: 3,659 unique of 3,659 rows (100%)
- `price_observation_id` in `price_observations.parquet`: 3,667 unique of 3,667 rows (100%)

## 3. Visual Feature Conformance
- **Embeddings:** 4,708 512-dimensional ResNet-18 visual feature vectors.
- **Normalization:** 100% unit L2-normalized (norm = 1.0 $\pm 10^{-5}$).
