"""
scratch/verify_usable_breakdown.py
---------------------------------
Verify exact arithmetic for usable cross-product and within-product breakdown.
"""

import pandas as pd
import numpy as np

manifest = pd.read_parquet('data/interim/expanded_image_manifest.parquet')
dl = manifest[manifest["download_status"] == "DOWNLOADED"].copy()
usable = dl[dl["is_usable"] == True].copy()

# Usable records: 5,887
print(f"Total usable records: {len(usable)}")
print(f"Unique SHA-256 among usable: {usable['content_hash_sha256'].nunique()}")

# Duplicate groups among usable:
usable_hash_counts = usable["content_hash_sha256"].value_counts()
usable_dup_hashes = usable_hash_counts[usable_hash_counts > 1]
print(f"Duplicate hash groups among usable: {len(usable_dup_hashes)}")
print(f"Total records in duplicate groups among usable: {usable_dup_hashes.sum()}")
print(f"Secondary records among usable: {usable_dup_hashes.sum() - len(usable_dup_hashes)}")

# Within vs cross among usable:
usable_hash_to_prods = usable.groupby("content_hash_sha256")["canonical_product_id"].unique()
usable_cross_hashes = usable_hash_to_prods[usable_hash_to_prods.apply(len) > 1]
usable_within_hashes = usable_hash_to_prods[usable_hash_to_prods.apply(len) == 1]
# Only duplicate within hashes:
usable_within_dup_hashes = usable_within_hashes[usable_within_hashes.index.isin(usable_dup_hashes.index)]

print(f"\nUsable Cross-Product Hash Groups: {len(usable_cross_hashes)}")
print(f"Usable Within-Product Duplicate Hash Groups: {len(usable_within_dup_hashes)}")
assert len(usable_cross_hashes) + len(usable_within_dup_hashes) == len(usable_dup_hashes)

# Records in usable cross-product hash groups:
usable_cross_records = usable[usable["content_hash_sha256"].isin(usable_cross_hashes.index)]
print(f"Total usable records in cross-product groups: {len(usable_cross_records)}")
print(f"  Primary / Lead records in cross groups: {len(usable_cross_hashes)}")
print(f"  Secondary records in cross groups: {len(usable_cross_records) - len(usable_cross_hashes)}")
print("  Quality breakdown of usable cross-product records:")
print(usable_cross_records["quality_status"].value_counts())

# Records in usable within-product duplicate hash groups:
usable_within_records = usable[usable["content_hash_sha256"].isin(usable_within_dup_hashes.index)]
print(f"\nTotal usable records in within-product duplicate groups: {len(usable_within_records)}")
print(f"  Primary / Lead records in within groups: {len(usable_within_dup_hashes)}")
print(f"  Secondary records in within groups: {len(usable_within_records) - len(usable_within_dup_hashes)}")
print("  Quality breakdown of usable within-product records:")
print(usable_within_records["quality_status"].value_counts())

# Reconcile:
print("\nReconciliation:")
print(f"Primary leads in cross: {len(usable_cross_hashes)} (43 VALIDATED + 14 NEAR_DUPLICATE = 57)")
print(f"Secondary in cross: {len(usable_cross_records) - len(usable_cross_hashes)} (64 DUPLICATE)")
print(f"Primary leads in within: {len(usable_within_dup_hashes)} (264 VALIDATED/NEAR_DUPLICATE)")
print(f"Secondary in within: {len(usable_within_records) - len(usable_within_dup_hashes)} (266 DUPLICATE)")
print(f"Total secondary: 64 + 266 = {64 + 266} (DUPLICATE quality_status)")

# Check lead_prod_id mapping:
lead_prod_lookup = dl.set_index("image_id")["canonical_product_id"].to_dict()
usable_dups = dl[dl["quality_status"] == "DUPLICATE"].copy()
usable_dups["lead_prod_id"] = usable_dups["duplicate_of_image_id"].map(lead_prod_lookup)
within_dups = usable_dups[usable_dups["canonical_product_id"] == usable_dups["lead_prod_id"]]
cross_dups = usable_dups[usable_dups["canonical_product_id"] != usable_dups["lead_prod_id"]]
print(f"\nDirect mapping check on 330 DUPLICATE records:")
print(f"Within-product duplicate records: {len(within_dups)}")
print(f"Cross-product duplicate records: {len(cross_dups)}")
assert len(within_dups) == 266
assert len(cross_dups) == 64
