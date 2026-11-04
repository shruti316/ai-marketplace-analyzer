"""
src/nlp/nlp_intelligence_v1_5.py
---------------------------------
Comprehensive NLP Language Quality Audit, Deceptive Opinion Spam Baseline,
and Explainable Review Risk Feature Engineering for Release v1.5.
"""

import sys
import re
import logging
from pathlib import Path
from typing import Dict, Any, List, Tuple
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB
from sklearn.metrics import (
    precision_recall_fscore_support, roc_auc_score,
    average_precision_score, confusion_matrix
)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class NLPIntelligenceEngineV15:
    """
    Executes language identification, text quality profiling,
    leakage-safe Ott benchmark evaluation, and unsupervised review risk features.
    """

    HINGLISH_LEXICON = {
        "achha", "accha", "bahut", "bura", "kharab", "paisa", "vasool", "mast",
        "bekar", "sahi", "badhiya", "sasta", "mehenga", "dhokha", "nakli",
        "asli", "kripya", "dhanyawad", "shukriya", "bhai", "yaar", "chutiya",
        "bakwas", "zabardast", "ekdam", "ghatiya", "chalega", "nahi", "hain",
        "kaise", "hota", "karna", "lena", "diya", "wali", "wala"
    }

    # Unicode script ranges
    DEVANAGARI_RANGE = re.compile(r'[\u0900-\u097F]')
    BENGALI_RANGE = re.compile(r'[\u0980-\u09FF]')
    TAMIL_RANGE = re.compile(r'[\u0B80-\u0BFF]')
    TELUGU_RANGE = re.compile(r'[\u0C00-\u0C7F]')

    @classmethod
    def audit_language_composition(cls, reviews_df: pd.DataFrame) -> Dict[str, Any]:
        """
        Classifies review texts into linguistic buckets:
        - English
        - Hinglish / Latinized Indic
        - Devanagari
        - Other Indic Scripts
        - Unknown / Mixed / Empty
        """
        results = {
            "ENGLISH": 0,
            "HINGLISH_LATINIZED_INDIC": 0,
            "NATIVE_DEVANAGARI": 0,
            "NATIVE_OTHER_INDIC": 0,
            "EMPTY_OR_UNPARSEABLE": 0
        }

        lang_labels = []
        confidences = []

        for text in reviews_df["review_text_original"].fillna(""):
            t = str(text).strip()
            if not t:
                results["EMPTY_OR_UNPARSEABLE"] += 1
                lang_labels.append("EMPTY")
                confidences.append(1.0)
                continue

            # Check Native Indic Scripts
            if cls.DEVANAGARI_RANGE.search(t):
                results["NATIVE_DEVANAGARI"] += 1
                lang_labels.append("NATIVE_DEVANAGARI")
                confidences.append(0.95)
            elif cls.BENGALI_RANGE.search(t) or cls.TAMIL_RANGE.search(t) or cls.TELUGU_RANGE.search(t):
                results["NATIVE_OTHER_INDIC"] += 1
                lang_labels.append("NATIVE_OTHER_INDIC")
                confidences.append(0.95)
            else:
                # Tokenize Latin words
                tokens = set(re.findall(r'[a-zA-Z]+', t.lower()))
                hinglish_hits = tokens.intersection(cls.HINGLISH_LEXICON)
                if len(hinglish_hits) >= 2 or (len(tokens) > 0 and len(hinglish_hits) / len(tokens) >= 0.15):
                    results["HINGLISH_LATINIZED_INDIC"] += 1
                    lang_labels.append("HINGLISH_LATINIZED_INDIC")
                    confidences.append(min(0.60 + len(hinglish_hits) * 0.10, 0.95))
                else:
                    results["ENGLISH"] += 1
                    lang_labels.append("ENGLISH")
                    confidences.append(0.90)

        total = len(reviews_df)
        pcts = {k: round(v / total * 100, 2) for k, v in results.items()}

        return {
            "total_reviews": total,
            "counts": results,
            "percentages": pcts,
            "language_labels": lang_labels,
            "confidence_scores": confidences,
            "indic_representation_note": "Latinized Hinglish identified via domain lexicon; Native Indic scripts detected via Unicode block analysis."
        }

    @classmethod
    def evaluate_isolated_deceptive_spam_benchmark(cls, benchmark_df: pd.DataFrame) -> Dict[str, Any]:
        """
        Rebuilds and evaluates the isolated Ott Deceptive Opinion Spam benchmark.
        Guarantees strict train/test isolation, zero benchmark leakage,
        and honest task classification (deceptive opinion spam, NOT marketplace fraud).
        """
        df = benchmark_df.copy()
        df["binary_label"] = (df["deceptive"] == "deceptive").astype(int)

        # 80/20 train/test split with deterministic seed
        rng = np.random.RandomState(42)
        n = len(df)
        indices = np.arange(n)
        rng.shuffle(indices)

        n_train = int(n * 0.80)
        train_idx = indices[:n_train]
        test_idx = indices[n_train:]

        train_texts = df.iloc[train_idx]["text"].tolist()
        train_y = df.iloc[train_idx]["binary_label"].values
        test_texts = df.iloc[test_idx]["text"].tolist()
        test_y = df.iloc[test_idx]["binary_label"].values

        # TF-IDF fitted strictly on training partition
        vec = TfidfVectorizer(max_features=3000, stop_words="english", ngram_range=(1, 2))
        X_train = vec.fit_transform(train_texts)
        X_test = vec.transform(test_texts)

        # 1. Logistic Regression Baseline
        lr = LogisticRegression(max_iter=1000, C=1.0, random_state=42)
        lr.fit(X_train, train_y)
        lr_preds = lr.predict(X_test)
        lr_probs = lr.predict_proba(X_test)[:, 1]

        lr_p, lr_r, lr_f1, _ = precision_recall_fscore_support(test_y, lr_preds, average="binary")
        lr_auc = roc_auc_score(test_y, lr_probs)
        lr_pr_auc = average_precision_score(test_y, lr_probs)
        lr_cm = confusion_matrix(test_y, lr_preds).tolist()

        # 2. Multinomial Naive Bayes Baseline
        nb = MultinomialNB()
        nb.fit(X_train, train_y)
        nb_preds = nb.predict(X_test)
        nb_probs = nb.predict_proba(X_test)[:, 1]

        nb_p, nb_r, nb_f1, _ = precision_recall_fscore_support(test_y, nb_preds, average="binary")
        nb_auc = roc_auc_score(test_y, nb_probs)
        nb_pr_auc = average_precision_score(test_y, nb_probs)
        nb_cm = confusion_matrix(test_y, nb_preds).tolist()

        return {
            "benchmark_name": "Ott Deceptive Opinion Spam (Cornell Psycholinguistic Lab)",
            "task_type": "DECEPTIVE_OPINION_SPAM_CLASSIFICATION",
            "fraud_context_warning": "This evaluates hotel deception detection in lab setting; it is NOT confirmed e-commerce marketplace fraud.",
            "total_benchmark_records": n,
            "train_samples": len(train_idx),
            "test_samples": len(test_idx),
            "class_distribution": {
                "truthful": int((df['binary_label'] == 0).sum()),
                "deceptive": int((df['binary_label'] == 1).sum())
            },
            "models": {
                "logistic_regression": {
                    "precision": round(float(lr_p), 4),
                    "recall": round(float(lr_r), 4),
                    "f1_score": round(float(lr_f1), 4),
                    "roc_auc": round(float(lr_auc), 4),
                    "pr_auc": round(float(lr_pr_auc), 4),
                    "confusion_matrix": lr_cm
                },
                "multinomial_naive_bayes": {
                    "precision": round(float(nb_p), 4),
                    "recall": round(float(nb_r), 4),
                    "f1_score": round(float(nb_f1), 4),
                    "roc_auc": round(float(nb_auc), 4),
                    "pr_auc": round(float(nb_pr_auc), 4),
                    "confusion_matrix": nb_cm
                }
            }
        }

    @classmethod
    def compute_unsupervised_review_risk_features(cls, reviews_df: pd.DataFrame) -> pd.DataFrame:
        """
        Computes explainable, unsupervised review risk features.
        Features are recorded as continuous evidence signals (never binary fraud labels).
        """
        df = reviews_df.copy()

        # Text length & word count
        df["text_clean"] = df["review_text_original"].fillna("").astype(str)
        df["word_count"] = df["text_clean"].apply(lambda t: len(t.split()))
        df["is_short_review"] = df["word_count"] < 5

        # Duplicate text signal
        text_counts = df["text_clean"].value_counts()
        df["duplicate_text_frequency"] = df["text_clean"].map(text_counts).fillna(1)
        df["is_repeated_text_signal"] = df["duplicate_text_frequency"] > 1

        # Rating sentiment discordance heuristic
        # High rating (5.0) with negative keywords OR Low rating (1.0) with positive keywords
        neg_words = {"bad", "worst", "terrible", "waste", "horrible", "damaged", "broken", "fake", "bekar", "kharab"}
        pos_words = {"good", "great", "excellent", "love", "awesome", "amazing", "best", "mast", "badhiya", "achha"}

        def detect_discordance(row):
            rating = row.get("rating")
            t_words = set(re.findall(r'[a-zA-Z]+', row["text_clean"].lower()))
            if pd.isna(rating):
                return False
            if rating >= 4.5 and len(t_words.intersection(neg_words)) >= 2:
                return True
            if rating <= 1.5 and len(t_words.intersection(pos_words)) >= 2:
                return True
            return False

        df["is_rating_sentiment_discordant"] = df.apply(detect_discordance, axis=1)

        # Output feature store
        out_cols = [
            "canonical_review_id", "canonical_product_id", "marketplace",
            "word_count", "is_short_review", "duplicate_text_frequency",
            "is_repeated_text_signal", "is_rating_sentiment_discordant"
        ]
        return df[out_cols]
