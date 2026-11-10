"""Review Deception and Authenticity Classification Module.

Provides reproducible baseline modeling, feature extraction, and evaluation
for review deception detection across Gold and Silver annotations.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATASET_DIR = PROJECT_ROOT / "data" / "indian_marketplace_trust_dataset_v1_7"


class ReviewDeceptionClassifier:
    """Supervised & heuristic review authenticity and deception classifier."""

    def __init__(self, dataset_dir: Path = DATASET_DIR):
        self.dataset_dir = Path(dataset_dir)
        self.vectorizer = TfidfVectorizer(max_features=500, ngram_range=(1, 2), stop_words="english")
        self.lr_model = LogisticRegression(class_weight="balanced", random_state=42, max_iter=500)
        self.rf_model = RandomForestClassifier(n_estimators=100, class_weight="balanced", random_state=42)
        self.is_fitted = False

    def load_labeled_dataset(self) -> pd.DataFrame:
        """Loads and unifies Gold human annotations (100) and Silver annotations (600)

        with NLP extracted features.
        Binary target: 0 = GENUINE, 1 = SUSPICIOUS / DECEPTIVE.
        """
        gold_path = self.dataset_dir / "annotations" / "review_human_annotations.parquet"
        silver_path = self.dataset_dir / "annotations" / "review_silver_annotations.parquet"
        nlp_path = self.dataset_dir / "derived_evidence" / "review_nlp_features.parquet"

        records: List[Dict[str, Any]] = []

        # 1. Gold annotations (Tier 2)
        if gold_path.exists():
            gdf = pd.read_parquet(gold_path)
            for _, r in gdf.iterrows():
                auth_label = str(r.get("authenticity_label", "")).upper()
                is_suspicious = 1 if auth_label in ["SUSPICIOUS", "VERIFIED_DECEPTIVE"] else 0
                records.append(
                    {
                        "review_id": r.get("review_id"),
                        "canonical_product_id": r.get("canonical_product_id"),
                        "review_text": str(r.get("review_text", "")),
                        "rating": float(r.get("rating", 3.0) or 3.0),
                        "label": is_suspicious,
                        "provenance_tier": "TIER_2_GOLD_PROVISIONAL",
                    }
                )

        # 2. Silver annotations (Tier 3)
        if silver_path.exists():
            sdf = pd.read_parquet(silver_path)
            for _, r in sdf.iterrows():
                auth_label = str(r.get("review_authenticity_label", "")).upper()
                is_suspicious = 1 if auth_label == "SUSPICIOUS" else 0
                records.append(
                    {
                        "review_id": r.get("target_id"),
                        "canonical_product_id": r.get("canonical_product_id"),
                        "review_text": "",  # will merge from nlp
                        "rating": 3.0,
                        "label": is_suspicious,
                        "provenance_tier": "TIER_3_SILVER_HEURISTIC",
                    }
                )

        labeled_df = pd.DataFrame(records)

        # Merge with NLP features for clean text and numeric features
        if nlp_path.exists():
            nlp_df = pd.read_parquet(nlp_path)
            nlp_dict = nlp_df.set_index("review_id").to_dict("index")
            for idx, r in labeled_df.iterrows():
                rid = r["review_id"]
                if rid in nlp_dict:
                    feat = nlp_dict[rid]
                    if not labeled_df.at[idx, "review_text"]:
                        labeled_df.at[idx, "review_text"] = str(feat.get("review_text_normalized", ""))
                    labeled_df.at[idx, "rating"] = float(feat.get("rating", 3.0) or 3.0)
                    labeled_df.at[idx, "char_length"] = float(feat.get("char_length", 0) or 0)
                    labeled_df.at[idx, "sentiment_score"] = float(feat.get("sentiment_score", 0.0) or 0.0)
                    labeled_df.at[idx, "rating_discordance_score"] = float(
                        feat.get("rating_discordance_score", 0.0) or 0.0
                    )
                    labeled_df.at[idx, "is_exact_duplicate"] = (
                        1.0 if bool(feat.get("is_exact_duplicate", False)) else 0.0
                    )
                else:
                    labeled_df.at[idx, "char_length"] = len(str(labeled_df.at[idx, "review_text"]))
                    labeled_df.at[idx, "sentiment_score"] = 0.0
                    labeled_df.at[idx, "rating_discordance_score"] = 0.0
                    labeled_df.at[idx, "is_exact_duplicate"] = 0.0

        logger.info(f"Loaded {len(labeled_df)} total labeled reviews. Class balance: {labeled_df['label'].value_counts().to_dict()}")
        return labeled_df

    def extract_features(self, df: pd.DataFrame, is_train: bool = False) -> np.ndarray:
        """Extracts combined TF-IDF and engineered tabular features."""
        texts = df["review_text"].fillna("").tolist()
        if is_train:
            text_vecs = self.vectorizer.fit_transform(texts).toarray()
        else:
            text_vecs = self.vectorizer.transform(texts).toarray()

        numeric_cols = ["rating", "char_length", "sentiment_score", "rating_discordance_score", "is_exact_duplicate"]
        for c in numeric_cols:
            if c not in df.columns:
                df[c] = 0.0
        num_vecs = df[numeric_cols].fillna(0.0).values
        # Normalize char length
        num_vecs[:, 1] = num_vecs[:, 1] / 500.0

        return np.hstack([text_vecs, num_vecs])

    def evaluate_model(
        self, y_true: np.ndarray, y_pred: np.ndarray, y_prob: Optional[np.ndarray] = None
    ) -> Dict[str, Any]:
        """Calculates standard classification metrics."""
        cm = confusion_matrix(y_true, y_pred).tolist()
        acc = float(accuracy_score(y_true, y_pred))
        prec = float(precision_score(y_true, y_pred, zero_division=0))
        rec = float(recall_score(y_true, y_pred, zero_division=0))
        f1 = float(f1_score(y_true, y_pred, zero_division=0))

        pr_auc = float(average_precision_score(y_true, y_prob)) if y_prob is not None and len(np.unique(y_true)) > 1 else None
        roc_auc = float(roc_auc_score(y_true, y_prob)) if y_prob is not None and len(np.unique(y_true)) > 1 else None

        return {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "pr_auc": round(pr_auc, 4) if pr_auc is not None else None,
            "roc_auc": round(roc_auc, 4) if roc_auc is not None else None,
            "confusion_matrix": cm,
            "support": int(len(y_true)),
            "positive_cases": int(np.sum(y_true)),
        }

    def train_and_benchmark(self) -> Dict[str, Any]:
        """Trains Logistic Regression and Random Forest on labeled data and evaluates against baselines."""
        df = self.load_labeled_dataset()

        # Deterministic 70/15/15 stratified split for review deception benchmarking
        from sklearn.model_selection import train_test_split

        train_df, test_df = train_test_split(df, test_size=0.30, random_state=42, stratify=df["label"])
        val_df, test_df = train_test_split(test_df, test_size=0.50, random_state=42, stratify=test_df["label"])

        logger.info(f"Split sizes: Train {len(train_df)}, Val {len(val_df)}, Test {len(test_df)}")

        X_train = self.extract_features(train_df, is_train=True)
        X_val = self.extract_features(val_df, is_train=False)
        X_test = self.extract_features(test_df, is_train=False)

        y_train = train_df["label"].values
        y_val = val_df["label"].values
        y_test = test_df["label"].values

        # 1. Baseline: Majority Class
        majority_pred = np.zeros_like(y_test)
        maj_eval = self.evaluate_model(y_test, majority_pred)

        # 2. Baseline: Simple Heuristic (Discordant or Duplicate)
        heur_pred = (
            (test_df["rating_discordance_score"] > 0.5) | (test_df["is_exact_duplicate"] == 1.0)
        ).astype(int).values
        heur_eval = self.evaluate_model(y_test, heur_pred)

        # 3. Supervised Model: Logistic Regression
        self.lr_model.fit(X_train, y_train)
        lr_pred = self.lr_model.predict(X_test)
        lr_prob = self.lr_model.predict_proba(X_test)[:, 1]
        lr_eval = self.evaluate_model(y_test, lr_pred, lr_prob)

        # 4. Supervised Model: Random Forest
        self.rf_model.fit(X_train, y_train)
        rf_pred = self.rf_model.predict(X_test)
        rf_prob = self.rf_model.predict_proba(X_test)[:, 1]
        rf_eval = self.evaluate_model(y_test, rf_pred, rf_prob)

        self.is_fitted = True

        results = {
            "evaluation_dataset": "Indian_Marketplace_Labeled_Reviews_700",
            "samples": {
                "total": len(df),
                "train": len(train_df),
                "val": len(val_df),
                "test": len(test_df),
                "positive_rate": round(float(np.mean(df["label"])), 4),
            },
            "models": {
                "majority_baseline": maj_eval,
                "heuristic_baseline": heur_eval,
                "logistic_regression": lr_eval,
                "random_forest": rf_eval,
            },
        }

        logger.info(f"Review Deception Benchmark Results:\n{json.dumps(results, indent=2)}")
        return results


if __name__ == "__main__":
    clf = ReviewDeceptionClassifier()
    res = clf.train_and_benchmark()
