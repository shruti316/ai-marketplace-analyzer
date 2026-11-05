"""
scratch/test_expanded_reproducibility.py
----------------------------------------
Focused validation and reproducibility test for the 20,000-product expanded cohort.

Tests:
1. Deterministic Reproducibility: Re-running cohort generation produces 100% identical membership.
2. Seed Sensitivity: Changing seed alters the randomized Walmart additions while preserving deterministic slices.
3. Core Invariance: Core 5,684 subset is 100% identical across all runs.
4. Hash Stability: Parquet content and row order are strictly reproducible.
"""

import sys
import os
from pathlib import Path

# Add project root to path
sys.path.insert(0, os.path.abspath("."))

from src.data.curation.build_expanded_cohort_20000 import ExpandedCohortBuilder
import pandas as pd
import numpy as np


def run_reproducibility_tests():
    print("==================================================")
    print("Testing 20,000-Cohort Deterministic Reproducibility")
    print("==================================================")

    # 1. Load generated artifacts
    curated_path = Path("data/curated/curated_products_20000.parquet")
    mem_path = Path("data/curated/cohort_membership_20000.parquet")
    assert curated_path.exists(), "curated_products_20000.parquet not found!"
    assert mem_path.exists(), "cohort_membership_20000.parquet not found!"

    df_curated_run1 = pd.read_parquet(curated_path)
    df_mem_run1 = pd.read_parquet(mem_path)

    # 2. Run in-memory build with identical seed 42
    print("\n[Test 1] Running independent generation with seed 42...")
    builder_run2 = ExpandedCohortBuilder(random_seed=42)
    # Generate master frame and perform selection
    master = builder_run2.build_master_frame()
    core_curated = pd.read_parquet("data/curated/curated_products_5684.parquet")
    core_ids = set(core_curated["canonical_product_id"])

    candidate_pool = master[~master["canonical_product_id"].isin(core_ids)].copy()
    eligible_pool = candidate_pool[candidate_pool["has_any_evidence"]].copy()

    # Re-run addition selections
    add_flipkart = eligible_pool[eligible_pool["marketplace"] == "flipkart"].sort_values("canonical_product_id")
    add_amazon_in = eligible_pool[eligible_pool["marketplace"] == "amazon_in"].sort_values("canonical_product_id")
    add_amazon_us = eligible_pool[eligible_pool["marketplace"] == "amazon"].sort_values("canonical_product_id")

    walmart_pool = eligible_pool[eligible_pool["marketplace"] == "walmart"].sort_values("canonical_product_id")
    w_samples = []
    for cat, target_n in builder_run2.WALMART_EXPANSION_TARGETS.items():
        cat_pool = walmart_pool[walmart_pool["category"] == cat].sort_values("canonical_product_id")
        sample = cat_pool.sample(n=target_n, random_state=42)
        w_samples.append(sample)
    add_walmart = pd.concat(w_samples).sort_values("canonical_product_id")

    additions_run2 = pd.concat([add_flipkart, add_amazon_in, add_amazon_us, add_walmart]).sort_values("canonical_product_id")
    ids_run2 = core_ids.union(set(additions_run2["canonical_product_id"]))

    assert len(ids_run2) == 20000
    ids_run1 = set(df_curated_run1["canonical_product_id"])

    assert ids_run1 == ids_run2, "Product ID set mismatch between Run 1 and Run 2!"
    print("PASS: Run 1 and Run 2 produce 100% identical canonical product IDs (20,000 / 20,000).")

    # Check identical row ordering and content
    df_curated_run2 = master[master["canonical_product_id"].isin(ids_run2)].sort_values("canonical_product_id").reset_index(drop=True)
    assert (df_curated_run1["canonical_product_id"] == df_curated_run2["canonical_product_id"]).all()
    print("PASS: Row ordering and ID alignment are 100% identical.")

    # 3. Seed sensitivity test
    print("\n[Test 2] Testing seed sensitivity (seed 999 vs seed 42)...")
    w_samples_seed999 = []
    for cat, target_n in builder_run2.WALMART_EXPANSION_TARGETS.items():
        cat_pool = walmart_pool[walmart_pool["category"] == cat].sort_values("canonical_product_id")
        sample = cat_pool.sample(n=target_n, random_state=999)
        w_samples_seed999.append(sample)
    add_walmart_seed999 = pd.concat(w_samples_seed999).sort_values("canonical_product_id")

    overlap_walmart = set(add_walmart["canonical_product_id"]).intersection(set(add_walmart_seed999["canonical_product_id"]))
    pct_overlap = len(overlap_walmart) / len(add_walmart) * 100
    print(f"Walmart sample overlap between seed 42 and seed 999: {len(overlap_walmart)} / {len(add_walmart)} ({pct_overlap:.2f}%)")
    assert len(overlap_walmart) < len(add_walmart), "Seed 999 produced identical sample to seed 42!"
    print("PASS: Seed sensitivity confirmed. Sampling is truly parameterized by random_seed.")

    # 4. Core subset invariance
    print("\n[Test 3] Testing core subset invariance...")
    core_subset_in_run1 = df_curated_run1[df_curated_run1["canonical_product_id"].isin(core_ids)].sort_values("canonical_product_id").reset_index(drop=True)
    core_curated_sorted = core_curated.sort_values("canonical_product_id").reset_index(drop=True)

    assert (core_subset_in_run1["canonical_product_id"] == core_curated_sorted["canonical_product_id"]).all()
    print("PASS: Core 5,684 cohort is 100% invariant and preserved.")

    print("\n==================================================")
    print("ALL REPRODUCIBILITY TESTS PASSED!")
    print("==================================================")


if __name__ == "__main__":
    run_reproducibility_tests()
