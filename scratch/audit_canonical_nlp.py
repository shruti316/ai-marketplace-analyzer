import sys
sys.path.insert(0, ".")
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import src.nlp.review_analysis as ra

reviews = pd.read_parquet("data/processed/canonical_reviews.parquet")
products = pd.read_parquet("data/processed/canonical_products.parquet")

# Merge
df = reviews.merge(
    products[["canonical_product_id", "category", "subcategory", "brand", "title"]],
    on="canonical_product_id",
    how="left"
)

# Text normalization
df['clean_text'] = (
    df['review_text']
    .astype(str)
    .str.lower()
    .str.replace(r'\s+', ' ', regex=True)
    .str.strip()
)

print("=== CANONICAL REVIEWS NLP AUDIT ===")
print("Total reviews:", len(df))
print("Missing review text:", df['review_text'].isna().sum())
print("Empty review text:", df['clean_text'].eq('').sum())
print("Very short (< 5 chars):", (df['clean_text'].str.len() < 5).sum())

# Sentiment Analysis on Canonical Reviews
print("Computing VADER compound scores...")
# Compute compound scores
df['sentiment_compound'] = df['clean_text'].apply(ra.get_sentiment_compound)

# Disagreement definitions
# 1. Polar discordance (robust standard from review_analysis.py)
df['polar_discordance'] = (
    (df['rating'] >= 4.0) & (df['sentiment_compound'] <= -0.2)
) | (
    (df['rating'] <= 2.0) & (df['sentiment_compound'] >= 0.3)
)

# 2. Categorical mismatch
def r_cat(r):
    return 'Negative' if r <= 2.0 else ('Neutral' if r == 3.0 else 'Positive')
def s_cat(s):
    return 'Positive' if s >= 0.05 else ('Negative' if s <= -0.05 else 'Neutral')

df['rating_sentiment'] = df['rating'].apply(r_cat)
df['text_sentiment'] = df['sentiment_compound'].apply(s_cat)
df['cat_mismatch'] = df['rating_sentiment'] != df['text_sentiment']

print("\n--- Sentiment Results Overall (55,616 reviews) ---")
print(f"Polar Discordance: {df['polar_discordance'].sum()} / {len(df)} ({df['polar_discordance'].mean():.2%})")
print(f"Categorical Mismatch: {df['cat_mismatch'].sum()} / {len(df)} ({df['cat_mismatch'].mean():.2%})")
print("Average Sentiment Compound:", round(df['sentiment_compound'].mean(), 4))

print("\n--- Polar Discordance by Marketplace ---")
for mkt, grp in df.groupby('marketplace'):
    print(f"{mkt}: {grp['polar_discordance'].sum()} / {len(grp)} ({grp['polar_discordance'].mean():.2%})")

print("\n--- Polar Discordance by Category ---")
for cat, grp in df.groupby('category'):
    print(f"{cat}: {grp['polar_discordance'].sum()} / {len(grp)} ({grp['polar_discordance'].mean():.2%})")

print("\nCrosstab of Rating Sentiment vs Text Sentiment (Canonical):")
print(pd.crosstab(df['rating_sentiment'], df['text_sentiment'], margins=True))

# Intra-product review similarity on Canonical dataset
print("\n--- Intra-Product Review Similarity across Canonical Dataset ---")
prod_counts = df.groupby('canonical_product_id').size()
multi_review_prods = prod_counts[prod_counts >= 2].index
print(f"Products with >= 2 reviews: {len(multi_review_prods)} / {len(prod_counts)} ({len(multi_review_prods)/len(prod_counts):.1%})")

# Let's check similarity on products with >= 2 reviews
similar_pairs_all = []
dup_text_count_total = 0

for pid in multi_review_prods:
    grp = df[df['canonical_product_id'] == pid]
    texts = grp['clean_text'].tolist()
    n_unique = len(set(texts))
    dup_text_count_total += (len(texts) - n_unique)
    
    # We compute similarity if non-empty texts >= 2
    valid_texts = [t for t in texts if len(t) >= 10]
    if len(valid_texts) < 2:
        continue
    # If group is very large (e.g. 3000 reviews), computing full 3000x3000 takes time and memory.
    # Let's sample or cap if group is large
    if len(valid_texts) > 200:
        # Sample 200 for fast intra-product check
        np.random.seed(42)
        valid_texts = list(np.random.choice(valid_texts, size=200, replace=False))
        
    vec = TfidfVectorizer(stop_words='english', ngram_range=(1, 2), min_df=1, max_features=1000)
    try:
        X = vec.fit_transform(valid_texts)
        sim_mat = cosine_similarity(X)
        for i in range(len(valid_texts)):
            for j in range(i + 1, len(valid_texts)):
                score = sim_mat[i, j]
                if score >= 0.80:
                    similar_pairs_all.append({
                        'canonical_product_id': pid,
                        'similarity': round(float(score), 3),
                        'text_1': valid_texts[i],
                        'text_2': valid_texts[j],
                        'is_exact': valid_texts[i] == valid_texts[j]
                    })
    except Exception as e:
        continue

sim_df_all = pd.DataFrame(similar_pairs_all)
print(f"Total intra-product pairs with cosine >= 0.80 across multi-review products: {len(sim_df_all)}")
if not sim_df_all.empty:
    print(f"Exact matches: {sim_df_all['is_exact'].sum()} ({sim_df_all['is_exact'].mean():.1%})")
    print(f"Unique products exhibiting similarity: {sim_df_all['canonical_product_id'].nunique()}")
    print("\nSample pairs across canonical products:")
    for _, r in sim_df_all.head(6).iterrows():
        print(f"Prod: {r['canonical_product_id']} | Sim: {r['similarity']} | Exact: {r['is_exact']}")
        print(f"  T1: {r['text_1'][:90]}")
        print(f"  T2: {r['text_2'][:90]}")
