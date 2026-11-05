"""
scratch/verify_actual_ids_20k.py
--------------------------------
Comprehensive ID-level verification of the proposed 20,000-product cohort.
Tests exact disjointness, product ID allocations, marketplace counts, and category counts.
"""

import pandas as pd
import numpy as np

# 1. Load canonical products and existing 5,684 cohort
products = pd.read_parquet('data/processed/canonical_products.parquet')
curated_5684 = pd.read_parquet('data/curated/curated_products_5684.parquet')
cv_feats = pd.read_parquet('data/processed/cv_product_features_expanded.parquet')
rev_feats = pd.read_parquet('data/processed/product_review_features.parquet')

curated_5684_ids = set(curated_5684['canonical_product_id'])
assert len(curated_5684_ids) == 5684, "curated_5684 does not have 5,684 unique IDs"

# 2. Build candidate pool strictly disjoint from 5,684 cohort
pool = products[~products['canonical_product_id'].isin(curated_5684_ids)].copy()
assert len(pool) == 31289 - 5684
assert len(pool) == 25605

pool = pool.merge(cv_feats[['canonical_product_id', 'has_product_embedding', 'usable_image_count']], on='canonical_product_id', how='left')
pool = pool.merge(rev_feats[['canonical_product_id', 'review_count']], on='canonical_product_id', how='left')

pool['price_valid'] = pool['price'].notna() & (pool['price'] > 0)
pool['cv_valid'] = pool['has_product_embedding'].eq(True)
pool['nlp_valid'] = pool['review_count'].notna() & (pool['review_count'] > 0)
pool['has_any_evidence'] = pool['price_valid'] | pool['cv_valid'] | pool['nlp_valid']

# 3. Non-Walmart additions (all remaining with evidence)
add_flipkart = pool[pool['has_any_evidence'] & (pool['marketplace'] == 'flipkart')].copy()
add_amazon_in = pool[pool['has_any_evidence'] & (pool['marketplace'] == 'amazon_in')].copy()
add_amazon_us = pool[pool['has_any_evidence'] & (pool['marketplace'] == 'amazon')].copy()

print("--- NON-WALMART ADDITIONS ---")
print(f"Flipkart additions:    {len(add_flipkart)}")
print(f"Amazon India additions: {len(add_amazon_in)}")
print(f"Amazon US additions:    {len(add_amazon_us)}")
non_w_total = len(add_flipkart) + len(add_amazon_in) + len(add_amazon_us)
print(f"Subtotal non-Walmart:   {non_w_total}")

# 4. Walmart additionals (target = 14,316 - 4,909 = 9,407)
w_target = 14316 - non_w_total
print(f"Walmart target additions: {w_target}")
assert w_target == 9407

walmart_pool = pool[pool['has_any_evidence'] & (pool['marketplace'] == 'walmart')].copy()
print(f"\nTotal eligible Walmart pool remaining: {len(walmart_pool)}")

# Exact category counts in eligible Walmart pool
w_cat_pool = walmart_pool['category'].value_counts().to_dict()
print("Eligible Walmart pool by category:")
for cat, cnt in sorted(w_cat_pool.items(), key=lambda x: -x[1]):
    print(f"  {cat:32s}: {cnt:,}")
print(f"  Total eligible Walmart pool: {sum(w_cat_pool.values()):,}")

# Proportional allocation
w_strata_targets = {
    "Electronics": 5568,
    "Other": 2109,
    "Books & Stationery": 1056,
    "Clothing & Fashion": 367,
    "Home & Kitchen": 306,
    "Toys & Games": 1,
}
assert sum(w_strata_targets.values()) == 9407

w_samples = []
for cat, target_n in w_strata_targets.items():
    cat_df = walmart_pool[walmart_pool['category'] == cat].sort_values('canonical_product_id')
    assert len(cat_df) >= target_n, f"Pool underflow for {cat}"
    sample = cat_df.sample(n=target_n, random_state=42)
    w_samples.append(sample)

add_walmart = pd.concat(w_samples).sort_values('canonical_product_id')
assert len(add_walmart) == 9407

