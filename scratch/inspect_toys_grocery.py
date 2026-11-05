"""
scratch/inspect_toys_grocery.py
-------------------------------
Inspect the exact product IDs of Walmart Toys & Games and Grocery & Household Essentials.
"""

import pandas as pd

products = pd.read_parquet('data/processed/canonical_products.parquet')
curated = pd.read_parquet('data/curated/curated_products_5684.parquet')
curated_ids = set(curated['canonical_product_id'])

w_toys = products[(products['marketplace'] == 'walmart') & (products['category'] == 'Toys & Games')]
print("Walmart Toys & Games products (all 3 in catalog):")
for _, r in w_toys.iterrows():
    in_c = r['canonical_product_id'] in curated_ids
    print(f"  ID: {r['canonical_product_id']:15s} | Price: {r['price']} | In 5,684 Cohort: {in_c} | Title: {r['title'][:45]}")

w_groc = products[(products['marketplace'] == 'walmart') & (products['category'] == 'Grocery & Household Essentials')]
print("\nWalmart Grocery & Household Essentials products (1 in catalog):")
for _, r in w_groc.iterrows():
    in_c = r['canonical_product_id'] in curated_ids
    print(f"  ID: {r['canonical_product_id']:15s} | Price: {r['price']} | In 5,684 Cohort: {in_c} | Title: {r['title'][:45]}")
