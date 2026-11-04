"""
src/nlp/quality_audit.py
------------------------
NLP Text Quality, Multilingual Analysis, and Transparent Baseline Modeling.
"""

import re
from typing import Dict, Any, Tuple
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB
from sklearn.metrics import classification_report, precision_recall_fscore_support, roc_auc_score


class ReviewQualityAuditor:
    """
    Audits review text for multilingual content (Hinglish/Hindi), lexical repetition,
    and trains transparent NLP classification baselines.
    """

    @staticmethod
    def detect_language_nuance(text: str) -> str:
        """
        Detects Hindi script (Devanagari) or Romanized Hinglish markers.
        """
        if not text or pd.isna(text):
            return "unknown"

        text_str = str(text)
        # Check Devanagari Unicode block
        if re.search(r"[\u0900-\u097F]", text_str):
            return "hi-Deva"

        # Check common Hinglish colloquial particles
        hinglish_words = {"acha", "achha", "bahut", "badiya", "sahi", "kharab", "paisavasool",
                          "mat", "lo", "hai", "nahi", "tha", "hota", "karo", "kripya", "dhanyawad"}
        tokens = set(re.findall(r"\b[a-zA-Z]{3,}\b", text_str.lower()))
        if len(tokens & hinglish_words) >= 2:
            return "hi-Latn"

        return "en"

    def audit_review_corpus(self, reviews_df: pd.DataFrame) -> pd.DataFrame:
        """
        Computes enhanced quality metrics across the review corpus.
        """
        records = []
        for _, row in reviews_df.iterrows():
            rid = row["canonical_review_id"]
            pid = row.get("canonical_product_id")
            text = str(row.get("review_text_cleaned", ""))
            title = str(row.get("review_title", ""))
            full_text = f"{title} {text}".strip()

            words = re.findall(r"\b\w+\b", full_text)
            n_words = len(words)
            n_chars = len(full_text)
            unique_words = len(set(w.lower() for w in words))
            ttr = unique_words / n_words if n_words > 0 else 0.0

            n_excl = full_text.count("!")
            n_upper = sum(1 for c in full_text if c.isupper())
            upper_ratio = n_upper / n_chars if n_chars > 0 else 0.0

            lang = self.detect_language_nuance(full_text)
            is_empty_or_trivial = bool(n_words < 3)

            rating = row.get("rating", 3.0)
            is_extreme = bool(rating in [1.0, 5.0])

            records.append({
                "canonical_review_id": rid,
                "canonical_product_id": pid,
                "detected_language": lang,
                "word_count": n_words,
                "char_length": n_chars,
                "type_token_ratio": round(float(ttr), 4),
                "exclamation_count": n_excl,
                "uppercase_ratio": round(float(upper_ratio), 4),
                "is_empty_or_trivial": is_empty_or_trivial,
                "is_extreme_rating": is_extreme
            })

        return pd.DataFrame(records)

    @staticmethod
    def train_transparent_baseline(train_texts: List[str], train_labels: np.ndarray,
                                   test_texts: List[str], test_labels: np.ndarray) -> Dict[str, Any]:
        """
        Trains and evaluates transparent TF-IDF + Logistic Regression and Naive Bayes baselines.
        """
        vec = TfidfVectorizer(max_features=5000, stop_words="english", ngram_range=(1, 2))
        X_train = vec.fit_transform(train_texts)
        X_test = vec.transform(test_texts)

        # 1. Logistic Regression
        lr = LogisticRegression(max_iter=1000, random_state=42)
        lr.fit(X_train, train_labels)
        lr_preds = lr.predict(X_test)
        lr_probs = lr.predict_proba(X_test)[:, 1] if len(np.unique(train_labels)) == 2 else None

        lr_p, lr_r, lr_f1, _ = precision_recall_fscore_support(test_labels, lr_preds, average="macro", zero_division=0)
        lr_auc = roc_auc_score(test_labels, lr_probs) if lr_probs is not None else 0.0

        # 2. Naive Bayes
        nb = MultinomialNB()
        nb.fit(X_train, train_labels)
        nb_preds = nb.predict(X_test)
        nb_p, nb_r, nb_f1, _ = precision_recall_fscore_support(test_labels, nb_preds, average="macro", zero_division=0)

        return {
            "logistic_regression": {
                "precision": round(float(lr_p), 4),
                "recall": round(float(lr_r), 4),
                "f1": round(float(lr_f1), 4),
                "roc_auc": round(float(lr_auc), 4)
            },
            "naive_bayes": {
                "precision": round(float(nb_p), 4),
                "recall": round(float(nb_r), 4),
                "f1": round(float(nb_f1), 4)
            }
        }
