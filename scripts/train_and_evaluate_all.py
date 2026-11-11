"""
scripts/train_and_evaluate_all.py
---------------------------------
Master Orchestration Pipeline for ML V1.0.
Coordinates environment checks, manifest audits, multi-stream feature validation,
gated fusion model fitting, leak-free out-of-fold calibration, ablation benchmarking,
inference smoke testing, and evaluation report generation.

Non-Destructive Guarantee:
Does NOT overwrite production model artifacts by default.
Requires explicit '--promote' flag to promote staged models to production paths.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import shutil
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import average_precision_score, brier_score_loss, roc_auc_score
from sklearn.model_selection import StratifiedGroupKFold

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("ML_V1_Orchestrator")

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


class MasterMLPipelineOrchestrator:
    """Master orchestrator for reproducible ML V1.0 training and evaluation."""

    def __init__(
        self,
        dataset_dir: Optional[Path] = None,
        seed: int = 42,
        dry_run: bool = False,
        promote: bool = False,
        staging_dir: Optional[Path] = None,
    ):
        self.dataset_dir = Path(dataset_dir or (PROJECT_ROOT / "data" / "indian_marketplace_trust_dataset_v1_7"))
        self.seed = seed
        self.dry_run = dry_run
        self.promote = promote
        self.staging_dir = Path(staging_dir or (PROJECT_ROOT / "models" / "staging"))
        self.prod_models_dir = PROJECT_ROOT / "models"
        self.reports_dir = PROJECT_ROOT / "reports" / "phase_2_multimodal"

        self.execution_summary: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "seed": self.seed,
            "dry_run": self.dry_run,
            "promote": self.promote,
            "stages_completed": [],
            "metrics": {},
        }

    def stage_1_environment_check(self) -> bool:
        """Verifies Python version, key dependencies, and directory structures."""
        logger.info("=== STAGE 1: Environment & Dependency Validation ===")
        import sklearn
        import torch
        import torchvision
        import networkx
        import PIL

        logger.info(f"Python Runtime: {sys.version.split()[0]} on {sys.platform}")
        logger.info(f"PyTorch: {torch.__version__} (CUDA: {torch.cuda.is_available()})")
        logger.info(f"Scikit-Learn: {sklearn.__version__} | NetworkX: {networkx.__version__}")
        logger.info(f"Target Dataset Path: {self.dataset_dir}")

        if not self.dataset_dir.exists():
            raise FileNotFoundError(f"Dataset directory not found: {self.dataset_dir}")

        self.staging_dir.mkdir(parents=True, exist_ok=True)
        self.execution_summary["stages_completed"].append("stage_1_environment_check")
        return True

    def stage_2_dataset_manifest_audit(self) -> bool:
        """Audits presence and record counts of all canonical dataset tables."""
        logger.info("=== STAGE 2: Dataset Manifest & Integrity Audit ===")
        tables = {
            "entities/products.parquet": 3643,
            "entities/listings.parquet": 3643,
            "entities/brands.parquet": 1593,
            "entities/sellers.parquet": 2865,
            "evidence/reviews.parquet": 3659,
            "evidence/images.parquet": 5034,
            "relationships/entity_relationships.parquet": 41372,
        }

        for rel_path, expected_count in tables.items():
            full_path = self.dataset_dir / rel_path
            if not full_path.exists():
                raise FileNotFoundError(f"Critical dataset table missing: {full_path}")
            df = pd.read_parquet(full_path)
            actual_count = len(df)
            logger.info(f"Table [{rel_path}]: {actual_count} records (expected ~{expected_count})")
            if actual_count < expected_count * 0.9:
                logger.warning(f"Table count deviates significantly from baseline: {actual_count} vs {expected_count}")

        self.execution_summary["stages_completed"].append("stage_2_dataset_manifest_audit")
        return True

    def stage_3_feature_matrix_assembly(self) -> Tuple[np.ndarray, np.ndarray, np.ndarray, List[str], List[str]]:
        """Extracts 13 dense normalized continuous features across 5 streams."""
        logger.info("=== STAGE 3: Multi-Stream Feature Matrix Assembly & Mask Verification ===")
        from src.models.advanced_multimodal_fusion import AdvancedMultimodalFeaturePipeline

        pipeline = AdvancedMultimodalFeaturePipeline(self.dataset_dir)
        X, y, masks, feature_names, product_ids = pipeline.build_feature_matrix()

        logger.info(f"Feature Matrix Shape: {X.shape} (13 dense features expected)")
        logger.info(f"Modality Availability Mask Shape: {masks.shape} (5 streams expected)")
        logger.info(f"Target Label Distribution: {np.bincount(y)} (Anomalous: {np.sum(y == 1)})")

        assert X.shape == (3643, 13), f"Unexpected X shape: {X.shape}"
        assert masks.shape == (3643, 5), f"Unexpected mask shape: {masks.shape}"
        assert not np.isnan(X).any(), "NaN values detected in feature matrix!"
        assert not np.isinf(X).any(), "Inf values detected in feature matrix!"
        assert set(np.unique(masks)).issubset({0.0, 1.0}), "Mask must be strictly binary {0, 1}!"

        self.execution_summary["stages_completed"].append("stage_3_feature_matrix_assembly")
        self.execution_summary["metrics"]["catalog_products"] = len(product_ids)
        self.execution_summary["metrics"]["positive_target_count"] = int(np.sum(y == 1))
        return X, y, masks, feature_names, product_ids

    def stage_4_gated_fusion_and_leak_free_calibration(
        self, X: np.ndarray, y: np.ndarray, masks: np.ndarray, feature_names: List[str]
    ) -> Dict[str, Any]:
        """Trains gated tree ensemble with ModDrop (p=0.25) and honest out-of-fold calibration."""
        logger.info("=== STAGE 4: Gated Fusion Training & Leak-Free Out-Of-Fold Calibration ===")
        from src.models.advanced_multimodal_fusion import GatedMultimodalFusionModel

        if self.dry_run:
            logger.info("[DRY RUN] Skipping heavy model fitting.")
            return {"status": "DRY_RUN_SKIPPED"}

        sgkf = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=self.seed)
        groups = np.arange(len(y)) // 4

        raw_oof_probs = np.zeros(len(y))
        cal_oof_probs = np.zeros(len(y))

        fold_rocs, fold_prs = [], []
        fold_raw_briers, fold_cal_briers = [], []

        for fold, (tr_idx, val_idx) in enumerate(sgkf.split(X, y, groups=groups)):
            X_tr, y_tr, m_tr = X[tr_idx], y[tr_idx], masks[tr_idx]
            X_va, y_va, m_va = X[val_idx], y[val_idx], masks[val_idx]

            # Fit fold-isolated model
            fold_model = GatedMultimodalFusionModel(random_state=self.seed + fold)
            fold_model.fit(X_tr, y_tr, m_tr)

            # Raw ensemble predictions
            raw_va = fold_model.base_estimator.predict_proba(X_va)[:, 1]
            raw_oof_probs[val_idx] = raw_va

            # Calibrated predictions
            cal_va = fold_model.predict_proba(X_va)[:, 1]
            cal_oof_probs[val_idx] = cal_va

            fold_rocs.append(roc_auc_score(y_va, raw_va))
            fold_prs.append(average_precision_score(y_va, raw_va))
            fold_raw_briers.append(brier_score_loss(y_va, raw_va))
            fold_cal_briers.append(brier_score_loss(y_va, cal_va))

        mean_roc = float(np.mean(fold_rocs))
        mean_pr = float(np.mean(fold_prs))
        mean_raw_brier = float(np.mean(fold_raw_briers))
        mean_cal_brier = float(np.mean(fold_cal_briers))

        logger.info(f"5-Fold CV Mean ROC-AUC: {mean_roc:.4f}")
        logger.info(f"5-Fold CV Mean PR-AUC:  {mean_pr:.4f}")
        logger.info(f"Raw OOF Brier Score:    {mean_raw_brier:.4f}")
        logger.info(f"Calibrated OOF Brier:   {mean_cal_brier:.4f} (leak-free fold-isolated)")

        # Fit full model for staging
        logger.info("Fitting full production candidate on all 3,643 catalog products...")
        full_model = GatedMultimodalFusionModel(random_state=self.seed)
        full_model.fit(X, y, masks)

        staged_artifact_path = self.staging_dir / "advanced_multimodal_gated_model.joblib"
        joblib.dump({"model": full_model, "feature_names": feature_names}, staged_artifact_path)
        logger.info(f"Saved candidate model to staging: {staged_artifact_path}")

        # Promote if explicitly requested
        if self.promote:
            prod_path = self.prod_models_dir / "advanced_multimodal_gated_model.joblib"
            backup_path = self.prod_models_dir / f"advanced_multimodal_gated_model.joblib.bak_{int(time.time())}"
            if prod_path.exists():
                shutil.copy2(prod_path, backup_path)
                logger.info(f"Backed up existing production model to: {backup_path}")
            shutil.copy2(staged_artifact_path, prod_path)
            logger.info(f"PROMOTED candidate model to production: {prod_path}")

        metrics = {
            "mean_roc_auc": round(mean_roc, 4),
            "mean_pr_auc": round(mean_pr, 4),
            "raw_brier_score": round(mean_raw_brier, 4),
            "calibrated_brier_score": round(mean_cal_brier, 4),
        }
        self.execution_summary["metrics"]["fusion_cv"] = metrics
        self.execution_summary["stages_completed"].append("stage_4_gated_fusion_and_leak_free_calibration")
        return metrics

    def stage_5_ablation_benchmarking(self) -> Dict[str, Any]:
        """Evaluates systematic modality ablations and updates cache."""
        logger.info("=== STAGE 5: Modality Ablation Studies & Impact Analysis ===")
        from src.models.advanced_multimodal_fusion import AdvancedMultimodalIntelligenceService

        service = AdvancedMultimodalIntelligenceService(self.dataset_dir)
        ablations = service.evaluate_modality_ablations(force_recompute=True)

        for name, data in ablations.items():
            logger.info(
                f"{name:30s} | ROC: {data['mean_roc_auc']:.4f} | PR: {data['mean_pr_auc']:.4f} | "
                f"Raw Brier: {data.get('raw_brier_score')} | Cal Brier: {data.get('calibrated_brier_score')}"
            )

        if not self.dry_run:
            cache_path = self.prod_models_dir / "modality_ablations.json"
            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump(ablations, f, indent=2)
            logger.info(f"Persisted modality ablations benchmark to: {cache_path}")

        self.execution_summary["metrics"]["ablations"] = ablations
        self.execution_summary["stages_completed"].append("stage_5_ablation_benchmarking")
        return ablations

    def stage_6_inference_smoke_tests(self) -> bool:
        """Validates that master in-process SDK and comparison interfaces function cleanly."""
        logger.info("=== STAGE 6: Inference & Comparison Engine Smoke Tests ===")
        from src.trust_engine.api_service import TrustIntelligenceEngine

        engine = TrustIntelligenceEngine(self.dataset_dir)

        # 1. Single product multimodal inference
        sample_pid = "amazon_in_B000052YQN"
        asmt = engine.assess_product_learned_multimodal(sample_pid)
        logger.info(
            f"Smoke Test Inference [{sample_pid}]: Risk={asmt['calibrated_risk_probability']:.4f}, "
            f"Tier={asmt['predicted_risk_tier']}, Active={asmt['active_modalities_count']}/5"
        )
        assert asmt["canonical_product_id"] == sample_pid
        assert 0.0 <= asmt["calibrated_risk_probability"] <= 1.0
        assert asmt["zero_penalty_invariant_applied"] is True

        # 2. Multi-product comparison
        pids = engine.evidence_engine.products_df["canonical_product_id"].tolist()[:2]
        comp = engine.compare_products(pids)
        logger.info(f"Smoke Test Comparison: Recommended Winner='{comp['recommended_product_id']}'")
        assert comp["compared_product_ids"] == pids
        assert comp["recommended_product_id"] in pids

        self.execution_summary["stages_completed"].append("stage_6_inference_smoke_tests")
        return True

    def stage_7_generate_run_report(self) -> Path:
        """Generates a structured execution manifest summarizing pipeline run."""
        logger.info("=== STAGE 7: Execution Report & Provenance Artifact Generation ===")
        report_path = self.reports_dir / f"PIPELINE_RUN_{int(time.time())}.json"
        self.reports_dir.mkdir(parents=True, exist_ok=True)

        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(self.execution_summary, f, indent=2)
        logger.info(f"Orchestration run successfully recorded: {report_path}")
        return report_path

    def run_all(self, stages: Optional[List[str]] = None) -> bool:
        """Runs the complete sequence or selected stages."""
        t0 = time.time()
        logger.info("Starting Master ML V1.0 Orchestration Pipeline...")

        run_all_stages = not stages or "all" in stages

        if run_all_stages or "env" in stages:
            self.stage_1_environment_check()

        if run_all_stages or "manifests" in stages:
            self.stage_2_dataset_manifest_audit()

        X, y, masks, feats, pids = None, None, None, None, None
        if run_all_stages or "features" in stages or "train" in stages:
            X, y, masks, feats, pids = self.stage_3_feature_matrix_assembly()

        if run_all_stages or "train" in stages:
            if X is None:
                X, y, masks, feats, pids = self.stage_3_feature_matrix_assembly()
            self.stage_4_gated_fusion_and_leak_free_calibration(X, y, masks, feats)

        if run_all_stages or "ablations" in stages:
            self.stage_5_ablation_benchmarking()

        if run_all_stages or "smoke" in stages:
            self.stage_6_inference_smoke_tests()

        self.stage_7_generate_run_report()

        elapsed = time.time() - t0
        logger.info(f"=== Master ML V1.0 Pipeline Run Complete in {elapsed:.2f}s ===")
        return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Master ML V1.0 Pipeline Orchestrator")
    parser.add_argument(
        "--stages",
        type=str,
        default="all",
        help="Comma-separated stages: all,env,manifests,features,train,ablations,smoke",
    )
    parser.add_argument("--seed", type=int, default=42, help="Random seed for cross-validation")
    parser.add_argument("--dry-run", action="store_true", help="Perform checks without writing models")
    parser.add_argument("--promote", action="store_true", help="Promote staged candidate to production")
    parser.add_argument("--dataset-dir", type=str, default=None, help="Dataset directory override")
    args = parser.parse_args()

    selected_stages = [s.strip().lower() for s in args.stages.split(",")]
    orchestrator = MasterMLPipelineOrchestrator(
        dataset_dir=Path(args.dataset_dir) if args.dataset_dir else None,
        seed=args.seed,
        dry_run=args.dry_run,
        promote=args.promote,
    )

    try:
        orchestrator.run_all(stages=selected_stages)
        sys.exit(0)
    except Exception as e:
        logger.exception(f"Pipeline execution aborted due to unhandled error: {e}")
        sys.exit(1)
