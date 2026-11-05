import json
import hashlib
from pathlib import Path
import pandas as pd

v15 = Path('data/marketplace_trust_dataset_v1.5')

prods = pd.read_parquet(v15 / 'entities' / 'products.parquet')
revs = pd.read_parquet(v15 / 'evidence' / 'reviews.parquet')
imgs = pd.read_parquet(v15 / 'evidence' / 'images.parquet')
prices = pd.read_parquet(v15 / 'evidence' / 'price_observations.parquet')
sellers = pd.read_parquet(v15 / 'entities' / 'sellers.parquet')
edges = pd.read_parquet(v15 / 'relationships' / 'entity_relationships.parquet')

with open(v15 / 'manifests' / 'dataset_manifest.json') as f:
    manifest = json.load(f)

print(f"Products count: {len(prods)}")
print(f"Categories: {prods['category'].value_counts().to_dict()}")
print(f"Reviews count: {len(revs)}")
print(f"Reviews marketplace: {revs['marketplace'].value_counts().to_dict()}")
print(f"Reviews linkage: {revs['linkage_type'].value_counts().to_dict()}")
print(f"Images count: {len(imgs)}, usable: {imgs['is_usable'].sum()}")
print(f"Images usable by marketplace: {imgs[imgs['is_usable'] == True]['marketplace'].value_counts().to_dict()}")
print(f"Prices count: {len(prices)}, valid: {prices['is_valid_price'].sum()}, missing: {(~prices['is_valid_price']).sum()}")
print(f"Prices valid by marketplace: {prices[prices['is_valid_price'] == True]['marketplace'].value_counts().to_dict()}")
print(f"Sellers count: {len(sellers)}, null product sellers: {prods['seller_id'].isna().sum()}")
print(f"Graph edges count: {len(edges)}")
print(f"Manifest tables count: {len(manifest['tables'])}")

# Check 127 Flipkart review products
fk_prods = prods[prods['marketplace'] == 'flipkart']
fk_rev_pids = set(revs[revs['marketplace'] == 'flipkart']['canonical_product_id'].dropna())
fk_img_pids = set(imgs[(imgs['marketplace'] == 'flipkart') & (imgs['is_usable'] == True)]['canonical_product_id'].dropna())
fk_rev_and_price = fk_rev_pids.intersection(set(prices[(prices['marketplace'] == 'flipkart') & (prices['is_valid_price'] == True)]['canonical_product_id']))
fk_rev_price_no_img = fk_rev_and_price - fk_img_pids
print(f"\nFlipkart review products: {len(fk_rev_pids)}")
print(f"Flipkart image products: {len(fk_img_pids)}")
print(f"Flipkart review + price products: {len(fk_rev_and_price)}")
print(f"Flipkart review + price products lacking images: {len(fk_rev_price_no_img)}")
