"""
Deep Investigation Script:
Audits raw review corpora, unlinked reviews, seller metadata, and image URLs.
"""
from pathlib import Path
import json
import re
import pandas as pd
import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parent.parent

print("=== 1. Inspecting All Raw and Processed Review Files ===")
review_files = list(PROJECT_ROOT.glob("data/**/review*.*")) + list(PROJECT_ROOT.glob("data/**/*review*.*"))
review_files = sorted(list(set(review_files)))

for f in review_files:
    if f.is_file() and f.suffix in [".parquet", ".csv", ".jsonl"]:
        rel = f.relative_to(PROJECT_ROOT)
        size_mb = f.stat().st_size / (1024 * 1024)
        print(f"File: {rel} ({size_mb:.2f} MB)")
        try:
            if f.suffix == ".parquet":
                df = pd.read_parquet(f)
            elif f.suffix == ".csv":
                df = pd.read_csv(f, low_memory=False)
            elif f.suffix == ".jsonl":
                df = pd.read_json(f, lines=True, nrows=5)
            print(f"  Shape: {df.shape}, Columns: {list(df.columns)[:8]}")
            if "marketplace" in df.columns:
                print(f"  Marketplace counts: {df['marketplace'].value_counts().to_dict()}")
        except Exception as e:
            print(f"  Error reading: {e}")

print("\n=== 2. Investigating Flipkart 240 Unlinked Reviews ===")
v16_revs = pd.read_parquet(PROJECT_ROOT / "data/marketplace_trust_dataset_v1.6/evidence/reviews.parquet")
unlinked_240 = v16_revs[v16_revs["marketplace"] == "uncertain"]
print("Uncertain 240 reviews shape:", unlinked_240.shape)
print("Uncertain columns:", list(unlinked_240.columns))
print("Sample product_id in uncertain 240:", unlinked_240["product_id"].head(10).tolist())
print("Sample canonical_product_id in uncertain 240:", unlinked_240["canonical_product_id"].head(10).tolist())
print("Sample review_title in uncertain 240:", unlinked_240["review_title"].head(5).tolist())

print("\n=== 3. Investigating Raw Seller Fields ===")
for p_file in [
    "data/raw/flipkart/flipkart_products_raw.csv",
    "data/raw/amazon_india/amazon_india_products_raw.csv",
    "data/raw/myntra/myntra_products_raw.csv"
]:
    p_path = PROJECT_ROOT / p_file
    if p_path.exists():
        df_p = pd.read_csv(p_path, nrows=5)
        seller_cols = [c for c in df_p.columns if any(s in c.lower() for s in ["seller", "merchant", "store", "vendor"])]
        print(f"{p_file} cols related to seller: {seller_cols}")
        print(f"All cols: {list(df_p.columns)}")
