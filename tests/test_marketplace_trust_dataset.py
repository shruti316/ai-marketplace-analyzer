"""
tests/test_marketplace_trust_dataset.py
---------------------------------------
Pytest Test Suite for Marketplace Trust Evidence Dataset v1.0.

Verifies schema compliance, entity referential integrity, cross-modal relationship
coverage, multi-tier evidence partitioning, and cryptographic baseline protection.
"""

import os
import json
import hashlib
import pytest
import numpy as np
import pandas as pd
from pathlib import Path
from PIL import Image

BASE_DIR = Path("data/marketplace_trust_dataset")
ENTITIES_DIR = BASE_DIR / "entities"
EVIDENCE_DIR = BASE_DIR / "evidence"
RELATIONSHIPS_DIR = BASE_DIR / "evidence_relationships"
COLLECTIONS_DIR = BASE_DIR / "collections"
BENCHMARKS_DIR = COLLECTIONS_DIR / "isolated_benchmarks"
METADATA_DIR = BASE_DIR / "metadata"
MANIFESTS_DIR = BASE_DIR / "manifests"

PROTECTED_BASELINE_HASHES = {
    'data/processed/canonical_products.parquet': 'b0a27e4803d5bf76d025da1abea2045e3920e61b26cf72343c5a0e6465e5cd0e',
    'data/processed/canonical_reviews.parquet': '17aa47d8aa60e447ce673e83fe2d8336e10c357c3afeb4e0a63503e46a01323c',
    'data/processed/canonical_images.parquet': 'bdae434ef284fa8e7f600c65b4dd6a8be04c77b464d20bce0d7641005cbc5187',
    'data/processed/canonical_relationships.parquet': '490a37c8dfab90195778a6f43003c2704d9a5beb8a1204544037ce81c1ebced9',
    'data/processed/image_quality_report.parquet': '4acfcbeff74ba226ab69a7f513d6b0d487980e8b3f4631b7979e0c5a6616ca9a',
    'data/processed/review_corpus_unlinked.parquet': '7d7abde9d0962fdb03655a877cf327930a889f0e12b9dd5fced0525fe7e59613',
    'data/curated/curated_products_5684.parquet': 'abcdb9e0e729d26113d9781910c614a8f36f1fee5f88aabbe18430666baa9024',
    'data/curated/curated_products_20000.parquet': 'b2df7c98b8fb95d66e07727028b7b778e28cca615f376480a26e5c29b1145cc4',
    'data/curated/cohort_membership_20000.parquet': '961f992eeebd4df5dd6c0c7ac811e14a5ee0d45797c792caa99fbffe7675b461',
    'data/curated/cohort_metadata_20000.json': '050656b487b1a0321d009b2cfbd3972a959e4758deca973f33ebe57f500acf2c',
    'data/indian_marketplace/processed/indian_products.parquet': 'a8ce91c897fa6639f2bee06b54fdefbf8524d6de497f9b3a4dcd878732ecc53b',
    'data/indian_marketplace/processed/indian_reviews.parquet': 'cf1a3c7f3a0758bcbefec983355e862b1cb142bfd78abee63d3462c79f52ed62',
    'data/indian_marketplace/processed/indian_reviews_linked.parquet': '0bcebae7e37734406076c0176f56216030659f4f091cdd777ea0be59e2a3ffa8',
    'data/indian_marketplace/processed/indian_images.parquet': 'f605ae7aa29aba550900aaadd5771fe4193168bffc09412ab5bb4e6c4ac18499',
    'data/indian_marketplace/processed/indian_complete_multimodal.parquet': 'b052def824cfae44dcbb862ca42d49b87cf537a24e8aa90663e2ed8ee79c410b',
    'data/indian_marketplace/processed/indian_dataset_metadata.json': 'fb8b9aaaaafc88ec828e2d067aee988e25449da7961efc01d48f422f2299b534'
}


def calculate_sha256(path: Path) -> str:
    sha = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha.update(chunk)
    return sha.hexdigest()


