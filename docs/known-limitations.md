# Known System & Data Limitations Registry

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Target Ecosystems:** Amazon India, Flipkart, Myntra  
**Release State:** ML V1.0 Baseline / Multimodal Vision V1.1 Hardened  

---

## 1. Executive Summary

In adherence to ethical AI engineering and transparent reporting standards, this document catalogs all verified limitations across datasets, machine learning models, OCR engines, and marketplace decision policies.

---

## 2. Structured Limitations Registry

| # | Verified Limitation | Technical & Operational Impact | Current Engineering Mitigation | Planned Future Action (Phase 3+) |
|---|---------------------|--------------------------------|--------------------------------|-----------------------------------|
| **1** | **Absence of Independently Verified Counterfeit Ground Truth** | Models reconstruct internal deterministic policy anomaly targets, not legally verified trademark counterfeits. High AUC ($0.9990$) measures policy alignment, not fraud detection. | Explicitly disclaim counterfeit claims in documentation, reports, and UI. Present scores as policy anomaly ratings. | Collect and adjudicate the prospective 1,500 double-blind human label dataset using `GroundTruthIngestionPipeline` (Phase 3). |
| **2** | **Myntra Catalog Zero-Positive Anomaly Partition** | The 1,000-sample Myntra historical crawl contains 0 cross-product hero image reuse cases, leaving the decision threshold unvalidated on fashion. | Tag Myntra predictions as `UNVALIDATED_THRESHOLD`; cap maximum automated risk at moderate; mandate human triage. | Ingest focused crawl of unverified third-party fashion sellers on Myntra and Flipkart to establish an empirical fashion positive baseline. |
| **3** | **Regional Indic / Devanagari Packaging Script Support** | WinRT native OCR running on default Windows installations without Indic language packs fails to transcribe Hindi / Devanagari packaging text. | The Zero-Penalty Invariant safely routes untranscribed text to `INSUFFICIENT_PACKAGING_TEXT` (0 risk points). | Package Tesseract Indic OCR models (`hin.traineddata`, `tam.traineddata`) into the production Docker inference container. |
| **4** | **Packaging OCR Catalog Coverage Disparity** | Physical packaging OCR evidence is available on a 100-sample certified partition ($2.7\%$ of catalog); remaining listings lack back-packaging photos. | Decoupled OCR as an audit and compliance engine rather than a learned fusion feature to prevent $97.3\%$ missingness. | Expand crawl targets to systematically fetch secondary gallery images showing packaging text and statutory labels. |
| **5** | **Static Crawl Temporal Dynamics** | Historical catalog snapshot does not capture seller pricing changes over multiple weeks or review arrival velocity. | Implemented robust MAD subcategory price $z$-scores to evaluate static price corridor dispersion. | Implement daily temporal price snapshots in Phase 3 backend using `src/monitoring/price_snapshot_collector.py`. |
| **6** | **In-Memory Feature Matrix Scalability** | In-memory feature matrix caching (`_cached_matrix`) enables sub-70ms inference for 3,643 items, but will consume excessive RAM at $> 100,000$ items. | Matrix is cached in memory per process, comfortably fitting inside 312 MB RSS. | In Phase 3 backend development, migrate feature lookup to an external Redis key-value cache with on-demand vectorized inference. |
| **7** | **Festive Promotional Discount Variance on Flipkart** | Festive promotional discounting ($39.28\%$ catalog baseline) creates extreme price reductions that trigger false price anomaly flags under standard $0.50$ cutoffs. | Adapted Flipkart decision threshold to $0.65$ in `MarketplaceDecisionPolicy`, eliminating false alarms. | Train marketplace-specific pricing models with dynamic seasonal discount baselines during festive quarters. |
| **8** | **Synthetic Research Annotations Pilot** | `data/annotation/sample_adjudicated_research_annotations.parquet` contains 30 pilot research rows marked `is_definitive_ground_truth: False`. | Clearly document that this file is a schema prototype, not production ground truth. | Replace pilot rows with live adjudicated consensus records from the prospective 1,500-sample annotation pool. |
