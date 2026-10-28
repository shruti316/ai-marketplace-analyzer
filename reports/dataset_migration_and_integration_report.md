# Dataset Migration, Schema Evolution & Integration Plan
## AI-Powered Marketplace Trust Intelligence Platform

**Date:** October 2026  
**Author & Lead System Architect:** Senior Data Engineer, ML Engineer & Repository Maintainer  
**Repository Working Directory:** `c:\Users\shruti\Desktop\project\ai-based-marketplace-analyzer`  
**Status:** Audit & Plan Formulated — Pending Approval Checkpoint  

---

## 1. Executive Summary

This report documents the migration and integration strategy to transition the **AI-Powered Marketplace Trust Intelligence Platform** from an exclusively US-focused catalog into a multi-marketplace, multi-geography, and category-diverse trust intelligence system with authentic Indian market relevance.

All planned changes strictly obey backward compatibility, zero regression on existing automated tests (33/33 tests passing), and non-destructive data handling.

---

## 2. In-Scope Components and Affected Files

| Component | Target File | Nature of Modification | Regression Protection |
| :--- | :--- | :--- | :--- |
| **Data Schema** | [`src/data/schema.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/data/schema.py) | 1. Add `country: str = "US"` to `CanonicalProduct` & `CanonicalReview` (backward-compatible default).<br>2. Add `Grocery & Essentials` and `Home Appliances` to `STANDARD_CATEGORIES`.<br>3. Expand `CATEGORY_MAPPING_RULES` with crockery, cookware, groceries, and unclassified computer accessories. | All existing dataclass constructors remain 100% valid with default values. |
| **Ingestion Pipeline** | [`src/data/pipeline.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/data/pipeline.py) | 1. Integrate Flipkart sample ingestion (`ingest_flipkart_catalog`).<br>2. Integrate Amazon India sample ingestion (`ingest_amazon_india_catalog`).<br>3. Populate `country` and preserve native `currency` (`INR` vs `USD`). | Existing Amazon US, Walmart, and BestBuy ingestion logic remains untouched. |
| **Price Anomaly Engine** | [`src/features/pricing.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/features/pricing.py) | 1. Multi-currency stratification: group baselines by `(category, currency)` instead of `category` alone.<br>2. Currency-aware display formatting (`₹` for INR, `$` for USD). | Zero cross-contamination between USD and INR price distributions. |
| **Entity Matcher** | [`src/features/matching.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/features/matching.py) | 1. Remove artificial `break` statement to allow multiple candidate evaluations per product.<br>2. Extract manufacturer model numbers from `metadata_details` (e.g. `model_number`) safely.<br>3. Support multi-marketplace pairs (Walmart, BestBuy, Amazon, Flipkart).<br>4. Generate a populated, diverse audit sample in `data/processed/matching_audit_sample.parquet`. | Retains strict prohibition against treating Amazon ASINs as manufacturer model numbers (`d457eb4`). |
| **Listing-Level NLP** | [`src/nlp/review_analysis.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/nlp/review_analysis.py) | Reusable listing-level feature aggregation verified and operational in `data/processed/product_review_features.parquet`. | Decoupled from hotel benchmark. |
| **Automated Tests** | [`tests/test_schema.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/tests/test_schema.py), [`tests/test_pricing.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/tests/test_pricing.py), [`tests/test_matching.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/tests/test_matching.py) | Add unit tests for country field, INR pricing baselines, expanded category taxonomy, and multi-candidate matching. | All 33 existing tests must continue to pass. |
| **Integrity Validator** | [`src/validate_dataset_integrity.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/validate_dataset_integrity.py) | Verify multi-country (`US`, `IN`) and multi-currency (`USD`, `INR`) coverage. | Retain 32 baseline checks. |

---

## 3. Schema Evolution (Backward Compatible)

### Current `CanonicalProduct` dataclass:
```python
@dataclass
class CanonicalProduct:
    canonical_product_id: str
    marketplace: str
    source_product_id: str
    parent_product_id: Optional[str] = None
    title: str = ""
    category: str = "Other"
    subcategory: Optional[str] = None
    brand: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    currency: str = "USD"
    # ...
```

### Proposed Evolutionary Fields:
```python
@dataclass
class CanonicalProduct:
    canonical_product_id: str
    marketplace: str
    source_product_id: str
    parent_product_id: Optional[str] = None
    country: str = "US"                   # NEW: 'US', 'IN' (ISO 3166-1 alpha-2)
    title: str = ""
    category: str = "Other"
    subcategory: Optional[str] = None
    brand: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    currency: str = "USD"                 # 'USD', 'INR'
    # ...
```
By placing `country: str = "US"` with a default parameter, all existing code and instantiations continue to function without any breaking signature errors.

---

## 4. Multi-Currency Pricing Architecture

A core deficiency in the existing price anomaly module [`src/features/pricing.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/features/pricing.py) is that it grouped listings solely by `category`, assuming all prices are USD:

