"""Phase 1 Scientific Validation & Target Leakage Audit Test Suite.

Verifies:
1. Multimodal target provenance, proxy classification, and rule dependency.
2. Multimodal feature leakage classification: circular constituent flags vs raw observations.
3. Group-aware fold integrity across connected components (0 leakage).
4. NLP Star Rating perfect separation audit in 100 provisional Gold reviews.
5. NLP group-aware product isolation (no same-product reviews across folds).
6. Single Deceptive sample explicit tracking (N=1).
7. Complete Phase 1 deliverable artifact existence and integrity.
"""

import json
from pathlib import Path
import sys
import numpy as np
import pandas as pd
import pytest
from sklearn.model_selection import StratifiedGroupKFold

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

DATASET_DIR = PROJECT_ROOT / "data" / "indian_marketplace_trust_dataset_v1_7"
PHASE1_DIR = PROJECT_ROOT / "reports" / "phase_1_scientific_validation"


def test_phase1_deliverable_artifacts_exist():
    """Verifies all 7 required Phase 1 deliverable files exist and are non-empty."""
    required_files = [
        PHASE1_DIR / "phase_1_scientific_audit.md",
        PHASE1_DIR / "multimodal_target_provenance.csv",
        PHASE1_DIR / "multimodal_feature_leakage_audit.csv",
        PHASE1_DIR / "multimodal_group_cv_results.csv",
        PHASE1_DIR / "nlp_fold_level_results.csv",
        PHASE1_DIR / "nlp_classification_report.csv",
        PHASE1_DIR / "experiment_config.json",
    ]
    for p in required_files:
        assert p.exists(), f"Missing required Phase 1 file: {p}"
        assert p.stat().st_size > 0, f"File is empty: {p}"


def test_multimodal_target_provenance_and_circularity():
    """Verifies target is synthetic rule-generated proxy, not external legal fraud truth."""
    prov_csv = PHASE1_DIR / "multimodal_target_provenance.csv"
    assert prov_csv.exists()
    df = pd.read_csv(prov_csv)

    assert "is_elevated_risk" in df["target_component"].values
    elevated_row = df[df["target_component"] == "is_elevated_risk"].iloc[0]
    assert "overall_risk_tier == 'ELEVATED_MULTIMODAL_ANOMALY'" in elevated_row["generation_method"]
    assert "NO" in str(elevated_row["human_verified"]).upper()
    assert elevated_row["target_nature"] == "BINARY_PROXY_TARGET"


def test_multimodal_feature_leakage_classification():
    """Verifies circular flags are identified and separated from clean features."""
    leak_csv = PHASE1_DIR / "multimodal_feature_leakage_audit.csv"
    assert leak_csv.exists()
    df = pd.read_csv(leak_csv)

    circular_flags = ["is_price_outlier", "is_extreme_price_outlier", "is_discount_anomaly", "cv_has_cross_catalog_reuse"]
    for flag in circular_flags:
        row = df[df["feature"] == flag]
        assert len(row) == 1, f"Missing feature {flag}"
        assert row.iloc[0]["leakage_risk"] == "DIRECT_LEAKAGE"
        assert row.iloc[0]["decision"] == "EXCLUDE_FROM_CLEAN_MODEL"

    # Verify late ensemble heur_prob_all is flagged as post-outcome
    ens_row = df[df["feature"].str.startswith("heur_prob_all")].iloc[0]
    assert ens_row["leakage_risk"] == "POST_OUTCOME_INFORMATION"


def test_multimodal_group_aware_fold_integrity():
    """Verifies that StratifiedGroupKFold over connected components has 0 leakage."""
    import networkx as nx
    from src.data.curation.split_generator import LeakageSafeSplitGenerator

    gen = LeakageSafeSplitGenerator(DATASET_DIR)
    G = gen.build_multimodal_grouping_graph()
    components = list(nx.connected_components(G))
    pid_to_comp = {pid: cid for cid, comp in enumerate(components) for pid in comp}

    prod_df = pd.read_parquet(DATASET_DIR / "entities" / "products.parquet")
    trust_df = pd.read_parquet(DATASET_DIR / "derived_evidence" / "trust_assessments_products.parquet")
    prod_df["comp_id"] = prod_df["canonical_product_id"].map(pid_to_comp)
    prod_df["target"] = (prod_df["canonical_product_id"].map(trust_df.set_index("canonical_product_id")["overall_risk_tier"]) == "ELEVATED_MULTIMODAL_ANOMALY").astype(int)

    sgkf = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=42)
    for fold, (tr, te) in enumerate(sgkf.split(prod_df, prod_df["target"], groups=prod_df["comp_id"])):
        tr_comps = set(prod_df.iloc[tr]["comp_id"])
        te_comps = set(prod_df.iloc[te]["comp_id"])
        # Strict group isolation: intersection must be 0!
        assert len(tr_comps.intersection(te_comps)) == 0, f"Fold {fold} has leaking components!"


def test_nlp_gold_rating_leakage_discovery():
    """Verifies the empirical discovery that star rating perfectly separates Gold classes."""
    gdf = pd.read_parquet(DATASET_DIR / "annotations" / "review_human_annotations.parquet")

    genuine_ratings = gdf[gdf["authenticity_label"] == "VERIFIED_GENUINE"]["rating"].values
    suspicious_ratings = gdf[gdf["authenticity_label"] != "VERIFIED_GENUINE"]["rating"].values

    assert (genuine_ratings >= 3.0).all(), "Found genuine review with rating < 3.0"
    assert (suspicious_ratings <= 2.0).all(), "Found suspicious review with rating > 2.0"
    assert genuine_ratings.min() > suspicious_ratings.max(), "Ratings overlap between classes!"


