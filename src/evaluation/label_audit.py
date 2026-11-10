"""Label Quality, Provenance Audit, and Scientific Classifier Evaluation.

Executes Workstream 1:
- Reconciles label provenance (100 Gold Tier 2, 600 Silver Tier 3, 500 Pending).
- Evaluates models across strict train-test regimes:
  1. Train Silver (600) -> Test Gold (100) (Strict Out-of-Distribution, Zero Circularity)
  2. 5-Fold Cross Validation on Gold (100) (Human Ground Truth Alone)
  3. Silver-Augmented Training (Silver + 70% Gold) -> Test 30% Gold
- Audits the 500 pending tasks.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Tuple

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
from sklearn.model_selection import StratifiedKFold, train_test_split

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATASET_DIR = PROJECT_ROOT / "data" / "indian_marketplace_trust_dataset_v1_7"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def extract_features(
    train_df: pd.DataFrame, eval_df: pd.DataFrame, vectorizer: TfidfVectorizer
) -> Tuple[np.ndarray, np.ndarray]:
    """Extracts TF-IDF and engineered numeric features consistently."""
    X_train_text = vectorizer.fit_transform(train_df["review_text"].fillna("")).toarray()
    X_eval_text = vectorizer.transform(eval_df["review_text"].fillna("")).toarray()

    numeric_cols = ["rating", "char_length", "sentiment_score", "rating_discordance_score", "is_exact_duplicate"]
    for c in numeric_cols:
        if c not in train_df.columns:
            train_df[c] = 0.0
        if c not in eval_df.columns:
            eval_df[c] = 0.0

    X_train_num = train_df[numeric_cols].fillna(0.0).to_numpy(dtype=float, copy=True)
    X_eval_num = eval_df[numeric_cols].fillna(0.0).to_numpy(dtype=float, copy=True)

    # Normalize length
    X_train_num[:, 1] = X_train_num[:, 1] / 500.0
    X_eval_num[:, 1] = X_eval_num[:, 1] / 500.0

    return np.hstack([X_train_text, X_train_num]), np.hstack([X_eval_text, X_eval_num])


def evaluate_preds(y_true: np.ndarray, y_pred: np.ndarray, y_prob: np.ndarray) -> Dict[str, Any]:
    acc = float(accuracy_score(y_true, y_pred))
    prec = float(precision_score(y_true, y_pred, zero_division=0))
    rec = float(recall_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))

    pr_auc = float(average_precision_score(y_true, y_prob)) if len(np.unique(y_true)) > 1 else None
    roc_auc = float(roc_auc_score(y_true, y_prob)) if len(np.unique(y_true)) > 1 else None
    cm = confusion_matrix(y_true, y_pred).tolist()

    return {
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "pr_auc": round(pr_auc, 4) if pr_auc is not None else None,
        "roc_auc": round(roc_auc, 4) if roc_auc is not None else None,
        "confusion_matrix": cm,
        "support": int(len(y_true)),
        "positives": int(np.sum(y_true)),
    }


def run_label_audit() -> Dict[str, Any]:
    gold_path = DATASET_DIR / "annotations" / "review_human_annotations.parquet"
    silver_path = DATASET_DIR / "annotations" / "review_silver_annotations.parquet"
    pending_path = DATASET_DIR / "annotations" / "human_annotation_pending_tasks.parquet"
    nlp_path = DATASET_DIR / "derived_evidence" / "review_nlp_features.parquet"

    gdf = pd.read_parquet(gold_path)
    sdf = pd.read_parquet(silver_path)
    pdf = pd.read_parquet(pending_path)
    nlp_df = pd.read_parquet(nlp_path) if nlp_path.exists() else pd.DataFrame()
    nlp_dict = nlp_df.set_index("review_id").to_dict("index") if not nlp_df.empty else {}

    # 1. Prepare Gold DF
    gold_records = []
    for _, r in gdf.iterrows():
        auth = str(r.get("authenticity_label", "")).upper()
        label = 1 if auth in ["SUSPICIOUS", "VERIFIED_DECEPTIVE"] else 0
        rid = r.get("review_id")
        text = str(r.get("review_text", ""))
        rating = float(r.get("rating", 3.0) or 3.0)

        feat = nlp_dict.get(rid, {})
        char_len = float(feat.get("char_length", len(text)))
        sentiment = float(feat.get("sentiment_score", 0.0) or 0.0)
        discord = float(feat.get("rating_discordance_score", 0.0) or 0.0)
        is_dup = 1.0 if bool(feat.get("is_exact_duplicate", False)) else 0.0

        gold_records.append({
            "review_id": rid,
            "review_text": text,
            "rating": rating,
            "char_length": char_len,
            "sentiment_score": sentiment,
            "rating_discordance_score": discord,
            "is_exact_duplicate": is_dup,
            "label": label,
            "tier": "GOLD",
        })
    gold_clean = pd.DataFrame(gold_records)

    # 2. Prepare Silver DF
    silver_records = []
    for _, r in sdf.iterrows():
        auth = str(r.get("review_authenticity_label", "")).upper()
        label = 1 if auth == "SUSPICIOUS" else 0
        rid = r.get("target_id")

        feat = nlp_dict.get(rid, {})
        text = str(feat.get("review_text_normalized", ""))
        rating = float(feat.get("rating", 3.0) or 3.0)
        char_len = float(feat.get("char_length", len(text)))
        sentiment = float(feat.get("sentiment_score", 0.0) or 0.0)
        discord = float(feat.get("rating_discordance_score", 0.0) or 0.0)
        is_dup = 1.0 if bool(feat.get("is_exact_duplicate", False)) else 0.0

        silver_records.append({
            "review_id": rid,
            "review_text": text,
            "rating": rating,
            "char_length": char_len,
            "sentiment_score": sentiment,
            "rating_discordance_score": discord,
            "is_exact_duplicate": is_dup,
            "label": label,
            "tier": "SILVER",
        })
    silver_clean = pd.DataFrame(silver_records)

    logger.info(f"Gold: {len(gold_clean)} (Pos: {gold_clean['label'].sum()}), Silver: {len(silver_clean)} (Pos: {silver_clean['label'].sum()})")

    # -------------------------------------------------------------
    # REGIME A: Strict Transfer - Train on Silver (600), Test on Gold (100)
    # -------------------------------------------------------------
    vec_a = TfidfVectorizer(max_features=500, stop_words="english", ngram_range=(1, 2))
    X_train_a, X_test_a = extract_features(silver_clean, gold_clean, vec_a)
    y_train_a = silver_clean["label"].values
    y_test_a = gold_clean["label"].values

    # Majority Baseline on Gold
    maj_pred = np.zeros_like(y_test_a)
    maj_res = evaluate_preds(y_test_a, maj_pred, np.zeros_like(y_test_a, dtype=float))

    # Logistic Regression
    lr_a = LogisticRegression(class_weight="balanced", random_state=42, max_iter=500)
    lr_a.fit(X_train_a, y_train_a)
    lr_pred_a = lr_a.predict(X_test_a)
    lr_prob_a = lr_a.predict_proba(X_test_a)[:, 1]
    lr_res_a = evaluate_preds(y_test_a, lr_pred_a, lr_prob_a)

    # Random Forest
    rf_a = RandomForestClassifier(n_estimators=100, class_weight="balanced", random_state=42)
    rf_a.fit(X_train_a, y_train_a)
    rf_pred_a = rf_a.predict(X_test_a)
    rf_prob_a = rf_a.predict_proba(X_test_a)[:, 1]
    rf_res_a = evaluate_preds(y_test_a, rf_pred_a, rf_prob_a)

    # -------------------------------------------------------------
    # REGIME B: 5-Fold Stratified Cross-Validation on Gold (100) Only
    # -------------------------------------------------------------
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_lr_preds = np.zeros(len(gold_clean))
    cv_lr_probs = np.zeros(len(gold_clean))
    cv_rf_preds = np.zeros(len(gold_clean))
    cv_rf_probs = np.zeros(len(gold_clean))

    for train_idx, test_idx in skf.split(gold_clean, gold_clean["label"]):
        g_train = gold_clean.iloc[train_idx].copy()
        g_test = gold_clean.iloc[test_idx].copy()

        vec_cv = TfidfVectorizer(max_features=300, stop_words="english")
        X_tr, X_te = extract_features(g_train, g_test, vec_cv)
        y_tr = g_train["label"].values

        lr_cv = LogisticRegression(class_weight="balanced", random_state=42, max_iter=500)
        lr_cv.fit(X_tr, y_tr)
        cv_lr_preds[test_idx] = lr_cv.predict(X_te)
        cv_lr_probs[test_idx] = lr_cv.predict_proba(X_te)[:, 1]

        rf_cv = RandomForestClassifier(n_estimators=100, class_weight="balanced", random_state=42)
        rf_cv.fit(X_tr, y_tr)
        cv_rf_preds[test_idx] = rf_cv.predict(X_te)
        cv_rf_probs[test_idx] = rf_cv.predict_proba(X_te)[:, 1]

    lr_res_b = evaluate_preds(gold_clean["label"].values, cv_lr_preds, cv_lr_probs)
    rf_res_b = evaluate_preds(gold_clean["label"].values, cv_rf_preds, cv_rf_probs)

    # -------------------------------------------------------------
    # REGIME C: Silver + 70% Gold Train -> Test on 30% Gold Test
    # -------------------------------------------------------------
    g_train, g_test = train_test_split(gold_clean, test_size=0.30, random_state=42, stratify=gold_clean["label"])
    combined_train = pd.concat([silver_clean, g_train], ignore_index=True)

    vec_c = TfidfVectorizer(max_features=500, stop_words="english", ngram_range=(1, 2))
    X_train_c, X_test_c = extract_features(combined_train, g_test, vec_c)
    y_train_c = combined_train["label"].values
    y_test_c = g_test["label"].values

    lr_c = LogisticRegression(class_weight="balanced", random_state=42, max_iter=500)
    lr_c.fit(X_train_c, y_train_c)
    lr_pred_c = lr_c.predict(X_test_c)
    lr_prob_c = lr_c.predict_proba(X_test_c)[:, 1]
    lr_res_c = evaluate_preds(y_test_c, lr_pred_c, lr_prob_c)

    rf_c = RandomForestClassifier(n_estimators=100, class_weight="balanced", random_state=42)
    rf_c.fit(X_train_c, y_train_c)
    rf_pred_c = rf_c.predict(X_test_c)
    rf_prob_c = rf_c.predict_proba(X_test_c)[:, 1]
    rf_res_c = evaluate_preds(y_test_c, rf_pred_c, rf_prob_c)

    # -------------------------------------------------------------
    # Pending Annotation Tasks Audit
    # -------------------------------------------------------------
    pending_audit = {
        "total_records": len(pdf),
        "status": pdf["workflow_status"].value_counts().to_dict() if "workflow_status" in pdf.columns else {"PENDING": len(pdf)},
        "marketplaces": pdf["marketplace"].value_counts().to_dict() if "marketplace" in pdf.columns else {},
        "rating_distribution": pdf["rating"].value_counts().to_dict() if "rating" in pdf.columns else {},
        "text_character_stats": {
            "mean": round(float(pdf["review_text"].str.len().mean()), 1) if "review_text" in pdf.columns else 0,
            "min": int(pdf["review_text"].str.len().min()) if "review_text" in pdf.columns else 0,
            "max": int(pdf["review_text"].str.len().max()) if "review_text" in pdf.columns else 0,
        },
    }

    results = {
        "provenance_breakdown": {
            "gold_tier_2_provisional": {
                "count": len(gold_clean),
                "genuine": int((gold_clean["label"] == 0).sum()),
                "suspicious": int((gold_clean["label"] == 1).sum()),
                "positive_rate": round(float(gold_clean["label"].mean()), 4),
            },
            "silver_tier_3_heuristic": {
                "count": len(silver_clean),
                "genuine": int((silver_clean["label"] == 0).sum()),
                "suspicious": int((silver_clean["label"] == 1).sum()),
                "positive_rate": round(float(silver_clean["label"].mean()), 4),
            },
            "pending_annotation_queue": pending_audit,
        },
        "regime_A_silver_train_gold_test": {
            "description": "Trained solely on 600 Silver heuristic records; evaluated purely on 100 Gold human annotations.",
            "majority_baseline": maj_res,
            "logistic_regression": lr_res_a,
            "random_forest": rf_res_a,
        },
        "regime_B_gold_only_5fold_cv": {
            "description": "5-Fold Stratified Cross-Validation strictly on 100 Gold human annotations.",
            "logistic_regression": lr_res_b,
            "random_forest": rf_res_b,
        },
        "regime_C_silver_plus_gold_train_gold_test": {
            "description": "Trained on 600 Silver + 70 Gold records; evaluated on held-out 30 Gold records.",
            "logistic_regression": lr_res_c,
            "random_forest": rf_res_c,
        },
    }

    return results


if __name__ == "__main__":
    res = run_label_audit()
    out_path = DATASET_DIR / "reports" / "label_audit_results.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(res, f, indent=2)
    print("SUCCESS: Label audit completed.")
    print(json.dumps(res, indent=2))
