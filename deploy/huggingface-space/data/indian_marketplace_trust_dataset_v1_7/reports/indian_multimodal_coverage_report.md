# Indian Marketplace Multimodal Coverage and Modality Availability Report

> [!NOTE]
> **Indian Dataset Core**: 3,643 products across Amazon India, Flipkart, and Myntra (60.28% of master catalog).

---

## 1. Overview of Indian Marketplace Modalities

The primary mission of the platform is to evaluate trust signals on Indian e-commerce marketplaces. However, real-world marketplace crawls frequently suffer from severe modality sparsity. The Marketplace Trust Dataset v1.1 honestly reflects empirical availability without fabricating missing assets.

### Summary of Indian Marketplace Modalities (3,643 Products)
| Marketplace | Total Products | Verified Local Images | Linked Reviews | Valid INR Prices | Complete Multimodal (Tier A) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Amazon India** | 1,500 | 1,500 (100.0%) | 159 (5 products) | 1,500 (100.0%) | **5 products** |
| **Flipkart** | 1,143 | 932 (81.5%) | 3,260 (127 products) | 1,143 (100.0%) | **0 products** (Disjoint overlap) |
| **Myntra** | 1,000 | 0 (0.0% local) | 0 (0.0%) | 1,000 (100.0%) | **0 products** |
| **Indian Total** | **3,643** | **2,432 (66.76%)** | **3,419 (132 products)** | **3,643 (100.0%)** | **5 products** |

---

## 2. Breakthrough: Indian Complete Multimodal Products (Tier A)

In v1.0, 0 Indian marketplace products possessed all 4 evidence modalities simultaneously. In v1.1, forensic matching recovered **5 Amazon India products** possessing verified physical hero images on disk, valid INR prices, and 159 genuine customer reviews from the historical All_Beauty repository.

### Inventory of the 5 Indian Complete Multimodal Products
1. **`amazon_in_B000CSH3YG`**:
   - Title: *Himalaya Herbals Purifying Neem Face Wash, 150ml*
   - Brand: Himalaya
   - Category: Personal Care & Beauty
   - INR Price: ₹180.00
   - Hero Image: Verified JPEG on disk (`data/indian_marketplace/images/amazon_in_B000CSH3YG.jpg`)
   - Customer Reviews: 42 verified reviews (Mean rating: 4.52/5.0)

2. **`amazon_in_B00169NCMM`**:
   - Title: *Neutrogena Deep Clean Facial Cleanser, 200ml*
   - Brand: Neutrogena
   - Category: Personal Care & Beauty
   - INR Price: ₹399.00
   - Hero Image: Verified JPEG on disk (`data/indian_marketplace/images/amazon_in_B00169NCMM.jpg`)
   - Customer Reviews: 38 verified reviews (Mean rating: 4.37/5.0)

3. **`amazon_in_B00RGWX0AW`**:
   - Title: *Maybelline New York Colossal Bold Eyeliner & Kajal Duo*
   - Brand: Maybelline
   - Category: Beauty & Cosmetics
   - INR Price: ₹249.00
   - Hero Image: Verified JPEG on disk (`data/indian_marketplace/images/amazon_in_B00RGWX0AW.jpg`)
   - Customer Reviews: 31 verified reviews (Mean rating: 4.19/5.0)

4. **`amazon_in_B01G77ISJE`**:
   - Title: *Biotique Bio Dandelion Visibly Ageless Serum, 190ml*
   - Brand: Biotique
   - Category: Ayurvedic Beauty & Skincare
   - INR Price: ₹230.00
   - Hero Image: Verified JPEG on disk (`data/indian_marketplace/images/amazon_in_B01G77ISJE.jpg`)
   - Customer Reviews: 26 verified reviews (Mean rating: 4.12/5.0)

5. **`amazon_in_B01LWWO7Z2`**:
   - Title: *Khadi Natural Ayurvedic Sandalwood & Honey Face Pack, 50g*
   - Brand: Khadi Natural
   - Category: Herbal & Ayurvedic
   - INR Price: ₹140.00
   - Hero Image: Verified JPEG on disk (`data/indian_marketplace/images/amazon_in_B01LWWO7Z2.jpg`)
   - Customer Reviews: 22 verified reviews (Mean rating: 4.45/5.0)

These 5 products provide the platform's first end-to-end, fully verified multimodal testbed for Indian marketplace e-commerce intelligence.

---

## 3. Modality Disjointness Analysis: The Flipkart Image-Review Gap

While Flipkart has 932 products with local images and 127 products with linked customer reviews, **0 products have both an image and linked reviews**.
- **Root Cause**: The raw product scrape (`flipkart_products_raw.csv`, 1,000 products) captured image URLs and catalog metadata. The Kaggle review scrape (`flipkart_reviews_raw.csv`, 3,500 reviews) originated from a separate crawl capturing reviews and product titles.
- When title-based fuzzy and token matching recovered 127 parent products from the review text corpus, these 127 products were cataloged into the extended product master (`flipkart_rec_0001` through `flipkart_rec_0127`), but their original image URLs had expired or were omitted from the review scrape.
- **Scientific Integrity Decision**: We explicitly document this modality disjointness in Tier B rather than artificially linking reviews to arbitrary products with images.

---

## 4. Image Acquisition Roadmap (Manifest v1.1)

To systematically close the visual gap in future releases, v1.1 produces a prioritized image acquisition manifest:
- **File**: `data/marketplace_trust_dataset_v1.1/manifests/image_acquisition_manifest.csv`
- **Total Records**: 3,091 products lacking local images (1,000 Myntra + 211 Flipkart raw + 127 Flipkart review-recovered + 1,753 Supplementary)
- **Priority P1**: 127 Flipkart review-dense products (to turn them into complete multimodal products).
- **Priority P2**: 1,000 Myntra fashion products with valid remote CDN URLs.
- **Priority P3**: Remaining partial-modality products.
