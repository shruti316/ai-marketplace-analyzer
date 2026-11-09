# External Dependencies & Blocked Tasks Registry — v1.8
## AI-Powered Marketplace Trust Intelligence Platform

**Date:** 2026-11-04  
**Integrity Standard:** Zero Fabrication Invariant. All tasks requiring external network egress, authenticated APIs, or legal rulings are formally registered as `BLOCKED_EXTERNAL` rather than faked.

---

### Master Blocked Tasks & Dependencies Matrix

| Workstream | Sub-Capability / Task | Dependency Type | Blocking Root Cause | Adapter / Manifest Interface | Resolution Requirements |
|---|---|:---:|---|---|---|
| **WS2: Multimodal Expansion** | Flipkart 127 Image Recovery | Network / Web Scraping | `flipkart_reviews_raw.csv` omitted image URLs. Resolving requires querying `flipkart.com` by title, blocked in sandbox. | [`manifests/flipkart_127_image_manifest.csv`](file:///C:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/manifests/flipkart_127_image_manifest_v1_8.csv) | Elevated network egress permission to execute `src/data/acquisition/flipkart_image_adapter_v1_8.py --allow-network`. |
| **WS3: Fraud Ground Truth** | Binary Supervised Fraud Labels (`is_fraudulent: bool`) | Legal / Platform Adjudication | Absence of verified court consumer dispute records or marketplace merchant termination rulings. | [`data/annotation/human_annotation_sample_template.csv`](file:///C:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/annotation/human_annotation_sample_template.csv) | Formal data-sharing partnership with e-commerce platforms or double-blind legal consensus annotation study. |
| **WS4: Indic Languages** | Native Indic Reviews (Hindi, Tamil, Telugu, Bengali) | Data Acquisition / Crawling | Historical scrapers filtered for English frontend UI. 100% of existing reviews are Latin-script. | [`manifests/native_indic_review_collection_manifest.csv`](file:///C:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/manifests/native_indic_review_collection_manifest_v1_8.csv) | Targeted vernacular scraping via authenticated Amazon India / Flipkart language parameters (`review_language=hi_IN`). |
| **WS5: Longitudinal Pricing** | Prospective $T_1, T_2$ Temporal Price Snapshots | Longitudinal Scraping | Dataset captures single point-in-time $T_0$. Flash-sale manipulation requires elapsed temporal monitoring. | [`data/monitoring/price_snapshots_longitudinal.parquet`](file:///C:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/monitoring/price_snapshots_longitudinal.parquet) | Scheduled cron daemon executing `src/monitoring/price_snapshot_collector.py` over 30–90 days. |
| **WS6: Seller Governance** | Corporate GSTIN / MCA CIN Registration Lookup | Commercial / Government API | Public listing pages omit backend merchant tax identifiers. | [`manifests/gstin_cin_enrichment_manifest.csv`](file:///C:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/manifests/gstin_cin_enrichment_manifest_v1_8.csv) | Authenticated access to the Indian GST Common Portal API or MCA21 business registry. |
| **WS7: Catalog Matching** | Counter-Marketplace Live Catalog Search (500 SKUs) | Network / Web Search | Standardized FMCG/Electronics ASINs require search matching on Flipkart live portal. | [`manifests/standardized_500_sku_sampling_manifest.csv`](file:///C:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/manifests/standardized_500_sku_sampling_manifest_v1_8.csv) | Network egress authorization to query Flipkart search API for 500 standardized SKUs. |
