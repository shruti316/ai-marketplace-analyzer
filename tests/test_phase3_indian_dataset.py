"""
tests/test_phase3_indian_dataset.py
-----------------------------------
Formal Pytest Suite for Phase 3 Indian Marketplace Dataset Expansion.

Verifies:
1. Deliverable existence and metadata contracts.
2. Product integrity (3,643 products, 100% Indian marketplaces, 100% INR, PK uniqueness).
3. Review integrity (3,500 reviews, 3,260 confirmed linked, 240 uncertain unlinked, 0 broken FKs).
4. Review product match partitions (3,260 EXACT_MATCH, 240 UNMATCHED, 0 ambiguous).
5. Image integrity (5,034 images, 4,708 usable, 0 orphan images, physical files exist).
6. Multimodal truthfulness (complete_multimodal has 0 rows, schema-identical).
7. Bit-perfect preservation of all 16 protected baseline artifacts.
"""

import os
import json
import hashlib
import pandas as pd
import pytest

DATA_DIR = "data/indian_marketplace"
PHASE3_DIR = os.path.join(DATA_DIR, "phase3")
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")

PROTECTED_BASELINE_HASHES = {
    # 10 Canonical & Curated Baselines
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
    # 6 Phase 2 Artifacts
    "data/indian_marketplace/processed/indian_products.parquet": "a8ce91c897fa6639f2bee06b54fdefbf8524d6de497f9b3a4dcd878732ecc53b",
    "data/indian_marketplace/processed/indian_reviews.parquet": "cf1a3c7f3a0758bcbefec983355e862b1cb142bfd78abee63d3462c79f52ed62",
    "data/indian_marketplace/processed/indian_reviews_linked.parquet": "0bcebae7e37734406076c0176f56216030659f4f091cdd777ea0be59e2a3ffa8",
    "data/indian_marketplace/processed/indian_images.parquet": "f605ae7aa29aba550900aaadd5771fe4193168bffc09412ab5bb4e6c4ac18499",
    "data/indian_marketplace/processed/indian_complete_multimodal.parquet": "b052def824cfae44dcbb862ca42d49b87cf537a24e8aa90663e2ed8ee79c410b",
    "data/indian_marketplace/processed/indian_dataset_metadata.json": "fb8b9aaaaafc88ec828e2d067aee988e25449da7961efc01d48f422f2299b534",
}


@pytest.fixture(scope="module")
def products_df():
    path = os.path.join(PHASE3_DIR, "products.parquet")
    assert os.path.exists(path), f"Missing {path}"
    return pd.read_parquet(path)


@pytest.fixture(scope="module")
def reviews_df():
    path = os.path.join(PHASE3_DIR, "reviews.parquet")
    assert os.path.exists(path), f"Missing {path}"
    return pd.read_parquet(path)


@pytest.fixture(scope="module")
def matches_df():
    path = os.path.join(PHASE3_DIR, "review_product_matches.parquet")
    assert os.path.exists(path), f"Missing {path}"
    return pd.read_parquet(path)


@pytest.fixture(scope="module")
def images_df():
    path = os.path.join(PHASE3_DIR, "images.parquet")
    assert os.path.exists(path), f"Missing {path}"
    return pd.read_parquet(path)


@pytest.fixture(scope="module")
def multimodal_df():
    path = os.path.join(PHASE3_DIR, "complete_multimodal.parquet")
    assert os.path.exists(path), f"Missing {path}"
    return pd.read_parquet(path)


@pytest.fixture(scope="module")
def metadata_dict():
    path = os.path.join(PHASE3_DIR, "dataset_metadata.json")
    assert os.path.exists(path), f"Missing {path}"
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


class TestDeliverableExistence:
    """Verify that all Phase 3 deliverables exist on disk."""

    def test_tables_exist(self):
        for name in [
            "products.parquet",
            "reviews.parquet",
            "review_product_matches.parquet",
            "images.parquet",
            "complete_multimodal.parquet",
            "dataset_metadata.json",
        ]:
            p = os.path.join(PHASE3_DIR, name)
            assert os.path.exists(p), f"Missing file: {p}"
            assert os.path.getsize(p) > 0, f"Empty file: {p}"


