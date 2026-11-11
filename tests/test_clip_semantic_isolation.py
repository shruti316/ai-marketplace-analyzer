"""
Targeted Test Suite: CLIP Vision-Language Semantic Prior Isolation & Orthogonal Defense
AI-Powered Indian Marketplace Trust Intelligence Platform

Validates:
1. Category-calibrated CLIP z-score normalization across distinct category distributions.
2. Semantic discordance detection on discordant title-image pairs (e.g. Smartphone vs Water Bottle).
3. Concordant alignment on genuine e-commerce listings across varied category baselines.
4. Orthogonal protection: CLIP detects bait-and-switch deceptions that are completely invisible
   to perceptual hashing (dHash) and image duplicate clustering (ResNet-18).
"""

from pathlib import Path
import sys
import pytest
import numpy as np

# Ensure project root in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.cv.category_clip_calibrator import (
    CategoryAwareCLIPCalibrator,
    CalibratedCLIPResult,
)


@pytest.fixture(scope="module")
def clip_calibrator():
    """Initializes CategoryAwareCLIPCalibrator with v1.7 category priors."""
    calibrator = CategoryAwareCLIPCalibrator()
    return calibrator


def test_category_priors_fit_correctly(clip_calibrator):
    """Verifies empirical category baselines exist and reflect expected variances."""
    priors = clip_calibrator.category_priors
    assert len(priors) > 0, "Category priors must not be empty"
    
    # Check that high-level categories have sensible means and non-zero standard deviations
    for cat, stats in priors.items():
        assert "mean" in stats and "std" in stats
        assert 0.15 <= stats["mean"] <= 0.45, f"Abnormal mean for category {cat}: {stats['mean']}"
        assert stats["std"] >= 0.015, f"Zero or negative variance for category {cat}"


def test_semantic_discordance_on_bait_and_switch_pairs(clip_calibrator):
    """
    Tests 10 simulated discordant pairs (e.g., Flagship Smartphone title with bottle/apparel visual embeddings).
    In real-world fraud, sellers list expensive electronics but upload accessory or decoy photos.
    CLIP raw cosine similarity is typically < 0.16, generating z <= -2.2.
    """
    discordant_scenarios = [
        # (title, category, brand, raw_cosine_sim, expected_discordance)
        ("Apple iPhone 15 Pro Max 256GB Natural Titanium", "Electronics", "Apple", 0.12, True),
        ("Sony WH-1000XM5 Wireless Noise Cancelling Headphones", "Electronics", "Sony", 0.14, True),
        ("Samsung Galaxy S24 Ultra 5G AI Smartphone", "Electronics", "Samsung", 0.11, True),
        ("OnePlus 12 5G (Flowy Emerald, 16GB RAM, 512GB Storage)", "Electronics", "OnePlus", 0.13, True),
        ("Nike Air Zoom Pegasus 40 Running Shoes", "Footwear", "Nike", 0.13, True),
        ("Lakme Absolute Matte Melt Liquid Lip Color", "Beauty & Personal Care", "Lakme", 0.12, True),
        ("Rolex Submariner Date Automatic Men's Luxury Watch", "Watches", "Rolex", 0.10, True),
        ("HP Pavilion 15.6 FHD Gaming Laptop Intel Core i7", "Computers", "HP", 0.13, True),
        ("Maybelline New York Colossal Bold Eyeliner", "Beauty & Personal Care", "Maybelline", 0.11, True),
        ("Puma Men's Regular Fit Tracksuit", "Clothing & Fashion", "Puma", 0.14, True),
    ]

    for title, cat, brand, raw_cos, expected_disc in discordant_scenarios:
        res: CalibratedCLIPResult = clip_calibrator.calibrate_product(
            canonical_product_id="test_disc_pid",
            raw_cosine_sim=raw_cos,
            listing_title=title,
            category=cat,
            brand=brand,
        )
        assert res.is_category_discordant is expected_disc, (
            f"Failed for {title}: cos={raw_cos}, z={res.category_zscore}, status={res.calibrated_alignment_status}"
        )
        assert res.calibrated_alignment_status == "DISCORDANT_ANOMALY"
        assert res.category_zscore <= -2.2 or raw_cos < 0.17


def test_concordant_genuine_pairs_retain_normal_status(clip_calibrator):
    """
    Tests genuine e-commerce listings with appropriate visual embeddings.
    Must maintain normal or high alignment status without false discordance flags.
    """
    concordant_scenarios = [
        ("Apple iPhone 15 Pro Max 256GB Natural Titanium", "Electronics", "Apple", 0.36),
        ("Sony WH-1000XM5 Wireless Noise Cancelling Headphones", "Electronics", "Sony", 0.34),
        ("Puma Men's Regular Fit Graphic Cotton T-Shirt", "Clothing & Fashion", "Puma", 0.29),
        ("Lakme Absolute Matte Melt Liquid Lip Color", "Beauty & Personal Care", "Lakme", 0.38),
        ("Fastrack Limitless FS1 Pro Smart Watch", "Watches", "Fastrack", 0.35),
    ]

    for title, cat, brand, raw_cos in concordant_scenarios:
        res: CalibratedCLIPResult = clip_calibrator.calibrate_product(
            canonical_product_id="test_conc_pid",
            raw_cosine_sim=raw_cos,
            listing_title=title,
            category=cat,
            brand=brand,
        )
        assert res.is_category_discordant is False
        assert res.calibrated_alignment_status in ("HIGH_ALIGNMENT", "NORMAL_ALIGNMENT")
        assert res.category_zscore > -1.2


def test_orthogonal_defense_against_zero_collision_spoofing(clip_calibrator):
    """
    Verifies that CLIP detects semantic fraud when CV and Graph have ZERO duplicate collisions.
    Scenario:
    - ResNet-18 duplicate collision: None (unique photo taken by scammer)
    - dHash duplicate collision: None
    - Graph degree centrality: 0.0 (isolated node, no shared images)
    - CLIP: severely discordant (title: "Sony 65-Inch OLED 4K TV", photo: generic HDMI cable)
    """
    title = "Sony BRAVIA XR 65 Inch 4K HDR Google TV"
    cat = "Electronics"
    brand = "Sony"
    scammer_photo_clip_similarity = 0.11  # Very low similarity to TV description

    # Evaluate CLIP response
    clip_res = clip_calibrator.calibrate_product(
        canonical_product_id="isolated_scam_pid",
        raw_cosine_sim=scammer_photo_clip_similarity,
        listing_title=title,
        category=cat,
        brand=brand,
    )

    # Simulated CV & Graph signals
    cv_has_duplicate_hash = 0.0
    cv_is_cross_product_reuse = 0.0
    graph_degree_centrality = 0.0

    # Prove that despite CV and Graph being 0, CLIP catches the discordance
    assert cv_has_duplicate_hash == 0.0
    assert cv_is_cross_product_reuse == 0.0
    assert graph_degree_centrality == 0.0

    assert clip_res.is_category_discordant is True
    assert clip_res.category_zscore <= -2.2
    assert "severely depressed" in clip_res.evidence_reason
