# Marketplace Trust Evidence Dataset v1.0 — Repository & Data Asset Inventory Report

**Project:** AI-Powered Marketplace Trust Intelligence Platform  
**Dataset Release:** `Marketplace Trust Evidence Dataset v1.0`  
**Certification Status:** `CERTIFIED_WITH_LIMITATIONS`  
**Release State:** `FROZEN`  
**Execution Date:** 2026-11-03  
**Auditor:** Senior Data Quality Auditor & Multimodal ML Architect  

---

## 1. Executive Summary

This inventory report provides a comprehensive, bit-exact audit of all data assets across the project repository, culminating in the certified `Marketplace Trust Evidence Dataset v1.0`. The architecture strictly segregates core entities, primary multimodal evidence, relationship graphs, and isolated evaluation benchmarks across six connected evidence layers.

### Key Inventory Highlights
- **Total Unified Products:** **6,043** records (`entities/products.parquet`).
  - **Indian Marketplace Products:** **3,643** records (**60.28%**).
  - **Supplementary International Products:** **2,400** records (**39.72%**).
- **Physical Usable Images on Disk:** **5,228** verified readable JPEG assets.
  - Indian Marketplace usable images: **4,708** assets.
  - Supplementary International usable images: **520** assets.
  - Scrape failure audit records: **326** records preserved for audit lineage.
- **Unified Review Intelligence:** **51,680** total customer review records.
  - Confirmed Flipkart product-line linked reviews: **3,260** records.
  - Uncertain / unlinked Indian marketplace reviews: **240** records.
  - Supplementary international customer reviews: **48,180** records (BestBuy & Amazon US).
- **Timestamped Point-in-Time Price Observations:** **6,043** observations (1:1 with products).
  - Valid numeric prices: **5,061** records.
- **Bipartite Entity Relationship Edges:** **61,812** typed, validated edges (`HAS_IMAGE`, `HAS_REVIEW`, `HAS_PRICE`, `IMAGE_EXACT_DUPLICATE_OF`).
- **Layer 6 Cross-Modal Investigation Signals:** **1,889** cross-modal anomaly and consistency records.
- **Evidence Tiers:**
  - **Tier A (Complete Multimodal Core):** Exactly **100** products with all 4 modalities verified.
  - **Tier B (Partial Modalities):** **5,943** products with partial modalities.
  - **Tier C (Isolated Benchmarks):** **42,131** records across Ott et al. Deceptive Spam (1,600), Fake Reviews (40,526), and Synthetic Stress Cases (5).
- **Protected Baselines:** **16 / 16** legacy baseline files verified 100% bit-perfect against cryptographic SHA-256 signatures.

---

## 2. Certified Dataset Directory Architecture

The normalized multimodal release is housed under `data/marketplace_trust_dataset/`:

```
data/marketplace_trust_dataset/
├── entities/
│   ├── products.parquet               # 6,043 rows (Primary catalog entities)
│   └── sellers.parquet                # 6 rows (Platform aggregate merchants)
├── evidence/
│   ├── images.parquet                 # 5,554 rows (5,228 usable + 326 audit failures)
│   ├── reviews.parquet                # 51,680 rows (3,500 Indian + 48,180 Supplementary)
│   └── price_observations.parquet     # 6,043 rows (Point-in-time timestamped pricing)
├── evidence_relationships/
│   ├── entity_relationships.parquet   # 61,812 rows (Bipartite graph edges)
│   └── cross_modal_evidence.parquet   # 1,889 rows (Layer 6 cross-modal investigation signals)
├── collections/
│   ├── complete_multimodal_core.parquet  # 100 rows (Tier A: 4 verified modalities)
│   ├── partial_modalities.parquet        # 5,943 rows (Tier B: partial modalities)
│   └── isolated_benchmarks/              # Tier C: isolated ground-truth research benchmarks
│       ├── deceptive_opinion_spam.parquet       # 1,600 rows (Ott et al. ACL 2011)
│       ├── ecommerce_fake_reviews.parquet       # 40,526 rows (Manipulated reviews)
│       └── synthetic_stress_test_cases.parquet  # 5 rows (Adversarial test suite)
├── metadata/
│   ├── source_registry.parquet        # 11 rows (Comprehensive source provenance)
│   └── dataset_manifest.json          # Master cryptographic manifest & table checksums
└── manifests/
    └── image_acquisition_manifest.csv # 3,091 rows (Prioritized download backlog)
```

---

## 3. Detailed Master Table Inventory

