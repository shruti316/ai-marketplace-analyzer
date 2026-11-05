"""
scratch/verify_all_breakdown.py
------------------------------
Verify exact numbers across all 11,808 downloaded records.
"""

import pandas as pd
import numpy as np

manifest = pd.read_parquet('data/interim/expanded_image_manifest.parquet')
dl = manifest[manifest["download_status"] == "DOWNLOADED"].copy()

hash_counts = dl["content_hash_sha256"].value_counts()
dup_hashes = hash_counts[hash_counts > 1]
hash_to_prods = dl.groupby("content_hash_sha256")["canonical_product_id"].unique()
dup_hash_to_prods = {h: prods for h, prods in hash_to_prods.items() if h in dup_hashes.index}

cross_hashes = {h: prods for h, prods in dup_hash_to_prods.items() if len(prods) > 1}
within_hashes = {h: prods for h, prods in dup_hash_to_prods.items() if len(prods) == 1}

print(f"Total duplicate hash groups: {len(dup_hashes)}")
print(f"Within-product duplicate groups: {len(within_hashes)}")
print(f"Cross-product duplicate groups: {len(cross_hashes)}")

# Records in cross hashes
cross_records = dl[dl["content_hash_sha256"].isin(cross_hashes.keys())]
print(f"\nTotal records in 90 cross-product hashes: {len(cross_records)}")
print("Quality breakdown of 1,698 cross-product records:")
print(cross_records["quality_status"].value_counts())

# Products in cross hashes
cross_prods_by_hash = {h: set(prods) for h, prods in cross_hashes.items()}
all_cross_prods = set()
for s in cross_prods_by_hash.values():
    all_cross_prods.update(s)
print(f"Total distinct products in 90 cross-product hashes: {len(all_cross_prods)}")

# Breakdown of the 1,549 products:
# 1. Tracking pixel hash:
irrel_hashes = dl[dl["quality_status"] == "IRRELEVANT"]["content_hash_sha256"].dropna().unique()
tracking_hash = irrel_hashes[0] if len(irrel_hashes) > 0 else None
print(f"Tracking hash: {tracking_hash}")
prods_tracking = set(cross_prods_by_hash[tracking_hash]) if tracking_hash in cross_prods_by_hash else set()
print(f"Products with tracking pixel: {len(prods_tracking)}")

# 2. Usable cross hashes:
usable_hashes = set(cross_records[cross_records["is_usable"] == True]["content_hash_sha256"])
print(f"Cross hashes with usable images: {len(usable_hashes)}")
prods_usable_cross = set()
for h in usable_hashes:
    prods_usable_cross.update(cross_prods_by_hash[h])
print(f"Products participating in usable cross sharing: {len(prods_usable_cross)}")

# 3. Low-quality thumbnail only hashes:
lq_only_hashes = set(cross_hashes.keys()) - {tracking_hash} - usable_hashes
print(f"Cross hashes with low-quality thumbnail only: {len(lq_only_hashes)}")
prods_lq_only = set()
for h in lq_only_hashes:
    prods_lq_only.update(cross_prods_by_hash[h])
print(f"Products in low-quality only cross sharing: {len(prods_lq_only)}")

# Overlaps:
print(f"Overlap between tracking and usable: {len(prods_tracking.intersection(prods_usable_cross))}")
print(f"Overlap between tracking and lq_only: {len(prods_tracking.intersection(prods_lq_only))}")
print(f"Overlap between usable and lq_only: {len(prods_usable_cross.intersection(prods_lq_only))}")

union_prods = prods_tracking.union(prods_usable_cross).union(prods_lq_only)
print(f"Total union of products across 90 cross hashes: {len(union_prods)}")
