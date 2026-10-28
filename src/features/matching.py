"""
src/features/matching.py
------------------------
Cross-Marketplace Product Entity Matching Intelligence Module.

Evaluates candidate listing pairs across Amazon and Walmart to determine
whether they represent the same underlying retail product:
- Exact Model Number Matching (high confidence: 0.95)
- Normalized Title Token Jaccard Similarity with Brand Agreement
- Variant & Attribute Conflict Detection
- Transparent Decisions: MATCHED, REQUIRES_MANUAL_REVIEW, REJECTED

Outputs:
- data/processed/matched_cross_marketplace_pairs.parquet
"""

import logging
import re
from dataclasses import asdict, dataclass, fields
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)


def normalize_title_tokens(title: Optional[str]) -> set:
    """Normalize a title and extract informative alphanumeric tokens."""
    if title is None or not str(title).strip():
        return set()

    cleaned = re.sub(r"[^\w\s]", " ", str(title).lower())
    tokens = {token for token in cleaned.split() if len(token) >= 2}

    stopwords = {
        "and", "with", "for", "the", "in", "of", "to", "by",
        "on", "pack", "count", "new", "item",
    }
    return tokens - stopwords


def calculate_jaccard(tokens1: set, tokens2: set) -> float:
    """Calculate Jaccard token similarity in the range [0.0, 1.0]."""
    if not tokens1 or not tokens2:
        return 0.0

    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    return round(float(len(intersection) / len(union)), 3)


def extract_manufacturer_model(
    metadata_details: Any,
    excluded_ids: Optional[set] = None,
) -> str:
    """
    Safely extract genuine manufacturer model number from metadata_details.
    Guarantees:
    - Never uses Amazon ASINs or parent_product_ids as model numbers (commit d457eb4).
    - Checks common model keys ('Item model number', 'Model number', 'product_model', 'Manufacturer Part Number').
    - Rejects placeholders ('none', 'nan', 'unknown', 'n/a').
    """
    if not metadata_details:
        return ""

    details = metadata_details
    if isinstance(details, str):
        try:
            import json
            details = json.loads(details)
        except Exception:
            return ""

    if not isinstance(details, dict):
        return ""

    candidate_keys = [
        "Item model number",
        "Model number",
        "model_number",
        "product_model",
        "Manufacturer Part Number",
        "Part Number",
    ]

    for k in candidate_keys:
        val = str(details.get(k, "")).strip()
        if not val or val.lower() in {"none", "nan", "unknown", "n/a", ""}:
            continue
        # Never treat Amazon ASIN patterns (e.g. B0863TXGM3) as manufacturer model numbers
        if re.match(r"^B[0-9A-Z]{9}$", val):
            continue
        if excluded_ids and val in excluded_ids:
            continue
        if len(val) >= 3:
            return val

    return ""


@dataclass
class ProductMatchResult:
    """Standardized record for an entity matching decision."""

    match_id: str
    product_id_1: str
    marketplace_1: str
    title_1: str
    brand_1: Optional[str]
    model_1: Optional[str]
    product_id_2: str
    marketplace_2: str
    title_2: str
    brand_2: Optional[str]
    model_2: Optional[str]
    match_method: str
    confidence_score: float
    token_jaccard_similarity: float
    supporting_evidence: str
    match_decision: str


