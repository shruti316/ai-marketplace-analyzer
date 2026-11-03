"""
tests/test_multimodal_dataset.py
--------------------------------
Pytest Suite for the Normalized Multimodal Dataset Architecture.

Verifies:
1. Table existence and metadata contracts under data/indian_marketplace/multimodal/.
2. Product Master normalization, attributes JSON, and honest null seller_id.
3. Review Master normalization, language detection, and referential foreign keys.
4. Image Master enrichment (SHA-256, perceptual dHash, physical file existence).
5. Price Observations normalization (timestamped snapshot observations).
6. Sellers Master honest modeling (aggregate platform merchant entities).
7. Entity Relationships graph topology and edge referential integrity.
8. Complete Multimodal scientific truthfulness (0 rows).
9. Bit-perfect preservation of all 16 protected baseline artifacts.
"""

import os
import json
import hashlib
import pandas as pd
import pytest

DATA_DIR = "data/indian_marketplace"
MULTIMODAL_DIR = os.path.join(DATA_DIR, "multimodal")
MANIFEST_DIR = "reports/multimodal_dataset_audit"

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
    path = os.path.join(MULTIMODAL_DIR, "products.parquet")
    assert os.path.exists(path)
    return pd.read_parquet(path)


@pytest.fixture(scope="module")
def reviews_df():
    path = os.path.join(MULTIMODAL_DIR, "reviews.parquet")
    assert os.path.exists(path)
    return pd.read_parquet(path)


@pytest.fixture(scope="module")
def images_df():
    path = os.path.join(MULTIMODAL_DIR, "images.parquet")
    assert os.path.exists(path)
    return pd.read_parquet(path)


@pytest.fixture(scope="module")
def price_obs_df():
    path = os.path.join(MULTIMODAL_DIR, "price_observations.parquet")
    assert os.path.exists(path)
    return pd.read_parquet(path)


@pytest.fixture(scope="module")
def sellers_df():
    path = os.path.join(MULTIMODAL_DIR, "sellers.parquet")
    assert os.path.exists(path)
    return pd.read_parquet(path)


@pytest.fixture(scope="module")
def relationships_df():
    path = os.path.join(MULTIMODAL_DIR, "entity_relationships.parquet")
    assert os.path.exists(path)
    return pd.read_parquet(path)


@pytest.fixture(scope="module")
def source_reg_df():
    path = os.path.join(MULTIMODAL_DIR, "source_registry.parquet")
    assert os.path.exists(path)
    return pd.read_parquet(path)


@pytest.fixture(scope="module")
def multimodal_df():
    path = os.path.join(MULTIMODAL_DIR, "complete_multimodal.parquet")
    assert os.path.exists(path)
    return pd.read_parquet(path)


class TestMultimodalDeliverables:
    def test_tables_exist(self):
        for name in [
            "products.parquet",
            "reviews.parquet",
            "images.parquet",
            "price_observations.parquet",
            "sellers.parquet",
            "entity_relationships.parquet",
            "source_registry.parquet",
            "complete_multimodal.parquet",
            "dataset_metadata.json"
        ]:
            p = os.path.join(MULTIMODAL_DIR, name)
            assert os.path.exists(p), f"Missing table: {p}"
            assert os.path.getsize(p) > 0, f"Empty table: {p}"

    def test_manifest_exists(self):
        p = os.path.join(MANIFEST_DIR, "image_acquisition_manifest.csv")
        assert os.path.exists(p)
        assert os.path.getsize(p) > 0


class TestProductMaster:
    def test_product_count(self, products_df):
        assert len(products_df) == 3643

    def test_primary_key(self, products_df):
        assert products_df["product_id"].notna().all()
        assert products_df["product_id"].is_unique

    def test_indian_guardrails(self, products_df):
        assert (products_df["country"] == "IN").all()
        assert (products_df["currency"] == "INR").all()
        assert set(products_df["marketplace"].unique()).issubset({"amazon_in", "flipkart", "myntra"})

    def test_seller_id_is_null(self, products_df):
        assert products_df["seller_id"].isna().all()

    def test_attributes_json_valid(self, products_df):
        for val in products_df["product_attributes"]:
            parsed = json.loads(val)
            assert isinstance(parsed, dict)


