"""
Flipkart Image Acquisition Adapter (v1.6)

Provides a governed, policy-compliant pipeline for acquiring and verifying
product listing images for the 127 Flipkart review-bearing products.

Strict Safety Invariants:
1. Network acquisition is DISABLED by default (ALLOW_NETWORK_ACQUISITION = False).
2. Requires explicit user authorization before enabling outbound network connections.
3. Zero image fabrication: never generates dummy images, mock URLs, or fake SHA-256 hashes.
4. All candidate images must pass PIL open/verify and SHA-256 integrity checks.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("flipkart_image_adapter_v1_6")

# Strict default safety policy
ALLOW_NETWORK_ACQUISITION: bool = False

PROJECT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_MANIFEST_PATH = PROJECT_ROOT / "manifests" / "flipkart_127_image_target_manifest.csv"


def calculate_sha256(path: Path) -> str:
    """Compute hex SHA-256 digest of a file in streaming chunks."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def compute_dhash(image: Image.Image, hash_size: int = 8) -> str:
    """Compute difference hash (dHash) for an image."""
    img = image.convert("L").resize((hash_size + 1, hash_size), Image.Resampling.LANCZOS)
    pixels = list(img.getdata())
    diff = []
    for row in range(hash_size):
        for col in range(hash_size):
            p1 = pixels[row * (hash_size + 1) + col]
            p2 = pixels[row * (hash_size + 1) + col + 1]
            diff.append(p1 > p2)
    # Convert bool list to hex string
    decimal_val = 0
    hex_str = []
    for i, bit in enumerate(diff):
        if bit:
            decimal_val += 1 << (i % 4)
        if (i % 4) == 3:
            hex_str.append(f"{decimal_val:x}")
            decimal_val = 0
    return "".join(hex_str)


