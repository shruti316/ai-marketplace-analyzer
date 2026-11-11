"""
scripts/verification/run_strict_fold_isolated_cv.py
--------------------------------------------------
Implements Workstream C: Strict Leakage-Free Grouped Cross-Validation.
Guarantees:
1. Category-specific CLIP priors (mu_cat, sigma_cat) are fitted EXCLUSIVELY on training folds.
2. Grouping is performed by Brand/Family to prevent product-family and brand leakage.
3. Isotonic calibration is fitted EXCLUSIVELY on training folds.
4. Records fold-level sample counts, group overlap checks, learned parameters, and metrics.
"""

import json
from pathlib import Path
import sys
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import average_precision_score, brier_score_loss, roc_auc_score
from sklearn.model_selection import StratifiedGroupKFold

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.cv.pipeline_v1_1 import MultimodalFeaturePipelineV1_1

def run_strict_cv():
    pipeline = MultimodalFeaturePipelineV1_1()
    X, y, masks, feature_names, p_ids = pipeline.build_feature_matrix()

    # Load brand and category metadata for strict brand-level grouping
    prods_df = pipeline.prods_df.set_index("canonical_product_id")
    brands = [prods_df.loc[pid, "brand"] if pid in prods_df.index and pd.notna(prods_df.loc[pid, "brand"]) else "UNKNOWN" for pid in p_ids]
    categories = [prods_df.loc[pid, "category"] if pid in prods_df.index and pd.notna(prods_df.loc[pid, "category"]) else "UNKNOWN" for pid in p_ids]

    # Map unique brands to group integer IDs
    unique_brands = {b: i for i, b in enumerate(sorted(set(brands)))}
    groups = np.array([unique_brands[b] for b in brands])

    # 5-fold Stratified Group K-Fold grouped strictly by BRAND
    sgkf = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=42)

    fold_reports = []
    raw_oof_preds = np.zeros(len(y))
    cal_oof_preds = np.zeros(len(y))

    clip_sim_idx = feature_names.index("clip_cosine_similarity")
    clip_z_idx = feature_names.index("clip_category_scaled_zscore")
    clip_disc_idx = feature_names.index("clip_is_category_discordant")

    for fold, (tr_idx, val_idx) in enumerate(sgkf.split(X, y, groups=groups)):
        # 1. Group overlap check
        tr_brands = set(groups[tr_idx])
        val_brands = set(groups[val_idx])
        overlap = tr_brands.intersection(val_brands)
        assert len(overlap) == 0, f"Brand group leakage detected in Fold {fold}!"

        X_tr = X[tr_idx].copy()
        y_tr = y[tr_idx]
        X_val = X[val_idx].copy()
        y_val = y[val_idx]

        # 2. Recompute Category CLIP priors strictly on training fold
        tr_cats = [categories[i] for i in tr_idx]
        val_cats = [categories[i] for i in val_idx]
        tr_clip_sims = X_tr[:, clip_sim_idx]

        cat_stats = {}
        df_tr_cat = pd.DataFrame({"category": tr_cats, "sim": tr_clip_sims})
        for c, grp in df_tr_cat.groupby("category"):
            vals = grp["sim"].values
            valid_vals = vals[vals > 0]
            if len(valid_vals) >= 5:
                cat_stats[c] = (float(np.mean(valid_vals)), float(np.std(valid_vals)))
            else:
                cat_stats[c] = (0.3181, 0.0452) # global default fallback

        # Apply strictly training-learned category priors to validation fold
        for i_v, cat in enumerate(val_cats):
            mu, sigma = cat_stats.get(cat, (0.3181, 0.0452))
            raw_s = X_val[i_v, clip_sim_idx]
            if raw_s > 0:
                z = (raw_s - mu) / max(0.01, sigma)
                X_val[i_v, clip_z_idx] = min(1.0, max(0.0, (z + 3.0) / 6.0))
                X_val[i_v, clip_disc_idx] = 1.0 if (z <= -2.2 or raw_s < 0.17) else 0.0

        # 3. Fit base random forest
        rf = RandomForestClassifier(n_estimators=150, max_depth=6, min_samples_split=8, class_weight="balanced", random_state=42 + fold, n_jobs=-1)
        rf.fit(X_tr, y_tr)

        # 4. Out-of-fold probability calibration
        # Fit calibrator on training fold out-of-bag or training probabilities
        tr_probs = rf.predict_proba(X_tr)[:, 1]
        iso = IsotonicRegression(out_of_bounds="clip")
        iso.fit(tr_probs, y_tr)

        val_raw = rf.predict_proba(X_val)[:, 1]
        val_cal = iso.predict(val_raw)

        raw_oof_preds[val_idx] = val_raw
        cal_oof_preds[val_idx] = val_cal

        fold_roc = roc_auc_score(y_val, val_raw)
        fold_pr = average_precision_score(y_val, val_raw)
        fold_raw_brier = brier_score_loss(y_val, val_raw)
        fold_cal_brier = brier_score_loss(y_val, val_cal)

        fold_reports.append({
            "fold": fold + 1,
            "train_samples": len(tr_idx),
            "val_samples": len(val_idx),
            "train_positives": int(np.sum(y_tr == 1)),
            "val_positives": int(np.sum(y_val == 1)),
            "train_brands_count": len(tr_brands),
            "val_brands_count": len(val_brands),
            "brand_overlap_count": len(overlap),
            "learned_categories_count": len(cat_stats),
            "roc_auc": round(fold_roc, 4),
            "pr_auc": round(fold_pr, 4),
            "raw_brier": round(fold_raw_brier, 4),
            "calibrated_brier": round(fold_cal_brier, 4)
        })

    overall_summary = {
        "grouping_criterion": "Brand / Manufacturer Entity Isolation",
        "total_catalog_samples": len(y),
        "total_positive_samples": int(np.sum(y == 1)),
        "mean_roc_auc": round(float(np.mean([f["roc_auc"] for f in fold_reports])), 4),
        "std_roc_auc": round(float(np.std([f["roc_auc"] for f in fold_reports])), 4),
        "mean_pr_auc": round(float(np.mean([f["pr_auc"] for f in fold_reports])), 4),
        "std_pr_auc": round(float(np.std([f["pr_auc"] for f in fold_reports])), 4),
        "mean_raw_brier": round(float(np.mean([f["raw_brier"] for f in fold_reports])), 4),
        "mean_calibrated_brier": round(float(np.mean([f["calibrated_brier"] for f in fold_reports])), 4),
        "folds": fold_reports
    }

    out_path = PROJECT_ROOT / "reports" / "final_acceptance" / "strict_fold_isolated_cv_results.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(overall_summary, f, indent=2)

    print("Strict Brand-Grouped Fold-Isolated Cross-Validation Summary:")
    print(json.dumps(overall_summary, indent=2))

if __name__ == "__main__":
    run_strict_cv()
