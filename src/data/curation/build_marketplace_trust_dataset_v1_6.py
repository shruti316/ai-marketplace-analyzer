"""
src/data/curation/build_marketplace_trust_dataset_v1_6.py
---------------------------------------------------------
Assembles the complete, certified, frozen release v1.6 under:
`data/marketplace_trust_dataset_v1.6/`

Enhancements in v1.6:
1. 4-Tier Modality Taxonomy on Products table (Tier A: 305, Tier B: 2,506, Tier C: 127, Tier D: 3,105).
2. Resolved Seller Entities with platform registration, trust tiers, and honest null handling.
3. Standardized Temporal Price Observations schema with observation batch IDs and readiness status.
4. Multilingual Review Intelligence (56,697 reviews annotated with script, language, and Hinglish density).
5. 7-Tier Fraud Ground Truth Taxonomy and weak supervision annotations.
6. Computer Vision ResNet-18 Deep Feature Embeddings Metadata for all 5,228 verified images.
7. NetworkX Graph Intelligence Features for all 6,043 product listings.
8. Non-Circular Multimodal Trust Evidence Fusion.
9. Cryptographic SHA-256 Dataset Manifest indexing all release tables.
"""

from __future__ import annotations

import hashlib
import json
import logging
from pathlib import Path
import shutil
import sys
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("build_marketplace_trust_dataset_v1_6")

PROJECT_ROOT = Path(__file__).resolve().parents[3]
V15_DIR = PROJECT_ROOT / "data" / "marketplace_trust_dataset_v1.5"
PROC_DIR = PROJECT_ROOT / "data" / "processed_v1_6"
OUT_BASE = PROJECT_ROOT / "data" / "marketplace_trust_dataset_v1.6"


