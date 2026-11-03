"""
src/data/curation/validate_expanded_cohort_20000.py
--------------------------------------------------
Automated validation suite for the 20,000-product expanded analytical cohort.

Performs:
1. Dataset Integrity Validation (dimensions, uniqueness, key integrity, columns).
2. Core Cohort Preservation (100% exact retention of 5,684 core cohort, disjointness of 14,316 additions).
3. Approved Marketplace and Category Allocation Validation (ID-level counts match approved allocation).
4. Price Coverage and Evidence Retention Audit (exact price counts, 100% CV and NLP evidence retention).
5. Protected Baseline Hash Preservation (cryptographic bit-perfect check of all 11 baseline files + 3 core cohort files).
"""

import os
import sys
import json
import hashlib
import logging
from pathlib import Path
from typing import Dict, Any, List, Set, Tuple

import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class ExpandedCohortValidator:
    """
    Validates all integrity, core preservation, allocation, price, and baseline constraints.
    """

    EXPECTED_HASHES = {
        # 11 Baseline files
        "data/processed/canonical_products.parquet": "b0a27e4803d5bf76d025da1abea2045e3920e61b26cf72343c5a0e6465e5cd0e",
        "data/processed/canonical_reviews.parquet": "17aa47d8aa60e447ce673e83fe2d8336e10c357c3afeb4e0a63503e46a01323c",
        "data/processed/canonical_images.parquet": "bdae434ef284fa8e7f600c65b4dd6a8be04c77b464d20bce0d7641005cbc5187",
        "data/processed/image_embeddings_resnet18.npy": "204d3c4269de94bb628cf6963a3ab524d20a0a1d462db1ee4117a225e3957e4c",
        "data/processed/image_embeddings_resnet18_metadata.parquet": "2efe37104caf761bf44c1710672f84c415cd623cef17bf7a8e675550ebb1f6f8",
        "data/processed/product_review_features.parquet": "53bfe8d88446c241f41c4006d241da305a894106727f37c31eac6ebc20aff244",
        "data/processed/cv_product_features_expanded.parquet": "ec5193486d76771c97ea649d1f8a76a993dd83aa68fa87ce2a431b3f0ad12ffd",
        "data/processed/cv_product_embeddings_expanded.npy": "e0216dfc6bc0ae481e7003ac638278a427749bc874dc48085c39490207d3430b",
        "data/processed/cv_product_embeddings_metadata.parquet": "b638ed83907f656319fed644b08511418b23cfaa106bb3dba6b21a3de067a20c",
        "data/processed/image_quality_report.parquet": "4acfcbeff74ba226ab69a7f513d6b0d487980e8b3f4631b7979e0c5a6616ca9a",
        "data/interim/product_pricing_cohort.parquet": "0b4b7b6fd7835224c4438838f3ed012e991245232f1901c3cd896955f120b3c0",
        # 3 Core 5,684 cohort files
        "data/curated/curated_products_5684.parquet": "abcdb9e0e729d26113d9781910c614a8f36f1fee5f88aabbe18430666baa9024",
        "data/curated/cohort_membership.parquet": "17ab50e37f5a9313fc44296db41eb4ce3dcab41745fb3de1bbb6b9caa8312d1e",
        "data/curated/cohort_metadata.json": "67899824b9803d126fcc19ceacd085e9a02d949678a99b1fe5207e02a5db2d54",
    }

    # Approved Allocations
    APPROVED_MARKETPLACES = {
        "walmart": 10907,
        "amazon": 5359,
        "amazon_in": 1485,
        "flipkart": 1000,
        "myntra": 1000,
        "bestbuy": 249,
    }

    APPROVED_CATEGORIES = {
        "Electronics": 7453,
        "Beauty & Personal Care": 2964,
        "Clothing & Fashion": 2606,
        "Other": 2599,
        "Books & Stationery": 1957,
        "Home & Kitchen": 1299,
        "Toys & Games": 754,
        "Grocery & Household Essentials": 368,
    }

    APPROVED_WALMART_ADDITIONS_STRATA = {
        "Electronics": 5568,
        "Other": 2109,
        "Books & Stationery": 1056,
        "Clothing & Fashion": 367,
        "Home & Kitchen": 306,
        "Toys & Games": 1,
    }

    def __init__(
        self,
        curated_20k_path: str = "data/curated/curated_products_20000.parquet",
        membership_20k_path: str = "data/curated/cohort_membership_20000.parquet",
        metadata_20k_path: str = "data/curated/cohort_metadata_20000.json",
        core_curated_path: str = "data/curated/curated_products_5684.parquet",
        canonical_products_path: str = "data/processed/canonical_products.parquet",
        review_features_path: str = "data/processed/product_review_features.parquet",
        cv_features_path: str = "data/processed/cv_product_features_expanded.parquet",
    ):
        self.curated_20k_path = Path(curated_20k_path)
        self.membership_20k_path = Path(membership_20k_path)
        self.metadata_20k_path = Path(metadata_20k_path)
        self.core_curated_path = Path(core_curated_path)
        self.canonical_products_path = Path(canonical_products_path)
        self.review_features_path = Path(review_features_path)
        self.cv_features_path = Path(cv_features_path)

    @staticmethod
    def get_sha256(filepath: Path) -> str:
        h = hashlib.sha256()
        with open(filepath, "rb") as f:
            while chunk := f.read(65536):
                h.update(chunk)
        return h.hexdigest()

    def run_all_validations(self) -> Dict[str, Any]:
        """
        Runs comprehensive validation across all 5 verification suites.
        """
        logging.info("==================================================")
        logging.info("Starting 20,000-Product Expanded Cohort Validation")
        logging.info("==================================================")

        results: Dict[str, Any] = {}

        # 1. Dataset Integrity Checks
        logging.info("Suite 1: Dataset Integrity Validation...")
        assert self.curated_20k_path.exists(), f"Missing {self.curated_20k_path}"
        assert self.membership_20k_path.exists(), f"Missing {self.membership_20k_path}"
        assert self.metadata_20k_path.exists(), f"Missing {self.metadata_20k_path}"

        df_20k = pd.read_parquet(self.curated_20k_path)
        df_mem = pd.read_parquet(self.membership_20k_path)
        df_canon = pd.read_parquet(self.canonical_products_path)
        df_core = pd.read_parquet(self.core_curated_path)

        with open(self.metadata_20k_path, "r", encoding="utf-8") as f:
            meta = json.load(f)

        assert len(df_20k) == 20000, f"Expected 20,000 in curated products, got {len(df_20k)}"
        assert len(df_mem) == 20000, f"Expected 20,000 in membership, got {len(df_mem)}"
        assert df_20k["canonical_product_id"].is_unique, "curated products has duplicate IDs!"
        assert df_mem["canonical_product_id"].is_unique, "membership has duplicate IDs!"
        assert df_20k["canonical_product_id"].isna().sum() == 0, "Null IDs in curated products!"
        assert df_mem["canonical_product_id"].isna().sum() == 0, "Null IDs in membership!"

        # Key alignment
        assert set(df_20k["canonical_product_id"]) == set(df_mem["canonical_product_id"]), "ID mismatch between 20k curated and membership!"

        results["suite_1_integrity"] = {
            "status": "PASSED",
            "curated_20k_rows": len(df_20k),
            "membership_20k_rows": len(df_mem),
            "unique_ids_curated": df_20k["canonical_product_id"].nunique(),
            "unique_ids_membership": df_mem["canonical_product_id"].nunique(),
        }
        logging.info("Suite 1 PASSED: Exactly 20,000 unique canonical product IDs.")

        # 2. Core 5,684 Cohort Preservation & Disjointness
        logging.info("Suite 2: Core Cohort Preservation & Disjointness...")
        core_ids = set(df_core["canonical_product_id"])
        cohort_20k_ids = set(df_20k["canonical_product_id"])

        # Core is 100% subset
        assert core_ids.issubset(cohort_20k_ids), "Core cohort IDs not completely present in 20k cohort!"
        assert len(core_ids) == 5684

        core_rows = df_20k[df_20k["canonical_product_id"].isin(core_ids)]
        addition_rows = df_20k[~df_20k["canonical_product_id"].isin(core_ids)]

        assert len(core_rows) == 5684
        assert len(addition_rows) == 14316

        # Check role assignments
        assert (core_rows["cohort_role"] == "core_5684").all(), "Incorrect role in core rows!"
        assert (addition_rows["cohort_role"] == "expanded_addition").all(), "Incorrect role in addition rows!"

        # Disjointness check
        overlap = set(core_rows["canonical_product_id"]).intersection(set(addition_rows["canonical_product_id"]))
        assert len(overlap) == 0, f"Disjointness violated! {len(overlap)} overlapping IDs"

        # Check tier and sub_tier integrity for core subset
        core_mem = pd.read_parquet("data/curated/cohort_membership.parquet")
        merged_core_check = core_rows[["canonical_product_id", "tier", "sub_tier"]].merge(
            core_mem[["canonical_product_id", "tier", "sub_tier"]],
            on="canonical_product_id",
            suffixes=("_20k", "_orig")
        )
        assert (merged_core_check["tier_20k"] == merged_core_check["tier_orig"]).all()
        assert (merged_core_check["sub_tier_20k"] == merged_core_check["sub_tier_orig"]).all()

        results["suite_2_core_preservation"] = {
            "status": "PASSED",
            "core_subset_size": len(core_rows),
            "additions_size": len(addition_rows),
            "disjointness_verified": len(overlap) == 0,
            "core_tier_subtier_identical": True,
        }
        logging.info("Suite 2 PASSED: Core 5,684 cohort 100% preserved; 14,316 additions 100% disjoint.")

        # 3. Approved Allocations Verification
        logging.info("Suite 3: Approved Marketplace & Category Allocations...")
        mkt_counts = df_20k["marketplace"].value_counts().to_dict()
        cat_counts = df_20k["category"].value_counts().to_dict()

        for mkt, expected_n in self.APPROVED_MARKETPLACES.items():
            actual_n = mkt_counts.get(mkt, 0)
            assert actual_n == expected_n, f"Marketplace {mkt} count mismatch: {actual_n} != {expected_n}"

        for cat, expected_n in self.APPROVED_CATEGORIES.items():
            actual_n = cat_counts.get(cat, 0)
            assert actual_n == expected_n, f"Category {cat} count mismatch: {actual_n} != {expected_n}"

        # Check Walmart additions strata
        walmart_additions = addition_rows[addition_rows["marketplace"] == "walmart"]
        assert len(walmart_additions) == 9407
        walmart_add_cats = walmart_additions["category"].value_counts().to_dict()
        for cat, expected_n in self.APPROVED_WALMART_ADDITIONS_STRATA.items():
            actual_n = walmart_add_cats.get(cat, 0)
            assert actual_n == expected_n, f"Walmart addition {cat} mismatch: {actual_n} != {expected_n}"

        results["suite_3_allocations"] = {
            "status": "PASSED",
            "marketplace_counts": mkt_counts,
            "category_counts": cat_counts,
            "walmart_additions_counts": walmart_add_cats,
        }
        logging.info("Suite 3 PASSED: All 6 marketplaces, 8 categories, and Walmart strata match exact approved counts.")

        # 4. Price Coverage and Evidence Retention
        logging.info("Suite 4: Price Coverage & Evidence Modality Retention...")
        df_rev = pd.read_parquet(self.review_features_path)
        df_cv = pd.read_parquet(self.cv_features_path)

        # Merge for evidence verification
        canon_with_evidence = df_canon.merge(
            df_rev[["canonical_product_id", "review_count"]], on="canonical_product_id", how="left"
        ).merge(
            df_cv[["canonical_product_id", "has_product_embedding"]], on="canonical_product_id", how="left"
        )
        canon_with_evidence["price_valid"] = canon_with_evidence["price"].notna() & (canon_with_evidence["price"] > 0)
        canon_with_evidence["nlp_valid"] = canon_with_evidence["review_count"].notna() & (canon_with_evidence["review_count"] > 0)
        canon_with_evidence["cv_valid"] = canon_with_evidence["has_product_embedding"].eq(True)

        canon_price_valid_count = int(canon_with_evidence["price_valid"].sum())
        canon_nlp_valid_count = int(canon_with_evidence["nlp_valid"].sum())
        canon_cv_valid_count = int(canon_with_evidence["cv_valid"].sum())

        assert canon_price_valid_count == 24768
        assert canon_nlp_valid_count == 3627
        assert canon_cv_valid_count == 1647

        cohort_price_valid = int(df_20k["price_valid"].sum())
        cohort_nlp_valid = int(df_20k["nlp_valid"].sum())
        cohort_cv_valid = int(df_20k["cv_valid"].sum())

        core_price_valid = int(core_rows["price_valid"].sum())
        add_price_valid = int(addition_rows["price_valid"].sum())
        unselected_price_valid = canon_price_valid_count - cohort_price_valid

        assert core_price_valid == 4935, f"Expected 4,935 core valid prices, got {core_price_valid}"
        assert add_price_valid == 11526, f"Expected 11,526 addition valid prices, got {add_price_valid}"
        assert cohort_price_valid == 16461, f"Expected 16,461 cohort valid prices, got {cohort_price_valid}"
        assert unselected_price_valid == 8307, f"Expected 8,307 unselected valid prices, got {unselected_price_valid}"

        # Modality retention assertions (100% of reviews and embeddings must be retained)
        assert cohort_nlp_valid == 3627, f"Expected 3,627 NLP products, got {cohort_nlp_valid}"
        assert cohort_cv_valid == 1647, f"Expected 1,647 CV products, got {cohort_cv_valid}"

        results["suite_4_evidence"] = {
            "status": "PASSED",
            "price_coverage": {
                "canonical_valid_price": canon_price_valid_count,
                "core_valid_price": core_price_valid,
                "additions_valid_price": add_price_valid,
                "final_20000_valid_price": cohort_price_valid,
                "unselected_valid_price": unselected_price_valid,
                "price_coverage_pct": round(cohort_price_valid / canon_price_valid_count * 100, 2),
            },
            "nlp_retention": {
                "canonical": canon_nlp_valid_count,
                "cohort_20k": cohort_nlp_valid,
                "retention_pct": 100.0,
            },
            "cv_retention": {
                "canonical": canon_cv_valid_count,
                "cohort_20k": cohort_cv_valid,
                "retention_pct": 100.0,
            },
        }
        logging.info("Suite 4 PASSED: Price count 16,461 (66.46%); NLP 3,627 (100%); CV 1,647 (100%).")

        # 5. Protected Baseline Hash Preservation
        logging.info("Suite 5: Protected Baseline Cryptographic Preservation...")
        hash_results = {}
        for rel_path, expected_hash in self.EXPECTED_HASHES.items():
            path_obj = Path(rel_path)
            assert path_obj.exists(), f"Protected file missing: {rel_path}"
            actual_hash = self.get_sha256(path_obj)
            assert actual_hash == expected_hash, f"Hash mismatch for {rel_path}: expected {expected_hash}, got {actual_hash}"
            hash_results[rel_path] = {
                "status": "MATCH",
                "sha256": actual_hash,
            }

        results["suite_5_preservation"] = {
            "status": "PASSED",
            "verified_files_count": len(self.EXPECTED_HASHES),
            "files": hash_results,
        }
        logging.info("Suite 5 PASSED: All 14 baseline and core files bit-perfect and cryptographically preserved.")

        # Summary of generated files
        results["generated_artifacts"] = {
            "curated_products_20000_parquet": {
                "path": str(self.curated_20k_path),
                "sha256": self.get_sha256(self.curated_20k_path),
                "rows": len(df_20k),
            },
            "cohort_membership_20000_parquet": {
                "path": str(self.membership_20k_path),
                "sha256": self.get_sha256(self.membership_20k_path),
                "rows": len(df_mem),
            },
            "cohort_metadata_20000_json": {
                "path": str(self.metadata_20k_path),
                "sha256": self.get_sha256(self.metadata_20k_path),
            },
        }

        logging.info("==================================================")
        logging.info("ALL VALIDATION SUITES PASSED SUCCESSFULLY")
        logging.info("==================================================")

        return results


if __name__ == "__main__":
    validator = ExpandedCohortValidator()
    res = validator.run_all_validations()
    print("\n--- VALIDATION SUMMARY ---")
    print("Suite 1 Integrity:     ", res["suite_1_integrity"]["status"])
    print("Suite 2 Core Preserve: ", res["suite_2_core_preservation"]["status"])
    print("Suite 3 Allocations:   ", res["suite_3_allocations"]["status"])
    print("Suite 4 Evidence:      ", res["suite_4_evidence"]["status"])
    print("Suite 5 Preservation:  ", res["suite_5_preservation"]["status"])
    print("\nGenerated File Hashes:")
    for name, info in res["generated_artifacts"].items():
        print(f"  {name}: {info['sha256']}")
