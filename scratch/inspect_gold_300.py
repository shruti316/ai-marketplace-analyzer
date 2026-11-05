"""
scratch/inspect_gold_300.py
---------------------------
Examine the 300 Gold products in detail.
"""

import pandas as pd
import numpy as np

products = pd.read_parquet('data/processed/canonical_products.parquet')
rev_feats = pd.read_parquet('data/processed/product_review_features.parquet')
cv_feats = pd.read_parquet('data/processed/cv_product_features_expanded.parquet')

# Merge
master = products[['canonical_product_id', 'marketplace', 'category', 'subcategory', 'price', 'currency', 'brand', 'title']].copy()
master = master.merge(cv_feats[['canonical_product_id', 'has_product_embedding', 'usable_image_count', 'ocr_readable_image_count', 'visual_evidence_status']], on='canonical_product_id')
master = master.merge(rev_feats[['canonical_product_id', 'review_count', 'listing_state', 'average_rating', 'verified_purchase_ratio', 'max_intra_listing_similarity']], on='canonical_product_id')

gold = master[master['has_product_embedding'] & (master['review_count'] > 0) & (master['price'] > 0)].copy()

print(f"Total Gold products: {len(gold)}")
print(f"Marketplace distribution:\n{gold['marketplace'].value_counts()}")
print(f"Category distribution:\n{gold['category'].value_counts()}")
print(f"Subcategory distribution:\n{gold['subcategory'].value_counts()}")

print("\nPrice Statistics (USD):")
print(gold['price'].describe())

print("\nReview Count Statistics:")
print(gold['review_count'].describe(percentiles=[0.25, 0.5, 0.75, 0.9, 0.95, 0.99]))
print("Listing State Breakdown:\n", gold['listing_state'].value_counts())

print("\nUsable Image Count Statistics:")
print(gold['usable_image_count'].describe())

print("\nOCR Readable Image Count:")
print(gold['ocr_readable_image_count'].value_counts())

print("\nBrands count:", gold['brand'].nunique())
print("Top 10 brands:\n", gold['brand'].value_counts().head(10))
