"""
scratch/build_coverage_matrix.py
--------------------------------
Build the unified product-level coverage table and calculate modality overlaps,
marketplace breakdowns, category breakdowns, and tiering feasibility.
"""

import pandas as pd
import numpy as np

# 1. Load canonical products and features
products = pd.read_parquet('data/processed/canonical_products.parquet')
review_feats = pd.read_parquet('data/processed/product_review_features.parquet')
cv_feats = pd.read_parquet('data/processed/cv_product_features_expanded.parquet')

print(f"Loaded products: {len(products):,}")
print(f"Loaded review_feats: {len(review_feats):,}")
print(f"Loaded cv_feats: {len(cv_feats):,}")

# Merge into unified product master
# Canonical products base
master = products[['canonical_product_id', 'marketplace', 'category', 'price', 'currency', 'brand', 'seller_name']].copy()

# Add CV features
cv_subset = cv_feats[['canonical_product_id', 'total_image_records', 'downloaded_image_count', 'usable_image_count', 
                      'has_product_embedding', 'ocr_readable_image_count', 'visual_evidence_status',
                      'cross_product_duplicate_image_count', 'within_product_duplicate_image_count']].copy()
master = master.merge(cv_subset, on='canonical_product_id', how='left')

# Add NLP features
rev_subset = review_feats[['canonical_product_id', 'review_count', 'listing_state', 'average_rating', 
                           'verified_review_count', 'eligible_sentiment_review_count', 'exact_duplicate_review_count',
                           'max_intra_listing_similarity']].copy()
master = master.merge(rev_subset, on='canonical_product_id', how='left')

# Define Explicit Modality Statuses:
# 1. Price Status:
# - AVAILABLE: price is not null and price > 0
# - NOT_AVAILABLE: price is null or price <= 0
master['price_status'] = np.where(master['price'].notna() & (master['price'] > 0), 'AVAILABLE', 'NOT_AVAILABLE')

# 2. CV Status:
# Uses visual_evidence_status:
# - USABLE_IMAGE_EVIDENCE (1,335)
# - PARTIAL_IMAGE_EVIDENCE (312)
# - NO_USABLE_IMAGES (1,573)
# - NO_IMAGE_RECORDS (28,069)
# Binary usable CV evidence:
master['has_usable_cv'] = master['visual_evidence_status'].isin(['USABLE_IMAGE_EVIDENCE', 'PARTIAL_IMAGE_EVIDENCE'])

# 3. NLP / Review Status:
# - If not in review_feats (3,500 products from amazon_in, flipkart, myntra): NOT_COVERED
# - If in review_feats and review_count > 0: AVAILABLE (3,627 products)
# - If in review_feats and review_count == 0: ZERO_REVIEWS (24,162 products)
master['nlp_status'] = 'NOT_COVERED'
in_rev_mask = master['listing_state'].notna()
master.loc[in_rev_mask & (master['review_count'] > 0), 'nlp_status'] = 'AVAILABLE'
master.loc[in_rev_mask & (master['review_count'] == 0), 'nlp_status'] = 'ZERO_REVIEWS'

# Binary usable NLP evidence:
master['has_usable_nlp'] = master['nlp_status'] == 'AVAILABLE'
master['has_usable_price'] = master['price_status'] == 'AVAILABLE'

print("\n" + "="*60)
print("MODALITY STATUS DISTRIBUTIONS")
print("="*60)
print("Price Status Distribution:")
print(master['price_status'].value_counts())

print("\nCV Visual Evidence Status Distribution:")
print(master['visual_evidence_status'].value_counts())

print("\nNLP Status Distribution:")
print(master['nlp_status'].value_counts())

# Modality Overlap Combinations (Venn partitioning)
nlp_b = master['has_usable_nlp']
cv_b = master['has_usable_cv']
pr_b = master['has_usable_price']

nlp_only = nlp_b & (~cv_b) & (~pr_b)
cv_only = (~nlp_b) & cv_b & (~pr_b)
pr_only = (~nlp_b) & (~cv_b) & pr_b

nlp_cv = nlp_b & cv_b & (~pr_b)
nlp_pr = nlp_b & (~cv_b) & pr_b
cv_pr = (~nlp_b) & cv_b & pr_b

nlp_cv_pr = nlp_b & cv_b & pr_b
none_mod = (~nlp_b) & (~cv_b) & (~pr_b)

