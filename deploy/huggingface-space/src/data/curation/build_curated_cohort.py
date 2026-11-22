"""
src/data/curation/build_curated_cohort.py
----------------------------------------
Deterministic cohort generation module for the 5,684-product curated dataset.

Constructs:
- Tier A: Gold Multimodal Cohort (300 products)
- Tier B: Specialized Evidence Cohorts (1,384 products)
  - B1: CV + Price (1,134 products)
  - B2: BestBuy Review Density (249 products)
  - B3: NLP + Price (1 product)
- Tier C: Marketplace & Evidence Coverage (4,000 products)
  - C1: Amazon India Pricing (1,000 products)
  - C2: Myntra Style Variants (1,000 products)
  - C3: Walmart Stratified Pricing (1,500 products)
  - C4: Amazon US Review Stratified Cohort (500 products)

Outputs:
- data/curated/curated_products_5684.parquet
- data/curated/cohort_membership.parquet
- data/curated/cohort_metadata.json
"""

import os
import sys
import json
import time
import hashlib
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Set

import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class CuratedCohortBuilder:
    """
    Builds the 5,684-product curated cohort deterministically from canonical source data.
    """

    def __init__(
        self,
        canonical_products_path: str = "data/processed/canonical_products.parquet",
        review_features_path: str = "data/processed/product_review_features.parquet",
        cv_features_path: str = "data/processed/cv_product_features_expanded.parquet",
        output_dir: str = "data/curated",
        random_seed: int = 42,
    ):
        self.canonical_products_path = Path(canonical_products_path)
        self.review_features_path = Path(review_features_path)
        self.cv_features_path = Path(cv_features_path)
        self.output_dir = Path(output_dir)
        self.random_seed = random_seed
        self.output_dir.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def compute_sha256(filepath: Path) -> str:
        """Computes cryptographic SHA-256 hash of a file."""
        h = hashlib.sha256()
        with open(filepath, "rb") as f:
            while chunk := f.read(65536):
                h.update(chunk)
        return h.hexdigest()

    def build_master_frame(self) -> pd.DataFrame:
        """
        Loads and joins canonical products with review and CV evidence flags.
        """
        logging.info("Loading canonical products from %s", self.canonical_products_path)
        products = pd.read_parquet(self.canonical_products_path)
        assert len(products) == 31289, f"Expected 31,289 products, got {len(products)}"
        assert products["canonical_product_id"].is_unique, "Duplicate product IDs in canonical products!"

        logging.info("Loading review features from %s", self.review_features_path)
        rev_feats = pd.read_parquet(self.review_features_path)
        assert rev_feats["canonical_product_id"].is_unique, "Duplicate product IDs in review features!"

        logging.info("Loading expanded CV features from %s", self.cv_features_path)
        cv_feats = pd.read_parquet(self.cv_features_path)
        assert len(cv_feats) == 31289, f"Expected 31,289 CV features, got {len(cv_feats)}"
        assert cv_feats["canonical_product_id"].is_unique, "Duplicate product IDs in CV features!"

        # Merge key evidence columns
        rev_subset = rev_feats[["canonical_product_id", "review_count", "listing_state"]].copy()
        cv_subset = cv_feats[[
            "canonical_product_id", "has_product_embedding", "usable_image_count", "visual_evidence_status"
        ]].copy()

        master = products.merge(rev_subset, on="canonical_product_id", how="left")
        master = master.merge(cv_subset, on="canonical_product_id", how="left")

        # Modality flags
        master["price_valid"] = master["price"].notna() & (master["price"] > 0)
        master["cv_valid"] = master["has_product_embedding"].eq(True)
        master["nlp_valid"] = master["review_count"].notna() & (master["review_count"] > 0)
        master["review_count_filled"] = master["review_count"].fillna(0).astype("int64")

        return master

    def generate(self) -> Tuple[pd.DataFrame, pd.DataFrame, Dict[str, Any]]:
        """
        Executes deterministic multi-tiered cohort selection.
        """
        t0 = time.time()
        logging.info("==================================================")
        logging.info("Building 5,684-Product Curated Cohort (Seed: %d)", self.random_seed)
        logging.info("==================================================")

        master = self.build_master_frame()
        selected_ids: Set[str] = set()
        membership_records: List[Dict[str, Any]] = []

        # ----------------------------------------------------
        # 1. Tier A — Gold Multimodal Cohort (Target: 300)
        # ----------------------------------------------------
        logging.info("Selecting Tier A (Gold Multimodal Cohort)...")
        tier_a_mask = (
            master["cv_valid"]
            & master["nlp_valid"]
            & master["price_valid"]
            & (master["marketplace"] == "amazon")
            & (master["category"] == "Beauty & Personal Care")
        )
        tier_a_df = master[tier_a_mask].sort_values("canonical_product_id").copy()
        assert len(tier_a_df) == 300, f"Expected 300 in Tier A, found {len(tier_a_df)}"

        for pid in tier_a_df["canonical_product_id"]:
            assert pid not in selected_ids, f"Duplicate selection of {pid}"
            selected_ids.add(pid)
            membership_records.append({
                "canonical_product_id": pid,
                "tier": "Tier A",
                "sub_tier": "gold_triple_modality",
                "selection_method": "deterministic_all_eligible",
                "random_seed": self.random_seed,
            })
        logging.info("Tier A selected: %d products", len(tier_a_df))

        # ----------------------------------------------------
        # 2. Tier B — Specialized Evidence Cohorts (Target: 1,384)
        # ----------------------------------------------------
        logging.info("Selecting Tier B Specialized Evidence Cohorts...")

        # Sub-tier B1: CV + Price (Target: 1,134)
        b1_mask = (
            ~master["canonical_product_id"].isin(selected_ids)
            & master["cv_valid"]
            & master["price_valid"]
        )
        b1_df = master[b1_mask].sort_values("canonical_product_id").copy()
        assert len(b1_df) == 1134, f"Expected 1,134 in Sub-tier B1, found {len(b1_df)}"
        b1_mkt_counts = b1_df["marketplace"].value_counts().to_dict()
        assert b1_mkt_counts.get("flipkart", 0) == 927, f"Expected 927 Flipkart in B1, got {b1_mkt_counts.get('flipkart')}"
        assert b1_mkt_counts.get("amazon", 0) == 207, f"Expected 207 Amazon in B1, got {b1_mkt_counts.get('amazon')}"

        for pid in b1_df["canonical_product_id"]:
            assert pid not in selected_ids, f"Duplicate selection of {pid}"
            selected_ids.add(pid)
            membership_records.append({
                "canonical_product_id": pid,
                "tier": "Tier B",
                "sub_tier": "b1_cv_price",
                "selection_method": "deterministic_all_eligible",
                "random_seed": self.random_seed,
            })
        logging.info("Sub-tier B1 selected: %d products (Flipkart: 927, Amazon: 207)", len(b1_df))

        # Sub-tier B2: BestBuy Reviews (Target: 249)
        b2_mask = (
            ~master["canonical_product_id"].isin(selected_ids)
            & (master["marketplace"] == "bestbuy")
            & master["nlp_valid"]
        )
        b2_df = master[b2_mask].sort_values("canonical_product_id").copy()
        assert len(b2_df) == 249, f"Expected 249 in Sub-tier B2, found {len(b2_df)}"

        for pid in b2_df["canonical_product_id"]:
            assert pid not in selected_ids, f"Duplicate selection of {pid}"
            selected_ids.add(pid)
            membership_records.append({
                "canonical_product_id": pid,
                "tier": "Tier B",
                "sub_tier": "b2_bestbuy_reviews",
                "selection_method": "deterministic_all_eligible",
                "random_seed": self.random_seed,
            })
        logging.info("Sub-tier B2 selected: %d products", len(b2_df))

        # Sub-tier B3: NLP + Price (Target: 1)
        b3_mask = (
            ~master["canonical_product_id"].isin(selected_ids)
            & (master["marketplace"] == "amazon")
            & master["nlp_valid"]
            & master["price_valid"]
            & (~master["cv_valid"])
        )
        b3_df = master[b3_mask].sort_values("canonical_product_id").copy()
        assert len(b3_df) == 1, f"Expected 1 in Sub-tier B3, found {len(b3_df)}"

        for pid in b3_df["canonical_product_id"]:
            assert pid not in selected_ids, f"Duplicate selection of {pid}"
            selected_ids.add(pid)
            membership_records.append({
                "canonical_product_id": pid,
                "tier": "Tier B",
                "sub_tier": "b3_nlp_price",
                "selection_method": "deterministic_all_eligible",
                "random_seed": self.random_seed,
            })
        logging.info("Sub-tier B3 selected: %d products", len(b3_df))

        # ----------------------------------------------------
        # 3. Tier C — Marketplace & Evidence Coverage (Target: 4,000)
        # ----------------------------------------------------
        logging.info("Selecting Tier C Marketplace & Evidence Coverage Cohorts...")

        # Sub-tier C1: Amazon India Pricing (Target: 1,000 sampled from 1,485)
        c1_mask = (
            ~master["canonical_product_id"].isin(selected_ids)
            & (master["marketplace"] == "amazon_in")
            & master["price_valid"]
            & (master["currency"] == "INR")
        )
        c1_pool = master[c1_mask].sort_values("canonical_product_id").copy()
        assert len(c1_pool) == 1485, f"Expected 1,485 candidates in C1 pool, got {len(c1_pool)}"

        c1_sample = c1_pool.sample(n=1000, random_state=self.random_seed).sort_values("canonical_product_id")
        assert len(c1_sample) == 1000

        for pid in c1_sample["canonical_product_id"]:
            assert pid not in selected_ids, f"Duplicate selection of {pid}"
            selected_ids.add(pid)
            membership_records.append({
                "canonical_product_id": pid,
                "tier": "Tier C",
                "sub_tier": "c1_amazon_in_price",
                "selection_method": "deterministic_random_sampling",
                "random_seed": self.random_seed,
            })
        logging.info("Sub-tier C1 selected: %d products (from pool of %d)", len(c1_sample), len(c1_pool))

        # Sub-tier C2: Myntra Variants (Target: 1,000)
        c2_mask = (
            ~master["canonical_product_id"].isin(selected_ids)
            & (master["marketplace"] == "myntra")
            & master["price_valid"]
        )
        c2_df = master[c2_mask].sort_values("canonical_product_id").copy()
        assert len(c2_df) == 1000, f"Expected 1,000 in Sub-tier C2, found {len(c2_df)}"

        for pid in c2_df["canonical_product_id"]:
            assert pid not in selected_ids, f"Duplicate selection of {pid}"
            selected_ids.add(pid)
            membership_records.append({
                "canonical_product_id": pid,
                "tier": "Tier C",
                "sub_tier": "c2_myntra_variants",
                "selection_method": "deterministic_all_eligible",
                "random_seed": self.random_seed,
            })
        logging.info("Sub-tier C2 selected: %d products", len(c2_df))

        # Sub-tier C3: Walmart Stratified Pricing (Target: 1,500 sampled from 19,214)
        c3_mask = (
            ~master["canonical_product_id"].isin(selected_ids)
            & (master["marketplace"] == "walmart")
            & master["price_valid"]
        )
        c3_pool = master[c3_mask].sort_values("canonical_product_id").copy()
        assert len(c3_pool) == 19214, f"Expected 19,214 candidates in C3 pool, got {len(c3_pool)}"

        # Approved category stratification targets for 1,500 products
        # Preserves representation of all 7 categories present in Walmart pricing pool
        walmart_strata_targets = {
            "Electronics": 887,
            "Other": 336,
            "Books & Stationery": 168,
            "Clothing & Fashion": 58,
            "Home & Kitchen": 49,
            "Toys & Games": 1,
            "Grocery & Household Essentials": 1,
        }
        assert sum(walmart_strata_targets.values()) == 1500

        c3_sampled_dfs = []
        for cat, target_n in walmart_strata_targets.items():
            cat_pool = c3_pool[c3_pool["category"] == cat].sort_values("canonical_product_id")
            assert len(cat_pool) >= target_n, f"Insufficient pool for Walmart category {cat}: {len(cat_pool)} < {target_n}"
            cat_sample = cat_pool.sample(n=target_n, random_state=self.random_seed)
            c3_sampled_dfs.append(cat_sample)

        c3_sample = pd.concat(c3_sampled_dfs).sort_values("canonical_product_id")
        assert len(c3_sample) == 1500

        for pid in c3_sample["canonical_product_id"]:
            assert pid not in selected_ids, f"Duplicate selection of {pid}"
            selected_ids.add(pid)
            membership_records.append({
                "canonical_product_id": pid,
                "tier": "Tier C",
                "sub_tier": "c3_walmart_price",
                "selection_method": "deterministic_category_stratified_sampling",
                "random_seed": self.random_seed,
            })
        logging.info("Sub-tier C3 selected: %d products (stratified across 7 categories)", len(c3_sample))

        # Sub-tier C4: Amazon US Reviews Stratified (Target: 500 sampled from 3,077)
        c4_mask = (
            ~master["canonical_product_id"].isin(selected_ids)
            & (master["marketplace"] == "amazon")
            & master["nlp_valid"]
        )
        c4_pool = master[c4_mask].sort_values("canonical_product_id").copy()
        assert len(c4_pool) == 3077, f"Expected 3,077 candidates in C4 pool, got {len(c4_pool)}"

        # Approved sampling strategy:
        # Preserve all 43 multi-review products, then stratified sample 457 single-review products
        c4_multi = c4_pool[c4_pool["review_count_filled"] > 1].copy()
        assert len(c4_multi) == 43, f"Expected 43 multi-review candidates, got {len(c4_multi)}"

        approved_c4_single_targets = {
            "Home & Kitchen": 91,
            "Toys & Games": 91,
            "Electronics": 91,
            "Books & Stationery": 92,
            "Clothing & Fashion": 92,
        }
        assert sum(approved_c4_single_targets.values()) == 457

        c4_single_sampled_dfs = []
        c4_single_pool = c4_pool[c4_pool["review_count_filled"] == 1].copy()
        for cat, target_n in approved_c4_single_targets.items():
            cat_single = c4_single_pool[c4_single_pool["category"] == cat].sort_values("canonical_product_id")
            assert len(cat_single) >= target_n, f"Insufficient single-review candidates for {cat}: {len(cat_single)} < {target_n}"
            cat_sample = cat_single.sample(n=target_n, random_state=self.random_seed)
            c4_single_sampled_dfs.append(cat_sample)

        c4_single_sample = pd.concat(c4_single_sampled_dfs)
        c4_sample = pd.concat([c4_multi, c4_single_sample]).sort_values("canonical_product_id")
        assert len(c4_sample) == 500, f"Expected 500 products in C4 sample, got {len(c4_sample)}"

        for pid in c4_sample["canonical_product_id"]:
            assert pid not in selected_ids, f"Duplicate selection of {pid}"
            selected_ids.add(pid)
            membership_records.append({
                "canonical_product_id": pid,
                "tier": "Tier C",
                "sub_tier": "c4_amazon_us_reviews",
                "selection_method": "deterministic_category_stratified_multi_single_sampling",
                "random_seed": self.random_seed,
            })
        logging.info("Sub-tier C4 selected: %d products (43 multi-review + 457 single-review)", len(c4_sample))

        # ----------------------------------------------------
        # 4. Cohort Assembly & Verification
        # ----------------------------------------------------
        assert len(selected_ids) == 5684, f"Total cohort size mismatch: {len(selected_ids)} vs 5,684"
        df_membership = pd.DataFrame(membership_records).sort_values("canonical_product_id").reset_index(drop=True)
        assert len(df_membership) == 5684
        assert df_membership["canonical_product_id"].is_unique

        # Extract complete canonical product records
        df_curated_products = master[master["canonical_product_id"].isin(selected_ids)].copy()
        df_curated_products = df_curated_products.merge(df_membership, on="canonical_product_id", how="left")
        df_curated_products = df_curated_products.sort_values("canonical_product_id").reset_index(drop=True)

        # ----------------------------------------------------
        # 5. Save Curated Artifacts
        # ----------------------------------------------------
        logging.info("Saving curated cohort artifacts to %s...", self.output_dir)
        curated_products_path = self.output_dir / "curated_products_5684.parquet"
        membership_path = self.output_dir / "cohort_membership.parquet"
        metadata_path = self.output_dir / "cohort_metadata.json"

        # Save Parquet files
        df_curated_products.to_parquet(curated_products_path, index=False)
        df_membership.to_parquet(membership_path, index=False)

        # Build comprehensive metadata document
        elapsed = time.time() - t0
        metadata = {
            "generation_timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "elapsed_seconds": round(elapsed, 2),
            "random_seed": self.random_seed,
            "target_cohort_size": 5684,
            "actual_cohort_size": len(df_curated_products),
            "tier_counts": {
                "Tier A": int((df_membership["tier"] == "Tier A").sum()),
                "Tier B": int((df_membership["tier"] == "Tier B").sum()),
                "Tier C": int((df_membership["tier"] == "Tier C").sum()),
            },
            "sub_tier_counts": df_membership["sub_tier"].value_counts().to_dict(),
            "marketplace_distribution": df_curated_products["marketplace"].value_counts().to_dict(),
            "category_distribution": df_curated_products["category"].value_counts().to_dict(),
            "source_files": {
                "canonical_products": {
                    "path": str(self.canonical_products_path),
                    "sha256": self.compute_sha256(self.canonical_products_path),
                    "rows": 31289,
                },
                "review_features": {
                    "path": str(self.review_features_path),
                    "sha256": self.compute_sha256(self.review_features_path),
                    "rows": 27789,
                },
                "cv_features": {
                    "path": str(self.cv_features_path),
                    "sha256": self.compute_sha256(self.cv_features_path),
                    "rows": 31289,
                },
            },
            "generated_files": {
                "curated_products_parquet": str(curated_products_path),
                "cohort_membership_parquet": str(membership_path),
                "cohort_metadata_json": str(metadata_path),
            },
            "sub_tier_details": {
                "gold_triple_modality": {
                    "count": 300,
                    "criteria": "cv_valid & nlp_valid & price_valid & amazon_us & beauty",
                    "marketplace": "amazon",
                    "category": "Beauty & Personal Care",
                },
                "b1_cv_price": {
                    "count": 1134,
                    "criteria": "not_in_A & cv_valid & price_valid",
                    "marketplaces": {"flipkart": 927, "amazon": 207},
                },
                "b2_bestbuy_reviews": {
                    "count": 249,
                    "criteria": "not_in_A & marketplace == bestbuy & review_count > 0",
                    "marketplace": "bestbuy",
                },
                "b3_nlp_price": {
                    "count": 1,
                    "criteria": "not_in_A & amazon & review_count > 0 & price_valid & not_cv_valid",
                    "canonical_product_id": "amazon_B015WXZSZ6",
                },
                "c1_amazon_in_price": {
                    "count": 1000,
                    "criteria": "not_in_AB & marketplace == amazon_in & price_valid & currency == INR",
                    "sampling_method": "deterministic_random_sample (seed 42)",
                },
                "c2_myntra_variants": {
                    "count": 1000,
                    "criteria": "not_in_AB & marketplace == myntra & price_valid",
                    "selection_method": "deterministic_all_eligible",
                },
                "c3_walmart_price": {
                    "count": 1500,
                    "criteria": "not_in_AB & marketplace == walmart & price_valid",
                    "sampling_method": "deterministic_category_stratified_sampling (seed 42)",
                    "category_allocations": walmart_strata_targets,
                },
                "c4_amazon_us_reviews": {
                    "count": 500,
                    "criteria": "not_in_AB & marketplace == amazon & review_count > 0",
                    "sampling_method": "43 multi-review + 457 category-stratified single-review (seed 42)",
                    "category_allocations": {
                        "Home & Kitchen": 103,
                        "Toys & Games": 101,
                        "Electronics": 103,
                        "Books & Stationery": 97,
                        "Clothing & Fashion": 96,
                    },
                },
            },
        }

        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

        logging.info("Saved metadata to %s", metadata_path)
        logging.info("Cohort generation finished successfully in %.2f seconds", elapsed)

        return df_curated_products, df_membership, metadata


if __name__ == "__main__":
    builder = CuratedCohortBuilder()
    products_df, membership_df, meta = builder.generate()
    print("\nCohort Generation Complete:")
    print("Actual Cohort Size:", len(products_df))
    print("Tier Counts:", meta["tier_counts"])
    print("Sub-tier Counts:", meta["sub_tier_counts"])