class TestReviewMaster:
    def test_review_count(self, reviews_df):
        assert len(reviews_df) == 3500

    def test_primary_key(self, reviews_df):
        assert reviews_df["review_id"].notna().all()
        assert reviews_df["review_id"].is_unique

    def test_linkage_partitioning(self, reviews_df):
        assert reviews_df["product_id"].notna().sum() == 3260
        assert reviews_df["product_id"].isna().sum() == 240

    def test_foreign_key_integrity(self, reviews_df, products_df):
        linked = reviews_df[reviews_df["product_id"].notna()]
        prod_ids = set(products_df["product_id"])
        broken = set(linked["product_id"]) - prod_ids
        assert len(broken) == 0

    def test_language_tags(self, reviews_df):
        assert set(reviews_df["language"].unique()).issubset({"en", "hi-Latn"})


class TestImageMaster:
    def test_image_count(self, images_df):
        assert len(images_df) == 5034

    def test_usable_images_count(self, images_df):
        assert images_df["is_usable"].sum() == 4708

    def test_hash_enrichment(self, images_df):
        usable = images_df[images_df["is_usable"]]
        assert (usable["sha256"].str.len() == 64).all()
        assert (usable["perceptual_hash"].str.len() == 16).all()

    def test_physical_file_integrity(self, images_df):
        usable = images_df[images_df["is_usable"]]
        for p in usable["local_image_path"]:
            assert os.path.exists(p), f"Missing image: {p}"

    def test_foreign_key_integrity(self, images_df, products_df):
        prod_ids = set(products_df["product_id"])
        broken = set(images_df["product_id"]) - prod_ids
        assert len(broken) == 0


class TestPriceObservations:
    def test_observation_count(self, price_obs_df):
        assert len(price_obs_df) == 3643

    def test_primary_key(self, price_obs_df):
        assert price_obs_df["price_observation_id"].is_unique

    def test_foreign_key_integrity(self, price_obs_df, products_df):
        prod_ids = set(products_df["product_id"])
        broken = set(price_obs_df["product_id"]) - prod_ids
        assert len(broken) == 0


class TestSellersMaster:
    def test_sellers_count(self, sellers_df):
        assert len(sellers_df) == 3

    def test_aggregate_provenance(self, sellers_df):
        assert (sellers_df["provenance_status"] == "AGGREGATE_PLATFORM_ENTITY").all()


class TestEntityRelationships:
    def test_relationship_count(self, relationships_df):
        assert len(relationships_df) >= 8000

    def test_edge_types(self, relationships_df):
        types = set(relationships_df["relationship_type"].unique())
        assert types.issubset({"HAS_IMAGE", "HAS_REVIEW", "IMAGE_EXACT_DUPLICATE_OF"})

    def test_product_foreign_keys(self, relationships_df, products_df):
        prod_edges = relationships_df[relationships_df["source_entity_type"] == "product"]
        prod_ids = set(products_df["product_id"])
        broken = set(prod_edges["source_entity_id"]) - prod_ids
        assert len(broken) == 0


class TestCompleteMultimodal:
    def test_zero_rows(self, multimodal_df):
        assert len(multimodal_df) == 0

    def test_schema_matches(self, multimodal_df, products_df):
        assert list(multimodal_df.columns) == list(products_df.columns)


class TestProtectedBaselines:
    @pytest.mark.parametrize("path,expected_hash", list(PROTECTED_BASELINE_HASHES.items()))
    def test_baseline_hash(self, path, expected_hash):
        assert os.path.exists(path), f"Missing: {path}"
        actual = hashlib.sha256(open(path, "rb").read()).hexdigest()
        assert actual == expected_hash, f"Hash mismatch for {path}"