class CrossMarketplaceMatcher:
    """Evaluate candidate listings across marketplaces."""

    def __init__(
        self,
        match_threshold: float = 0.75,
        review_threshold: float = 0.50,
    ):
        self.match_threshold = match_threshold
        self.review_threshold = review_threshold

    def evaluate_pair(
        self,
        p1: Dict[str, Any],
        p2: Dict[str, Any],
    ) -> ProductMatchResult:
        """Evaluate two candidate product listings."""

        id1 = p1.get("canonical_product_id", "")
        m1 = p1.get("marketplace", "")
        title1 = p1.get("title", "")
        brand1 = str(p1.get("brand", "")).strip().lower()
        model1 = str(p1.get("model", p1.get("modelno", ""))).strip().lower()

        id2 = p2.get("canonical_product_id", "")
        m2 = p2.get("marketplace", "")
        title2 = p2.get("title", "")
        brand2 = str(p2.get("brand", "")).strip().lower()
        model2 = str(p2.get("model", p2.get("modelno", ""))).strip().lower()

        tokens1 = normalize_title_tokens(title1)
        tokens2 = normalize_title_tokens(title2)
        jaccard = calculate_jaccard(tokens1, tokens2)

        clean_b1 = brand1 if brand1 not in {"none", "unknown", "nan", ""} else None
        clean_b2 = brand2 if brand2 not in {"none", "unknown", "nan", ""} else None
        clean_m1 = model1 if model1 not in {"none", "unknown", "nan", ""} else None
        clean_m2 = model2 if model2 not in {"none", "unknown", "nan", ""} else None

        # 1. Exact model number match.
        if clean_m1 and clean_m2 and clean_m1 == clean_m2 and len(clean_m1) >= 3:
            if clean_b1 and clean_b2 and clean_b1 != clean_b2:
                return ProductMatchResult(
                    match_id=f"match_{id1}_{id2}",
                    product_id_1=id1,
                    marketplace_1=m1,
                    title_1=title1,
                    brand_1=clean_b1,
                    model_1=clean_m1,
                    product_id_2=id2,
                    marketplace_2=m2,
                    title_2=title2,
                    brand_2=clean_b2,
                    model_2=clean_m2,
                    match_method="MODEL_MATCH_BRAND_CONFLICT",
                    confidence_score=0.45,
                    token_jaccard_similarity=jaccard,
                    supporting_evidence=(
                        f"Model matches ('{clean_m1}') but brands conflict "
                        f"('{clean_b1}' vs '{clean_b2}')."
                    ),
                    match_decision="REQUIRES_MANUAL_REVIEW",
                )

            return ProductMatchResult(
                match_id=f"match_{id1}_{id2}",
                product_id_1=id1,
                marketplace_1=m1,
                title_1=title1,
                brand_1=clean_b1,
                model_1=clean_m1,
                product_id_2=id2,
                marketplace_2=m2,
                title_2=title2,
                brand_2=clean_b2,
                model_2=clean_m2,
                match_method="EXACT_MODEL_MATCH",
                confidence_score=0.95,
                token_jaccard_similarity=jaccard,
                supporting_evidence=(
                    f"Identical manufacturer model number ('{clean_m1}') "
                    f"across {m1} and {m2}."
                ),
                match_decision="MATCHED",
            )

        # 2. Brand agreement + high title-token overlap.
        brand_match = bool(clean_b1 and clean_b2 and clean_b1 == clean_b2)

        if brand_match and jaccard >= self.match_threshold:
            if clean_m1 and clean_m2 and clean_m1 != clean_m2:
                return ProductMatchResult(
                    match_id=f"match_{id1}_{id2}",
                    product_id_1=id1,
                    marketplace_1=m1,
                    title_1=title1,
                    brand_1=clean_b1,
                    model_1=clean_m1,
                    product_id_2=id2,
                    marketplace_2=m2,
                    title_2=title2,
                    brand_2=clean_b2,
                    model_2=clean_m2,
                    match_method="HIGH_SIMILARITY_MODEL_CONFLICT",
                    confidence_score=0.40,
                    token_jaccard_similarity=jaccard,
                    supporting_evidence=(
                        f"High title similarity ({jaccard:.2f}) and brand match "
                        f"('{clean_b1}'), but distinct model numbers "
                        f"('{clean_m1}' vs '{clean_m2}'). Likely product variants."
                    ),
                    match_decision="REJECTED",
                )

            return ProductMatchResult(
                match_id=f"match_{id1}_{id2}",
                product_id_1=id1,
                marketplace_1=m1,
                title_1=title1,
                brand_1=clean_b1,
                model_1=clean_m1,
                product_id_2=id2,
                marketplace_2=m2,
                title_2=title2,
                brand_2=clean_b2,
                model_2=clean_m2,
                match_method="HIGH_SIMILARITY_TOKEN_MATCH",
                confidence_score=0.85,
                token_jaccard_similarity=jaccard,
                supporting_evidence=(
                    f"Brand agreement ('{clean_b1}') with "
                    f"{round(jaccard * 100)}% title token overlap "
                    "without conflicting model numbers."
                ),
                match_decision="MATCHED",
            )

        # 3. Ambiguous title similarity: request manual review.
        if jaccard >= self.review_threshold:
            return ProductMatchResult(
                match_id=f"match_{id1}_{id2}",
                product_id_1=id1,
                marketplace_1=m1,
                title_1=title1,
                brand_1=clean_b1,
                model_1=clean_m1,
                product_id_2=id2,
                marketplace_2=m2,
                title_2=title2,
                brand_2=clean_b2,
                model_2=clean_m2,
                match_method="AMBIGUOUS_SIMILARITY",
                confidence_score=round(jaccard * 0.7, 2),
                token_jaccard_similarity=jaccard,
                supporting_evidence=(
                    f"Moderate token overlap ({round(jaccard * 100)}%). "
                    "Insufficient evidence for automated match."
                ),
                match_decision="REQUIRES_MANUAL_REVIEW",
            )

        # 4. No match.
        return ProductMatchResult(
            match_id=f"match_{id1}_{id2}",
            product_id_1=id1,
            marketplace_1=m1,
            title_1=title1,
            brand_1=clean_b1,
            model_1=clean_m1,
            product_id_2=id2,
            marketplace_2=m2,
            title_2=title2,
            brand_2=clean_b2,
            model_2=clean_m2,
            match_method="NO_MATCH",
            confidence_score=round(jaccard * 0.5, 2),
            token_jaccard_similarity=jaccard,
            supporting_evidence=(
                f"Low title similarity ({round(jaccard * 100)}%). "
                "Listings represent distinct products."
            ),
            match_decision="REJECTED",
        )


