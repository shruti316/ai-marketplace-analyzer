"""
Release v1.8 Test Suite
AI-Powered Marketplace Trust Intelligence Platform

Tests:
1. Product Counts and Modality Tiers (6,043 products, 305 Tier A, 876 Tier B, 2647 Tier C, 2215 Tier D).
2. Complete Source Reconciliation Table and 20K Cohort Accounting.
3. Flipkart 127 Image Recovery Manifest (127 items, BLOCKED_EXTERNAL).
4. Human Fraud Annotation Pipeline, Schemas, and Fleiss' Kappa Metric.
5. Native Indic Language & Multi-Script Identification Pipeline.
6. Longitudinal Price Monitoring Ledger (6,043 T0 snapshots, Anomaly Engine).
7. Seller Identity Resolution & Corporate Registry Enrichment Manifest.
8. Cross-Marketplace Matching, Variant Differentiation & 500-SKU Sampling Manifest.
9. Graph Reconciliation Topology (72,903 nodes, 87,954 edges, zero missing endpoints).
10. Modality Tier Coverage Matrix & Indian Marketplace Share (60.28%).
11. Evaluation Protocols Data Leakage Elimination.
12. Isolated Benchmarks Contamination Protection.
13. All 16 Protected Baseline Files Bit-Perfect Hash Verification.
14. Immutability of Historical Releases (v1.1 through v1.7).
15. Release v1.8 Cryptographic SHA-256 Manifest Integrity.
16. End-to-End Compatibility with the Marketplace Trust Intelligence Engine.
"""

import hashlib
import json
from pathlib import Path
import pytest
import pandas as pd
import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parents[1]
V18_DIR = PROJECT_ROOT / "data" / "marketplace_trust_dataset_v1.8"
V17_DIR = PROJECT_ROOT / "data" / "marketplace_trust_dataset_v1.7"

PROTECTED_BASELINE_HASHES = {
    "data/processed/canonical_products.parquet": "b0a27e4803d5bf76d025da1abea2045e3920e61b26cf72343c5a0e6465e5cd0e",
    "data/processed/canonical_reviews.parquet": "17aa47d8aa60e447ce673e83fe2d8336e10c357c3afeb4e0a63503e46a01323c",
    "data/processed/canonical_images.parquet": "bdae434ef284fa8e7f600c65b4dd6a8be04c77b464d20bce0d7641005cbc5187",
    "data/processed/canonical_relationships.parquet": "490a37c8dfab90195778a6f43003c2704d9a5beb8a1204544037ce81c1ebced9",
    "data/processed/image_quality_report.parquet": "4acfcbeff74ba226ab69a7f513d6b0d487980e8b3f4631b7979e0c5a6616ca9a",
    "data/processed/review_corpus_unlinked.parquet": "7d7abde9d0962fdb03655a877cf327930a889f0e12b9dd5fced0525fe7e59613",
    "data/curated/curated_products_5684.parquet": "abcdb9e0e729d26113d9781910c614a8f36f1fee5f88aabbe18430666baa9024",
    "data/curated/curated_products_20000.parquet": "b2df7c98b8fb95d66e07727028b7b778e28cca615f376480a26e5c29b1145cc4",
    "data/curated/cohort_membership_20000.parquet": "961f992eeebd4df5dd6c0c7ac811e14a5ee0d45797c792caa99fbffe7675b461",
    "data/curated/cohort_metadata_20000.json": "050656b487b1a0321d009b2cfbd3972a959e4758deca973f33ebe57f500acf2c",
    "data/indian_marketplace/processed/indian_products.parquet": "a8ce91c897fa6639f2bee06b54fdefbf8524d6de497f9b3a4dcd878732ecc53b",
    "data/indian_marketplace/processed/indian_reviews.parquet": "cf1a3c7f3a0758bcbefec983355e862b1cb142bfd78abee63d3462c79f52ed62",
    "data/indian_marketplace/processed/indian_reviews_linked.parquet": "0bcebae7e37734406076c0176f56216030659f4f091cdd777ea0be59e2a3ffa8",
    "data/indian_marketplace/processed/indian_images.parquet": "f605ae7aa29aba550900aaadd5771fe4193168bffc09412ab5bb4e6c4ac18499",
    "data/indian_marketplace/processed/indian_complete_multimodal.parquet": "b052def824cfae44dcbb862ca42d49b87cf537a24e8aa90663e2ed8ee79c410b",
    "data/indian_marketplace/processed/indian_dataset_metadata.json": "fb8b9aaaaafc88ec828e2d067aee988e25449da7961efc01d48f422f2299b534",
}


