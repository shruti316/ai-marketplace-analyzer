"""
src/data/curation/build_marketplace_trust_dataset_v1_5.py
---------------------------------------------------------
Assembles the complete, certified, frozen release v1.5 under:
`data/marketplace_trust_dataset_v1.5/`

Features:
- Reconciled foundational entities, evidence, and derived features.
- Full multi-protocol evaluation suite (Protocols 1 through 6).
- Cryptographic SHA-256 dataset manifest indexing all release tables.
- Strict preservation of historical releases v1.1, v1.2, v1.3, v1.4.
"""

import sys
import json
import shutil
import hashlib
import logging
from pathlib import Path
from typing import Dict, Any, List, Tuple
import pandas as pd
import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

V14_DIR = PROJECT_ROOT / "data" / "marketplace_trust_dataset_v1.4"
PROC_DIR = PROJECT_ROOT / "data" / "processed_v1_5"
OUT_BASE = PROJECT_ROOT / "data" / "marketplace_trust_dataset_v1.5"


class MarketplaceTrustDatasetBuilderV15:
    """
    Builds the certified Marketplace Trust Dataset v1.5.
    """

    def __init__(self):
        self.ENTITIES_DIR = OUT_BASE / "entities"
        self.EVIDENCE_DIR = OUT_BASE / "evidence"
        self.RELATIONSHIPS_DIR = OUT_BASE / "relationships"
        self.DERIVED_DIR = OUT_BASE / "derived_evidence"
        self.COLLECTIONS_DIR = OUT_BASE / "collections"
        self.BENCHMARKS_DIR = self.COLLECTIONS_DIR / "isolated_benchmarks"
        self.EVALUATION_DIR = OUT_BASE / "evaluation"
        self.BENCHMARK_EVAL_DIR = self.EVALUATION_DIR / "benchmark_manifests"
        self.PROTOCOLS_DIR = self.EVALUATION_DIR / "protocols"
        self.METADATA_DIR = OUT_BASE / "metadata"
        self.MANIFESTS_DIR = OUT_BASE / "manifests"

    def ensure_directory_structure(self):
        logging.info("Creating directory structure for v1.5...")
        dirs = [
            self.ENTITIES_DIR, self.EVIDENCE_DIR, self.RELATIONSHIPS_DIR,
            self.DERIVED_DIR, self.COLLECTIONS_DIR, self.BENCHMARKS_DIR,
            self.EVALUATION_DIR, self.BENCHMARK_EVAL_DIR, self.PROTOCOLS_DIR,
            self.METADATA_DIR, self.MANIFESTS_DIR
        ]
        for d in dirs:
            d.mkdir(parents=True, exist_ok=True)

    def assemble_core_tables(self):
        logging.info("Step 1: Assembling entities and evidence tables...")
        # 1. Products
        prods = pd.read_parquet(PROC_DIR / "canonical_products_v1_5.parquet")
        prods.to_parquet(self.ENTITIES_DIR / "products.parquet", index=False)

        # 2. Sellers
        sellers = pd.read_parquet(V14_DIR / "entities" / "sellers.parquet")
        sellers.to_parquet(self.ENTITIES_DIR / "sellers.parquet", index=False)

        # 3. Product Variants
        variants = pd.read_parquet(V14_DIR / "entities" / "product_variants.parquet")
        variants.to_parquet(self.ENTITIES_DIR / "product_variants.parquet", index=False)

        # 4. Reviews
        revs = pd.read_parquet(PROC_DIR / "canonical_reviews_v1_5.parquet")
        revs.to_parquet(self.EVIDENCE_DIR / "reviews.parquet", index=False)

        # 5. Images
        imgs = pd.read_parquet(PROC_DIR / "canonical_images_v1_5.parquet")
        imgs.to_parquet(self.EVIDENCE_DIR / "images.parquet", index=False)

        # 6. Prices
        prices = pd.read_parquet(PROC_DIR / "price_observations_v1_5.parquet")
        prices.to_parquet(self.EVIDENCE_DIR / "price_observations.parquet", index=False)

        # 7. Seller Observations
        seller_obs = pd.read_parquet(V14_DIR / "evidence" / "seller_observations.parquet")
        seller_obs.to_parquet(self.EVIDENCE_DIR / "seller_observations.parquet", index=False)

        # 8. FX Conversion Rates
        fx = pd.read_parquet(V14_DIR / "evidence" / "fx_conversion_rates.parquet")
        fx.to_parquet(self.EVIDENCE_DIR / "fx_conversion_rates.parquet", index=False)

        # 9. Entity Relationships
        edges = pd.read_parquet(V14_DIR / "relationships" / "entity_relationships.parquet")
        edges.to_parquet(self.RELATIONSHIPS_DIR / "entity_relationships.parquet", index=False)

        # 10. Derived Evidence
        xmod = pd.read_parquet(V14_DIR / "derived_evidence" / "cross_modal_evidence.parquet")
        xmod.to_parquet(self.DERIVED_DIR / "cross_modal_evidence.parquet", index=False)

        rf = pd.read_parquet(PROC_DIR / "review_quality_features_v1_5.parquet")
        rf.to_parquet(self.DERIVED_DIR / "review_quality_features.parquet", index=False)

        img_feat = pd.read_parquet(PROC_DIR / "image_integrity_features_v1_5.parquet")
        img_feat.to_parquet(self.DERIVED_DIR / "image_integrity_features.parquet", index=False)

        price_feat = pd.read_parquet(PROC_DIR / "price_anomaly_features_v1_5.parquet")
        price_feat.to_parquet(self.DERIVED_DIR / "price_anomaly_features.parquet", index=False)

        # 11. Collections & Isolated Benchmarks
        tier_a = pd.read_parquet(V14_DIR / "collections" / "complete_multimodal_core.parquet")
        tier_a.to_parquet(self.COLLECTIONS_DIR / "complete_multimodal_core.parquet", index=False)

        for bench_file in ["deceptive_opinion_spam.parquet", "ecommerce_fake_reviews.parquet", "synthetic_stress_test_cases.parquet"]:
            src_b = V14_DIR / "collections" / "isolated_benchmarks" / bench_file
            if src_b.exists():
                shutil.copy2(src_b, self.BENCHMARKS_DIR / bench_file)

        logging.info("Core entity, evidence, and derived tables assembled.")

    def assemble_evaluation_protocols(self):
        logging.info("Step 2: Assembling multi-protocol evaluation suite...")
        from src.evaluation.split_protocols_v1_5 import EvaluationSplitEngineV15

        prods = pd.read_parquet(self.ENTITIES_DIR / "products.parquet")
        variants = pd.read_parquet(self.ENTITIES_DIR / "product_variants.parquet")
        revs = pd.read_parquet(self.EVIDENCE_DIR / "reviews.parquet")
        imgs = pd.read_parquet(self.EVIDENCE_DIR / "images.parquet")

        engine = EvaluationSplitEngineV15(prods, variants, revs, imgs, seed=42)

        # Protocol 1 (Product-Held-Out)
        p1 = engine.build_protocol_1_product_held_out()
        p1_dir = self.PROTOCOLS_DIR / "protocol_1_product_held_out"
        p1_dir.mkdir(parents=True, exist_ok=True)
        p1["train"].to_parquet(p1_dir / "train_manifest.parquet", index=False)
        p1["validation"].to_parquet(p1_dir / "validation_manifest.parquet", index=False)
        p1["test"].to_parquet(p1_dir / "test_manifest.parquet", index=False)
        # Root evaluation manifests mirror Protocol 1
        p1["train"].to_parquet(self.EVALUATION_DIR / "train_manifest.parquet", index=False)
        p1["validation"].to_parquet(self.EVALUATION_DIR / "validation_manifest.parquet", index=False)
        p1["test"].to_parquet(self.EVALUATION_DIR / "test_manifest.parquet", index=False)

        # Protocol 2 (Variant-Family-Held-Out)
        p2 = engine.build_protocol_2_variant_family_held_out()
        p2_dir = self.PROTOCOLS_DIR / "protocol_2_variant_family_held_out"
        p2_dir.mkdir(parents=True, exist_ok=True)
        p2["train"].to_parquet(p2_dir / "train_manifest.parquet", index=False)
        p2["validation"].to_parquet(p2_dir / "validation_manifest.parquet", index=False)
        p2["test"].to_parquet(p2_dir / "test_manifest.parquet", index=False)

        # Protocol 3 (Reviewer-Held-Out)
        p3 = engine.build_protocol_3_reviewer_held_out()
        p3_dir = self.PROTOCOLS_DIR / "protocol_3_reviewer_held_out"
        p3_dir.mkdir(parents=True, exist_ok=True)
        p3["train"].to_parquet(p3_dir / "train_manifest.parquet", index=False)
        p3["validation"].to_parquet(p3_dir / "validation_manifest.parquet", index=False)
        p3["test"].to_parquet(p3_dir / "test_manifest.parquet", index=False)

        # Protocol 4 (Image-Cluster-Held-Out)
        p4 = engine.build_protocol_4_image_cluster_held_out()
        p4_dir = self.PROTOCOLS_DIR / "protocol_4_image_cluster_held_out"
        p4_dir.mkdir(parents=True, exist_ok=True)
        p4["train"].to_parquet(p4_dir / "train_manifest.parquet", index=False)
        p4["validation"].to_parquet(p4_dir / "validation_manifest.parquet", index=False)
        p4["test"].to_parquet(p4_dir / "test_manifest.parquet", index=False)

        # Protocol 5 (Cross-Listing-Held-Out)
        p5 = engine.build_protocol_5_cross_listing_held_out()
        p5_dir = self.PROTOCOLS_DIR / "protocol_5_cross_listing_held_out"
        p5_dir.mkdir(parents=True, exist_ok=True)
        p5["train"].to_parquet(p5_dir / "train_manifest.parquet", index=False)
        p5["validation"].to_parquet(p5_dir / "validation_manifest.parquet", index=False)
        p5["test"].to_parquet(p5_dir / "test_manifest.parquet", index=False)

        # Protocol 6 (Temporal-Evaluation-Protocol Documentation)
        p6 = engine.build_protocol_6_temporal()
        p6_dir = self.PROTOCOLS_DIR / "protocol_6_temporal_evaluation"
        p6_dir.mkdir(parents=True, exist_ok=True)
        with open(p6_dir / "temporal_protocol_specification.json", "w", encoding="utf-8") as f:
            json.dump(p6, f, indent=2)

        # Benchmark manifests
        shutil.copy2(V14_DIR / "evaluation" / "benchmark_manifests" / "external_benchmark_manifest.parquet", self.BENCHMARK_EVAL_DIR / "external_benchmark_manifest.parquet")
        shutil.copy2(V14_DIR / "evaluation" / "benchmark_manifests" / "stress_test_manifest.parquet", self.BENCHMARK_EVAL_DIR / "stress_test_manifest.parquet")

        logging.info("All 6 evaluation protocols assembled successfully.")

    def assemble_manifests_and_metadata(self):
        logging.info("Step 3: Assembling manifests and metadata...")
        # Copy source registry, review accounting, matching audit, image acquisition
        for m_file in ["source_registry.parquet", "review_accounting.parquet", "matching_audit.parquet", "image_acquisition_manifest.csv"]:
            src_m = V14_DIR / "manifests" / m_file
            if src_m.exists():
                shutil.copy2(src_m, self.MANIFESTS_DIR / m_file)

        # Generate Drift Baseline Snapshot
        from src.monitoring.drift_readiness_v1_5 import DriftMonitoringEngineV15
        prods = pd.read_parquet(self.ENTITIES_DIR / "products.parquet")
        prices = pd.read_parquet(self.EVIDENCE_DIR / "price_observations.parquet")
        revs = pd.read_parquet(self.EVIDENCE_DIR / "reviews.parquet")
        imgs = pd.read_parquet(self.EVIDENCE_DIR / "images.parquet")

        snapshot = DriftMonitoringEngineV15.capture_v1_5_baseline_snapshot(prods, prices, revs, imgs)
        with open(self.METADATA_DIR / "drift_baseline_snapshot.json", "w", encoding="utf-8") as f:
            json.dump(snapshot, f, indent=2)

        # Cryptographic Dataset Manifest (SHA-256)
        manifest_data = {
            "release_version": "v1.5",
            "release_status": "FROZEN",
            "certification_verdict": "CERTIFIED_WITH_LIMITATIONS",
            "total_products": len(prods),
            "total_reviews": len(revs),
            "total_images": len(imgs),
            "total_prices": len(prices),
            "tables": {}
        }

        # Index and hash all parquet/csv/json files
        for p in OUT_BASE.rglob("*"):
            if p.is_file() and p.name not in ["dataset_manifest.json", "release_metadata.json"]:
                rel_path = str(p.relative_to(OUT_BASE)).replace("\\", "/")
                h = hashlib.sha256()
                with open(p, "rb") as f:
                    for chunk in iter(lambda: f.read(65536), b""):
                        h.update(chunk)
                manifest_data["tables"][rel_path] = {
                    "sha256": h.hexdigest(),
                    "size_bytes": p.stat().st_size
                }

        manifest_path = self.MANIFESTS_DIR / "dataset_manifest.json"
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest_data, f, indent=2)

        meta_path = self.METADATA_DIR / "release_metadata.json"
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(manifest_data, f, indent=2)

        logging.info(f"Cryptographic dataset manifest created with {len(manifest_data['tables'])} indexed artifacts.")

    def run(self):
        logging.info("=== Starting Marketplace Trust Dataset v1.5 Assembly ===")
        self.ensure_directory_structure()
        self.assemble_core_tables()
        self.assemble_evaluation_protocols()
        self.assemble_manifests_and_metadata()
        logging.info("=== Marketplace Trust Dataset v1.5 Assembled Successfully! ===")


if __name__ == "__main__":
    builder = MarketplaceTrustDatasetBuilderV15()
    builder.run()
