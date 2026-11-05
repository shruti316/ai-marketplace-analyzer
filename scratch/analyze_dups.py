"""
scratch/analyze_dups.py
-----------------------
Analyze duplicate counts and syndication logic across Stage 2 and Stage 4.
"""

import pandas as pd
import numpy as np

manifest = pd.read_parquet('data/interim/expanded_image_manifest.parquet')
quality = pd.read_parquet('data/processed/image_quality_report.parquet')
features = pd.read_parquet('data/processed/cv_product_features_expanded.parquet')

print("--- OVERALL DOWNLOADED DATA ---")
dl = manifest[manifest["download_status"] == "DOWNLOADED"].copy()
print(f"Total downloaded: {len(dl)}")
print(f"Total unique SHA-256: {dl['content_hash_sha256'].nunique()}")

# Duplicate groups (hashes with >1 record)
hash_counts = dl["content_hash_sha256"].value_counts()
dup_hashes = hash_counts[hash_counts > 1]
print(f"Total duplicate hash groups: {len(dup_hashes)}")
print(f"Total records in duplicate groups: {dup_hashes.sum()}")
print(f"Total excess / secondary records: {dup_hashes.sum() - len(dup_hashes)}")

# Boolean flag is_exact_duplicate
print(f"manifest['is_exact_duplicate'].sum(): {manifest['is_exact_duplicate'].sum()}")
print(f"manifest['quality_status'] == 'DUPLICATE': {(manifest['quality_status'] == 'DUPLICATE').sum()}")

# Breakdown of is_exact_duplicate by quality_status
print("\nis_exact_duplicate by quality_status:")
print(manifest[manifest["is_exact_duplicate"] == True]["quality_status"].value_counts())

# Now let's inspect hash to products
hash_to_prods = dl.groupby("content_hash_sha256")["canonical_product_id"].unique().to_dict()
hash_prod_counts = {h: len(prods) for h, prods in hash_to_prods.items()}

# Hash groups with multiple products
cross_prod_hashes = {h: prods for h, prods in hash_to_prods.items() if len(prods) > 1}
print(f"\nTotal cross-product SHA-256 hashes (all downloaded): {len(cross_prod_hashes)}")

# How many products are in cross_prod_hashes?
all_cross_prods = set()
for prods in cross_prod_hashes.values():
    all_cross_prods.update(prods)
print(f"Total distinct products in cross_prod_hashes (all downloaded): {len(all_cross_prods)}")

# What are these hashes?
print("\nTop cross-product hashes by number of products:")
top_cross = sorted(cross_prod_hashes.items(), key=lambda x: len(x[1]), reverse=True)[:10]
for h, prods in top_cross:
    sample_rows = dl[dl["content_hash_sha256"] == h]
    qs = sample_rows["quality_status"].value_counts().to_dict()
    print(f"Hash: {h[:12]}... | Products: {len(prods)} | Records: {len(sample_rows)} | Quality: {qs}")

# Now let's check ONLY USABLE images:
usable_dl = dl[dl["is_usable"] == True].copy()
print(f"\n--- USABLE DOWNLOADED DATA ---")
print(f"Total usable: {len(usable_dl)}")
print(f"Unique SHA-256 among usable: {usable_dl['content_hash_sha256'].nunique()}")

usable_hash_counts = usable_dl["content_hash_sha256"].value_counts()
usable_dup_hashes = usable_hash_counts[usable_hash_counts > 1]
print(f"Duplicate hash groups among usable images: {len(usable_dup_hashes)}")
print(f"Total records in usable duplicate groups: {usable_dup_hashes.sum()}")
print(f"Secondary records among usable images: {usable_dup_hashes.sum() - len(usable_dup_hashes)}")

usable_hash_to_prods = usable_dl.groupby("content_hash_sha256")["canonical_product_id"].unique().to_dict()
usable_cross_hashes = {h: prods for h, prods in usable_hash_to_prods.items() if len(prods) > 1}
usable_within_hashes = {h: prods for h, prods in usable_hash_to_prods.items() if len(prods) == 1 and usable_hash_counts[h] > 1}

print(f"Usable cross-product hash groups: {len(usable_cross_hashes)}")
print(f"Usable within-product only hash groups: {len(usable_within_hashes)}")

usable_cross_prods = set()
for prods in usable_cross_hashes.values():
    usable_cross_prods.update(prods)
print(f"Distinct products in usable cross-product sharing: {len(usable_cross_prods)}")

# Check within_product_duplicate_image_count in features
print("\n--- STAGE 4 FEATURES INSPECTION ---")
print("within_product_duplicate_image_count:")
print(f"Products with >0: {(features['within_product_duplicate_image_count'] > 0).sum()}")
print(f"Total sum: {features['within_product_duplicate_image_count'].sum()}")

print("cross_product_duplicate_image_count:")
print(f"Products with >0: {(features['cross_product_duplicate_image_count'] > 0).sum()}")
print(f"Total sum: {features['cross_product_duplicate_image_count'].sum()}")

print("cross_product_duplicate_hash_count:")
print(f"Products with >0: {(features['cross_product_duplicate_hash_count'] > 0).sum()}")
print(f"Total sum: {features['cross_product_duplicate_hash_count'].sum()}")
