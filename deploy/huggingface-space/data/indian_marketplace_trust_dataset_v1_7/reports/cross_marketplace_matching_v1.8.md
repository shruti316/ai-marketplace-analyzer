# Cross-Marketplace Catalog Matching & SKU Audit Report — v1.8
## AI-Powered Marketplace Trust Intelligence Platform

**Date:** 2026-11-04  
**Audit Scope:** Exact Match Count Reconciliation, Variant Differentiation, Attribute Conflict Analysis, and Standardized 500-SKU Sampling.

---

### 1. Reconciliation of Cross-Marketplace Match Counts

A historical source of ambiguity was the discrepancy between claimed "22 exact matches" and the matching table outputs.
The audit across `relationships/cross_marketplace_matches.parquet` reveals:
- **Total Evaluated Pairs in Table:** 30 candidate pairs.
- **Audited Status Distribution:**
  - **`VERIFIED_EXACT_MATCH`:** **0 pairs**
  - **`VARIANT_FAMILY_CROSS_MARKETPLACE`:** **1 pairs** (Conflicting pack/size/weight)
  - **`QUARANTINED_UNCERTAIN_MATCH`:** **1 pairs** (Similarity 0.70–0.85)
  - **`WEAK_SIMILARITY_CANDIDATE`:** **28 pairs** (Similarity < 0.70)

> [!IMPORTANT]
> **Zero products were collapsed into false identical SKUs.**  
> Listings with similar product titles but differing pack counts (e.g. *Pack of 1* vs *Pack of 3*) or apparel sizes are strictly governed under `VARIANT_FAMILY_CROSS_MARKETPLACE`, preserving distinct pricing and trust identities.

---

### 2. High-Confidence Candidate Pairs Evaluated

| Match ID | Marketplace 1 Title | Marketplace 2 Title | Brand | Score | Resolution Status |
|---|---|---|---|---:|:---:|
| `MATCH_flipkart_E_myntra_171` | AJ Dezines Boy's Kurta, Waistcoat a... | Aj DEZInES Boys White & Orange Clot... | aj dezines | 0.53 | `WEAK_SIMILARITY_CANDIDATE` |
| `MATCH_flipkart_E_myntra_234` | AJ Dezines Boy's Kurta, Waistcoat a... | Aj DEZInES Boys Coral Red Solid Kur... | aj dezines | 0.67 | `WEAK_SIMILARITY_CANDIDATE` |
| `MATCH_flipkart_E_myntra_234` | AJ Dezines Boy's Kurta, Waistcoat a... | Aj DEZInES Boys Orange Solid Kurta ... | aj dezines | 0.69 | `WEAK_SIMILARITY_CANDIDATE` |
| `MATCH_flipkart_E_myntra_245` | AJ Dezines Boy's Kurta, Waistcoat a... | AJ Dezines Boys Red & Black Sherwan... | aj dezines | 0.50 | `WEAK_SIMILARITY_CANDIDATE` |
| `MATCH_flipkart_E_myntra_250` | AJ Dezines Boy's Kurta, Waistcoat a... | AJ Dezines Baby Boys Indo Western S... | aj dezines | 0.52 | `WEAK_SIMILARITY_CANDIDATE` |
| `MATCH_flipkart_E_myntra_615` | AJ Dezines Boy's Kurta, Waistcoat a... | Aj DEZInES Boys Grey Self Design Ku... | aj dezines | 0.60 | `WEAK_SIMILARITY_CANDIDATE` |
| `MATCH_flipkart_E_myntra_743` | AJ Dezines Boy's Kurta, Waistcoat a... | Aj DEZInES Boys Orange Embroidered ... | aj dezines | 0.65 | `WEAK_SIMILARITY_CANDIDATE` |
| `MATCH_flipkart_E_myntra_860` | AJ Dezines Boy's Kurta, Waistcoat a... | Aj DEZInES Boys Black & Gold-Toned ... | aj dezines | 0.53 | `WEAK_SIMILARITY_CANDIDATE` |

---

### 3. Standardized 500-SKU Targeted Sampling Manifest (`BLOCKED_EXTERNAL`)

To systematically identify true exact cross-marketplace matches across Amazon India and Flipkart:
- Sampling Manifest: [`manifests/standardized_500_sku_sampling_manifest_v1_8.csv`](file:///C:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/manifests/standardized_500_sku_sampling_manifest_v1_8.csv)
- Target Universe: 500 standardized FMCG and consumer electronics items.
- Status: **`BLOCKED_EXTERNAL`** (Pending network authorization to query counter-marketplace live catalog search).
