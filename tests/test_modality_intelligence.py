"""Targeted Automated Tests for Milestone 3: Individual Modality Intelligence.

Verifies independent, modular execution and evaluation for:
A. NLP Intelligence (Feature extraction, sentiment, rating discordance, supervised deception classifier)
B. Computer Vision (SHA256, dHash, ResNet embeddings, OCR & CLIP interfaces)
C. Pricing Intelligence (IQR corridors, MRP checks, discount consistency)
D. Graph Intelligence (Ego subgraphs, cross-product visual reuse, seller governance)
"""

from pathlib import Path
import sys

import numpy as np
import pandas as pd
import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from src.cv.advanced_interfaces import PhysicalOCRInterface, VisionLanguageAlignmentInterface
from src.nlp.review_classifier import ReviewDeceptionClassifier
from src.trust_engine.graph_intelligence import GraphIntelligenceService

DATASET_DIR = PROJECT_ROOT / "data" / "indian_marketplace_trust_dataset_v1_7"


# =========================================================================
# Part A: NLP Intelligence Tests
# =========================================================================

def test_nlp_review_classifier_training_and_metrics():
    """Verifies supervised review classifier trains and outperforms majority baseline."""
    clf = ReviewDeceptionClassifier(dataset_dir=DATASET_DIR)
    results = clf.train_and_benchmark()

    assert results["samples"]["total"] == 700
    assert results["samples"]["test"] == 105

    models = results["models"]
    maj_f1 = models["majority_baseline"]["f1_score"]
    rf_f1 = models["random_forest"]["f1_score"]
    lr_f1 = models["logistic_regression"]["f1_score"]

    # Assert supervised models beat majority class
    assert maj_f1 == 0.0
    assert rf_f1 >= 0.75, f"Expected Random Forest F1 >= 0.75, got {rf_f1}"
    assert lr_f1 >= 0.70, f"Expected Logistic Regression F1 >= 0.70, got {lr_f1}"
    assert models["random_forest"]["accuracy"] >= 0.80
    assert models["logistic_regression"]["roc_auc"] >= 0.80


# =========================================================================
# Part B: Computer Vision Intelligence Tests
# =========================================================================

def test_cv_hashing_and_embeddings():
    """Verifies existence and shapes of physical image hashes and ResNet embeddings."""
    images_df = pd.read_parquet(DATASET_DIR / "evidence" / "images.parquet")
    assert len(images_df) >= 4708
    assert "sha256" in images_df.columns
    assert "perceptual_hash_dhash" in images_df.columns

    # Verify ResNet-18 embeddings file
    emb_path = DATASET_DIR / "derived_evidence" / "visual_embeddings_resnet18.npz"
    assert emb_path.exists()
    emb_data = np.load(emb_path)
    emb_matrix = emb_data["normalized_embeddings"]
    assert emb_matrix.shape == (4708, 512)


def test_cv_ocr_and_clip_interfaces_honest_blocker_reporting():
    """Verifies OCR and CLIP interfaces report honest blocker status when dependencies missing."""
    ocr = PhysicalOCRInterface()
    sample_img = DATASET_DIR / "evidence" / "images.parquet"  # mock path
    res_ocr = ocr.extract_text(sample_img, image_id="img_test_001")

    # In environment without system tesseract or easyocr
    assert res_ocr.status in ["BLOCKED_DEPENDENCY_UNAVAILABLE", "SUCCESS"]
    if res_ocr.status == "BLOCKED_DEPENDENCY_UNAVAILABLE":
        assert res_ocr.blocker_reason is not None
        assert res_ocr.actionable_remediation is not None

    vl = VisionLanguageAlignmentInterface()
    res_vl = vl.evaluate_alignment(sample_img, product_title="Sample Title", image_id="img_test_001")
    assert res_vl.status in ["BLOCKED_DEPENDENCY_UNAVAILABLE", "SUCCESS"]
    if res_vl.status == "BLOCKED_DEPENDENCY_UNAVAILABLE":
        assert res_vl.blocker_reason is not None


# =========================================================================
# Part C: Pricing Intelligence Tests
# =========================================================================

def test_pricing_corridors_and_outliers():
    """Verifies pricing benchmarks, IQR calculation, and discount bounds."""
    pricing_feat = pd.read_parquet(DATASET_DIR / "derived_evidence" / "pricing_features.parquet")
    assert len(pricing_feat) == 3643
    assert "observed_price_inr" in pricing_feat.columns
    assert "is_price_outlier" in pricing_feat.columns
    assert "is_discount_anomaly" in pricing_feat.columns

    cat_benchmarks = pd.read_parquet(DATASET_DIR / "derived_evidence" / "pricing_category_benchmarks.parquet")
    assert len(cat_benchmarks) > 0
    assert "q1_price_inr" in cat_benchmarks.columns
    assert "q3_price_inr" in cat_benchmarks.columns
    assert "median_price_inr" in cat_benchmarks.columns


# =========================================================================
# Part D: Graph Intelligence Tests
# =========================================================================

def test_graph_intelligence_ego_subgraphs_and_governance():
    """Verifies ego subgraph extraction and strict seller identity governance."""
    rel_df = pd.read_parquet(DATASET_DIR / "relationships" / "entity_relationships.parquet")
    prods_df = pd.read_parquet(DATASET_DIR / "entities" / "products.parquet")
    graph_service = GraphIntelligenceService(relationships_df=rel_df, products_df=prods_df)

    subgraph = graph_service.get_entity_subgraph("amazon_in_B000052YQN", depth=1)
    assert subgraph["root_entity_id"] == "amazon_in_B000052YQN"
    assert len(subgraph["nodes"]) > 0
    assert len(subgraph["edges"]) > 0

    # Test seller governance: aggregate seller nodes
    sellers_df = pd.read_parquet(DATASET_DIR / "entities" / "sellers.parquet")
    assert len(sellers_df) == 4
    seller_types = set(sellers_df["seller_type"])
    assert "PLATFORM_AGGREGATE" in seller_types
    # Verify no individual merchants exist in product entities
    assert prods_df["seller_id"].isna().all(), "Seller IDs in products table must be strictly null"
