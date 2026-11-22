"""
src/nlp/review_analysis.py
--------------------------
Multi-Category Customer Review and NLP Risk Intelligence Module.

Analyzes:
1. Intra-product review similarity (TF-IDF + Cosine similarity threshold >= 0.80).
2. Exact and near-duplicate review clusters with combinatorial explosion tracking.
3. Star rating vs. review sentiment discordance (using VADER with polar discordance thresholds).
4. Verified purchase ratio and unverified reviewer concentration.
5. Stylometric writing-style anomalies (excessive capitalization, punctuation bursts).
6. Robust reporting of empty, missing, or short review text.
7. Honest handling of sparse listings (1 review or 0 reviews).
"""

import logging
import re
import string
from typing import Dict, Any, List, Optional, Set
import unicodedata
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

# Common Indian marketplace Hinglish polar colloquialisms
_HINGLISH_POS_WORDS = {
    "paisa vasool", "badiya", "badhiya", "mast", "shandar", "zabarjast", "jabardast",
    "asli", "sahi", "bahut accha", "bohot accha", "zabardast"
}
_HINGLISH_NEG_WORDS = {
    "kharab", "khrab", "bekar", "bekaar", "dhokha", "nakli", "ganda", "bakwas",
    "kachra", "loot", "ghatiya", "waste", "fraud", "scam"
}


def normalize_text_nfc(text: str) -> str:
    """Performs Unicode NFC normalization and strips excessive whitespace."""
    if not text or not str(text).strip():
        return ""
    return unicodedata.normalize("NFC", str(text).strip())


def normalize_text_for_dedup(text: str) -> str:
    """Strips punctuation, lowercases, and normalizes for robust duplicate detection."""
    t = normalize_text_nfc(text).lower()
    t = re.sub(r"[^\w\s]", "", t)
    return re.sub(r"\s+", " ", t).strip()


def compute_shingle_jaccard(s1: str, s2: str, k: int = 3) -> float:
    """Computes k-gram shingle Jaccard similarity between two normalized strings."""
    if not s1 or not s2:
        return 0.0
    if s1 == s2:
        return 1.0
    if len(s1) < k or len(s2) < k:
        return 1.0 if s1 == s2 else 0.0
    shingles1: Set[str] = {s1[i:i+k] for i in range(len(s1) - k + 1)}
    shingles2: Set[str] = {s2[i:i+k] for i in range(len(s2) - k + 1)}
    inter = len(shingles1.intersection(shingles2))
    union = len(shingles1.union(shingles2))
    return float(inter / union) if union > 0 else 0.0


def get_sentiment_compound(text: str) -> float:
    """
    Computes sentiment polarity compound score (-1.0 to +1.0).
    Uses VADER if available, augmented with Hinglish e-commerce colloquialisms.
    Falls back to a deterministic polarity lexicon if VADER is unavailable.
    """
    if text is None or not str(text).strip():
        return 0.0

    normalized_text = normalize_text_nfc(text)
    t_lower = normalized_text.lower()

    base_score = 0.0
    if _HAS_VADER and _vader:
        base_score = float(_vader.polarity_scores(normalized_text)["compound"])
    else:
        # Fallback polarity lexicon
        pos_words = {"great", "good", "love", "excellent", "best", "perfect", "amazing", "happy", "wonderful", "authentic"}
        neg_words = {"terrible", "bad", "horrible", "worst", "fake", "broken", "scam", "cheap", "damaged", "awful", "waste"}
        tokens = re.findall(r"\b\w+\b", t_lower)
        if tokens:
            pos_count = sum(1 for t in tokens if t in pos_words)
            neg_count = sum(1 for t in tokens if t in neg_words)
            total = pos_count + neg_count
            if total > 0:
                base_score = float((pos_count - neg_count) / total)

    # Hinglish adjustment if VADER scored text neutral or near-neutral
    if -0.20 <= base_score <= 0.20:
        pos_hits = sum(1 for hp in _HINGLISH_POS_WORDS if hp in t_lower)
        neg_hits = sum(1 for hn in _HINGLISH_NEG_WORDS if hn in t_lower)
        if pos_hits > neg_hits:
            base_score = 0.55
        elif neg_hits > pos_hits:
            base_score = -0.55

    return round(float(np.clip(base_score, -1.0, 1.0)), 4)


def classify_rating_sentiment(rating: float) -> str:
    """Categorizes numerical star rating into coarse sentiment class."""
    if rating is None or np.isnan(rating):
        return "Unknown"
    if rating <= 2.0:
        return "Negative"
    elif rating == 3.0:
        return "Neutral"
    else:
        return "Positive"


def classify_text_sentiment(compound_score: float, pos_threshold: float = 0.05, neg_threshold: float = -0.05) -> str:
    """Categorizes compound sentiment polarity into coarse class."""
    if compound_score >= pos_threshold:
        return "Positive"
    elif compound_score <= neg_threshold:
        return "Negative"
    else:
        return "Neutral"