class TestProductIntegrity:
    """Verify Phase 3 expanded product catalog integrity."""

    def test_product_count(self, products_df):
        assert len(products_df) == 3643

    def test_primary_key(self, products_df):
        assert products_df["canonical_product_id"].notna().all()
        assert products_df["canonical_product_id"].is_unique

    def test_indian_marketplaces_only(self, products_df):
        allowed = {"amazon_in", "flipkart", "myntra"}
        assert set(products_df["marketplace"].unique()).issubset(allowed)
        assert (products_df["country"] == "IN").all()
        assert (products_df["currency"] == "INR").all()

    def test_marketplace_counts(self, products_df):
        counts = products_df["marketplace"].value_counts().to_dict()
        assert counts["amazon_in"] == 1500
        assert counts["flipkart"] == 1143
        assert counts["myntra"] == 1000

    def test_pricing_and_stock(self, products_df):
        assert products_df["price_valid"].sum() == 3623
        allowed_stock = {"IN_STOCK", "OUT_OF_STOCK", "UNKNOWN"}
        assert set(products_df["stock_status"].unique()).issubset(allowed_stock)

    def test_text_attributes_non_empty(self, products_df):
        assert (products_df["product_title"].str.strip().str.len() > 0).all()
        assert (products_df["brand"].str.strip().str.len() > 0).all()
        assert (products_df["category"].str.strip().str.len() > 0).all()


class TestReviewIntegrity:
    """Verify Phase 3 review linkages and provenance."""

    def test_review_count(self, reviews_df):
        assert len(reviews_df) == 3500

    def test_primary_key(self, reviews_df):
        assert reviews_df["review_id"].notna().all()
        assert reviews_df["review_id"].is_unique

    def test_provenance_split(self, reviews_df):
        counts = reviews_df["provenance_status"].value_counts().to_dict()
        assert counts["CONFIRMED_FLIPKART"] == 3260
        assert counts["UNCERTAIN_INDIAN_MARKETPLACE"] == 240

    def test_linkage_counts(self, reviews_df):
        assert reviews_df["is_linked"].sum() == 3260
        assert (~reviews_df["is_linked"]).sum() == 240

    def test_foreign_key_integrity(self, reviews_df, products_df):
        linked = reviews_df[reviews_df["is_linked"]]
        prod_ids = set(products_df["canonical_product_id"])
        broken = set(linked["canonical_product_id"]) - prod_ids
        assert len(broken) == 0

    def test_unlinked_null_product_id(self, reviews_df):
        unlinked = reviews_df[~reviews_df["is_linked"]]
        assert unlinked["canonical_product_id"].isna().all()

    def test_review_text_and_ratings(self, reviews_df):
        assert (reviews_df["rating"] >= 1.0).all() and (reviews_df["rating"] <= 5.0).all()
        assert (reviews_df["review_text"].str.strip().str.len() > 0).all()


class TestReviewProductMatches:
    """Verify Phase 3 review match partitions and audit records."""

    def test_match_count(self, matches_df):
        assert len(matches_df) == 3500

    def test_match_partitions(self, matches_df):
        counts = matches_df["match_partition"].value_counts().to_dict()
        assert counts.get("EXACT_MATCH") == 3260
        assert counts.get("UNMATCHED") == 240
        assert counts.get("AMBIGUOUS_MATCH", 0) == 0

    def test_foreign_key_integrity(self, matches_df, products_df):
        exact = matches_df[matches_df["match_partition"] == "EXACT_MATCH"]
        prod_ids = set(products_df["canonical_product_id"])
        broken = set(exact["canonical_product_id"]) - prod_ids
        assert len(broken) == 0

    def test_confidence_scores(self, matches_df):
        exact = matches_df[matches_df["match_partition"] == "EXACT_MATCH"]
        assert (exact["confidence_score"] == 1.0).all()
        unmatched = matches_df[matches_df["match_partition"] == "UNMATCHED"]
        assert (unmatched["confidence_score"] == 0.0).all()


class TestImageIntegrity:
    """Verify Phase 3 image records and physical files."""

    def test_image_count(self, images_df):
        assert len(images_df) == 5034

    def test_usable_images_count(self, images_df):
        assert images_df["is_usable"].sum() == 4708

    def test_foreign_key_integrity(self, images_df, products_df):
        prod_ids = set(products_df["canonical_product_id"])
        broken = set(images_df["canonical_product_id"]) - prod_ids
        assert len(broken) == 0

    def test_physical_file_existence(self, images_df):
        usable = images_df[images_df["is_usable"]]
        for path in usable["local_path"]:
            assert os.path.exists(path), f"Missing physical image file: {path}"


class TestMultimodalTruthfulness:
    """Verify complete multimodal dataset scientific truthfulness."""

    def test_multimodal_zero_rows(self, multimodal_df):
        assert len(multimodal_df) == 0

    def test_schema_matches_products(self, multimodal_df, products_df):
        assert list(multimodal_df.columns) == list(products_df.columns)


class TestProtectedBaselines:
    """Verify bit-perfect preservation of all protected baseline artifacts."""

    @pytest.mark.parametrize("path,expected_hash", list(PROTECTED_BASELINE_HASHES.items()))
    def test_baseline_hash(self, path, expected_hash):
        assert os.path.exists(path), f"Baseline file missing: {path}"
        actual = hashlib.sha256(open(path, "rb").read()).hexdigest()
        assert actual == expected_hash, f"Hash mismatch for {path}: expected {expected_hash}, got {actual}"
