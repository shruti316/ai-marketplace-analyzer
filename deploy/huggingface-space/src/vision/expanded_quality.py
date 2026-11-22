"""
src/vision/expanded_quality.py
------------------------------
Comprehensive Multimodal Image Quality Assessment Module.

Features:
- Image readability, dimensions (width, height, aspect ratio), format, and file size.
- Cryptographic SHA-256 and perceptual dHash computation.
- Laplacian sharpness variance, luminance, and contrast extraction.
- Vectorized Hamming distance popcount using NumPy SIMD for exact near-duplicate discovery.
- Native WinRT OCR text extraction with separate failure tracking.
- Listing-to-packaging consistency scoring only where OCR evidence exists.
- Explicit non-conflated quality, integrity, duplicate, and relevance statuses:
  - VALIDATED
  - LOW_QUALITY
  - CORRUPTED
  - IRRELEVANT
  - DUPLICATE
  - NEAR_DUPLICATE
  - DOWNLOAD_FAILED
  - PENDING
- Defensible relevance validation: only transparent tracking spacers (1x1 pixels / explicit
  transparent-pixel URLs) are marked IRRELEVANT.
- Full resumability and checkpointing via data/interim/quality_checkpoint.parquet.
- Preserves original baseline artifacts without modifying source files.
"""

import os
import sys
import time
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Set
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.abspath("."))

import numpy as np
import pandas as pd
from PIL import Image
from scipy import ndimage

