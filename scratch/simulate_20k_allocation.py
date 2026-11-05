"""
scratch/simulate_20k_allocation.py
----------------------------------
Simulate the proposed 20,000-product allocation:
- Core 5,684 cohort preserved intact (100%)
- 14,316 additional products:
  - Flipkart: 73 products (100% of remaining with evidence)
  - Amazon India: 485 products (100% of remaining with evidence)
  - Amazon US: 4,351 products (100% of remaining with evidence)
  - Walmart: 9,407 products (sampled from 17,714, category-stratified)
"""

import pandas as pd
import numpy as np

# Load canonical products and features
products = pd.read_parquet('data/processed/canonical_products.parquet')
curated_5684 = pd.read_parquet('data/curated/curated_products_5684.parquet')
curated_ids = set(curated_5684['canonical_product_id'])

# Pool of candidates
pool = products[~products['canonical_product_id'].isin(curated_ids)].copy()
cv_feats = pd.read_parquet('data/processed/cv_product_features_expanded.parquet')
rev_feats = pd.read_parquet('data/processed/product_review_features.parquet')

pool = pool.merge(cv_feats[['canonical_product_id', 'has_product_embedding', 'usable_image_count', 'visual_evidence_status']], on='canonical_product_id', how='left')
pool = pool.merge(rev_feats[['canonical_product_id', 'review_count', 'listing_state']], on='canonical_product_id', how='left')

pool['price_valid'] = pool['price'].notna() & (pool['price'] > 0)
pool['cv_valid'] = pool['has_product_embedding'].eq(True)
pool['nlp_valid'] = pool['review_count'].notna() & (pool['review_count'] > 0)
pool['has_any_evidence'] = pool['price_valid'] | pool['cv_valid'] | pool['nlp_valid']

# Non-Walmart additionals
add_flipkart = pool[pool['has_any_evidence'] & (pool['marketplace'] == 'flipkart')].copy()
add_amazon_in = pool[pool['has_any_evidence'] & (pool['marketplace'] == 'amazon_in')].copy()
add_amazon_us = pool[pool['has_any_evidence'] & (pool['marketplace'] == 'amazon')].copy()

print(f"Additional Flipkart: {len(add_flipkart)}")
print(f"Additional Amazon India: {len(add_amazon_in)}")
print(f"Additional Amazon US: {len(add_amazon_us)}")

target_additional = 14316
non_walmart_add = len(add_flipkart) + len(add_amazon_in) + len(add_amazon_us)
walmart_target_add = target_additional - non_walmart_add

print(f"Total non-Walmart additionals: {non_walmart_add}")
print(f"Target Walmart additionals: {walmart_target_add}")

# Category stratification for Walmart 9,407 products:
walmart_pool = pool[pool['has_any_evidence'] & (pool['marketplace'] == 'walmart')].copy()
assert len(walmart_pool) == 17714

cat_counts = walmart_pool['category'].value_counts()
proportions = cat_counts / len(walmart_pool)
raw_alloc = proportions * walmart_target_add
floored = raw_alloc.astype(int)
rem = walmart_target_add - floored.sum()
diffs = raw_alloc - floored
w_alloc = floored.copy()
for c in diffs.nlargest(rem).index:
    w_alloc[c] += 1

# Ensure non-zero representation for Toys & Games (pool=2)
if w_alloc['Toys & Games'] == 0:
    w_alloc['Toys & Games'] = 1
    # subtract 1 from largest
    w_alloc['Electronics'] -= 1

assert w_alloc.sum() == walmart_target_add
print("\nWalmart 9,407 Stratified Category Allocation:")
w_alloc_df = pd.DataFrame({
    'pool_available': cat_counts,
    'allocated_count': w_alloc,
    'pool_coverage_pct': (w_alloc / cat_counts * 100).round(1)
})
print(w_alloc_df.to_string())

# Sample Walmart
w_samples = []
for cat, n in w_alloc.items():
    sample_cat = walmart_pool[walmart_pool['category'] == cat].sort_values('canonical_product_id').sample(n=n, random_state=42)
    w_samples.append(sample_cat)
add_walmart = pd.concat(w_samples).sort_values('canonical_product_id')

# Combine all additionals
all_additionals = pd.concat([add_flipkart, add_amazon_in, add_amazon_us, add_walmart]).sort_values('canonical_product_id')
assert len(all_additionals) == 14316
assert len(set(all_additionals['canonical_product_id']).intersection(curated_ids)) == 0

# Full 20k cohort
cohort_20k_ids = set(curated_5684['canonical_product_id']).union(set(all_additionals['canonical_product_id']))
assert len(cohort_20k_ids) == 20000

