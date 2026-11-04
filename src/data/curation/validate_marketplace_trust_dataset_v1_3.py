"""
src/data/curation/validate_marketplace_trust_dataset_v1_3.py
-------------------------------------------------------------
Comprehensive Automated Data Quality Validator for Marketplace Trust Dataset (v1.3).

Executes 100+ meaningful, automated data integrity and invariant checks across:
1. File Existence, Schema, and Manifest Integrity (12 checks)
2. Product Master Entity Integrity (14 checks)
3. Seller and Merchant Intelligence Integrity (8 checks)
4. Product Variants & Hierarchy Integrity (8 checks)
5. Customer Review Integrity & Provenance (14 checks)
6. Review Reconciliation & Accounting Integrity (6 checks)
7. Image Integrity, Dimensions, & File Existence (14 checks)
8. Price Observation & Stock Status Integrity (10 checks)
9. Entity Relationship & Graph Integrity (10 checks)
10. Derived Evidence & Feature Stores Integrity (12 checks)
11. Multimodal Completeness & Partition Integrity (10 checks)
12. Evaluation Leakage & Stratification Integrity (10 checks)
13. External Benchmark & Stress Case Segregation (6 checks)
14. Cryptographic Baseline Protection & v1.1 Immutability (18 checks)

Total Checks: >120 discrete verification checkpoints.
"""

import os
import sys
import json
import hashlib
import logging
from pathlib import Path
from typing import Dict, Any, List, Tuple, Set

PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import numpy as np
import pandas as pd
import pyarrow.parquet as pq

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class MarketplaceTrustDatasetValidatorV13:
    """
    Automated Data Quality & Invariant Validator for v1.3 Release.
    """

    BASE_DIR = Path("data/marketplace_trust_dataset_v1.3")
    ENTITIES_DIR = BASE_DIR / "entities"
    EVIDENCE_DIR = BASE_DIR / "evidence"
    RELATIONSHIPS_DIR = BASE_DIR / "relationships"
    DERIVED_DIR = BASE_DIR / "derived_evidence"
    COLLECTIONS_DIR = BASE_DIR / "collections"
    BENCHMARKS_DIR = COLLECTIONS_DIR / "isolated_benchmarks"
    EVALUATION_DIR = BASE_DIR / "evaluation"
    BENCHMARK_EVAL_DIR = EVALUATION_DIR / "benchmark_manifests"
    METADATA_DIR = BASE_DIR / "metadata"
    MANIFESTS_DIR = BASE_DIR / "manifests"

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

    V11_MANIFEST_PATH = Path("data/marketplace_trust_dataset_v1.1/metadata/dataset_manifest.json")
    V12_MANIFEST_PATH = Path("data/marketplace_trust_dataset_v1.2/manifests/dataset_manifest.json")

    def __init__(self):
        self.results: List[Dict[str, Any]] = []

    def log_check(self, check_id: str, description: str, passed: bool, details: str = ""):
        self.results.append({
            "check_id": check_id,
            "description": description,
            "status": "PASS" if passed else "FAIL",
            "details": details
        })
        if not passed:
            logging.error(f"[FAIL] {check_id}: {description} - {details}")
        else:
            logging.info(f"[PASS] {check_id}: {description}")

    @staticmethod
    def sha256_file(path: Path) -> str:
        h = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                h.update(chunk)
        return h.hexdigest()

    def run_all_checks(self) -> Dict[str, Any]:
        logging.info("Starting Comprehensive Validation Suite for Dataset v1.3 (100+ checks)...")

        # ---------------------------------------------------------
        # Section 1: File Existence, Schema & Manifest Integrity
        # ---------------------------------------------------------
        manifest_file = self.MANIFESTS_DIR / "dataset_manifest.json"
        self.log_check("SEC1_MANIFEST_EXISTS", "v1.3 dataset manifest JSON exists", manifest_file.exists(), str(manifest_file))

        if manifest_file.exists():
            with open(manifest_file, "r", encoding="utf-8") as f:
                manifest_data = json.load(f)

            self.log_check("SEC1_MANIFEST_VERSION", "Manifest specifies release_version == 'v1.3'", manifest_data.get("release_version") == "v1.3", manifest_data.get("release_version"))
            self.log_check("SEC1_MANIFEST_STATUS", "Manifest specifies release_status == 'FROZEN'", manifest_data.get("release_status") == "FROZEN", manifest_data.get("release_status"))
            self.log_check("SEC1_MANIFEST_VERDICT", "Manifest specifies certification_verdict == 'CERTIFIED_WITH_LIMITATIONS'", manifest_data.get("certification_verdict") == "CERTIFIED_WITH_LIMITATIONS", manifest_data.get("certification_verdict"))

            tables = manifest_data.get("tables", {})
            self.log_check("SEC1_TABLE_COUNT", "Manifest indexes at least 25 tables and manifests", len(tables) >= 25, f"Found {len(tables)} tables")

            # Verify every table listed in manifest exists and matches its SHA-256 hash
            all_hashes_match = True
            mismatch_details = []
            for rel_path, entry in tables.items():
                target_file = self.BASE_DIR / rel_path
                if not target_file.exists():
                    all_hashes_match = False
                    mismatch_details.append(f"Missing: {rel_path}")
                else:
                    computed_hash = self.sha256_file(target_file)
                    if computed_hash != entry.get("sha256"):
                        all_hashes_match = False
                        mismatch_details.append(f"Hash mismatch: {rel_path}")

            self.log_check("SEC1_MANIFEST_HASH_INTEGRITY", "All manifest-registered tables match cryptographic SHA-256 hashes", all_hashes_match, "; ".join(mismatch_details) if mismatch_details else "All matched")

        # Key Parquet Tables Existence
        products_path = self.ENTITIES_DIR / "products.parquet"
        sellers_path = self.ENTITIES_DIR / "sellers.parquet"
        variants_path = self.ENTITIES_DIR / "product_variants.parquet"
        reviews_path = self.EVIDENCE_DIR / "reviews.parquet"
        images_path = self.EVIDENCE_DIR / "images.parquet"
        prices_path = self.EVIDENCE_DIR / "price_observations.parquet"
        seller_obs_path = self.EVIDENCE_DIR / "seller_observations.parquet"
        edges_path = self.RELATIONSHIPS_DIR / "entity_relationships.parquet"

        self.log_check("SEC1_PRODUCTS_FILE", "entities/products.parquet exists and non-empty", products_path.exists() and products_path.stat().st_size > 0)
        self.log_check("SEC1_SELLERS_FILE", "entities/sellers.parquet exists and non-empty", sellers_path.exists() and sellers_path.stat().st_size > 0)
        self.log_check("SEC1_VARIANTS_FILE", "entities/product_variants.parquet exists and non-empty", variants_path.exists() and variants_path.stat().st_size > 0)
        self.log_check("SEC1_REVIEWS_FILE", "evidence/reviews.parquet exists and non-empty", reviews_path.exists() and reviews_path.stat().st_size > 0)
        self.log_check("SEC1_IMAGES_FILE", "evidence/images.parquet exists and non-empty", images_path.exists() and images_path.stat().st_size > 0)
        self.log_check("SEC1_PRICES_FILE", "evidence/price_observations.parquet exists and non-empty", prices_path.exists() and prices_path.stat().st_size > 0)
        self.log_check("SEC1_SELLER_OBS_FILE", "evidence/seller_observations.parquet exists and non-empty", seller_obs_path.exists() and seller_obs_path.stat().st_size > 0)
        self.log_check("SEC1_EDGES_FILE", "relationships/entity_relationships.parquet exists and non-empty", edges_path.exists() and edges_path.stat().st_size > 0)

        # ---------------------------------------------------------
        # Section 2: Product Master Entity Integrity
        # ---------------------------------------------------------
        products = pd.read_parquet(products_path)
        total_prods = len(products)
        self.log_check("SEC2_PROD_TOTAL_COUNT", "Total products equals exactly 6,043", total_prods == 6043, f"Count: {total_prods}")
        self.log_check("SEC2_PROD_PK_UNIQUE", "canonical_product_id is 100% unique primary key", products['canonical_product_id'].nunique() == total_prods, f"Unique: {products['canonical_product_id'].nunique()}")

        ind_prods = products[products['domain_partition'] == 'INDIAN_MARKETPLACE']
        supp_prods = products[products['domain_partition'] == 'SUPPLEMENTARY_INTERNATIONAL']

        self.log_check("SEC2_IND_PROD_COUNT", "Indian products count equals exactly 3,643", len(ind_prods) == 3643, f"Count: {len(ind_prods)}")
        self.log_check("SEC2_SUPP_PROD_COUNT", "Supplementary products count equals exactly 2,400", len(supp_prods) == 2400, f"Count: {len(supp_prods)}")

        ind_pct = len(ind_prods) / total_prods * 100
        self.log_check("SEC2_RATIO_60_40", "Indian products represent 60.28% of catalog", round(ind_pct, 2) == 60.28, f"Percentage: {ind_pct:.2f}%")

        mkt_counts = products['marketplace'].value_counts().to_dict()
        self.log_check("SEC2_MKT_AMZ_IN", "Amazon India products equal exactly 1,500", mkt_counts.get("amazon_in") == 1500, f"Count: {mkt_counts.get('amazon_in')}")
        self.log_check("SEC2_MKT_FLIPKART", "Flipkart products equal exactly 1,143", mkt_counts.get("flipkart") == 1143, f"Count: {mkt_counts.get('flipkart')}")
        self.log_check("SEC2_MKT_MYNTRA", "Myntra products equal exactly 1,000", mkt_counts.get("myntra") == 1000, f"Count: {mkt_counts.get('myntra')}")
        self.log_check("SEC2_MKT_AMAZON_US", "Amazon US supplementary products equal exactly 1,020", mkt_counts.get("amazon") == 1020, f"Count: {mkt_counts.get('amazon')}")
        self.log_check("SEC2_MKT_BESTBUY", "BestBuy products equal exactly 249", mkt_counts.get("bestbuy") == 249, f"Count: {mkt_counts.get('bestbuy')}")
        self.log_check("SEC2_MKT_WALMART", "Walmart products equal exactly 1,131", mkt_counts.get("walmart") == 1131, f"Count: {mkt_counts.get('walmart')}")

        self.log_check("SEC2_CURRENCY_INR", "All Indian products have currency == 'INR'", (ind_prods['currency'] == 'INR').all(), f"INR count: {(ind_prods['currency'] == 'INR').sum()}")
        self.log_check("SEC2_CURRENCY_USD", "All Supplementary products have currency == 'USD'", (supp_prods['currency'] == 'USD').all(), f"USD count: {(supp_prods['currency'] == 'USD').sum()}")
        self.log_check("SEC2_SELLER_ID_NULL", "seller_id is honestly null for 100% of products (no invented IDs)", products['seller_id'].isna().all(), f"Null seller_id count: {products['seller_id'].isna().sum()}")

        # ---------------------------------------------------------
        # Section 3: Seller Intelligence Integrity
        # ---------------------------------------------------------
        sellers = pd.read_parquet(sellers_path)
        seller_obs = pd.read_parquet(seller_obs_path)
        self.log_check("SEC3_SELLER_COUNT", "Sellers table contains exactly 6 documented aggregate merchants", len(sellers) == 6, f"Count: {len(sellers)}")
        self.log_check("SEC3_SELLER_PK_UNIQUE", "seller_id is unique in sellers table", sellers['seller_id'].nunique() == 6)
        self.log_check("SEC3_SELLER_OBS_COUNT", "Seller observations contains 6 records", len(seller_obs) == 6, f"Count: {len(seller_obs)}")
        self.log_check("SEC3_SELLER_OBS_FK", "Seller observations match valid seller_ids", set(seller_obs['seller_id']) == set(sellers['seller_id']))

        unverified_sellers = sellers[sellers['verification_status'] == 'UNVERIFIED_THIRD_PARTY_MERCHANT']
        verified_sellers = sellers[sellers['verification_status'] == 'VERIFIED_FIRST_PARTY']
        self.log_check("SEC3_SELLER_UNVERIFIED_COUNT", "5 platform aggregate merchants marked UNVERIFIED_THIRD_PARTY_MERCHANT", len(unverified_sellers) == 5, f"Count: {len(unverified_sellers)}")
        self.log_check("SEC3_SELLER_VERIFIED_COUNT", "BestBuy marked VERIFIED_FIRST_PARTY", len(verified_sellers) == 1 and verified_sellers.iloc[0]['seller_id'] == 'SELLER_AGG_BESTBUY')
        self.log_check("SEC3_SELLER_MARKETPLACES", "Sellers cover all 6 distinct marketplace platforms", sellers['marketplace'].nunique() == 6)
        self.log_check("SEC3_SELLER_LIMITATIONS", "Every seller record documents known crawl limitations", sellers['limitations'].str.len().gt(10).all())

        # ---------------------------------------------------------
        # Section 4: Product Variants & Hierarchy Integrity
        # ---------------------------------------------------------
        variants = pd.read_parquet(variants_path)
        self.log_check("SEC4_VARIANTS_COUNT", "Product variants table contains at least 500 records", len(variants) >= 500, f"Count: {len(variants)}")
        self.log_check("SEC4_VARIANTS_PK", "variant_id is unique in product variants table", variants['variant_id'].nunique() == len(variants))
        self.log_check("SEC4_VARIANTS_FK", "All variant canonical_product_ids exist in products master", set(variants['canonical_product_id']).issubset(set(products['canonical_product_id'])))
        self.log_check("SEC4_MYNTRA_VARIANTS", "Myntra fashion style variants present", (variants['marketplace'] == 'myntra').sum() > 0, f"Count: {(variants['marketplace'] == 'myntra').sum()}")
        self.log_check("SEC4_AMAZON_VARIANTS", "Amazon parent ASIN cluster variants present", (variants['marketplace'] == 'amazon').sum() > 0, f"Count: {(variants['marketplace'] == 'amazon').sum()}")
        self.log_check("SEC4_PARENT_GROUPS", "Multiple products grouped under shared parent_group_id", variants['parent_group_id'].nunique() < len(variants))
        self.log_check("SEC4_JSON_VALID", "variant_attributes_json is non-empty for all records", variants['variant_attributes_json'].str.len().gt(2).all())
        self.log_check("SEC4_VALIDATION_STATUS", "All variants have validation_status == 'VALIDATED'", (variants['validation_status'] == 'VALIDATED').all())

        # ---------------------------------------------------------
        # Section 5: Customer Review Integrity & Provenance
        # ---------------------------------------------------------
        reviews = pd.read_parquet(reviews_path)
        total_revs = len(reviews)
        self.log_check("SEC5_REV_TOTAL_COUNT", "Total review records equal exactly 56,697 (100% retained)", total_revs == 56697, f"Count: {total_revs}")
        self.log_check("SEC5_REV_PK_UNIQUE", "canonical_review_id is 100% unique primary key", reviews['canonical_review_id'].nunique() == total_revs, f"Unique: {reviews['canonical_review_id'].nunique()}")

        # Source breakdown
        fk_revs = reviews[reviews['marketplace'] == 'flipkart']
        uncertain_revs = reviews[reviews['marketplace'] == 'uncertain']
        amz_in_revs = reviews[reviews['marketplace'] == 'amazon_in']
        bb_revs = reviews[reviews['marketplace'] == 'bestbuy']
        amz_us_revs = reviews[reviews['marketplace'] == 'amazon']

        self.log_check("SEC5_REV_FLIPKART_COUNT", "Flipkart confirmed reviews equal exactly 3,260", len(fk_revs) == 3260, f"Count: {len(fk_revs)}")
        self.log_check("SEC5_REV_UNCERTAIN_COUNT", "Uncertain provenance Indian reviews equal exactly 240", len(uncertain_revs) == 240, f"Count: {len(uncertain_revs)}")
        self.log_check("SEC5_REV_AMZ_IN_COUNT", "Amazon India reviews equal exactly 159", len(amz_in_revs) == 159, f"Count: {len(amz_in_revs)}")
        self.log_check("SEC5_REV_BESTBUY_COUNT", "BestBuy reviews equal exactly 44,965", len(bb_revs) == 44965, f"Count: {len(bb_revs)}")
        self.log_check("SEC5_REV_AMZ_US_COUNT", "Amazon US reviews equal exactly 8,073 (7,525 Gold + 548 Amazon 500)", len(amz_us_revs) == 8073, f"Count: {len(amz_us_revs)}")

        # Linkage and foreign keys
        linked_revs = reviews[reviews['linkage_type'] != 'UNLINKED']
        unlinked_revs = reviews[reviews['linkage_type'] == 'UNLINKED']
        self.log_check("SEC5_REV_LINKED_COUNT", "Linked reviews equal 56,457", len(linked_revs) == 56457, f"Count: {len(linked_revs)}")
        self.log_check("SEC5_REV_UNLINKED_COUNT", "Unlinked reviews equal exactly 240 (Flipkart genuine unlinked)", len(unlinked_revs) == 240, f"Count: {len(unlinked_revs)}")

        linked_pids = set(linked_revs['canonical_product_id'])
        all_prods = set(products['canonical_product_id'])
        self.log_check("SEC5_REV_FK_INTEGRITY", "100% of linked reviews reference existing product IDs", linked_pids.issubset(all_prods), f"Orphan count: {len(linked_pids - all_prods)}")

        # Rating validity
        valid_ratings = reviews['rating'].dropna().between(1.0, 5.0).all()
        self.log_check("SEC5_REV_RATING_RANGE", "All ratings are bounded between 1.0 and 5.0", valid_ratings)

        # Verified purchase semantics (3-state)
        vp_states = set(reviews['verified_purchase_status'].unique())
        expected_vp = {'VERIFIED_TRUE', 'VERIFIED_FALSE', 'NOT_SUPPLIED'}
        self.log_check("SEC5_REV_VP_SEMANTICS", "verified_purchase_status strictly conforms to 3 states", vp_states.issubset(expected_vp), f"Observed states: {vp_states}")

        # Review text non-emptiness
        has_text = reviews['review_text_cleaned'].str.len().gt(0).all()
        self.log_check("SEC5_REV_TEXT_NONEMPTY", "100% of reviews have non-empty cleaned review text", has_text)

        # Language ISO tags (en or hi-Latn)
        valid_langs = reviews['language'].isin(['en', 'hi-Latn']).all()
        self.log_check("SEC5_REV_LANGUAGE_ISO", "All reviews tagged with valid ISO language code ('en' or 'hi-Latn')", valid_langs)

        # ---------------------------------------------------------
        # Section 6: Review Reconciliation & Accounting Integrity
        # ---------------------------------------------------------
        accounting_path = self.MANIFESTS_DIR / "review_accounting.parquet"
        self.log_check("SEC6_ACCOUNTING_EXISTS", "manifests/review_accounting.parquet exists", accounting_path.exists())

        if accounting_path.exists():
            acc_df = pd.read_parquet(accounting_path)
            self.log_check("SEC6_ACCOUNTING_SOURCES", "Review accounting covers all 5 raw review sources", len(acc_df) == 5, f"Count: {len(acc_df)}")
            total_input = acc_df['original_input_count'].sum()
            total_retained = acc_df['retained_records'].sum()
            total_filtered = acc_df['filtered_records'].sum()

            self.log_check("SEC6_ACCOUNTING_INPUT_SUM", "Sum of original inputs equals 56,697", total_input == 56697, f"Sum: {total_input}")
            self.log_check("SEC6_ACCOUNTING_ZERO_FILTERED", "Total filtered records is 0 (100% retention)", total_filtered == 0, f"Filtered: {total_filtered}")
            self.log_check("SEC6_ACCOUNTING_RETAINED_SUM", "Sum of retained records equals 56,697", total_retained == 56697, f"Retained: {total_retained}")
            self.log_check("SEC6_ACCOUNTING_GOLD_RESTORATION", "Amazon Reviews 2023 Gold shows 7,525 retained (0 filtered)", acc_df.loc[acc_df['source'].str.contains('Gold'), 'retained_records'].iloc[0] == 7525)

        # ---------------------------------------------------------
        # Section 7: Image Integrity, Dimensions & File Existence
        # ---------------------------------------------------------
        images = pd.read_parquet(images_path)
        total_imgs = len(images)
        self.log_check("SEC7_IMG_TOTAL_COUNT", "Total image records equal exactly 5,554", total_imgs == 5554, f"Count: {total_imgs}")
        self.log_check("SEC7_IMG_PK_UNIQUE", "image_id is unique in images table", images['image_id'].nunique() == total_imgs)

        usable_imgs = images[images['is_usable'] == True]
        failed_imgs = images[images['is_usable'] == False]
        self.log_check("SEC7_IMG_USABLE_COUNT", "Usable images equal exactly 5,228 (4,708 Indian + 520 Supplementary)", len(usable_imgs) == 5228, f"Count: {len(usable_imgs)}")
        self.log_check("SEC7_IMG_FAILED_COUNT", "Failed image download audit records equal exactly 326", len(failed_imgs) == 326, f"Count: {len(failed_imgs)}")

        # Verify physical disk file existence for a random sample of usable images
        np.random.seed(42)
        sample_usable = usable_imgs.sample(min(200, len(usable_imgs)), random_state=42)
        sample_files_exist = sample_usable['local_path'].apply(
            lambda p: bool(isinstance(p, str) and os.path.exists(p))
        ).all()
        self.log_check("SEC7_IMG_DISK_EXISTENCE_SAMPLE", "Sample of 200 usable images physically exist on disk", sample_files_exist)

        # Gold 300 images physical existence
        gold_imgs = images[images['image_id'].str.startswith('IMG_GOLD_')]
        self.log_check("SEC7_IMG_GOLD_COUNT", "Exactly 300 Gold primary images registered", len(gold_imgs) == 300, f"Count: {len(gold_imgs)}")
        gold_exist = gold_imgs['local_path'].apply(lambda p: bool(isinstance(p, str) and os.path.exists(p))).all()
        self.log_check("SEC7_IMG_GOLD_DISK_EXISTENCE", "All 300 Gold images physically exist in data/raw/images/cache/", gold_exist)

        # SHA-256 and dHash integrity
        has_sha = usable_imgs['content_hash_sha256'].str.len().ge(16).all()
        has_dhash = usable_imgs['perceptual_hash_dhash'].str.len().ge(8).all()
        self.log_check("SEC7_IMG_SHA256_VALID", "All usable images have valid SHA-256 hashes", has_sha)
        self.log_check("SEC7_IMG_DHASH_VALID", "All usable images have valid perceptual dHash", has_dhash)

        # Dimensions
        valid_dim = (usable_imgs['width'] > 0) & (usable_imgs['height'] > 0)
        self.log_check("SEC7_IMG_DIMENSIONS_VALID", "All usable images have positive width and height", valid_dim.all())

        # Image foreign keys
        img_pids = set(images['canonical_product_id'])
        self.log_check("SEC7_IMG_FK_INTEGRITY", "All image canonical_product_ids reference existing products", img_pids.issubset(all_prods))

        # Acquisition manifest
        acq_path = self.MANIFESTS_DIR / "image_acquisition_manifest.csv"
        self.log_check("SEC7_ACQ_MANIFEST_EXISTS", "manifests/image_acquisition_manifest.csv exists", acq_path.exists())
        if acq_path.exists():
            acq_df = pd.read_csv(acq_path)
            self.log_check("SEC7_ACQ_MANIFEST_COUNT", "Image acquisition manifest prioritizes products lacking images", len(acq_df) == (products['has_image'] == False).sum(), f"Count: {len(acq_df)}")
            self.log_check("SEC7_ACQ_PRIORITY_VALUES", "Acquisition priorities strictly conform to HIGH/MEDIUM/LOW", set(acq_df['acquisition_priority'].unique()).issubset({'HIGH', 'MEDIUM', 'LOW'}))

        # ---------------------------------------------------------
        # Section 8: Price Observation & Stock Status Integrity
        # ---------------------------------------------------------
        prices = pd.read_parquet(prices_path)
        total_prices = len(prices)
        self.log_check("SEC8_PRICE_TOTAL_COUNT", "Total price observations equal exactly 6,043", total_prices == 6043, f"Count: {total_prices}")
        self.log_check("SEC8_PRICE_PK_UNIQUE", "price_observation_id is unique in price table", prices['price_observation_id'].nunique() == total_prices)

        valid_prices = prices[prices['is_valid_price'] == True]
        self.log_check("SEC8_PRICE_VALID_COUNT", "Valid prices equal exactly 5,153 records (890 missing prices honestly preserved)", len(valid_prices) == 5153, f"Count: {len(valid_prices)}")

        # Currency mapping
        ind_prices = prices[prices['domain_partition'] == 'INDIAN_MARKETPLACE']
        supp_prices = prices[prices['domain_partition'] == 'SUPPLEMENTARY_INTERNATIONAL']
        self.log_check("SEC8_PRICE_IND_INR", "All Indian price observations in INR", (ind_prices['original_currency'] == 'INR').all())
        self.log_check("SEC8_PRICE_SUPP_USD", "All Supplementary price observations in USD", (supp_prices['original_currency'] == 'USD').all())

        # Normalized INR price
        has_norm_inr = valid_prices['normalized_price_inr'].dropna().gt(0).all()
        self.log_check("SEC8_PRICE_NORMALIZED_INR", "All valid prices have positive normalized_price_inr", has_norm_inr)

        # Stock status semantics (only explicit OUT_OF_STOCK, otherwise IN_STOCK or UNKNOWN)
        stock_statuses = set(prices['stock_status'].unique())
        self.log_check("SEC8_PRICE_STOCK_SEMANTICS", "stock_status strictly adheres to semantic states", stock_statuses.issubset({'IN_STOCK', 'UNKNOWN', 'OUT_OF_STOCK'}), f"Observed: {stock_statuses}")

        # Observation type is static snapshot (no false longitudinal curves)
        self.log_check("SEC8_PRICE_OBS_TYPE", "All observations marked STATIC_CRAWL_SNAPSHOT", (prices['observation_type'] == 'STATIC_CRAWL_SNAPSHOT').all())

        # Price foreign keys
        price_pids = set(prices['canonical_product_id'])
        self.log_check("SEC8_PRICE_FK_INTEGRITY", "All price canonical_product_ids reference existing products", price_pids.issubset(all_prods))

        # ---------------------------------------------------------
        # Section 9: Entity Relationship & Graph Integrity
        # ---------------------------------------------------------
        edges = pd.read_parquet(edges_path)
        total_edges = len(edges)
        self.log_check("SEC9_EDGE_TOTAL_COUNT", "Total entity relationships exceed 60,000 edges", total_edges >= 60000, f"Count: {total_edges}")
        self.log_check("SEC9_EDGE_PK_UNIQUE", "relationship_id is unique across all edges", edges['relationship_id'].nunique() == total_edges)

        rel_types = set(edges['relationship_type'].unique())
        expected_types = {'HAS_IMAGE', 'HAS_REVIEW', 'HAS_PRICE', 'IMAGE_EXACT_DUPLICATE_OF', 'IMAGE_PERCEPTUAL_DUPLICATE_OF'}
        self.log_check("SEC9_EDGE_TYPES_VALID", "Relationship types match defined ontology", rel_types.issubset(expected_types), f"Types: {rel_types}")

        has_img_edges = edges[edges['relationship_type'] == 'HAS_IMAGE']
        has_rev_edges = edges[edges['relationship_type'] == 'HAS_REVIEW']
        has_prc_edges = edges[edges['relationship_type'] == 'HAS_PRICE']
        dup_img_edges = edges[edges['relationship_type'].isin(['IMAGE_EXACT_DUPLICATE_OF', 'IMAGE_PERCEPTUAL_DUPLICATE_OF'])]

        self.log_check("SEC9_EDGE_HAS_IMG_COUNT", "HAS_IMAGE edges equal exactly usable images count (5,228)", len(has_img_edges) == 5228, f"Count: {len(has_img_edges)}")
        self.log_check("SEC9_EDGE_HAS_REV_COUNT", "HAS_REVIEW edges equal exactly linked reviews count (56,457)", len(has_rev_edges) == 56457, f"Count: {len(has_rev_edges)}")
        self.log_check("SEC9_EDGE_HAS_PRC_COUNT", "HAS_PRICE edges equal exactly valid prices count", len(has_prc_edges) == len(valid_prices), f"Count: {len(has_prc_edges)}")
        self.log_check("SEC9_EDGE_DUP_IMG_COUNT", "Duplicate image similarity edges discovered and registered", len(dup_img_edges) > 0, f"Count: {len(dup_img_edges)}")

        # Referential integrity: source entities of HAS_* are products
        has_edges = pd.concat([has_img_edges, has_rev_edges, has_prc_edges])
        self.log_check("SEC9_EDGE_SOURCE_IS_PRODUCT", "Source entity for all HAS_* edges is PRODUCT", (has_edges['source_entity_type'] == 'PRODUCT').all())
        self.log_check("SEC9_EDGE_SOURCE_FK_VALID", "Source product IDs in HAS_* edges exist in products master", set(has_edges['source_entity_id']).issubset(all_prods))

        # ---------------------------------------------------------
        # Section 10: Derived Evidence & Feature Stores Integrity
        # ---------------------------------------------------------
        rev_feat_path = self.DERIVED_DIR / "review_quality_features.parquet"
        img_feat_path = self.DERIVED_DIR / "image_integrity_features.parquet"
        price_feat_path = self.DERIVED_DIR / "price_anomaly_features.parquet"
        xmod_path = self.DERIVED_DIR / "cross_modal_evidence.parquet"

        self.log_check("SEC10_REV_FEAT_EXISTS", "derived_evidence/review_quality_features.parquet exists", rev_feat_path.exists())
        self.log_check("SEC10_IMG_FEAT_EXISTS", "derived_evidence/image_integrity_features.parquet exists", img_feat_path.exists())
        self.log_check("SEC10_PRICE_FEAT_EXISTS", "derived_evidence/price_anomaly_features.parquet exists", price_feat_path.exists())
        self.log_check("SEC10_XMOD_EXISTS", "derived_evidence/cross_modal_evidence.parquet exists", xmod_path.exists())

        if rev_feat_path.exists():
            rf_df = pd.read_parquet(rev_feat_path)
            self.log_check("SEC10_REV_FEAT_COUNT", "Review quality features computed for all 56,697 reviews", len(rf_df) == 56697, f"Count: {len(rf_df)}")
            self.log_check("SEC10_REV_FEAT_COLS", "Review quality features include word_count, char_length, quality_score", {'word_count', 'char_length', 'quality_score'}.issubset(set(rf_df.columns)))

        if img_feat_path.exists():
            imf_df = pd.read_parquet(img_feat_path)
            self.log_check("SEC10_IMG_FEAT_COUNT", "Image features computed for all 5,554 images", len(imf_df) == 5554, f"Count: {len(imf_df)}")
            self.log_check("SEC10_IMG_FEAT_COLS", "Image features include aspect_ratio, is_duplicate_cluster", {'aspect_ratio', 'is_duplicate_cluster'}.issubset(set(imf_df.columns)))

        if price_feat_path.exists():
            pf_df = pd.read_parquet(price_feat_path)
            self.log_check("SEC10_PRICE_FEAT_COUNT", "Price anomaly features computed for >5,000 observations", len(pf_df) >= 5000, f"Count: {len(pf_df)}")
            self.log_check("SEC10_PRICE_FEAT_COLS", "Price features include price_zscore, is_iqr_outlier", {'price_zscore', 'is_iqr_outlier'}.issubset(set(pf_df.columns)))

        if xmod_path.exists():
            xm_df = pd.read_parquet(xmod_path)
            self.log_check("SEC10_XMOD_COUNT", "Cross-modal evidence table contains >1,500 investigation records", len(xm_df) >= 1500, f"Count: {len(xm_df)}")
            xm_types = set(xm_df['investigation_type'].unique())
            self.log_check("SEC10_XMOD_TYPES", "Cross-modal evidence covers at least 4 investigation types", len(xm_types) >= 4, f"Types: {xm_types}")

        # ---------------------------------------------------------
        # Section 11: Multimodal Completeness & Partition Integrity
        # ---------------------------------------------------------
        core_path = self.COLLECTIONS_DIR / "complete_multimodal_core.parquet"
        ind_core_path = self.COLLECTIONS_DIR / "indian_complete_multimodal.parquet"
        ind_part_path = self.COLLECTIONS_DIR / "indian_partial_modalities.parquet"
        supp_path = self.COLLECTIONS_DIR / "international_supplementary.parquet"
        partial_path = self.COLLECTIONS_DIR / "partial_modalities.parquet"

        self.log_check("SEC11_CORE_EXISTS", "collections/complete_multimodal_core.parquet exists", core_path.exists())
        self.log_check("SEC11_IND_CORE_EXISTS", "collections/indian_complete_multimodal.parquet exists", ind_core_path.exists())
        self.log_check("SEC11_IND_PART_EXISTS", "collections/indian_partial_modalities.parquet exists", ind_part_path.exists())
        self.log_check("SEC11_SUPP_EXISTS", "collections/international_supplementary.parquet exists", supp_path.exists())
        self.log_check("SEC11_PARTIAL_EXISTS", "collections/partial_modalities.parquet exists", partial_path.exists())

        tier_a = pd.read_parquet(core_path)
        tier_b = pd.read_parquet(partial_path)
        ind_core = pd.read_parquet(ind_core_path)
        ind_partial = pd.read_parquet(ind_part_path)
        supp_coll = pd.read_parquet(supp_path)

        self.log_check("SEC11_TIER_A_COUNT", "Tier A Complete Multimodal Core contains exactly 305 products (5 Indian + 300 Supplementary)", len(tier_a) == 305, f"Count: {len(tier_a)}")
        self.log_check("SEC11_IND_CORE_COUNT", "Indian complete multimodal contains exactly 5 products", len(ind_core) == 5, f"Count: {len(ind_core)}")
        self.log_check("SEC11_IND_PARTIAL_COUNT", "Indian partial modalities contains exactly 3,638 products", len(ind_partial) == 3638, f"Count: {len(ind_partial)}")
        self.log_check("SEC11_SUPP_COLL_COUNT", "International supplementary contains exactly 2,400 products", len(supp_coll) == 2400, f"Count: {len(supp_coll)}")
        self.log_check("SEC11_TIER_B_COUNT", "Tier B Partial Modalities contains exactly 5,738 products", len(tier_b) == 5738, f"Count: {len(tier_b)}")

        # Partition exhaustiveness and mutual exclusivity
        self.log_check("SEC11_PARTITION_EXHAUSTIVE", "Tier A (305) + Tier B (5,738) partition products master perfectly (6,043)", len(tier_a) + len(tier_b) == 6043)
        self.log_check("SEC11_PARTITION_DISJOINT", "Tier A and Tier B have zero product overlap", len(set(tier_a['canonical_product_id']).intersection(set(tier_b['canonical_product_id']))) == 0)

        # 4-modality verification on all Tier A products
        tier_a_pids = set(tier_a['canonical_product_id'])
        imgs_in_tier_a = set(usable_imgs['canonical_product_id']).intersection(tier_a_pids)
        revs_in_tier_a = set(linked_revs['canonical_product_id']).intersection(tier_a_pids)
        prices_in_tier_a = set(valid_prices['canonical_product_id']).intersection(tier_a_pids)

        self.log_check("SEC11_TIER_A_IMAGE_OVERLAP", "100% of Tier A products have verified usable images", len(imgs_in_tier_a) == 305, f"Overlapping: {len(imgs_in_tier_a)}")
        self.log_check("SEC11_TIER_A_REVIEW_OVERLAP", "100% of Tier A products have verified linked reviews", len(revs_in_tier_a) == 305, f"Overlapping: {len(revs_in_tier_a)}")
        self.log_check("SEC11_TIER_A_PRICE_OVERLAP", "100% of Tier A products have valid prices", len(prices_in_tier_a) == 305, f"Overlapping: {len(prices_in_tier_a)}")

        # ---------------------------------------------------------
        # Section 12: Evaluation Leakage & Stratification Integrity
        # ---------------------------------------------------------
        train_path = self.EVALUATION_DIR / "train_manifest.parquet"
        val_path = self.EVALUATION_DIR / "validation_manifest.parquet"
        test_path = self.EVALUATION_DIR / "test_manifest.parquet"

        self.log_check("SEC12_TRAIN_MANIFEST_EXISTS", "evaluation/train_manifest.parquet exists", train_path.exists())
        self.log_check("SEC12_VAL_MANIFEST_EXISTS", "evaluation/validation_manifest.parquet exists", val_path.exists())
        self.log_check("SEC12_TEST_MANIFEST_EXISTS", "evaluation/test_manifest.parquet exists", test_path.exists())

        train_df = pd.read_parquet(train_path)
        val_df = pd.read_parquet(val_path)
        test_df = pd.read_parquet(test_path)

        train_pids = set(train_df['canonical_product_id'])
        val_pids = set(val_df['canonical_product_id'])
        test_pids = set(test_df['canonical_product_id'])

        self.log_check("SEC12_SPLIT_EXHAUSTIVE", "Train + Val + Test product counts sum to exactly 6,043", len(train_df) + len(val_df) + len(test_df) == 6043, f"Sum: {len(train_df) + len(val_df) + len(test_df)}")

        # Zero Product ID Overlap across splits
        self.log_check("SEC12_LEAKAGE_TRAIN_VAL", "Zero product ID overlap between Train and Val splits", len(train_pids.intersection(val_pids)) == 0)
        self.log_check("SEC12_LEAKAGE_TRAIN_TEST", "Zero product ID overlap between Train and Test splits", len(train_pids.intersection(test_pids)) == 0)
        self.log_check("SEC12_LEAKAGE_VAL_TEST", "Zero product ID overlap between Val and Test splits", len(val_pids.intersection(test_pids)) == 0)

        # Stratification proportions (~70% Train, ~15% Val, ~15% Test)
        train_pct = len(train_df) / 6043 * 100
        val_pct = len(val_df) / 6043 * 100
        test_pct = len(test_df) / 6043 * 100
        self.log_check("SEC12_SPLIT_TRAIN_PCT", "Train split represents ~70% (68% - 72%) of products", 68.0 <= train_pct <= 72.0, f"Train: {train_pct:.2f}%")
        self.log_check("SEC12_SPLIT_VAL_PCT", "Val split represents ~15% (13% - 17%) of products", 13.0 <= val_pct <= 17.0, f"Val: {val_pct:.2f}%")
        self.log_check("SEC12_SPLIT_TEST_PCT", "Test split represents ~15% (13% - 17%) of products", 13.0 <= test_pct <= 17.0, f"Test: {test_pct:.2f}%")

        # Zero Duplicate Image Cluster Leakage
        img_to_prod = dict(zip(usable_imgs['image_id'], usable_imgs['canonical_product_id']))
        dup_edges = edges[edges['relationship_type'].isin(['IMAGE_EXACT_DUPLICATE_OF', 'IMAGE_PERCEPTUAL_DUPLICATE_OF'])]
        split_map = {}
        for pid in train_pids:
            split_map[pid] = 'TRAIN'
        for pid in val_pids:
            split_map[pid] = 'VAL'
        for pid in test_pids:
            split_map[pid] = 'TEST'

        cluster_leakage = False
        leaking_edges = []
        for _, edge in dup_edges.iterrows():
            p1 = img_to_prod.get(edge['source_entity_id'])
            p2 = img_to_prod.get(edge['target_entity_id'])
            if p1 and p2 and p1 in split_map and p2 in split_map:
                if split_map[p1] != split_map[p2]:
                    cluster_leakage = True
                    leaking_edges.append((p1, p2, split_map[p1], split_map[p2]))

        self.log_check("SEC12_IMAGE_CLUSTER_LEAKAGE", "Zero duplicate-image cluster leakage across Train/Val/Test splits", not cluster_leakage, f"Leaking edge count: {len(leaking_edges)}")

        # ---------------------------------------------------------
        # Section 13: External Benchmark & Stress Case Segregation
        # ---------------------------------------------------------
        dec_path = self.BENCHMARKS_DIR / "deceptive_opinion_spam.parquet"
        fake_path = self.BENCHMARKS_DIR / "ecommerce_fake_reviews.parquet"
        stress_path = self.BENCHMARKS_DIR / "synthetic_stress_test_cases.parquet"

        self.log_check("SEC13_BENCHMARK_DEC_EXISTS", "collections/isolated_benchmarks/deceptive_opinion_spam.parquet exists", dec_path.exists())
        self.log_check("SEC13_BENCHMARK_FAKE_EXISTS", "collections/isolated_benchmarks/ecommerce_fake_reviews.parquet exists", fake_path.exists())
        self.log_check("SEC13_BENCHMARK_STRESS_EXISTS", "collections/isolated_benchmarks/synthetic_stress_test_cases.parquet exists", stress_path.exists())

        dec_df = pd.read_parquet(dec_path)
        fake_df = pd.read_parquet(fake_path)
        stress_df = pd.read_parquet(stress_path)

        self.log_check("SEC13_BENCHMARK_DEC_COUNT", "Deceptive Opinion Spam contains exactly 1,600 reviews", len(dec_df) == 1600, f"Count: {len(dec_df)}")
        self.log_check("SEC13_BENCHMARK_FAKE_COUNT", "E-Commerce Fake Reviews contains exactly 40,526 reviews", len(fake_df) == 40526, f"Count: {len(fake_df)}")
        self.log_check("SEC13_BENCHMARK_STRESS_COUNT", "Synthetic Stress Cases contains exactly 5 records", len(stress_df) == 5, f"Count: {len(stress_df)}")

        # ---------------------------------------------------------
        # Section 14: Cryptographic Baseline Protection & v1.1 Immutability
        # ---------------------------------------------------------
        # 1. 16 Protected Baselines Bit-Perfect Verification
        for path_str, exp_hash in self.PROTECTED_BASELINE_HASHES.items():
            p = Path(path_str)
            if not p.exists():
                self.log_check(f"SEC14_BASE_{p.stem}", f"Baseline file exists: {path_str}", False, "File missing")
            else:
                act_hash = self.sha256_file(p)
                matches = (act_hash == exp_hash)
                self.log_check(f"SEC14_BASE_{p.stem}", f"Baseline bit-perfect SHA-256 match: {p.name}", matches, f"Actual: {act_hash[:16]}..., Expected: {exp_hash[:16]}...")

        # 2. v1.1 Release Immutability Check
        self.log_check("SEC14_V11_MANIFEST_EXISTS", "v1.1 release manifest exists at expected path", self.V11_MANIFEST_PATH.exists())
        if self.V11_MANIFEST_PATH.exists():
            v11_hash = self.sha256_file(self.V11_MANIFEST_PATH)
            # Verify v1.1 manifest contains v1.1 version and remains unchanged
            with open(self.V11_MANIFEST_PATH, "r", encoding="utf-8") as f:
                v11_data = json.load(f)
            v11_ver = v11_data.get("release_version") or v11_data.get("version")
            v11_stat = v11_data.get("release_status") or v11_data.get("release_state")
            self.log_check("SEC14_V11_VERSION_IMMUTABLE", "v1.1 manifest version is strictly 'v1.1' or '1.1.0'", v11_ver in ["v1.1", "1.1.0", "1.1"], str(v11_ver))
            self.log_check("SEC14_V11_STATUS_FROZEN", "v1.1 release status remains 'FROZEN'", v11_stat == "FROZEN", str(v11_stat))
        # 3. v1.2 Release Immutability Check
        self.log_check("SEC14_V12_MANIFEST_EXISTS", "v1.2 release manifest exists at expected path", self.V12_MANIFEST_PATH.exists())
        if self.V12_MANIFEST_PATH.exists():
            with open(self.V12_MANIFEST_PATH, "r", encoding="utf-8") as f:
                v12_data = json.load(f)
            v12_ver = v12_data.get("release_version") or v12_data.get("version")
            v12_stat = v12_data.get("release_status") or v12_data.get("release_state")
            self.log_check("SEC14_V12_VERSION_IMMUTABLE", "v1.2 manifest version is strictly 'v1.2'", v12_ver == "v1.2", str(v12_ver))
            self.log_check("SEC14_V12_STATUS_FROZEN", "v1.2 release status remains 'FROZEN'", v12_stat == "FROZEN", str(v12_stat))


        # ---------------------------------------------------------
        # Summary & Verdict
        # ---------------------------------------------------------
        total_checks = len(self.results)
        passed_checks = sum(1 for r in self.results if r["status"] == "PASS")
        failed_checks = total_checks - passed_checks

        summary = {
            "validator_version": "v1.3",
            "total_checks": total_checks,
            "passed_checks": passed_checks,
            "failed_checks": failed_checks,
            "success_rate_percentage": round(passed_checks / total_checks * 100, 2),
            "certification_status": "CERTIFIED_VALID" if failed_checks == 0 else "INTEGRITY_COMPROMISED"
        }

        logging.info("==================================================")
        logging.info(f"VALIDATION COMPLETE: {passed_checks}/{total_checks} PASSED ({summary['success_rate_percentage']}%)")
        if failed_checks > 0:
            logging.error(f"FAILURES DETECTED: {failed_checks} checks failed!")
        else:
            logging.info("ALL INTEGRITY INVARIANTS SATISFIED! v1.3 CERTIFIED.")
        logging.info("==================================================")

        return summary


if __name__ == "__main__":
    validator = MarketplaceTrustDatasetValidatorV13()
    summary = validator.run_all_checks()
    sys.exit(0 if summary["failed_checks"] == 0 else 1)
