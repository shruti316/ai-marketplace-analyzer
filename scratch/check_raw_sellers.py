import os, glob
import pandas as pd

raw_files = [
    'data/indian_marketplace/raw/products/amazon_india_products_raw.csv',
    'data/indian_marketplace/raw/products/flipkart_products_raw.csv',
    'data/indian_marketplace/raw/products/myntra_products_raw.csv',
    'data/raw/walmart/walmart_products_raw.csv',
    'data/raw/amazon/all_beauty_metadata.parquet'
]

for p in raw_files:
    if not os.path.exists(p):
        print("Missing:", p)
        continue
    if p.endswith('.csv'):
        df = pd.read_csv(p, nrows=5)
    else:
        df = pd.read_parquet(p)
    seller_cols = [c for c in df.columns if any(k in c.lower() for k in ['seller', 'merchant', 'vendor', 'store'])]
    print(f"\nFile: {p}")
    print(f"  Seller-related columns found: {seller_cols}")
    if seller_cols:
        for c in seller_cols:
            sample_vals = df[c].dropna().head(3).tolist()
            print(f"    {c}: sample = {sample_vals}")
