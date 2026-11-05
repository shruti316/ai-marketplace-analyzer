"""
scratch/check_overlap_within_cross.py
------------------------------------
Check whether any image or hash is simultaneously counted in within-product
and cross-product features.
"""

import pandas as pd
manifest = pd.read_parquet('data/interim/expanded_image_manifest.parquet')
features = pd.read_parquet('data/processed/cv_product_features_expanded.parquet')
dl = manifest[manifest["download_status"] == "DOWNLOADED"].copy()

# Look at products having both within_product_duplicate_image_count > 0 and cross_product_duplicate_image_count > 0
both = features[(features["within_product_duplicate_image_count"] > 0) & (features["cross_product_duplicate_image_count"] > 0)]
print(f"Products with both within and cross duplicate features > 0: {len(both)}")
if len(both) > 0:
    print(both[["canonical_product_id", "within_product_duplicate_image_count", "cross_product_duplicate_image_count", "exact_duplicate_image_count"]].head(10))

# Check usable overlap:
usable_dups = dl[dl["quality_status"] == "DUPLICATE"].copy()
lead_prod_lookup = dl.set_index("image_id")["canonical_product_id"].to_dict()
usable_dups["lead_prod_id"] = usable_dups["duplicate_of_image_id"].map(lead_prod_lookup)
usable_within = usable_dups[usable_dups["canonical_product_id"] == usable_dups["lead_prod_id"]]
usable_cross = usable_dups[usable_dups["canonical_product_id"] != usable_dups["lead_prod_id"]]

common_prods = set(usable_within["canonical_product_id"]).intersection(set(usable_cross["canonical_product_id"]))
print(f"Products having both usable within and usable cross duplicate records: {len(common_prods)}")
for p in common_prods:
    print(f"Product {p}: within={len(usable_within[usable_within['canonical_product_id']==p])}, cross={len(usable_cross[usable_cross['canonical_product_id']==p])}")
