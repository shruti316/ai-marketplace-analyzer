"""
scratch/analyze_expansion_pool.py
---------------------------------
Analyze the remaining pool of 25,605 products outside the 5,684 cohort
to design the exact allocation for 14,316 additional products.
"""

import pandas as pd
import numpy as np

# Load canonical products and features
products = pd.read_parquet('data/processed/canonical_products.parquet')
curated_5684 = pd.read_parquet('data/curated/curated_products_5684.parquet')
curated_ids = set(curated_5684['canonical_product_id'])
assert len(curated_ids) == 5684

# Identify remaining pool
pool = products[~products['canonical_product_id'].isin(curated_ids)].copy()
assert len(pool) == 31289 - 5684
print(f"Remaining pool size: {len(pool):,} products")

# Load CV and review features
cv_feats = pd.read_parquet('data/processed/cv_product_features_expanded.parquet')
rev_feats = pd.read_parquet('data/processed/product_review_features.parquet')

pool = pool.merge(cv_feats[['canonical_product_id', 'has_product_embedding', 'usable_image_count', 'visual_evidence_status']], on='canonical_product_id', how='left')
pool = pool.merge(rev_feats[['canonical_product_id', 'review_count', 'listing_state']], on='canonical_product_id', how='left')

pool['price_valid'] = pool['price'].notna() & (pool['price'] > 0)
pool['cv_valid'] = pool['has_product_embedding'].eq(True)
pool['nlp_valid'] = pool['review_count'].notna() & (pool['review_count'] > 0)

# Check evidence presence
has_any_evidence = pool['price_valid'] | pool['cv_valid'] | pool['nlp_valid']
print(f"Products in remaining pool with AT LEAST ONE evidence modality: {has_any_evidence.sum():,} ({has_any_evidence.mean()*100:.2f}%)")
print(f"Products in remaining pool with ZERO evidence modalities: {(~has_any_evidence).sum():,} ({(~has_any_evidence).mean()*100:.2f}%)")

print("\n" + "="*60)
print("REMAINING POOL BY MARKETPLACE (TOTAL vs EVIDENCE AVAILABLE)")
print("="*60)
mkt_summary = pool.groupby('marketplace').agg(
    total_remaining=('canonical_product_id', 'count'),
    with_any_evidence=('canonical_product_id', lambda s: has_any_evidence.loc[s.index].sum()),
    zero_evidence=('canonical_product_id', lambda s: (~has_any_evidence).loc[s.index].sum()),
    with_price=('price_valid', 'sum'),
    with_nlp=('nlp_valid', 'sum'),
    with_cv=('cv_valid', 'sum'),
).reset_index()
print(mkt_summary.to_string(index=False))

print("\n" + "="*60)
print("REMAINING POOL BY CATEGORY (WITH EVIDENCE ONLY)")
print("="*60)
cat_summary = pool[has_any_evidence].groupby(['marketplace', 'category']).size().unstack(fill_value=0)
print(cat_summary.to_string())

print("\nTotal products with evidence by category across remaining pool:")
print(pool[has_any_evidence]['category'].value_counts())
