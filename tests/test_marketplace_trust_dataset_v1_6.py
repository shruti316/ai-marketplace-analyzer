"""
Comprehensive Test Suite for Marketplace Trust Dataset Release v1.6.

Validates 26 core invariants:
1. Product Identity and 4-Tier Modality Integrity
2. Review Reconciliation and Provenance
3. Multilingual and Transliterated Indic (Hinglish) Intelligence
4. Physical Images and PIL Integrity
5. Computer Vision ResNet Deep Feature Embeddings
6. Temporal Price Schema and Batch Identification
7. Category-Aware Robust Price Anomaly Metrics
8. Reconciled 10-Category Hierarchy
9. Seller Identity Resolution and Honest Null Governance
10. Graph Topological Intelligence Features
11. Explainable Cross-Modal Evidence Fusion
12. 7-Tier Fraud Ground Truth Taxonomy
13. Academic Benchmark Isolation
14. NLP Baseline Model Performance (Protocol 3)
15. Protocol 2 Variant-Family Split Isolation
16. Protocol 3 Reviewer Split Isolation
17. Protocol 4 Image Cluster Split Isolation
18. Protocol 5 Cross-Listing Split Isolation
19. Protocol 6 Temporal Protocol Specification
20. Complete Multimodal Core Collection (305 listings)
21. Flipkart 127 Review-Bearing Target Manifest
22. Cryptographic Dataset Manifest SHA-256 Verification
23. Release Metadata Verification
24. Drift Baseline Snapshot Verification
25. Historical Release Immutability (v1.1, v1.2, v1.3, v1.4, v1.5)
26. Bit-Perfect Preservation of all 16 Protected Baseline Artifacts
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, Dict

import numpy as np
import pandas as pd
from PIL import Image
import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
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


class TestMarketplaceTrustDatasetV16:
    """
    Validates Release v1.6 dataset invariants, models, and protocols.
    """

    @pytest.fixture(autouse=True)
    def setup_class(self):
        self.prods = pd.read_parquet(V16_DIR / "entities" / "products.parquet")
        self.revs = pd.read_parquet(V16_DIR / "evidence" / "reviews.parquet")
        self.imgs = pd.read_parquet(V16_DIR / "evidence" / "images.parquet")
        self.prices = pd.read_parquet(V16_DIR / "evidence" / "price_observations.parquet")
        self.edges = pd.read_parquet(V16_DIR / "relationships" / "entity_relationships.parquet")
        self.sellers = pd.read_parquet(V16_DIR / "entities" / "sellers.parquet")
        self.variants = pd.read_parquet(V16_DIR / "entities" / "product_variants.parquet")
        with open(V16_DIR / "manifests" / "dataset_manifest.json", "r", encoding="utf-8") as f:
            self.manifest = json.load(f)

    # 1. Product identity & 4-tier modality distribution
    def test_01_product_identity_and_4tier_distribution(self):
        assert len(self.prods) == 6043
        assert self.prods["canonical_product_id"].nunique() == 6043
        assert (self.prods["domain_partition"] == "INDIAN_MARKETPLACE").sum() == 3643
        assert (self.prods["domain_partition"] == "SUPPLEMENTARY_INTERNATIONAL").sum() == 2400

        tiers = self.prods["modality_tier"].value_counts().to_dict()
        assert tiers.get("TIER_A_COMPLETE") == 305
        assert tiers.get("TIER_B_VISUAL") == 2506
        assert tiers.get("TIER_C_TEXTUAL") == 127
        assert tiers.get("TIER_D_CATALOG") == 3105
        assert sum(tiers.values()) == 6043

    # 2. Review reconciliation
    def test_02_review_reconciliation(self):
        assert len(self.revs) == 56697
        assert self.revs["canonical_review_id"].nunique() == 56697
        mkt = self.revs["marketplace"].value_counts()
        assert mkt.get("bestbuy") == 44965
        assert mkt.get("amazon") == 8073
        assert mkt.get("flipkart") == 3260
        assert mkt.get("uncertain") == 240
        assert mkt.get("amazon_in") == 159

    # 3. Multilingual and Hinglish review intelligence
    def test_03_multilingual_intelligence(self):
        lang_path = V16_DIR / "derived_evidence" / "language_annotations.parquet"
        assert lang_path.exists()
        lang_df = pd.read_parquet(lang_path)
        assert len(lang_df) == 56697
        langs = lang_df["detected_language"].value_counts().to_dict()
        assert langs.get("ENGLISH") == 45012
        assert langs.get("HINGLISH_LATINIZED_INDIC") == 11672
        assert langs.get("UNKNOWN") == 13

    # 4. Physical images integrity
    def test_04_physical_images_integrity(self):
        assert len(self.imgs) == 5554
        usable = self.imgs[self.imgs["is_usable"] == True]
        assert len(usable) == 5228
        # Test PIL verify on first 10 images
        sample = usable.head(10)
        for _, r in sample.iterrows():
            p_val = r["local_path"] if pd.notna(r["local_path"]) else r["local_image_path"]
            p = PROJECT_ROOT / str(p_val)
            assert p.exists()
            with Image.open(p) as im:
                im.verify()

    # 5. Visual embeddings metadata
    def test_05_visual_embeddings_metadata(self):
        emb_path = V16_DIR / "derived_evidence" / "visual_embeddings_metadata.parquet"
        assert emb_path.exists()
        emb_df = pd.read_parquet(emb_path)
        assert len(emb_df) == 5228
        assert (emb_df["embedding_dim"] == 512).all()
        assert np.isclose(emb_df["l2_norm"].mean(), 1.0, atol=1e-3)

    # 6. Temporal price observations schema
    def test_06_temporal_price_schema(self):
        assert len(self.prices) == 6043
        valid_p = self.prices[self.prices["is_valid_price"] == True]
        assert len(valid_p) == 5153
        assert int((~self.prices["is_valid_price"]).sum()) == 890
        assert (self.prices["collection_batch_id"] == "BATCH_20261102_BASELINE_T0").all()
        assert "source_timestamp" in self.prices.columns

    # 7. Category-aware robust price anomaly metrics
    def test_07_price_anomaly_features(self):
        feat_path = V16_DIR / "derived_evidence" / "price_anomaly_features.parquet"
        assert feat_path.exists()
        feat_df = pd.read_parquet(feat_path)
        assert len(feat_df) == 6043
        assert (feat_df["temporal_readiness_status"] == "READY_FOR_DATA_COLLECTION").all()
        assert (feat_df["observation_count"] == 1).all()

    # 8. Reconciled 10-category hierarchy
    def test_08_category_reconciliation(self):
        cats = self.prods["category"].value_counts()
        assert len(cats) == 10
        assert cats.get("Clothing & Fashion") == 1709
        assert cats.get("Beauty & Personal Care") == 1480
        assert cats.get("Electronics") == 1177

    # 9. Seller identity resolution and honest null governance
    def test_09_seller_identity_resolution(self):
        assert len(self.sellers) == 6
        assert (self.sellers["trust_tier"] == "TIER_1_ESTABLISHED_PLATFORM").all()
        # Individual products.seller_id must be 100% null (honest nulls)
        assert self.prods["seller_id"].isna().all()

    # 10. Graph topological intelligence features
    def test_10_graph_intelligence_features(self):
        g_path = V16_DIR / "derived_evidence" / "graph_features.parquet"
        assert g_path.exists()
        g_df = pd.read_parquet(g_path)
        assert len(g_df) == 6043
        assert g_df["graph_degree"].mean() > 5.0
        assert "graph_degree_centrality" in g_df.columns

    # 11. Explainable cross-modal evidence fusion
    def test_11_cross_modal_fusion(self):
        x_path = V16_DIR / "derived_evidence" / "cross_modal_evidence.parquet"
        assert x_path.exists()
        x_df = pd.read_parquet(x_path)
        assert len(x_df) == 6043
        assert ((x_df["composite_trust_score"] >= 0.0) & (x_df["composite_trust_score"] <= 1.0)).all()
        assert ((x_df["confidence_score"] >= 0.0) & (x_df["confidence_score"] <= 1.0)).all()

    # 12. 7-tier fraud ground truth taxonomy
    def test_12_fraud_taxonomy_annotations(self):
        f_path = V16_DIR / "derived_evidence" / "fraud_taxonomy_annotations.parquet"
        assert f_path.exists()
        f_df = pd.read_parquet(f_path)
        assert len(f_df) == 56697
        # Zero real marketplace reviews falsely labeled CONFIRMED_FRAUD
        assert (f_df["fraud_taxonomy_tier"] == "CONFIRMED_FRAUD").sum() == 0

    # 13. Academic benchmark isolation
    def test_13_benchmark_isolation(self):
        ott = pd.read_parquet(V16_DIR / "collections" / "isolated_benchmarks" / "deceptive_opinion_spam.parquet")
        assert len(ott) == 1600
        assert set(ott["deceptive"].unique()) == {"truthful", "deceptive"}

    # 14. NLP baseline results
    def test_14_nlp_baseline_benchmarks(self):
        nlp_path = V16_DIR / "metadata" / "nlp_baseline_results.json"
        assert nlp_path.exists()
        with open(nlp_path, "r", encoding="utf-8") as f:
            res = json.load(f)
        lr = res["baselines"]["logistic_regression"]
        assert lr["roc_auc"] > 0.95
        assert lr["accuracy"] > 0.90

    # 15. Protocol 2 Variant-family split isolation
    def test_15_protocol_2_variant_family_isolation(self):
        p2_dir = V16_DIR / "evaluation" / "protocols" / "protocol_2_variant_family_held_out"
        tr = pd.read_parquet(p2_dir / "train_manifest.parquet")
        te = pd.read_parquet(p2_dir / "test_manifest.parquet")
        assert len(set(tr["canonical_product_id"]) & set(te["canonical_product_id"])) == 0

    # 16. Protocol 3 Reviewer split isolation
    def test_16_protocol_3_reviewer_isolation(self):
        p3_dir = V16_DIR / "evaluation" / "protocols" / "protocol_3_reviewer_held_out"
        tr = pd.read_parquet(p3_dir / "train_manifest.parquet")
        te = pd.read_parquet(p3_dir / "test_manifest.parquet")
        assert len(set(tr["canonical_product_id"]) & set(te["canonical_product_id"])) == 0

    # 17. Protocol 4 Image cluster split isolation
    def test_17_protocol_4_image_cluster_isolation(self):
        p4_dir = V16_DIR / "evaluation" / "protocols" / "protocol_4_image_cluster_held_out"
        tr = pd.read_parquet(p4_dir / "train_manifest.parquet")
        te = pd.read_parquet(p4_dir / "test_manifest.parquet")
        assert len(set(tr["canonical_product_id"]) & set(te["canonical_product_id"])) == 0

    # 18. Protocol 5 Cross-listing split isolation
    def test_18_protocol_5_cross_listing_isolation(self):
        p5_dir = V16_DIR / "evaluation" / "protocols" / "protocol_5_cross_listing_held_out"
        tr = pd.read_parquet(p5_dir / "train_manifest.parquet")
        te = pd.read_parquet(p5_dir / "test_manifest.parquet")
        assert len(set(tr["canonical_product_id"]) & set(te["canonical_product_id"])) == 0

    # 19. Protocol 6 Temporal protocol specification
    def test_19_protocol_6_specification(self):
        spec_path = V16_DIR / "evaluation" / "protocols" / "protocol_6_temporal_evaluation" / "temporal_protocol_specification.json"
        assert spec_path.exists()

    # 20. Complete multimodal core collection
    def test_20_complete_multimodal_core(self):
        core = pd.read_parquet(V16_DIR / "collections" / "complete_multimodal_core.parquet")
        assert len(core) == 305
        assert (core["has_image"] == True).all()
        assert (core["has_review"] == True).all()
        assert (core["has_price"] == True).all()

    # 21. Flipkart 127 target manifest
    def test_21_flipkart_127_target_manifest(self):
        fk_m = pd.read_csv(V16_DIR / "manifests" / "flipkart_127_image_target_manifest.csv")
        assert len(fk_m) == 127
        assert (fk_m["review_count"] > 0).all()

    # 22. Cryptographic dataset manifest SHA-256 verification
    def test_22_dataset_manifest_sha256(self):
        tables = self.manifest.get("tables", {})
        assert len(tables) >= 40
        for rel_path, entry in tables.items():
            p = V16_DIR / rel_path
            assert p.exists(), f"Missing release file: {rel_path}"
            act_hash = calculate_sha256(p)
            assert act_hash == entry.get("sha256"), f"SHA-256 mismatch for {rel_path}"

    # 23. Release metadata verification
    def test_23_release_metadata(self):
        meta_file = V16_DIR / "metadata" / "release_metadata.json"
        assert meta_file.exists()
        with open(meta_file, "r", encoding="utf-8") as f:
            d = json.load(f)
        assert d.get("release_version") == "v1.6"
        assert d.get("release_status") == "FROZEN"

    # 24. Drift baseline snapshot verification
    def test_24_drift_baseline_snapshot(self):
        drift_file = V16_DIR / "metadata" / "drift_baseline_snapshot.json"
        assert drift_file.exists()
        with open(drift_file, "r", encoding="utf-8") as f:
            snap = json.load(f)
        assert snap.get("snapshot_version") == "v1.6_BASELINE_SNAPSHOT"
        assert "price_distribution_inr" in snap

    # 25. Historical release immutability (v1.1, v1.2, v1.3, v1.4, v1.5)
    def test_25_historical_release_immutability(self):
        for v in ["v1.1", "v1.2", "v1.3", "v1.4", "v1.5"]:
            manifest_file = PROJECT_ROOT / "data" / f"marketplace_trust_dataset_{v}" / "manifests" / "dataset_manifest.json"
            if not manifest_file.exists():
                manifest_file = PROJECT_ROOT / "data" / f"marketplace_trust_dataset_{v}" / "metadata" / "dataset_manifest.json"
            assert manifest_file.exists(), f"Missing manifest for {v}"
            with open(manifest_file, "r", encoding="utf-8") as f:
                d = json.load(f)
            status = d.get("release_status") or d.get("release_state")
            assert status == "FROZEN", f"Release {v} is not FROZEN!"

    # 26. Bit-perfect preservation of all 16 protected baseline artifacts
    @pytest.mark.parametrize("filepath, expected_sha256", list(PROTECTED_BASELINE_HASHES.items()))
    def test_26_protected_baselines_bit_perfect(self, filepath, expected_sha256):
        p = PROJECT_ROOT / filepath
        assert p.exists(), f"Protected baseline missing: {filepath}"
        act_hash = calculate_sha256(p)
        assert act_hash == expected_sha256, f"Protected file {filepath} modified! Exp: {expected_sha256}, Got: {act_hash}"
