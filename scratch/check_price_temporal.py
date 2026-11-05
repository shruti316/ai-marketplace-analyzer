import pandas as pd
import os

p_cohort = pd.read_parquet('data/interim/product_pricing_cohort.parquet')
print("product_pricing_cohort columns:", list(p_cohort.columns))
print("product_pricing_cohort shape:", p_cohort.shape)
if 'canonical_product_id' in p_cohort.columns:
    print("Unique products in pricing cohort:", p_cohort['canonical_product_id'].nunique())
    # Check if multiple rows per product exist
    counts = p_cohort['canonical_product_id'].value_counts()
    print("Max observations per product in product_pricing_cohort:", counts.max())

# Check raw Flipkart
fk_raw = pd.read_csv('data/indian_marketplace/raw/products/flipkart_products_raw.csv')
print("\nFlipkart crawl_timestamp sample:", fk_raw['crawl_timestamp'].dropna().head(3).tolist())
print("Unique crawl_timestamps in Flipkart:", fk_raw['crawl_timestamp'].nunique())

# Check raw Amazon India
amz_in = pd.read_csv('data/indian_marketplace/raw/products/amazon_india_products_raw.csv')
print("\nAmazon India crawl timestamp sample:", amz_in['Crawl Timestamp'].dropna().head(3).tolist())
print("Unique crawl timestamps in Amazon India:", amz_in['Crawl Timestamp'].nunique())

# Check raw Myntra
myn_raw = pd.read_csv('data/indian_marketplace/raw/products/myntra_products_raw.csv')
print("\nMyntra crawl timestamp sample:", myn_raw['crawl_timestamp'].dropna().head(3).tolist())
print("Unique crawl timestamps in Myntra:", myn_raw['crawl_timestamp'].nunique())
