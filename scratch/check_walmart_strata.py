"""
scratch/check_walmart_strata.py
-------------------------------
Check category breakdown of Walmart price-bearing products and determine proportional allocation.
"""

import pandas as pd
import numpy as np

products = pd.read_parquet('data/processed/canonical_products.parquet')
walmart_price = products[(products['marketplace'] == 'walmart') & (products['price'].notna()) & (products['price'] > 0)].copy()

print(f"Total Walmart products with valid price: {len(walmart_price)}")
cat_counts = walmart_price['category'].value_counts()
print("\nCategory distribution:")
print(cat_counts)

# Proportional allocation for 1,500 products
target_total = 1500
proportions = cat_counts / len(walmart_price)
raw_alloc = proportions * target_total
floored = raw_alloc.astype(int)
remainder = target_total - floored.sum()

# Largest remainder method (Hamilton-Hare method)
diffs = raw_alloc - floored
alloc = floored.copy()
for cat in diffs.nlargest(remainder).index:
    alloc[cat] += 1

print("\nApproved Proportional Category Allocation for Walmart (1,500 total):")
alloc_df = pd.DataFrame({
    'total_in_pool': cat_counts,
    'proportion': proportions.round(4),
    'raw_allocation': raw_alloc.round(2),
    'allocated_count': alloc
})
print(alloc_df.to_string())
print(f"\nSum of allocations: {alloc.sum()}")
assert alloc.sum() == 1500
