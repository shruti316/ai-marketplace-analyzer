# Marketplace Trust Intelligence Dataset v1.5 — Executive Summary

## 1. Release Identification
- **Release Version:** `v1.5`
- **Release Status:** `FROZEN`
- **Directory:** `data/marketplace_trust_dataset_v1.5/`
- **Certification Verdict:** `CERTIFIED_WITH_LIMITATIONS`
- **Audit Date:** November 2026
- **Architecture Role:** Fully Audited, Multi-Protocol, Reconciled Multimodal Trust Evidence Foundation

## 2. Key Highlights of Release v1.5
1. **Resolution of Narrative Discrepancies:** Fully investigated and resolved the disconnect between earlier narrative reports and underlying Parquet datasets. All counts, category breakdowns, and marketplace distributions are now 100% synchronized with actual Parquet data.
2. **Catalog Composition:** Exactly 6,043 products across 10 genuine categories:
   - Indian Marketplace: **3,643 products (60.28%)** (Amazon India: 1,500, Flipkart: 1,143, Myntra: 1,000).
   - Supplementary: **2,400 products (39.72%)** (Amazon US: 1,020, BestBuy: 249, Walmart: 1,131).
3. **Review Reconciliation & Provenance:** Exactly **56,697 customer reviews** retained with zero data loss:
   - BestBuy: **44,965 reviews** (linked via EXACT_PRODUCT_ID).
   - Amazon US: **8,073 reviews** (linked via EXACT_PRODUCT_ID).
   - Flipkart: **3,260 reviews** (linked via EXACT_PRODUCT_LINE_IDENTITY).
   - Flipkart Uncertain Origin: **240 reviews** (honestly quarantined as UNLINKED).
   - Amazon India: **159 reviews** (linked via EXACT_ASIN_MATCH).
4. **Physical Image Assets (5,228 Usable):**
   - Flipkart: **3,208 usable images** across 932 products.
   - Amazon India: **1,500 usable images** across 1,500 products.
   - Amazon US: **520 usable images** across 520 products.
   - All 5,228 images physically exist on disk and were decodable via PIL.
5. **Prices & FX Normalization:** Exactly 5,153 valid prices and 890 missing prices. Date-aware FX conversion semantics are explicitly recorded.
6. **Evaluation Multi-Protocol Suite:** Six discrete protocols (Protocols 1 through 6) implemented with 0 product ID, variant parent group, or named reviewer overlap.
7. **Retirement of Circular Model Claim:** The circular Random Forest fusion ROC-AUC of 0.9124 from v1.4 is formally retired and reclassified as an unsupervised evidence aggregation framework.
8. **Test & Validation Success:** **99/99 automated validator checks (100.0%)** passed; **275/275 pytest unit and regression tests (100.0%)** passed; all 16 protected baselines match SHA-256 bit-for-bit.
