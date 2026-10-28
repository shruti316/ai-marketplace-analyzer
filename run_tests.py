"""
run_tests.py
------------
Deterministic test runner for AI-Powered Marketplace Trust Intelligence Platform.
Executes all unit and integration tests using Python's standard library.
"""

import sys
import os
import traceback

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath("."))

from tests.test_schema import (
    test_category_normalization,
    test_canonical_product_initialization,
    test_canonical_review_initialization,
    test_canonical_image_initialization,
)
from tests.test_pipeline import (
    test_canonical_datasets_exist,
    test_multi_marketplace_coverage,
    test_indian_marketplace_and_currency_provenance,
    test_multi_category_coverage,
    test_referential_integrity,
)
from tests.test_pricing import (
    sample_pricing_data,
    test_pricing_analyzer_fit_and_normal,
    test_pricing_dumping_anomaly,
    test_pricing_missing_price,
    test_pricing_multi_currency_stratification,
)

from tests.test_risk_engine import (
    test_risk_engine_baseline_low_risk,
    test_risk_engine_compound_risk,
    test_risk_engine_handles_missing_signals_non_punitively,
    test_low_customer_rating_does_not_increase_fraud_risk,
    test_confidence_score_is_documented_as_evidence_availability,
)
from tests.test_relationships import (
    test_canonical_relationship_dataclass,
    test_relationship_table_integrity,
)
from tests.test_matching import (
    test_jaccard_token_similarity,
    test_exact_model_match,
    test_conflicting_attributes_rejection,
    test_model_extraction_preserves_asin_quarantine,
)

from tests.test_vision import (
    test_dhash_determinism,
    test_packaging_consistency_exact,
    test_packaging_consistency_neutral_on_empty,
    test_packaging_consistency_normalizes_punctuation,
    test_packaging_consistency_neutral_when_no_usable_tokens,
    test_packaging_consistency_is_case_insensitive,
)

from tests.test_nlp import (
    test_sentiment_compound_polarity,
    test_polar_discordance_logic,
    test_product_review_analyzer_zero_reviews,
    test_product_review_analyzer_single_review,
    test_product_review_analyzer_multi_review_similarity,
    test_product_review_analyzer_missing_empty_text,
)


def run_all_tests():
    tests = [
        ("test_category_normalization", test_category_normalization),
        ("test_canonical_product_initialization", test_canonical_product_initialization),
        ("test_canonical_review_initialization", test_canonical_review_initialization),
        ("test_canonical_image_initialization", test_canonical_image_initialization),
        ("test_canonical_datasets_exist", test_canonical_datasets_exist),
        ("test_multi_marketplace_coverage", test_multi_marketplace_coverage),
        ("test_indian_marketplace_and_currency_provenance", test_indian_marketplace_and_currency_provenance),
        ("test_multi_category_coverage", test_multi_category_coverage),
        ("test_referential_integrity", test_referential_integrity),
        ("test_pricing_analyzer_fit_and_normal", lambda: test_pricing_analyzer_fit_and_normal(sample_pricing_data())),
        ("test_pricing_dumping_anomaly", lambda: test_pricing_dumping_anomaly(sample_pricing_data())),
        ("test_pricing_missing_price", test_pricing_missing_price),
        ("test_pricing_multi_currency_stratification", test_pricing_multi_currency_stratification),
        ("test_risk_engine_baseline_low_risk", test_risk_engine_baseline_low_risk),
        ("test_risk_engine_compound_risk", test_risk_engine_compound_risk),
        ("test_risk_engine_handles_missing_signals_non_punitively", test_risk_engine_handles_missing_signals_non_punitively),
        ("test_canonical_relationship_dataclass", test_canonical_relationship_dataclass),
        ("test_relationship_table_integrity", test_relationship_table_integrity),
        ("test_jaccard_token_similarity", test_jaccard_token_similarity),
        ("test_exact_model_match", test_exact_model_match),
        ("test_conflicting_attributes_rejection", test_conflicting_attributes_rejection),
        ("test_model_extraction_preserves_asin_quarantine", test_model_extraction_preserves_asin_quarantine),
        ("test_dhash_determinism", test_dhash_determinism),
        ("test_packaging_consistency_exact", test_packaging_consistency_exact),
        ("test_packaging_consistency_neutral_on_empty", test_packaging_consistency_neutral_on_empty),
        ("test_sentiment_compound_polarity", test_sentiment_compound_polarity),
        ("test_polar_discordance_logic", test_polar_discordance_logic),
        ("test_product_review_analyzer_zero_reviews", test_product_review_analyzer_zero_reviews),
        ("test_product_review_analyzer_single_review", test_product_review_analyzer_single_review),
        ("test_product_review_analyzer_multi_review_similarity", test_product_review_analyzer_multi_review_similarity),
        ("test_product_review_analyzer_missing_empty_text", test_product_review_analyzer_missing_empty_text),
        ("test_low_customer_rating_does_not_increase_fraud_risk", test_low_customer_rating_does_not_increase_fraud_risk),
        ("test_confidence_score_is_documented_as_evidence_availability", test_confidence_score_is_documented_as_evidence_availability),
        ("test_packaging_consistency_normalizes_punctuation", test_packaging_consistency_normalizes_punctuation),
        ("test_packaging_consistency_neutral_when_no_usable_tokens", test_packaging_consistency_neutral_when_no_usable_tokens),
        ("test_packaging_consistency_is_case_insensitive", test_packaging_consistency_is_case_insensitive),
    ]

    print("==================================================")
    print("AI-Powered Marketplace Platform Test Suite")
    print("==================================================")
    passed = 0
    failed = 0

    for name, test_fn in tests:
        try:
            test_fn()
            print(f"[PASS] {name}")
            passed += 1
        except Exception as e:
            print(f"[FAIL] {name}: {e}")
            traceback.print_exc()
            failed += 1

    print("==================================================")
    print(f"Total Tests: {len(tests)} | Passed: {passed} | Failed: {failed}")
    print("==================================================")
    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    run_all_tests()
