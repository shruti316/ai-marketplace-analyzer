# Marketplace Trust Intelligence Dataset — Release v1.7 Summary
## Release Status: CERTIFIED WITH LIMITATIONS

**Dataset Name:** Marketplace Trust Intelligence Dataset  
**Version:** v1.7_FROZEN  
**Release Date:** 2026-11-04  
**Audit Verdict:** CERTIFIED WITH LIMITATIONS (119/119 automated invariant checks passed)  

---

### Key Metric Inventory

| Component | Value | Description |
|---|---:|---|
| **Products** | 6,043 | Canonical product entities across 6 marketplaces |
| **Indian Products** | 3,643 | 60.28% of product catalog (Amazon India, Flipkart, Myntra) |
| **US Products** | 2,400 | 39.72% of product catalog (BestBuy, Amazon US, Walmart) |
| **Reviews** | 56,697 | Customer reviews: 56,457 linked, 240 quarantined (100% accounted) |
| **Indian Reviews** | 3,659 | 6.45% of review corpus (Flipkart 3,260 + Uncertain 240 + Amazon India 159) |
| **US Reviews** | 53,038 | 93.55% of review corpus (BestBuy 44,965 + Amazon US 8,073) |
| **Usable Images** | 5,228 | Verified physical image files on disk (0 corrupted) |
| **Failed Image Upstream** | 326 | HTTP 404/broken image records preserved for audit |
| **Valid Prices** | 5,153 | Validated selling price observations |
| **Missing Prices** | 890 | Products lacking valid price in scrape (Amazon US 621, BestBuy 249, AMZ IN 15, FK 5) |
| **Graph Nodes** | 72,903 | Heterogeneous knowledge graph nodes |
| **Graph Edges** | 87,954 | Multi-relational evidence graph edges |
| **Tier A Products** | 305 | Complete Multimodal (Text + Image + Price) |
| **Tier B Products** | 2,506 | Visual (Product + Image + Price, no reviews) |
| **Tier C Products** | 127 | Textual (Product + Reviews + Price, zero disk images) |
| **Tier D Products** | 3,105 | Catalog listings (Un-instrumented for reviews/images) |
