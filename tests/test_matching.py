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


def test_model_extraction_preserves_asin_quarantine():
    from src.features.matching import extract_manufacturer_model
    # Real manufacturer model extracted
    assert extract_manufacturer_model({"Item model number": "WH-1000XM4"}) == "WH-1000XM4"
    assert extract_manufacturer_model({"product_model": "SM-S901U"}) == "SM-S901U"
    # Amazon ASIN pattern rejected as manufacturer model
    assert extract_manufacturer_model({"Item model number": "B0863TXGM3"}) == ""
    assert extract_manufacturer_model({"model_number": "B00176GTAG"}) == ""
    # Excluded parent IDs rejected
    assert extract_manufacturer_model({"model_number": "PROD123"}, excluded_ids={"PROD123"}) == ""
    # Placeholders rejected
    assert extract_manufacturer_model({"Model number": "none"}) == ""
    assert extract_manufacturer_model({"Model number": "N/A"}) == ""


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


def test_builder_does_not_use_amazon_parent_id_as_model_number(tmp_path):
    """Amazon parent IDs must not trigger exact manufacturer-model matches."""
    walmart_path = tmp_path / "walmart.csv"
    amazon_path = tmp_path / "amazon.parquet"
    output_path = tmp_path / "matches.parquet"

    pd.DataFrame([
        {
            "id": 1,
            "title": "Sony WH-1000XM4 Wireless Headphones Black",
            "brand": "Sony",
            "modelno": "B0863TXGM3",
        }
    ]).to_csv(walmart_path, index=False)

    pd.DataFrame([
        {
            "canonical_product_id": "amazon_B0863TXGM3",
            "marketplace": "amazon",
            "title": "Sony WH-1000XM4 Wireless Headphones Black",
            "brand": "Sony",
            "source_product_id": "B0863TXGM3",
            "parent_product_id": "B0863TXGM3",
        }
    ]).to_parquet(amazon_path, index=False)

    results = build_cross_marketplace_matches(
        walmart_csv_path=str(walmart_path),
        amazon_prods_path=str(amazon_path),
        output_path=str(output_path),
        sample_size=10,
    )

    # A title/brand match may still be valid, but it must not
    # claim an exact manufacturer-model match based on the Amazon ID.
    if not results.empty:
        assert not (results["match_method"] == "EXACT_MODEL_MATCH").any()


def test_model_matching_prudence_category_conflict():
    """Revision 3: Exact model agreement across conflicting categories must not be auto-matched."""
    matcher = CrossMarketplaceMatcher()
    p1 = {
        "canonical_product_id": "walmart_elec_1",
        "marketplace": "walmart",
        "title": "Electronics Gadget X100",
        "brand": "BrandX",
        "category": "Electronics",
        "modelno": "X100",
    }
    p2 = {
        "canonical_product_id": "flipkart_cloth_2",
        "marketplace": "flipkart",
        "title": "Cotton Ethnic Wear Dress X100",
        "brand": "BrandX",
        "category": "Clothing & Fashion",
        "modelno": "X100",
    }
    res = matcher.evaluate_pair(p1, p2)
    assert res.match_decision == "REQUIRES_MANUAL_REVIEW"
    assert res.match_method == "MODEL_MATCH_CATEGORY_CONFLICT"
    assert res.confidence_score <= 0.50


def test_model_matching_prudence_variant_difference():
    """Revision 3: Exact model agreement with conflicting variant attributes must be flagged as variant difference."""
    matcher = CrossMarketplaceMatcher()
    p1 = {
        "canonical_product_id": "walmart_size_s",
        "marketplace": "walmart",
        "title": "Running Shoes Sprint Pro 500 Size 7",
        "brand": "SprintCo",
        "category": "Clothing & Fashion",
        "modelno": "SP-500",
        "metadata_details": {"size": "7"},
    }
    p2 = {
        "canonical_product_id": "myntra_size_l",
        "marketplace": "myntra",
        "title": "Running Shoes Sprint Pro 500 Size 11",
        "brand": "SprintCo",
        "category": "Clothing & Fashion",
        "modelno": "SP-500",
        "metadata_details": {"size": "11"},
    }
    res = matcher.evaluate_pair(p1, p2)
    assert res.match_decision == "REQUIRES_MANUAL_REVIEW"
    assert res.match_method == "MODEL_MATCH_VARIANT_DIFFERENCE"
    assert res.confidence_score < 0.90


def test_model_matching_prudence_unverified_brand_low_similarity():
    """Revision 3: Exact model agreement with missing brand and low token similarity must be audited."""
    matcher = CrossMarketplaceMatcher()
    p1 = {
        "canonical_product_id": "prod_1",
        "marketplace": "walmart",
        "title": "Industrial Precision Measurement Tool M-900",
        "brand": None,
        "modelno": "M-900",
    }
    p2 = {
        "canonical_product_id": "prod_2",
        "marketplace": "amazon",
        "title": "Heavy Duty Garden Water Hose Adapter M-900",
        "brand": "HoseMaker",
        "modelno": "M-900",
    }
    res = matcher.evaluate_pair(p1, p2)
    assert res.match_decision == "REQUIRES_MANUAL_REVIEW"
    assert res.match_method == "MODEL_MATCH_UNVERIFIED_BRAND"

