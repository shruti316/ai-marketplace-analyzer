"""
scratch/deep_dive_dups.py
-------------------------
Deep-dive into every question asked in the user prompt.
"""

import pandas as pd
import numpy as np

manifest = pd.read_parquet('data/interim/expanded_image_manifest.parquet')
features = pd.read_parquet('data/processed/cv_product_features_expanded.parquet')
dl = manifest[manifest["download_status"] == "DOWNLOADED"].copy()

print("="*60)
print("1. EXACT DUPLICATE HASH GROUPS")
print("="*60)

# Hash groups across ALL downloaded images (11,808)
hash_counts_all = dl["content_hash_sha256"].value_counts()
dup_hashes_all = hash_counts_all[hash_counts_all > 1]
print(f"Total exact duplicate hash groups (all downloaded): {len(dup_hashes_all)}")
print(f"Total records in all duplicate groups: {dup_hashes_all.sum()}")
print(f"Total secondary records (all downloaded): {dup_hashes_all.sum() - len(dup_hashes_all)}")

# Group each hash by products
hash_to_prods_all = dl.groupby("content_hash_sha256")["canonical_product_id"].unique()
hash_prod_counts_all = hash_to_prods_all.apply(len)

# Filter hash_prod_counts_all to only duplicate hashes (hashes that appear > 1 time)
dup_hash_set = set(dup_hashes_all.index)
dup_hash_to_prods = {h: prods for h, prods in hash_to_prods_all.items() if h in dup_hash_set}
dup_hash_prod_counts = {h: len(prods) for h, prods in dup_hash_to_prods.items()}

# Among all 441 duplicate hash groups:
# Which are cross-product (shared by >1 product)?
cross_hashes_all = {h: prods for h, prods in dup_hash_to_prods.items() if len(prods) > 1}
# Which are within-product only (all occurrences belong to 1 product)?
within_hashes_all = {h: prods for h, prods in dup_hash_to_prods.items() if len(prods) == 1}

print(f"Cross-product exact duplicate hash groups (all downloaded): {len(cross_hashes_all)}")
print(f"Within-product only exact duplicate hash groups (all downloaded): {len(within_hashes_all)}")
assert len(cross_hashes_all) + len(within_hashes_all) == len(dup_hashes_all)

# How many records in cross-product hashes (all downloaded)?
records_in_cross_hashes_all = dl[dl["content_hash_sha256"].isin(cross_hashes_all.keys())]
print(f"Total records in cross-product hash groups (all downloaded): {len(records_in_cross_hashes_all)}")
print(f"Distinct products in cross-product hash groups (all downloaded): {records_in_cross_hashes_all['canonical_product_id'].nunique()}")

# How many secondary records in cross-product hashes (all downloaded)?
sec_in_cross_all = len(records_in_cross_hashes_all) - len(cross_hashes_all)
print(f"Secondary records in cross-product hashes (all downloaded): {sec_in_cross_all}")

# Within-product only records (all downloaded)
records_in_within_hashes_all = dl[dl["content_hash_sha256"].isin(within_hashes_all.keys())]
print(f"Total records in within-product only hash groups (all downloaded): {len(records_in_within_hashes_all)}")
print(f"Secondary records in within-product only hash groups (all downloaded): {len(records_in_within_hashes_all) - len(within_hashes_all)}")

print("\n" + "="*60)
print("2. USABLE EXACT DUPLICATES (330 records)")
print("="*60)

# In Stage 2: quality_status == 'DUPLICATE'
usable_dups = dl[dl["quality_status"] == "DUPLICATE"].copy()
print(f"Total records with quality_status == 'DUPLICATE': {len(usable_dups)}")

# In Stage 2, how were within-product vs cross-product classified?
# Let's inspect duplicate_of_image_id
lead_prod_lookup = dl.set_index("image_id")["canonical_product_id"].to_dict()
usable_dups["lead_prod_id"] = usable_dups["duplicate_of_image_id"].map(lead_prod_lookup)

usable_within = usable_dups[usable_dups["canonical_product_id"] == usable_dups["lead_prod_id"]]
usable_cross = usable_dups[usable_dups["canonical_product_id"] != usable_dups["lead_prod_id"]]

print(f"Usable within-product duplicate records: {len(usable_within)}")
print(f"Usable cross-product duplicate records: {len(usable_cross)}")
assert len(usable_within) + len(usable_cross) == 330
print(f"Distinct products having usable within-product duplicates: {usable_within['canonical_product_id'].nunique()}")
print(f"Distinct products having usable cross-product duplicates: {usable_cross['canonical_product_id'].nunique()}")

# Products with exact_duplicate_image_count > 0 in Stage 4:
print(f"Products with exact_duplicate_image_count > 0: {(features['exact_duplicate_image_count'] > 0).sum()}")
# Wait, why is it 290?
# 263 products have within-product dups, plus 27 products have cross-product dups!
# 263 + 27 = 290 products!
prod_exact_dup = usable_dups.groupby("canonical_product_id")["image_id"].count()
print(f"Total distinct products in usable_dups: {len(prod_exact_dup)}")
assert len(prod_exact_dup) == 290
print(f"Verification: 290 distinct products have at least one usable exact duplicate image (263 within + 27 cross = 290)!")

print("\n" + "="*60)
print("3. WHAT DOES STAGE 4 ACTUALLY COMPUTE?")
print("="*60)
print("Stage 4 columns for duplicate/syndication:")
dup_cols = [
    "exact_duplicate_image_count",
    "within_product_duplicate_image_count",
    "cross_product_duplicate_image_count",
    "cross_product_duplicate_hash_count",
    "distinct_other_products_sharing_image",
    "near_duplicate_same_product_count",
    "near_duplicate_cross_product_count",
]
for col in dup_cols:
    nz = (features[col] > 0).sum()
    s = features[col].sum()
    print(f"- {col}: {nz} products > 0, sum = {s}")

print("\nLet's check cross_product_duplicate_image_count vs cross_product_duplicate_hash_count:")
# Are they identical for each product?
diff = features[features["cross_product_duplicate_image_count"] != features["cross_product_duplicate_hash_count"]]
print(f"Products where image count != hash count: {len(diff)}")

print("\nLet's inspect what hashes and quality statuses are in cross_product_duplicate_image_count:")
# dl[dl['content_hash_sha256'].isin(cross_hashes_all.index)]
cross_records = dl[dl["content_hash_sha256"].isin(cross_hashes_all.keys())]
print("Quality status breakdown of records in cross_product_duplicate_image_count:")
print(cross_records["quality_status"].value_counts())
print(f"Total records in cross_hashes_all: {len(cross_records)}")

print("\nWhat happens if cross-product sharing is restricted to ONLY USABLE images?")
usable_dl = dl[dl["is_usable"] == True].copy()
usable_hash_to_prods = usable_dl.groupby("content_hash_sha256")["canonical_product_id"].unique()
usable_cross_hashes = usable_hash_to_prods[usable_hash_to_prods.apply(len) > 1]
print(f"Usable cross-product hash groups: {len(usable_cross_hashes)}")
usable_cross_records = usable_dl[usable_dl["content_hash_sha256"].isin(usable_cross_hashes.index)]
print(f"Total usable records in usable cross-product hash groups: {len(usable_cross_records)}")
print(f"Distinct products in usable cross-product hash groups: {usable_cross_records['canonical_product_id'].nunique()}")
print(f"Usable records breakdown by quality_status:")
print(usable_cross_records["quality_status"].value_counts())
