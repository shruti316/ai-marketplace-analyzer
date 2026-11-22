"""
build_image_manifest.py
-----------------------
Automated image extraction, validation, hashing, and OCR manifest pipeline
for the AI Marketplace Analyzer.

Downloads a controlled sample of product images, validates headers and payload,
computes cryptographic (SHA-256) and perceptual (dHash) hashes, and executes
native OCR to extract on-package text.

Outputs:
- data/interim/image_manifest.parquet
- data/interim/image_manifest.csv
- Cached images stored in data/raw/images/cache/
"""

import os
import time
import logging
import hashlib
import urllib.request
import urllib.error
import numpy as np
import pandas as pd
from PIL import Image

try:
    import winocr
    HAS_WINOCR = True
except ImportError:
    HAS_WINOCR = False

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


def compute_dhash(image: Image.Image, hash_size: int = 8) -> str:
    """Compute difference hash (dHash) for visual duplicate/similarity matching."""
    resized = image.convert("L").resize((hash_size + 1, hash_size), Image.Resampling.LANCZOS)
    pixels = np.array(resized)
    diff = pixels[:, 1:] > pixels[:, :-1]
    # Convert bool array to hex string
    hex_chars = []
    flat = diff.flatten()
    for i in range(0, len(flat), 4):
        chunk = flat[i:i+4]
        val = sum(bit * (2 ** (3 - idx)) for idx, bit in enumerate(chunk))
        hex_chars.append(f"{val:x}")
    return "".join(hex_chars)


def build_image_manifest(
    images_parquet_path: str = "data/interim/dense_product_images.parquet",
    output_dir: str = "data/interim",
    cache_dir: str = "data/raw/images/cache",
    sample_size: int = 50,
    random_state: int = 42,
) -> pd.DataFrame:
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(cache_dir, exist_ok=True)

    logging.info("==================================================")
    logging.info("Starting Product Image & OCR Manifest Pipeline")
    logging.info("==================================================")

    if not os.path.exists(images_parquet_path):
        raise FileNotFoundError(f"Source image table not found: {images_parquet_path}")

    df_images = pd.read_parquet(images_parquet_path)
    logging.info("Loaded %d total image records across %d products.", len(df_images), df_images["parent_asin"].nunique())

    # Filter to primary images first to ensure 1 image per distinct product
    primary_images = df_images[df_images["image_type"] == "primary"].copy()
    if len(primary_images) < sample_size:
        selected = df_images.sample(n=min(sample_size, len(df_images)), random_state=random_state).copy()
    else:
        selected = primary_images.sample(n=sample_size, random_state=random_state).copy()

    logging.info("Selected %d image URLs across %d distinct products for validation batch.", len(selected), selected["parent_asin"].nunique())

    manifest_records = []
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

    success_downloads = 0
    ocr_detected_count = 0

    for idx, (_, row) in enumerate(selected.iterrows()):
        p_asin = row["parent_asin"]
        img_id = row["image_id"]
        img_url = row["image_url"]
        img_type = row.get("image_type", "primary")

        record = {
            "image_id": img_id,
            "parent_asin": p_asin,
            "image_type": img_type,
            "image_url": img_url,
            "source": "Amazon_CloudFront_CDN",
            "http_status": None,
            "download_success": False,
            "file_size_bytes": 0,
            "image_format": None,
            "width": 0,
            "height": 0,
            "aspect_ratio": 0.0,
            "sha256_hash": None,
            "dhash": None,
            "ocr_status": "SKIPPED",
            "ocr_text": "",
            "ocr_word_count": 0,
            "local_path": None,
            "error_message": None,
        }

        # Local cache file
        ext = ".jpg"
        local_filename = f"{img_id}{ext}"
        local_file_path = os.path.join(cache_dir, local_filename)

        start_t = time.time()
        try:
            req = urllib.request.Request(img_url, headers=headers)
            with urllib.request.urlopen(req, timeout=12) as response:
                status_code = response.status
                record["http_status"] = status_code
                if status_code == 200:
                    data = response.read()
                    record["file_size_bytes"] = len(data)
                    record["download_success"] = True
                    success_downloads += 1

                    # Save to local cache
                    with open(local_file_path, "wb") as f:
                        f.write(data)
                    record["local_path"] = local_file_path

                    # Cryptographic Hash
                    record["sha256_hash"] = hashlib.sha256(data).hexdigest()

                    # PIL validation & perceptual hashing
                    with Image.open(local_file_path) as pil_img:
                        record["image_format"] = pil_img.format
                        w, h = pil_img.size
                        record["width"] = w
                        record["height"] = h
                        record["aspect_ratio"] = round(w / h, 3) if h > 0 else 0.0
                        record["dhash"] = compute_dhash(pil_img)

                        # Run OCR if available
                        if HAS_WINOCR:
                            try:
                                ocr_res = winocr.recognize_pil_sync(pil_img, lang="en")
                                text = ocr_res.get("text", "").strip() if isinstance(ocr_res, dict) else ""
                                record["ocr_text"] = text
                                words = [w for w in text.split() if w]
                                record["ocr_word_count"] = len(words)
                                if len(words) > 0:
                                    record["ocr_status"] = "SUCCESS_TEXT_DETECTED"
                                    ocr_detected_count += 1
                                else:
                                    record["ocr_status"] = "SUCCESS_NO_TEXT"
                            except Exception as ocr_err:
                                record["ocr_status"] = "OCR_ERROR"
                                record["error_message"] = f"OCR failed: {str(ocr_err)[:100]}"
                else:
                    record["error_message"] = f"HTTP {status_code}"

        except urllib.error.HTTPError as he:
            record["http_status"] = he.code
            record["error_message"] = f"HTTPError {he.code}"
        except Exception as e:
            record["error_message"] = f"Download error: {str(e)[:100]}"

        manifest_records.append(record)
        if (idx + 1) % 10 == 0 or (idx + 1) == len(selected):
            logging.info("Processed %d/%d images (%d downloaded, %d with text detected)...", idx + 1, len(selected), success_downloads, ocr_detected_count)

    df_manifest = pd.DataFrame(manifest_records)

    out_parquet = os.path.join(output_dir, "image_manifest.parquet")
    out_csv = os.path.join(output_dir, "image_manifest.csv")

    df_manifest.to_parquet(out_parquet, index=False)
    df_manifest.to_csv(out_csv, index=False)

    logging.info("Image manifest saved to %s (%d rows)", out_parquet, len(df_manifest))
    logging.info("Image manifest CSV saved to %s", out_csv)
    logging.info("Batch summary: %d/%d downloaded (%.1f%% success rate), %d with OCR text detected.", success_downloads, len(selected), success_downloads / len(selected) * 100, ocr_detected_count)

    return df_manifest


if __name__ == "__main__":
    build_image_manifest()
