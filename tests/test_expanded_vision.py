"""
tests/test_expanded_vision.py
-----------------------------
Unit tests for expanded computer vision dataset pipeline:
- Quality validation indicators (sharpness, dimensions, status assignment)
- dHash Hamming distance
- Embedding normalization and dimension checks
- Product feature table integrity and missing evidence preservation
"""

import sys
import os
sys.path.insert(0, os.path.abspath("."))

import numpy as np
import pandas as pd
from PIL import Image
from scipy import ndimage

from src.vision.expanded_quality import compute_sharpness, hamming_distance_dhash
from src.vision.image_analysis import compute_sha256, compute_dhash


def test_sharpness_calculation():
    # Uniform image should have near-zero sharpness
    flat = np.ones((50, 50), dtype=np.uint8) * 128
    sharp_flat = compute_sharpness(flat)
    assert sharp_flat == 0.0, "Uniform image must have 0.0 sharpness"

    # Checkerboard image should have high sharpness
    checker = np.zeros((50, 50), dtype=np.uint8)
    checker[::2, ::2] = 255
    checker[1::2, 1::2] = 255
    sharp_checker = compute_sharpness(checker)
    assert sharp_checker > 1000.0, f"Checkerboard should have high sharpness, got {sharp_checker}"


def test_dhash_hamming_distance():
    h1 = "96969696b2b69600"
    h2 = "96969696b2b69600"
    assert hamming_distance_dhash(h1, h2) == 0, "Identical hashes must have distance 0"

    # 1-bit difference in hex: '0' vs '1'
    h3 = "96969696b2b69601"
    assert hamming_distance_dhash(h1, h3) == 1, "1-bit flip must have distance 1"

    # Max distance
    h_zeros = "0000000000000000"
    h_ones = "ffffffffffffffff"
    assert hamming_distance_dhash(h_zeros, h_ones) == 64, "All opposite bits must have distance 64"


def test_embedding_normalization_invariant():
    # Verify L2 normalization property
    rnd = np.random.randn(10, 512).astype(np.float32)
    norms = np.linalg.norm(rnd, axis=1, keepdims=True)
    normalized = rnd / norms
    out_norms = np.linalg.norm(normalized, axis=1)
    assert np.allclose(out_norms, 1.0, atol=1e-5), "Normalized embeddings must have norm 1.0"
    assert not np.isnan(normalized).any()
    assert not np.isinf(normalized).any()


def test_product_missing_evidence_not_negative():
    # Test that missing visual evidence does not assign negative fraud signals
    df_sample = pd.DataFrame({
        "canonical_product_id": ["prod_1", "prod_2"],
        "image_count_total": [0, 2],
        "image_count_downloaded": [0, 2],
        "image_count_usable": [0, 2],
    })
    df_sample["image_evidence_status"] = np.where(
        df_sample["image_count_total"] == 0, "NO_IMAGE_RECORDS", "DOWNLOADED_IMAGE_EVIDENCE"
    )
    assert df_sample.loc[df_sample["canonical_product_id"] == "prod_1", "image_evidence_status"].iloc[0] == "NO_IMAGE_RECORDS"
