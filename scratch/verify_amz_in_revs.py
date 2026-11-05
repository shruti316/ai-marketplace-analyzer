import pandas as pd
import pyarrow.parquet as pq

# Load Amazon India raw
amz_in = pd.read_csv('data/indian_marketplace/raw/products/amazon_india_products_raw.csv')
in_asins = set(amz_in['Product Asin'].dropna().unique())

# Load all_beauty_reviews
table = pq.read_table('data/raw/amazon/all_beauty_reviews.parquet')
ab_revs = table.to_pandas()

# Filter for Amazon India ASINs
matched_ab = ab_revs[ab_revs['asin'].isin(in_asins) | ab_revs['parent_asin'].isin(in_asins)].copy()
print("Matched reviews count:", len(matched_ab))
print("Unique ASINs matched:", matched_ab['asin'].unique().tolist())
print(matched_ab[['asin', 'rating', 'title', 'text', 'verified_purchase']].head(3))
