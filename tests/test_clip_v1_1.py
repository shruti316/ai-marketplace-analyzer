"""
Unit Tests for Category-Aware CLIP Calibration (V1.1)
AI-Powered Indian Marketplace Trust Intelligence Platform
"""

import pytest
from src.cv.category_clip_calibrator import CategoryAwareCLIPCalibrator, CalibratedCLIPResult


@pytest.fixture
def clip_calibrator():
    return CategoryAwareCLIPCalibrator()


def test_category_aware_priors_loaded(clip_calibrator):
    """Verifies category priors are fitted with realistic means and std devs."""
    priors = clip_calibrator.category_priors
    assert len(priors) > 0
    # Beauty & Personal Care should have higher baseline than Clothing & Fashion
    if "Beauty & Personal Care" in priors and "Clothing & Fashion" in priors:
        assert priors["Beauty & Personal Care"]["mean"] > priors["Clothing & Fashion"]["mean"]


def test_category_relative_discordance(clip_calibrator):
    """Verifies that an identical score can be normal in one category but discordant in another."""
    # In Clothing & Fashion (mean ~0.297, std ~0.027), 0.25 is ~ -1.7 std (borderline, not severe anomaly)
    clothing_res = clip_calibrator.calibrate_product(
        canonical_product_id="test_cloth",
        raw_cosine_sim=0.25,
        listing_title="Men Cotton Casual T-Shirt",
        category="Clothing & Fashion",
    )
    assert clothing_res.is_category_discordant is False
    assert clothing_res.calibrated_alignment_status in ("BORDERLINE_LOW_ALIGNMENT", "NORMAL_ALIGNMENT")

    # In Beauty & Personal Care (mean ~0.329, std ~0.045), 0.22 is ~ -2.41 std (severe anomaly)
    beauty_res = clip_calibrator.calibrate_product(
        canonical_product_id="test_cream",
        raw_cosine_sim=0.22,
        listing_title="Luxury Anti-Aging Skin Firming Face Cream 50g",
        category="Beauty & Personal Care",
    )
    assert beauty_res.is_category_discordant is True
    assert beauty_res.calibrated_alignment_status == "DISCORDANT_ANOMALY"


def test_extreme_mismatch_detection(clip_calibrator):
    """Verifies extreme cross-category mismatch (cos < 0.17) is always flagged discordant."""
    extreme_res = clip_calibrator.calibrate_product(
        canonical_product_id="test_extreme",
        raw_cosine_sim=0.12,
        listing_title="Wireless Noise Cancelling Bluetooth Headphones",
        category="Electronics",
    )
    assert extreme_res.is_category_discordant is True
    assert extreme_res.category_zscore < -2.5
    assert extreme_res.confidence >= 0.90


def test_brand_concordance_scoring(clip_calibrator):
    """Verifies brand omission or presence affects brand concordance score."""
    with_brand = clip_calibrator.calibrate_product(
        canonical_product_id="test_brand_1",
        raw_cosine_sim=0.33,
        listing_title="Samsung Galaxy S23 Ultra 5G Green",
        category="Electronics",
        brand="Samsung",
    )
    assert with_brand.brand_concordance_score == 1.0

    without_brand = clip_calibrator.calibrate_product(
        canonical_product_id="test_brand_2",
        raw_cosine_sim=0.33,
        listing_title="Universal Smartphone Case Black",
        category="Electronics",
        brand="Samsung",
    )
    assert without_brand.brand_concordance_score == 0.5


def test_v1_1_clip_derived_evidence_artifact_isolation(clip_calibrator):
    """Verifies that V1.1 evidence file exists independently without modifying V1.0."""
    from pathlib import Path
    import pandas as pd

    v1_0_path = clip_calibrator.dataset_dir / "derived_evidence" / "image_text_consistency.parquet"
    v1_1_path = clip_calibrator.dataset_dir / "derived_evidence" / "image_text_consistency_v1_1.parquet"

    assert v1_0_path.exists(), "V1.0 frozen artifact must remain intact!"
    assert v1_1_path.exists(), "V1.1 separate artifact must exist!"

    df_1_0 = pd.read_parquet(v1_0_path)
    df_1_1 = pd.read_parquet(v1_1_path)

    assert len(df_1_0) == len(df_1_1) == 2432
    assert "category_zscore" in df_1_1.columns
    assert "category_zscore" not in df_1_0.columns, "V1.0 artifact must not be modified!"
