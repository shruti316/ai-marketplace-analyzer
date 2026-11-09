# Multimodal Coverage Report — Indian Marketplace Trust Dataset v1.3

## 1. Modality Distribution & Product Cohorts
- **Total Canonical Products:** 3,643
  - Amazon India: 1,500 products (41.17%)
  - Flipkart: 1,143 products (31.38%)
  - Myntra: 1,000 products (27.45%)

## 2. Modality Breakdown
- **Product Metadata:** 3,643 products (100.0%)
- **Marketplace Listings:** 3,643 listings (100.0%)
- **Product Variants:** 3,643 variants (100.0%)
- **Valid INR Current Prices:** 3,643 products (100.0%)
- **Price Observations (Append-Only):** 3,667 observations across 3,643 products
- **Usable Images:** 4,708 usable images across 2,432 products (Flipkart: 932 products, Amazon India: 1,500 products)
- **Unit-Normalized ResNet-18 Embeddings:** 4,708 unit-norm vectors across 2,432 products (100.0% of usable images)
- **Customer Reviews:** 3,659 linked reviews across 148 products (Flipkart)
- **Platform Relationships:** 3,643 listings mapped to 3 registered platforms

## 3. Tier Distribution (Strict Modality Criteria)
- **Tier A (Fully Multimodal - Metadata + Reviews + Images + Price):** 5 products (0.14%)
  - `flipkart_rec_0326EBBB9B53`
  - `flipkart_rec_09A769747971`
  - `flipkart_rec_0BB669F540E9`
  - `flipkart_rec_2C873DCD2BC2`
  - `flipkart_rec_3F649B749D2B`
- **Tier B (3 Modalities Available):** 2,570 products (70.55%)
  - Image-rich + Price + Metadata (no reviews): 2,427 products
  - Review-rich + Price + Metadata (no usable images): 143 products
- **Tier C (2 Modalities Available):** 1,068 products (29.32%)
  - Metadata + Price (no reviews or images, e.g. Myntra catalog): 1,068 products
- **Tier D (1 or 0 Modalities Available):** 0 products (0.00%)