print("\n" + "="*60)
print("MODALITY OVERLAP BREAKDOWN (31,289 PRODUCTS)")
print("="*60)
print(f"Total Canonical Products:               {len(master):,}")
print(f"1. NLP Only:                            {nlp_only.sum():,}")
print(f"2. CV Only:                             {cv_only.sum():,}")
print(f"3. Price Only:                          {pr_only.sum():,}")
print(f"4. NLP + CV (No Price):                 {nlp_cv.sum():,}")
print(f"5. NLP + Price (No CV):                 {nlp_pr.sum():,}")
print(f"6. CV + Price (No NLP):                 {cv_pr.sum():,}")
print(f"7. NLP + CV + Price (Triple Modality):  {nlp_cv_pr.sum():,}")
print(f"8. No Usable Evidence (Zero Modalities): {none_mod.sum():,}")

total_partition = (nlp_only.sum() + cv_only.sum() + pr_only.sum() + 
                   nlp_cv.sum() + nlp_pr.sum() + cv_pr.sum() + 
                   nlp_cv_pr.sum() + none_mod.sum())
print(f"Verification Sum:                       {total_partition:,} (must be 31,289)")
assert total_partition == 31289

# Cumulative modality counts
print("\nIndividual Modality Totals:")
print(f"Total with Usable NLP (Reviews):        {nlp_b.sum():,} ({nlp_b.sum()/len(master)*100:.2f}%)")
print(f"Total with Usable CV (Embeddings):      {cv_b.sum():,} ({cv_b.sum()/len(master)*100:.2f}%)")
print(f"Total with Valid Price:                 {pr_b.sum():,} ({pr_b.sum()/len(master)*100:.2f}%)")

# Overlaps by marketplace
print("\n" + "="*60)
print("MODALITY OVERLAP BY MARKETPLACE")
print("="*60)
mkt_df = master.groupby('marketplace').agg(
    total_products=('canonical_product_id', 'count'),
    usable_nlp=('has_usable_nlp', 'sum'),
    usable_cv=('has_usable_cv', 'sum'),
    usable_price=('has_usable_price', 'sum'),
    triple_modality=('canonical_product_id', lambda s: (master.loc[s.index, 'has_usable_nlp'] & master.loc[s.index, 'has_usable_cv'] & master.loc[s.index, 'has_usable_price']).sum()),
    nlp_plus_cv=('canonical_product_id', lambda s: (master.loc[s.index, 'has_usable_nlp'] & master.loc[s.index, 'has_usable_cv']).sum()),
    nlp_plus_price=('canonical_product_id', lambda s: (master.loc[s.index, 'has_usable_nlp'] & master.loc[s.index, 'has_usable_price']).sum()),
    cv_plus_price=('canonical_product_id', lambda s: (master.loc[s.index, 'has_usable_cv'] & master.loc[s.index, 'has_usable_price']).sum()),
    at_least_one_modality=('canonical_product_id', lambda s: (master.loc[s.index, 'has_usable_nlp'] | master.loc[s.index, 'has_usable_cv'] | master.loc[s.index, 'has_usable_price']).sum()),
    zero_modalities=('canonical_product_id', lambda s: (~(master.loc[s.index, 'has_usable_nlp'] | master.loc[s.index, 'has_usable_cv'] | master.loc[s.index, 'has_usable_price'])).sum()),
).reset_index()
print(mkt_df.to_string(index=False))

# Overlaps by category
print("\n" + "="*60)
print("MODALITY OVERLAP BY CATEGORY")
print("="*60)
cat_df = master.groupby('category').agg(
    total_products=('canonical_product_id', 'count'),
    usable_nlp=('has_usable_nlp', 'sum'),
    usable_cv=('has_usable_cv', 'sum'),
    usable_price=('has_usable_price', 'sum'),
    triple_modality=('canonical_product_id', lambda s: (master.loc[s.index, 'has_usable_nlp'] & master.loc[s.index, 'has_usable_cv'] & master.loc[s.index, 'has_usable_price']).sum()),
    at_least_one_modality=('canonical_product_id', lambda s: (master.loc[s.index, 'has_usable_nlp'] | master.loc[s.index, 'has_usable_cv'] | master.loc[s.index, 'has_usable_price']).sum()),
    zero_modalities=('canonical_product_id', lambda s: (~(master.loc[s.index, 'has_usable_nlp'] | master.loc[s.index, 'has_usable_cv'] | master.loc[s.index, 'has_usable_price'])).sum()),
).reset_index()
print(cat_df.to_string(index=False))
