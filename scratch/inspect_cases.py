"""
scratch/inspect_cases.py
------------------------
Inspect flipkart_BRAE74BR8ZFQPJXZ and flipkart_TSHE79U6UMUDN68P.
"""

import pandas as pd
manifest = pd.read_parquet('data/interim/expanded_image_manifest.parquet')
dl = manifest[manifest["download_status"] == "DOWNLOADED"].copy()

for pid in ["flipkart_TSHE79U6UMUDN68P", "flipkart_BRAE74BR8ZFQPJXZ"]:
    print(f"\nImages for {pid}:")
    p_imgs = dl[dl["canonical_product_id"] == pid]
    for _, r in p_imgs.iterrows():
        print(f"  ID: {r['image_id']} | Hash: {r['content_hash_sha256'][:8]} | Quality: {r['quality_status']} | DupOf: {r['duplicate_of_image_id']}")
