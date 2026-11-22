"""
src/vision/expanded_downloader.py
---------------------------------
Robust, resumable, concurrent image downloader for expanding the marketplace dataset.

Features:
- Preserves existing 520 downloaded images without re-downloading.
- Pre-groups pending records by unique URL to guarantee zero redundant network downloads.
- ThreadPoolExecutor with configurable concurrency (16 workers default) and timeouts.
- Exponential backoff retry logic for transient network errors.
- Atomic file writes and PIL-level format/readability integrity validation.
- JSON checkpointing for interruption-resilient resumption.
- Dedicated failed URL and error logging to CSV.
- Never mutates canonical_images.parquet.
"""

import os
import io
import time
import json
import logging
import shutil
import threading
from pathlib import Path
from typing import Dict, Any, List, Optional, Set
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import pandas as pd
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class ResumableImageDownloader:
    """
    Manages robust, resumable downloading of marketplace product images.
    """

    def __init__(
        self,
        source_manifest_path: str = "data/processed/canonical_images.parquet",
        cache_dir: str = "data/raw/images/cache",
        checkpoint_path: str = "data/interim/download_checkpoint.json",
        failures_path: str = "data/interim/image_download_failures.csv",
        max_workers: int = 16,
        timeout: tuple = (5.0, 15.0),
        max_retries: int = 3,
        user_agent: str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AI-Marketplace-Analyzer/2.0",
    ):
        self.source_manifest_path = Path(source_manifest_path)
        self.cache_dir = Path(cache_dir)
        self.checkpoint_path = Path(checkpoint_path)
        self.failures_path = Path(failures_path)
        self.max_workers = max_workers
        self.timeout = timeout
        self.max_retries = max_retries
        self.user_agent = user_agent

        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.checkpoint_path.parent.mkdir(parents=True, exist_ok=True)
        self.failures_path.parent.mkdir(parents=True, exist_ok=True)

        self._lock = threading.Lock()
        self.results: Dict[str, Dict[str, Any]] = {}
        self.failures: List[Dict[str, Any]] = []
        self.url_to_path: Dict[str, str] = {}

    def _create_session(self) -> requests.Session:
        """Create a requests session with connection pooling and retry adapter."""
        session = requests.Session()
        retries = Retry(
            total=self.max_retries,
            backoff_factor=0.5,
            status_forcelist=[429, 500, 502, 503, 504],
            raise_on_status=False,
        )
        adapter = HTTPAdapter(max_retries=retries, pool_connections=self.max_workers, pool_maxsize=self.max_workers * 2)
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        session.headers.update({"User-Agent": self.user_agent})
        return session

    def load_initial_state(self, df_images: pd.DataFrame) -> None:
        """
        Loads existing downloaded images and checkpointed state.
        Ensures existing 520 images are preserved and mapped.
        """
        # 1. Register existing 520 downloaded images
        downloaded_rows = df_images[
            df_images["download_status"].eq("DOWNLOADED") & df_images["local_path"].notna()
        ]

        for _, row in downloaded_rows.iterrows():
            img_id = str(row["image_id"])
            loc_path = str(row["local_path"]).replace("\\", "/")
            full_path = Path(loc_path)

            if full_path.exists() and full_path.stat().st_size > 0:
                self.results[img_id] = {
                    "image_id": img_id,
                    "local_path": loc_path,
                    "download_status": "DOWNLOADED",
                    "http_status": 200,
                    "file_size_bytes": full_path.stat().st_size,
                    "error_message": None,
                    "url": str(row["image_url"]),
                }
                url = str(row["image_url"])
                if url:
                    self.url_to_path[url] = loc_path

        logging.info("Registered %d existing downloaded images.", len(self.results))

        # 2. Check if a previous checkpoint exists
        if self.checkpoint_path.exists():
            try:
                with open(self.checkpoint_path, "r", encoding="utf-8") as f:
                    ckpt_data = json.load(f)
                    for k, v in ckpt_data.get("results", {}).items():
                        if k not in self.results:
                            loc = v.get("local_path")
                            if loc and Path(loc).exists() and Path(loc).stat().st_size > 0:
                                self.results[k] = v
                                url = v.get("url")
                                if url:
                                    self.url_to_path[url] = loc
                logging.info("Loaded %d additional checkpointed records.", len(self.results) - len(downloaded_rows))
            except Exception as e:
                logging.warning("Could not read checkpoint file: %s", e)

        # 3. Check if failures CSV exists
        if self.failures_path.exists():
            try:
                df_failures = pd.read_csv(self.failures_path)
                self.failures = df_failures.to_dict(orient="records")
                logging.info("Loaded %d prior failure records from CSV.", len(self.failures))
            except Exception as e:
                logging.warning("Could not load prior failures: %s", e)

    def save_checkpoint(self) -> None:
        """Atomically saves the current download progress and failure log."""
        with self._lock:
            temp_ckpt = self.checkpoint_path.with_suffix(".tmp")
            with open(temp_ckpt, "w", encoding="utf-8") as f:
                json.dump({"results": self.results}, f, indent=2)
            for _ in range(5):
                try:
                    temp_ckpt.replace(self.checkpoint_path)
                    break
                except PermissionError:
                    time.sleep(0.2)

            if self.failures:
                for _ in range(5):
                    try:
                        pd.DataFrame(self.failures).to_csv(self.failures_path, index=False)
                        break
                    except PermissionError:
                        time.sleep(0.2)

    def _determine_extension(self, url: str, content_type: Optional[str]) -> str:
        """Determines appropriate file extension from URL or Content-Type."""
        if content_type:
            ct = content_type.lower()
            if "png" in ct:
                return ".png"
            if "webp" in ct:
                return ".webp"
            if "gif" in ct:
                return ".gif"
            if "jpeg" in ct or "jpg" in ct:
                return ".jpg"

        url_lower = url.lower()
        for ext in [".jpeg", ".jpg", ".png", ".webp", ".gif"]:
            if url_lower.endswith(ext):
                return ext
        return ".jpg"

    def _download_url(
        self,
        session: requests.Session,
        url: str,
        lead_image_id: str,
    ) -> Dict[str, Any]:
        """
        Downloads a single URL over HTTP with validation, retries, and atomic storage.
        """
        # Quick check: is it an explicit transparent-pixel URL?
        if "transparent-pixel" in url.lower():
            target_path = self.cache_dir / f"{lead_image_id}.gif"
            try:
                resp = session.get(url, timeout=self.timeout)
                if resp.status_code == 200:
                    with open(target_path, "wb") as f:
                        f.write(resp.content)
                    return {
                        "local_path": str(target_path).replace("\\", "/"),
                        "download_status": "DOWNLOADED",
                        "http_status": 200,
                        "file_size_bytes": len(resp.content),
                        "error_message": None,
                        "is_placeholder": True,
                    }
            except Exception as e:
                return {
                    "local_path": None,
                    "download_status": "DOWNLOAD_FAILED",
                    "http_status": 500,
                    "file_size_bytes": None,
                    "error_message": str(e),
                    "is_placeholder": True,
                }

        last_error = None
        status_code = None

        for attempt in range(1, self.max_retries + 1):
            try:
                resp = session.get(url, timeout=self.timeout, stream=True)
                status_code = resp.status_code

                if status_code == 200:
                    content_type = resp.headers.get("Content-Type", "")
                    content = resp.content

                    if len(content) == 0:
                        raise ValueError("Received 0 bytes from server.")

                    # Content-type check: must not be text/html
                    if "text/html" in content_type.lower():
                        raise ValueError(f"Server returned HTML page instead of image (Content-Type: {content_type}).")

                    # Verify image decoding with PIL
                    ext = self._determine_extension(url, content_type)
                    target_path = self.cache_dir / f"{lead_image_id}{ext}"
                    temp_path = self.cache_dir / f"{lead_image_id}.tmp"

                    try:
                        with Image.open(io.BytesIO(content)) as img:
                            img.verify()
                    except Exception as verify_err:
                        with open(target_path, "wb") as f:
                            f.write(content)
                        return {
                            "local_path": str(target_path).replace("\\", "/"),
                            "download_status": "CORRUPTED",
                            "http_status": 200,
                            "file_size_bytes": len(content),
                            "error_message": f"PIL verify failed: {verify_err}",
                        }

                    # Atomic write
                    with open(temp_path, "wb") as f:
                        f.write(content)
                    temp_path.replace(target_path)

                    posix_path = str(target_path).replace("\\", "/")
                    return {
                        "local_path": posix_path,
                        "download_status": "DOWNLOADED",
                        "http_status": 200,
                        "file_size_bytes": len(content),
                        "error_message": None,
                    }

                elif status_code in (404, 403, 410):
                    return {
                        "local_path": None,
                        "download_status": "DOWNLOAD_FAILED",
                        "http_status": status_code,
                        "file_size_bytes": None,
                        "error_message": f"HTTP {status_code}",
                    }
                else:
                    last_error = f"HTTP {status_code}"

            except Exception as e:
                last_error = str(e)

            if attempt < self.max_retries:
                time.sleep(0.5 * (2 ** (attempt - 1)))

        return {
            "local_path": None,
            "download_status": "DOWNLOAD_FAILED",
            "http_status": status_code or 500,
            "file_size_bytes": None,
            "error_message": last_error or "Download retries exhausted",
        }

    def run(self, limit: Optional[int] = None, checkpoint_interval: int = 500) -> Dict[str, Any]:
        """
        Executes download across pending records with zero redundant network requests.
        """
        logging.info("Reading source manifest: %s", self.source_manifest_path)
        df_images = pd.read_parquet(self.source_manifest_path)

        self.load_initial_state(df_images)

        already_processed = set(self.results.keys())
        pending_rows = df_images[~df_images["image_id"].isin(already_processed)]

        total_pending = len(pending_rows)
        logging.info("Found %d pending records to process.", total_pending)

        if limit is not None and limit < total_pending:
            pending_rows = pending_rows.head(limit)
            logging.info("Limited download run to %d records.", len(pending_rows))

        if pending_rows.empty:
            logging.info("No pending images to download.")
            return {
                "total_records": len(df_images),
                "downloaded": sum(1 for r in self.results.values() if r.get("download_status") == "DOWNLOADED"),
                "failed": len(self.failures),
            }

        # Step 1: Handle records whose URL was already downloaded earlier (instant local copy)
        url_groups = defaultdict(list)
        instant_copies = 0

        for _, row in pending_rows.iterrows():
            img_id = str(row["image_id"])
            url = str(row["image_url"])
            rec = {
                "image_id": img_id,
                "canonical_product_id": str(row["canonical_product_id"]),
                "marketplace": str(row["marketplace"]),
                "image_url": url,
            }

            if url in self.url_to_path:
                # Already have this URL cached
                existing_path = self.url_to_path[url]
                if Path(existing_path).exists() and Path(existing_path).stat().st_size > 0:
                    ext = Path(existing_path).suffix or ".jpg"
                    target_path = self.cache_dir / f"{img_id}{ext}"
                    try:
                        shutil.copyfile(existing_path, target_path)
                        self.results[img_id] = {
                            "image_id": img_id,
                            "local_path": str(target_path).replace("\\", "/"),
                            "download_status": "DOWNLOADED",
                            "http_status": 200,
                            "file_size_bytes": target_path.stat().st_size,
                            "error_message": None,
                            "url": url,
                            "reused_url": True,
                        }
                        instant_copies += 1
                        continue
                    except Exception as e:
                        logging.warning("Error copying cached file: %s", e)

            url_groups[url].append(rec)

        if instant_copies > 0:
            logging.info("Instantly fulfilled %d records from existing URL cache without network traffic.", instant_copies)
            self.save_checkpoint()

        unique_urls_to_fetch = list(url_groups.keys())
        logging.info("Unique URLs to fetch over network: %d (representing %d records)", len(unique_urls_to_fetch), sum(len(v) for v in url_groups.values()))

        if not unique_urls_to_fetch:
            logging.info("All requested records fulfilled via local cache.")
            return {
                "total_records": len(df_images),
                "downloaded": sum(1 for r in self.results.values() if r.get("download_status") == "DOWNLOADED"),
                "failed": len(self.failures),
            }

        session = self._create_session()
        completed_records = instant_copies
        t0 = time.time()

        try:
            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                # Submit unique URLs
                future_to_url = {}
                for url, records in url_groups.items():
                    lead_rec = records[0]
                    fut = executor.submit(self._download_url, session, url, lead_rec["image_id"])
                    future_to_url[fut] = (url, records)

                for future in as_completed(future_to_url):
                    url, records = future_to_url[future]
                    lead_rec = records[0]
                    lead_id = lead_rec["image_id"]

                    try:
                        url_res = future.result()
                    except Exception as exc:
                        url_res = {
                            "local_path": None,
                            "download_status": "DOWNLOAD_FAILED",
                            "http_status": 500,
                            "file_size_bytes": None,
                            "error_message": f"Execution error: {exc}",
                        }

                    # Register lead record
                    with self._lock:
                        self.results[lead_id] = {
                            "image_id": lead_id,
                            "local_path": url_res["local_path"],
                            "download_status": url_res["download_status"],
                            "http_status": url_res["http_status"],
                            "file_size_bytes": url_res["file_size_bytes"],
                            "error_message": url_res["error_message"],
                            "url": url,
                        }
                        if url_res["download_status"] == "DOWNLOADED" and url_res["local_path"]:
                            self.url_to_path[url] = url_res["local_path"]
                        elif url_res["download_status"] != "DOWNLOADED":
                            self.failures.append({
                                "image_id": lead_id,
                                "canonical_product_id": lead_rec["canonical_product_id"],
                                "marketplace": lead_rec["marketplace"],
                                "image_url": url,
                                "http_status": url_res["http_status"],
                                "error_message": url_res["error_message"],
                                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                            })

                        # Register any sibling records that share this exact URL
                        for sibling in records[1:]:
                            sib_id = sibling["image_id"]
                            if url_res["download_status"] == "DOWNLOADED" and url_res["local_path"]:
                                ext = Path(url_res["local_path"]).suffix or ".jpg"
                                sib_path = self.cache_dir / f"{sib_id}{ext}"
                                try:
                                    shutil.copyfile(url_res["local_path"], sib_path)
                                    sib_posix = str(sib_path).replace("\\", "/")
                                    self.results[sib_id] = {
                                        "image_id": sib_id,
                                        "local_path": sib_posix,
                                        "download_status": "DOWNLOADED",
                                        "http_status": 200,
                                        "file_size_bytes": sib_path.stat().st_size,
                                        "error_message": None,
                                        "url": url,
                                        "reused_url": True,
                                    }
                                except Exception as cpy_err:
                                    self.results[sib_id] = {
                                        "image_id": sib_id,
                                        "local_path": url_res["local_path"],
                                        "download_status": "DOWNLOADED",
                                        "http_status": 200,
                                        "file_size_bytes": url_res["file_size_bytes"],
                                        "error_message": None,
                                        "url": url,
                                        "reused_url": True,
                                    }
                            else:
                                self.results[sib_id] = {
                                    "image_id": sib_id,
                                    "local_path": None,
                                    "download_status": url_res["download_status"],
                                    "http_status": url_res["http_status"],
                                    "file_size_bytes": None,
                                    "error_message": url_res["error_message"],
                                    "url": url,
                                }
                                self.failures.append({
                                    "image_id": sib_id,
                                    "canonical_product_id": sibling["canonical_product_id"],
                                    "marketplace": sibling["marketplace"],
                                    "image_url": url,
                                    "http_status": url_res["http_status"],
                                    "error_message": url_res["error_message"],
                                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                                })

                    completed_records += len(records)

                    if completed_records % 100 < len(records) or completed_records >= len(pending_rows):
                        elapsed = time.time() - t0
                        rate = completed_records / max(1.0, elapsed)
                        logging.info(
                            "Progress: %d / %d records resolved (%.1f rec/s) - %d total cached",
                            completed_records,
                            len(pending_rows),
                            rate,
                            len(self.results),
                        )

                    if completed_records % checkpoint_interval < len(records):
                        self.save_checkpoint()

        finally:
            session.close()
            self.save_checkpoint()

        total_downloaded = sum(1 for r in self.results.values() if r.get("download_status") == "DOWNLOADED")
        total_corrupted = sum(1 for r in self.results.values() if r.get("download_status") == "CORRUPTED")
        total_failed = sum(1 for r in self.results.values() if r.get("download_status") == "DOWNLOAD_FAILED")

        logging.info("Download stage completed.")
        logging.info("Total in state: %d", len(self.results))
        logging.info("Downloaded: %d | Corrupted: %d | Failed: %d", total_downloaded, total_corrupted, total_failed)

        return {
            "total_records": len(df_images),
            "processed_this_run": completed_records,
            "total_in_state": len(self.results),
            "downloaded": total_downloaded,
            "corrupted": total_corrupted,
            "failed": total_failed,
        }


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Resumable image downloader for AI Marketplace Analyzer.")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of images to download.")
    parser.add_argument("--workers", type=int, default=16, help="Concurrent worker count.")
    parser.add_argument("--checkpoint-interval", type=int, default=500, help="Checkpoint save interval.")
    args = parser.parse_args()

    downloader = ResumableImageDownloader(max_workers=args.workers)
    stats = downloader.run(limit=args.limit, checkpoint_interval=args.checkpoint_interval)
    print("Download run summary:", stats)
