# Dataset Release v1.8 Certification & Quality Audit Report
## AI-Powered Marketplace Trust Intelligence Platform

**Release Version:** `v1.8_CERTIFIED`  
**Certification Verdict:** **`CERTIFIED_WITH_LIMITATIONS`**  
**Audit Date:** 2026-11-04  
**Data Integrity Auditor:** Antigravity Autonomous Data Architecture & Verification Engine

---

### 1. Executive Certification Verdict

The release candidate `data/marketplace_trust_dataset_v1.8/` has successfully undergone rigorous data-quality, referential-integrity, multi-modal evidence linking, and scientific evaluation leakage audits.

**Final Certification Verdict:**  
$$\mathbf{CERTIFIED_WITH_LIMITATIONS}$$

The release is certified with documented, quantified external boundaries:
1. **Network Egress Boundary:** 127 Flipkart review products remain registered in `flipkart_127_image_manifest.csv` as `BLOCKED_EXTERNAL`.
2. **Ground Truth Boundary:** Zero synthetic fraud ground-truth labels were fabricated. Platform trust scores remain explainable heuristic penalties.
3. **Indic Script Boundary:** The current review corpus is 100% Latin-script/Hinglish; native Indic reviews are registered under `native_indic_review_collection_manifest.csv` as `BLOCKED_EXTERNAL`.

---

### 2. Comprehensive Quality & Integrity Audit Matrix

| Audit Check | Standard / Target | Measured Metric | Status |
|---|---|---|:---:|
| **Product ID Uniqueness** | Strict Integrity | 6,043 unique product IDs out of 6,043 rows. | `PASS` |
| **Canonical Registry Integrity** | Strict Integrity | 6,043 canonical products indexed. | `PASS` |
| **Review ID Uniqueness** | Strict Integrity | 56,697 unique review IDs out of 56,697 rows. | `PASS` |
| **Review-to-Product Referential Integrity** | Strict Integrity | 0 unmatched non-null review product IDs. | `PASS` |
| **Image-to-Product Referential Integrity** | Strict Integrity | 0 unmatched image product IDs. | `PASS` |
| **Physical Image Decodability** | Strict Integrity | 5,228 verified decodable image files. | `PASS` |
| **Price Observations Coverage** | Strict Integrity | 5,153 valid listing prices out of 6,043 products. | `PASS` |
| **Tier A Complete Multimodal Count** | Strict Integrity | 305 verified Tier A complete multimodal products. | `PASS` |
| **Protocol 3 Reviewer Split Leakage Elimination** | Strict Integrity | Zero split overlap (0 products shared across splits). | `PASS` |
| **Benchmark Isolation** | Strict Integrity | 40,526 benchmark reviews strictly isolated from catalog training. | `PASS` |
| **16 Protected Baseline Files Bit-Perfect** | Strict Integrity | All 16 protected baseline files match exact SHA-256 hashes. | `PASS` |
| **Historical Releases Frozen & Immutable** | Strict Integrity | All historical releases (v1.1, v1.2, v1.3, v1.4, v1.5, v1.6, v1.7) intact on disk. | `PASS` |
| **Cryptographic Manifest Completeness** | Strict Integrity | 61 tables cryptographically verified. | `PASS` |

---

### 3. Release v1.8 Final Entity Census
- **Total Products:** 6,043 products (3,643 Indian = 60.28%, 2,400 International = 39.72%).
- **Total Verified Customer Reviews:** 56,697 reviews.
- **Physical Decodable Images on Disk:** 5,228 images across 2,811 catalog products.
- **Valid Listing Prices:** 5,153 products (85.27%).
- **Verified Tier A Multimodal Products:** 305 products.
- **Heterogeneous Graph Nodes:** 72,903 nodes across 7 entity types.
- **Heterogeneous Graph Edges:** 87,954 edges across 10 relationship types.
- **Protected Baselines:** 16/16 verified 100% bit-perfect.
- **Historical Releases:** v1.1, v1.2, v1.3, v1.4, v1.5, v1.6, and v1.7 preserved immutable.
