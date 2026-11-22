"""
NLP Baseline Benchmarks on Evaluation Protocols (v1.6)

Implements rigorous, non-circular NLP model benchmarking on Protocol 3 (Reviewer-Held-Out):
1. Binary Sentiment Classification: Rating >= 4.0 (Positive) vs Rating <= 2.0 (Negative).
2. Protocol-Compliant Partitioning: Zero reviewer identity leakage between Train and Test.
3. Evaluates 3 Baselines:
   - Baseline 1: TF-IDF (1-2 ngrams) + Logistic Regression (L2 regularization)
   - Baseline 2: TF-IDF (1-2 ngrams) + Multinomial Naive Bayes
   - Baseline 3: Rule-Based Sentiment Lexicon Heuristic
4. Reports standard metrics: Accuracy, Balanced Accuracy, Precision, Recall, F1, and ROC-AUC.
5. Strict anti-circularity guarantee: Never trains on derived target risk scores.
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.naive_bayes import MultinomialNB

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("nlp_baselines_v1_6")

PROJECT_ROOT = Path(__file__).resolve().parents[2]

POSITIVE_WORDS = {"good", "great", "excellent", "love", "awesome", "best", "perfect", "nice", "wonderful", "happy", "amazing", "superb"}
NEGATIVE_WORDS = {"bad", "poor", "terrible", "worst", "hate", "awful", "broken", "horrible", "waste", "disappointed", "defective", "useless"}


class NLPBaselineEngine:
    """
    Trains and evaluates NLP baselines on reviewer-held-out splits.
    """

    def __init__(self, dataset_dir: Optional[Path] = None, out_dir: Optional[Path] = None) -> None:
        self.dataset_dir = dataset_dir or (PROJECT_ROOT / "data" / "marketplace_trust_dataset_v1.5")
        self.out_dir = out_dir or (PROJECT_ROOT / "data" / "processed_v1_6")
        self.out_dir.mkdir(parents=True, exist_ok=True)
        self.reviews_df: Optional[pd.DataFrame] = None
        self._load_data()

    def _load_data(self) -> None:
        revs_path = self.dataset_dir / "evidence" / "reviews.parquet"
        if not revs_path.exists():
            raise FileNotFoundError(f"Reviews file not found: {revs_path}")
        self.reviews_df = pd.read_parquet(revs_path)

    def prepare_dataset(self) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Filter binary sentiment labels and split by reviewer ID to ensure zero reviewer leakage.
        """
        df = self.reviews_df.copy()
        # Filter positive (>= 4.0) and negative (<= 2.0)
        binary_mask = (df["rating"] >= 4.0) | (df["rating"] <= 2.0)
        df = df[binary_mask].copy()
        df["target"] = (df["rating"] >= 4.0).astype(int)
        df["text"] = df["review_text_original"].fillna("").astype(str)
        # Drop empty texts
        df = df[df["text"].str.strip().str.len() > 3].copy()

        # Group by reviewer_id to guarantee zero reviewer overlap
        reviewers = list(df["reviewer_id"].dropna().unique())
        rng = np.random.RandomState(42)
        rng.shuffle(reviewers)

        n_train = int(len(reviewers) * 0.75)
        train_reviewers = set(reviewers[:n_train])
        test_reviewers = set(reviewers[n_train:])

        train_df = df[df["reviewer_id"].isin(train_reviewers)].copy()
        test_df = df[df["reviewer_id"].isin(test_reviewers)].copy()

        logger.info(f"Train reviews: {len(train_df):,} | Test reviews: {len(test_df):,}")
        return train_df, test_df

    @staticmethod
    def evaluate_rule_based(texts: List[str], targets: np.ndarray) -> Dict[str, float]:
        """Rule-based sentiment prediction using keyword counting."""
        preds = []
        scores = []
        for t in texts:
            words = set(t.lower().split())
            pos_count = len(words.intersection(POSITIVE_WORDS))
            neg_count = len(words.intersection(NEGATIVE_WORDS))
            diff = pos_count - neg_count
            preds.append(1 if diff >= 0 else 0)
            scores.append(1.0 / (1.0 + np.exp(-diff)))

        preds_arr = np.array(preds)
        scores_arr = np.array(scores)

        return {
            "accuracy": round(float(accuracy_score(targets, preds_arr)), 4),
            "balanced_accuracy": round(float(balanced_accuracy_score(targets, preds_arr)), 4),
            "precision": round(float(precision_score(targets, preds_arr, zero_division=0)), 4),
            "recall": round(float(recall_score(targets, preds_arr, zero_division=0)), 4),
            "f1_score": round(float(f1_score(targets, preds_arr, zero_division=0)), 4),
            "roc_auc": round(float(roc_auc_score(targets, scores_arr)), 4),
        }

    def run_benchmarks(self) -> Dict[str, Any]:
        """Execute all 3 NLP baseline models."""
        train_df, test_df = self.prepare_dataset()

        # Vectorization
        vectorizer = TfidfVectorizer(max_features=10000, ngram_range=(1, 2), stop_words="english")
        X_train = vectorizer.fit_transform(train_df["text"])
        X_test = vectorizer.transform(test_df["text"])
        y_train = train_df["target"].values
        y_test = test_df["target"].values

        results: Dict[str, Any] = {
            "task": "BINARY_REVIEW_SENTIMENT_CLASSIFICATION",
            "split_protocol": "PROTOCOL_3_REVIEWER_HELD_OUT",
            "train_samples": int(len(train_df)),
            "test_samples": int(len(test_df)),
            "test_positive_ratio": round(float(np.mean(y_test)), 4),
            "baselines": {},
        }

        # 1. Logistic Regression
        logger.info("Training Baseline 1: TF-IDF + Logistic Regression...")
        lr = LogisticRegression(max_iter=1000, random_state=42)
        lr.fit(X_train, y_train)
        y_pred_lr = lr.predict(X_test)
        y_prob_lr = lr.predict_proba(X_test)[:, 1]

        results["baselines"]["logistic_regression"] = {
            "model_name": "TF-IDF (10k n-grams) + Logistic Regression (L2)",
            "accuracy": round(float(accuracy_score(y_test, y_pred_lr)), 4),
            "balanced_accuracy": round(float(balanced_accuracy_score(y_test, y_pred_lr)), 4),
            "precision": round(float(precision_score(y_test, y_pred_lr, zero_division=0)), 4),
            "recall": round(float(recall_score(y_test, y_pred_lr, zero_division=0)), 4),
            "f1_score": round(float(f1_score(y_test, y_pred_lr, zero_division=0)), 4),
            "roc_auc": round(float(roc_auc_score(y_test, y_prob_lr)), 4),
        }

        # 2. Multinomial Naive Bayes
        logger.info("Training Baseline 2: TF-IDF + Multinomial Naive Bayes...")
        nb = MultinomialNB()
        nb.fit(X_train, y_train)
        y_pred_nb = nb.predict(X_test)
        y_prob_nb = nb.predict_proba(X_test)[:, 1]

        results["baselines"]["multinomial_nb"] = {
            "model_name": "TF-IDF (10k n-grams) + Multinomial Naive Bayes",
            "accuracy": round(float(accuracy_score(y_test, y_pred_nb)), 4),
            "balanced_accuracy": round(float(balanced_accuracy_score(y_test, y_pred_nb)), 4),
            "precision": round(float(precision_score(y_test, y_pred_nb, zero_division=0)), 4),
            "recall": round(float(recall_score(y_test, y_pred_nb, zero_division=0)), 4),
            "f1_score": round(float(f1_score(y_test, y_pred_nb, zero_division=0)), 4),
            "roc_auc": round(float(roc_auc_score(y_test, y_prob_nb)), 4),
        }

        # 3. Rule-Based Sentiment Heuristic
        logger.info("Evaluating Baseline 3: Rule-Based Sentiment Lexicon...")
        rule_metrics = self.evaluate_rule_based(test_df["text"].tolist(), y_test)
        results["baselines"]["rule_based_sentiment"] = {
            "model_name": "Lexicon Heuristic Keyword Matching",
            **rule_metrics,
        }

        # Save results JSON
        out_json = self.out_dir / "nlp_baseline_results_v1_6.json"
        with open(out_json, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2)
        logger.info(f"Saved baseline results to {out_json}")

        return results


def main() -> None:
    parser = argparse.ArgumentParser(description="NLP Baselines Benchmark v1.6")
    parser.add_argument("--run", action="store_true", help="Execute NLP benchmarks")
    args = parser.parse_args()

    engine = NLPBaselineEngine()
    res = engine.run_benchmarks()
    print("=" * 60)
    print("NLP BASELINE BENCHMARKS (Protocol 3 Reviewer-Held-Out)")
    print("=" * 60)
    for model_key, metrics in res["baselines"].items():
        print(f"\nModel: {metrics['model_name']}")
        print(f"  Accuracy:          {metrics['accuracy']:.4f}")
        print(f"  Balanced Accuracy: {metrics['balanced_accuracy']:.4f}")
        print(f"  Precision:         {metrics['precision']:.4f}")
        print(f"  Recall:            {metrics['recall']:.4f}")
        print(f"  F1-Score:          {metrics['f1_score']:.4f}")
        print(f"  ROC-AUC:           {metrics['roc_auc']:.4f}")
    print("=" * 60)


if __name__ == "__main__":
    main()
