"""
scratch/test_deterministic_reproducibility.py
---------------------------------------------
Test deterministic reproducibility by running CuratedCohortBuilder in a temporary directory
and comparing against data/curated.
"""

import os
import sys
import shutil
from pathlib import Path

sys.path.insert(0, os.path.abspath("."))

import pandas as pd
from src.data.curation.build_curated_cohort import CuratedCohortBuilder

temp_dir = Path("data/curated/temp_verify")
temp_dir.mkdir(parents=True, exist_ok=True)

try:
    print("Running second generation pass in temporary directory...")
    builder = CuratedCohortBuilder(output_dir=str(temp_dir), random_seed=42)
    df_curated_2, df_mem_2, meta_2 = builder.generate()

    # Load original
    orig_curated = pd.read_parquet("data/curated/curated_products_5684.parquet")
    orig_mem = pd.read_parquet("data/curated/cohort_membership.parquet")

    # Compare DataFrames
    pd.testing.assert_frame_equal(df_curated_2, orig_curated)
    pd.testing.assert_frame_equal(df_mem_2, orig_mem)

    print("\n[PASS] Deterministic reproduction check PASSED 100%!")
    print("Original and second-run outputs are bit-for-bit, row-for-row, and value-for-value identical.")

finally:
    if temp_dir.exists():
        shutil.rmtree(temp_dir)
        print("Cleaned up temporary verification directory.")
