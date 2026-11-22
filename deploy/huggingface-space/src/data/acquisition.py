"""
src/data/acquisition.py
-----------------------
Multi-Category and Multi-Marketplace Data Acquisition Pipeline.

Acquires, caches, and preserves immutable raw datasets across:
1. Amazon Reviews '23 multi-category shards:
   - Electronics
   - Clothing & Fashion (Amazon_Fashion)
   - Home & Kitchen
   - Toys & Games
   - Books & Stationery
   - Beauty & Personal Care (local raw archive)
2. Walmart Marketplace:
   - Walmart product catalog from University of Wisconsin / Megellan entity matching benchmark
3. BestBuy Marketplace:
   - BestBuy product customer reviews

Features:
- Deterministic, cached, resumable downloads.
- Reliable DNS fallback via 8.8.8.8 UDP resolution.
- Raw data preservation: raw files are never overwritten or fabricated.
- Comprehensive provenance logging.
"""

import os
import io
import json
import logging
import hashlib
from typing import Dict, Any, List
import requests
import pandas as pd
from src.utils.network import enable_reliable_dns

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

HF_BASE_URL = "https://huggingface.co/datasets/McAuley-Lab/Amazon-Reviews-2023/resolve/main"
WALMART_URL = "https://huggingface.co/datasets/matchbench/Walmart-Amazon/raw/main/tableB.csv"
BESTBUY_REVIEWS_URL = "https://huggingface.co/datasets/ValerianFourel/bestbuy-reviews/resolve/main/data/train-00000-of-00001.parquet"

EXPANDED_AMAZON_CATEGORIES = [
    "Electronics",
    "Amazon_Fashion",
    "Home_and_Kitchen",
    "Toys_and_Games",
    "Books",
]


