# Marketplace Trust Intelligence Dataset v1.6 — Final Release Verdict

## Official Verdict
**`CERTIFIED_WITH_LIMITATIONS`**

## Technical Justification
The v1.6 release achieves complete engineering readiness, resolving historical data foundation discrepancies, providing the temporal snapshot architecture, implementing seller identity governance, delivering multilingual Hinglish NLP annotations, and extracting deep visual embeddings for all usable images.

The qualification `WITH_LIMITATIONS` is maintained with complete scientific honesty:
1. **External Network Acquisition Disabled:** Network downloads for the 127 Flipkart review-bearing products remain disabled pending explicit user authorization. The target manifest is registered.
2. **Unobserved Seller Tax Identifiers:** Front-end marketplace scrapes do not expose backend merchant tax registration numbers (GSTIN/CIN); `products.seller_id` is maintained as 100% honest null.
3. **Single-Snapshot Baseline:** Price observations reflect point-in-time crawl snapshots tagged `READY_FOR_DATA_COLLECTION`; longitudinal multi-snapshot crawls will be captured in future operational runs.
4. **Isolated Academic Ground Truth:** In-the-wild marketplace customer reviews remain unverified for true fraud; programmatic weak supervision is used without falsely claiming confirmed ground truth.

All release invariants, hashes, and schemas are 100% verified.
