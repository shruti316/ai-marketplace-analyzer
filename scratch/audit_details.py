"""
scratch/audit_details.py
------------------------
Detailed inspection of canonical products, reviews, relationships, pricing, and CV.
"""

import pandas as pd
import numpy as np

products = pd.read_parquet('data/processed/canonical_products.parquet')
reviews = pd.read_parquet('data/processed/canonical_reviews.parquet')
review_feats = pd.read_parquet('data/processed/product_review_features.parquet')
relationships = pd.read_parquet('data/processed/canonical_relationships.parquet')
cv_feats = pd.read_parquet('data/processed/cv_product_features_expanded.parquet')

print("="*60)
print("1. CANONICAL PRODUCTS BASELINE")
print("="*60)
print(f"Total rows: {len(products):,}")
print(f"Unique product IDs: {products['canonical_product_id'].nunique():,}")
print(f"Null product IDs: {products['canonical_product_id'].isna().sum()}")
print(f"Duplicate IDs: {products['canonical_product_id'].duplicated().sum()}")

print("\nMarketplace Distribution in canonical_products:")
print(products['marketplace'].value_counts())

print("\nCategory Distribution in canonical_products (Top 15):")
print(products['category'].value_counts().head(15))
print(f"Unique categories: {products['category'].nunique()}")
print(f"Null categories: {products['category'].isna().sum()}")

print("\nImportant Attributes Missingness:")
for col in ['title', 'category', 'subcategory', 'brand', 'description', 'price', 'currency', 'rating', 'rating_count', 'seller_id', 'seller_name', 'product_url', 'image_urls']:
    nulls = products[col].isna().sum()
    empty = 0
    if products[col].dtype == object and col != 'image_urls':
        empty = products[col].apply(lambda x: 1 if isinstance(x, str) and x.strip() == '' else 0).sum()
    elif col == 'image_urls':
        empty = products[col].apply(lambda x: 1 if hasattr(x, '__len__') and len(x) == 0 else 0).sum()
    print(f"  {col:15s}: null={nulls:,} ({nulls/len(products)*100:.2f}%), empty={empty:,}")

print("\nPrice Statistics by Marketplace:")
for mkt, grp in products.groupby('marketplace'):
    valid_p = grp['price'].dropna()
    print(f"  {mkt:12s}: total={len(grp):,}, price_present={len(valid_p):,} ({len(valid_p)/len(grp)*100:.1f}%), currencies={grp['currency'].dropna().unique().tolist()}")
    if len(valid_p) > 0:
        print(f"    min={valid_p.min()}, median={valid_p.median()}, max={valid_p.max()}, <=0 count={(valid_p <= 0).sum()}")

print("\n" + "="*60)
print("2. REVIEW & NLP COVERAGE")
print("="*60)
print(f"Total reviews: {len(reviews):,}")
print(f"Unique products in canonical_reviews: {reviews['canonical_product_id'].nunique():,}")
print(f"Marketplaces in canonical_reviews:\n{reviews['marketplace'].value_counts()}")
print(f"Reviews with non-null review_text: {reviews['review_text'].dropna().str.strip().ne('').sum():,}")

print(f"\nproduct_review_features rows: {len(review_feats):,}")
print(f"Unique products in product_review_features: {review_feats['canonical_product_id'].nunique():,}")
print("Listing states in product_review_features:")
print(review_feats['listing_state'].value_counts(dropna=False))

# How does product_review_features join with canonical_products?
in_products = set(products['canonical_product_id'])
in_rev_feats = set(review_feats['canonical_product_id'])
in_reviews = set(reviews['canonical_product_id'])

print(f"\nOverlap review_feats with canonical_products: {len(in_rev_feats.intersection(in_products)):,}")
print(f"review_feats NOT in canonical_products: {len(in_rev_feats - in_products):,}")
print(f"canonical_products NOT in review_feats: {len(in_products - in_rev_feats):,}")

# What marketplaces are missing in product_review_features?
missing_rev_feats = products[~products['canonical_product_id'].isin(in_rev_feats)]
print(f"Marketplaces of products missing from product_review_features:\n{missing_rev_feats['marketplace'].value_counts()}")

# Review counts among products in review_feats:
has_reviews = review_feats[review_feats['review_count'] > 0]
zero_reviews = review_feats[review_feats['review_count'] == 0]
print(f"Products in review_feats with review_count > 0: {len(has_reviews):,}")
print(f"Products in review_feats with review_count == 0: {len(zero_reviews):,}")

# Are all products with reviews in canonical_reviews in review_feats?
print(f"Products in canonical_reviews NOT in review_feats: {len(in_reviews - in_rev_feats)}")

print("\n" + "="*60)
print("3. RELATIONSHIPS / GRAPH DATA")
print("="*60)
print(f"Total canonical_relationships rows: {len(relationships):,}")
print("Relationship types:\n", relationships['relationship_type'].value_counts())
print("Source entity types:\n", relationships['source_entity_type'].value_counts())
print("Target entity types:\n", relationships['target_entity_type'].value_counts())
print("Verification status:\n", relationships['verification_status'].value_counts())
print("Evidence source:\n", relationships['evidence_source'].value_counts())

# Check how many canonical products are connected in relationships
sources_prods = set(relationships[relationships['source_entity_type'] == 'product']['source_entity_id'])
targets_prods = set(relationships[relationships['target_entity_type'] == 'product']['target_entity_id'])
all_rel_prods = sources_prods.union(targets_prods)
print(f"Distinct products in relationships: {len(all_rel_prods):,}")
print(f"Overlap with canonical_products: {len(all_rel_prods.intersection(in_products)):,}")

# Check seller relationships
seller_rels = relationships[relationships['relationship_type'].isin(['sold_by', 'product_seller', 'seller_product', 'shares_seller'])]
print(f"Seller-related relationships count: {len(seller_rels):,}")
if len(seller_rels) > 0:
    print(seller_rels.head())

# Also check sellers in canonical_products directly:
has_seller_id = products['seller_id'].dropna().str.strip().ne('')
has_seller_name = products['seller_name'].dropna().str.strip().ne('')
print(f"Products with non-empty seller_id: {has_seller_id.sum():,}")
print(f"Products with non-empty seller_name: {has_seller_name.sum():,}")
print(f"Products with either seller_id or seller_name: {(has_seller_id | has_seller_name).sum():,}")