from src.vision.image_analysis import (
    compute_sha256,
    compute_dhash,
    extract_ocr_text,
    calculate_packaging_consistency,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


def compute_sharpness(img_gray: np.ndarray) -> float:
    """Calculates image sharpness using the variance of the Laplacian filter."""
    if img_gray.size == 0:
        return 0.0
    lap = ndimage.laplace(img_gray.astype(np.float64))
    return float(lap.var())


def hamming_distance_dhash(hash1: str, hash2: str) -> int:
    """Calculates Hamming distance between two 16-character hexadecimal dHashes."""
    try:
        val1 = int(hash1, 16)
        val2 = int(hash2, 16)
        return bin(val1 ^ val2).count("1")
    except Exception:
        return 64


class ImageQualityValidator:
    """
    Performs comprehensive quality assessment, hashing, OCR, and usability scoring.
    """

    def __init__(
        self,
        canonical_images_path: str = "data/processed/canonical_images.parquet",
        canonical_products_path: str = "data/processed/canonical_products.parquet",
        download_checkpoint_path: str = "data/interim/download_checkpoint.json",
        quality_checkpoint_path: str = "data/interim/quality_checkpoint.parquet",
        output_manifest_path: str = "data/interim/expanded_image_manifest.parquet",
        output_quality_report_path: str = "data/processed/image_quality_report.parquet",
        ocr_workers: int = 12,
        checkpoint_interval: int = 1000,
    ):
        self.canonical_images_path = Path(canonical_images_path)
        self.canonical_products_path = Path(canonical_products_path)
        self.download_checkpoint_path = Path(download_checkpoint_path)
        self.quality_checkpoint_path = Path(quality_checkpoint_path)
        self.output_manifest_path = Path(output_manifest_path)
        self.output_quality_report_path = Path(output_quality_report_path)
        self.ocr_workers = ocr_workers
        self.checkpoint_interval = checkpoint_interval

    def run(self) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Executes full quality validation and produces expanded manifest and quality report.
        """
        t0 = time.time()
        logging.info("==================================================")
        logging.info("Starting Multimodal Image Quality Assessment")
        logging.info("==================================================")

        # 1. Load canonical images
        logging.info("Loading canonical images from %s", self.canonical_images_path)
        df_images = pd.read_parquet(self.canonical_images_path)

        # 2. Load canonical products for title & brand mapping
        logging.info("Loading canonical products from %s", self.canonical_products_path)
        df_products = pd.read_parquet(self.canonical_products_path)
        title_brand_map = dict(
            zip(
                df_products["canonical_product_id"],
                zip(df_products["title"].fillna(""), df_products["brand"].fillna("")),
            )
        )

        # 3. Load download state from checkpoint
        checkpoint_results = {}
        if self.download_checkpoint_path.exists():
            try:
                import json
                with open(self.download_checkpoint_path, "r", encoding="utf-8") as f:
                    checkpoint_results = json.load(f).get("results", {})
                logging.info("Loaded %d download states from download checkpoint.", len(checkpoint_results))
            except Exception as e:
                logging.warning("Could not read download checkpoint: %s", e)

        # 4. Check if previous quality checkpoint exists for resumption
        cached_records: Dict[str, Dict[str, Any]] = {}
        if self.quality_checkpoint_path.exists():
            try:
                df_ckpt = pd.read_parquet(self.quality_checkpoint_path)
                cached_records = {str(r["image_id"]): r.to_dict() for _, r in df_ckpt.iterrows()}
                logging.info("Found %d records in quality checkpoint.", len(cached_records))
            except Exception as e:
                logging.warning("Could not read quality checkpoint: %s", e)

        records: List[Dict[str, Any]] = []
        seen_sha256: Dict[str, str] = {}  # sha -> lead_image_id
        seen_dhash_uint64: List[np.uint64] = []
        seen_dhash_ids: List[str] = []

        # Tracking OCR candidates
        ocr_candidates = []  # list of (record_index, local_path, title, brand)
        sha_to_ocr: Dict[str, Tuple[Optional[str], Optional[float], str, Optional[str]]] = {}

        logging.info("Processing %d canonical image records...", len(df_images))

        for idx, row in df_images.iterrows():
            img_id = str(row["image_id"])
            cid = str(row["canonical_product_id"])
            mkt = str(row["marketplace"])
            url = str(row["image_url"])
            img_type = str(row.get("image_type", "primary"))
            prov = str(row.get("source_provenance", ""))

            title, brand = title_brand_map.get(cid, ("", ""))

            # Check if already processed in quality checkpoint
            if img_id in cached_records:
                cached = cached_records[img_id]
                records.append(cached)
                sha = cached.get("content_hash_sha256")
                dh = cached.get("perceptual_hash_dhash")
                if sha:
                    seen_sha256[sha] = cached.get("duplicate_of_image_id") or img_id
                    if cached.get("ocr_text"):
                        sha_to_ocr[sha] = (
                            cached.get("ocr_text"),
                            cached.get("packaging_consistency_score"),
                            cached.get("ocr_status", "SUCCESS"),
                            cached.get("ocr_error"),
                        )
                if dh and len(seen_dhash_uint64) < 15000:
                    try:
                        seen_dhash_uint64.append(np.uint64(int(dh, 16)))
                        seen_dhash_ids.append(img_id)
                    except Exception:
                        pass
                continue

            # Determine download status from checkpoint or source
            ckpt = checkpoint_results.get(img_id)
            if ckpt:
                dl_status = ckpt.get("download_status", "DOWNLOAD_FAILED")
                loc_path = ckpt.get("local_path")
                http_status = ckpt.get("http_status")
                err_msg = ckpt.get("error_message")
            else:
                dl_status = row.get("download_status", "PENDING")
                loc_path = row.get("local_path")
                http_status = 200 if dl_status == "DOWNLOADED" else None
                err_msg = None

            if loc_path:
                loc_path = str(loc_path).replace("\\", "/")

            # Defaults
            file_size = None
            width = None
            height = None
            aspect_ratio = None
            img_format = None
            is_readable = False
            sha256_hash = None
            dhash_val = None
            sharpness = None
            mean_lum = None
            contrast = None

            # Non-conflated status indicators
            quality_status = "PENDING" if dl_status == "PENDING" else "DOWNLOAD_FAILED"
            relevance_status = "PRODUCT_IMAGE"
            relevance_notes = None
            is_usable = False
            is_exact_dup = False
            is_near_dup = False
            dup_of_id = None
            near_dup_of_id = None
            near_dup_dist = None

            # OCR attributes
            ocr_text = row.get("ocr_text") if pd.notna(row.get("ocr_text")) else None
            packaging_score = row.get("packaging_consistency_score") if pd.notna(row.get("packaging_consistency_score")) else None
            ocr_status = "SUCCESS" if ocr_text else ("SKIPPED_NOT_DOWNLOADED" if dl_status != "DOWNLOADED" else "PENDING")
            ocr_error = None

            if dl_status == "DOWNLOADED" and loc_path and Path(loc_path).exists():
                file_size = Path(loc_path).stat().st_size
                if file_size == 0:
                    quality_status = "CORRUPTED"
                    err_msg = "Zero-byte file payload"
                    is_readable = False
                else:
                    try:
                        with Image.open(loc_path) as img:
                            width, height = img.size
                            img_format = img.format
                            aspect_ratio = round(width / max(1, height), 3)

                            # Visual perceptual dHash
                            dhash_val = compute_dhash(img)

                            # Laplacian sharpness, luminance, contrast
                            gray = np.array(img.convert("L"))
                            sharpness = round(compute_sharpness(gray), 1)
                            mean_lum = round(float(gray.mean()), 1)
                            contrast = round(float(gray.std()), 1)
                            is_readable = True

                        sha256_hash = compute_sha256(loc_path)

                        # 1. Defensible Relevance Check
                        if "transparent-pixel" in url.lower() or (width <= 1 and height <= 1):
                            quality_status = "IRRELEVANT"
                            relevance_status = "IRRELEVANT_PLACEHOLDER"
                            relevance_notes = "Transparent 1x1 vendor tracking spacer"
                            is_usable = False
                        # 2. Quality Check: Dimensions and extreme blankness
                        elif width < 64 or height < 64:
                            quality_status = "LOW_QUALITY"
                            relevance_notes = f"Resolution below 64px ({width}x{height})"
                            is_usable = False
                        elif contrast < 3.0 and sharpness < 5.0:
                            quality_status = "LOW_QUALITY"
                            relevance_notes = "Extreme blank/low-contrast image"
                            is_usable = False
                        # 3. Exact Duplicate Check
                        elif sha256_hash in seen_sha256:
                            quality_status = "DUPLICATE"
                            is_usable = True
                            is_exact_dup = True
                            dup_of_id = seen_sha256[sha256_hash]
                        # 4. Near-Duplicate Check via vectorized Hamming popcount
                        else:
                            curr_uint64 = np.uint64(int(dhash_val, 16))
                            matched_near = False

                            if seen_dhash_uint64:
                                dhash_arr = np.array(seen_dhash_uint64, dtype=np.uint64)
                                bit_diffs = np.bitwise_count(dhash_arr ^ curr_uint64)
                                min_idx = int(np.argmin(bit_diffs))
                                min_dist = int(bit_diffs[min_idx])

                                if min_dist <= 4:
                                    quality_status = "NEAR_DUPLICATE"
                                    is_usable = True
                                    is_near_dup = True
                                    near_dup_of_id = seen_dhash_ids[min_idx]
                                    near_dup_dist = min_dist
                                    matched_near = True

                            if not matched_near:
                                quality_status = "VALIDATED"
                                is_usable = True

                            # Register lead hash
                            seen_sha256[sha256_hash] = img_id
                            seen_dhash_uint64.append(curr_uint64)
                            seen_dhash_ids.append(img_id)

                    except Exception as dec_err:
                        quality_status = "CORRUPTED"
                        err_msg = f"PIL decoding failure: {dec_err}"
                        is_readable = False
                        is_usable = False

            elif dl_status == "CORRUPTED":
                quality_status = "CORRUPTED"
                is_usable = False

            # Check if OCR can be inherited from identical SHA-256
            if sha256_hash and sha256_hash in sha_to_ocr:
                inh_text, inh_score, inh_status, inh_err = sha_to_ocr[sha256_hash]
                ocr_text = inh_text
                packaging_score = inh_score
                ocr_status = inh_status
                ocr_error = inh_err

            record = {
                "image_id": img_id,
                "canonical_product_id": cid,
                "marketplace": mkt,
                "image_url": url,
                "local_path": loc_path if dl_status == "DOWNLOADED" else None,
                "image_type": img_type,
                "download_status": dl_status,
                "http_status": http_status,
                "file_size_bytes": file_size,
                "width": width,
                "height": height,
                "aspect_ratio": aspect_ratio,
                "image_format": img_format,
                "is_readable": is_readable,
                "content_hash_sha256": sha256_hash,
                "perceptual_hash_dhash": dhash_val,
                "sharpness_score": sharpness,
                "mean_luminance": mean_lum,
                "contrast_std": contrast,
                "quality_status": quality_status,
                "is_usable": is_usable,
                "is_exact_duplicate": is_exact_dup,
                "is_near_duplicate": is_near_dup,
                "duplicate_of_image_id": dup_of_id,
                "near_duplicate_of_image_id": near_dup_of_id,
                "near_duplicate_distance": near_dup_dist,
                "relevance_status": relevance_status,
                "relevance_notes": relevance_notes,
                "ocr_status": ocr_status,
                "ocr_text": ocr_text,
                "has_readable_text": bool(ocr_text and len(str(ocr_text).strip()) > 0),
                "packaging_consistency_score": packaging_score,
                "ocr_error": ocr_error,
                "error_message": err_msg,
                "source_provenance": prov,
            }
            records.append(record)

            # Check if eligible for new OCR extraction
            if (
                is_usable
                and ocr_text is None
                and ocr_status == "PENDING"
                and width
                and width >= 100
                and height
                and height >= 100
                and loc_path
                and not is_exact_dup  # only primary instances
            ):
                ocr_candidates.append((len(records) - 1, loc_path, title, brand, sha256_hash))

            if len(records) % self.checkpoint_interval == 0:
                logging.info("Evaluated %d / %d records...", len(records), len(df_images))
                self._save_checkpoint(records)

        # Final pass: Concurrent WinRT OCR on candidates
        if ocr_candidates:
            logging.info("Executing WinRT OCR across %d eligible unique usable images (workers=%d)...",
                         len(ocr_candidates), self.ocr_workers)

            def _ocr_worker(item):
                rec_idx, path, t, b, sha = item
                try:
                    text = extract_ocr_text(path)
                    if text and text.strip():
                        # Calculate packaging consistency only where OCR text exists
                        score = calculate_packaging_consistency(text, t, b)
                        return rec_idx, text, score, "SUCCESS", None, sha
                    else:
                        return rec_idx, None, None, "NO_TEXT_DETECTED", None, sha
                except Exception as exc:
                    return rec_idx, None, None, "EXTRACTION_FAILED", str(exc), sha

            with ThreadPoolExecutor(max_workers=self.ocr_workers) as executor:
                for rec_idx, text, score, status, err, sha in executor.map(_ocr_worker, ocr_candidates):
                    records[rec_idx]["ocr_text"] = text
                    records[rec_idx]["packaging_consistency_score"] = score
                    records[rec_idx]["ocr_status"] = status
                    records[rec_idx]["ocr_error"] = err
                    records[rec_idx]["has_readable_text"] = bool(text and len(text.strip()) > 0)
                    if sha:
                        sha_to_ocr[sha] = (text, score, status, err)

            logging.info("WinRT OCR complete. Propagating OCR results to exact duplicate instances...")
            # Propagate to any duplicate records sharing the same sha
            for r in records:
                sha = r.get("content_hash_sha256")
                if sha and sha in sha_to_ocr and r.get("ocr_text") is None:
                    inh_text, inh_score, inh_status, inh_err = sha_to_ocr[sha]
                    r["ocr_text"] = inh_text
                    r["packaging_consistency_score"] = inh_score
                    r["ocr_status"] = inh_status
                    r["ocr_error"] = inh_err
                    r["has_readable_text"] = bool(inh_text and len(str(inh_text).strip()) > 0)

        df_expanded_manifest = pd.DataFrame(records)

        # Quality Report Table
        quality_cols = [
            "image_id",
            "canonical_product_id",
            "marketplace",
            "download_status",
            "quality_status",
            "is_usable",
            "is_readable",
            "file_size_bytes",
            "width",
            "height",
            "aspect_ratio",
            "image_format",
            "sharpness_score",
            "mean_luminance",
            "contrast_std",
            "is_exact_duplicate",
            "is_near_duplicate",
            "duplicate_of_image_id",
            "near_duplicate_of_image_id",
            "near_duplicate_distance",
            "relevance_status",
            "relevance_notes",
            "ocr_status",
            "has_readable_text",
            "packaging_consistency_score",
            "ocr_error",
            "error_message",
        ]
        df_quality_report = df_expanded_manifest[quality_cols].copy()

        # Save artifacts safely
        self.output_manifest_path.parent.mkdir(parents=True, exist_ok=True)
        self.output_quality_report_path.parent.mkdir(parents=True, exist_ok=True)

        df_expanded_manifest.to_parquet(self.output_manifest_path, index=False)
        df_quality_report.to_parquet(self.output_quality_report_path, index=False)

        # Clean up temporary quality checkpoint if completed
        if self.quality_checkpoint_path.exists():
            try:
                self.quality_checkpoint_path.unlink()
            except Exception:
                pass

        elapsed = time.time() - t0
        logging.info("Quality assessment completed in %.2f seconds.", elapsed)
        logging.info("Saved expanded manifest to %s (%d rows)", self.output_manifest_path, len(df_expanded_manifest))
        logging.info("Saved quality report to %s (%d rows)", self.output_quality_report_path, len(df_quality_report))

        return df_expanded_manifest, df_quality_report

    def _save_checkpoint(self, records: List[Dict[str, Any]]) -> None:
        """Saves intermediate quality state."""
        try:
            df_temp = pd.DataFrame(records)
            tmp_path = self.quality_checkpoint_path.with_suffix(".tmp")
            df_temp.to_parquet(tmp_path, index=False)
            for _ in range(5):
                try:
                    tmp_path.replace(self.quality_checkpoint_path)
                    break
                except PermissionError:
                    time.sleep(0.2)
        except Exception as e:
            logging.warning("Failed saving quality checkpoint: %s", e)


if __name__ == "__main__":
    validator = ImageQualityValidator()
    df_manifest, df_quality = validator.run()
    print("\nQuality Status Counts:\n", df_quality["quality_status"].value_counts())
    print("\nUsable Flag Distribution:\n", df_quality["is_usable"].value_counts())
    print("\nRelevance Status:\n", df_quality["relevance_status"].value_counts())
    print("\nOCR Status Counts:\n", df_quality["ocr_status"].value_counts())
