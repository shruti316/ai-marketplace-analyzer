import pandas as pd

raw_fk = pd.read_csv('data/indian_marketplace/raw/products/flipkart_products_raw.csv')
missing_price = raw_fk[raw_fk['discounted_price'].isna()]
print('Missing price rows in Flipkart:', len(missing_price))
for i, r in missing_price.iterrows():
    print(f'Row {i}: pid={r["pid"]}, name={str(r["product_name"])[:50]}')
    print('  retail_price:', r['retail_price'], 'discounted_price:', r['discounted_price'])
    print('  desc:', str(r['description'])[:100])
    print('  specs:', str(r['product_specifications'])[:100])

# Check across all 1000 rows if any row mentions stock or availability
text_all = (raw_fk['description'].fillna('') + ' ' + raw_fk['product_specifications'].fillna('')).str.lower()
print('Mentions of out of stock in text:', text_all.str.contains('out of stock').sum())
print('Mentions of in stock in text:', text_all.str.contains('in stock').sum())
