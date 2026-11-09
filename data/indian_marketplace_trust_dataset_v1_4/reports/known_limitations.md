# Known Limitations & Research Boundaries — Indian Marketplace Trust Dataset v1.4

### 1. Merchant Identity Resolution
- **Upstream Scrape Limitation:** Upstream PromptCloud crawl caches for Amazon India, Flipkart, and Myntra did not record individual third-party retail merchant store IDs or GSTINs.
- **Remediation:** Marketplace operators are modeled as `PLATFORM` entities (`PLATFORM_AMAZON_IN`, `PLATFORM_FLIPKART`, `PLATFORM_MYNTRA`). Unresolved retail merchants are pooled into `SELLER_UNRESOLVED_THIRD_PARTY` with explicit unverified status flags. Zero false retail merchant identities are manufactured.

### 2. Optical Character Recognition (OCR) Engine
- **Environment Blocker:** Neither Tesseract OCR system binary nor EasyOCR Python package is installed in the local Windows environment.
- **Remediation:** The 50 physical OCR sample audits are explicitly marked `OCR_BLOCKED_OFFLINE_DEPENDENCY_ABSENT` with confidence 0.00. Title-token proxy records (1,000 records) are completely isolated in `title_token_packaging_proxy.parquet` with confidence 0.50.

### 3. Historical Price Depth
- **Temporal Depth:** Point-in-time pricing is available for 3,619 products, with 24 corroborated review-point observation pairs. Longitudinal price scraping was omitted in the historical static crawl caches.
- **Remediation:** Robust subcategory price corridors ($z_{\text{robust}}$) are computed to identify statistical anomalies without declaring fraud.

### 4. Multilingual Indic Coverage
- **Language Breakdown:** Reviews comprise 3,655 English reviews and 4 Latin-script Hinglish reviews. Native Devanagari script reviews were absent from the upstream Flipkart crawl cache. Zero synthetic Indic reviews were fabricated.

### 5. Multimodal Modality Sparsity
- **Tier A Sparsity:** Only 5 products currently possess simultaneously valid metadata, reviews, physical images, and prices. Most products fall into Tier B (70.5%) or Tier C (29.3%).
