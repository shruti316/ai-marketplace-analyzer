"""
scratch/reconcile_table.py
--------------------------
Generate the 11 reconciliation figures precisely.
"""

import pandas as pd
import numpy as np

manifest = pd.read_parquet('data/interim/expanded_image_manifest.parquet')
features = pd.read_parquet('data/processed/cv_product_features_expanded.parquet')
dl = manifest[manifest["download_status"] == "DOWNLOADED"].copy()
usable = dl[dl["is_usable"] == True].copy()

# Lead lookup across all downloaded
lead_prod_lookup = dl.set_index("image_id")["canonical_product_id"].to_dict()

# 1. Total exact duplicate hash groups
hash_counts_all = dl["content_hash_sha256"].value_counts()
dup_hashes_all = hash_counts_all[hash_counts_all > 1]
c1_all = len(dup_hashes_all)

hash_counts_usable = usable["content_hash_sha256"].value_counts()
dup_hashes_usable = hash_counts_usable[hash_counts_usable > 1]
c1_usable = len(dup_hashes_usable)

# 2. Within-product exact duplicate groups
# Group hashes by product
hash_prods_all = dl.groupby("content_hash_sha256")["canonical_product_id"].unique()
dup_hash_prods_all = {h: prods for h, prods in hash_prods_all.items() if h in dup_hashes_all.index}
within_hashes_all = {h: prods for h, prods in dup_hash_prods_all.items() if len(prods) == 1}
cross_hashes_all = {h: prods for h, prods in dup_hash_prods_all.items() if len(prods) > 1}
c2_all = len(within_hashes_all)
c3_all = len(cross_hashes_all)

hash_prods_usable = usable.groupby("content_hash_sha256")["canonical_product_id"].unique()
dup_hash_prods_usable = {h: prods for h, prods in hash_prods_usable.items() if h in dup_hashes_usable.index}
within_hashes_usable = {h: prods for h, prods in dup_hash_prods_usable.items() if len(prods) == 1}
cross_hashes_usable = {h: prods for h, prods in dup_hash_prods_usable.items() if len(prods) > 1}
c2_usable = len(within_hashes_usable)
c3_usable = len(cross_hashes_usable)

# 4. Total secondary exact-duplicate records
c4_all = dup_hashes_all.sum() - len(dup_hashes_all)
c4_usable = dup_hashes_usable.sum() - len(dup_hashes_usable)

# 5 & 6. Within vs Cross secondary exact-duplicate records
# For ALL downloaded:
# Records in within_hashes_all:
rec_within_all = dl[dl["content_hash_sha256"].isin(within_hashes_all.keys())]
c5_all = len(rec_within_all) - len(within_hashes_all)

rec_cross_all = dl[dl["content_hash_sha256"].isin(cross_hashes_all.keys())]
c6_all = len(rec_cross_all) - len(cross_hashes_all)

# For USABLE:
rec_within_usable = usable[usable["content_hash_sha256"].isin(within_hashes_usable.keys())]
c5_usable = len(rec_within_usable) - len(within_hashes_usable)

rec_cross_usable = usable[usable["content_hash_sha256"].isin(cross_hashes_usable.keys())]
c6_usable = len(rec_cross_usable) - len(cross_hashes_usable)

# 7 & 8. Usable within-product and usable cross-product duplicate records
# Using quality_status == 'DUPLICATE' and lead_prod_id:
usable_dups = dl[dl["quality_status"] == "DUPLICATE"].copy()
usable_dups["lead_prod_id"] = usable_dups["duplicate_of_image_id"].map(lead_prod_lookup)
c7 = len(usable_dups[usable_dups["canonical_product_id"] == usable_dups["lead_prod_id"]])
c8 = len(usable_dups[usable_dups["canonical_product_id"] != usable_dups["lead_prod_id"]])

# 9. Number of distinct products participating in cross-product exact-image sharing
prods_cross_all = set()
for prods in cross_hashes_all.values():
    prods_cross_all.update(prods)
c9_all = len(prods_cross_all)

prods_cross_usable = set()
for prods in cross_hashes_usable.values():
    prods_cross_usable.update(prods)
c9_usable = len(prods_cross_usable)

# 10. Number of affected image records, distinguishing primary and secondary
c10_all_total = len(rec_cross_all)
c10_all_primary = len(cross_hashes_all)
c10_all_secondary = c10_all_total - c10_all_primary

c10_usable_total = len(rec_cross_usable)
c10_usable_primary = len(cross_hashes_usable)
c10_usable_secondary = c10_usable_total - c10_usable_primary

# 11. Number of products with at least one internal duplicate upload
# Distinct products in usable_dups where lead_prod_id == canonical_product_id:
c11_usable = usable_dups[usable_dups["canonical_product_id"] == usable_dups["lead_prod_id"]]["canonical_product_id"].nunique()
# All downloaded internal duplicates:
c11_all = rec_within_all["canonical_product_id"].nunique()

print(f"1. Total exact duplicate hash groups:           All={c1_all}, Usable={c1_usable}")
print(f"2. Within-product exact duplicate groups:       All={c2_all}, Usable={c2_usable}")
print(f"3. Cross-product exact duplicate groups:        All={c3_all}, Usable={c3_usable}")
print(f"4. Total secondary exact-duplicate records:     All={c4_all}, Usable={c4_usable}")
print(f"5. Within-product secondary duplicate records:  All={c5_all}, Usable={c5_usable}")
print(f"6. Cross-product secondary duplicate records:   All={c6_all}, Usable={c6_usable}")
print(f"7. Usable within-product duplicate records:     {c7}")
print(f"8. Usable cross-product duplicate records:      {c8}")
print(f"9. Distinct products in cross sharing:          All={c9_all}, Usable={c9_usable}")
print(f"10. Affected cross image records:               All: Total={c10_all_total} (Primary={c10_all_primary}, Secondary={c10_all_secondary})")
print(f"                                                Usable: Total={c10_usable_total} (Primary={c10_usable_primary}, Secondary={c10_usable_secondary})")
print(f"11. Products with >=1 internal duplicate upload: Usable={c11_usable}, All={c11_all}")
