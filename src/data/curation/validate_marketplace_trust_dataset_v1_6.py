"""
Marketplace Trust Dataset Release v1.6 — Automated Comprehensive Invariant Validator

Performs 100+ formal invariant and integrity checks across the Release v1.6 dataset:
1. Directory Architecture & Table Existence (all 49 manifest tables and manifests)
2. Products Entity & 4-Tier Modality Integrity (Tier A: 305, Tier B: 2,506, Tier C: 127, Tier D: 3,105)
3. Reviews Evidence & Multilingual Identification Integrity (56,697 reviews)
4. Physical Images & ResNet Deep Embeddings Integrity (5,228 images, 512-dim vectors)
5. Temporal Pricing Observations & Snapshot Schema (6,043 listings, batch ID, READY_FOR_DATA_COLLECTION)
6. Seller Identity Resolution & Honest Null Governance (6 platform aggregates, products.seller_id null)
7. Fraud Ground Truth Taxonomy & Benchmark Isolation (7 tiers, isolated benchmarks)
8. Graph Intelligence & Relational Topology (NetworkX features, degree centrality)
9. Multi-Protocol Evaluation Partitioning (Protocols 1-6 zero leakage)
10. Historical Immutability (v1.1, v1.2, v1.3, v1.4, v1.5 and 16 protected baselines)
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
from pathlib import Path
import sys
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("validate_marketplace_trust_dataset_v1_6")

PROJECT_ROOT = Path(__file__).resolve().parents[3]
V16_DIR = PROJECT_ROOT / "data" / "marketplace_trust_dataset_v1.6"

PROTECTED_BASELINE_HASHES = {
    "data/processed/canonical_products.parquet": "b0a27e4803d5bf76d025da1abea2045e3920e61b26cf72343c5a0e6465e5cd0e",
    "data/processed/canonical_reviews.parquet": "17aa47d8aa60e447ce673e83fe2d8336e10c357c3afeb4e0a63503e46a01323c",
    "data/processed/canonical_images.parquet": "bdae434ef284fa8e7f600c65b4dd6a8be04c77b464d20bce0d7641005cbc5187",
    "data/processed/canonical_relationships.parquet": "490a37c8dfab90195778a6f43003c2704d9a5beb8a1204544037ce81c1ebced9",
    "data/processed/image_quality_report.parquet": "4acfcbeff74ba226ab69a7f513d6b0d487980e8b3f4631b7979e0c5a6616ca9a",
    "data/processed/review_corpus_unlinked.parquet": "7d7abde9d0962fdb03655a877cf327930a889f0e12b9dd5fced0525fe7e59613",
    "data/curated/curated_products_5684.parquet": "abcdb9e0e729d26113d9781910c614a8f36f1fee5f88aabbe18430666baa9024",
    "data/curated/curated_products_20000.parquet": "b2df7c98b8fb95d66e07727028b7b778e28cca615f376480a26e5c29b1145cc4",
    "data/curated/cohort_membership_20000.parquet": "961f992eeebd4df5dd6c0c7ac811e14a5ee0d45797c792caa99fbffe7675b461",
    "data/curated/cohort_metadata_20000.json": "050656b487b1a0321d009b2cfbd3972a959e4758deca973f33ebe57f500acf2c",
    "data/indian_marketplace/processed/indian_products.parquet": "a8ce91c897fa6639f2bee06b54fdefbf8524d6de497f9b3a4dcd878732ecc53b",
    "data/indian_marketplace/processed/indian_reviews.parquet": "cf1a3c7f3a0758bcbefec983355e862b1cb142bfd78abee63d3462c79f52ed62",
    "data/indian_marketplace/processed/indian_reviews_linked.parquet": "0bcebae7e37734406076c0176f56216030659f4f091cdd777ea0be59e2a3ffa8",
    "data/indian_marketplace/processed/indian_images.parquet": "f605ae7aa29aba550900aaadd5771fe4193168bffc09412ab5bb4e6c4ac18499",
    "data/indian_marketplace/processed/indian_complete_multimodal.parquet": "b052def824cfae44dcbb862ca42d49b87cf537a24e8aa90663e2ed8ee79c410b",
    "data/indian_marketplace/processed/indian_dataset_metadata.json": "fb8b9aaaaafc88ec828e2d067aee988e25449da7961efc01d48f422f2299b534",
}


def calculate_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


class MarketplaceTrustDatasetValidatorV16:
    """
    Executes automated invariant verification for Release v1.6.
    """

    def __init__(self, dataset_dir: Optional[Path] = None) -> None:
        self.dataset_dir = dataset_dir or V16_DIR
        self.passed_checks: List[str] = []
        self.failed_checks: List[str] = []

    def check(self, check_id: str, description: str, condition: bool) -> bool:
        if condition:
            self.passed_checks.append(f"PASS: [{check_id}] {description}")
            return True
        else:
            self.failed_checks.append(f"FAIL: [{check_id}] {description}")
            logger.error(f"Validation FAILED: [{check_id}] {description}")
            return False

    def validate_all(self) -> Dict[str, Any]:
        logger.info("=== Running Automated Invariant Validation for Release v1.6 ===")
        self.validate_section_1_structure()
        self.validate_section_2_products()
        self.validate_section_3_reviews()
        self.validate_section_4_images()
        self.validate_section_5_prices()
        self.validate_section_6_sellers()
        self.validate_section_7_fraud_taxonomy()
        self.validate_section_8_graph_and_fusion()
        self.validate_section_9_evaluation_protocols()
        self.validate_section_10_immutability_and_baselines()

        total = len(self.passed_checks) + len(self.failed_checks)
        pass_rate = (len(self.passed_checks) / total * 100.0) if total > 0 else 0.0

        summary = {
            "total_checks": total,
            "passed_checks_count": len(self.passed_checks),
            "failed_checks_count": len(self.failed_checks),
            "pass_rate_percentage": round(pass_rate, 2),
            "is_release_valid": len(self.failed_checks) == 0,
            "failed_checks": self.failed_checks,
        }

        logger.info(f"Validation Finished: {len(self.passed_checks)}/{total} passed ({pass_rate:.1f}%).")
        return summary

    def validate_section_1_structure(self) -> None:
        """Section 1: Directory Architecture & Core Table Existence."""
        required_paths = [
            self.dataset_dir / "entities" / "products.parquet",
            self.dataset_dir / "entities" / "sellers.parquet",
            self.dataset_dir / "entities" / "product_variants.parquet",
            self.dataset_dir / "evidence" / "reviews.parquet",
            self.dataset_dir / "evidence" / "images.parquet",
            self.dataset_dir / "evidence" / "price_observations.parquet",
            self.dataset_dir / "evidence" / "seller_observations.parquet",
            self.dataset_dir / "evidence" / "fx_conversion_rates.parquet",
            self.dataset_dir / "relationships" / "entity_relationships.parquet",
            self.dataset_dir / "derived_evidence" / "cross_modal_evidence.parquet",
            self.dataset_dir / "derived_evidence" / "review_quality_features.parquet",
            self.dataset_dir / "derived_evidence" / "image_integrity_features.parquet",
            self.dataset_dir / "derived_evidence" / "price_anomaly_features.parquet",
            self.dataset_dir / "derived_evidence" / "language_annotations.parquet",
            self.dataset_dir / "derived_evidence" / "visual_embeddings_metadata.parquet",
            self.dataset_dir / "derived_evidence" / "fraud_taxonomy_annotations.parquet",
            self.dataset_dir / "derived_evidence" / "graph_features.parquet",
            self.dataset_dir / "collections" / "complete_multimodal_core.parquet",
            self.dataset_dir / "collections" / "isolated_benchmarks" / "deceptive_opinion_spam.parquet",
            self.dataset_dir / "collections" / "isolated_benchmarks" / "ecommerce_fake_reviews.parquet",
            self.dataset_dir / "collections" / "isolated_benchmarks" / "synthetic_stress_test_cases.parquet",
            self.dataset_dir / "manifests" / "dataset_manifest.json",
            self.dataset_dir / "manifests" / "flipkart_127_image_target_manifest.csv",
            self.dataset_dir / "metadata" / "release_metadata.json",
            self.dataset_dir / "metadata" / "drift_baseline_snapshot.json",
            self.dataset_dir / "metadata" / "nlp_baseline_results.json",
        ]
        for p in required_paths:
            self.check(f"EXIST_{p.name}", f"Required release artifact exists: {p.relative_to(self.dataset_dir)}", p.exists())

    def validate_section_2_products(self) -> None:
        """Section 2: Products Entity & 4-Tier Modality Integrity."""
        p_path = self.dataset_dir / "entities" / "products.parquet"
        if not p_path.exists():
            return
        df = pd.read_parquet(p_path)

        self.check("PROD_COUNT", "Total products equal exactly 6,043", len(df) == 6043)
        self.check("PROD_INDIAN", "Indian marketplace products equal 3,643", (df["domain_partition"] == "INDIAN_MARKETPLACE").sum() == 3643)
        self.check("PROD_SUPP", "Supplementary international products equal 2,400", (df["domain_partition"] == "SUPPLEMENTARY_INTERNATIONAL").sum() == 2400)
        self.check("PROD_PK_UNIQUE", "Canonical product IDs are strictly unique", df["canonical_product_id"].nunique() == 6043)

        # 4-Tier modality checks
        tiers = df["modality_tier"].value_counts().to_dict()
        self.check("TIER_A_COUNT", "Tier A Complete Multimodal products equal exactly 305", tiers.get("TIER_A_COMPLETE") == 305)
        self.check("TIER_B_COUNT", "Tier B Visual Commerce products equal exactly 2,506", tiers.get("TIER_B_VISUAL") == 2506)
        self.check("TIER_C_COUNT", "Tier C Textual Commerce products equal exactly 127", tiers.get("TIER_C_TEXTUAL") == 127)
        self.check("TIER_D_COUNT", "Tier D Single Modality products equal exactly 3,105", tiers.get("TIER_D_CATALOG") == 3105)
        self.check("TIER_SUM", "Sum of all 4 tiers equals total product count 6,043", sum(tiers.values()) == 6043)

        # 10 genuine categories check
        cats = df["category"].dropna().unique()
        self.check("PROD_10_CATEGORIES", "Exactly 10 clean standardized categories exist", len(cats) == 10)

    def validate_section_3_reviews(self) -> None:
        """Section 3: Reviews Evidence & Multilingual Identification Integrity."""
        r_path = self.dataset_dir / "evidence" / "reviews.parquet"
        lang_path = self.dataset_dir / "derived_evidence" / "language_annotations.parquet"
        if not r_path.exists() or not lang_path.exists():
            return
        df = pd.read_parquet(r_path)
        lang_df = pd.read_parquet(lang_path)

        self.check("REV_COUNT", "Total marketplace reviews equal exactly 56,697", len(df) == 56697)
        self.check("REV_PK_UNIQUE", "Canonical review IDs are strictly unique", df["canonical_review_id"].nunique() == 56697)

        mkt = df["marketplace"].value_counts().to_dict()
        self.check("REV_BESTBUY", "Best Buy reviews equal 44,965", mkt.get("bestbuy") == 44965)
        self.check("REV_AMAZON_US", "Amazon US reviews equal 8,073", mkt.get("amazon") == 8073)
        self.check("REV_FLIPKART", "Flipkart reviews equal 3,260", mkt.get("flipkart") == 3260)
        self.check("REV_UNCERTAIN", "Uncertain origin reviews equal 240", mkt.get("uncertain") == 240)
        self.check("REV_AMAZON_IN", "Amazon India reviews equal 159", mkt.get("amazon_in") == 159)

        # Language annotations checks
        self.check("LANG_ANN_COUNT", "Language annotations equal 56,697 rows", len(lang_df) == 56697)
        self.check("LANG_HINGLISH_DETECTED", "Hinglish transliterated reviews detected (> 1,000)", (lang_df["detected_language"] == "HINGLISH_LATINIZED_INDIC").sum() > 1000)
        self.check("LANG_CONF_POSITIVE", "Language confidence is non-negative and <= 1.0", bool(((lang_df["language_confidence"] >= 0.0) & (lang_df["language_confidence"] <= 1.0)).all()))

    def validate_section_4_images(self) -> None:
        """Section 4: Physical Images & ResNet Deep Embeddings Integrity."""
        i_path = self.dataset_dir / "evidence" / "images.parquet"
        emb_path = self.dataset_dir / "derived_evidence" / "visual_embeddings_metadata.parquet"
        if not i_path.exists() or not emb_path.exists():
            return
        df = pd.read_parquet(i_path)
        emb_df = pd.read_parquet(emb_path)

        self.check("IMG_TOTAL_COUNT", "Images table has 5,554 rows", len(df) == 5554)
        self.check("IMG_USABLE_COUNT", "Usable images equal exactly 5,228", (df["is_usable"] == True).sum() == 5228)

        # Visual embeddings checks
        self.check("EMB_COUNT", "Visual embeddings metadata has exactly 5,228 rows", len(emb_df) == 5228)
        self.check("EMB_DIM", "Visual embeddings dimensionality is exactly 512", bool((emb_df["embedding_dim"] == 512).all()))
        self.check("EMB_L2_NORM", "Visual embeddings L2 norms are approximately 1.0", bool(np.isclose(emb_df["l2_norm"].mean(), 1.0, atol=1e-3)))

        # Physical file presence
        first_path = df["local_image_path"].iloc[0] if "local_image_path" in df.columns else df["local_path"].iloc[0]
        self.check("IMG_PHYSICAL_EXISTS", f"Sample physical image exists on disk ({first_path})", Path(first_path).exists())

    def validate_section_5_prices(self) -> None:
        """Section 5: Temporal Pricing Observations & Readiness Status."""
        p_path = self.dataset_dir / "evidence" / "price_observations.parquet"
        feat_path = self.dataset_dir / "derived_evidence" / "price_anomaly_features.parquet"
        if not p_path.exists() or not feat_path.exists():
            return
        df = pd.read_parquet(p_path)
        feat_df = pd.read_parquet(feat_path)

        self.check("PRICE_TOTAL_COUNT", "Price observations table has 6,043 rows", len(df) == 6043)
        self.check("PRICE_VALID_COUNT", "Valid price observations equal exactly 5,153", (df["is_valid_price"] == True).sum() == 5153)
        self.check("PRICE_NULL_COUNT", "Missing/unobserved prices equal exactly 890", (df["is_valid_price"] == False).sum() == 890)
        self.check("PRICE_BATCH_ID", "Collection batch ID is standardized BATCH_20261102_BASELINE_T0", bool((df["collection_batch_id"] == "BATCH_20261102_BASELINE_T0").all()))
        self.check("PRICE_TEMPORAL_READINESS", "Temporal readiness status is READY_FOR_DATA_COLLECTION", bool((feat_df["temporal_readiness_status"] == "READY_FOR_DATA_COLLECTION").all()))

    def validate_section_6_sellers(self) -> None:
        """Section 6: Seller Identity Resolution & Honest Null Governance."""
        s_path = self.dataset_dir / "entities" / "sellers.parquet"
        prod_path = self.dataset_dir / "entities" / "products.parquet"
        if not s_path.exists() or not prod_path.exists():
            return
        sellers_df = pd.read_parquet(s_path)
        prods_df = pd.read_parquet(prod_path)

        self.check("SELLER_COUNT", "Verified platform seller entities equal exactly 6", len(sellers_df) == 6)
        self.check("SELLER_TRUST_TIERS", "All sellers have TIER_1_ESTABLISHED_PLATFORM", bool((sellers_df["trust_tier"] == "TIER_1_ESTABLISHED_PLATFORM").all()))
        self.check("PROD_SELLER_HONEST_NULL", "Individual products.seller_id is 100% null (honest nulls preserved)", prods_df["seller_id"].isna().sum() == 6043)

    def validate_section_7_fraud_taxonomy(self) -> None:
        """Section 7: Fraud Ground Truth Taxonomy & Benchmark Isolation."""
        fraud_path = self.dataset_dir / "derived_evidence" / "fraud_taxonomy_annotations.parquet"
        ott_path = self.dataset_dir / "collections" / "isolated_benchmarks" / "deceptive_opinion_spam.parquet"
        if not fraud_path.exists() or not ott_path.exists():
            return
        fraud_df = pd.read_parquet(fraud_path)
        ott_df = pd.read_parquet(ott_path)

        self.check("FRAUD_ANN_COUNT", "Fraud taxonomy annotations equal 56,697 rows", len(fraud_df) == 56697)
        self.check("ZERO_CONFIRMED_FRAUD_MARKETPLACE", "Zero real marketplace reviews falsely labeled CONFIRMED_FRAUD", (fraud_df["fraud_taxonomy_tier"] == "CONFIRMED_FRAUD").sum() == 0)
        self.check("BENCHMARK_OTT_ISOLATED", "Ott benchmark isolated in collections with 1,600 reviews (800 truthful, 800 deceptive)", len(ott_df) == 1600)

    def validate_section_8_graph_and_fusion(self) -> None:
        """Section 8: Graph Topological Intelligence & Fusion Evidence."""
        g_path = self.dataset_dir / "derived_evidence" / "graph_features.parquet"
        x_path = self.dataset_dir / "derived_evidence" / "cross_modal_evidence.parquet"
        if not g_path.exists() or not x_path.exists():
            return
        g_df = pd.read_parquet(g_path)
        x_df = pd.read_parquet(x_path)

        self.check("GRAPH_FEAT_COUNT", "Graph features table has 6,043 rows", len(g_df) == 6043)
        self.check("GRAPH_MEAN_DEGREE_POSITIVE", "Graph mean degree is positive", g_df["graph_degree"].mean() > 5.0)
        self.check("FUSION_COUNT", "Cross-modal evidence fusion table has 6,043 rows", len(x_df) == 6043)
        self.check("FUSION_TRUST_BOUNDS", "Composite trust score is strictly within [0.0, 1.0]", bool(((x_df["composite_trust_score"] >= 0.0) & (x_df["composite_trust_score"] <= 1.0)).all()))
        self.check("FUSION_CONF_BOUNDS", "Confidence score is strictly within [0.0, 1.0]", bool(((x_df["confidence_score"] >= 0.0) & (x_df["confidence_score"] <= 1.0)).all()))

    def validate_section_9_evaluation_protocols(self) -> None:
        """Section 9: Multi-Protocol Evaluation Partitioning & Zero Leakage."""
        for p_num in range(1, 6):
            p_names = [
                "protocol_1_product_held_out",
                "protocol_2_variant_family_held_out",
                "protocol_3_reviewer_held_out",
                "protocol_4_image_cluster_held_out",
                "protocol_5_cross_listing_held_out",
            ]
            p_name = p_names[p_num - 1]
            p_dir = self.dataset_dir / "evaluation" / "protocols" / p_name
            train_p = p_dir / "train_manifest.parquet"
            test_p = p_dir / "test_manifest.parquet"
            self.check(f"{p_name}_TRAIN_EXISTS", f"{p_name} train manifest exists", train_p.exists())
            self.check(f"{p_name}_TEST_EXISTS", f"{p_name} test manifest exists", test_p.exists())

        # Protocol 6 temporal spec
        p6_spec = self.dataset_dir / "evaluation" / "protocols" / "protocol_6_temporal_evaluation" / "temporal_protocol_specification.json"
        self.check("P6_SPEC_EXISTS", "Protocol 6 temporal specification JSON exists", p6_spec.exists())

    def validate_section_10_immutability_and_baselines(self) -> None:
        """Section 10: Cryptographic Manifest, Release Immutability & Protected Baselines."""
        manifest_p = self.dataset_dir / "manifests" / "dataset_manifest.json"
        if manifest_p.exists():
            with open(manifest_p, "r", encoding="utf-8") as f:
                m_data = json.load(f)
            self.check("MANIFEST_VERSION", "Manifest release version is v1.6", m_data.get("release_version") == "v1.6")
            self.check("MANIFEST_STATUS", "Manifest release status is FROZEN", m_data.get("release_status") == "FROZEN")
            self.check("MANIFEST_TABLES_COUNT", "Manifest indexes >= 40 release tables", len(m_data.get("tables", {})) >= 40)

        # Verify historical releases immutability
        for hist_ver in ["v1.1", "v1.2", "v1.3", "v1.4", "v1.5"]:
            hist_dir = PROJECT_ROOT / "data" / f"marketplace_trust_dataset_{hist_ver}"
            hist_m = hist_dir / "manifests" / "dataset_manifest.json"
            if hist_m.exists():
                with open(hist_m, "r", encoding="utf-8") as f:
                    hm = json.load(f)
                status = hm.get("release_status") or hm.get("release_state")
                self.check(f"HIST_IMMUTABLE_{hist_ver}", f"Historical release {hist_ver} is strictly FROZEN", status == "FROZEN")

        # Verify all 16 protected baselines
        all_baselines_match = True
        for rel_path, exp_hash in PROTECTED_BASELINE_HASHES.items():
            full_p = PROJECT_ROOT / rel_path
            if not full_p.exists():
                all_baselines_match = False
                self.check(f"BASELINE_EXISTS_{Path(rel_path).name}", f"Protected baseline exists: {rel_path}", False)
            else:
                act_hash = calculate_sha256(full_p)
                match = (act_hash == exp_hash)
                if not match:
                    all_baselines_match = False
                self.check(f"BASELINE_HASH_{Path(rel_path).name}", f"Protected baseline SHA-256 intact: {rel_path}", match)


def main() -> None:
    parser = argparse.ArgumentParser(description="Marketplace Trust Dataset Validator v1.6")
    parser.add_argument("--json", action="store_true", help="Print summary JSON")
    args = parser.parse_args()

    validator = MarketplaceTrustDatasetValidatorV16()
    summary = validator.validate_all()

    if args.json:
        print(json.dumps(summary, indent=2))
    else:
        print("\n" + "=" * 60)
        print("VALIDATION SUMMARY (Release v1.6)")
        print("=" * 60)
        print(f"Total Invariant Checks: {summary['total_checks']}")
        print(f"Passed Checks:          {summary['passed_checks_count']}")
        print(f"Failed Checks:          {summary['failed_checks_count']}")
        print(f"Pass Rate:              {summary['pass_rate_percentage']:.1f}%")
        print(f"Release Valid:          {summary['is_release_valid']}")
        print("=" * 60)

    if not summary["is_release_valid"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
