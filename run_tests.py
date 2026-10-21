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
    test_multi_category_coverage,
    test_referential_integrity,
)
from tests.test_pricing import (
    sample_pricing_data,
    test_pricing_analyzer_fit_and_normal,
    test_pricing_dumping_anomaly,
    test_pricing_missing_price,
)
from tests.test_risk_engine import (
    test_risk_engine_baseline_low_risk,
    test_risk_engine_compound_risk,
    test_risk_engine_handles_missing_signals_non_punitively,
)


def run_all_tests():
    tests = [
        ("test_category_normalization", test_category_normalization),
        ("test_canonical_product_initialization", test_canonical_product_initialization),
        ("test_canonical_review_initialization", test_canonical_review_initialization),
        ("test_canonical_image_initialization", test_canonical_image_initialization),
        ("test_canonical_datasets_exist", test_canonical_datasets_exist),
        ("test_multi_marketplace_coverage", test_multi_marketplace_coverage),
        ("test_multi_category_coverage", test_multi_category_coverage),
        ("test_referential_integrity", test_referential_integrity),
        ("test_pricing_analyzer_fit_and_normal", lambda: test_pricing_analyzer_fit_and_normal(sample_pricing_data())),
        ("test_pricing_dumping_anomaly", lambda: test_pricing_dumping_anomaly(sample_pricing_data())),
        ("test_pricing_missing_price", test_pricing_missing_price),
        ("test_risk_engine_baseline_low_risk", test_risk_engine_baseline_low_risk),
        ("test_risk_engine_compound_risk", test_risk_engine_compound_risk),
        ("test_risk_engine_handles_missing_signals_non_punitively", test_risk_engine_handles_missing_signals_non_punitively),
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
