"""
Tests for Phase 2 Indian Marketplace Dataset Integrity and AI Platform Data Foundation.

Validates:
1. Deliverable file existence and metadata contracts.
2. Indian marketplace exclusivity (strictly amazon_in, flipkart, myntra; country=IN, currency=INR).
3. Primary key uniqueness and non-nullness.
4. Referential integrity (zero orphan images, zero orphan reviews).
5. Expanded image recovery (1,500 Amazon IN + 932 Flipkart = 2,432 products with usable images).
6. Pricing, MRP, and stock-status enrichment.
7. Review integrity and multimodal truthfulness (0 false-positive links, 0 synthetic multimodal entities).
8. Bit-perfect preservation of protected baseline artifacts.
"""

import hashlib
import json
import os
import pandas as pd
import pytest

DATA_DIR = "data/indian_marketplace"
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")
RAW_IMAGES_DIR = os.path.join(DATA_DIR, "raw", "images")
AMAZON_IN_IMAGES_DIR = os.path.join(RAW_IMAGES_DIR, "amazon_in")

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
}


@pytest.fixture(scope="module")
def products_df():
    path = os.path.join(PROCESSED_DIR, "indian_products.parquet")
    assert os.path.exists(path), f"Missing {path}"
    return pd.read_parquet(path)


@pytest.fixture(scope="module")
def images_df():
    path = os.path.join(PROCESSED_DIR, "indian_images.parquet")
    assert os.path.exists(path), f"Missing {path}"
    return pd.read_parquet(path)


@pytest.fixture(scope="module")
def reviews_df():
    path = os.path.join(PROCESSED_DIR, "indian_reviews.parquet")
    assert os.path.exists(path), f"Missing {path}"
    return pd.read_parquet(path)


@pytest.fixture(scope="module")
def linked_reviews_df():
    path = os.path.join(PROCESSED_DIR, "indian_reviews_linked.parquet")
    assert os.path.exists(path), f"Missing {path}"
    return pd.read_parquet(path)


@pytest.fixture(scope="module")
def multimodal_df():
    path = os.path.join(PROCESSED_DIR, "indian_complete_multimodal.parquet")
    assert os.path.exists(path), f"Missing {path}"
    return pd.read_parquet(path)


@pytest.fixture(scope="module")
def metadata_dict():
    path = os.path.join(PROCESSED_DIR, "indian_dataset_metadata.json")
    assert os.path.exists(path), f"Missing {path}"
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


class TestDeliverableExistence:
    """Verify that all Phase 2 deliverables exist on disk."""

    def test_processed_tables_exist(self):
        for name in [
            "indian_products.parquet",
            "indian_images.parquet",
            "indian_reviews.parquet",
            "indian_reviews_linked.parquet",
            "indian_complete_multimodal.parquet",
            "indian_dataset_metadata.json",
        ]:
            p = os.path.join(PROCESSED_DIR, name)
            assert os.path.exists(p), f"Missing processed file: {p}"
            assert os.path.getsize(p) > 0, f"Empty file: {p}"

    def test_amazon_images_manifest_exists(self):
        manifest_path = os.path.join(AMAZON_IN_IMAGES_DIR, "amazon_india_images_manifest.parquet")
        assert os.path.exists(manifest_path)
        assert os.path.getsize(manifest_path) > 0

    def test_review_matching_audit_report_exists(self):
        report_path = "reports/indian_review_matching_audit.md"
        assert os.path.exists(report_path)
        assert os.path.getsize(report_path) > 0


