import pandas as pd

prods = pd.read_parquet('data/marketplace_trust_dataset/entities/products.parquet')
canon_prods = pd.read_parquet('data/processed/canonical_products.parquet')

# Check marketplaces in prods
print("v1.0 products table marketplace value counts:")
print(prods['marketplace'].value_counts())

# Where are the 420 products from?
# In build_marketplace_trust_dataset:
# other_420 was: other_420_ids = disk_prod_ids - gold_100_ids
# Let's check what marketplace those 420 products had in canonical_products!
c_imgs = pd.read_parquet('data/processed/canonical_images.parquet')
import os
disk_mask = c_imgs['local_path'].apply(lambda p: os.path.exists(p) if pd.notna(p) and isinstance(p, str) else False)
disk_prod_ids = set(c_imgs[disk_mask]['canonical_product_id'].unique())

c5684 = pd.read_parquet('data/curated/curated_products_5684.parquet')
gold_100_ids = set(c5684[(c5684['sub_tier'] == 'gold_triple_modality') & (c5684['canonical_product_id'].isin(disk_prod_ids))]['canonical_product_id'])
other_420_ids = disk_prod_ids - gold_100_ids

other_420_prods = canon_prods[canon_prods['canonical_product_id'].isin(other_420_ids)]
print("\nActual marketplace of the 420 products in canonical_products:")
print(other_420_prods['marketplace'].value_counts())

print("\nActual category of the 420 products in canonical_products:")
print(other_420_prods['category'].value_counts())

# Check how they are represented in v1.0 products.parquet:
v1_420 = prods[prods['canonical_product_id'].isin(other_420_ids)]
print("\nMarketplace of the 420 products in v1.0 products.parquet:")
print(v1_420['marketplace'].value_counts())
print("\nCategory of the 420 products in v1.0 products.parquet:")
print(v1_420['category'].value_counts())