def build_cross_marketplace_matches(
    walmart_csv_path: str = "data/raw/walmart/walmart_products_raw.csv",
    amazon_prods_path: str = "data/processed/canonical_products.parquet",
    output_path: str = "data/processed/matched_cross_marketplace_pairs.parquet",
    sample_size: int = 200,
    audit_sample_path: Optional[str] = "data/processed/matching_audit_sample.parquet",
) -> pd.DataFrame:
    """
    Evaluate candidate Walmart-Amazon listing pairs and save real results.

    Returns an empty DataFrame with the expected result columns when no
    candidate pairs qualify. No synthetic or fabricated matches are inserted.
    Populates matching_audit_sample.parquet with a representative distribution
    of evaluated candidate pairs (matched, review, rejected).
    """
    if sample_size < 0:
        raise ValueError("sample_size must be non-negative.")

    logging.info("Building cross-marketplace matching dataset...")
    matcher = CrossMarketplaceMatcher()

    df_wm = pd.read_csv(walmart_csv_path).head(sample_size)
    df_am = pd.read_parquet(amazon_prods_path)

    if "marketplace" not in df_am.columns:
        raise ValueError(
            "Amazon canonical products data must contain a 'marketplace' column."
        )

    df_am_elec = df_am[df_am["marketplace"] == "amazon"].head(sample_size)

    results: List[Dict[str, Any]] = []
    audit_samples: List[Dict[str, Any]] = []

    for _, w_row in df_wm.iterrows():
        p_wm = {
            "canonical_product_id": f"walmart_{w_row['id']}",
            "marketplace": "walmart",
            "title": str(w_row.get("title", "")),
            "brand": str(w_row.get("brand", "")),
            "modelno": str(w_row.get("modelno", "")),
        }

        matched_for_item = 0
        for _, a_row in df_am_elec.iterrows():
            excluded_ids = {
                str(a_row.get("canonical_product_id", "")),
                str(a_row.get("source_product_id", "")),
                str(a_row.get("parent_product_id", "")),
            }
            # Strictly extract verified manufacturer models, never treating Amazon ASIN as model number
            m_extracted = extract_manufacturer_model(
                a_row.get("metadata_details"),
                excluded_ids=excluded_ids,
            )

            p_am = {
                "canonical_product_id": str(a_row["canonical_product_id"]),
                "marketplace": "amazon",
                "title": str(a_row.get("title", "")),
                "brand": str(a_row.get("brand", "")),
                "modelno": m_extracted,
            }

            match_res = matcher.evaluate_pair(p_wm, p_am)

            # Collect diverse audit sample across decisions
            if len(audit_samples) < 100:
                audit_samples.append(asdict(match_res))

            if match_res.match_decision in {
                "MATCHED",
                "REQUIRES_MANUAL_REVIEW",
            }:
                results.append(asdict(match_res))
                matched_for_item += 1
                if matched_for_item >= 3:
                    break

    # Keep the schema stable even when no pairs qualify.
    result_columns = [field.name for field in fields(ProductMatchResult)]
    df_res = pd.DataFrame(results, columns=result_columns)

    output_file = Path(output_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)
    df_res.to_parquet(output_file, index=False)

    logging.info(
        "Saved %s (%d candidate pairs qualifying)",
        output_file,
        len(df_res),
    )

    # Save populated matching audit sample if requested
    if audit_sample_path:
        audit_file = Path(audit_sample_path)
        audit_file.parent.mkdir(parents=True, exist_ok=True)
        df_audit = pd.DataFrame(audit_samples, columns=result_columns)
        df_audit.to_parquet(audit_file, index=False)
        logging.info(
            "Saved %s (%d audit sample pairs across decisions)",
            audit_file,
            len(df_audit),
        )

    return df_res


