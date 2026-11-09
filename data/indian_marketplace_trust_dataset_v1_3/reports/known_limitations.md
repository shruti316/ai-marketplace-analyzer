# Known Limitations & Research Boundaries — Indian Marketplace Trust Dataset v1.3

### 1. Merchant Identity Resolution
- **Upstream Scrape Limitation:** Upstream PromptCloud crawl caches for Amazon India, Flipkart, and Myntra did not record individual third-party retail merchant store IDs.
- **Remediation:** Marketplace operators are modeled as `PLATFORM` entities (`PLATFORM_AMAZON_IN`, `PLATFORM_FLIPKART`, `PLATFORM_MYNTRA`). Product associations are typed as `HOSTED_ON_PLATFORM`. `SOLD_BY` is explicitly reserved for future verified merchant links.

### 2. Optical Character Recognition (OCR) Engine
- **Environment Blocker:** Neither Tesseract OCR binary nor EasyOCR Python dependencies are available in the local Windows environment.
- **Remediation:** The 1,000 packaging records are preserved with transparent provenance as `TITLE_TOKEN_PROXY_v1.3` (confidence 0.50). No false claims of live Tesseract execution are made.

### 3. Historical Price Depth
- **Temporal Depth:** Point-in-time pricing is available for 3,619 products, with 24 corroborated review-point observation pairs. A multi-point time series crawl was not captured in the historical static crawl caches.

### 4. Multilingual Indic Coverage
- **Language Breakdown:** Reviews comprise 3,655 English reviews and 4 Latin-script Hinglish reviews. Native Devanagari script reviews were not present in the upstream Flipkart crawl cache.

### 5. Multimodal Modality Balance
- **Usable Images:** 4,708 usable images across 2,432 products (Flipkart and Amazon India).
- **Linked Reviews:** 3,659 reviews across 148 products (Flipkart).
- **Tier A Fully Multimodal Products:** 5 products have simultaneously valid metadata, reviews, images, and prices.
