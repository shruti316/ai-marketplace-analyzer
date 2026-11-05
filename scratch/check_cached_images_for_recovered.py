import pandas as pd
import re

# Load 143 recovered Flipkart products
p3_prods = pd.read_parquet('data/indian_marketplace/phase3/products.parquet')
rec_prods = p3_prods[p3_prods['canonical_product_id'].str.startswith('flipkart_rec_')]
print(f"Total recovered Flipkart products: {len(rec_prods)}")

# Load expanded image manifest
exp_mf = pd.read_parquet('data/interim/expanded_image_manifest.parquet')
print(f"Expanded image manifest records: {len(exp_mf)}")

# Check if any OCR text in exp_mf matches recovered product titles or brands
import os
disk_mask = exp_mf['local_path'].apply(lambda p: os.path.exists(p) if pd.notna(p) and isinstance(p, str) else False)
usable_exp = exp_mf[disk_mask]
print(f"Usable images in expanded manifest: {len(usable_exp)}")

# Check brands in recovered products
rec_brands = set(rec_prods['brand'].dropna().str.lower().unique())
print(f"Recovered product brands: {len(rec_brands)}")

# Test matches
matches = []
for idx, r in rec_prods.iterrows():
    title = str(r['product_title']).lower()
    brand = str(r['brand']).lower()
    # Check if brand in OCR or filename
    for jdx, img in usable_exp.iterrows():
        ocr = str(img['ocr_text']).lower() if pd.notna(img['ocr_text']) else ''
        if len(brand) > 3 and brand in ocr:
            # check token overlap
            t_tokens = set(re.findall(r'\b\w+\b', title))
            o_tokens = set(re.findall(r'\b\w+\b', ocr))
            inter = t_tokens.intersection(o_tokens) - {'the', 'and', 'with', 'for', 'pack', 'black', 'white'}
            if len(inter) >= 2:
                matches.append((r['canonical_product_id'], title, img['image_id'], img['local_path'], ocr, inter))

print(f"Matches found via brand+OCR: {len(matches)}")
for m in matches[:10]:
    print(f"Prod: {m[0]} | Title: {m[1][:30]} | Img: {m[2]} | Overlap: {m[5]}")
