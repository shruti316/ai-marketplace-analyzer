import json
from pathlib import Path
import pandas as pd
import numpy as np

project_root = Path(".")

def inspect_df(name, path):
    print(f"=== {name}: {path} ===")
    if not Path(path).exists():
        print("  FILE NOT FOUND!")
        return None
    df = pd.read_parquet(path) if path.endswith('.parquet') else pd.read_csv(path)
    print(f"  Shape: {df.shape}")
    print(f"  Columns: {list(df.columns)}")
    print(f"  Null counts per column:\n{df.isna().sum().to_dict()}")
    print("  Sample row:")
    print(df.iloc[0].to_dict() if len(df) > 0 else "EMPTY")
    print()
    return df

can_revs = inspect_df("canonical_reviews", "data/processed/canonical_reviews.parquet")
can_prods = inspect_df("canonical_products", "data/processed/canonical_products.parquet")
text_feats = inspect_df("marketplace_text_features", "data/processed/marketplace_text_features.parquet")
dense_revs = inspect_df("dense_reviews", "data/interim/dense_reviews.parquet")
ecom_bench = inspect_df("ecommerce_fake_reviews_benchmark", "data/raw/benchmarks/ecommerce_fake_reviews_benchmark.parquet")
hotel_bench = inspect_df("deceptive_opinion_spam", "data/raw/benchmarks/deceptive_opinion_spam.parquet")

# Also check other files in data/interim and data/processed
dense_prods = inspect_df("dense_products", "data/interim/dense_products.parquet")
mkt_cleaned = inspect_df("marketplace_cleaned", "data/processed/marketplace_cleaned.parquet")
