"""
scripts/train_and_evaluate_v1_1.py
-----------------------------------
Trains, validates, and ablates the Multimodal Vision V1.1 Pipeline.
- Preserves exact 5-fold StratifiedGroupKFold split protocol (seed=42)
- Evaluates 16-feature enhanced multi-stream representation
- Measures leak-free out-of-fold calibrated Brier scores
- Runs full leave-one-out modality ablations
- Stores V1.1 artifacts strictly in `models/v1_1/` without touching V1.0 frozen models!
"""

import argparse
import json
import logging
from pathlib import Path
import sys
import time
from typing import Any, Dict, List, Optional, Tuple

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedGroupKFold

from src.cv.pipeline_v1_1 import (
    GatedMultimodalFusionModelV1_1,
    MultimodalFeaturePipelineV1_1,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("TrainAndEvaluateV1_1")

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATASET_DIR = PROJECT_ROOT / "data" / "indian_marketplace_trust_dataset_v1_7"
MODELS_V1_1_DIR = PROJECT_ROOT / "models" / "v1_1"
REPORTS_DIR = PROJECT_ROOT / "reports" / "phase_2_multimodal"


class V1_1ExperimentRunner:
    """Orchestrates V1.1 training, evaluation, and comparative ablations."""

    def __init__(self, seed: int = 42):
        self.seed = seed
        self.dataset_dir = DATASET_DIR
        self.models_dir = MODELS_V1_1_DIR
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.reports_dir = REPORTS_DIR
        self.reports_dir.mkdir(parents=True, exist_ok=True)

        self.execution_summary: Dict[str, Any] = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "seed": self.seed,
            "pipeline_version": "V1.1",
            "features_dimension": 16,
            "metrics": {},
        }

    def run_cv_and_ablations(self) -> Dict[str, Any]:
        """Executes 5-fold CV on V1.1 feature matrix and benchmarks all ablations."""
        pipeline = MultimodalFeaturePipelineV1_1(self.dataset_dir)
        X, y, masks, feature_names, product_ids = pipeline.build_feature_matrix()

        logger.info(f"Loaded X matrix: {X.shape}, y: {np.bincount(y)}, masks: {masks.shape}")

        sgkf = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=self.seed)
        groups = np.arange(len(y)) // 4

        # 1. Evaluate Full V1.1 Model 5-Fold CV
        logger.info("Evaluating Full V1.1 Gated Multimodal Model across 5 folds...")
        fold_rocs, fold_prs = [], []
        fold_raw_briers, fold_cal_briers = [], []

        raw_oof_probs = np.zeros(len(y))
        cal_oof_probs = np.zeros(len(y))

        for fold, (tr_idx, val_idx) in enumerate(sgkf.split(X, y, groups=groups)):
            X_tr, y_tr, m_tr = X[tr_idx], y[tr_idx], masks[tr_idx]
            X_va, y_va, m_va = X[val_idx], y[val_idx], masks[val_idx]

            fold_model = GatedMultimodalFusionModelV1_1(random_state=self.seed + fold)
            fold_model.fit(X_tr, y_tr, m_tr)

            raw_va = fold_model.base_estimator.predict_proba(X_va)[:, 1]
            cal_va = fold_model.predict_proba(X_va)[:, 1]

            raw_oof_probs[val_idx] = raw_va
            cal_oof_probs[val_idx] = cal_va

            fold_rocs.append(roc_auc_score(y_va, raw_va))
            fold_prs.append(average_precision_score(y_va, raw_va))
            fold_raw_briers.append(brier_score_loss(y_va, raw_va))
            fold_cal_briers.append(brier_score_loss(y_va, cal_va))

        mean_roc = float(np.mean(fold_rocs))
        mean_pr = float(np.mean(fold_prs))
        mean_raw_brier = float(np.mean(fold_raw_briers))
        mean_cal_brier = float(np.mean(fold_cal_briers))

        logger.info(f"V1.1 Full Model 5-Fold CV:")
        logger.info(f"  Mean ROC-AUC: {mean_roc:.4f}")
        logger.info(f"  Mean PR-AUC:  {mean_pr:.4f}")
        logger.info(f"  Raw Brier:    {mean_raw_brier:.4f}")
        logger.info(f"  Cal Brier:    {mean_cal_brier:.4f}")

        # 2. Fit full candidate model on all 3,643 items and save to models/v1_1/
        logger.info("Fitting V1.1 production candidate model on all items...")
        full_v1_1_model = GatedMultimodalFusionModelV1_1(random_state=self.seed)
        full_v1_1_model.fit(X, y, masks)

        v1_1_artifact_path = self.models_dir / "advanced_multimodal_gated_model_v1_1.joblib"
        joblib.dump({"model": full_v1_1_model, "feature_names": feature_names, "pipeline_version": "V1.1"}, v1_1_artifact_path)
        logger.info(f"Saved V1.1 Model Artifact: {v1_1_artifact_path}")

        # 3. Modality Ablations Benchmarking
        logger.info("Running Modality Leave-One-Out and Unimodal Ablations for V1.1...")
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.isotonic import IsotonicRegression

        # Feature index mappings:
        # pricing: 0, 1, 2 (3)
        # review:  3, 4, 5, 6 (4)
        # image:   7, 8, 9, 10 (4)
        # clip:    11, 12, 13 (3)
        # graph:   14, 15 (2)
        configs = {
            "Full_Multimodal_V1_1": list(range(16)),
            "Ablation_Drop_Pricing": [i for i in range(16) if i not in [0, 1, 2]],
            "Ablation_Drop_Review": [i for i in range(16) if i not in [3, 4, 5, 6]],
            "Ablation_Drop_Vision": [i for i in range(16) if i not in [7, 8, 9, 10]],
            "Ablation_Drop_CLIP": [i for i in range(16) if i not in [11, 12, 13]],
            "Ablation_Drop_Graph": [i for i in range(16) if i not in [14, 15]],
            "Unimodal_Graph_Only": [14, 15],
            "Unimodal_Vision_Only": [7, 8, 9, 10],
            "Unimodal_Pricing_Only": [0, 1, 2],
            "Unimodal_Review_Only": [3, 4, 5, 6],
            "Unimodal_CLIP_Only": [11, 12, 13],
        }

        ablation_results = {}

        for cfg_name, feat_indices in configs.items():
            X_sub = X[:, feat_indices]
            sub_rocs, sub_prs, sub_raw_briers, sub_cal_briers = [], [], [], []

            for tr_idx, val_idx in sgkf.split(X_sub, y, groups=groups):
                X_tr, y_tr = X_sub[tr_idx], y[tr_idx]
                X_val, y_val = X_sub[val_idx], y[val_idx]

                rf = RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42, n_jobs=-1)
                rf.fit(X_tr, y_tr)
                probs = rf.predict_proba(X_val)[:, 1]

                iso = IsotonicRegression(out_of_bounds="clip")
                tr_probs = rf.predict_proba(X_tr)[:, 1]
                iso.fit(tr_probs, y_tr)
                cal_probs = iso.transform(probs)

                sub_rocs.append(roc_auc_score(y_val, probs))
                sub_prs.append(average_precision_score(y_val, probs))
                sub_raw_briers.append(brier_score_loss(y_val, probs))
                sub_cal_briers.append(brier_score_loss(y_val, cal_probs))

            ablation_results[cfg_name] = {
                "mean_roc_auc": round(float(np.mean(sub_rocs)), 4),
                "mean_pr_auc": round(float(np.mean(sub_prs)), 4),
                "raw_brier_score": round(float(np.mean(sub_raw_briers)), 4),
                "calibrated_brier_score": round(float(np.mean(sub_cal_briers)), 4),
                "features_count": len(feat_indices),
            }
            logger.info(f"  [{cfg_name}]: ROC={ablation_results[cfg_name]['mean_roc_auc']:.4f} | PR={ablation_results[cfg_name]['mean_pr_auc']:.4f} | CalBrier={ablation_results[cfg_name]['calibrated_brier_score']:.4f}")

        # Save ablations json
        ablations_path = self.models_dir / "modality_ablations_v1_1.json"
        with open(ablations_path, "w") as f:
            json.dump(ablation_results, f, indent=2)
        logger.info(f"Saved V1.1 Ablations to: {ablations_path}")

        metrics = {
            "mean_roc_auc": round(mean_roc, 4),
            "mean_pr_auc": round(mean_pr, 4),
            "raw_brier_score": round(mean_raw_brier, 4),
            "calibrated_brier_score": round(mean_cal_brier, 4),
            "ablations": ablation_results,
        }
        self.execution_summary["metrics"] = metrics

        run_id = int(time.time())
        report_path = self.reports_dir / f"PIPELINE_RUN_V1_1_{run_id}.json"
        with open(report_path, "w") as f:
            json.dump(self.execution_summary, f, indent=2)
        logger.info(f"Saved Execution Report: {report_path}")

        return metrics


if __name__ == "__main__":
    runner = V1_1ExperimentRunner(seed=42)
    metrics = runner.run_cv_and_ablations()
    print("\n=== V1.1 BENCHMARK SUMMARY ===")
    print(json.dumps(metrics, indent=2))
