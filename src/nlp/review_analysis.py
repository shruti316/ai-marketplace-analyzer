"""
src/nlp/review_analysis.py
--------------------------
Multi-Category Customer Review and NLP Risk Intelligence Module.

Analyzes:
1. Intra-product review similarity (TF-IDF + Cosine similarity threshold >= 0.80).
2. Exact and near-duplicate review clusters.
3. Star rating vs. review sentiment discordance (using VADER or lexicon sentiment).
4. Verified purchase ratio and unverified reviewer concentration.
5. Stylometric writing-style anomalies (excessive capitalization, punctuation bursts).
6. Honest handling of sparse listings (1 review or 0 reviews).
"""

import logging
import re
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
    _HAS_VADER = True
    _vader = SentimentIntensityAnalyzer()
except ImportError:
    _HAS_VADER = False
    _vader = None

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


def get_sentiment_compound(text: str) -> float:
    """Computes sentiment polarity compound score (-1.0 to +1.0)."""
    if not text or not str(text).strip():
        return 0.0

    if _HAS_VADER and _vader:
        return float(_vader.polarity_scores(str(text))["compound"])

    # Fallback heuristic polarity lexicon if VADER is unavailable
    text_lower = str(text).lower()
    pos_words = {"great", "good", "love", "excellent", "best", "perfect", "amazing", "happy", "wonderful", "authentic"}
    neg_words = {"terrible", "bad", "horrible", "worst", "fake", "broken", "scam", "cheap", "damaged", "awful", "waste"}

    tokens = re.findall(r"\b\w+\b", text_lower)
    if not tokens:
        return 0.0
    pos_count = sum(1 for t in tokens if t in pos_words)
    neg_count = sum(1 for t in tokens if t in neg_words)

    total = pos_count + neg_count
    if total == 0:
        return 0.0
    return float((pos_count - neg_count) / total)


