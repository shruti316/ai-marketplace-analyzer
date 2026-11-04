# Dataset v1.5 Documented Known Limitations

1. **LIM-01: Quarantined Flipkart Reviews (240 reviews):** Reviews with uncertain origin are preserved as unlinked to prevent false attribution.
2. **LIM-02: Missing Local Images for 127 Flipkart Products:** 127 review-linked products lack local hero images. Safe acquisition adapter prepared, awaiting user authorization.
3. **LIM-03: Aggregate Merchant Granularity:** Listing pages do not expose backend tax IDs (GSTIN/CIN); products link to 6 aggregate platform entities.
4. **LIM-04: Single-Snapshot Temporal Crawl:** Historical prices reflect point-in-time crawl data; longitudinal multi-snapshot temporal evaluation is documented in Protocol 6 for future crawls.