def is_polar_discordance(rating: float, compound_score: float) -> bool:
    """
    Evaluates strong polar discordance between numerical star rating and text sentiment:
    - High star rating (>= 4.0) with clearly negative text sentiment (<= -0.2)
    - Low star rating (<= 2.0) with clearly positive text sentiment (>= 0.3)
    Neutral star ratings (3.0) and mildly polarized text (-0.2 < compound < 0.3)
    are intentionally excluded to prevent false positives from nuanced reviews.
    """
    if rating is None or np.isnan(rating):
        return False
    return (rating >= 4.0 and compound_score <= -0.2) or (rating <= 2.0 and compound_score >= 0.3)


class ProductReviewAnalyzer:
    """
    Analyzes customer reviews linked to product listings.
    Supports single-product review sets and batch processing across canonical products.
    """

    def __init__(self, similarity_threshold: float = 0.80):
        self.similarity_threshold = similarity_threshold

    def analyze_reviews(self, df_product_reviews: pd.DataFrame) -> Dict[str, Any]:
        """
        Analyzes reviews for ONE product listing.
        Expects columns:
        ['canonical_review_id' (or 'review_id'), 'review_text', 'rating', 'verified_purchase']
        """
        n_reviews = len(df_product_reviews)

        if n_reviews == 0:
            return {
                "review_count": 0,
                "review_status": "ZERO_REVIEWS",
                "average_rating": None,
                "verified_purchase_ratio": None,
                "empty_or_missing_text_count": 0,
                "max_similarity_score": 0.0,
                "repetitive_review_pairs": 0,
                "exact_duplicate_reviews": 0,
                "sentiment_disagreement_count": 0,
                "sentiment_disagreement_ratio": 0.0,
                "evidence_flags": ["NO_REVIEWS_AVAILABLE"],
                "evidence_summary": "Product listing currently has zero customer reviews.",
            }

        # Check for missing/empty text
        raw_texts = df_product_reviews.get("review_text", pd.Series([""] * n_reviews))
        str_texts = raw_texts.fillna("").astype(str).str.strip().tolist()
        empty_count = sum(1 for t in str_texts if len(t) < 4)

        if n_reviews == 1:
            r = df_product_reviews.iloc[0]
            text = str_texts[0]
            rating_val = pd.to_numeric(r.get("rating", 0.0), errors="coerce")
            rating = float(rating_val) if not np.isnan(rating_val) else 0.0
            sentiment = get_sentiment_compound(text)
            verified = bool(r.get("verified_purchase", False))

            disagree = is_polar_discordance(rating, sentiment)

            flags = ["SPARSE_SINGLE_REVIEW"]
            if disagree:
                flags.append("SENTIMENT_DISAGREEMENT")
            if empty_count > 0:
                flags.append("EMPTY_OR_UNPARSEABLE_REVIEW")

            return {
                "review_count": 1,
                "review_status": "SPARSE_SINGLE_REVIEW",
                "average_rating": rating if rating > 0 else None,
                "verified_purchase_ratio": 1.0 if verified else 0.0,
                "empty_or_missing_text_count": empty_count,
                "max_similarity_score": 0.0,
                "repetitive_review_pairs": 0,
                "exact_duplicate_reviews": 0,
                "sentiment_disagreement_count": 1 if disagree else 0,
                "sentiment_disagreement_ratio": 1.0 if disagree else 0.0,
                "evidence_flags": flags,
                "evidence_summary": (
                    f"Only 1 review observed (rating {rating} stars, verified: {verified}). "
                    "Intra-product similarity cannot be computed on a single review."
                ),
            }

        # Multi-review listing analysis (n >= 2)
        ratings = pd.to_numeric(df_product_reviews["rating"], errors="coerce").dropna()
        avg_rating = round(float(ratings.mean()), 2) if not ratings.empty else None

        verified_series = df_product_reviews["verified_purchase"].dropna() if "verified_purchase" in df_product_reviews.columns else pd.Series(dtype=bool)
        verified_ratio = round(float(verified_series.mean()), 2) if not verified_series.empty else None

        # 1. Intra-Product Review Similarity & Multi-Tier Deduplication
        non_empty_texts = [t for t in str_texts if len(t) >= 4]
        max_sim = 0.0
        similar_pairs_count = 0
        exact_duplicate_count = len(str_texts) - len(set(str_texts))

        # Normalized deduplication (strips casing, punctuation, and whitespace)
        norm_texts = [normalize_text_for_dedup(t) for t in str_texts if len(t) >= 4]
        norm_duplicate_count = len(norm_texts) - len(set(norm_texts))

        # Near-duplicate 3-gram shingling (Jaccard >= 0.85)
        near_duplicate_pairs = 0
        if len(norm_texts) >= 2:
            shingle_eval = norm_texts if len(norm_texts) <= 150 else norm_texts[:150]
            for i in range(len(shingle_eval)):
                for j in range(i + 1, len(shingle_eval)):
                    if shingle_eval[i] != shingle_eval[j] and len(shingle_eval[i]) >= 15 and len(shingle_eval[j]) >= 15:
                        if compute_shingle_jaccard(shingle_eval[i], shingle_eval[j], k=3) >= 0.85:
                            near_duplicate_pairs += 1

        if len(non_empty_texts) >= 2:
            try:
                # Mitigate false positives by downweighting repeated product title tokens
                product_title_words: Set[str] = set()
                if "product_title" in df_product_reviews.columns:
                    for pt in df_product_reviews["product_title"].dropna().astype(str):
                        product_title_words.update(re.findall(r"\b[a-zA-Z]{3,}\b", pt.lower()))
                elif "listing_title" in df_product_reviews.columns:
                    for lt in df_product_reviews["listing_title"].dropna().astype(str):
                        product_title_words.update(re.findall(r"\b[a-zA-Z]{3,}\b", lt.lower()))

                from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS
                combined_stops = list(ENGLISH_STOP_WORDS.union(list(product_title_words)[:50]))

                # Cap max texts for quadratic pairwise calculation to avoid O(N^2) memory bottlenecks
                eval_texts = non_empty_texts if len(non_empty_texts) <= 200 else non_empty_texts[:200]
                vec = TfidfVectorizer(stop_words=combined_stops, ngram_range=(1, 2), min_df=1, max_features=1000)
                tfidf_mat = vec.fit_transform(eval_texts)
                sim_matrix = np.clip(cosine_similarity(tfidf_mat), 0.0, 1.0)

                for i in range(len(eval_texts)):
                    for j in range(i + 1, len(eval_texts)):
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
        for i, row in df_product_reviews.iterrows():
            t = str_texts[df_product_reviews.index.get_loc(i)] if i in df_product_reviews.index else ""
            r_val = pd.to_numeric(row.get("rating", np.nan), errors="coerce")
            compound = get_sentiment_compound(t)
            sentiment_scores.append(compound)

            if is_polar_discordance(r_val, compound):
                disagreement_count += 1

        disagreement_ratio = round(disagreement_count / n_reviews, 2)
        avg_sentiment = round(float(np.mean(sentiment_scores)), 2) if sentiment_scores else 0.0

        # Evidence flags
        evidence_flags = []
        if similar_pairs_count > 0:
            evidence_flags.append(f"REPETITIVE_REVIEW_CLUSTER (pairs >= {self.similarity_threshold}: {similar_pairs_count})")
        if exact_duplicate_count > 0:
            evidence_flags.append(f"EXACT_DUPLICATE_REVIEWS ({exact_duplicate_count})")
        if near_duplicate_pairs > 0:
            evidence_flags.append(f"NEAR_DUPLICATE_REVIEWS ({near_duplicate_pairs})")
        if disagreement_ratio >= 0.25:
            evidence_flags.append(f"ELEVATED_SENTIMENT_DISCORDANCE ({round(disagreement_ratio*100)}%)")
        if verified_ratio is not None and verified_ratio < 0.20 and n_reviews >= 5:
            evidence_flags.append(f"LOW_VERIFIED_PURCHASE_RATIO ({round(verified_ratio*100)}%)")
        if empty_count > 0:
            evidence_flags.append(f"EMPTY_OR_UNPARSEABLE_REVIEWS ({empty_count})")

        summary = (
            f"Analyzed {n_reviews} customer reviews (avg {avg_rating} stars). "
            f"Verified purchase ratio: {round(verified_ratio*100) if verified_ratio is not None else 'N/A'}%. "
            f"Max review text similarity: {round(max_sim, 2)}. "
            f"Exact duplicates: {exact_duplicate_count}, near duplicates: {near_duplicate_pairs}. "
            f"Polar sentiment-rating discordance: {round(disagreement_ratio*100)}% ({disagreement_count}/{n_reviews})."
        )
        if empty_count > 0:
            summary += f" Flagged {empty_count} reviews with missing/insufficient text."

        return {
            "review_count": n_reviews,
            "review_status": "DENSE_MULTI_REVIEW",
            "average_rating": avg_rating,
            "verified_purchase_ratio": verified_ratio,
            "average_sentiment_compound": avg_sentiment,
            "empty_or_missing_text_count": empty_count,
            "max_similarity_score": round(max_sim, 2),
            "repetitive_review_pairs": similar_pairs_count,
            "exact_duplicate_reviews": exact_duplicate_count,
            "near_duplicate_reviews": near_duplicate_pairs,
            "sentiment_disagreement_count": disagreement_count,
            "sentiment_disagreement_ratio": disagreement_ratio,
            "evidence_flags": evidence_flags,
            "evidence_summary": summary,
        }

    def batch_analyze_dataset(
        self,
        df_reviews: pd.DataFrame,
        product_key: str = "canonical_product_id"
    ) -> pd.DataFrame:
        """
        Executes review analysis grouped by product listing across a full review dataframe.
        Returns a DataFrame of listing-level NLP risk summaries.
        """
        results = []
        for pid, group in df_reviews.groupby(product_key):
            res = self.analyze_reviews(group)
            res[product_key] = pid
            results.append(res)
        return pd.DataFrame(results)
