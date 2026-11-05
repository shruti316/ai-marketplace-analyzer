import pandas as pd

fk_raw = pd.read_csv('data/indian_marketplace/raw/products/flipkart_products_raw.csv')
cats = fk_raw['product_category_tree'].apply(lambda x: str(x).split('>>')[0].replace('["', '').strip())
print("Flipkart categories:")
print(cats.value_counts())

myn_raw = pd.read_csv('data/indian_marketplace/raw/products/myntra_products_raw.csv')
print("\nMyntra categories/product_types:")
print(myn_raw['product_type'].value_counts().head(10))
