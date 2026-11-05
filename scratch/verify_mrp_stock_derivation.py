import pandas as pd
import numpy as np

# Load raw source datasets
raw_amz = pd.read_csv('data/indian_marketplace/raw/products/amazon_india_products_raw.csv')
raw_fk = pd.read_csv('data/indian_marketplace/raw/products/flipkart_products_raw.csv')
raw_myn = pd.read_csv('data/indian_marketplace/raw/products/myntra_products_raw.csv')

# Load processed products
proc = pd.read_parquet('data/indian_marketplace/processed/indian_products.parquet')

print('=== 1. AMAZON INDIA MRP, DISCOUNT, STOCK STATUS DERIVATION ===')
print('Raw columns:', [c for c in raw_amz.columns if any(k in c.lower() for k in ['mrp', 'price', 'stock', 'offer'])])
# Check raw Mrp column
amz_proc = proc[proc['marketplace'] == 'amazon_in']
print('Raw Mrp non-null:', raw_amz['Mrp'].notna().sum(), '/', len(raw_amz))
print('Raw Price non-null:', raw_amz['Price'].notna().sum(), '/', len(raw_amz))
print('Raw Stock Availability sample:', raw_amz['Stock Availibility'].value_counts(dropna=False).head(5))
print('Processed amz mrp non-null:', amz_proc['mrp'].notna().sum())
print('Processed amz discount non-null:', amz_proc['discount_percentage'].notna().sum())
print('Processed amz stock_status distribution:')
print(amz_proc['stock_status'].value_counts(dropna=False))

print('\n=== 2. FLIPKART MRP, DISCOUNT, STOCK STATUS DERIVATION ===')
print('Raw columns:', [c for c in raw_fk.columns if any(k in c.lower() for k in ['price', 'retail', 'stock', 'discount'])])
# In raw_fk: 'retail_price', 'discounted_price'
fk_proc = proc[proc['marketplace'] == 'flipkart']
print('Raw retail_price non-null:', raw_fk['retail_price'].notna().sum(), '/', len(raw_fk))
print('Raw discounted_price non-null:', raw_fk['discounted_price'].notna().sum(), '/', len(raw_fk))
print('Processed fk mrp non-null:', fk_proc['mrp'].notna().sum())
print('Processed fk discount non-null:', fk_proc['discount_percentage'].notna().sum())
print('Processed fk stock_status distribution:')
print(fk_proc['stock_status'].value_counts(dropna=False))

print('\n=== 3. MYNTRA MRP, DISCOUNT, STOCK STATUS DERIVATION ===')
print('Raw columns:', [c for c in raw_myn.columns if any(k in c.lower() for k in ['price', 'mrp', 'stock', 'discount'])])
# In raw_myn: 'variant_price', 'variant_compare_at_price', 'is_in_stock'
myn_proc = proc[proc['marketplace'] == 'myntra']
print('Raw variant_compare_at_price non-null:', raw_myn['variant_compare_at_price'].notna().sum(), '/', len(raw_myn))
print('Raw variant_price non-null:', raw_myn['variant_price'].notna().sum(), '/', len(raw_myn))
print('Raw is_in_stock sample:', raw_myn['is_in_stock'].value_counts(dropna=False).head(5))
print('Processed myn mrp non-null:', myn_proc['mrp'].notna().sum())
print('Processed myn discount non-null:', myn_proc['discount_percentage'].notna().sum())
print('Processed myn stock_status distribution:')
print(myn_proc['stock_status'].value_counts(dropna=False))

print('\n=== 4. DISCOUNT FORMULA VERIFICATION ===')
# Verify formula: round((mrp - price) / mrp * 100, 2) when mrp >= price
sample_discount = proc[proc['discount_percentage'].notna() & proc['mrp'].notna() & proc['price'].notna()].head(10)
for _, r in sample_discount.iterrows():
    expected_disc = round(float((r['mrp'] - r['price']) / r['mrp'] * 100.0), 2)
    diff = abs(r['discount_percentage'] - expected_disc)
    assert diff < 0.01, f'Discount mismatch: {r["discount_percentage"]} vs {expected_disc}'
print('Discount formula validated mathematically across all checked rows: (mrp - price) / mrp * 100.')