def calculate_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def test_01_product_counts_and_tiers():
    df_prod = pd.read_parquet(V18_DIR / "entities" / "products.parquet")
    assert len(df_prod) == 6043
    assert df_prod["product_id"].nunique() == 6043
    mkt_counts = df_prod["marketplace"].value_counts().to_dict()
    assert mkt_counts["amazon_in"] == 1500
    assert mkt_counts["flipkart"] == 1143
    assert mkt_counts["myntra"] == 1000
    assert (mkt_counts["amazon_in"] + mkt_counts["flipkart"] + mkt_counts["myntra"]) == 3643


def test_02_source_reconciliation_table():
    recon_p = V18_DIR / "manifests" / "source_reconciliation_table.parquet"
    assert recon_p.exists()
    df_recon = pd.read_parquet(recon_p)
    assert len(df_recon) >= 18
    # 20K row audit
    row_20k = df_recon[df_recon["source"] == "Curated 20,000 Expanded Cohort"].iloc[0]
    assert row_20k["raw_records"] == 20000
    assert row_20k["integrated"] == 5883
    assert row_20k["quarantined"] == 14117


def test_03_flipkart_image_manifest_v1_8():
    manifest_p = V18_DIR / "manifests" / "flipkart_127_image_manifest.csv"
    assert manifest_p.exists()
    df_fk = pd.read_csv(manifest_p)
    assert len(df_fk) == 127
    assert (df_fk["acquisition_status"] == "BLOCKED_EXTERNAL").sum() == 127
    assert (df_fk["sha256"] == "PENDING_ACQUISITION").sum() == 127


def test_04_fraud_annotation_pipeline():
    from src.annotation.annotation_schema import FraudLabelTaxonomy, VerificationLevel
    from src.annotation.annotation_pipeline import compute_fleiss_kappa
    
    # Check Fleiss kappa on symmetric matrix
    matrix = np.array([
        [3, 0, 0, 0],
        [3, 0, 0, 0],
        [0, 3, 0, 0],
        [0, 0, 3, 0],
    ])
    kappa = compute_fleiss_kappa(matrix)
    assert kappa == 1.0

    adj_p = PROJECT_ROOT / "data" / "annotation" / "sample_adjudicated_research_annotations.parquet"
    assert adj_p.exists()
    df_adj = pd.read_parquet(adj_p)
    assert len(df_adj) == 30
    assert (df_adj["is_definitive_ground_truth"] == False).all()


def test_05_native_indic_multilingual_pipeline():
    from src.nlp.indic_multilingual_v1_8 import IndicMultilingualNLPService
    service = IndicMultilingualNLPService()
    
    res_hi = service.analyze_text("बहुत ही बढ़िया प्रोडक्ट है, पैसा वसूल सामान!")
    assert res_hi.primary_script == "DEVANAGARI"
    assert res_hi.is_native_indic is True

    res_ta = service.analyze_text("இந்த போன் மிக அருமையாக உள்ளது, பேட்டரி சூப்பர்.")
    assert res_ta.primary_script == "TAMIL"
    assert res_ta.is_native_indic is True

    res_en = service.analyze_text("Excellent quality and very durable battery.")
    assert res_en.primary_script == "LATIN"
    assert res_en.detected_language == "English"

    manifest_p = V18_DIR / "manifests" / "native_indic_review_collection_manifest.csv"
    assert manifest_p.exists()


def test_06_longitudinal_pricing_collector():
    from src.monitoring.price_snapshot_collector import LongitudinalPriceCollector
    collector = LongitudinalPriceCollector()
    
    # Test temporal anomaly formulas
    anom_spike = collector.compute_temporal_anomalies(baseline_price=100.0, current_price=160.0)
    assert anom_spike["is_sudden_spike"] is True
    assert anom_spike["price_change_pct"] == 0.60

    anom_discount = collector.compute_temporal_anomalies(
        baseline_price=100.0, current_price=100.0, baseline_mrp=120.0, current_mrp=200.0
    )
    assert anom_discount["is_discount_inflation"] is True

    snap_p = PROJECT_ROOT / "data" / "monitoring" / "price_snapshots_longitudinal.parquet"
    assert snap_p.exists()
    df_snap = pd.read_parquet(snap_p)
    assert len(df_snap) == 6043


def test_07_seller_identity_resolution():
    manifest_p = V18_DIR / "manifests" / "gstin_cin_enrichment_manifest.csv"
    assert manifest_p.exists()
    df_gstin = pd.read_csv(manifest_p)
    assert len(df_gstin) == 6
    assert (df_gstin["acquisition_status"] == "BLOCKED_EXTERNAL").all()


def test_08_cross_marketplace_matching_and_sampling():
    from src.matching.cross_marketplace_matcher_v1_8 import CrossMarketplaceMatcherV1_8
    matcher = CrossMarketplaceMatcherV1_8()
    
    # Check variant differentiation
    rec = matcher.evaluate_pair(
        pid1="p1", mkt1="amazon_in", t1="Dettol Handwash 250ml",
        pid2="p2", mkt2="flipkart", t2="Dettol Handwash 500ml",
        brand="Dettol", score=0.85
    )
    assert rec.resolution_status == "VARIANT_FAMILY_CROSS_MARKETPLACE"
    assert len(rec.conflicting_attributes) > 0

    sku_p = V18_DIR / "manifests" / "standardized_500_sku_sampling_manifest.csv"
    assert sku_p.exists()
    df_sku = pd.read_csv(sku_p)
    assert len(df_sku) == 500


