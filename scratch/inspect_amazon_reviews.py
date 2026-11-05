"""
scratch/inspect_amazon_reviews.py
---------------------------------
Inspect Amazon US review-bearing products and propose sampling strategy.
"""

import pandas as pd
import numpy as np

products = pd.read_parquet('data/processed/canonical_products.parquet')
rev_feats = pd.read_parquet('data/processed/product_review_features.parquet')
cv_feats = pd.read_parquet('data/processed/cv_product_features_expanded.parquet')

# Merge
df = products[products['marketplace'] == 'amazon'][['canonical_product_id', 'category', 'subcategory', 'price', 'brand']].copy()
df = df.merge(rev_feats[['canonical_product_id', 'review_count', 'listing_state', 'average_rating', 'verified_purchase_ratio', 'max_intra_listing_similarity']], on='canonical_product_id', how='left')
df = df.merge(cv_feats[['canonical_product_id', 'has_product_embedding', 'visual_evidence_status']], on='canonical_product_id', how='left')

# Exclude Tier A (300 triple) and Tier B (1 dual NLP+price)
tier_a_mask = df['has_product_embedding'].eq(True) & df['review_count'].gt(0) & df['price'].notna() & df['price'].gt(0)
tier_b_nlp_price_mask = df['has_product_embedding'].ne(True) & df['review_count'].gt(0) & df['price'].notna() & df['price'].gt(0)

print(f"Total Amazon US products: {len(df)}")
print(f"Tier A Amazon US (Triple): {tier_a_mask.sum()}")
print(f"Tier B Amazon US (NLP+Price, no CV): {tier_b_nlp_price_mask.sum()}")

candidates = df[~tier_a_mask & ~tier_b_nlp_price_mask & (df['review_count'] > 0)].copy()
print(f"\nRemaining Amazon US products with review_count > 0: {len(candidates)}")

print("\nReview Count Distribution of Candidates:")
print(candidates['review_count'].describe(percentiles=[0.25, 0.5, 0.75, 0.9, 0.95, 0.99]))
print("\nListing State Distribution:")
print(candidates['listing_state'].value_counts())

print("\nReview Count Exact Value Counts (Top 10):")
print(candidates['review_count'].value_counts().head(10))

print("\nCategory Distribution of Candidates:")
print(candidates['category'].value_counts())

# Multi-review candidate count
multi_cand = candidates[candidates['review_count'] > 1]
print(f"\nMulti-review candidates (>1 review): {len(multi_cand)}")
print(multi_cand['review_count'].describe())
print("Multi-review candidates by category:")
print(multi_cand['category'].value_counts())
