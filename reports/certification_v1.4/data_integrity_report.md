# Workstream K: Data Integrity & 16-Baseline Protection Report

## 1. Protected Baselines Verification (16/16 Bit-Perfect)
Every protected baseline file was verified against its authoritative SHA-256 hash:

| File Path | Recorded Hash (Prefix) | Computed Hash (Prefix) | Status |
| :--- | :--- | :--- | :--- |
| `data/processed/canonical_products.parquet` | `b0a27e4803...` | `b0a27e4803...` | **MATCH** |
| `data/processed/canonical_reviews.parquet` | `17aa47d8aa...` | `17aa47d8aa...` | **MATCH** |
| `data/processed/canonical_images.parquet` | `bdae434ef2...` | `bdae434ef2...` | **MATCH** |
| `data/processed/canonical_relationships.parquet` | `490a37c8df...` | `490a37c8df...` | **MATCH** |
| `data/processed/image_quality_report.parquet` | `4acfcbeff7...` | `4acfcbeff7...` | **MATCH** |
| `data/processed/review_corpus_unlinked.parquet` | `7d7abde9d0...` | `7d7abde9d0...` | **MATCH** |
| `data/curated/curated_products_5684.parquet` | `abcdb9e0e7...` | `abcdb9e0e7...` | **MATCH** |
| `data/curated/curated_products_20000.parquet` | `b2df7c98b8...` | `b2df7c98b8...` | **MATCH** |
| `data/curated/cohort_membership_20000.parquet` | `961f992eeebd...` | `961f992eeebd...` | **MATCH** |
| `data/curated/cohort_metadata_20000.json` | `050656b487...` | `050656b487...` | **MATCH** |
| `data/indian_marketplace/processed/indian_products.parquet` | `a8ce91c897...` | `a8ce91c897...` | **MATCH** |
| `data/indian_marketplace/processed/indian_reviews.parquet` | `cf1a3c7f3a...` | `cf1a3c7f3a...` | **MATCH** |
| `data/indian_marketplace/processed/indian_reviews_linked.parquet` | `0bcebae7e3...` | `0bcebae7e3...` | **MATCH** |
| `data/indian_marketplace/processed/indian_images.parquet` | `f605ae7aa2...` | `f605ae7aa2...` | **MATCH** |
| `data/indian_marketplace/processed/indian_complete_multimodal.parquet` | `b052def824...` | `b052def824...` | **MATCH** |
| `data/indian_marketplace/processed/indian_dataset_metadata.json` | `fb8b9aaaaa...` | `fb8b9aaaaa...` | **MATCH** |

## 2. Release Immutability
- `v1.1`: Verified FROZEN and strictly unmodified.
- `v1.2`: Verified FROZEN and strictly unmodified.
- `v1.3`: Verified FROZEN and strictly unmodified.
