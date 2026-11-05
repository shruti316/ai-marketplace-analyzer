import pandas as pd
import os
from PIL import Image
from collections import Counter

products = pd.read_parquet('data/indian_marketplace/processed/indian_products.parquet')
manifest = pd.read_parquet('data/indian_marketplace/raw/images/amazon_in/amazon_india_images_manifest.parquet')

print('--- Manifest Check ---')
print(f'Total manifest rows: {len(manifest)}')
print(f'Unique ASINs: {manifest["asin"].nunique()}')
print(f'Unique product_ids: {manifest["canonical_product_id"].nunique()}')

amz_prods = products[products['marketplace'] == 'amazon_in']
print(f'Total amazon_in products in catalog: {len(amz_prods)}')
missing_in_catalog = set(manifest['canonical_product_id']) - set(amz_prods['canonical_product_id'])
missing_in_manifest = set(amz_prods['canonical_product_id']) - set(manifest['canonical_product_id'])
print(f'Missing in catalog: {len(missing_in_catalog)}')
print(f'Missing in manifest: {len(missing_in_manifest)}')

# Check SHA-256 duplicates
sha_counts = Counter(manifest['sha256'])
dups = {k: v for k, v in sha_counts.items() if v > 1}
print(f'Unique SHA-256 hashes: {len(sha_counts)}')
print(f'Number of duplicated hashes: {len(dups)}')
for k, v in list(dups.items())[:10]:
    asins = manifest[manifest['sha256'] == k]['asin'].tolist()
    prods = amz_prods[amz_prods['source_product_id'].isin(asins)][['source_product_id', 'product_title']]
    print(f'  Hash {k[:16]}... appears {v} times across ASINs:')
    for _, row in prods.iterrows():
        print(f'    - {row["source_product_id"]}: {str(row["product_title"])[:70]}')

# Check image dimensions & files
widths = manifest['width'].tolist()
heights = manifest['height'].tolist()
sizes = manifest['file_size'].tolist()
print(f'Widths: min={min(widths)}, max={max(widths)}, median={sorted(widths)[len(widths)//2]}')
print(f'Heights: min={min(heights)}, max={max(heights)}, median={sorted(heights)[len(heights)//2]}')
print(f'File sizes: min={min(sizes)} bytes, max={max(sizes)} bytes, avg={sum(sizes)/len(sizes):.1f} bytes')

# Check suspicious images
small_files = manifest[manifest['file_size'] < 2048]
print(f'Files < 2KB: {len(small_files)}')
small_dims = manifest[(manifest['width'] < 100) | (manifest['height'] < 100)]
print(f'Dimensions < 100px: {len(small_dims)}')

# Check perceptual / aspect ratio anomalies
aspect_ratios = [w / h for w, h in zip(widths, heights)]
print(f'Aspect ratios: min={min(aspect_ratios):.2f}, max={max(aspect_ratios):.2f}')
extreme_aspect = manifest[[ar < 0.3 or ar > 3.0 for ar in aspect_ratios]]
print(f'Extreme aspect ratios (<0.3 or >3.0): {len(extreme_aspect)}')

# Check product-specific image URL integrity
raw_amz = pd.read_csv('data/indian_marketplace/raw/products/amazon_india_products_raw.csv')
print(f'Raw Amazon rows: {len(raw_amz)}')
url_match_count = 0
for _, row in manifest.iterrows():
    asin = row['asin']
    raw_row = raw_amz[raw_amz['Product Asin'] == asin]
    if not raw_row.empty:
        raw_urls = str(raw_row.iloc[0]['Image Urls']).split('|')
        first_url = raw_urls[0].strip()
        expected_url = first_url.replace('._SS40_', '')
        if expected_url == row['url']:
            url_match_count += 1
print(f'Exact manifest url matches with transformed raw Image Urls: {url_match_count} / {len(manifest)}')