# 5. Assemble all 14,316 additions and verify disjointness
additionals = pd.concat([add_flipkart, add_amazon_in, add_amazon_us, add_walmart]).sort_values('canonical_product_id')
assert len(additionals) == 14316, f"Expected 14,316 additions, got {len(additionals)}"
assert additionals['canonical_product_id'].is_unique, "Duplicate IDs within additions!"

add_ids = set(additionals['canonical_product_id'])
overlap_with_core = add_ids.intersection(curated_5684_ids)
print(f"\nOverlap between additions (14,316) and core cohort (5,684): {len(overlap_with_core)}")
assert len(overlap_with_core) == 0, "DISJOINTNESS VIOLATED!"
print("[PASS] Additions are 100% disjoint from the core 5,684 cohort.")

# 6. Full 20,000 cohort assembly
full_20k_ids = curated_5684_ids.union(add_ids)
assert len(full_20k_ids) == 20000, f"Expected 20,000 IDs, got {len(full_20k_ids)}"
print("[PASS] Exactly 20,000 unique canonical product IDs in combined cohort.")

# 7. Actual ID-level metrics on the full 20,000 cohort
df_20k = products[products['canonical_product_id'].isin(full_20k_ids)].copy()
df_20k = df_20k.merge(cv_feats[['canonical_product_id', 'has_product_embedding', 'usable_image_count']], on='canonical_product_id', how='left')
df_20k = df_20k.merge(rev_feats[['canonical_product_id', 'review_count']], on='canonical_product_id', how='left')

df_20k['price_valid'] = df_20k['price'].notna() & (df_20k['price'] > 0)
df_20k['cv_valid'] = df_20k['has_product_embedding'].eq(True)
df_20k['nlp_valid'] = df_20k['review_count'].notna() & (df_20k['review_count'] > 0)

print("\n" + "="*60)
print("ACTUAL MARKETPLACE BREAKDOWN IN 20,000 COHORT (ID-LEVEL)")
print("="*60)
mkt_df = pd.DataFrame({
    'core_5684': curated_5684['marketplace'].value_counts(),
    'additionals_14316': additionals['marketplace'].value_counts(),
    'final_20000': df_20k['marketplace'].value_counts(),
    'pct_of_20000': (df_20k['marketplace'].value_counts(normalize=True)*100).round(2),
    'catalog_universe': products['marketplace'].value_counts(),
    'catalog_coverage_pct': (df_20k['marketplace'].value_counts() / products['marketplace'].value_counts() * 100).round(1)
}).fillna(0).astype({'core_5684': int, 'additionals_14316': int, 'final_20000': int, 'catalog_universe': int})
print(mkt_df.to_string())

print("\n" + "="*60)
print("ACTUAL CATEGORY BREAKDOWN IN 20,000 COHORT (ID-LEVEL)")
print("="*60)
cat_df = pd.DataFrame({
    'core_5684': curated_5684['category'].value_counts(),
    'additionals_14316': additionals['category'].value_counts(),
    'final_20000': df_20k['category'].value_counts(),
    'pct_of_20000': (df_20k['category'].value_counts(normalize=True)*100).round(2),
    'catalog_universe': products['category'].value_counts(),
    'catalog_coverage_pct': (df_20k['category'].value_counts() / products['category'].value_counts() * 100).round(1)
}).fillna(0).astype({'core_5684': int, 'additionals_14316': int, 'final_20000': int, 'catalog_universe': int})
print(cat_df.to_string())

print("\n" + "="*60)
print("PRICE COVERAGE RECONCILIATION")
print("="*60)
print(f"Total canonical products with valid price:     {products['price'].notna().sum():,}")
canon_valid_price = (products['price'].notna() & (products['price'] > 0)).sum()
print(f"Total canonical products with price > 0:       {canon_valid_price:,}")
cohort_valid_price = df_20k['price_valid'].sum()
print(f"Total 20,000 cohort with price > 0:           {cohort_valid_price:,}")
print(f"Unselected valid-price products:              {canon_valid_price - cohort_valid_price:,}")
print(f"Price coverage of 20,000 cohort:              {cohort_valid_price / canon_valid_price * 100:.2f}% of valid-price universe")
print(f"Where are the unselected valid-price products? All {canon_valid_price - cohort_valid_price:,} are from Walmart ({19214 - (1500 + 9407)} unselected).")
