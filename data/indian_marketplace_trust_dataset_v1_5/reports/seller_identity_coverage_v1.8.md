# Seller Identity Coverage & Corporate Resolution Report — v1.8
## AI-Powered Marketplace Trust Intelligence Platform

**Date:** 2026-11-04  
**Audit Scope:** Verification of Claimed Missing Rates, Aggregator Entity Governance, and GSTIN/CIN Registration Enrichment.

---

### 1. Empirical Verification of Seller Missingness Claims

As mandated by Workstream 6, the claimed missing rates were independently verified on raw and release tables:

| Audit Dimension | Claimed Figure | Empirically Audited Metric | Audit Verdict |
|---|---:|---:|:---:|
| **Unique Merchant `seller_id` Missing Rate** | 82.5% | **100.00%** (20,000 / 20,000 in 20K cohort) | **Verified (Under-reported)** |
| **Marketplace Default / Placeholder Names** | 82.5% | **84.62%** (16,923 placeholders: Walmart.com, Amazon.in Seller, etc.) | **Verified** |
| **Verified GSTIN / CIN Tax Coverage** | 0.0% | **0.00%** (0 / 6,043 products possess tax IDs) | **Verified** |

> [!NOTE]
> Public marketplace scraping does not expose legal merchant corporate registration numbers (GSTIN, MCA CIN, or US EIN) on frontend product pages.  
> To maintain referential integrity in relational tables without fabricating fraudulent individual merchant IDs, releases v1.6 and v1.7 properly mapped listings to **Marketplace Aggregator Entities** (`SELLER_AGG_AMAZON_IN`, `SELLER_AGG_FLIPKART`, etc.).

---

### 2. Registered Marketplace Seller Entities

| Entity ID | Marketplace | Display Name | Verification Tier | Registered Products | Tax ID Status |
|---|---|---|:---:|---:|:---:|
| `SELLER_AGG_AMAZON_IN` | amazon_in | Amazon Seller Services Private Limited (Amazon.in) | MARKETPLACE_DISPLAYED | 1,500 | `BLOCKED_EXTERNAL` |
| `SELLER_AGG_FLIPKART` | flipkart | Flipkart Internet Private Limited (Flipkart.com) | MARKETPLACE_DISPLAYED | 1,143 | `BLOCKED_EXTERNAL` |
| `SELLER_AGG_MYNTRA` | myntra | Myntra Designs Private Limited (Myntra.com) | MARKETPLACE_DISPLAYED | 1,000 | `BLOCKED_EXTERNAL` |
| `SELLER_AGG_AMAZON_US` | amazon | Amazon.com Services LLC (Amazon US) | MARKETPLACE_DISPLAYED | 1,020 | `BLOCKED_EXTERNAL` |
| `SELLER_AGG_BESTBUY` | bestbuy | Best Buy Co., Inc. (BestBuy.com) | MARKETPLACE_DISPLAYED | 249 | `BLOCKED_EXTERNAL` |
| `SELLER_AGG_WALMART` | walmart | Walmart Inc. (Walmart.com) | MARKETPLACE_DISPLAYED | 1,131 | `BLOCKED_EXTERNAL` |

---

### 3. Corporate Registry Ingestion Interface (`BLOCKED_EXTERNAL`)

To support lawful future ingestion of verified GSTINs and MCA CINs:
- Interface Adapter: [`src/sellers/seller_identity_v1_8.py`](file:///C:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/sellers/seller_identity_v1_8.py)
- Enrichment Manifest: [`manifests/gstin_cin_enrichment_manifest_v1_8.csv`](file:///C:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/manifests/gstin_cin_enrichment_manifest_v1_8.csv)
- Status: **`BLOCKED_EXTERNAL`** (Requires authenticated API access to the official GST Common Portal or Ministry of Corporate Affairs MCA21).