class MarketplaceTrustDatasetBuilderV16:
    """
    Assembles the frozen Marketplace Trust Dataset release v1.6.
    """

    def __init__(self) -> None:
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

    def ensure_directory_structure(self) -> None:
        logger.info("Creating directory structure for Release v1.6...")
        dirs = [
            self.ENTITIES_DIR,
            self.EVIDENCE_DIR,
            self.RELATIONSHIPS_DIR,
            self.DERIVED_DIR,
            self.COLLECTIONS_DIR,
            self.BENCHMARKS_DIR,
            self.EVALUATION_DIR,
            self.BENCHMARK_EVAL_DIR,
            self.PROTOCOLS_DIR,
            self.METADATA_DIR,
            self.MANIFESTS_DIR,
        ]
        for d in dirs:
            d.mkdir(parents=True, exist_ok=True)

    def assemble_entities_and_evidence(self) -> None:
        logger.info("Step 1: Assembling entities and evidence tables...")

        # 1. Products (with formal 4-tier classification)
        prods = pd.read_parquet(V15_DIR / "entities" / "products.parquet").copy()

        def classify_4tier(row: pd.Series) -> str:
            img = bool(row["has_image"])
            rev = bool(row["has_review"])
            pri = bool(row["has_price"])
            if img and rev and pri:
                return "TIER_A_COMPLETE"
            elif img and pri and not rev:
                return "TIER_B_VISUAL"
            elif rev and pri and not img:
                return "TIER_C_TEXTUAL"
            else:
                return "TIER_D_CATALOG"

        prods["modality_tier"] = prods.apply(classify_4tier, axis=1)
        prods["reconciliation_version"] = "v1.6"
        prods.to_parquet(self.ENTITIES_DIR / "products.parquet", index=False)

        # 2. Sellers
        sellers = pd.read_parquet(PROC_DIR / "seller_entities_v1_6.parquet").copy()
        sellers.to_parquet(self.ENTITIES_DIR / "sellers.parquet", index=False)

        # 3. Product Variants
        variants = pd.read_parquet(V15_DIR / "entities" / "product_variants.parquet").copy()
        variants.to_parquet(self.ENTITIES_DIR / "product_variants.parquet", index=False)

        # 4. Reviewer Entities (if present in v1.5)
        rev_ent_path = V15_DIR / "entities" / "reviewer_entities.parquet"
        if rev_ent_path.exists():
            shutil.copy2(rev_ent_path, self.ENTITIES_DIR / "reviewer_entities.parquet")

        # 5. Reviews
        revs = pd.read_parquet(V15_DIR / "evidence" / "reviews.parquet").copy()
        revs["reconciliation_version"] = "v1.6"
        revs.to_parquet(self.EVIDENCE_DIR / "reviews.parquet", index=False)

        # 6. Images
        imgs = pd.read_parquet(V15_DIR / "evidence" / "images.parquet").copy()
        imgs["reconciliation_version"] = "v1.6"
        imgs.to_parquet(self.EVIDENCE_DIR / "images.parquet", index=False)

        # 7. Price Observations (Temporal Schema)
        prices = pd.read_parquet(PROC_DIR / "price_observations_v1_6.parquet").copy()
        prices.to_parquet(self.EVIDENCE_DIR / "price_observations.parquet", index=False)

        # 8. Seller Observations
        seller_obs = pd.read_parquet(V15_DIR / "evidence" / "seller_observations.parquet").copy()
        seller_obs["reconciliation_version"] = "v1.6"
        seller_obs.to_parquet(self.EVIDENCE_DIR / "seller_observations.parquet", index=False)

        # 9. FX Conversion Rates
        fx = pd.read_parquet(V15_DIR / "evidence" / "fx_conversion_rates.parquet").copy()
        fx.to_parquet(self.EVIDENCE_DIR / "fx_conversion_rates.parquet", index=False)

        # 10. Entity Relationships
        edges = pd.read_parquet(V15_DIR / "relationships" / "entity_relationships.parquet").copy()
        edges.to_parquet(self.RELATIONSHIPS_DIR / "entity_relationships.parquet", index=False)

        logger.info("Core entities and evidence tables assembled successfully.")

    def assemble_derived_evidence(self) -> None:
        logger.info("Step 2: Assembling derived evidence and intelligence tables...")

        # 1. Cross-Modal Evidence
        xmod = pd.read_parquet(PROC_DIR / "cross_modal_evidence_v1_6.parquet").copy()
        xmod.to_parquet(self.DERIVED_DIR / "cross_modal_evidence.parquet", index=False)

        # 2. Review Quality Features (multilingual expanded)
        rf = pd.read_parquet(PROC_DIR / "review_quality_features_v1_6.parquet").copy()
        rf.to_parquet(self.DERIVED_DIR / "review_quality_features.parquet", index=False)

        # 3. Image Integrity Features
        img_feat = pd.read_parquet(V15_DIR / "derived_evidence" / "image_integrity_features.parquet").copy()
        img_feat.to_parquet(self.DERIVED_DIR / "image_integrity_features.parquet", index=False)

        # 4. Price Anomaly Features
        price_feat = pd.read_parquet(PROC_DIR / "price_anomaly_features_v1_6.parquet").copy()
        price_feat.to_parquet(self.DERIVED_DIR / "price_anomaly_features.parquet", index=False)

        # 5. Language Annotations (v1.6 new)
        lang_ann = pd.read_parquet(PROC_DIR / "language_annotations_v1_6.parquet").copy()
        lang_ann.to_parquet(self.DERIVED_DIR / "language_annotations.parquet", index=False)

        # 6. Visual Embeddings Metadata (v1.6 new)
        vis_emb = pd.read_parquet(PROC_DIR / "visual_embeddings_metadata_v1_6.parquet").copy()
        vis_emb.to_parquet(self.DERIVED_DIR / "visual_embeddings_metadata.parquet", index=False)

        # 7. Fraud Taxonomy Annotations (v1.6 new)
        fraud_ann = pd.read_parquet(PROC_DIR / "fraud_taxonomy_annotations_v1_6.parquet").copy()
        fraud_ann.to_parquet(self.DERIVED_DIR / "fraud_taxonomy_annotations.parquet", index=False)

        # 8. Graph Features (v1.6 new)
        graph_feat = pd.read_parquet(PROC_DIR / "graph_features_v1_6.parquet").copy()
        graph_feat.to_parquet(self.DERIVED_DIR / "graph_features.parquet", index=False)

        # 9. Collections & Isolated Benchmarks
        tier_a = pd.read_parquet(V15_DIR / "collections" / "complete_multimodal_core.parquet").copy()
        tier_a.to_parquet(self.COLLECTIONS_DIR / "complete_multimodal_core.parquet", index=False)

        for bench_file in ["deceptive_opinion_spam.parquet", "ecommerce_fake_reviews.parquet", "synthetic_stress_test_cases.parquet"]:
            src_b = V15_DIR / "collections" / "isolated_benchmarks" / bench_file
            if src_b.exists():
                shutil.copy2(src_b, self.BENCHMARKS_DIR / bench_file)

        logger.info("Derived evidence and collection tables assembled successfully.")

    def assemble_evaluation_protocols(self) -> None:
        logger.info("Step 3: Assembling multi-protocol evaluation suite...")
        # Copy protocols from v1.5
        for p_num in range(1, 7):
            p_names = [
                "protocol_1_product_held_out",
                "protocol_2_variant_family_held_out",
                "protocol_3_reviewer_held_out",
                "protocol_4_image_cluster_held_out",
                "protocol_5_cross_listing_held_out",
                "protocol_6_temporal_evaluation",
            ]
            p_name = p_names[p_num - 1]
            src_p_dir = V15_DIR / "evaluation" / "protocols" / p_name
            tgt_p_dir = self.PROTOCOLS_DIR / p_name
            tgt_p_dir.mkdir(parents=True, exist_ok=True)
            for item in src_p_dir.iterdir():
                if item.is_file():
                    shutil.copy2(item, tgt_p_dir / item.name)

        # Root evaluation manifests
        for m_name in ["train_manifest.parquet", "validation_manifest.parquet", "test_manifest.parquet"]:
            shutil.copy2(V15_DIR / "evaluation" / m_name, self.EVALUATION_DIR / m_name)

        # Benchmark manifests
        for b_name in ["external_benchmark_manifest.parquet", "stress_test_manifest.parquet"]:
            src_bm = V15_DIR / "evaluation" / "benchmark_manifests" / b_name
            if src_bm.exists():
                shutil.copy2(src_bm, self.BENCHMARK_EVAL_DIR / b_name)

        logger.info("Evaluation protocols assembled successfully.")

    def assemble_manifests_and_metadata(self) -> None:
        logger.info("Step 4: Assembling manifests, drift baseline, and cryptographic signatures...")

        # Copy existing manifests
        for m_file in ["source_registry.parquet", "review_accounting.parquet", "matching_audit.parquet", "image_acquisition_manifest.csv"]:
            src_m = V15_DIR / "manifests" / m_file
            if src_m.exists():
                shutil.copy2(src_m, self.MANIFESTS_DIR / m_file)

        # Copy Flipkart 127 manifest
        fk_manifest = PROJECT_ROOT / "manifests" / "flipkart_127_image_target_manifest.csv"
        if fk_manifest.exists():
            shutil.copy2(fk_manifest, self.MANIFESTS_DIR / "flipkart_127_image_target_manifest.csv")

        # Copy NLP baseline results
        nlp_json = PROC_DIR / "nlp_baseline_results_v1_6.json"
        if nlp_json.exists():
            shutil.copy2(nlp_json, self.METADATA_DIR / "nlp_baseline_results.json")

        # Capture drift baseline snapshot
        prods = pd.read_parquet(self.ENTITIES_DIR / "products.parquet")
        prices = pd.read_parquet(self.EVIDENCE_DIR / "price_observations.parquet")
        revs = pd.read_parquet(self.EVIDENCE_DIR / "reviews.parquet")
        imgs = pd.read_parquet(self.EVIDENCE_DIR / "images.parquet")

        valid_prices = prices[prices["is_valid_price"] == True]["normalized_price_inr"].dropna()
        ratings = revs["rating"].dropna()

        drift_snapshot = {
            "snapshot_version": "v1.6_BASELINE_SNAPSHOT",
            "timestamp": "2026-11-04T10:00:00Z",
            "total_products": len(prods),
            "total_reviews": len(revs),
            "total_images": len(imgs),
            "total_prices": len(prices),
            "total_valid_prices": int(len(valid_prices)),
            "marketplace_counts": prods["marketplace"].value_counts().to_dict(),
            "modality_tier_counts": prods["modality_tier"].value_counts().to_dict(),
            "price_distribution_inr": {
                "mean": round(float(valid_prices.mean()), 2),
                "std": round(float(valid_prices.std()), 2),
                "median": round(float(valid_prices.median()), 2),
                "q25": round(float(np.percentile(valid_prices, 25)), 2),
                "q75": round(float(np.percentile(valid_prices, 75)), 2),
            },
            "rating_distribution": {
                "mean": round(float(ratings.mean()), 4),
                "std": round(float(ratings.std()), 4),
                "median": round(float(ratings.median()), 4),
            },
        }

        with open(self.METADATA_DIR / "drift_baseline_snapshot.json", "w", encoding="utf-8") as f:
            json.dump(drift_snapshot, f, indent=2)

        # Cryptographic Dataset Manifest (SHA-256)
        manifest_data = {
            "release_version": "v1.6",
            "release_status": "FROZEN",
            "certification_verdict": "CERTIFIED_WITH_LIMITATIONS",
            "total_products": len(prods),
            "total_reviews": len(revs),
            "total_images": len(imgs),
            "total_prices": len(prices),
            "tables": {},
        }

        # Index and hash all files
        for p in OUT_BASE.rglob("*"):
            if p.is_file() and p.name not in ["dataset_manifest.json", "release_metadata.json"]:
                rel_path = str(p.relative_to(OUT_BASE)).replace("\\", "/")
                h = hashlib.sha256()
                with open(p, "rb") as f:
                    for chunk in iter(lambda: f.read(65536), b""):
                        h.update(chunk)
                manifest_data["tables"][rel_path] = {
                    "sha256": h.hexdigest(),
                    "size_bytes": p.stat().st_size,
                }

        manifest_path = self.MANIFESTS_DIR / "dataset_manifest.json"
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest_data, f, indent=2)

        meta_path = self.METADATA_DIR / "release_metadata.json"
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(manifest_data, f, indent=2)

        logger.info(f"Cryptographic dataset manifest created with {len(manifest_data['tables'])} indexed artifacts.")

    def run(self) -> None:
        logger.info("=== Starting Marketplace Trust Dataset v1.6 Assembly ===")
        self.ensure_directory_structure()
        self.assemble_entities_and_evidence()
        self.assemble_derived_evidence()
        self.assemble_evaluation_protocols()
        self.assemble_manifests_and_metadata()
        logger.info("=== Marketplace Trust Dataset v1.6 Assembled Successfully! ===")


def main() -> None:
    builder = MarketplaceTrustDatasetBuilderV16()
    builder.run()


if __name__ == "__main__":
    main()
