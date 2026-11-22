"""
src/data/curation/build_expanded_cohort_20000.py
------------------------------------------------
Deterministic cohort generation module for the 20,000-product expanded analytical cohort.

Architecture:
- Core 5,684 Subset (100% preserved unmodified from curated_products_5684.parquet):
  - Tier A: Gold Multimodal Cohort (300 products)
  - Tier B: Specialized Evidence Cohorts (1,384 products)
  - Tier C: Marketplace & Evidence Coverage (4,000 products)
- Expanded Additions (14,316 disjoint products with verified evidence):
  - Tier D (Catalog Expansion):
    - exp_amazon_evidence: 4,351 products (Amazon US)
    - exp_amazon_in_price: 485 products (Amazon India)
    - exp_flipkart_evidence: 73 products (Flipkart)
    - exp_walmart_stratified_price: 9,407 products (Walmart)

Outputs:
- data/curated/curated_products_20000.parquet
- data/curated/cohort_membership_20000.parquet
- data/curated/cohort_metadata_20000.json
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


class ExpandedCohortBuilder:
    """
    Builds the 20,000-product expanded cohort deterministically from canonical source data
    and preserves the existing 5,684-product cohort as an exact, unmodified subset.
    """

    WALMART_EXPANSION_TARGETS = {
        "Electronics": 5568,
        "Other": 2109,
        "Books & Stationery": 1056,
        "Clothing & Fashion": 367,
        "Home & Kitchen": 306,
        "Toys & Games": 1,
    }

    def __init__(
        self,
        canonical_products_path: str = "data/processed/canonical_products.parquet",
        review_features_path: str = "data/processed/product_review_features.parquet",
        cv_features_path: str = "data/processed/cv_product_features_expanded.parquet",
        core_curated_path: str = "data/curated/curated_products_5684.parquet",
        core_membership_path: str = "data/curated/cohort_membership.parquet",
        output_dir: str = "data/curated",
        random_seed: int = 42,
    ):
        self.canonical_products_path = Path(canonical_products_path)
        self.review_features_path = Path(review_features_path)
        self.cv_features_path = Path(cv_features_path)
        self.core_curated_path = Path(core_curated_path)
        self.core_membership_path = Path(core_membership_path)
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

        rev_subset = rev_feats[["canonical_product_id", "review_count", "listing_state"]].copy()
        cv_subset = cv_feats[[
            "canonical_product_id", "has_product_embedding", "usable_image_count", "visual_evidence_status"
        ]].copy()

        master = products.merge(rev_subset, on="canonical_product_id", how="left")
        master = master.merge(cv_subset, on="canonical_product_id", how="left")

        master["price_valid"] = master["price"].notna() & (master["price"] > 0)
        master["cv_valid"] = master["has_product_embedding"].eq(True)
        master["nlp_valid"] = master["review_count"].notna() & (master["review_count"] > 0)
        master["review_count_filled"] = master["review_count"].fillna(0).astype("int64")
        master["has_any_evidence"] = master["price_valid"] | master["cv_valid"] | master["nlp_valid"]

        return master

    def generate(self) -> Tuple[pd.DataFrame, pd.DataFrame, Dict[str, Any]]:
        """
        Executes deterministic cohort generation for exactly 20,000 products.
        """
        t0 = time.time()
        logging.info("==================================================")
        logging.info("Building 20,000-Product Expanded Cohort (Seed: %d)", self.random_seed)
        logging.info("==================================================")

        # 1. Load existing core 5,684 cohort and its membership
        logging.info("Loading core 5,684 cohort from %s", self.core_curated_path)
        core_curated = pd.read_parquet(self.core_curated_path)
        assert len(core_curated) == 5684, f"Expected 5,684 core products, got {len(core_curated)}"
        assert core_curated["canonical_product_id"].is_unique, "Duplicate IDs in core curated cohort!"

        logging.info("Loading core membership from %s", self.core_membership_path)
        core_membership = pd.read_parquet(self.core_membership_path)
        assert len(core_membership) == 5684, f"Expected 5,684 core membership records, got {len(core_membership)}"
        assert set(core_curated["canonical_product_id"]) == set(core_membership["canonical_product_id"])

        core_ids = set(core_curated["canonical_product_id"])
        logging.info("Verified core cohort of %d unique products", len(core_ids))

        # Annotate core membership with cohort_role
        core_membership = core_membership.copy()
        core_membership["cohort_role"] = "core_5684"

        # 2. Build candidate pool strictly disjoint from core cohort
        master = self.build_master_frame()
        candidate_pool = master[~master["canonical_product_id"].isin(core_ids)].copy()
        assert len(candidate_pool) == 31289 - 5684
        assert len(candidate_pool) == 25605, f"Expected 25,605 in remaining pool, got {len(candidate_pool)}"

        # Restrict to products with at least one evidence modality
        eligible_pool = candidate_pool[candidate_pool["has_any_evidence"]].copy()
        logging.info(
            "Eligible candidate pool with evidence: %d products (out of %d unselected)",
            len(eligible_pool), len(candidate_pool)
        )
        assert len(eligible_pool) == 22623, f"Expected 22,623 eligible candidates, got {len(eligible_pool)}"

        # 3. Select additions across marketplaces
        additions_membership: List[Dict[str, Any]] = []
        selected_addition_ids: Set[str] = set()

        # 3a. Flipkart additions: all eligible remaining (73 products)
        logging.info("Selecting Flipkart additions...")
        add_flipkart = eligible_pool[eligible_pool["marketplace"] == "flipkart"].sort_values("canonical_product_id").copy()
        assert len(add_flipkart) == 73, f"Expected 73 Flipkart additions, got {len(add_flipkart)}"

        for pid in add_flipkart["canonical_product_id"]:
            assert pid not in core_ids, f"Disjointness violation: {pid} in core"
            assert pid not in selected_addition_ids, f"Duplicate addition ID: {pid}"
            selected_addition_ids.add(pid)
            additions_membership.append({
                "canonical_product_id": pid,
                "cohort_role": "expanded_addition",
                "tier": "Tier D (Catalog Expansion)",
                "sub_tier": "exp_flipkart_evidence",
                "selection_method": "deterministic_all_eligible",
                "random_seed": self.random_seed,
            })
        logging.info("Selected %d Flipkart additions", len(add_flipkart))

        # 3b. Amazon India additions: all eligible remaining (485 products)
        logging.info("Selecting Amazon India additions...")
        add_amazon_in = eligible_pool[eligible_pool["marketplace"] == "amazon_in"].sort_values("canonical_product_id").copy()
        assert len(add_amazon_in) == 485, f"Expected 485 Amazon India additions, got {len(add_amazon_in)}"

        for pid in add_amazon_in["canonical_product_id"]:
            assert pid not in core_ids, f"Disjointness violation: {pid} in core"
            assert pid not in selected_addition_ids, f"Duplicate addition ID: {pid}"
            selected_addition_ids.add(pid)
            additions_membership.append({
                "canonical_product_id": pid,
                "cohort_role": "expanded_addition",
                "tier": "Tier D (Catalog Expansion)",
                "sub_tier": "exp_amazon_in_price",
                "selection_method": "deterministic_all_eligible",
                "random_seed": self.random_seed,
            })
        logging.info("Selected %d Amazon India additions", len(add_amazon_in))

        # 3c. Amazon US additions: all eligible remaining (4,351 products)
        logging.info("Selecting Amazon US additions...")
        add_amazon_us = eligible_pool[eligible_pool["marketplace"] == "amazon"].sort_values("canonical_product_id").copy()
        assert len(add_amazon_us) == 4351, f"Expected 4,351 Amazon US additions, got {len(add_amazon_us)}"

        for pid in add_amazon_us["canonical_product_id"]:
            assert pid not in core_ids, f"Disjointness violation: {pid} in core"
            assert pid not in selected_addition_ids, f"Duplicate addition ID: {pid}"
            selected_addition_ids.add(pid)
            additions_membership.append({
                "canonical_product_id": pid,
                "cohort_role": "expanded_addition",
                "tier": "Tier D (Catalog Expansion)",
                "sub_tier": "exp_amazon_evidence",
                "selection_method": "deterministic_all_eligible",
                "random_seed": self.random_seed,
            })
        logging.info("Selected %d Amazon US additions", len(add_amazon_us))

        # 3d. Walmart additions: stratified proportional sampling (9,407 products)
        non_walmart_additions = len(selected_addition_ids)
        walmart_target = 14316 - non_walmart_additions
        assert walmart_target == 9407, f"Expected Walmart target 9,407, got {walmart_target}"
        assert sum(self.WALMART_EXPANSION_TARGETS.values()) == walmart_target

        walmart_pool = eligible_pool[eligible_pool["marketplace"] == "walmart"].sort_values("canonical_product_id").copy()
        assert len(walmart_pool) == 17714, f"Expected 17,714 candidates in Walmart eligible pool, got {len(walmart_pool)}"

        logging.info("Selecting %d Walmart additions via stratified sampling...", walmart_target)
        walmart_sampled_dfs = []
        for cat, target_n in self.WALMART_EXPANSION_TARGETS.items():
            cat_pool = walmart_pool[walmart_pool["category"] == cat].sort_values("canonical_product_id")
            assert len(cat_pool) >= target_n, f"Pool underflow for Walmart {cat}: {len(cat_pool)} < {target_n}"
            sample = cat_pool.sample(n=target_n, random_state=self.random_seed)
            walmart_sampled_dfs.append(sample)

        add_walmart = pd.concat(walmart_sampled_dfs).sort_values("canonical_product_id")
        assert len(add_walmart) == 9407

        for pid in add_walmart["canonical_product_id"]:
            assert pid not in core_ids, f"Disjointness violation: {pid} in core"
            assert pid not in selected_addition_ids, f"Duplicate addition ID: {pid}"
            selected_addition_ids.add(pid)
            additions_membership.append({
                "canonical_product_id": pid,
                "cohort_role": "expanded_addition",
                "tier": "Tier D (Catalog Expansion)",
                "sub_tier": "exp_walmart_stratified_price",
                "selection_method": "deterministic_category_stratified_sampling",
                "random_seed": self.random_seed,
            })
        logging.info("Selected %d Walmart additions across %d categories", len(add_walmart), len(self.WALMART_EXPANSION_TARGETS))

        # 4. Assemble and verify additions
        assert len(selected_addition_ids) == 14316, f"Expected 14,316 additions, got {len(selected_addition_ids)}"
        df_additions_membership = pd.DataFrame(additions_membership)
        assert len(df_additions_membership) == 14316

        # Check disjointness with core cohort
        overlap = core_ids.intersection(selected_addition_ids)
        assert len(overlap) == 0, f"Disjointness violated! {len(overlap)} overlapping IDs"

        # 5. Build combined membership DataFrame (20,000 rows)
        logging.info("Assembling 20,000 cohort membership...")
        cols_membership = ["canonical_product_id", "cohort_role", "tier", "sub_tier", "selection_method", "random_seed"]
        core_mem_reordered = core_membership[cols_membership].copy()
        add_mem_reordered = df_additions_membership[cols_membership].copy()

        df_membership_20k = pd.concat([core_mem_reordered, add_mem_reordered], ignore_index=True)
        df_membership_20k = df_membership_20k.sort_values("canonical_product_id").reset_index(drop=True)

        assert len(df_membership_20k) == 20000, f"Expected 20,000 rows in membership, got {len(df_membership_20k)}"
        assert df_membership_20k["canonical_product_id"].is_unique, "Duplicate IDs in combined membership!"

        # 6. Build combined curated products DataFrame (20,000 rows)
        logging.info("Assembling 20,000 curated products DataFrame...")
        combined_ids = set(df_membership_20k["canonical_product_id"])
        assert len(combined_ids) == 20000

        # Extract complete product records from master
        df_products_20k = master[master["canonical_product_id"].isin(combined_ids)].copy()
        assert len(df_products_20k) == 20000
        # Merge membership metadata
        df_products_20k = df_products_20k.merge(df_membership_20k, on="canonical_product_id", how="left")
        df_products_20k = df_products_20k.sort_values("canonical_product_id").reset_index(drop=True)

        # 7. Write Parquet and JSON artifacts
        logging.info("Writing artifacts to %s...", self.output_dir)
        curated_20k_path = self.output_dir / "curated_products_20000.parquet"
        membership_20k_path = self.output_dir / "cohort_membership_20000.parquet"
        metadata_20k_path = self.output_dir / "cohort_metadata_20000.json"

        df_products_20k.to_parquet(curated_20k_path, index=False)
        df_membership_20k.to_parquet(membership_20k_path, index=False)

        # 8. Compute hashes and build metadata
        curated_sha256 = self.compute_sha256(curated_20k_path)
        membership_sha256 = self.compute_sha256(membership_20k_path)

        elapsed = time.time() - t0
        metadata: Dict[str, Any] = {
            "generation_timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "elapsed_seconds": round(elapsed, 2),
            "random_seed": self.random_seed,
            "target_cohort_size": 20000,
            "actual_cohort_size": len(df_products_20k),
            "core_subset_size": len(core_ids),
            "additions_size": len(selected_addition_ids),
            "disjointness_verified": True,
            "cohort_role_counts": df_membership_20k["cohort_role"].value_counts().to_dict(),
            "tier_counts": df_membership_20k["tier"].value_counts().to_dict(),
            "sub_tier_counts": df_membership_20k["sub_tier"].value_counts().to_dict(),
            "marketplace_distribution": df_products_20k["marketplace"].value_counts().to_dict(),
            "category_distribution": df_products_20k["category"].value_counts().to_dict(),
            "price_coverage": {
                "canonical_valid_price_universe": int((master["price_valid"]).sum()),
                "core_5684_valid_price": int(((df_products_20k["cohort_role"] == "core_5684") & df_products_20k["price_valid"]).sum()),
                "additions_14316_valid_price": int(((df_products_20k["cohort_role"] == "expanded_addition") & df_products_20k["price_valid"]).sum()),
                "final_20000_valid_price": int(df_products_20k["price_valid"].sum()),
                "unselected_valid_price": int((master["price_valid"]).sum()) - int(df_products_20k["price_valid"].sum()),
                "price_coverage_pct": round(float(df_products_20k["price_valid"].sum()) / float((master["price_valid"]).sum()) * 100, 2),
            },
            "modality_coverage": {
                "products_with_reviews": int(df_products_20k["nlp_valid"].sum()),
                "canonical_products_with_reviews": int(master["nlp_valid"].sum()),
                "review_retention_pct": round(float(df_products_20k["nlp_valid"].sum()) / float(master["nlp_valid"].sum()) * 100, 2),
                "products_with_embeddings": int(df_products_20k["cv_valid"].sum()),
                "canonical_products_with_embeddings": int(master["cv_valid"].sum()),
                "embedding_retention_pct": round(float(df_products_20k["cv_valid"].sum()) / float(master["cv_valid"].sum()) * 100, 2),
            },
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
                "core_curated_products_5684": {
                    "path": str(self.core_curated_path),
                    "sha256": self.compute_sha256(self.core_curated_path),
                    "rows": 5684,
                },
                "core_cohort_membership": {
                    "path": str(self.core_membership_path),
                    "sha256": self.compute_sha256(self.core_membership_path),
                    "rows": 5684,
                },
            },
            "generated_files": {
                "curated_products_20000_parquet": {
                    "path": str(curated_20k_path),
                    "sha256": curated_sha256,
                    "rows": len(df_products_20k),
                },
                "cohort_membership_20000_parquet": {
                    "path": str(membership_20k_path),
                    "sha256": membership_sha256,
                    "rows": len(df_membership_20k),
                },
                "cohort_metadata_20000_json": {
                    "path": str(metadata_20k_path),
                },
            },
        }

        with open(metadata_20k_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

        logging.info("Saved metadata to %s", metadata_20k_path)
        logging.info("20,000 Cohort generation complete in %.2f seconds", elapsed)

        return df_products_20k, df_membership_20k, metadata


if __name__ == "__main__":
    builder = ExpandedCohortBuilder()
    products_df, membership_df, meta = builder.generate()
    print("\n20,000 Cohort Generation Complete:")
    print("Actual Cohort Size:", len(products_df))
    print("Core Subset:", meta["core_subset_size"])
    print("Additions:", meta["additions_size"])
    print("Cohort Role Counts:", meta["cohort_role_counts"])
    print("Marketplace Breakdown:", meta["marketplace_distribution"])
    print("Price Coverage:", meta["price_coverage"])