df_20k = products[products['canonical_product_id'].isin(cohort_20k_ids)].copy()
df_20k = df_20k.merge(cv_feats[['canonical_product_id', 'has_product_embedding', 'usable_image_count', 'visual_evidence_status']], on='canonical_product_id', how='left')
df_20k = df_20k.merge(rev_feats[['canonical_product_id', 'review_count', 'listing_state']], on='canonical_product_id', how='left')
df_20k['price_valid'] = df_20k['price'].notna() & (df_20k['price'] > 0)
df_20k['cv_valid'] = df_20k['has_product_embedding'].eq(True)
df_20k['nlp_valid'] = df_20k['review_count'].notna() & (df_20k['review_count'] > 0)

print("\n" + "="*60)
print("FINAL 20,000 COHORT SUMMARY")
print("="*60)
print(f"Total Products: {len(df_20k):,}")
print(f"Core 5,684 Cohort Products: {df_20k['canonical_product_id'].isin(curated_ids).sum():,}")
print(f"Newly Added Expansion Products: {(~df_20k['canonical_product_id'].isin(curated_ids)).sum():,}")

print("\nMarketplace Distribution in 20,000 Cohort:")
mkt_dist = pd.DataFrame({
    'count_20k': df_20k['marketplace'].value_counts(),
    'pct_20k': (df_20k['marketplace'].value_counts(normalize=True)*100).round(2),
    'catalog_total': products['marketplace'].value_counts(),
    'catalog_coverage_pct': (df_20k['marketplace'].value_counts() / products['marketplace'].value_counts() * 100).round(1)
})
print(mkt_dist.to_string())

print("\nCategory Distribution in 20,000 Cohort:")
cat_dist = pd.DataFrame({
    'count_20k': df_20k['category'].value_counts(),
    'pct_20k': (df_20k['category'].value_counts(normalize=True)*100).round(2),
    'catalog_total': products['category'].value_counts(),
    'catalog_coverage_pct': (df_20k['category'].value_counts() / products['category'].value_counts() * 100).round(1)
})
print(cat_dist.to_string())

print("\nEvidence Modality Distribution in 20,000 Cohort:")
print(f"Valid Price: {df_20k['price_valid'].sum():,} ({df_20k['price_valid'].mean()*100:.2f}%)")
print(f"Usable Reviews (NLP): {df_20k['nlp_valid'].sum():,} ({df_20k['nlp_valid'].mean()*100:.2f}%)")
print(f"Usable Images (CV): {df_20k['cv_valid'].sum():,} ({df_20k['cv_valid'].mean()*100:.2f}%)")

# Overlap breakdown in 20,000
triple = df_20k['price_valid'] & df_20k['nlp_valid'] & df_20k['cv_valid']
cv_pr = df_20k['price_valid'] & df_20k['cv_valid'] & (~df_20k['nlp_valid'])
nlp_pr = df_20k['price_valid'] & df_20k['nlp_valid'] & (~df_20k['cv_valid'])
nlp_cv = df_20k['nlp_valid'] & df_20k['cv_valid'] & (~df_20k['price_valid'])
pr_only = df_20k['price_valid'] & (~df_20k['nlp_valid']) & (~df_20k['cv_valid'])
nlp_only = df_20k['nlp_valid'] & (~df_20k['price_valid']) & (~df_20k['cv_valid'])
cv_only = df_20k['cv_valid'] & (~df_20k['price_valid']) & (~df_20k['nlp_valid'])
zero_ev = (~df_20k['price_valid']) & (~df_20k['nlp_valid']) & (~df_20k['cv_valid'])

print("\nMutually Exclusive Modality Breakdown in 20,000 Cohort:")
print(f"- Triple Modality (NLP + CV + Price): {triple.sum():,}")
print(f"- Dual Modality: CV + Price:          {cv_pr.sum():,}")
print(f"- Dual Modality: NLP + Price:         {nlp_pr.sum():,}")
print(f"- Dual Modality: NLP + CV:            {nlp_cv.sum():,}")
print(f"- Single Modality: Price Only:        {pr_only.sum():,}")
print(f"- Single Modality: NLP Only:          {nlp_only.sum():,}")
print(f"- Single Modality: CV Only:           {cv_only.sum():,}")
print(f"- Zero Modalities:                    {zero_ev.sum():,}")
assert zero_ev.sum() == 0
assert (triple.sum() + cv_pr.sum() + nlp_pr.sum() + nlp_cv.sum() + pr_only.sum() + nlp_only.sum() + cv_only.sum()) == 20000
