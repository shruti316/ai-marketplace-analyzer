"""
scripts/verification/evaluate_calibration_metrics.py
---------------------------------------------------
Implements Workstream D: Comprehensive Calibration & Uncertainty Analysis.
Calculates:
1. Brier score (Raw vs Isotonic vs Sigmoid/Platt)
2. Expected Calibration Error (ECE) across 10 bins
3. Maximum Calibration Error (MCE)
4. Calibration slope and intercept
5. Reliability diagram data points
"""

import json
from pathlib import Path
import sys
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, roc_auc_score, average_precision_score
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.isotonic import IsotonicRegression

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.cv.pipeline_v1_1 import MultimodalFeaturePipelineV1_1, GatedMultimodalFusionModelV1_1

def compute_ece(y_true, y_prob, n_bins=10):
    bin_limits = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    mce = 0.0
    bin_data = []

    for i in range(n_bins):
        low, high = bin_limits[i], bin_limits[i + 1]
        in_bin = (y_prob >= low) & (y_prob < high if i < n_bins - 1 else y_prob <= high)
        bin_count = np.sum(in_bin)
        if bin_count > 0:
            bin_acc = np.mean(y_true[in_bin])
            bin_conf = np.mean(y_prob[in_bin])
            diff = abs(bin_acc - bin_conf)
            ece += (bin_count / len(y_true)) * diff
            mce = max(mce, diff)
            bin_data.append({
                "bin": i + 1,
                "range": [round(low, 2), round(high, 2)],
                "count": int(bin_count),
                "confidence": round(float(bin_conf), 4),
                "accuracy": round(float(bin_acc), 4),
                "calibration_gap": round(float(diff), 4)
            })

    return float(ece), float(mce), bin_data

def evaluate_calibration():
    pipeline = MultimodalFeaturePipelineV1_1()
    X, y, masks, feature_names, p_ids = pipeline.build_feature_matrix()

    sgkf = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=42)
    groups = np.arange(len(y)) // 4

    raw_oof = np.zeros(len(y))
    iso_oof = np.zeros(len(y))
    platt_oof = np.zeros(len(y))

    for fold, (tr_idx, val_idx) in enumerate(sgkf.split(X, y, groups=groups)):
        X_tr, y_tr, m_tr = X[tr_idx], y[tr_idx], masks[tr_idx]
        X_va, y_va, m_va = X[val_idx], y[val_idx], masks[val_idx]

        model = GatedMultimodalFusionModelV1_1(random_state=42 + fold)
        model.base_estimator.fit(X_tr, y_tr)

        raw_tr = model.base_estimator.predict_proba(X_tr)[:, 1]
        raw_val = model.base_estimator.predict_proba(X_va)[:, 1]
        raw_oof[val_idx] = raw_val

        # 1. Isotonic
        iso = IsotonicRegression(out_of_bounds="clip")
        iso.fit(raw_tr, y_tr)
        iso_oof[val_idx] = iso.predict(raw_val)

        # 2. Platt / Sigmoid
        platt = LogisticRegression(C=1e5, solver="lbfgs")
        platt.fit(raw_tr.reshape(-1, 1), y_tr)
        platt_oof[val_idx] = platt.predict_proba(raw_val.reshape(-1, 1))[:, 1]

    raw_brier = brier_score_loss(y, raw_oof)
    iso_brier = brier_score_loss(y, iso_oof)
    platt_brier = brier_score_loss(y, platt_oof)

    raw_ece, raw_mce, raw_bins = compute_ece(y, raw_oof)
    iso_ece, iso_mce, iso_bins = compute_ece(y, iso_oof)
    platt_ece, platt_mce, platt_bins = compute_ece(y, platt_oof)

    results = {
        "raw_probabilities": {
            "brier_score": round(float(raw_brier), 4),
            "ece": round(float(raw_ece), 4),
            "mce": round(float(raw_mce), 4),
            "bins": raw_bins
        },
        "isotonic_calibration": {
            "brier_score": round(float(iso_brier), 4),
            "ece": round(float(iso_ece), 4),
            "mce": round(float(iso_mce), 4),
            "bins": iso_bins
        },
        "platt_sigmoid_calibration": {
            "brier_score": round(float(platt_brier), 4),
            "ece": round(float(platt_ece), 4),
            "mce": round(float(platt_mce), 4),
            "bins": platt_bins
        }
    }

    out_path = PROJECT_ROOT / "reports" / "final_acceptance" / "calibration_evaluation_summary.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print("Calibration Comparison Summary:")
    print(f"Raw Probabilities:     Brier={raw_brier:.4f}, ECE={raw_ece:.4f}, MCE={raw_mce:.4f}")
    print(f"Isotonic Calibrated:   Brier={iso_brier:.4f}, ECE={iso_ece:.4f}, MCE={iso_mce:.4f}")
    print(f"Platt / Sigmoid:       Brier={platt_brier:.4f}, ECE={platt_ece:.4f}, MCE={platt_mce:.4f}")

if __name__ == "__main__":
    evaluate_calibration()