class TestMarketplaceTrustDataset:
    """Test suite for the certified dataset release."""

    def test_all_deliverable_tables_exist(self):
        expected_files = [
            ENTITIES_DIR / "products.parquet",
            ENTITIES_DIR / "sellers.parquet",
            EVIDENCE_DIR / "images.parquet",
            EVIDENCE_DIR / "reviews.parquet",
            EVIDENCE_DIR / "price_observations.parquet",
            RELATIONSHIPS_DIR / "entity_relationships.parquet",
            RELATIONSHIPS_DIR / "cross_modal_evidence.parquet",
            COLLECTIONS_DIR / "complete_multimodal_core.parquet",
            COLLECTIONS_DIR / "partial_modalities.parquet",
            BENCHMARKS_DIR / "deceptive_opinion_spam.parquet",
            BENCHMARKS_DIR / "ecommerce_fake_reviews.parquet",
            BENCHMARKS_DIR / "synthetic_stress_test_cases.parquet",
            METADATA_DIR / "source_registry.parquet",
            METADATA_DIR / "dataset_manifest.json",
            MANIFESTS_DIR / "image_acquisition_manifest.csv"
        ]
        for f in expected_files:
            assert f.exists(), f"Missing required file: {f}"
            assert f.stat().st_size > 0, f"File is empty: {f}"

    def test_products_composition_and_uniqueness(self):
        df = pd.read_parquet(ENTITIES_DIR / "products.parquet")
        assert len(df) == 6043
        assert df['canonical_product_id'].is_unique
        assert df['canonical_product_id'].notna().all()

        ind_count = (df['domain_partition'] == 'INDIAN_MARKETPLACE').sum()
        supp_count = (df['domain_partition'] == 'SUPPLEMENTARY_INTERNATIONAL').sum()

        assert ind_count == 3643
        assert supp_count == 2400

        # Exact ratio check: 60.28% Indian, 39.72% Supplementary
        ind_pct = ind_count / len(df) * 100
        supp_pct = supp_count / len(df) * 100
        assert round(ind_pct, 2) == 60.28
        assert round(supp_pct, 2) == 39.72

    def test_products_marketplaces_and_honest_sellers(self):
        df = pd.read_parquet(ENTITIES_DIR / "products.parquet")
        valid_mplaces = {'amazon_in', 'flipkart', 'myntra', 'amazon', 'walmart', 'bestbuy'}
        assert set(df['marketplace'].unique()).issubset(valid_mplaces)

        # Honest null seller_id
        assert df['seller_id'].isna().all()

    def test_sellers_table(self):
        df = pd.read_parquet(ENTITIES_DIR / "sellers.parquet")
        assert len(df) == 6
        assert df['seller_id'].is_unique
        assert 'UNVERIFIED_THIRD_PARTY_MERCHANT' in df['verification_status'].values

    def test_images_master_and_hashes(self):
        df = pd.read_parquet(EVIDENCE_DIR / "images.parquet")
        assert len(df) == 5554
        assert df['image_id'].is_unique

        usable = df[df['is_usable'] == True]
        assert len(usable) == 5228

        failed = df[df['is_usable'] == False]
        assert len(failed) == 326

        # Check hash completeness for usable images
        assert usable['content_hash_sha256'].notna().all()
        assert (usable['content_hash_sha256'].str.len() == 64).all()
        assert usable['perceptual_hash_dhash'].notna().all()
        assert (usable['perceptual_hash_dhash'].str.len() == 16).all()

        # Check physical readability of sample images
        sample = usable.sample(10, random_state=42)
        for _, row in sample.iterrows():
            with Image.open(row['local_path']) as im:
                im.verify()

    def test_reviews_master_and_foreign_keys(self):
        prods = pd.read_parquet(ENTITIES_DIR / "products.parquet")
        revs = pd.read_parquet(EVIDENCE_DIR / "reviews.parquet")

        assert len(revs) == 51680
        assert revs['canonical_review_id'].is_unique

        # Foreign key integrity on linked reviews
        linked = revs[revs['canonical_product_id'].notna() & (revs['linkage_type'] != 'UNLINKED')]
        prod_ids = set(prods['canonical_product_id'])
        assert set(linked['canonical_product_id']).issubset(prod_ids)

        # Rating bounds [1.0, 5.0]
        assert (revs['rating'] >= 1.0).all()
        assert (revs['rating'] <= 5.0).all()

        # Language tags present
        assert revs['language'].notna().all()

    def test_price_observations(self):
        prods = pd.read_parquet(ENTITIES_DIR / "products.parquet")
        prices = pd.read_parquet(EVIDENCE_DIR / "price_observations.parquet")

        assert len(prices) == 6043
        assert prices['price_observation_id'].is_unique

        # Referential integrity
        assert set(prices['canonical_product_id']) == set(prods['canonical_product_id'])

        # Valid prices are positive
        valid_prices = prices[prices['is_valid_price'] == True]
        assert (valid_prices['original_price'] > 0).all()

    def test_entity_relationships_graph(self):
        prods = pd.read_parquet(ENTITIES_DIR / "products.parquet")
        edges = pd.read_parquet(RELATIONSHIPS_DIR / "entity_relationships.parquet")

        assert len(edges) == 61812
        assert edges['relationship_id'].is_unique

        required_types = {'HAS_IMAGE', 'HAS_REVIEW', 'HAS_PRICE', 'IMAGE_EXACT_DUPLICATE_OF'}
        assert required_types.issubset(set(edges['relationship_type'].unique()))

    def test_cross_modal_evidence_layer6(self):
        df = pd.read_parquet(RELATIONSHIPS_DIR / "cross_modal_evidence.parquet")
        assert len(df) >= 1000
        assert df['evidence_id'].is_unique

        required_invs = {
            'REVIEW_RATING_MISMATCH',
            'REVIEW_REVIEW_DUPLICATION',
            'IMAGE_IMAGE_REUSE',
            'PRODUCT_PRICE_ANOMALY',
            'TITLE_IMAGE_OCR_CONSISTENCY'
        }
        assert required_invs.issubset(set(df['investigation_type'].unique()))

        # Contradiction score bounds [0.0, 1.0]
        assert (df['contradiction_score'] >= 0.0).all()
        assert (df['contradiction_score'] <= 1.0).all()

    def test_collections_tier_a_complete_multimodal(self):
        tier_a = pd.read_parquet(COLLECTIONS_DIR / "complete_multimodal_core.parquet")
        assert len(tier_a) == 100

        # All 4 modalities must be verified
        assert (tier_a['has_image'] == True).all()
        assert (tier_a['has_review'] == True).all()
        assert (tier_a['has_price'] == True).all()
        assert (tier_a['modality_tier'] == 'TIER_A_COMPLETE').all()

    def test_collections_tier_b_partial_modalities(self):
        tier_a = pd.read_parquet(COLLECTIONS_DIR / "complete_multimodal_core.parquet")
        tier_b = pd.read_parquet(COLLECTIONS_DIR / "partial_modalities.parquet")

        assert len(tier_b) == 5943
        assert len(tier_a) + len(tier_b) == 6043

        # Disjoint partition
        assert len(set(tier_a['canonical_product_id']).intersection(set(tier_b['canonical_product_id']))) == 0

    def test_collections_tier_c_isolated_benchmarks(self):
        dec = pd.read_parquet(BENCHMARKS_DIR / "deceptive_opinion_spam.parquet")
        fake = pd.read_parquet(BENCHMARKS_DIR / "ecommerce_fake_reviews.parquet")
        stress = pd.read_parquet(BENCHMARKS_DIR / "synthetic_stress_test_cases.parquet")

        assert len(dec) == 1600
        assert len(fake) == 40526
        assert len(stress) == 5

    def test_dataset_manifest_and_source_registry(self):
        reg = pd.read_parquet(METADATA_DIR / "source_registry.parquet")
        assert len(reg) == 11

        manifest = json.loads((METADATA_DIR / "dataset_manifest.json").read_text(encoding='utf-8'))
        assert manifest['summary_statistics']['total_products'] == 6043
        assert manifest['summary_statistics']['tier_a_complete_multimodal_products'] == 100
        assert manifest['certification_status'] == 'CERTIFIED_WITH_LIMITATIONS'

    def test_16_protected_baseline_files_intact(self):
        for path_str, exp_hash in PROTECTED_BASELINE_HASHES.items():
            path = Path(path_str)
            assert path.exists(), f"Protected baseline file missing: {path}"
            actual_h = calculate_sha256(path)
            assert actual_h == exp_hash, f"Protected baseline hash mismatch for {path_str}: {actual_h} != {exp_hash}"
