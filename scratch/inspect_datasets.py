"""
scratch/inspect_datasets.py
---------------------------
Inspect columns, row counts, unique IDs, and dtypes of key authoritative datasets.
"""

import pandas as pd
import numpy as np

files = {
    "canonical_products": "data/processed/canonical_products.parquet",
    "canonical_reviews": "data/processed/canonical_reviews.parquet",
    "product_review_features": "data/processed/product_review_features.parquet",
    "marketplace_text_features": "data/processed/marketplace_text_features.parquet",
    "canonical_relationships": "data/processed/canonical_relationships.parquet",
    "cv_product_features_expanded": "data/processed/cv_product_features_expanded.parquet",
    "matched_pairs": "data/processed/matched_cross_marketplace_pairs.parquet",
}

for name, path in files.items():
    print(f"=== {name} ({path}) ===")
    try:
        df = pd.read_parquet(path)
        print(f"Rows: {len(df):,}, Cols: {len(df.columns)}")
        print(f"Columns: {list(df.columns)}")
        if "canonical_product_id" in df.columns:
            print(f"Unique canonical_product_ids: {df['canonical_product_id'].nunique():,}")
        print()
    except Exception as e:
        print(f"Error loading {path}: {e}\n")
