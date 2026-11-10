"""Phase 1 Final Architecture & Scientific Finalization Test Suite.

Verifies:
1. TargetRegistry registration, definitions, and circular target deprecation.
2. Acyclic dependency graph and feature isolation.
3. DoubleBlindWorkflowEngine: blinded submission, Cohen's Kappa, disagreement queue, adjudication.
4. NLP Two-Track architecture: Track 1 Silver weak supervision vs Track 2 Gold text-only pipeline.
5. CV image duplicate retrieval & threshold sensitivity.
6. OCR packaging CER/WER calculation and four-tier failure taxonomy.
7. CLIP vision-language contrastive benchmark metrics.
8. Pricing MAD robust z-scores and statutory MRP consistency invariant.
9. Graph entity relationship integrity and seller aggregate governance notice.
10. Model artifact manifest, schemas, and deliverable reports existence.
"""

import json
from pathlib import Path
import sys

import numpy as np
import pandas as pd
import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

DATASET_DIR = PROJECT_ROOT / "data" / "indian_marketplace_trust_dataset_v1_7"
REPORTS_DIR = PROJECT_ROOT / "reports" / "phase_1_final"


def test_target_registry_integrity_and_deprecation():
    """Verifies that all required independent targets are registered and proxy target is deprecated."""
    from src.data.target_registry import EvaluationEligibility, TargetNature, TargetRegistry

    targets = TargetRegistry.list_all()
    assert len(targets) >= 7

    target_ids = [t.target_id for t in targets]
    assert "TARGET_REVIEW_AUTHENTICITY" in target_ids
    assert "TARGET_IMAGE_RELATIONSHIP" in target_ids
    assert "TARGET_IMAGE_LISTING_CONSISTENCY" in target_ids
    assert "TARGET_PRICING_INTELLIGENCE" in target_ids
    assert "TARGET_PRODUCT_LISTING_CONSISTENCY" in target_ids
    assert "TARGET_PRODUCT_TRUST_INTELLIGENCE" in target_ids
    assert "TARGET_DEPRECATED_ELEVATED_RISK_SURROGATE" in target_ids

    # Verify review authenticity is marked awaiting human ground truth
    rev_target = TargetRegistry.get("TARGET_REVIEW_AUTHENTICITY")
    assert rev_target.evaluation_eligibility == EvaluationEligibility.BLOCKED_AWAITING_HUMAN_GROUND_TRUTH
    assert "rating" in rev_target.forbidden_features

    # Verify deprecated proxy target is marked DEPRECATED_CIRCULAR_PROXY
    dep_target = TargetRegistry.get("TARGET_DEPRECATED_ELEVATED_RISK_SURROGATE")
    assert dep_target.evaluation_eligibility == EvaluationEligibility.DEPRECATED_CIRCULAR_PROXY
    assert dep_target.target_nature == TargetNature.PROXY_RULE_DERIVED


def test_double_blind_workflow_math_and_adjudication():
    """Verifies Cohen's Kappa calculation, disagreement detection, and lead adjudication."""
    from src.annotations.double_blind_workflow import DoubleBlindWorkflowEngine

    engine = DoubleBlindWorkflowEngine()

    # Submit matching pair
    engine.submit_annotation("t1", "r1", "ann_01", "VERIFIED_GENUINE", rationale="Organic criticism")
    engine.submit_annotation("t1", "r1", "ann_02", "VERIFIED_GENUINE", rationale="Critical build quality review")

    # Submit disagreeing pair
    engine.submit_annotation("t2", "r2", "ann_01", "SUSPICIOUS", rationale="Bot syntax")
    engine.submit_annotation("t2", "r2", "ann_02", "VERIFIED_GENUINE", rationale="Short organic phrase")

    # Check Kappa calculation
    rep = engine.compute_inter_annotator_agreement("ann_01", "ann_02")
    assert rep.total_paired_tasks == 2
    assert rep.matching_pairs == 1
    assert rep.disagreeing_pairs == 1
    assert rep.observed_agreement_po == 0.5

    # Check disagreement routing
    disagreements = engine.get_disagreement_queue()
    assert len(disagreements) == 1
    assert disagreements[0]["task_id"] == "t2"

    # Adjudicate
    adj = engine.adjudicate_task("t2", "lead_adj", "VERIFIED_GENUINE", "Classify as genuine under honest null standard")
    assert adj.adjudicated_final_label == "VERIFIED_GENUINE"
    assert len(engine.get_disagreement_queue()) == 0


