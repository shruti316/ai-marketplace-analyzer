"""
tests/test_marketplace_trust_dataset_v1_4.py
---------------------------------------------
Formal pytest test suite verifying all invariants, constraints, and release criteria
for Marketplace Trust Dataset (v1.4).
"""

import os
import json
import hashlib
from pathlib import Path
import pytest
import pandas as pd
import numpy as np

DATASET_DIR = Path("data/marketplace_trust_dataset_v1.4")
ENTITIES_DIR = DATASET_DIR / "entities"
EVIDENCE_DIR = DATASET_DIR / "evidence"
RELATIONSHIPS_DIR = DATASET_DIR / "relationships"
DERIVED_DIR = DATASET_DIR / "derived_evidence"
COLLECTIONS_DIR = DATASET_DIR / "collections"
BENCHMARKS_DIR = COLLECTIONS_DIR / "isolated_benchmarks"
EVALUATION_DIR = DATASET_DIR / "evaluation"
BENCHMARK_EVAL_DIR = EVALUATION_DIR / "benchmark_manifests"
MANIFESTS_DIR = DATASET_DIR / "manifests"
METADATA_DIR = DATASET_DIR / "metadata"

PROTECTED_HASHES = {
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


def sha256_of_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


class TestMarketplaceTrustDatasetV12:
    """Formal test class for v1.2 Release."""

    def test_directory_structure_exists(self):
        """Verify Part 15 normalized directory structure."""
        assert ENTITIES_DIR.exists()
        assert EVIDENCE_DIR.exists()
        assert RELATIONSHIPS_DIR.exists()
        assert DERIVED_DIR.exists()
        assert COLLECTIONS_DIR.exists()
        assert BENCHMARKS_DIR.exists()
        assert EVALUATION_DIR.exists()
        assert BENCHMARK_EVAL_DIR.exists()
        assert MANIFESTS_DIR.exists()
        assert METADATA_DIR.exists()

    def test_products_master_counts_and_ratio(self):
        """Verify 6,043 products and 60.28% Indian / 39.72% Supplementary ratio."""
        df = pd.read_parquet(ENTITIES_DIR / "products.parquet")
        assert len(df) == 6043
        assert df["canonical_product_id"].nunique() == 6043

        ind = df[df["domain_partition"] == "INDIAN_MARKETPLACE"]
        supp = df[df["domain_partition"] == "SUPPLEMENTARY_INTERNATIONAL"]
        assert len(ind) == 3643
        assert len(supp) == 2400
        assert round(len(ind) / len(df) * 100, 2) == 60.28

        # Marketplace distributions
        counts = df["marketplace"].value_counts().to_dict()
        assert counts["amazon_in"] == 1500
        assert counts["flipkart"] == 1143
        assert counts["myntra"] == 1000
        assert counts["amazon"] == 1020
        assert counts["bestbuy"] == 249
        assert counts["walmart"] == 1131

        # Currencies
        assert (ind["currency"] == "INR").all()
        assert (supp["currency"] == "USD").all()

        # seller_id strictly null
        assert df["seller_id"].isna().all()

    def test_sellers_and_observations(self):
        """Verify 6 documented platform merchants and observations."""
        sellers = pd.read_parquet(ENTITIES_DIR / "sellers.parquet")
        sobs = pd.read_parquet(EVIDENCE_DIR / "seller_observations.parquet")
        assert len(sellers) == 6
        assert len(sobs) == 6
        assert set(sobs["seller_id"]) == set(sellers["seller_id"])
        assert sellers["seller_id"].nunique() == 6

        # Verification states
        verified = sellers[sellers["verification_status"] == "VERIFIED_FIRST_PARTY"]
        assert len(verified) == 1
        assert verified.iloc[0]["seller_id"] == "SELLER_AGG_BESTBUY"

    def test_product_variants(self):
        """Verify variant mapping table."""
        variants = pd.read_parquet(ENTITIES_DIR / "product_variants.parquet")
        assert len(variants) >= 500
        assert variants["variant_id"].nunique() == len(variants)

        prods = pd.read_parquet(ENTITIES_DIR / "products.parquet")
        assert set(variants["canonical_product_id"]).issubset(set(prods["canonical_product_id"]))

    def test_reviews_master_counts_and_reconciliation(self):
        """Verify 56,697 reviews with 100% retention and 0 filtered."""
        df = pd.read_parquet(EVIDENCE_DIR / "reviews.parquet")
        assert len(df) == 56697
        assert df["canonical_review_id"].nunique() == 56697

        mkt = df["marketplace"].value_counts().to_dict()
        assert mkt["bestbuy"] == 44965
        assert mkt["amazon"] == 8073
        assert mkt["flipkart"] == 3260
        assert mkt["uncertain"] == 240
        assert mkt["amazon_in"] == 159

        # Total Indian domain reviews: 3,260 + 240 + 159 = 3,659
        ind_revs = df[df["domain_partition"] == "INDIAN_MARKETPLACE"]
        assert len(ind_revs) == 3659

        # Total Supplementary reviews: 44,965 + 8,073 = 53,038
        supp_revs = df[df["domain_partition"] == "SUPPLEMENTARY_INTERNATIONAL"]
        assert len(supp_revs) == 53038

        # Unlinked genuine reviews: exactly 240
        unlinked = df[df["linkage_type"] == "UNLINKED"]
        assert len(unlinked) == 240

        # Review accounting table
        acc = pd.read_parquet(MANIFESTS_DIR / "review_accounting.parquet")
        assert len(acc) == 5
        assert acc["original_input_count"].sum() == 56697
        assert acc["retained_records"].sum() == 56697
        assert acc["filtered_records"].sum() == 0

    def test_images_master_and_gold_recovery(self):
        """Verify 5,554 image records and physical disk presence for all 300 Gold products."""
        df = pd.read_parquet(EVIDENCE_DIR / "images.parquet")
        assert len(df) == 5554
        assert df["image_id"].nunique() == 5554

        usable = df[df["is_usable"] == True]
        failed = df[df["is_usable"] == False]
        assert len(usable) == 5228
        assert len(failed) == 326

        # Gold 300 images
        gold_imgs = df[df["image_id"].str.startswith("IMG_GOLD_")]
        assert len(gold_imgs) == 300

        # Verify all 300 Gold image files physically exist on disk
        for _, r in gold_imgs.iterrows():
            assert Path(r["local_path"]).exists(), f"Missing file: {r['local_path']}"

    def test_price_observations_and_stock_semantics(self):
        """Verify 6,043 price observations and honest missing price handling."""
        df = pd.read_parquet(EVIDENCE_DIR / "price_observations.parquet")
        assert len(df) == 6043
        assert df["price_observation_id"].nunique() == 6043

        valid = df[df["is_valid_price"] == True]
        invalid = df[df["is_valid_price"] == False]
        assert len(valid) == 5153
        assert len(invalid) == 890

        # Stock status semantics
        assert set(df["stock_status"].unique()).issubset({"IN_STOCK", "UNKNOWN", "OUT_OF_STOCK"})
        assert (df["observation_type"] == "STATIC_CRAWL_SNAPSHOT").all()

    def test_entity_relationships_and_graph(self):
        """Verify graph edges ontology and referential integrity."""
        edges = pd.read_parquet(RELATIONSHIPS_DIR / "entity_relationships.parquet")
        assert len(edges) >= 60000
        assert edges["relationship_id"].nunique() == len(edges)

        has_img = edges[edges["relationship_type"] == "HAS_IMAGE"]
        has_rev = edges[edges["relationship_type"] == "HAS_REVIEW"]
        has_prc = edges[edges["relationship_type"] == "HAS_PRICE"]
        assert len(has_img) == 5228
        assert len(has_rev) == 56457
        assert len(has_prc) == 5153

    def test_derived_evidence_feature_stores(self):
        """Verify derived feature tables."""
        rf = pd.read_parquet(DERIVED_DIR / "review_quality_features.parquet")
        imf = pd.read_parquet(DERIVED_DIR / "image_integrity_features.parquet")
        pf = pd.read_parquet(DERIVED_DIR / "price_anomaly_features.parquet")
        xm = pd.read_parquet(DERIVED_DIR / "cross_modal_evidence.parquet")

        assert len(rf) == 56697
        assert len(imf) == 5554
        assert len(pf) == 5153
        assert len(xm) >= 1500

    def test_complete_multimodal_core_tier_a(self):
        """Verify Tier A contains exactly 305 products (5 Indian + 300 Supplementary)."""
        core = pd.read_parquet(COLLECTIONS_DIR / "complete_multimodal_core.parquet")
        assert len(core) == 305

        ind_core = pd.read_parquet(COLLECTIONS_DIR / "indian_complete_multimodal.parquet")
        assert len(ind_core) == 5

        supp_coll = pd.read_parquet(COLLECTIONS_DIR / "international_supplementary.parquet")
        assert len(supp_coll) == 2400

        tier_b = pd.read_parquet(COLLECTIONS_DIR / "partial_modalities.parquet")
        assert len(tier_b) == 5738

        # Disjoint and exhaustive
        assert len(core) + len(tier_b) == 6043
        assert len(set(core["canonical_product_id"]).intersection(set(tier_b["canonical_product_id"]))) == 0

    def test_evaluation_splits_and_zero_leakage(self):
        """Verify ~70/15/15 splits, zero product ID overlap, and zero image cluster leakage."""
        train = pd.read_parquet(EVALUATION_DIR / "train_manifest.parquet")
        val = pd.read_parquet(EVALUATION_DIR / "validation_manifest.parquet")
        test = pd.read_parquet(EVALUATION_DIR / "test_manifest.parquet")

        assert len(train) + len(val) + len(test) == 6043
        assert len(train) == 4230
        assert len(val) == 906
        assert len(test) == 907

        p_train = set(train["canonical_product_id"])
        p_val = set(val["canonical_product_id"])
        p_test = set(test["canonical_product_id"])

        # Zero Product ID overlap
        assert len(p_train.intersection(p_val)) == 0
        assert len(p_train.intersection(p_test)) == 0
        assert len(p_val.intersection(p_test)) == 0

        # Zero Duplicate Image Cluster Leakage
        images = pd.read_parquet(EVIDENCE_DIR / "images.parquet")
        edges = pd.read_parquet(RELATIONSHIPS_DIR / "entity_relationships.parquet")
        dup_edges = edges[edges["relationship_type"].isin(["IMAGE_EXACT_DUPLICATE_OF", "IMAGE_PERCEPTUAL_DUPLICATE_OF"])]
        img_to_prod = dict(zip(images["image_id"], images["canonical_product_id"]))

        split_map = {pid: "TRAIN" for pid in p_train}
        split_map.update({pid: "VAL" for pid in p_val})
        split_map.update({pid: "TEST" for pid in p_test})

        for _, edge in dup_edges.iterrows():
            p1 = img_to_prod.get(edge["source_entity_id"])
            p2 = img_to_prod.get(edge["target_entity_id"])
            if p1 and p2 and p1 in split_map and p2 in split_map:
                assert split_map[p1] == split_map[p2], f"Cluster leakage between {p1} and {p2}"

    def test_isolated_benchmarks_integrity(self):
        """Verify segregated external benchmarks and synthetic stress cases."""
        dec = pd.read_parquet(BENCHMARKS_DIR / "deceptive_opinion_spam.parquet")
        fake = pd.read_parquet(BENCHMARKS_DIR / "ecommerce_fake_reviews.parquet")
        stress = pd.read_parquet(BENCHMARKS_DIR / "synthetic_stress_test_cases.parquet")

        assert len(dec) == 1600
        assert len(fake) == 40526
        assert len(stress) == 5

    def test_protected_baselines_16_bit_perfect(self):
        """Verify all 16 protected baseline files are 100% bit-perfect."""
        for path_str, exp_hash in PROTECTED_HASHES.items():
            p = Path(path_str)
            assert p.exists(), f"Missing baseline file: {path_str}"
            act_hash = sha256_of_file(p)
            assert act_hash == exp_hash, f"Baseline hash altered for {path_str}!"

    def test_v1_1_release_immutability(self):
        """Verify v1.1 frozen release manifest remains completely unchanged."""
        v11_manifest = Path("data/marketplace_trust_dataset_v1.1/metadata/dataset_manifest.json")
        assert v11_manifest.exists()
        with open(v11_manifest, "r", encoding="utf-8") as f:
            data = json.load(f)
        assert data.get("version") in ["1.1.0", "v1.1", "1.1"]
        assert data.get("release_state") == "FROZEN"


def test_v1_2_release_immutability():
    """Verifies that historical release v1.2 is preserved, immutable, and FROZEN."""
    v12_manifest_path = Path("data/marketplace_trust_dataset_v1.2/manifests/dataset_manifest.json")
    assert v12_manifest_path.exists(), "v1.2 dataset_manifest.json missing!"
    with open(v12_manifest_path, "r", encoding="utf-8") as f:
        meta = json.load(f)
    assert meta.get("release_version") == "v1.2", "v1.2 version mutated!"
    assert meta.get("release_status") == "FROZEN", "v1.2 release status not FROZEN!"
    assert meta.get("certification_verdict") == "CERTIFIED_WITH_LIMITATIONS", "v1.2 verdict mutated!"


def test_fx_reference_table_and_rbi_benchmarks():
    """Verifies that evidence/fx_conversion_rates.parquet exists with documented RBI benchmarks."""
    fx_path = EVIDENCE_DIR / "fx_conversion_rates.parquet"
    assert fx_path.exists(), "fx_conversion_rates.parquet missing!"
    df = pd.read_parquet(fx_path)
    assert len(df) >= 9, f"Expected at least 9 FX records, found {len(df)}"
    assert (df["exchange_rate"] > 0).all(), "Non-positive FX rate detected"
    assert (df["rate_source"] == "RBI_REFERENCE_RATE").all(), "Non-RBI rate source detected"


def test_evaluation_splits_zero_leakage_protocol2_variants():
    """Verifies that Protocol 2 (Variant-Family-Held-Out) achieves exact zero variant parent group leakage."""
    var_tr = pd.read_parquet(DATASET_DIR / "evaluation" / "protocols" / "protocol_variant_family_held_out" / "train_manifest.parquet")
    var_va = pd.read_parquet(DATASET_DIR / "evaluation" / "protocols" / "protocol_variant_family_held_out" / "validation_manifest.parquet")
    var_te = pd.read_parquet(DATASET_DIR / "evaluation" / "protocols" / "protocol_variant_family_held_out" / "test_manifest.parquet")
    
    assert len(var_tr) + len(var_va) + len(var_te) == 6043, "Protocol 2 split count != 6043"
    
    var_df = pd.read_parquet(ENTITIES_DIR / "product_variants.parquet")
    g_tr = set(var_df[var_df["canonical_product_id"].isin(set(var_tr["canonical_product_id"]))]["parent_group_id"])
    g_va = set(var_df[var_df["canonical_product_id"].isin(set(var_va["canonical_product_id"]))]["parent_group_id"])
    g_te = set(var_df[var_df["canonical_product_id"].isin(set(var_te["canonical_product_id"]))]["parent_group_id"])
    
    assert len(g_tr & g_va) == 0, f"Variant leakage Train-Val: {len(g_tr & g_va)}"
    assert len(g_tr & g_te) == 0, f"Variant leakage Train-Test: {len(g_tr & g_te)}"
    assert len(g_va & g_te) == 0, f"Variant leakage Val-Test: {len(g_va & g_te)}"


def test_evaluation_splits_zero_leakage_protocol3_reviewers():
    """Verifies that Protocol 3 (Reviewer-Held-Out) achieves exact zero named reviewer leakage."""
    rev_tr = pd.read_parquet(DATASET_DIR / "evaluation" / "protocols" / "protocol_reviewer_held_out" / "train_manifest.parquet")
    rev_va = pd.read_parquet(DATASET_DIR / "evaluation" / "protocols" / "protocol_reviewer_held_out" / "validation_manifest.parquet")
    rev_te = pd.read_parquet(DATASET_DIR / "evaluation" / "protocols" / "protocol_reviewer_held_out" / "test_manifest.parquet")
    
    assert len(rev_tr) + len(rev_va) + len(rev_te) == 6043, "Protocol 3 split count != 6043"
    
    rev_df = pd.read_parquet(EVIDENCE_DIR / "reviews.parquet")
    u_tr = set(rev_df[rev_df["canonical_product_id"].isin(set(rev_tr["canonical_product_id"]))]["reviewer_id"].dropna())
    u_va = set(rev_df[rev_df["canonical_product_id"].isin(set(rev_va["canonical_product_id"]))]["reviewer_id"].dropna())
    u_te = set(rev_df[rev_df["canonical_product_id"].isin(set(rev_te["canonical_product_id"]))]["reviewer_id"].dropna())
    
    assert len(u_tr & u_va) == 0, f"Reviewer leakage Train-Val: {len(u_tr & u_va)}"
    assert len(u_tr & u_te) == 0, f"Reviewer leakage Train-Test: {len(u_tr & u_te)}"
    assert len(u_va & u_te) == 0, f"Reviewer leakage Val-Test: {len(u_va & u_te)}"


def test_v1_3_release_immutability():
    """Verifies that historical release v1.3 is preserved, immutable, and FROZEN."""
    v13_manifest_path = Path("data/marketplace_trust_dataset_v1.3/manifests/dataset_manifest.json")
    assert v13_manifest_path.exists(), "v1.3 dataset_manifest.json missing!"
    with open(v13_manifest_path, "r", encoding="utf-8") as f:
        meta = json.load(f)
    assert meta.get("release_version") == "v1.3", "v1.3 version mutated!"
    assert meta.get("release_status") == "FROZEN", "v1.3 release status not FROZEN!"
    assert meta.get("certification_verdict") == "CERTIFIED_WITH_LIMITATIONS", "v1.3 verdict mutated!"
