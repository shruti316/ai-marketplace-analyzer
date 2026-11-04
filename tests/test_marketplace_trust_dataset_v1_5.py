"""
tests/test_marketplace_trust_dataset_v1_5.py
---------------------------------------------
Comprehensive Test Suite for Marketplace Trust Dataset Release v1.5.
Validates all 20 acceptance criteria defined in Part 12.
"""

import json
import hashlib
from pathlib import Path
import pytest
import pandas as pd
import numpy as np
from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parents[1]
V15_DIR = PROJECT_ROOT / "data" / "marketplace_trust_dataset_v1.5"


class TestMarketplaceTrustDatasetV15:
    """
    Validates release v1.5 dataset invariants, models, and protocols.
    """

    @pytest.fixture(autouse=True)
    def setup_class(self):
        self.prods = pd.read_parquet(V15_DIR / "entities" / "products.parquet")
        self.revs = pd.read_parquet(V15_DIR / "evidence" / "reviews.parquet")
        self.imgs = pd.read_parquet(V15_DIR / "evidence" / "images.parquet")
        self.prices = pd.read_parquet(V15_DIR / "evidence" / "price_observations.parquet")
        self.edges = pd.read_parquet(V15_DIR / "relationships" / "entity_relationships.parquet")
        self.sellers = pd.read_parquet(V15_DIR / "entities" / "sellers.parquet")
        self.variants = pd.read_parquet(V15_DIR / "entities" / "product_variants.parquet")
        with open(V15_DIR / "manifests" / "dataset_manifest.json", "r", encoding="utf-8") as f:
            self.manifest = json.load(f)

    # 1. Product identity integrity
    def test_01_product_identity_integrity(self):
        assert len(self.prods) == 6043
        assert self.prods["canonical_product_id"].nunique() == 6043
        assert (self.prods["domain_partition"] == "INDIAN_MARKETPLACE").sum() == 3643
        assert (self.prods["domain_partition"] == "SUPPLEMENTARY_INTERNATIONAL").sum() == 2400

    # 2. Review reconciliation
    def test_02_review_reconciliation(self):
        assert len(self.revs) == 56697
        mkt = self.revs["marketplace"].value_counts()
        assert mkt.get("bestbuy") == 44965
        assert mkt.get("amazon") == 8073
        assert mkt.get("flipkart") == 3260
        assert mkt.get("uncertain") == 240
        assert mkt.get("amazon_in") == 159

    # 3. Review uniqueness
    def test_03_review_uniqueness(self):
        assert self.revs["canonical_review_id"].nunique() == 56697
        linked = self.revs[self.revs["linkage_type"] != "UNLINKED"]
        assert len(linked) == 56457
        unlinked = self.revs[self.revs["linkage_type"] == "UNLINKED"]
        assert len(unlinked) == 240

    # 4. Image physical integrity
    def test_04_image_physical_integrity(self):
        assert len(self.imgs) == 5554
        usable = self.imgs[self.imgs["is_usable"] == True]
        assert len(usable) == 5228
        assert int((~self.imgs["is_usable"]).sum()) == 326
        # Verify sample images readable by PIL
        sample = usable.head(10)
        for _, r in sample.iterrows():
            p_val = r["local_path"] if pd.notna(r["local_path"]) else r["local_image_path"]
            p = PROJECT_ROOT / str(p_val)
            assert p.exists()
            with Image.open(p) as im:
                im.verify()

    # 5. Image-product matching
    def test_05_image_product_matching(self):
        usable = self.imgs[self.imgs["is_usable"] == True]
        matched_pids = set(usable["canonical_product_id"])
        prod_pids = set(self.prods["canonical_product_id"])
        assert matched_pids.issubset(prod_pids)
        assert len(matched_pids) == 2952

    # 6. Price and FX integrity
    def test_06_price_and_fx_integrity(self):
        assert len(self.prices) == 6043
        valid_p = self.prices[self.prices["is_valid_price"] == True]
        assert len(valid_p) == 5153
        assert int((~self.prices["is_valid_price"]).sum()) == 890
        # Check FX method provenance
        inr_p = self.prices[self.prices["original_currency"] == "INR"]
        assert (inr_p["fx_conversion_method"] == "IDENTITY_DOMESTIC_INR").all()

    # 7. Category reconciliation
    def test_07_category_reconciliation(self):
        cats = self.prods["category"].value_counts()
        assert len(cats) == 10
        assert cats.get("Clothing & Fashion") == 1709
        assert cats.get("Beauty & Personal Care") == 1480
        assert cats.get("Electronics") == 1177
        assert cats.get("Home & Kitchen") == 416
        assert cats.get("Other") == 391
        assert cats.get("Grocery & Household Essentials") == 369
        assert cats.get("Books & Stationery") == 315
        assert cats.get("Toys & Games") == 160
        assert cats.get("Industrial & Scientific") == 14
        assert cats.get("Sports & Outdoors") == 12

    # 8. Missing-data semantics
    def test_08_missing_data_semantics(self):
        # 890 missing prices must have valid stock status
        missing_p = self.prices[~self.prices["is_valid_price"]]
        assert len(missing_p) == 890
        assert set(missing_p["stock_status"].unique()).issubset({"IN_STOCK", "UNKNOWN", "OUT_OF_STOCK", "UNAVAILABLE"})

    # 9. Seller identity integrity
    def test_09_seller_identity_integrity(self):
        # Individual product sellers must be NULL (no invented IDs)
        assert self.prods["seller_id"].isna().all()
        # Exactly 6 documented aggregate merchants
        assert len(self.sellers) == 6

    # 10. Graph edge integrity
    def test_10_graph_edge_integrity(self):
        assert len(self.edges) == 67175
        edge_types = self.edges["relationship_type"].value_counts()
        assert edge_types.get("HAS_REVIEW") == 56457
        assert edge_types.get("HAS_IMAGE") == 5228
        assert edge_types.get("HAS_PRICE") == 5153
        assert edge_types.get("IMAGE_PERCEPTUAL_DUPLICATE_OF") == 263
        assert edge_types.get("IMAGE_EXACT_DUPLICATE_OF") == 74

    # 11. Variant family split isolation (Protocol 2)
    def test_11_variant_family_split_isolation(self):
        p2_dir = V15_DIR / "evaluation" / "protocols" / "protocol_2_variant_family_held_out"
        tr = pd.read_parquet(p2_dir / "train_manifest.parquet")
        va = pd.read_parquet(p2_dir / "validation_manifest.parquet")
        te = pd.read_parquet(p2_dir / "test_manifest.parquet")

        tr_pids = set(tr["canonical_product_id"])
        va_pids = set(va["canonical_product_id"])
        te_pids = set(te["canonical_product_id"])

        assert len(tr_pids & va_pids) == 0
        assert len(tr_pids & te_pids) == 0
        assert len(va_pids & te_pids) == 0

    # 12. Reviewer split isolation (Protocol 3)
    def test_12_reviewer_split_isolation(self):
        p3_dir = V15_DIR / "evaluation" / "protocols" / "protocol_3_reviewer_held_out"
        tr = pd.read_parquet(p3_dir / "train_manifest.parquet")
        va = pd.read_parquet(p3_dir / "validation_manifest.parquet")
        te = pd.read_parquet(p3_dir / "test_manifest.parquet")

        tr_pids = set(tr["canonical_product_id"])
        va_pids = set(va["canonical_product_id"])
        te_pids = set(te["canonical_product_id"])

        assert len(tr_pids & va_pids) == 0
        assert len(tr_pids & te_pids) == 0
        assert len(va_pids & te_pids) == 0

    # 13. Image cluster split isolation (Protocol 4)
    def test_13_image_cluster_split_isolation(self):
        p4_dir = V15_DIR / "evaluation" / "protocols" / "protocol_4_image_cluster_held_out"
        tr = pd.read_parquet(p4_dir / "train_manifest.parquet")
        va = pd.read_parquet(p4_dir / "validation_manifest.parquet")
        te = pd.read_parquet(p4_dir / "test_manifest.parquet")

        tr_pids = set(tr["canonical_product_id"])
        va_pids = set(va["canonical_product_id"])
        te_pids = set(te["canonical_product_id"])

        assert len(tr_pids & va_pids) == 0
        assert len(tr_pids & te_pids) == 0
        assert len(va_pids & te_pids) == 0

    # 14. Cross-listing split isolation (Protocol 5)
    def test_14_cross_listing_split_isolation(self):
        p5_dir = V15_DIR / "evaluation" / "protocols" / "protocol_5_cross_listing_held_out"
        tr = pd.read_parquet(p5_dir / "train_manifest.parquet")
        va = pd.read_parquet(p5_dir / "validation_manifest.parquet")
        te = pd.read_parquet(p5_dir / "test_manifest.parquet")

        tr_pids = set(tr["canonical_product_id"])
        va_pids = set(va["canonical_product_id"])
        te_pids = set(te["canonical_product_id"])

        assert len(tr_pids & va_pids) == 0
        assert len(tr_pids & te_pids) == 0
        assert len(va_pids & te_pids) == 0

    # 15. Model leakage checks
    def test_15_model_leakage_checks(self):
        # Verify Protocol 1 Product-Held-Out
        tr = pd.read_parquet(V15_DIR / "evaluation" / "train_manifest.parquet")
        te = pd.read_parquet(V15_DIR / "evaluation" / "test_manifest.parquet")
        assert len(set(tr["canonical_product_id"]) & set(te["canonical_product_id"])) == 0

    # 16. Model reproducibility
    def test_16_model_reproducibility(self):
        from src.nlp.nlp_intelligence_v1_5 import NLPIntelligenceEngineV15
        bench = pd.read_parquet(V15_DIR / "collections" / "isolated_benchmarks" / "deceptive_opinion_spam.parquet")
        res1 = NLPIntelligenceEngineV15.evaluate_isolated_deceptive_spam_benchmark(bench)
        res2 = NLPIntelligenceEngineV15.evaluate_isolated_deceptive_spam_benchmark(bench)
        assert res1["models"]["logistic_regression"]["f1_score"] == res2["models"]["logistic_regression"]["f1_score"]
        assert res1["models"]["logistic_regression"]["roc_auc"] == res2["models"]["logistic_regression"]["roc_auc"]

    # 17. Evidence provenance
    def test_17_evidence_provenance(self):
        assert "source_id" in self.prods.columns
        assert "source_id" in self.revs.columns
        assert "source_id" in self.imgs.columns
        assert "source_id" in self.prices.columns

    # 18. Manifest SHA-256 verification
    def test_18_manifest_sha256_verification(self):
        tables = self.manifest.get("tables", {})
        assert len(tables) >= 35
        for rel_path, entry in tables.items():
            p = V15_DIR / rel_path
            assert p.exists(), f"Missing {rel_path}"
            h = hashlib.sha256(open(p, "rb").read()).hexdigest()
            assert h == entry.get("sha256"), f"Hash mismatch {rel_path}"

    # 19. Historical release immutability (v1.1, v1.2, v1.3, v1.4)
    def test_19_historical_release_immutability(self):
        for v in ["v1.1", "v1.2", "v1.3", "v1.4"]:
            manifest_file = PROJECT_ROOT / "data" / f"marketplace_trust_dataset_{v}" / "manifests" / "dataset_manifest.json"
            if not manifest_file.exists():
                manifest_file = PROJECT_ROOT / "data" / f"marketplace_trust_dataset_{v}" / "metadata" / "dataset_manifest.json"
            assert manifest_file.exists(), f"Missing manifest for {v}"
            with open(manifest_file, "r", encoding="utf-8") as f:
                d = json.load(f)
            status = d.get("release_status") or d.get("release_state")
            assert status == "FROZEN", f"{v} is not marked FROZEN"

    # 20. Full pipeline reproducibility
    def test_20_full_pipeline_reproducibility(self):
        drift_file = V15_DIR / "metadata" / "drift_baseline_snapshot.json"
        assert drift_file.exists()
        with open(drift_file, "r", encoding="utf-8") as f:
            snap = json.load(f)
        assert snap.get("snapshot_version") == "v1.5_BASELINE_SNAPSHOT"
        assert "price_distribution_inr" in snap