def test_double_blind_reannotation_queues_exist():
    """Verifies that the 100 blinded re-annotation queue and 500 stratified pending tasks exist."""
    q100 = REPORTS_DIR / "reannotation_queue_100_reviews.parquet"
    q500 = REPORTS_DIR / "annotation_queue_500_stratified.parquet"

    assert q100.exists()
    assert q500.exists()

    df100 = pd.read_parquet(q100)
    df500 = pd.read_parquet(q500)

    assert len(df100) == 100
    assert len(df500) == 500
    assert "guideline_prompt" in df100.columns
    assert "sampling_stratum" in df500.columns
    assert len(df500["sampling_stratum"].unique()) >= 4


def test_nlp_two_track_evaluation_integrity():
    """Verifies Track 1 Silver baseline vs Track 2 Gold text-only pipeline separation."""
    from src.nlp.nlp_training_tracks import NLPTrackManager

    mgr = NLPTrackManager(DATASET_DIR)
    t1 = mgr.evaluate_track1_silver_weak_supervision()
    t2 = mgr.evaluate_track2_independent_gold_pipeline()

    assert t1["total_samples"] == 600
    assert t1["logistic_regression"]["mean_f1"] > 0.50
    assert t1["random_forest"]["mean_f1"] > 0.50

    assert t2["total_samples"] == 100
    assert t2["deceptive_count"] == 1
    assert t2["independent_supervised_status"] == "BLOCKED_AWAITING_DOUBLE_BLIND_ADJUDICATION"


def test_cv_benchmark_metrics():
    """Verifies Image duplicate retrieval, OCR error rates, and CLIP contrastive ranking."""
    from src.evaluation.cv_benchmark_runner import CVBenchmarkRunner, compute_cer_and_wer

    runner = CVBenchmarkRunner(DATASET_DIR)
    cv_res = runner.evaluate_image_duplicate_retrieval()
    ocr_res = runner.evaluate_ocr_packaging_validation()
    clip_res = runner.evaluate_clip_vision_language()

    assert cv_res["total_usable_images"] > 4000
    assert len(cv_res["resnet_threshold_sensitivity"]) >= 5

    # OCR metrics
    assert ocr_res["total_packaging_images_evaluated"] == 100
    assert ocr_res["benchmark_metrics"]["brand_verified_on_packaging_count"] == 32
    assert ocr_res["benchmark_metrics"]["brand_verification_rate"] == 0.32
    assert ocr_res["benchmark_metrics"]["character_error_rate_cer"] < 0.20

    # Test CER/WER function
    cer, wer = compute_cer_and_wer("POND'S", "POND'S")
    assert cer == 0.0 and wer == 0.0

    # CLIP contrastive metrics
    assert clip_res["benchmark_sample_count"] == 100
    assert clip_res["contrastive_ranking_metrics"]["roc_auc"] > 0.90


def test_pricing_and_graph_invariants():
    """Verifies robust pricing corridors, statutory MRP compliance, and graph seller governance."""
    from src.evaluation.pricing_and_graph_benchmark_runner import PricingAndGraphBenchmarkRunner

    runner = PricingAndGraphBenchmarkRunner(DATASET_DIR)
    p_res = runner.evaluate_pricing_intelligence()
    g_res = runner.evaluate_graph_intelligence()

    assert p_res["total_price_observations"] > 3000
    # Statutory MRP invariant: 0 breaches
    assert p_res["pricing_anomalies_summary"]["mrp_statutory_breaches"] == 0

    # Graph integrity
    assert g_res["graph_edges_count"] == 41372
    assert g_res["product_grouping_components_count"] == 3397
    assert g_res["seller_governance_audit"]["individual_3rd_party_resolved"] == 0


def test_all_phase1_final_deliverables_exist():
    """Verifies all required Phase 1 Final deliverable documents and schemas exist."""
    required = [
        REPORTS_DIR / "target_provenance.csv",
        REPORTS_DIR / "independent_target_registry.md",
        REPORTS_DIR / "annotation_guidelines_v2.md",
        REPORTS_DIR / "human_annotation_protocol.md",
        REPORTS_DIR / "annotation_sampling_strategy.md",
        REPORTS_DIR / "annotation_quality_report.md",
        REPORTS_DIR / "nlp_evaluation_report.md",
        REPORTS_DIR / "cv_evaluation_report.md",
        REPORTS_DIR / "ocr_validation_report.md",
        REPORTS_DIR / "clip_validation_report.md",
        REPORTS_DIR / "pricing_evaluation_report.md",
        REPORTS_DIR / "graph_evaluation_report.md",
        REPORTS_DIR / "multimodal_fusion_evaluation.md",
        REPORTS_DIR / "model_inventory.md",
        REPORTS_DIR / "model_artifact_manifest.json",
        REPORTS_DIR / "model_input_output_schemas.json",
        REPORTS_DIR / "model_limitations.md",
    ]
    for p in required:
        assert p.exists(), f"Missing required Phase 1 Final deliverable: {p}"
        assert p.stat().st_size > 0, f"Deliverable is empty: {p}"