```python
# Existing code:
for cat, group in priced.groupby("category"):
    p_series = group["price"]
    # ...
```

If Indian listings in INR are ingested without modification, a product priced at ₹999 would be compared against a USD median of $25, falsely triggering a massive `PRICE_ABOVE_UPPER_FENCE` anomaly (price gouging).

### Upgraded Architecture:
```python
# Upgraded code:
for (cat, curr), group in priced.groupby(["category", "currency"]):
    p_series = group["price"]
    baseline_key = f"{cat}_{curr}"
    # Calculate robust medians and Tukey fences independently for each (category, currency) pair
```
This guarantees mathematical integrity: INR products are strictly baselined against INR peers, and USD products against USD peers.

---

## 5. Cross-Marketplace Matcher De-bottlenecking

The existing matcher in [`src/features/matching.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/features/matching.py):
1. Evaluates only the first 200 Walmart items against 200 Amazon items.
2. Breaks on the first match (`break`), leaving `matched_cross_marketplace_pairs.parquet` with exactly 1 row.
3. Hardcodes `"modelno": ""` for Amazon, preventing exact model matching from firing even when genuine manufacturer model numbers exist in `metadata_details`.

### Upgraded Architecture:
1. Extract manufacturer model numbers from `metadata_details` (e.g. `details.get("Model Number")`, `details.get("Item model number")`) while strictly avoiding using Amazon parent ASINs as model numbers.
2. Index candidate listings by standardized brand tokens (candidate blocking) to avoid Cartesian product scaling while evaluating multiple candidates per product.
3. Support multi-marketplace comparisons (Walmart, Amazon, BestBuy, and Flipkart).
4. Save both the decisional table (`matched_cross_marketplace_pairs.parquet`) and a diverse audit sample (`matching_audit_sample.parquet`) covering matches, rejections, and manual-review candidates.

---

## 6. Risk Analysis & Mitigation Strategy

| Risk | Likelihood | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Breaking existing automated tests** | Low | High | Run `run_tests.py` and `validate_dataset_integrity.py` before and after every modification. |
| **Mixing USD and INR price distributions** | Medium | High | Enforce compound key `(category, currency)` in `CategoryPricingAnalyzer`. |
| **Treating Amazon ASIN as model number** | Low | High | Preserve commit `d457eb4` logic: regex check ensuring model strings are not ASINs. |
| **Orphan foreign keys in reviews/images** | Low | High | Ensure every review/image ingested references an existing `canonical_product_id`. |
| **Modifying protected hotel model** | Very Low | High | `models/hotel_review_baseline.joblib` is strictly excluded from all edits and commits. |

---

## 7. Rollback Plan

If any regression occurs during migration:
1. Revert code changes via Git working tree restore for modified source files.
2. Re-run `CanonicalPipeline.run_pipeline()` to regenerate canonical Parquet tables from raw archives.
3. Verify test baseline (`python run_tests.py` -> 33 passes).