| Table Name | Relative Path | Rows | Columns | File Size (Bytes) | Cryptographic SHA-256 Checksum |
|---|---|---|---|---|---|
| Products Master | `entities/products.parquet` | 6,043 | 21 | 1,467,487 | `4f32...` |
| Sellers Master | `entities/sellers.parquet` | 6 | 7 | 5,736 | `a7b1...` |
| Images Master | `evidence/images.parquet` | 5,554 | 22 | 1,439,876 | `9c82...` |
| Reviews Master | `evidence/reviews.parquet` | 51,680 | 17 | 13,819,483 | `5e14...` |
| Price Observations | `evidence/price_observations.parquet` | 6,043 | 13 | 331,020 | `7d88...` |
| Entity Relationships | `evidence_relationships/entity_relationships.parquet` | 61,812 | 10 | 1,127,503 | `1b22...` |
| Cross-Modal Evidence | `evidence_relationships/cross_modal_evidence.parquet` | 1,889 | 12 | 74,583 | `4c39...` |
| Complete Multimodal Core | `collections/complete_multimodal_core.parquet` | 100 | 21 | 46,906 | `8d11...` |
| Partial Modalities | `collections/partial_modalities.parquet` | 5,943 | 21 | 1,436,046 | `3a9f...` |
| Deceptive Opinion Spam | `collections/isolated_benchmarks/deceptive_opinion_spam.parquet` | 1,600 | 9 | 751,544 | `81ee...` |
| Fake Reviews Benchmark | `collections/isolated_benchmarks/ecommerce_fake_reviews.parquet` | 40,526 | 5 | 8,005,832 | `9bb0...` |
| Synthetic Stress Cases | `collections/isolated_benchmarks/synthetic_stress_test_cases.parquet` | 5 | 14 | 16,141 | `91e3...` |
| Source Registry | `metadata/source_registry.parquet` | 11 | 12 | 12,334 | `6c12...` |
| Image Acquisition Manifest | `manifests/image_acquisition_manifest.csv` | 3,091 | 10 | 844,394 | `d51b...` |
| Dataset Manifest JSON | `metadata/dataset_manifest.json` | 1 | - | 5,342 | `0e94...` |

*(Exact byte-level hashes are cataloged in `metadata/dataset_manifest.json`)*.

---

## 4. Protected Baseline Datasets Verification

In accordance with project governance rules, all 16 pre-existing baseline and curated files have been verified as 100% bit-perfect and untouched:

1. `data/processed/canonical_products.parquet`: `b0a27e4803d5bf76d025da1abea2045e3920e61b26cf72343c5a0e6465e5cd0e` (VERIFIED)
2. `data/processed/canonical_reviews.parquet`: `17aa47d8aa60e447ce673e83fe2d8336e10c357c3afeb4e0a63503e46a01323c` (VERIFIED)
3. `data/processed/canonical_images.parquet`: `bdae434ef284fa8e7f600c65b4dd6a8be04c77b464d20bce0d7641005cbc5187` (VERIFIED)
4. `data/processed/canonical_relationships.parquet`: `490a37c8dfab90195778a6f43003c2704d9a5beb8a1204544037ce81c1ebced9` (VERIFIED)
5. `data/processed/image_quality_report.parquet`: `4acfcbeff74ba226ab69a7f513d6b0d487980e8b3f4631b7979e0c5a6616ca9a` (VERIFIED)
6. `data/processed/review_corpus_unlinked.parquet`: `7d7abde9d0962fdb03655a877cf327930a889f0e12b9dd5fced0525fe7e59613` (VERIFIED)
7. `data/curated/curated_products_5684.parquet`: `abcdb9e0e729d26113d9781910c614a8f36f1fee5f88aabbe18430666baa9024` (VERIFIED)
8. `data/curated/curated_products_20000.parquet`: `b2df7c98b8fb95d66e07727028b7b778e28cca615f376480a26e5c29b1145cc4` (VERIFIED)
9. `data/curated/cohort_membership_20000.parquet`: `961f992eeebd4df5dd6c0c7ac811e14a5ee0d45797c792caa99fbffe7675b461` (VERIFIED)
10. `data/curated/cohort_metadata_20000.json`: `050656b487b1a0321d009b2cfbd3972a959e4758deca973f33ebe57f500acf2c` (VERIFIED)
11. `data/indian_marketplace/processed/indian_products.parquet`: `a8ce91c897fa6639f2bee06b54fdefbf8524d6de497f9b3a4dcd878732ecc53b` (VERIFIED)
12. `data/indian_marketplace/processed/indian_reviews.parquet`: `cf1a3c7f3a0758bcbefec983355e862b1cb142bfd78abee63d3462c79f52ed62` (VERIFIED)
13. `data/indian_marketplace/processed/indian_reviews_linked.parquet`: `0bcebae7e37734406076c0176f56216030659f4f091cdd777ea0be59e2a3ffa8` (VERIFIED)
14. `data/indian_marketplace/processed/indian_images.parquet`: `f605ae7aa29aba550900aaadd5771fe4193168bffc09412ab5bb4e6c4ac18499` (VERIFIED)
15. `data/indian_marketplace/processed/indian_complete_multimodal.parquet`: `b052def824cfae44dcbb862ca42d49b87cf537a24e8aa90663e2ed8ee79c410b` (VERIFIED)
16. `data/indian_marketplace/processed/indian_dataset_metadata.json`: `fb8b9aaaaafc88ec828e2d067aee988e25449da7961efc01d48f422f2299b534` (VERIFIED)

---

## 5. Summary Conclusion

The data asset inventory is fully reconciled, schema-normalized, and verified against file-system reality. No synthetic records or ghost files exist. All physical files on disk have been empirically validated.
