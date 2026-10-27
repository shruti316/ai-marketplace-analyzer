"""
tests/test_matching.py
----------------------
Unit tests for cross-marketplace product entity matching.
"""
import pandas as pd

from src.features.matching import (
    CrossMarketplaceMatcher,
    ProductMatchResult,
    build_cross_marketplace_matches,
    calculate_jaccard,
    normalize_title_tokens,
)


def test_jaccard_token_similarity():
    t1 = normalize_title_tokens("Sony WH-1000XM4 Wireless Noise-Canceling Overhead Headphones Black")
    t2 = normalize_title_tokens("Sony WH-1000XM4 Wireless Headphones - Black")
    j = calculate_jaccard(t1, t2)
    assert j > 0.60, f"Expected high Jaccard similarity, got {j}"


def test_exact_model_match():
    matcher = CrossMarketplaceMatcher()
    p1 = {
        "canonical_product_id": "walmart_101",
        "marketplace": "walmart",
        "title": "Sony WH-1000XM4 Headphones",
        "brand": "Sony",
        "modelno": "WH-1000XM4",
    }
    p2 = {
        "canonical_product_id": "amazon_B0863TXGM3",
        "marketplace": "amazon",
        "title": "Sony WH-1000XM4 Wireless Noise-Canceling Overhead Headphones",
        "brand": "Sony",
        "modelno": "WH-1000XM4",
    }
    res = matcher.evaluate_pair(p1, p2)
    assert res.match_decision == "MATCHED"
    assert res.match_method == "EXACT_MODEL_MATCH"
    assert res.confidence_score >= 0.90


def test_conflicting_attributes_rejection():
    matcher = CrossMarketplaceMatcher()
    p1 = {
        "canonical_product_id": "walmart_102",
        "marketplace": "walmart",
        "title": "Apple iPhone 13 128GB Midnight",
        "brand": "Apple",
        "modelno": "MLNC3LL/A",
    }
    p2 = {
        "canonical_product_id": "amazon_B09G9FPGMB",
        "marketplace": "amazon",
        "title": "Samsung Galaxy S22 128GB Phantom Black",
        "brand": "Samsung",
        "modelno": "SM-S901U",
    }
    res = matcher.evaluate_pair(p1, p2)
    assert res.match_decision == "REJECTED"
    assert res.confidence_score < 0.50


def test_empty_results_have_stable_schema():
    """Empty results should retain all expected result columns."""
    from dataclasses import fields

    expected_columns = [field.name for field in fields(ProductMatchResult)]
    results = pd.DataFrame(columns=expected_columns)

    assert results.empty
    assert list(results.columns) == expected_columns


def test_builder_does_not_create_fabricated_match(tmp_path):
    """No qualifying real pairs must not produce a fabricated Sony match."""
    walmart_path = tmp_path / "walmart.csv"
    amazon_path = tmp_path / "amazon.parquet"
    output_path = tmp_path / "nested" / "matches.parquet"

    pd.DataFrame([
        {
            "id": 1,
            "title": "Garden shovel",
            "brand": "GardenCo",
            "modelno": "SHOVEL-1",
        }
    ]).to_csv(walmart_path, index=False)

    pd.DataFrame([
        {
            "canonical_product_id": "amazon_1",
            "marketplace": "amazon",
            "title": "Ceramic kitchen mug",
            "brand": "KitchenCo",
            "parent_product_id": "MUG-1",
        }
    ]).to_parquet(amazon_path, index=False)

    results = build_cross_marketplace_matches(
        walmart_csv_path=str(walmart_path),
        amazon_prods_path=str(amazon_path),
        output_path=str(output_path),
        sample_size=10,
    )

    assert results.empty
    assert "match_id" in results.columns
    assert output_path.exists()
    assert not results.astype(str).apply(
        lambda col: col.str.contains("Sony", case=False, regex=False)
    ).any().any()


def test_builder_empty_input_preserves_result_columns(tmp_path):
    """Empty inputs should save a schema-stable Parquet file."""
    walmart_path = tmp_path / "walmart.csv"
    amazon_path = tmp_path / "amazon.parquet"
    output_path = tmp_path / "matches.parquet"

    pd.DataFrame(
        columns=["id", "title", "brand", "modelno"]
    ).to_csv(walmart_path, index=False)

    pd.DataFrame(
        columns=[
            "canonical_product_id",
            "marketplace",
            "title",
            "brand",
            "parent_product_id",
        ]
    ).to_parquet(amazon_path, index=False)

    results = build_cross_marketplace_matches(
        walmart_csv_path=str(walmart_path),
        amazon_prods_path=str(amazon_path),
        output_path=str(output_path),
        sample_size=10,
    )

    expected_columns = [
        "match_id",
        "product_id_1",
        "marketplace_1",
        "title_1",
        "brand_1",
        "model_1",
        "product_id_2",
        "marketplace_2",
        "title_2",
        "brand_2",
        "model_2",
        "match_method",
        "confidence_score",
        "token_jaccard_similarity",
        "supporting_evidence",
        "match_decision",
    ]

    assert results.empty
    assert list(results.columns) == expected_columns
    assert output_path.exists()

    saved_results = pd.read_parquet(output_path)
    assert saved_results.empty
    assert list(saved_results.columns) == expected_columns