class TestIndianExclusivityAndStructure:
    """Verify strictly Indian marketplace coverage, country, and currency defaults."""

    def test_product_count_and_allocation(self, products_df):
        assert len(products_df) == 3500
        counts = products_df["marketplace"].value_counts().to_dict()
        assert counts == {"amazon_in": 1500, "flipkart": 1000, "myntra": 1000}

    def test_foreign_marketplaces_excluded(self, products_df):
        foreign = {"amazon", "walmart", "bestbuy"}
        present = set(products_df["marketplace"].unique())
        assert present.isdisjoint(foreign), f"Foreign marketplaces detected: {present & foreign}"

    def test_country_and_currency(self, products_df):
        assert (products_df["country"] == "IN").all()
        assert (products_df["currency"] == "INR").all()

    def test_primary_key_uniqueness(self, products_df, images_df, reviews_df):
        assert products_df["canonical_product_id"].is_unique
        assert not products_df["canonical_product_id"].isna().any()

        assert images_df["image_id"].is_unique
        assert not images_df["image_id"].isna().any()

        assert reviews_df["review_id"].is_unique
        assert not reviews_df["review_id"].isna().any()


class TestReferentialIntegrity:
    """Verify foreign key integrity across tables."""

    def test_images_fk_referential_integrity(self, products_df, images_df):
        catalog_ids = set(products_df["canonical_product_id"])
        image_pids = set(images_df["canonical_product_id"])
        orphans = image_pids - catalog_ids
        assert len(orphans) == 0, f"Found {len(orphans)} orphan images"

    def test_linked_reviews_fk_referential_integrity(self, products_df, linked_reviews_df):
        if len(linked_reviews_df) > 0:
            catalog_ids = set(products_df["canonical_product_id"])
            review_pids = set(linked_reviews_df["canonical_product_id"])
            orphans = review_pids - catalog_ids
            assert len(orphans) == 0, f"Found {len(orphans)} orphan linked reviews"
        else:
            assert len(linked_reviews_df) == 0


class TestImageCoverageAndRecovery:
    """Verify recovery of Amazon India images and total usable image coverage."""

    def test_expanded_usable_image_counts(self, products_df, images_df):
        # 2,432 products with usable images
        assert products_df["has_usable_images"].sum() == 2432

        # Marketplace breakdown of usable images
        amz_usable = products_df[products_df["marketplace"] == "amazon_in"]["has_usable_images"].sum()
        fk_usable = products_df[products_df["marketplace"] == "flipkart"]["has_usable_images"].sum()
        myn_usable = products_df[products_df["marketplace"] == "myntra"]["has_usable_images"].sum()

        assert amz_usable == 1500
        assert fk_usable == 932
        assert myn_usable == 0

        # Total image records and usable image records
        assert len(images_df) == 5034
        assert images_df["is_usable"].sum() == 4708

    def test_amazon_images_manifest_integrity(self, products_df):
        manifest_path = os.path.join(AMAZON_IN_IMAGES_DIR, "amazon_india_images_manifest.parquet")
        manifest = pd.read_parquet(manifest_path)
        assert len(manifest) == 1500
        assert manifest["is_usable"].all()
        assert manifest["asin"].is_unique

        amz_prods = products_df[products_df["marketplace"] == "amazon_in"]
        assert set(manifest["canonical_product_id"]) == set(amz_prods["canonical_product_id"])

        # Check all 1,500 images physically exist on disk
        for _, row in manifest.iterrows():
            assert os.path.exists(row["local_path"]), f"Missing image: {row['local_path']}"


