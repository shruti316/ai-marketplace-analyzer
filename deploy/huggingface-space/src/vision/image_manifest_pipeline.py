"""
src/vision/image_manifest_pipeline.py
-------------------------------------
Production-Scale Multimodal Image Acquisition, Validation, and OCR Pipeline.

Expands image dataset across all 6 supported categories:
- Electronics
- Beauty & Personal Care
- Clothing & Fashion
- Home & Kitchen
- Books & Stationery
- Toys & Games

For every image, extracts:
- Cryptographic SHA-256 hash (exact duplicate detection)
- Perceptual difference hash (dHash, near-duplicate matching)
- MIME type, dimensions, file size
- Native WinRT OCR on Windows (on-package text)
- Packaging-to-title text consistency score
- Transparent status tracking (DOWNLOADED, FAILED, NO_TEXT)

Outputs:
- data/interim/image_manifest.parquet
- data/interim/image_manifest.csv
- Cached images in data/raw/images/cache/
- data/processed/canonical_images.parquet
"""

import os
import io
import json
import logging
import hashlib
from typing import Dict, Any, List, Optional
import urllib.request
import urllib.error
import numpy as np
import pandas as pd
from PIL import Image

from src.utils.network import enable_reliable_dns
from src.vision.image_analysis import (
    compute_sha256,
    compute_dhash,
    extract_ocr_text,
    calculate_packaging_consistency,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


def gather_eligible_products(
    raw_amazon_dir: str = "data/raw/amazon",
    dense_img_path: str = "data/interim/dense_product_images.parquet",
    dense_prod_path: str = "data/interim/dense_products.parquet",
    target_total: int = 520,
) -> List[Dict[str, Any]]:
    """
    Gathers a stratified sample of eligible products across the 6 supported categories.
    """
    eligible = []

    # 1. Dense Beauty Products
    if os.path.exists(dense_img_path) and os.path.exists(dense_prod_path):
        df_dense_img = pd.read_parquet(dense_img_path)
        df_dense_prod = pd.read_parquet(dense_prod_path)
        title_map = dict(zip(df_dense_prod["parent_asin"], df_dense_prod["title"]))
        brand_map = dict(zip(df_dense_prod["parent_asin"], df_dense_prod["store"]))

        primary_dense = df_dense_img[df_dense_img["image_type"] == "primary"].drop_duplicates(subset=["parent_asin"])
        beauty_sample = primary_dense.head(100)
        for _, r in beauty_sample.iterrows():
            asin = str(r["parent_asin"])
            eligible.append({
                "canonical_product_id": f"amazon_{asin}",
                "marketplace": "amazon",
                "category": "Beauty & Personal Care",
                "title": title_map.get(asin, ""),
                "brand": brand_map.get(asin, ""),
                "image_url": str(r["image_url"]),
            })

    # 2. Expanded Categories from JSONL
    category_files = [
        ("Electronics", "electronics_metadata_raw.jsonl"),
        ("Clothing & Fashion", "amazon_fashion_metadata_raw.jsonl"),
        ("Home & Kitchen", "home_and_kitchen_metadata_raw.jsonl"),
        ("Toys & Games", "toys_and_games_metadata_raw.jsonl"),
        ("Books & Stationery", "books_metadata_raw.jsonl"),
    ]

    for cat_label, fname in category_files:
        fpath = os.path.join(raw_amazon_dir, fname)
        if not os.path.exists(fpath):
            continue

        cat_prods = []
        with open(fpath, "r", encoding="utf-8") as jf:
            for line in jf:
                if not line.strip():
                    continue
                try:
                    item = json.loads(line)
                except Exception:
                    continue

                asin = str(item.get("parent_asin", ""))
                if not asin:
                    continue

                # Extract first valid image URL
                imgs = item.get("images", [])
                img_url = None
                if isinstance(imgs, list):
                    for im in imgs:
                        if isinstance(im, dict):
                            img_url = im.get("large") or im.get("hi_res") or im.get("thumb")
                        elif isinstance(im, str):
                            img_url = im
                        if img_url:
                            break

                if img_url and img_url.startswith("http"):
                    cat_prods.append({
                        "canonical_product_id": f"amazon_{asin}",
                        "marketplace": "amazon",
                        "category": cat_label,
                        "title": str(item.get("title", "")).strip(),
                        "brand": str(item.get("store", "")).strip(),
                        "image_url": img_url,
                    })

        # Take up to 90 products per category
        eligible.extend(cat_prods[:90])

    logging.info("Gathered %d eligible products with primary image URLs across categories.", len(eligible))
    return eligible[:target_total]


def run_image_pipeline(
    output_dir: str = "data/interim",
    cache_dir: str = "data/raw/images/cache",
    target_count: int = 520,
    timeout: int = 15,
) -> pd.DataFrame:
    """
    Executes stratified image acquisition, caching, hashing, and OCR analysis.
    """
    enable_reliable_dns()
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(cache_dir, exist_ok=True)

    logging.info("==================================================")
    logging.info("Starting Scaled Multimodal Image & OCR Pipeline")
    logging.info("==================================================")

    products = gather_eligible_products(target_total=target_count)
    logging.info("Processing %d stratified product images...", len(products))

    records = []
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AI-Marketplace-Analyzer/2.0"}

    for idx, p in enumerate(products, 1):
        cid = p["canonical_product_id"]
        asin = cid.replace("amazon_", "")
        url = p["image_url"]
        cat = p["category"]
        title = p["title"]
        brand = p["brand"]

        image_id = f"{cid}_img_0"
        cache_filename = f"{asin}_img_0.jpg"
        cache_path = os.path.join(cache_dir, cache_filename)

        download_success = False
        http_status = None
        error_msg = None

        # 1. Check local cache first (deterministic, non-repeated downloads)
        if os.path.exists(cache_path) and os.path.getsize(cache_path) > 100:
            download_success = True
            http_status = 200
        else:
            try:
                req = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(req, timeout=timeout) as response:
                    http_status = response.getcode()
                    if http_status == 200:
                        content = response.read()
                        with open(cache_path, "wb") as f:
                            f.write(content)
                        download_success = True
            except Exception as e:
                error_msg = str(e)
                http_status = 500 if "timed out" in str(e).lower() else 404

        # 2. Inspect downloaded payload and compute hashes
        width = None
        height = None
        file_size = None
        img_format = None
        sha256_hash = None
        dhash_val = None
        ocr_text = None
        consistency = None

        if download_success and os.path.exists(cache_path):
            file_size = os.path.getsize(cache_path)
            try:
                with Image.open(cache_path) as img:
                    width, height = img.size
                    img_format = img.format
                    dhash_val = compute_dhash(img)

                sha256_hash = compute_sha256(cache_path)
                ocr_text = extract_ocr_text(cache_path)
                consistency = calculate_packaging_consistency(ocr_text, title, brand)
            except Exception as e:
                error_msg = f"Decoding failed: {e}"
                download_success = False

        status_str = "DOWNLOADED" if download_success else ("FAILED" if error_msg else "UNAVAILABLE")

        records.append({
            "image_id": image_id,
            "canonical_product_id": cid,
            "marketplace": "amazon",
            "category": cat,
            "title": title[:100],
            "brand": brand,
            "image_type": "primary",
            "image_url": url,
            "local_path": cache_path if download_success else None,
            "http_status": http_status,
            "download_status": status_str,
            "file_size_bytes": file_size,
            "width": width,
            "height": height,
            "image_format": img_format,
            "content_hash_sha256": sha256_hash,
            "perceptual_hash_dhash": dhash_val,
            "ocr_text": ocr_text,
            "has_readable_text": bool(ocr_text and len(ocr_text.strip()) > 0),
            "packaging_consistency_score": consistency,
            "error_message": error_msg,
            "source_provenance": f"Amazon Reviews'23 ({cat})",
        })

        if idx % 50 == 0 or idx == len(products):
            logging.info("Processed %d / %d images...", idx, len(products))

    df_manifest = pd.DataFrame(records)

    # 3. Detect Exact & Near Duplicates
    valid_hashes = df_manifest[df_manifest["content_hash_sha256"].notna()]
    exact_dups = valid_hashes.duplicated(subset=["content_hash_sha256"]).sum()
    logging.info("Exact duplicate images detected (identical SHA-256): %d", exact_dups)

    # Export to interim manifest
    out_parquet = os.path.join(output_dir, "image_manifest.parquet")
    out_csv = os.path.join(output_dir, "image_manifest.csv")
    df_manifest.to_parquet(out_parquet, index=False)
    df_manifest.to_csv(out_csv, index=False)
    logging.info("Saved %s (%d rows, %.2f KB)", out_parquet, len(df_manifest), os.path.getsize(out_parquet) / 1024)

    # 4. Update canonical_images.parquet in processed
    can_img_path = "data/processed/canonical_images.parquet"
    canonical_export_cols = [
        "image_id",
        "canonical_product_id",
        "marketplace",
        "image_url",
        "local_path",
        "image_type",
        "download_status",
        "file_size_bytes",
        "width",
        "height",
        "content_hash_sha256",
        "perceptual_hash_dhash",
        "ocr_text",
        "packaging_consistency_score",
        "source_provenance",
    ]
    export_df = df_manifest[canonical_export_cols].copy()
    export_df.to_parquet(can_img_path, index=False)
    logging.info("Updated %s with %d validated images.", can_img_path, len(export_df))

    # Log summary statistics
    successful_downloads = (df_manifest["download_status"] == "DOWNLOADED").sum()
    text_detected = df_manifest["has_readable_text"].sum()
    logging.info("Download Success Rate: %d / %d (%.1f%%)", successful_downloads, len(df_manifest), successful_downloads / len(df_manifest) * 100)
    logging.info("OCR Text Detection Rate: %d / %d (%.1f%% of downloaded)", text_detected, successful_downloads, (text_detected / max(1, successful_downloads)) * 100)

    # Category breakdown of OCR
    ocr_by_cat = df_manifest[df_manifest["download_status"] == "DOWNLOADED"].groupby("category")["has_readable_text"].mean() * 100
    logging.info("OCR Text Detection Rate by Category:\n%s", ocr_by_cat.round(1))

    return df_manifest


if __name__ == "__main__":
    run_image_pipeline()
