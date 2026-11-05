import pandas as pd

df = pd.read_parquet('data/indian_marketplace/processed/indian_reviews.parquet')

has_smartbuy = df['product_name_raw'].str.contains('Flipkart SmartBuy', case=False, na=False)
has_fk_in_text = df['review_text'].str.contains('flipkart', case=False, na=False) | df['review_title'].str.contains('flipkart', case=False, na=False)
has_qmark_syntax = df['product_name_raw'].str.contains(r'\?{2,}\(', na=False)

confirmed_fk = has_smartbuy | has_fk_in_text | has_qmark_syntax
uncertain = ~confirmed_fk

print(f'Confirmed Flipkart reviews: {confirmed_fk.sum()}')
print(f'Uncertain marketplace provenance reviews: {uncertain.sum()}')

# Inspect sample uncertain reviews
print('\nSample uncertain reviews:')
for i, r in df[uncertain].head(5).iterrows():
    print(f'ID: {r["review_id"]} | Product: {r["product_name_raw"][:60]} | Price: {r["product_price_raw"]}')
    print(f'  Text: {r["review_text"][:100]}')