class TestPricingAndEnrichment:
    """Verify price, MRP, discount percentage, and stock status fields."""

    def test_valid_prices(self, products_df):
        valid_prices = products_df["price_valid"].sum()
        assert valid_prices == 3480
        assert (products_df.loc[products_df["price_valid"], "price"] > 0).all()

    def test_mrp_coverage_and_discounts(self, products_df):
        mrp_present = products_df["mrp"].notna().sum()
        assert mrp_present >= 3450, f"Expected >= 3450 MRP values, got {mrp_present}"

        # Check discount percentage bounds
        valid_discounts = products_df["discount_percentage"].dropna()
        assert (valid_discounts >= 0.0).all()
        assert (valid_discounts <= 100.0).all()

    def test_stock_status_enum_and_semantics(self, products_df):
        valid_statuses = {"IN_STOCK", "OUT_OF_STOCK", "UNKNOWN"}
        present = set(products_df["stock_status"].unique())
        assert present.issubset(valid_statuses)
        assert (products_df["stock_status"] != "").all()

        # Flipkart stock semantics verification:
        # Source lacks inventory/availability column; missing price must NOT mean OUT_OF_STOCK.
        fk_prods = products_df[products_df["marketplace"] == "flipkart"]
        assert (fk_prods["stock_status"] == "OUT_OF_STOCK").sum() == 0, (
            "Flipkart products must not be assigned OUT_OF_STOCK without explicit source evidence"
        )
        fk_missing_price = fk_prods[fk_prods["price"].isna()]
        assert len(fk_missing_price) == 5
        assert (fk_missing_price["stock_status"] == "UNKNOWN").all(), (
            "Flipkart products with missing price must be assigned UNKNOWN"
        )

        # Amazon India & Myntra explicit source mappings
        amz_prods = products_df[products_df["marketplace"] == "amazon_in"]
        assert (amz_prods["stock_status"] == "OUT_OF_STOCK").sum() == 10
        assert (amz_prods["stock_status"] == "IN_STOCK").sum() == 1490

        myn_prods = products_df[products_df["marketplace"] == "myntra"]
        assert (myn_prods["stock_status"] == "OUT_OF_STOCK").sum() == 410
        assert (myn_prods["stock_status"] == "IN_STOCK").sum() == 590


class TestReviewIntegrityAndMultimodalTruthfulness:
    """Verify review corpus preservation and honest multimodal counts."""

    def test_unlinked_reviews_preserved(self, reviews_df):
        assert len(reviews_df) == 3500
        assert (reviews_df["linkage_status"] == "UNLINKED_INDIAN_CORPUS").all()
        assert (reviews_df["is_linked"] == False).all()
        assert reviews_df["rejection_reason"].notna().all()
        assert (reviews_df["review_text"].str.len() > 0).all()

    def test_review_provenance_separation(self, reviews_df):
        # Provenance status column must exist and contain both confirmed and uncertain records
        assert "provenance_status" in reviews_df.columns
        statuses = set(reviews_df["provenance_status"].unique())
        assert statuses == {"CONFIRMED_FLIPKART", "UNCERTAIN_INDIAN_MARKETPLACE"}

        confirmed = reviews_df[reviews_df["provenance_status"] == "CONFIRMED_FLIPKART"]
        uncertain = reviews_df[reviews_df["provenance_status"] == "UNCERTAIN_INDIAN_MARKETPLACE"]

        assert len(confirmed) == 3260
        assert len(uncertain) == 240
        assert len(confirmed) + len(uncertain) == 3500

        # Confirmed Flipkart records must have marketplace == 'flipkart'
        assert (confirmed["marketplace"] == "flipkart").all()
        # Uncertain records must have marketplace == 'uncertain'
        assert (uncertain["marketplace"] == "uncertain").all()

    def test_linked_reviews_is_empty(self, linked_reviews_df):
        # Must contain 0 rows (0 false-positive links fabricated)
        assert len(linked_reviews_df) == 0

    def test_complete_multimodal_is_empty(self, multimodal_df, products_df):
        # Must contain 0 rows (0 complete multimodal products claimed without genuine reviews)
        assert len(multimodal_df) == 0
        assert products_df["is_complete_multimodal"].sum() == 0


class TestProtectedBaselinesPreserved:
    """Verify that all protected baseline files remain bit-perfect."""

    @pytest.mark.parametrize("filepath, expected_sha256", PROTECTED_BASELINE_HASHES.items())
    def test_baseline_hash_intact(self, filepath, expected_sha256):
        assert os.path.exists(filepath), f"Protected baseline file missing: {filepath}"
        hasher = hashlib.sha256()
        with open(filepath, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        actual_sha256 = hasher.hexdigest()
        assert actual_sha256 == expected_sha256, (
            f"Protected file {filepath} was modified!\n"
            f"Expected: {expected_sha256}\n"
            f"Actual:   {actual_sha256}"
        )
