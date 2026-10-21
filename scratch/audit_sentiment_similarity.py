import sys
sys.path.insert(0, ".")
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import src.nlp.review_analysis as ra

dense_df = pd.read_parquet("data/interim/dense_reviews.parquet")
dense_df['nlp_text'] = (
    dense_df['review_text']
    .astype('string')
    .str.lower()
    .str.replace(r'\s+', ' ', regex=True)
    .str.strip()
)
dense_df = dense_df[dense_df['nlp_text'].notna() & dense_df['nlp_text'].ne('')].copy()

# Compute VADER sentiment
dense_df['sentiment_compound'] = dense_df['nlp_text'].apply(ra.get_sentiment_compound)

# Definition A (04_nlp_analysis.ipynb categorical mismatch)
def rating_category(r):
    return 'Negative' if r <= 2 else ('Neutral' if r == 3 else 'Positive')
def text_sentiment_cat(s):
    return 'Positive' if s >= 0.05 else ('Negative' if s <= -0.05 else 'Neutral')

dense_df['rating_sentiment'] = dense_df['rating'].apply(rating_category)
dense_df['text_sentiment'] = dense_df['sentiment_compound'].apply(text_sentiment_cat)
dense_df['disagreement_cat'] = dense_df['rating_sentiment'] != dense_df['text_sentiment']

# Definition B (src/nlp/review_analysis.py polar discordance)
# (rating >= 4.0 and compound <= -0.2) or (rating <= 2.0 and compound >= 0.3)
dense_df['disagreement_polar'] = (
    (dense_df['rating'] >= 4.0) & (dense_df['sentiment_compound'] <= -0.2)
) | (
    (dense_df['rating'] <= 2.0) & (dense_df['sentiment_compound'] >= 0.3)
)

print("=== SENTIMENT DISAGREEMENT AUDIT ON DENSE_DF (7,595 reviews) ===")
print(f"Categorical Mismatch (Notebook def): {dense_df['disagreement_cat'].sum()} / {len(dense_df)} ({dense_df['disagreement_cat'].mean():.2%})")
print(f"Polar Discordance (review_analysis.py def): {dense_df['disagreement_polar'].sum()} / {len(dense_df)} ({dense_df['disagreement_polar'].mean():.2%})")

print("\nCrosstab of rating_sentiment vs text_sentiment:")
print(pd.crosstab(dense_df['rating_sentiment'], dense_df['text_sentiment'], margins=True))

print("\nInspect Polar Discordance Examples (5-star rating with negative compound <= -0.2):")
for _, r in dense_df[(dense_df['rating'] >= 4.0) & (dense_df['sentiment_compound'] <= -0.2)].head(5).iterrows():
    print(f"Rating: {r['rating']} | Compound: {r['sentiment_compound']} | Text: {r['nlp_text'][:120]}")

print("\nInspect Polar Discordance Examples (1-star/2-star rating with positive compound >= 0.3):")
for _, r in dense_df[(dense_df['rating'] <= 2.0) & (dense_df['sentiment_compound'] >= 0.3)].head(5).iterrows():
    print(f"Rating: {r['rating']} | Compound: {r['sentiment_compound']} | Text: {r['nlp_text'][:120]}")

print("\nInspect Categorical Mismatches that are NOT Polar (e.g. Neutral rating or Neutral text):")
for _, r in dense_df[dense_df['disagreement_cat'] & (~dense_df['disagreement_polar'])].head(5).iterrows():
    print(f"Rating: {r['rating']} ({r['rating_sentiment']}) | Compound: {r['sentiment_compound']} ({r['text_sentiment']}) | Text: {r['nlp_text'][:120]}")

# Review Similarity Audit on dense_df
similar_pairs = []
for product_id, group in dense_df.groupby('parent_asin'):
    if len(group) < 2:
        continue
    texts = group['nlp_text'].tolist()
    # Filter short text
    vec = TfidfVectorizer(stop_words='english', ngram_range=(1, 2), min_df=1, max_features=1000)
    try:
        X = vec.fit_transform(texts)
    except ValueError:
        continue
    sim_mat = cosine_similarity(X)
    for i in range(len(group)):
        for j in range(i + 1, len(group)):
            score = sim_mat[i, j]
            if score >= 0.80:
                similar_pairs.append({
                    'parent_asin': product_id,
                    'similarity': round(float(score), 3),
                    'review_1': texts[i],
                    'review_2': texts[j],
                    'len_1': len(texts[i]),
                    'len_2': len(texts[j]),
                    'exact_match': texts[i] == texts[j]
                })

sim_df = pd.DataFrame(similar_pairs)
print(f"\n=== SIMILARITY AUDIT ON DENSE_DF ===")
print(f"Total pairs with cosine >= 0.80: {len(sim_df)}")
print(f"Exact match pairs: {sim_df['exact_match'].sum() if not sim_df.empty else 0}")
print(f"Pairs with review text length < 20 chars: {(sim_df['len_1'] < 20).sum() if not sim_df.empty else 0}")
print("\nSample highly similar pairs:")
if not sim_df.empty:
    for _, r in sim_df.head(8).iterrows():
        print(f"Sim: {r['similarity']} | Exact: {r['exact_match']} | Len1: {r['len_1']} Len2: {r['len_2']}")
        print(f"  R1: {r['review_1'][:90]}")
        print(f"  R2: {r['review_2'][:90]}")
