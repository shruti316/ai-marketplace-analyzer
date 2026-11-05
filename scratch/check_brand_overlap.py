import pandas as pd

prods = pd.read_parquet('data/indian_marketplace/processed/indian_products.parquet')
for b in ['pigeon', 'bajaj', 'philips', 'whirlpool', 'havells', 'butterfly', 'boat', 'canon', 'seagate']:
    m = prods[prods['brand'].fillna('').str.lower().str.contains(b)]
    if len(m) > 0:
        print(f'Brand {b}: {len(m)} products in catalog:')
        for _, r in m.head(3).iterrows():
            print(f'  - [{r["marketplace"]}] {str(r["product_title"])[:60]} (Rs {r["price"]})')