def test_nlp_group_aware_product_isolation():
    """Verifies that review evaluations grouped by canonical_product_id do not leak same-product reviews."""
    gdf = pd.read_parquet(DATASET_DIR / "annotations" / "review_human_annotations.parquet")
    gdf["binary_label"] = (gdf["authenticity_label"] != "VERIFIED_GENUINE").astype(int)

    sgkf = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=42)
    for fold, (tr, te) in enumerate(sgkf.split(gdf, gdf["binary_label"], groups=gdf["canonical_product_id"])):
        tr_prods = set(gdf.iloc[tr]["canonical_product_id"])
        te_prods = set(gdf.iloc[te]["canonical_product_id"])
        assert len(tr_prods.intersection(te_prods)) == 0, f"Fold {fold} has leaking product IDs!"


def test_single_deceptive_sample_accounting():
    """Verifies that the single VERIFIED_DECEPTIVE sample in Gold reviews is explicitly accounted for."""
    gdf = pd.read_parquet(DATASET_DIR / "annotations" / "review_human_annotations.parquet")
    deceptive_mask = gdf["authenticity_label"] == "VERIFIED_DECEPTIVE"
    assert deceptive_mask.sum() == 1, f"Expected exactly 1 deceptive sample, found {deceptive_mask.sum()}"

    # Verify fold level results report deceptive sample presence
    fold_csv = PHASE1_DIR / "nlp_fold_level_results.csv"
    assert fold_csv.exists()
    f_df = pd.read_csv(fold_csv)
    assert "deceptive_sample_in_test" in f_df.columns
    # Exactly one fold per experiment config must contain the deceptive sample
    for cfg, grp in f_df.groupby("experiment_config"):
        assert grp["deceptive_sample_in_test"].sum() == 1, f"Config {cfg} deceptive sum != 1"


def test_phase1_final_verification_artifacts_exist():
    """Verifies all final pre-freeze verification artifacts exist and are valid."""
    required = [
        PHASE1_DIR / "residual_circularity_associations.csv",
        PHASE1_DIR / "residual_target_reconstruction.csv",
        PHASE1_DIR / "nlp_annotation_independence_audit.csv",
        PHASE1_DIR / "group_split_leakage_verification.csv",
        PHASE1_DIR / "inference_smoke_test_results.csv",
        PHASE1_DIR / "phase_1_final_verification_data.json",
    ]
    for p in required:
        assert p.exists(), f"Missing required verification artifact: {p}"
        assert p.stat().st_size > 0, f"Artifact is empty: {p}"


def test_residual_circularity_quantitative_bounds():
    """Verifies residual circularity demonstrates rule reconstruction by continuous features."""
    recon_csv = PHASE1_DIR / "residual_target_reconstruction.csv"
    assert recon_csv.exists()
    df = pd.read_csv(recon_csv)

    # High depth or unconstrained trees reconstruct synthetic target with high accuracy
    unconstrained = df[df["model"] == "DecisionTree_unconstrained"].iloc[0]
    assert unconstrained["accuracy"] > 0.95
    assert unconstrained["f1_score"] > 0.85
    assert unconstrained["roc_auc"] > 0.98

    # Depth 5 decision tree reconstructs with substantial proxy accuracy
    d5 = df[df["model"] == "DecisionTree_depth_5"].iloc[0]
    assert d5["roc_auc"] > 0.85


def test_group_split_zero_leakage_certified():
    """Verifies that all 5 folds have certified 0 leakage across all 5 grouping dimensions."""
    verif_csv = PHASE1_DIR / "group_split_leakage_verification.csv"
    assert verif_csv.exists()
    df = pd.read_csv(verif_csv)

    assert len(df) == 5, f"Expected 5 folds, found {len(df)}"
    assert (df["component_leakage_count"] == 0).all()
    assert (df["product_leakage_count"] == 0).all()
    assert (df["review_duplicate_cluster_leakage"] == 0).all()
    assert (df["image_sha256_leakage"] == 0).all()
    assert (df["image_dhash_leakage"] == 0).all()
    assert (df["resnet_high_sim_pair_leakage"] == 0).all()
    assert (df["leakage_safe_certified"] == True).all()


def test_clean_19_feature_schema_and_inference():
    """Verifies clean 19-feature schema ordering and real catalog inference compatibility."""
    from src.models.multimodal_learned_fusion import MultimodalFeatureExtractor, MultimodalLearnedFusion
    from src.trust_engine.api_service import TrustIntelligenceEngine

    assert len(MultimodalLearnedFusion.FEATURE_COLS_CLEAN) == 19
    extractor = MultimodalFeatureExtractor(DATASET_DIR)
    mat = extractor.extract_product_feature_matrix()

    for col in MultimodalLearnedFusion.FEATURE_COLS_CLEAN:
        assert col in mat.columns

    # Verify real catalog inference smoke test results
    smoke_csv = PHASE1_DIR / "inference_smoke_test_results.csv"
    assert smoke_csv.exists()
    s_df = pd.read_csv(smoke_csv)
    assert len(s_df) >= 3
    assert (s_df["status_code"] == 200).all()
    assert (s_df["zero_penalty_invariant_satisfied"] == True).all()
    assert (s_df["engine_latency_ms"] < 100.0).all()

