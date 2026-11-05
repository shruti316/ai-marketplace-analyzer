import pandas as pd
from collections import Counter
import re

df = pd.read_csv('data/indian_marketplace/raw/reviews/flipkart_reviews_raw.csv')
print(f'Total reviews: {len(df)}')
print(f'Unique product names: {df["product_name"].nunique()}')

# Inspect top products
top_prods = df['product_name'].value_counts()
print('\nTop 15 reviewed products:')
for name, cnt in top_prods.head(15).items():
    print(f'  [{cnt} reviews] {name[:80]}')

# Inspect prices
print(f'\nPrice stats: min={df["product_price"].min()}, max={df["product_price"].max()}, median={df["product_price"].median()}')

# Search for marketplace mentions in review text
text_blob = ' '.join(df['text'].dropna().astype(str).tolist()).lower()
words_to_check = ['flipkart', 'amazon', 'myntra', 'courier', 'delivery', 'service', 'warranty', 'india', 'rupees', 'rs']
print('\nMention frequency in review text:')
for w in words_to_check:
    count = len(re.findall(r'\b' + w + r'\b', text_blob))
    print(f'  {w}: {count} occurrences')

# Inspect ratings distribution
print('\nRating distribution:')
print(df['Rate'].value_counts().sort_index())

# Check sentiment / labels distribution
print('\nLabels distribution:')
print(df['labels'].value_counts())