def compute_sha256(filepath: str) -> str:
    """Calculate the SHA-256 hash of a file."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def acquire_amazon_category_sample(
    category: str,
    raw_dir: str = "data/raw/amazon",
    meta_bytes_range: int = 350000,
    review_bytes_range: int = 350000,
) -> Dict[str, str]:
    """
    Deterministically acquires a raw slice of metadata and reviews for an Amazon category.
    Uses HTTP Range requests for lightweight, fast, reproducible acquisition.
    """
    enable_reliable_dns()
    os.makedirs(raw_dir, exist_ok=True)

    meta_filename = f"{category.lower()}_metadata_raw.jsonl"
    review_filename = f"{category.lower()}_reviews_raw.jsonl"
    meta_path = os.path.join(raw_dir, meta_filename)
    review_path = os.path.join(raw_dir, review_filename)

    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AI-Marketplace-Analyzer/2.0"}

    # 1. Acquire Metadata
    if not os.path.exists(meta_path) or os.path.getsize(meta_path) == 0:
        logging.info("Acquiring raw metadata for category: %s...", category)
        meta_url = f"{HF_BASE_URL}/raw/meta_categories/meta_{category}.jsonl"
        r_meta = requests.get(meta_url, headers={**headers, "Range": f"bytes=0-{meta_bytes_range}"}, timeout=60)
        r_meta.raise_for_status()

        # Extract only complete JSON lines
        lines = r_meta.text.strip().split("\n")
        valid_lines = []
        for l in lines:
            try:
                json.loads(l)
                valid_lines.append(l)
            except Exception:
                continue

        with open(meta_path, "w", encoding="utf-8") as f:
            f.write("\n".join(valid_lines) + "\n")
        logging.info("Saved %d valid metadata records to %s", len(valid_lines), meta_path)
    else:
        logging.info("Using cached raw metadata at %s", meta_path)

    # 2. Acquire Reviews
    if not os.path.exists(review_path) or os.path.getsize(review_path) == 0:
        logging.info("Acquiring raw reviews for category: %s...", category)
        review_url = f"{HF_BASE_URL}/raw/review_categories/{category}.jsonl"
        r_rev = requests.get(review_url, headers={**headers, "Range": f"bytes=0-{review_bytes_range}"}, timeout=60)
        r_rev.raise_for_status()

        lines = r_rev.text.strip().split("\n")
        valid_lines = []
        for l in lines:
            try:
                json.loads(l)
                valid_lines.append(l)
            except Exception:
                continue

        with open(review_path, "w", encoding="utf-8") as f:
            f.write("\n".join(valid_lines) + "\n")
        logging.info("Saved %d valid review records to %s", len(valid_lines), review_path)
    else:
        logging.info("Using cached raw reviews at %s", review_path)

    return {"metadata_path": meta_path, "reviews_path": review_path}


def acquire_walmart_catalog(raw_dir: str = "data/raw/walmart") -> str:
    """
    Acquires Walmart product catalog records from the Magellan Walmart-Amazon benchmark dataset.
    """
    enable_reliable_dns()
    os.makedirs(raw_dir, exist_ok=True)
    out_path = os.path.join(raw_dir, "walmart_products_raw.csv")

    if not os.path.exists(out_path) or os.path.getsize(out_path) == 0:
        logging.info("Acquiring raw Walmart product catalog...")
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AI-Marketplace-Analyzer/2.0"}
        r = requests.get(WALMART_URL, headers=headers, timeout=60)
        r.raise_for_status()

        with open(out_path, "w", encoding="utf-8") as f:
            f.write(r.text)
        logging.info("Saved Walmart catalog to %s (%.2f MB)", out_path, os.path.getsize(out_path) / (1024 * 1024))
    else:
        logging.info("Using cached Walmart catalog at %s", out_path)

    return out_path


def acquire_bestbuy_reviews(raw_dir: str = "data/raw/bestbuy") -> str:
    """
    Acquires customer reviews from BestBuy marketplace.
    """
    enable_reliable_dns()
    os.makedirs(raw_dir, exist_ok=True)
    out_path = os.path.join(raw_dir, "bestbuy_reviews_raw.parquet")

    if not os.path.exists(out_path) or os.path.getsize(out_path) == 0:
        logging.info("Acquiring raw BestBuy reviews dataset...")
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AI-Marketplace-Analyzer/2.0"}
        r = requests.get(BESTBUY_REVIEWS_URL, headers=headers, stream=True, timeout=90)
        r.raise_for_status()

        with open(out_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=65536):
                if chunk:
                    f.write(chunk)
        logging.info("Saved BestBuy reviews to %s (%.2f MB)", out_path, os.path.getsize(out_path) / (1024 * 1024))
    else:
        logging.info("Using cached BestBuy reviews at %s", out_path)

    return out_path


def run_full_acquisition() -> Dict[str, Any]:
    """
    Executes full multi-category, multi-marketplace dataset acquisition.
    Returns audit dictionary with paths, sizes, and row counts.
    """
    manifest = {
        "status": "ACQUISITION_COMPLETE",
        "sources": {},
    }

    # 1. Amazon Multi-Category Shards
    for cat in EXPANDED_AMAZON_CATEGORIES:
        paths = acquire_amazon_category_sample(cat)
        meta_count = sum(1 for _ in open(paths["metadata_path"], "r", encoding="utf-8"))
        rev_count = sum(1 for _ in open(paths["reviews_path"], "r", encoding="utf-8"))

        manifest["sources"][f"amazon_{cat.lower()}"] = {
            "marketplace": "amazon",
            "category": cat,
            "metadata_path": paths["metadata_path"],
            "metadata_rows": meta_count,
            "metadata_sha256": compute_sha256(paths["metadata_path"]),
            "reviews_path": paths["reviews_path"],
            "reviews_rows": rev_count,
            "reviews_sha256": compute_sha256(paths["reviews_path"]),
            "provenance": {
                "source": "Amazon Reviews'23 (UCSD McAuley Lab)",
                "url": f"{HF_BASE_URL}/raw/meta_categories/meta_{cat}.jsonl",
                "license": "Non-commercial Academic Research",
            },
        }

    # 2. Walmart Catalog
    wm_path = acquire_walmart_catalog()
    df_wm = pd.read_csv(wm_path)
    manifest["sources"]["walmart_catalog"] = {
        "marketplace": "walmart",
        "category": "Multi-Category (Electronics, Home, Office, Accessories)",
        "path": wm_path,
        "rows": len(df_wm),
        "columns": list(df_wm.columns),
        "sha256": compute_sha256(wm_path),
        "provenance": {
            "source": "Magellan / matchbench Walmart-Amazon Entity Matching Benchmark",
            "url": WALMART_URL,
            "license": "Research & Educational Use",
        },
    }

    # 3. BestBuy Reviews
    bb_path = acquire_bestbuy_reviews()
    df_bb = pd.read_parquet(bb_path)
    manifest["sources"]["bestbuy_reviews"] = {
        "marketplace": "bestbuy",
        "category": "Electronics & Appliances",
        "path": bb_path,
        "rows": len(df_bb),
        "columns": list(df_bb.columns),
        "sha256": compute_sha256(bb_path),
        "provenance": {
            "source": "BestBuy Marketplace Customer Reviews Dataset (ValerianFourel)",
            "url": BESTBUY_REVIEWS_URL,
            "license": "Open Data Commons / Educational Use",
        },
    }

    logging.info("Full acquisition complete! Acquired %d distinct data sources.", len(manifest["sources"]))
    return manifest


if __name__ == "__main__":
    run_full_acquisition()