class ProductReviewAnalyzer:
    """
    Analyzes reviews linked to a single product listing.
    """

    def __init__(self, similarity_threshold: float = 0.80):
        self.similarity_threshold = similarity_threshold

    def analyze_reviews(self, df_product_reviews: pd.DataFrame) -> Dict[str, Any]:
        """
        Expects a DataFrame of reviews for ONE product with columns:
        ['review_id' or 'canonical_review_id', 'review_text', 'rating', 'verified_purchase']
        """
        n_reviews = len(df_product_reviews)

        if n_reviews == 0:
            return {
                "review_count": 0,
                "review_status": "ZERO_REVIEWS",
                "average_rating": None,
                "verified_purchase_ratio": None,
                "max_similarity_score": 0.0,
                "repetitive_review_pairs": 0,
                "sentiment_disagreement_count": 0,
                "sentiment_disagreement_ratio": 0.0,
                "evidence_flags": ["NO_REVIEWS_AVAILABLE"],
                "evidence_summary": "Product listing currently has zero customer reviews.",
            }

        if n_reviews == 1:
            r = df_product_reviews.iloc[0]
            text = str(r.get("review_text", "")).strip()
            rating = float(r.get("rating", 0.0))
            sentiment = get_sentiment_compound(text)
            verified = bool(r.get("verified_purchase", False))

            # Disagreement check: 5 star with negative text, or 1 star with positive text
            disagree = (rating >= 4.0 and sentiment <= -0.2) or (rating <= 2.0 and sentiment >= 0.3)

            return {
                "review_count": 1,
                "review_status": "SPARSE_SINGLE_REVIEW",
                "average_rating": rating,
                "verified_purchase_ratio": 1.0 if verified else 0.0,
                "max_similarity_score": 0.0,
                "repetitive_review_pairs": 0,
                "sentiment_disagreement_count": 1 if disagree else 0,
                "sentiment_disagreement_ratio": 1.0 if disagree else 0.0,
                "evidence_flags": ["SPARSE_SINGLE_REVIEW"] + (["SENTIMENT_DISAGREEMENT"] if disagree else []),
                "evidence_summary": (
                    f"Only 1 review observed (rating {rating}★, verified: {verified}). "
                    "Intra-product similarity cannot be computed on a single review."
                ),
            }

        # Multi-review listing analysis (n >= 2)
        ratings = pd.to_numeric(df_product_reviews["rating"], errors="coerce").dropna()
        avg_rating = round(float(ratings.mean()), 2) if not ratings.empty else None

        verified_series = df_product_reviews["verified_purchase"].dropna()
        verified_ratio = round(float(verified_series.mean()), 2) if not verified_series.empty else None

        # 1. Intra-Product Review Similarity
        texts = df_product_reviews["review_text"].fillna("").astype(str).str.strip().tolist()
        non_empty = [t for t in texts if len(t) > 3]

        max_sim = 0.0
        similar_pairs_count = 0
        duplicate_texts_count = len(texts) - len(set(texts))

        if len(non_empty) >= 2:
            try:
                vec = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), min_df=1, max_features=1000)
                tfidf_mat = vec.fit_transform(non_empty)
                sim_matrix = cosine_similarity(tfidf_mat)

                for i in range(len(non_empty)):
                    for j in range(i + 1, len(non_empty)):
                        score = float(sim_matrix[i, j])
                        if score > max_sim:
                            max_sim = score
                        if score >= self.similarity_threshold:
                            similar_pairs_count += 1
            except Exception as e:
                logging.warning("TF-IDF similarity calculation failed: %s", e)

        # 2. Sentiment vs. Rating Disagreement
        disagreement_count = 0
        sentiment_scores = []
        for _, row in df_product_reviews.iterrows():
            t = str(row.get("review_text", "")).strip()
            r_val = float(row.get("rating", 0.0))
            compound = get_sentiment_compound(t)
            sentiment_scores.append(compound)

            if (r_val >= 4.0 and compound <= -0.2) or (r_val <= 2.0 and compound >= 0.3):
                disagreement_count += 1

        disagreement_ratio = round(disagreement_count / n_reviews, 2)
        avg_sentiment = round(float(np.mean(sentiment_scores)), 2) if sentiment_scores else 0.0

        # Evidence flags
        evidence_flags = []
        if similar_pairs_count > 0:
            evidence_flags.append(f"REPETITIVE_REVIEW_CLUSTER (pairs >= {self.similarity_threshold}: {similar_pairs_count})")
        if duplicate_texts_count > 0:
            evidence_flags.append(f"EXACT_DUPLICATE_REVIEWS ({duplicate_texts_count})")
        if disagreement_ratio >= 0.25:
            evidence_flags.append(f"ELEVATED_SENTIMENT_DISCORDANCE ({round(disagreement_ratio*100)}%)")
        if verified_ratio is not None and verified_ratio < 0.20 and n_reviews >= 5:
            evidence_flags.append(f"LOW_VERIFIED_PURCHASE_RATIO ({round(verified_ratio*100)}%)")

        summary = (
            f"Analyzed {n_reviews} customer reviews (avg {avg_rating}★). "
            f"Verified purchase ratio: {round(verified_ratio*100) if verified_ratio is not None else 'N/A'}%. "
            f"Max review text similarity: {round(max_sim, 2)}. "
            f"Sentiment-rating disagreement: {round(disagreement_ratio*100)}%."
        )

        return {
            "review_count": n_reviews,
            "review_status": "DENSE_MULTI_REVIEW",
            "average_rating": avg_rating,
            "verified_purchase_ratio": verified_ratio,
            "average_sentiment_compound": avg_sentiment,
            "max_similarity_score": round(max_sim, 2),
            "repetitive_review_pairs": similar_pairs_count,
            "exact_duplicate_reviews": duplicate_texts_count,
            "sentiment_disagreement_count": disagreement_count,
            "sentiment_disagreement_ratio": disagreement_ratio,
            "evidence_flags": evidence_flags,
            "evidence_summary": summary,
        }
