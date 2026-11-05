"""
scratch/generate_audit_data.py
------------------------------
Extract and format all statistics needed for reports/product_coverage_audit.md.
"""

import pandas as pd
import numpy as np
import json

products = pd.read_parquet('data/processed/canonical_products.parquet')
reviews = pd.read_parquet('data/processed/canonical_reviews.parquet')
review_feats = pd.read_parquet('data/processed/product_review_features.parquet')
cv_feats = pd.read_parquet('data/processed/cv_product_features_expanded.parquet')
relationships = pd.read_parquet('data/processed/canonical_relationships.parquet')

# Build master coverage table
master = products[['canonical_product_id', 'marketplace', 'category', 'price', 'currency', 'brand', 'seller_name']].copy()

# Add CV
cv_subset = cv_feats[['canonical_product_id', 'total_image_records', 'downloaded_image_count', 'usable_image_count', 
                      'has_product_embedding', 'ocr_readable_image_count', 'visual_evidence_status',
                      'cross_product_duplicate_image_count', 'within_product_duplicate_image_count']].copy()
master = master.merge(cv_subset, on='canonical_product_id', how='left')

# Add NLP
rev_subset = review_feats[['canonical_product_id', 'review_count', 'listing_state', 'average_rating', 
                           'verified_review_count', 'eligible_sentiment_review_count', 'exact_duplicate_review_count',
                           'max_intra_listing_similarity']].copy()
master = master.merge(rev_subset, on='canonical_product_id', how='left')

# Modality statuses
master['price_status'] = np.where(master['price'].notna() & (master['price'] > 0), 'AVAILABLE', 'NOT_AVAILABLE')
master['has_usable_cv'] = master['visual_evidence_status'].isin(['USABLE_IMAGE_EVIDENCE', 'PARTIAL_IMAGE_EVIDENCE'])
master['nlp_status'] = 'NOT_COVERED'
in_rev_mask = master['listing_state'].notna()
master.loc[in_rev_mask & (master['review_count'] > 0), 'nlp_status'] = 'AVAILABLE'
master.loc[in_rev_mask & (master['review_count'] == 0), 'nlp_status'] = 'ZERO_REVIEWS'

master['has_usable_nlp'] = master['nlp_status'] == 'AVAILABLE'
master['has_usable_price'] = master['price_status'] == 'AVAILABLE'

# Overall Evidence Status:
# - TRIPLE_MODALITY: NLP + CV + Price
# - DUAL_MODALITY: Any 2 of (NLP, CV, Price)
# - SINGLE_MODALITY: Any 1 of (NLP, CV, Price)
# - ZERO_MODALITY: None
mod_sum = master['has_usable_nlp'].astype(int) + master['has_usable_cv'].astype(int) + master['has_usable_price'].astype(int)
master['modality_count'] = mod_sum
master['overall_evidence_tier'] = np.select(
    [mod_sum == 3, mod_sum == 2, mod_sum == 1, mod_sum == 0],
    ['TRIPLE_MODALITY', 'DUAL_MODALITY', 'SINGLE_MODALITY', 'ZERO_MODALITY'],
    default='ZERO_MODALITY'
)

print("Overall Evidence Tier Distribution:")
print(master['overall_evidence_tier'].value_counts())

# Marketplace x Tier
print("\nMarketplace by Evidence Tier:")
mkt_tier = pd.crosstab(master['marketplace'], master['overall_evidence_tier'], margins=True)
print(mkt_tier)

# Category x Tier
print("\nCategory by Evidence Tier:")
cat_tier = pd.crosstab(master['category'], master['overall_evidence_tier'], margins=True)
print(cat_tier)

# Review details
print("\nReview Count Distribution for Products with Reviews:")
rev_prods = master[master['has_usable_nlp']]
print(rev_prods['review_count'].describe(percentiles=[0.25, 0.5, 0.75, 0.9, 0.95, 0.99]))

# Image details
print("\nUsable Image Count Distribution for Products with Usable CV:")
cv_prods = master[master['has_usable_cv']]
print(cv_prods['usable_image_count'].describe(percentiles=[0.25, 0.5, 0.75, 0.9, 0.95, 0.99]))

# Price details by currency
print("\nPrice summary USD:")
print(master[master['has_usable_price'] & (master['currency'] == 'USD')]['price'].describe())
print("\nPrice summary INR:")
print(master[master['has_usable_price'] & (master['currency'] == 'INR')]['price'].describe())
