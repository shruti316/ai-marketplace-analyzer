import pandas as pd
import re

fk_raw = pd.read_csv('data/raw/flipkart/flipkart_products_raw.csv')
missing_b = fk_raw[fk_raw['brand'].isna()]

extracted_brands = {}
for idx, r in missing_b.iterrows():
    specs = str(r['product_specifications'])
    m = re.search(r'"key"=>"Brand",\s*"value"=>"([^"]+)"', specs)
    if not m:
        m = re.search(r'"key"=>"Brand Name",\s*"value"=>"([^"]+)"', specs)
    if m:
        extracted_brands[r['pid']] = m.group(1).strip()

print(f'Recovered brand from specifications for {len(extracted_brands)} products out of 285!')
for pid, b in list(extracted_brands.items())[:10]:
    print(f'  {pid}: {b}')
