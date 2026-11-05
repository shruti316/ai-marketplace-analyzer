# Known Dependencies & Blockers Register — v1.7
## Marketplace Trust Intelligence Platform

1. **Flipkart 127 Product Images:**
   - **Resource:** 127 local image files for appliance/electronics products.
   - **Status:** `READY_FOR_EXTERNAL_DATA`
   - **Why Blocked:** Requires network download or external image files; sandboxed execution disallows unauthorized scraping.
2. **Third-Party Merchant Profiles:**
   - **Resource:** GSTIN, CIN, and merchant storefront IDs.
   - **Status:** `READY_FOR_EXTERNAL_DATA`
   - **Why Blocked:** Absent in raw scrape corpora; schema and validators fully implemented.
3. **Native Indic Script Reviews:**
   - **Resource:** Reviews written in Devanagari, Tamil, Telugu, Bengali scripts.
   - **Status:** `READY_FOR_EXTERNAL_DATA`
   - **Why Blocked:** 100% of scraped reviews are Latin script / Hinglish.
4. **Longitudinal Price Snapshots:**
   - **Resource:** Future price observations (T1, T2).
   - **Status:** `FRAMEWORK_READY_AWAITING_T1_SNAPSHOT`
   - **Why Blocked:** Requires passage of calendar time for future scrape batches.
