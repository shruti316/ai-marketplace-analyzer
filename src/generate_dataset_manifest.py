"""
src/generate_dataset_manifest.py
--------------------------------
Generates the comprehensive, machine-readable JSON dataset manifest (`data/dataset_manifest.json`)
documenting all foundational, canonical, multi-category, and multi-marketplace assets.
"""

import os
import json
import logging
import hashlib
import datetime
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


def get_file_sha256(filepath: str) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def generate_manifest(output_path: str = "data/dataset_manifest.json") -> dict:
    logging.info("Generating comprehensive machine-readable dataset manifest...")

    assets = [
        # 1. Canonical Processed Datasets (Unified Platform)
        {
            "id": "canonical_products",
            "path": "data/processed/canonical_products.parquet",
            "role": "Unified Multi-Category & Multi-Marketplace Product Catalog",
            "entity_level": "Product Listing",
            "primary_key": "canonical_product_id",
            "foreign_keys": {},
            "provenance": {
                "sources": [
                    "Amazon Reviews'23 (UCSD McAuley Lab)",
                    "Magellan / matchbench Walmart Catalog (Univ. of Wisconsin)",
                    "BestBuy Customer Reviews (ValerianFourel)",
                ],
                "license": "Academic Research & Educational Use",
                "collection_method": "Deterministic canonical normalization across categories & marketplaces",
            },
            "status": "UPGRADED_CANONICAL_TABLE",
        },
        {
            "id": "canonical_reviews",
            "path": "data/processed/canonical_reviews.parquet",
            "role": "Unified Multi-Category & Multi-Marketplace Review Catalog",
            "entity_level": "Customer Review",
            "primary_key": "canonical_review_id",
            "foreign_keys": {"canonical_product_id": "canonical_products.canonical_product_id"},
            "provenance": {
                "sources": [
                    "Amazon Reviews'23 Reviews (All Beauty, Electronics, Fashion, Home, Toys, Books)",
                    "BestBuy Reviews",
                ],
                "license": "Academic Research & Educational Use",
                "collection_method": "Multi-category ingestion with strict foreign key integrity validation",
            },
            "status": "UPGRADED_CANONICAL_TABLE",
        },
        {
            "id": "canonical_images",
            "path": "data/processed/canonical_images.parquet",
            "role": "Unified Multimodal Product Image Catalog",
            "entity_level": "Image Asset",
            "primary_key": "image_id",
            "foreign_keys": {"canonical_product_id": "canonical_products.canonical_product_id"},
            "provenance": {
                "source": "Amazon CloudFront Image CDN",
                "license": "Academic Research Use",
                "collection_method": "Structured image URL parsing linked to canonical products",
            },
            "status": "UPGRADED_CANONICAL_TABLE",
        },
        # 2. Relational Dense Cohort
        {
            "id": "dense_products",
            "path": "data/interim/dense_products.parquet",
            "role": "Dense Product Catalog Cohort",
            "entity_level": "Product",
            "primary_key": "parent_asin",
            "foreign_keys": {},
            "provenance": {
                "source": "Amazon Reviews'23 Metadata (Local Raw Archive)",
                "category": "All_Beauty",
                "license": "Non-commercial Academic Research",
                "collection_method": "Filtered to products with positive price and >=10 source reviews; sampled 300 products",
            },
            "status": "UPGRADED_INTERIM_TABLE",
        },
        {
            "id": "dense_reviews",
            "path": "data/interim/dense_reviews.parquet",
            "role": "Dense Clustered Reviews",
            "entity_level": "Review",
            "primary_key": "review_id",
            "foreign_keys": {"parent_asin": "dense_products.parent_asin"},
            "provenance": {
                "source": "Amazon Reviews'23 Reviews (Local Raw Archive)",
                "category": "All_Beauty",
                "license": "Non-commercial Academic Research",
                "collection_method": "Extracted all matching reviews for the 300 dense products; capped at 40 reviews/product",
            },
            "status": "UPGRADED_INTERIM_TABLE",
        },
        {
            "id": "dense_product_images",
            "path": "data/interim/dense_product_images.parquet",
            "role": "Relational Product Image Catalog",
            "entity_level": "Image Record",
            "primary_key": "image_id",
            "foreign_keys": {"parent_asin": "dense_products.parent_asin"},
            "provenance": {
                "source": "Amazon Reviews'23 Metadata Image Dict",
                "category": "All_Beauty",
                "license": "Non-commercial Academic Research",
                "collection_method": "Parsed structured 'large', 'hi_res', and 'thumb' arrays from raw metadata",
            },
            "status": "UPGRADED_INTERIM_TABLE",
        },
        # 3. Verified Pricing Cohort
        {
            "id": "product_pricing_cohort",
            "path": "data/interim/product_pricing_cohort.parquet",
            "role": "Category Pricing & Rating Distribution Cohort",
            "entity_level": "Product",
            "primary_key": "parent_asin",
            "foreign_keys": {},
            "provenance": {
                "source": "Amazon Reviews'23 Metadata (Local Raw Archive)",
                "category": "All_Beauty",
                "license": "Non-commercial Academic Research",
                "collection_method": "Complete extraction of all products with valid positive numeric price",
            },
            "status": "UPGRADED_INTERIM_TABLE",
        },
        # 4. Image Manifest & OCR
        {
            "id": "image_manifest",
            "path": "data/interim/image_manifest.parquet",
            "role": "Product Image Validation, Hashing & WinOCR Manifest",
            "entity_level": "Downloaded Image Batch",
            "primary_key": "image_id",
            "foreign_keys": {"parent_asin": "dense_products.parent_asin"},
            "provenance": {
                "source": "Amazon CloudFront CDN (Live Downloaded Batch)",
                "license": "Academic Research Use",
                "collection_method": "Automated download of 50 primary packaging images; SHA-256, dHash, and Windows WinRT OCR extraction",
            },
            "status": "UPGRADED_INTERIM_TABLE",
        },
        # 5. External Benchmarks
        {
            "id": "deceptive_opinion_spam",
            "path": "data/raw/benchmarks/deceptive_opinion_spam.parquet",
            "role": "External Deceptive Opinion NLP Benchmark (Isolated Research Baseline)",
            "entity_level": "Benchmark Review",
            "primary_key": None,
            "foreign_keys": {},
            "provenance": {
                "source": "Ott et al. (ACL 2011, EMNLP 2013)",
                "url": "https://myleott.com/op-spam.html",
                "license": "Academic Research Use",
                "collection_method": "400 truthful positive, 400 deceptive positive, 400 truthful negative, 400 deceptive negative hotel reviews",
            },
            "status": "BENCHMARK_ISOLATED",
        },
        {
            "id": "synthetic_stress_test_cases",
            "path": "data/raw/benchmarks/synthetic_stress_test_cases.parquet",
            "role": "Controlled Synthetic Stress-Test Suite (Software Verification Only)",
            "entity_level": "Benchmark Test Case",
            "primary_key": "case_id",
            "foreign_keys": {},
            "provenance": {
                "source": "Synthesized edge-case scenarios explicitly tagged is_synthetic=True",
                "license": "Internal Project Verification",
                "collection_method": "Deterministic rule-based parameter generation",
            },
            "status": "BENCHMARK_ISOLATED",
        },
        # 6. Baseline Sample (Preserved)
        {
            "id": "baseline_processed_features",
            "path": "data/processed/marketplace_text_features.parquet",
            "role": "Global Category Baseline Sample",
            "entity_level": "Review-level flat sample",
            "primary_key": None,
            "foreign_keys": {"parent_asin": "raw_metadata.parent_asin"},
            "provenance": {
                "source": "Amazon Reviews'23 (UCSD McAuley Lab)",
                "url": "https://amazon-reviews-2023.github.io/",
                "category": "All_Beauty",
                "license": "Non-commercial Academic Research",
                "collection_method": "Random review sampling (seed=42) + left-join metadata",
            },
            "status": "PRESERVED_WEEK_2_OUTPUT",
        },
    ]

    manifest = {
        "manifest_version": "3.0.0",
        "generated_at": datetime.datetime.utcnow().isoformat(),
        "project": "AI-Powered Marketplace Trust Intelligence Platform",
        "dataset_collection": [],
    }

    for item in assets:
        filepath = item["path"]
        if not os.path.exists(filepath):
            logging.warning("Asset file not found on disk: %s", filepath)
            continue

        size_bytes = os.path.getsize(filepath)
        sha256_hash = get_file_sha256(filepath)
        df = pd.read_parquet(filepath)

        record = {
            "id": item["id"],
            "path": item["path"],
            "role": item["role"],
            "entity_level": item["entity_level"],
            "primary_key": item["primary_key"],
            "foreign_keys": item["foreign_keys"],
            "provenance": item["provenance"],
            "status": item["status"],
            "file_size_bytes": size_bytes,
            "sha256_checksum": sha256_hash,
            "rows": int(len(df)),
            "columns": int(len(df.columns)),
            "column_names": list(df.columns),
            "missing_value_counts": {col: int(cnt) for col, cnt in df.isna().sum().items() if cnt > 0},
        }
        manifest["dataset_collection"].append(record)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    logging.info("Manifest written to %s with %d registered dataset assets.", output_path, len(manifest["dataset_collection"]))
    return manifest


if __name__ == "__main__":
    generate_manifest()