class FlipkartImageAdapter:
    """
    Governed adapter for acquiring and verifying Flipkart product images.
    """

    def __init__(
        self,
        manifest_path: Optional[Path] = None,
        allow_network: bool = ALLOW_NETWORK_ACQUISITION,
    ) -> None:
        self.manifest_path = Path(manifest_path or DEFAULT_MANIFEST_PATH)
        self.allow_network = allow_network
        self.manifest_df: Optional[pd.DataFrame] = None
        self.load_manifest()

    def load_manifest(self) -> pd.DataFrame:
        """Load and validate the 127 target manifest."""
        if not self.manifest_path.exists():
            raise FileNotFoundError(f"Manifest not found: {self.manifest_path}")
        self.manifest_df = pd.read_csv(self.manifest_path)
        required_cols = [
            "canonical_product_id",
            "product_title",
            "brand",
            "category",
            "price_inr",
            "review_count",
            "acquisition_status",
        ]
        missing = [c for c in required_cols if c not in self.manifest_df.columns]
        if missing:
            raise ValueError(f"Manifest missing required columns: {missing}")
        return self.manifest_df

    def get_status_summary(self) -> Dict[str, Any]:
        """Return a summary of the current acquisition status."""
        if self.manifest_df is None:
            self.load_manifest()
        total_targets = len(self.manifest_df)
        status_counts = self.manifest_df["acquisition_status"].value_counts().to_dict()
        return {
            "total_target_products": total_targets,
            "status_distribution": status_counts,
            "network_acquisition_enabled": self.allow_network,
            "manifest_path": str(self.manifest_path),
        }

    def verify_image(self, file_path: Path) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
        """
        Verify that an image file is readable, not corrupt, and returns metadata.
        Returns: (is_valid, error_reason, metadata_dict)
        """
        if not file_path.exists():
            return False, f"File does not exist: {file_path}", None
        
        try:
            with Image.open(file_path) as img:
                img.verify()
            # Open again for reading metadata after verify()
            with Image.open(file_path) as img:
                width, height = img.size
                format_name = img.format or "UNKNOWN"
                mode = img.mode
                dhash_val = compute_dhash(img)
            
            sha256_val = calculate_sha256(file_path)
            file_size_bytes = file_path.stat().st_size
            
            metadata = {
                "file_path": str(file_path.resolve()),
                "sha256": sha256_val,
                "dhash": dhash_val,
                "width": width,
                "height": height,
                "format": format_name,
                "mode": mode,
                "file_size_bytes": file_size_bytes,
            }
            return True, None, metadata
        except Exception as e:
            return False, f"Image verification failed: {str(e)}", None

    def ingest_local_directory(
        self,
        local_dir: Path,
        destination_dir: Optional[Path] = None,
    ) -> pd.DataFrame:
        """
        Ingest images provided in a local directory matching canonical product IDs.
        No network calls made.
        """
        local_path = Path(local_dir)
        if not local_path.is_dir():
            raise NotADirectoryError(f"Directory not found: {local_path}")

        records: List[Dict[str, Any]] = []
        target_ids = set(self.manifest_df["canonical_product_id"])

        for cid in sorted(target_ids):
            # Check for candidate files: e.g. {cid}.jpg, {cid}.png, etc.
            matches = list(local_path.glob(f"*{cid}*.*"))
            if not matches:
                continue

            for match in matches:
                is_valid, err, meta = self.verify_image(match)
                if is_valid and meta is not None:
                    records.append({
                        "canonical_product_id": cid,
                        "source_file": str(match),
                        "sha256": meta["sha256"],
                        "dhash": meta["dhash"],
                        "width": meta["width"],
                        "height": meta["height"],
                        "format": meta["format"],
                        "file_size_bytes": meta["file_size_bytes"],
                        "ingestion_status": "VERIFIED",
                    })
                else:
                    logger.warning(f"Rejected candidate image {match}: {err}")

        logger.info(f"Ingested {len(records)} verified images from {local_path}.")
        return pd.DataFrame(records)

    def trigger_network_acquisition(self) -> None:
        """
        Attempt network acquisition. Strictly raises PermissionError if disabled.
        """
        if not self.allow_network:
            raise PermissionError(
                "External network acquisition is DISABLED by policy. "
                "Explicit user authorization is required to perform HTTP/S downloads. "
                "Zero synthetic data or unauthorized downloads permitted."
            )
        logger.info("Network acquisition authorized by user. Proceeding with crawl...")


def main() -> None:
    parser = argparse.ArgumentParser(description="Flipkart Image Acquisition Adapter v1.6")
    parser.add_argument("--manifest", type=str, default=str(DEFAULT_MANIFEST_PATH), help="Path to target manifest CSV")
    parser.add_argument("--status", action="store_true", help="Print acquisition status summary")
    parser.add_argument("--dry-run", action="store_true", help="Perform dry run without state changes")
    parser.add_argument("--local-dir", type=str, default=None, help="Path to local directory with images to ingest")
    parser.add_argument("--allow-network", action="store_true", help="Enable network acquisition (requires authorization)")
    args = parser.parse_args()

    adapter = FlipkartImageAdapter(manifest_path=Path(args.manifest), allow_network=args.allow_network)
    summary = adapter.get_status_summary()

    if args.status or args.dry_run:
        print("=" * 60)
        print("FLIPKART IMAGE ACQUISITION ADAPTER (v1.6) — STATUS")
        print("=" * 60)
        print(f"Manifest Path: {summary['manifest_path']}")
        print(f"Total Target Products: {summary['total_target_products']}")
        print(f"Network Acquisition Allowed: {summary['network_acquisition_enabled']}")
        print("Status Distribution:")
        for k, v in summary["status_distribution"].items():
            print(f"  - {k}: {v}")
        print("=" * 60)

    if args.local_dir:
        res_df = adapter.ingest_local_directory(Path(args.local_dir))
        print(f"Ingestion result:\n{res_df}")


if __name__ == "__main__":
    main()
