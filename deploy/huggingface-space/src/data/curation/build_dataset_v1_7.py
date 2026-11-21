"""
Dataset Builder & Finalizer: Indian Marketplace Trust Dataset v1.7
Milestone 6: Final Multimodal Trust Intelligence Engine
AI-Powered Indian Marketplace Trust Intelligence Platform

Builds the complete v1.7 release incorporating:
1. Unified Multimodal Trust Intelligence Engine assessments across all 3,643 canonical products.
2. Individual marketplace listing trust assessments across all 3,643 listings.
3. Platform aggregate seller governance assessments across all 4 seller entities.
4. Preserves baseline v1.6 completely intact and frozen.
5. Generates full SHA-256 manifests, dataset manifest, and documentation reports.
"""

from collections import defaultdict
import datetime
import hashlib
import json
import logging
from pathlib import Path
import shutil
import sys
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.trust_engine import TrustIntelligenceEngine

logger = logging.getLogger("DatasetBuilderV17")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

BASE_V16_DIR = Path("data/indian_marketplace_trust_dataset_v1_6")
TARGET_V17_DIR = Path("data/indian_marketplace_trust_dataset_v1_7")


class DatasetBuilderV17:
    """Master build pipeline for Dataset v1.7."""

    @classmethod
    def copy_base_files(cls) -> None:
        """Copies baseline directories and files from v1.6 to v1.7."""
        logger.info(f"Copying baseline from {BASE_V16_DIR} to {TARGET_V17_DIR}...")
        TARGET_V17_DIR.mkdir(parents=True, exist_ok=True)

        for sub_dir in ["entities", "evidence", "annotations", "benchmarks", "relationships", "derived_evidence", "reports"]:
            src_sub = BASE_V16_DIR / sub_dir
            dst_sub = TARGET_V17_DIR / sub_dir
            dst_sub.mkdir(parents=True, exist_ok=True)

            if src_sub.exists():
                for item in src_sub.iterdir():
                    if item.is_file():
                        dst_file = dst_sub / item.name
                        shutil.copy2(item, dst_file)

        logger.info("Baseline files copied successfully.")

    @classmethod
    def compute_sha256(cls, file_path: Path) -> str:
        """Computes SHA-256 hash for a given file."""
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        return hasher.hexdigest()

    @classmethod
    def generate_manifests_and_checksums(cls) -> Dict[str, Any]:
        """Generates dataset manifest and SHA-256 checksums for v1.7 release."""
        logger.info("Generating manifests and checksums for v1.7 release...")
        manifest_dir = TARGET_V17_DIR / "manifests"
        manifest_dir.mkdir(parents=True, exist_ok=True)

        files_info: Dict[str, Dict[str, Any]] = {}
        checksum_lines: List[str] = []

        all_files = sorted(TARGET_V17_DIR.rglob("*"))
        for fp in all_files:
            if fp.is_file() and not fp.is_relative_to(manifest_dir):
                rel_path = fp.relative_to(TARGET_V17_DIR).as_posix()
                file_sha = cls.compute_sha256(fp)
                file_size = fp.stat().st_size

                files_info[rel_path] = {
                    "sha256": file_sha,
                    "size_bytes": file_size,
                }
                checksum_lines.append(f"{file_sha}  {rel_path}")

        # Write sha256_manifest.json
        with open(manifest_dir / "sha256_manifest.json", "w", encoding="utf-8") as f:
            json.dump(files_info, f, indent=2)

        # Write checksums.sha256
        with open(manifest_dir / "checksums.sha256", "w", encoding="utf-8") as f:
            f.write("\n".join(checksum_lines) + "\n")

        # Write dataset_manifest.json
        now_ts = datetime.datetime.now(datetime.timezone.utc).isoformat()
        dataset_manifest = {
            "dataset_name": "Indian Marketplace Trust Dataset",
            "version": "v1.7",
            "release_title": "Milestone 6: Final Multimodal Trust Intelligence Engine Release",
            "release_date": now_ts,
            "architecture_milestones": [
                "Milestone 1 — Independent Baseline Audit & Remediation Framework",
                "Milestone 2 — Product, Brand, Seller and Variant Finalization",
                "Milestone 3 — Review NLP, Duplicate Detection & Hinglish Normalization",
                "Milestone 4 — Computer Vision, ResNet-18 Embeddings & Image Reuse Intelligence",
                "Milestone 5 — Advanced Pricing & Seller Intelligence",
                "Milestone 6 — Final Multimodal Trust Intelligence Engine",
            ],
            "total_files": len(files_info),
            "files": files_info,
            "specifications": {
                "canonical_products": 3643,
                "marketplace_listings": 3643,
                "customer_reviews": 3659,
                "physical_images": 4708,
                "resnet18_embeddings": "4708 x 512",
                "price_observations": 3667,
                "human_review_annotations": 100,
                "silver_review_annotations": 600,
                "pending_review_tasks": 500,
                "image_annotations": 250,
                "listing_annotations": 250,
                "certified_sellers": 4,
                "platform_aggregate_sellers": 3,
                "unresolved_third_party_pool": 1,
                "graph_relationships": 41372,
                "atomic_multimodal_evidence_records": 6064,
                "product_trust_assessments": 3643,
                "listing_trust_assessments": 3643,
                "seller_trust_assessments": 4,
            },
        }

        with open(manifest_dir / "dataset_manifest.json", "w", encoding="utf-8") as f:
            json.dump(dataset_manifest, f, indent=2)

        logger.info(f"Manifests generated for {len(files_info)} files in v1.7 release.")
        return dataset_manifest

    @classmethod
    def build_release(cls) -> Dict[str, Any]:
        """Orchestrates the entire v1.7 release creation."""
        logger.info("=== BEGINNING DATASET V1.7 BUILD ===")

        # 1. Copy Baseline
        cls.copy_base_files()

        # 2. Initialize Trust Intelligence Engine on v1.7 target directory
        logger.info("Initializing Trust Intelligence Engine on v1.7 dataset...")
        engine = TrustIntelligenceEngine(dataset_dir=TARGET_V17_DIR)

        # 3. Compute Product Trust Assessments
        logger.info("Computing Product Trust Assessments across all 3,643 products...")
        prod_records = []
        for pid in engine.evidence_engine.products_df["canonical_product_id"]:
            asmt = engine.assessment_engine.assess_product(pid)
            d = asmt.to_dict()
            # Flatten modality breakdown summary for tabular Parquet storage
            for mod_k, mod_v in d["modality_breakdown"].items():
                d[f"{mod_k.lower()}_status"] = mod_v["status"]
                d[f"{mod_k.lower()}_has_anomaly"] = mod_v["has_anomaly"]
                d[f"{mod_k.lower()}_anomaly_type"] = mod_v["anomaly_type"]
            del d["modality_breakdown"]
            d["positive_evidence_count"] = len(d["positive_evidence"])
            d["negative_evidence_count"] = len(d["negative_evidence"])
            d["missing_modalities_count"] = len(d["missing_modalities"])
            d["positive_evidence_json"] = json.dumps(d["positive_evidence"])
            d["negative_evidence_json"] = json.dumps(d["negative_evidence"])
            d["missing_modalities_json"] = json.dumps(d["missing_modalities"])
            d["assessment_limitations_json"] = json.dumps(d["assessment_limitations"])
            del d["positive_evidence"]
            del d["negative_evidence"]
            del d["missing_modalities"]
            del d["assessment_limitations"]
            prod_records.append(d)

        prod_assessments_df = pd.DataFrame(prod_records)
        prod_out = TARGET_V17_DIR / "derived_evidence" / "trust_assessments_products.parquet"
        prod_assessments_df.to_parquet(prod_out, index=False)
        logger.info(f"Saved {len(prod_assessments_df)} product trust assessments to {prod_out}")

        # 4. Compute Listing Trust Assessments
        logger.info("Computing Listing Trust Assessments across all 3,643 listings...")
        list_records = []
        for lid in engine.evidence_engine.listings_df["listing_id"]:
            asmt = engine.assessment_engine.assess_listing(lid)
            d = asmt.to_dict()
            d["listing_specific_flags_json"] = json.dumps(d["listing_specific_flags"])
            del d["listing_specific_flags"]
            list_records.append(d)

        list_assessments_df = pd.DataFrame(list_records)
        list_out = TARGET_V17_DIR / "derived_evidence" / "trust_assessments_listings.parquet"
        list_assessments_df.to_parquet(list_out, index=False)
        logger.info(f"Saved {len(list_assessments_df)} listing trust assessments to {list_out}")

        # 5. Compute Seller Trust Assessments
        logger.info("Computing Seller Trust Assessments across all 4 sellers...")
        seller_records = []
        for sid in engine.evidence_engine.sellers_df["seller_id"]:
            asmt = engine.assessment_engine.assess_seller(sid)
            seller_records.append(asmt.to_dict())

        seller_assessments_df = pd.DataFrame(seller_records)
        seller_out = TARGET_V17_DIR / "derived_evidence" / "trust_assessments_sellers.parquet"
        seller_assessments_df.to_parquet(seller_out, index=False)
        logger.info(f"Saved {len(seller_assessments_df)} seller trust assessments to {seller_out}")

        # 6. Generate Manifests and Checksums
        manifest = cls.generate_manifests_and_checksums()

        logger.info("=== DATASET V1.7 BUILD COMPLETED SUCCESSFULLY ===")
        return {
            "status": "SUCCESS",
            "product_assessments": len(prod_assessments_df),
            "listing_assessments": len(list_assessments_df),
            "seller_assessments": len(seller_assessments_df),
            "total_files": manifest["total_files"],
        }


if __name__ == "__main__":
    result = DatasetBuilderV17.build_release()
    print("Dataset v1.7 build result:", json.dumps(result, indent=2))