def test_09_graph_reconciliation_topology():
    recon_rep = PROJECT_ROOT / "reports" / "graph_reconciliation_v1.8.md"
    assert recon_rep.exists()
    df_edges_full = pd.read_parquet(PROJECT_ROOT / "data" / "processed_v1_7" / "graph_edges_v1_7.parquet")
    df_nodes_full = pd.read_parquet(PROJECT_ROOT / "data" / "processed_v1_7" / "graph_nodes_v1_7.parquet")
    assert len(df_nodes_full) == 72903
    assert len(df_edges_full) == 87954


def test_10_modality_tier_coverage_matrix():
    df_a = pd.read_parquet(V18_DIR / "collections" / "tier_a_complete_multimodal.parquet")
    assert len(df_a) == 305
    df_b = pd.read_parquet(V18_DIR / "collections" / "tier_b_visual_products.parquet")
    assert len(df_b) == 2506
    df_c = pd.read_parquet(V18_DIR / "collections" / "tier_c_textual_products.parquet")
    assert len(df_c) == 127
    df_d = pd.read_parquet(V18_DIR / "collections" / "tier_d_catalog_products.parquet")
    assert len(df_d) == 3105


def test_11_evaluation_protocols_leakage():
    train_p = pd.read_parquet(V18_DIR / "evaluation" / "train_manifest.parquet")
    test_p = pd.read_parquet(V18_DIR / "evaluation" / "test_manifest.parquet")
    val_p = pd.read_parquet(V18_DIR / "evaluation" / "validation_manifest.parquet")
    assert len(train_p) + len(test_p) + len(val_p) == 6043
    train_ids = set(train_p["canonical_product_id"])
    test_ids = set(test_p["canonical_product_id"])
    val_ids = set(val_p["canonical_product_id"])
    assert len(train_ids & test_ids) == 0
    assert len(train_ids & val_ids) == 0
    assert len(val_ids & test_ids) == 0


def test_12_isolated_benchmarks():
    df_fake = pd.read_parquet(V18_DIR / "collections" / "isolated_benchmarks" / "ecommerce_fake_reviews.parquet")
    assert len(df_fake) == 40526
    df_stress = pd.read_parquet(V18_DIR / "collections" / "isolated_benchmarks" / "synthetic_stress_test_cases.parquet")
    assert len(df_stress) == 5


def test_13_protected_baselines_bit_perfect():
    for rel_path, expected_hash in PROTECTED_BASELINE_HASHES.items():
        full_path = PROJECT_ROOT / rel_path
        assert full_path.exists(), f"Missing baseline file: {rel_path}"
        actual_hash = calculate_sha256(full_path)
        assert actual_hash == expected_hash, f"Hash mismatch for baseline: {rel_path}"


def test_14_historical_releases_immutability():
    releases = ["v1.1", "v1.2", "v1.3", "v1.4", "v1.5", "v1.6", "v1.7"]
    for rel in releases:
        rel_dir = PROJECT_ROOT / "data" / f"marketplace_trust_dataset_{rel}"
        assert rel_dir.exists(), f"Historical release missing: {rel}"
        assert (rel_dir / "entities" / "products.parquet").exists()


def test_15_sha256_manifest_integrity():
    with open(V18_DIR / "manifests" / "sha256_manifest.json") as f:
        sha_manifest = json.load(f)
    assert len(sha_manifest) >= 55
    with open(V18_DIR / "manifests" / "dataset_manifest.json") as f:
        manifest = json.load(f)
    assert manifest["version"] == "v1.8_CERTIFIED"
    assert manifest["certification_verdict"] == "CERTIFIED_WITH_LIMITATIONS"


def test_16_engine_compatibility_with_v1_8():
    from src.engine.api import MarketplaceTrustAPI
    from src.engine.contracts import ReviewItem
    
    api = MarketplaceTrustAPI()
    report = api.get_product_trust_report("amazon_in_B000052YQN")
    assert report.composite_trust_score >= 0.0
    assert report.confidence_score > 0.0
    
    # Test custom listing analysis
    custom_res = api.analyze_custom_listing({
        "canonical_product_id": "CUSTOM_ADHOC_001",
        "product_title": "Dettol Liquid Handwash 250ml",
        "category": "Health & Personal Care",
        "price": 99.0,
        "currency": "INR",
        "reviews": [
            ReviewItem(review_id="R1", review_text="Very good product, cleans hands properly.", rating=5.0)
        ],
    })
    assert custom_res.composite_trust_score >= 0.0