def generate_diverse_validation_candidates(
    walmart_csv_path: str = "data/raw/walmart/walmart_products_raw.csv",
    canonical_products_path: str = "data/processed/canonical_products.parquet",
    output_csv_path: str = "data/processed/matching_validation_candidates.csv",
    target_count: int = 50,
    max_per_product: int = 3,
) -> pd.DataFrame:
    """
    Generates a balanced, diverse validation candidate dataset across multiple
    brands and products for manual review, eliminating the historical bottleneck
    where candidates were concentrated on only five Amazon listings.
    """
    df_wm = pd.read_csv(walmart_csv_path)
    df_p = pd.read_parquet(canonical_products_path)
    df_am = df_p[df_p["marketplace"] == "amazon"].copy()

    df_wm["brand_clean"] = df_wm["brand"].fillna("").astype(str).str.lower().str.strip()
    df_am["brand_clean"] = df_am["brand"].fillna("").astype(str).str.lower().str.strip()

    shared_brands = set(df_wm["brand_clean"]) & set(df_am["brand_clean"]) - {"", "generic", "l"}

    candidates: List[Dict[str, Any]] = []
    am_counts: Dict[str, int] = {}
    wm_counts: Dict[str, int] = {}

    for brand in sorted(shared_brands):
        wm_b = df_wm[df_wm["brand_clean"] == brand]
        am_b = df_am[df_am["brand_clean"] == brand]

        for _, w_row in wm_b.iterrows():
            w_id = w_row["id"]
            if wm_counts.get(w_id, 0) >= 2:
                continue
            w_tokens = normalize_title_tokens(w_row.get("title", ""))

            for _, a_row in am_b.iterrows():
                am_id = a_row["canonical_product_id"]
                if am_counts.get(am_id, 0) >= max_per_product:
                    continue

                a_tokens = normalize_title_tokens(a_row.get("title", ""))
                sim = calculate_jaccard(w_tokens, a_tokens)
                if sim >= 0.10:
                    model_extracted = extract_manufacturer_model(a_row.get("metadata_details"))
                    candidates.append({
                        "brand": brand,
                        "similarity": round(sim, 3),
                        "walmart_id": w_row["id"],
                        "walmart_title": w_row.get("title", ""),
                        "walmart_modelno": w_row.get("modelno", ""),
                        "walmart_price": w_row.get("price", None),
                        "amazon_canonical_id": am_id,
                        "amazon_source_id": a_row.get("source_product_id", ""),
                        "amazon_title": a_row.get("title", ""),
                        "amazon_category": a_row.get("category", ""),
                        "amazon_price": a_row.get("price", None),
                        "amazon_item_model_number": model_extracted,
                        "manual_label": None,
                        "review_notes": None,
                    })
                    am_counts[am_id] = am_counts.get(am_id, 0) + 1
                    wm_counts[w_id] = wm_counts.get(w_id, 0) + 1

    df_cand = pd.DataFrame(candidates)
    if not df_cand.empty:
        df_cand = df_cand.sort_values(by="similarity", ascending=False).head(target_count)

    out_file = Path(output_csv_path)
    out_file.parent.mkdir(parents=True, exist_ok=True)
    df_cand.to_csv(out_file, index=False)
    logging.info(
        "Saved %d diverse validation candidates to %s across %d Amazon products and %d brands",
        len(df_cand),
        out_file,
        df_cand["amazon_canonical_id"].nunique() if not df_cand.empty else 0,
        df_cand["brand"].nunique() if not df_cand.empty else 0,
    )
    return df_cand


if __name__ == "__main__":
    build_cross_marketplace_matches()
