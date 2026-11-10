"""Targeted Automated Tests for Milestone 2: Leakage-Safe Data Preparation.

Verifies zero data leakage across product IDs, variant hierarchies,
review text duplicate clusters, exact image hashes, perceptual image hashes,
and high visual similarity pairs across Train, Validation, and Test splits.
"""

from pathlib import Path
import sys

import pandas as pd
import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

DATASET_DIR = PROJECT_ROOT / "data" / "indian_marketplace_trust_dataset_v1_7"


@pytest.fixture(scope="module")
def benchmark_splits():
    train_df = pd.read_parquet(DATASET_DIR / "benchmarks" / "train_split.parquet")
    val_df = pd.read_parquet(DATASET_DIR / "benchmarks" / "validation_split.parquet")
    test_df = pd.read_parquet(DATASET_DIR / "benchmarks" / "test_split.parquet")
    return train_df, val_df, test_df


@pytest.fixture(scope="module")
def product_sets(benchmark_splits):
    train_df, val_df, test_df = benchmark_splits
    return (
        set(train_df["canonical_product_id"]),
        set(val_df["canonical_product_id"]),
        set(test_df["canonical_product_id"]),
    )


def test_product_split_completeness_and_disjointness(product_sets):
    """Verifies all 3,643 products are present and splits are completely disjoint."""
    train_pids, val_pids, test_pids = product_sets
    total_assigned = len(train_pids) + len(val_pids) + len(test_pids)

    assert total_assigned == 3643, f"Expected 3643 products, got {total_assigned}"
    assert len(train_pids & val_pids) == 0, "Product ID leakage detected between Train and Val"
    assert len(train_pids & test_pids) == 0, "Product ID leakage detected between Train and Test"
    assert len(val_pids & test_pids) == 0, "Product ID leakage detected between Val and Test"


def test_split_proportions(product_sets):
    """Verifies train/val/test splits adhere closely to 70/15/15 target ratios."""
    train_pids, val_pids, test_pids = product_sets
    total = 3643

    assert 0.68 <= len(train_pids) / total <= 0.72
    assert 0.14 <= len(val_pids) / total <= 0.16
    assert 0.14 <= len(test_pids) / total <= 0.16


def test_zero_variant_hierarchy_leakage(product_sets):
    """Verifies no parent product and its child variants cross split boundaries."""
    train_pids, val_pids, test_pids = product_sets
    var_df = pd.read_parquet(DATASET_DIR / "entities" / "variants.parquet")

    for _, r in var_df.iterrows():
        parent_id = r.get("parent_product_id")
        child_id = r.get("canonical_product_id")
        if not parent_id or not child_id or parent_id == child_id:
            continue

        parent_split = "train" if parent_id in train_pids else ("val" if parent_id in val_pids else "test")
        child_split = "train" if child_id in train_pids else ("val" if child_id in val_pids else "test")

        if parent_id in (train_pids | val_pids | test_pids) and child_id in (train_pids | val_pids | test_pids):
            assert (
                parent_split == child_split
            ), f"Variant leakage: parent {parent_id} ({parent_split}) != child {child_id} ({child_split})"


def test_zero_review_duplicate_cluster_leakage(product_sets):
    """Verifies identical review text clusters never cross split boundaries."""
    train_pids, val_pids, test_pids = product_sets
    rev_nlp = pd.read_parquet(DATASET_DIR / "derived_evidence" / "review_nlp_features.parquet")
    valid_dups = rev_nlp[rev_nlp["duplicate_cluster_id"].notna()]

    train_c = set(valid_dups[valid_dups["canonical_product_id"].isin(train_pids)]["duplicate_cluster_id"])
    val_c = set(valid_dups[valid_dups["canonical_product_id"].isin(val_pids)]["duplicate_cluster_id"])
    test_c = set(valid_dups[valid_dups["canonical_product_id"].isin(test_pids)]["duplicate_cluster_id"])

    assert len(train_c & val_c) == 0, f"Review duplicate cluster leakage between Train & Val: {train_c & val_c}"
    assert len(train_c & test_c) == 0, f"Review duplicate cluster leakage between Train & Test: {train_c & test_c}"
    assert len(val_c & test_c) == 0, f"Review duplicate cluster leakage between Val & Test: {val_c & test_c}"


def test_zero_image_sha256_leakage(product_sets):
    """Verifies exact duplicate images (by SHA-256) never cross split boundaries."""
    train_pids, val_pids, test_pids = product_sets
    images_df = pd.read_parquet(DATASET_DIR / "evidence" / "images.parquet")
    valid_imgs = images_df[images_df["sha256"].notna()]

    train_h = set(valid_imgs[valid_imgs["canonical_product_id"].isin(train_pids)]["sha256"])
    val_h = set(valid_imgs[valid_imgs["canonical_product_id"].isin(val_pids)]["sha256"])
    test_h = set(valid_imgs[valid_imgs["canonical_product_id"].isin(test_pids)]["sha256"])

    assert len(train_h & val_h) == 0, f"Image SHA256 leakage between Train & Val: {len(train_h & val_h)}"
    assert len(train_h & test_h) == 0, f"Image SHA256 leakage between Train & Test: {len(train_h & test_h)}"
    assert len(val_h & test_h) == 0, f"Image SHA256 leakage between Val & Test: {len(val_h & test_h)}"


def test_zero_image_dhash_leakage(product_sets):
    """Verifies perceptual duplicate images (by dHash) never cross split boundaries."""
    train_pids, val_pids, test_pids = product_sets
    images_df = pd.read_parquet(DATASET_DIR / "evidence" / "images.parquet")
    valid_imgs = images_df[images_df["perceptual_hash_dhash"].notna()]

    train_dh = set(valid_imgs[valid_imgs["canonical_product_id"].isin(train_pids)]["perceptual_hash_dhash"])
    val_dh = set(valid_imgs[valid_imgs["canonical_product_id"].isin(val_pids)]["perceptual_hash_dhash"])
    test_dh = set(valid_imgs[valid_imgs["canonical_product_id"].isin(test_pids)]["perceptual_hash_dhash"])

    assert len(train_dh & val_dh) == 0, f"Image dHash leakage between Train & Val: {len(train_dh & val_dh)}"
    assert len(train_dh & test_dh) == 0, f"Image dHash leakage between Train & Test: {len(train_dh & test_dh)}"
    assert len(val_dh & test_dh) == 0, f"Image dHash leakage between Val & Test: {len(val_dh & test_dh)}"


def test_zero_high_similarity_visual_pair_leakage(product_sets):
    """Verifies image pairs with cosine similarity >= 0.95 never cross split boundaries."""
    train_pids, val_pids, test_pids = product_sets
    sim_df = pd.read_parquet(DATASET_DIR / "derived_evidence" / "image_similarity_pairs.parquet")
    high_sim = sim_df[sim_df["similarity_score"] >= 0.95]

    leakage_count = 0
    for _, r in high_sim.iterrows():
        p1 = r.get("canonical_product_id_1")
        p2 = r.get("canonical_product_id_2")
        if not p1 or not p2 or p1 == p2:
            continue

        split1 = "train" if p1 in train_pids else ("val" if p1 in val_pids else "test")
        split2 = "train" if p2 in train_pids else ("val" if p2 in val_pids else "test")
        if split1 != split2:
            leakage_count += 1

    assert leakage_count == 0, f"Cross-split high-similarity image pairs: {leakage_count}"
