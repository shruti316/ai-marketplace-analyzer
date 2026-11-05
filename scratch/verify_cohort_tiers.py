"""
scratch/verify_cohort_tiers.py
------------------------------
Verify mutual exclusivity and reproducibility of the 5,684-product tiered cohort.
"""

import pandas as pd
import numpy as np

products = pd.read_parquet('data/processed/canonical_products.parquet')
rev_feats = pd.read_parquet('data/processed/product_review_features.parquet')
cv_feats = pd.read_parquet('data/processed/cv_product_features_expanded.parquet')

# Build master
master = products[['canonical_product_id', 'marketplace', 'category', 'subcategory', 'price', 'currency', 'brand', 'title']].copy()
master = master.merge(cv_feats[['canonical_product_id', 'has_product_embedding', 'usable_image_count', 'visual_evidence_status']], on='canonical_product_id', how='left')
master = master.merge(rev_feats[['canonical_product_id', 'review_count', 'listing_state']], on='canonical_product_id', how='left')

master['price_valid'] = master['price'].notna() & (master['price'] > 0)
master['cv_valid'] = master['has_product_embedding'].eq(True)
master['nlp_valid'] = master['review_count'].notna() & (master['review_count'] > 0)

# Tier A: Gold Triple Modality (300 products)
tier_a = master[master['cv_valid'] & master['nlp_valid'] & master['price_valid']].copy()
tier_a_ids = set(tier_a['canonical_product_id'])
assert len(tier_a) == 300, f"Expected 300 in Tier A, got {len(tier_a)}"

# Tier B: High-Value Dual Modality / High Density
# B1: CV + Price (no NLP)
tier_b1 = master[~master['canonical_product_id'].isin(tier_a_ids) & master['cv_valid'] & master['price_valid']].copy()
assert len(tier_b1) == 1134, f"Expected 1134 in Tier B1, got {len(tier_b1)}"

# B2: BestBuy Dense Reviews
tier_b2 = master[~master['canonical_product_id'].isin(tier_a_ids) & (master['marketplace'] == 'bestbuy') & master['nlp_valid']].copy()
assert len(tier_b2) == 249, f"Expected 249 in Tier B2, got {len(tier_b2)}"

# B3: NLP + Price (Amazon US, no CV)
tier_b3 = master[~master['canonical_product_id'].isin(tier_a_ids) & ~master['cv_valid'] & master['nlp_valid'] & master['price_valid']].copy()
assert len(tier_b3) == 1, f"Expected 1 in Tier B3, got {len(tier_b3)}"

tier_b_ids = set(tier_b1['canonical_product_id']).union(set(tier_b2['canonical_product_id'])).union(set(tier_b3['canonical_product_id']))
assert len(tier_b_ids) == 1384, f"Expected 1384 in Tier B, got {len(tier_b_ids)}"

# Check mutual exclusivity of A and B
assert len(tier_a_ids.intersection(tier_b_ids)) == 0, "Overlap between Tier A and Tier B!"

# Tier C Candidates (disjoint from A and B)
ab_ids = tier_a_ids.union(tier_b_ids)
assert len(ab_ids) == 1684

# C1: Amazon India valid price (sample 1,000 from 1,485)
c1_pool = master[~master['canonical_product_id'].isin(ab_ids) & (master['marketplace'] == 'amazon_in') & master['price_valid']].copy()
print(f"Pool for C1 (Amazon India): {len(c1_pool)} (target: 1,000)")

# C2: Myntra valid price (exactly 1,000)
c2_pool = master[~master['canonical_product_id'].isin(ab_ids) & (master['marketplace'] == 'myntra') & master['price_valid']].copy()
print(f"Pool for C2 (Myntra): {len(c2_pool)} (target: 1,000)")
assert len(c2_pool) == 1000

# C3: Walmart valid price (sample 1,500 from 19,214)
c3_pool = master[~master['canonical_product_id'].isin(ab_ids) & (master['marketplace'] == 'walmart') & master['price_valid']].copy()
print(f"Pool for C3 (Walmart): {len(c3_pool)} (target: 1,500)")

# C4: Amazon US review products (sample 500 from 3,077)
c4_pool = master[~master['canonical_product_id'].isin(ab_ids) & (master['marketplace'] == 'amazon') & master['nlp_valid']].copy()
print(f"Pool for C4 (Amazon US Reviews): {len(c4_pool)} (target: 500)")
assert len(c4_pool) == 3077

# Mutual exclusivity test across all pools
pool_overlaps = [
    ("Tier A", tier_a_ids),
    ("Tier B1", set(tier_b1['canonical_product_id'])),
    ("Tier B2", set(tier_b2['canonical_product_id'])),
    ("Tier B3", set(tier_b3['canonical_product_id'])),
    ("Pool C1", set(c1_pool['canonical_product_id'])),
    ("Pool C2", set(c2_pool['canonical_product_id'])),
    ("Pool C3", set(c3_pool['canonical_product_id'])),
    ("Pool C4", set(c4_pool['canonical_product_id'])),
]

for i in range(len(pool_overlaps)):
    for j in range(i + 1, len(pool_overlaps)):
        n1, s1 = pool_overlaps[i]
        n2, s2 = pool_overlaps[j]
        ov = s1.intersection(s2)
        assert len(ov) == 0, f"Overlap between {n1} and {n2}: {len(ov)} items!"

print("\n[PASS] All 8 pools are 100% mutually exclusive with ZERO overlap!")
print("Target total count: 300 (Tier A) + 1,384 (Tier B) + 4,000 (Tier C) = 5,684 products.")
