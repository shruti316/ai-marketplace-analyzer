"""
generate_synthetic_benchmark.py
--------------------------------
Generates a controlled, reproducible synthetic stress-test benchmark suite
for testing individual risk scoring modules and end-to-end explainability.

IMPORTANT:
Every record is explicitly marked `is_synthetic = True` and stored separately in
`data/raw/benchmarks/synthetic_stress_test_cases.parquet`.
These records represent synthetic stress tests and are NEVER presented as real fraud observations.

Cases Generated:
- Case A: Normal Low-Risk Baseline (verified purchase, normal price, normal rating, matching OCR)
- Case B: Price Dumping Anomaly (extreme 85% price drop below category median, zero reviews)
- Case C: Review Collusion Ring (identical copy-paste reviews within 24 hours by unverified users)
- Case D: Information Deficit / Phantom Listing (missing price, no description, single 5-star review)
- Case E: Compound Multimodal Risk (anomalous price + repetitive reviews + packaging OCR mismatch)
"""

import os
import logging
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


def generate_synthetic_benchmark(output_dir: str = "data/raw/benchmarks") -> pd.DataFrame:
    os.makedirs(output_dir, exist_ok=True)
    logging.info("Generating controlled synthetic stress-test benchmark...")

    cases = [
        # Case A: Low-Risk Baseline
        {
            "case_id": "CASE_A_LOW_RISK_01",
            "is_synthetic": True,
            "test_category": "CONTROL_BASELINE",
            "parent_asin": "SYN_A_001",
            "title": "Natural Organic Hydrating Face Moisturizer Cream 50ml",
            "main_category": "All Beauty",
            "store": "PureBotanicals",
            "price": 18.50,
            "category_median_price": 16.95,
            "price_robust_zscore": 0.13,
            "average_rating": 4.3,
            "rating_number": 340,
            "review_count_observed": 25,
            "verified_purchase_ratio": 0.92,
            "review_text_similarity_max": 0.22,
            "ocr_text": "Pure Botanicals Organic Face Moisturizer 50ml",
            "ocr_packaging_match_score": 0.95,
            "expected_risk_tier": "LOW",
            "expected_confidence": 0.88,
            "target_failure_mode": "None (Should trigger 0 high-risk warning flags)",
            "benchmark_rationale": "Represents an established, legitimate listing with mature review history, stable price, and matching visual packaging.",
        },
        # Case B: Price Dumping Anomaly
        {
            "case_id": "CASE_B_PRICE_DUMP_01",
            "is_synthetic": True,
            "test_category": "PRICE_ANOMALY",
            "parent_asin": "SYN_B_001",
            "title": "Luxury Anti-Aging 24K Gold Caviar Face Serum 100ml",
            "main_category": "Premium Beauty",
            "store": "QuickDealsStore",
            "price": 2.99,
            "category_median_price": 30.00,
            "price_robust_zscore": -3.85,
            "average_rating": 5.0,
            "rating_number": 2,
            "review_count_observed": 1,
            "verified_purchase_ratio": 0.0,
            "review_text_similarity_max": 0.0,
            "ocr_text": "Golden Serum 100ml",
            "ocr_packaging_match_score": 0.60,
            "expected_risk_tier": "MEDIUM_HIGH",
            "expected_confidence": 0.65,
            "target_failure_mode": "Price Anomaly Engine (Catches 90% discount on luxury item from new storefront)",
            "benchmark_rationale": "Tests the price anomaly module's sensitivity to deep price cuts that diverge from category norms without sales volume.",
        },
        # Case C: Review Collusion Ring
        {
            "case_id": "CASE_C_REVIEW_BURST_01",
            "is_synthetic": True,
            "test_category": "REVIEW_COLLUSION",
            "parent_asin": "SYN_C_001",
            "title": "Professional Ionic Hair Dryer Fast Drying Lightweight",
            "main_category": "All Beauty",
            "store": "TrendHome",
            "price": 29.99,
            "category_median_price": 16.95,
            "price_robust_zscore": 1.09,
            "average_rating": 4.9,
            "rating_number": 28,
            "review_count_observed": 20,
            "verified_purchase_ratio": 0.15,
            "review_text_similarity_max": 0.94,
            "ocr_text": "Ionic Fast Dryer 1800W",
            "ocr_packaging_match_score": 0.85,
            "expected_risk_tier": "HIGH",
            "expected_confidence": 0.85,
            "target_failure_mode": "NLP Review Similarity & Burstiness (Catches repetitive reviews from unverified users)",
            "benchmark_rationale": "Tests NLP intra-product pairwise similarity and unverified review volume to spot incentivized review rings.",
        },
        # Case D: Information Deficit / Phantom Listing
        {
            "case_id": "CASE_D_INFO_DEFICIT_01",
            "is_synthetic": True,
            "test_category": "INFORMATION_DEFICIT",
            "parent_asin": "SYN_D_001",
            "title": "Beauty Item",
            "main_category": "All Beauty",
            "store": "Unknown",
            "price": None,
            "category_median_price": 16.95,
            "price_robust_zscore": None,
            "average_rating": 5.0,
            "rating_number": 1,
            "review_count_observed": 1,
            "verified_purchase_ratio": 0.0,
            "review_text_similarity_max": 0.0,
            "ocr_text": "",
            "ocr_packaging_match_score": 0.0,
            "expected_risk_tier": "EVALUATION_INCONCLUSIVE",
            "expected_confidence": 0.15,
            "target_failure_mode": "Confidence Calibration (Must report LOW CONFIDENCE rather than declaring high risk)",
            "benchmark_rationale": "Verifies that the risk engine does not produce high-confidence fraud claims when information is missing.",
        },
        # Case E: Compound Multimodal Risk
        {
            "case_id": "CASE_E_COMPOUND_RISK_01",
            "is_synthetic": True,
            "test_category": "COMPOUND_MULTIMODAL_RISK",
            "parent_asin": "SYN_E_001",
            "title": "Authentic Premium Dermatological Vitamin C Serum 30ml",
            "main_category": "Premium Beauty",
            "store": "BargainOutlet99",
            "price": 4.50,
            "category_median_price": 30.00,
            "price_robust_zscore": -3.62,
            "average_rating": 4.8,
            "rating_number": 15,
            "review_count_observed": 12,
            "verified_purchase_ratio": 0.08,
            "review_text_similarity_max": 0.89,
            "ocr_text": "Industrial Surface Bleach Disinfectant",
            "ocr_packaging_match_score": 0.05,
            "expected_risk_tier": "CRITICAL_RISK",
            "expected_confidence": 0.94,
            "target_failure_mode": "Multi-Signal Corroboration & Multimodal Conflict (Severe price drop + review copy-paste + image mismatch)",
            "benchmark_rationale": "Tests the multi-modal evidence aggregator when price, text, and computer vision all point toward severe listing manipulation.",
        },
    ]

    df_cases = pd.DataFrame(cases)
    out_parquet = os.path.join(output_dir, "synthetic_stress_test_cases.parquet")
    out_csv = os.path.join(output_dir, "synthetic_stress_test_cases.csv")

    df_cases.to_parquet(out_parquet, index=False)
    df_cases.to_csv(out_csv, index=False)

    logging.info("Saved %d synthetic stress-test cases to %s and %s", len(df_cases), out_parquet, out_csv)
    return df_cases


if __name__ == "__main__":
    generate_synthetic_benchmark()
