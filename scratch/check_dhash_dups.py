import pandas as pd

imgs = pd.read_parquet('data/marketplace_trust_dataset/evidence/images.parquet')
usable = imgs[imgs['is_usable'] == True]

# Check dHash duplicates
dhash_counts = usable.groupby('perceptual_hash_dhash').agg(
    img_count=('image_id', 'count'),
    prod_count=('canonical_product_id', 'nunique'),
    pids=('canonical_product_id', lambda x: list(set(x))),
    image_ids=('image_id', list)
).reset_index()

dhash_mult = dhash_counts[dhash_counts['prod_count'] > 1]
print(f"Total dHash clusters spanning > 1 product: {len(dhash_mult)}")
print(f"Total images in dHash clusters: {dhash_mult['img_count'].sum()}")

total_dhash_pairs = 0
for idx, r in dhash_mult.iterrows():
    n = len(r['image_ids'])
    total_dhash_pairs += n * (n - 1) // 2
print(f"Total pairwise dHash combinations: {total_dhash_pairs}")
