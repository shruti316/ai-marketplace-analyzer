import pandas as pd
import re

revs = pd.read_parquet('data/indian_marketplace/processed/indian_reviews.parquet')
print(f'Total reviews: {len(revs)}')

# Extract unique product lines
unique_prods = revs.groupby('product_name_raw').agg(
    review_count=('review_id', 'count'),
    price=('product_price_raw', 'first'),
    avg_rating=('rating', 'mean'),
    provenance_status=('provenance_status', 'first')
).reset_index()

print(f'Unique product lines: {len(unique_prods)}')

def clean_title(raw_name):
    # Remove ??????(Spec) or ??????????(Spec)
    clean = re.sub(r'\?{2,}\(.*?\)', '', raw_name)
    clean = re.sub(r'\?{2,}', '', clean)
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean

def extract_brand(raw_name):
    name = clean_title(raw_name)
    tokens = name.split()
    if not tokens:
        return 'Unknown'
    # Special multi-word brands
    lower = name.lower()
    multi_brands = [
        'flipkart smartbuy', 'maharaja whiteline', 'google nest', 'oneplus',
        'voltas beko', 'ifb neptune', 'tata sky', 'f ferons', 'd&v engineering',
        'squaro online store', 'chardi kala', 'supreme bazaar', 'the indian casa'
    ]
    for mb in multi_brands:
        if lower.startswith(mb):
            # return properly capitalized
            idx = len(mb)
            return name[:idx]
    return tokens[0]

def extract_category(raw_name):
    lower = raw_name.lower()
    if any(k in lower for k in ['headset', 'headphone', 'soundbar', 'speaker', 'camera', 'dslr', 'hard disk', 'hdd', 'earphone', 'neckband', 'lens']):
        return 'Electronics', 'Audio & Photography'
    elif any(k in lower for k in ['cooler', 'fan', 'kettle', 'rice cooker', 'cooker', 'chimney', 'food processor', 'dishwasher', 'purifier', 'stabilizer', 'remote']):
        return 'Home & Kitchen', 'Home Appliances'
    elif any(k in lower for k in ['kajal', 'face mask', 'moisturizer', 'shampoo', 'cream', 'serum']):
        return 'Beauty & Personal Care', 'Personal Care'
    elif any(k in lower for k in ['cricket', 'bat', 'ball', 'support', 'gym', 'goggle']):
        return 'Sports & Outdoors', 'Sports Equipment'
    elif any(k in lower for k in ['safety shoe', 'shoes']):
        return 'Industrial & Scientific', 'Safety Shoes'
    else:
        return 'Home & Kitchen', 'General Merchandise'

# Test extraction
for i, r in unique_prods.head(15).iterrows():
    raw_name = r['product_name_raw']
    c_title = clean_title(raw_name)
    b = extract_brand(raw_name)
    cat, subcat = extract_category(raw_name)
    cnt = r['review_count']
    p = r['price']
    print(f'[{b}] [{cat} >> {subcat}] (Rs {p}, {cnt} revs): {c_title[:50]}')
