# Workstream A: Indian Data Acquisition & Expansion Plan

## 1. Context & Objectives
The platform targets Indian marketplace trust intelligence. Current Indian catalog: 3,643 products (60.28% of total catalog):
- Amazon India: 1,500 products (1,500 prices, 1,432 images, 3,490 unlinked reviews).
- Flipkart: 1,143 products (980 prices, 163 documented missing prices, 0 images, 1,143 linked reviews across 127 products).
- Myntra: 1,000 products (1,000 prices, 1,000 images, 0 reviews).

Tier A Indian Complete Multimodal Products currently stand at **5 products** (verified Amazon India listings with concurrent images, valid INR prices, and linked reviews).

## 2. The 127 Flipkart Candidate Cohort
There are 127 Flipkart products with 1,143 linked customer reviews and active INR prices. These products lack local image files.
- If product hero images are acquired for these 127 listings, Indian Complete Multimodal products will immediately increase from **5 to 132 products (+2,540% expansion)**.

## 3. External Acquisition Blueprint (Zero Unauthorized Scraping)
In compliance with strict project safety rules, no automated web scraping or unauthorized downloading was performed. Instead, an acquisition pipeline is fully prepared:
- Target URLs: Verified Flipkart product page image CDNs (`rukminim1.flixcart.com`).
- Script: `scripts/acquire_flipkart_images.py` (ready for execution upon manual user approval).
- Hash Verification: SHA-256 pre-registration ensures bit-perfect integrity upon download.
- Expected Yield: 127 verified hero images, elevating Indian Tier A coverage to 132 products.

## 4. Expansion towards >= 500 Indian Multimodal Products
A formal roadmap for 500+ Indian multimodal coverage involves:
1. Acquiring hero images for the 127 Flipkart review products (yields 132 products).
2. Linking Amazon India reviews to ASINs using product search and catalog matching (potential yield: 250+ products).
3. Ingesting open research Indian corpora (e.g. Kaggle Indian E-Commerce Datasets, Nykaa/Meesho open research dumps) under standard data governance protocols.
