"""
Cross-Marketplace Entity Resolution and Canonical Product Registry Pipeline - v1.7
AI-Powered Marketplace Trust Intelligence Platform

This module reconciles the 6,043 products across 6 marketplaces:
1. Audits and normalizes brand names, titles, categories, and extracted specifications.
2. Performs multi-stage cross-marketplace matching:
   - Exact normalized title match.
   - Brand + normalized token set match.
   - Fuzzy text similarity (SequenceMatcher).
   - Variant family identification (shared brand + product line with differing attributes).
   - Confidence scoring and quarantine status for uncertain matches.
3. Builds the canonical product registry (6,043 records).
4. Emits verified cross-marketplace matches and variant mapping tables.
"""

import os
import re
import json
import logging
from difflib import SequenceMatcher
import pandas as pd
import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

INPUT_PRODUCTS = "data/marketplace_trust_dataset_v1.6/entities/products.parquet"
INPUT_VARIANTS = "data/marketplace_trust_dataset_v1.6/entities/product_variants.parquet"
OUTPUT_REGISTRY = "data/processed_v1_7/canonical_product_registry_v1_7.parquet"
OUTPUT_MATCHES = "data/processed_v1_7/cross_marketplace_matches_v1_7.parquet"
OUTPUT_VARIANTS = "data/processed_v1_7/product_variants_v1_7.parquet"

def normalize_text(text: str) -> str:
    if not isinstance(text, str):
        return ""
    t = text.lower().strip()
    t = re.sub(r"[^\w\s]", " ", t)
    return " ".join(t.split())

def normalize_brand(brand: str) -> str:
    if not isinstance(brand, str) or not brand.strip():
        return "UNKNOWN_BRAND"
    b = brand.strip().lower()
    b = re.sub(r"[^\w\s]", "", b)
    b = " ".join(b.split())
    # Normalization aliases
    aliases = {
        "apple inc": "apple",
        "apple inc.": "apple",
        "hp inc": "hp",
        "lg electronics": "lg",
        "samsung electronics": "samsung",
        "jbn creations": "jbn creation",
        "aj dezines": "aj dezines",
        "ponds": "pond's",
        "l oreal": "l'oreal",
        "loreal": "l'oreal",
    }
    return aliases.get(b, b)

def extract_specifications(title: str) -> dict:
    specs = {}
    if not isinstance(title, str):
        return specs
    # Volume / weight
    m_vol = re.search(r"(\d+(?:\.\d+)?\s*(?:ml|gm|g|kg|l|oz|fl\s*oz))\b", title, re.I)
    if m_vol:
        specs["volume_weight"] = m_vol.group(1).lower().replace(" ", "")
    # Pack count
    m_pack = re.search(r"pack\s+of\s+(\d+)", title, re.I)
    if m_pack:
        specs["pack_size"] = int(m_pack.group(1))
    # Apparel size
    m_size = re.search(r"\b(XXL|XXXL|XL|XS|[SML])\b", title)
    if m_size:
        specs["size"] = m_size.group(1).upper()
    # Digital storage
    m_mem = re.search(r"(\d+)\s*(?:gb|mb|tb)\b", title, re.I)
    if m_mem:
        specs["storage"] = m_mem.group(1).lower() + "gb"
    return specs

def compute_token_overlap(t1: str, t2: str) -> float:
    tokens1 = set(normalize_text(t1).split())
    tokens2 = set(normalize_text(t2).split())
    if not tokens1 or not tokens2:
        return 0.0
    return len(tokens1 & tokens2) / max(len(tokens1), len(tokens2))

def run_cross_marketplace_resolution():
    logger.info("Starting cross-marketplace entity resolution pipeline v1.7...")
    os.makedirs("data/processed_v1_7", exist_ok=True)
    
    # 1. Load data
    products = pd.read_parquet(INPUT_PRODUCTS)
    logger.info(f"Loaded {len(products)} products from {INPUT_PRODUCTS}")
    
    variants_raw = pd.read_parquet(INPUT_VARIANTS)
    logger.info(f"Loaded {len(variants_raw)} existing variant records")
    
    # 2. Enrich products with normalized attributes
    products["normalized_brand"] = products["brand"].apply(normalize_brand)
    products["normalized_title"] = products["product_title"].apply(normalize_text)
    products["title_length_chars"] = products["product_title"].apply(lambda x: len(str(x)))
    products["title_word_count"] = products["product_title"].apply(lambda x: len(str(x).split()))
    products["extracted_specs"] = products["product_title"].apply(extract_specifications)
    products["extracted_specs_json"] = products["extracted_specs"].apply(json.dumps)
    
    # Check completeness score
    def calc_completeness(row):
        score = 0.0
        if pd.notnull(row["product_title"]) and len(str(row["product_title"])) > 5:
            score += 0.25
        if pd.notnull(row["brand"]) and row["normalized_brand"] != "UNKNOWN_BRAND":
            score += 0.15
        if pd.notnull(row["category"]) and str(row["category"]) not in ["Other", "unknown"]:
            score += 0.15
        if row["has_price"]:
            score += 0.15
        if row["has_image"]:
            score += 0.15
        if row["has_review"]:
            score += 0.15
        return round(min(1.0, score), 3)
    
    products["entity_completeness_score"] = products.apply(calc_completeness, axis=1)
    
    # 3. Cross-Marketplace Entity Resolution
    # Identify shared brands across marketplaces
    brand_mps = products[products["normalized_brand"] != "UNKNOWN_BRAND"].groupby("normalized_brand")["marketplace"].nunique()
    shared_brands = set(brand_mps[brand_mps > 1].index)
    logger.info(f"Identified {len(shared_brands)} brands shared across multiple marketplaces")
    
    match_records = []
    match_counter = 1
    
    # Group by shared brand
    for brand in sorted(shared_brands):
        brand_prods = products[products["normalized_brand"] == brand]
        mp_groups = brand_prods.groupby("marketplace")
        marketplaces = list(mp_groups.groups.keys())
        
        for i in range(len(marketplaces)):
            for j in range(i + 1, len(marketplaces)):
                mp1, mp2 = marketplaces[i], marketplaces[j]
                prods1 = mp_groups.get_group(mp1)
                prods2 = mp_groups.get_group(mp2)
                
                for _, r1 in prods1.iterrows():
                    for _, r2 in prods2.iterrows():
                        t1 = r1["product_title"]
                        t2 = r2["product_title"]
                        
                        # Exact normalized match
                        if r1["normalized_title"] == r2["normalized_title"]:
                            match_records.append({
                                "match_id": f"CMM_{match_counter:06d}",
                                "product_id_1": r1["canonical_product_id"],
                                "marketplace_1": mp1,
                                "product_title_1": t1,
                                "product_id_2": r2["canonical_product_id"],
                                "marketplace_2": mp2,
                                "product_title_2": t2,
                                "brand": brand,
                                "match_stage": "STAGE_1_EXACT_TITLE",
                                "similarity_score": 1.0,
                                "token_overlap": 1.0,
                                "match_confidence": 1.0,
                                "resolution_status": "EXACT_CROSS_MARKETPLACE_MATCH",
                                "evidence_note": "Identical normalized title across marketplaces"
                            })
                            match_counter += 1
                            continue
                            
                        # Fuzzy sequence matcher
                        sim = SequenceMatcher(None, t1.lower(), t2.lower()).ratio()
                        tok_overlap = compute_token_overlap(t1, t2)
                        
                        # Variant checks
                        s1 = r1["extracted_specs"]
                        s2 = r2["extracted_specs"]
                        spec_conflict = False
                        for k in ["volume_weight", "size", "storage", "pack_size"]:
                            if k in s1 and k in s2 and s1[k] != s2[k]:
                                spec_conflict = True
                                break
                                
                        if sim >= 0.50 or tok_overlap >= 0.45:
                            if spec_conflict:
                                status = "VARIANT_FAMILY_CROSS_MARKETPLACE"
                                note = f"Shared brand and product line but differing spec ({s1} vs {s2})"
                                confidence = round(sim * 0.85, 4)
                            elif sim >= 0.80:
                                status = "HIGH_CONFIDENCE_MATCH"
                                note = "High textual similarity and compatible specs"
                                confidence = round(sim, 4)
                            elif sim >= 0.60:
                                status = "QUARANTINED_UNCERTAIN_MATCH"
                                note = "Moderate similarity; requires human adjudication"
                                confidence = round(sim * 0.75, 4)
                            else:
                                status = "WEAK_SIMILARITY_CANDIDATE"
                                note = "Low similarity token overlap"
                                confidence = round(sim * 0.5, 4)
                                
                            match_records.append({
                                "match_id": f"CMM_{match_counter:06d}",
                                "product_id_1": r1["canonical_product_id"],
                                "marketplace_1": mp1,
                                "product_title_1": t1,
                                "product_id_2": r2["canonical_product_id"],
                                "marketplace_2": mp2,
                                "product_title_2": t2,
                                "brand": brand,
                                "match_stage": "STAGE_2_FUZZY_ENTITY_RESOLUTION",
                                "similarity_score": round(sim, 4),
                                "token_overlap": round(tok_overlap, 4),
                                "match_confidence": confidence,
                                "resolution_status": status,
                                "evidence_note": note
                            })
                            match_counter += 1

    df_matches = pd.DataFrame(match_records)
    logger.info(f"Generated {len(df_matches)} cross-marketplace candidate match records")
    if not df_matches.empty:
        logger.info(f"Match status breakdown:\n{df_matches['resolution_status'].value_counts()}")
        
    df_matches.to_parquet(OUTPUT_MATCHES, index=False)
    logger.info(f"Saved cross-marketplace matches to {OUTPUT_MATCHES}")
    
    # 4. Canonical Product Registry (6,043 rows)
    # Check cross-listing count for each product
    cross_list_counts = {}
    if not df_matches.empty:
        high_conf = df_matches[df_matches["resolution_status"].isin(["EXACT_CROSS_MARKETPLACE_MATCH", "HIGH_CONFIDENCE_MATCH", "VARIANT_FAMILY_CROSS_MARKETPLACE"])]
        for p in high_conf["product_id_1"]:
            cross_list_counts[p] = cross_list_counts.get(p, 0) + 1
        for p in high_conf["product_id_2"]:
            cross_list_counts[p] = cross_list_counts.get(p, 0) + 1
            
    products["cross_marketplace_candidate_count"] = products["canonical_product_id"].map(lambda x: cross_list_counts.get(x, 0))
    products["has_cross_marketplace_candidate"] = products["cross_marketplace_candidate_count"] > 0
    
    # Merge variant membership
    var_parent_map = dict(zip(variants_raw["canonical_product_id"], variants_raw["parent_group_id"]))
    var_type_map = dict(zip(variants_raw["canonical_product_id"], variants_raw["variant_type"]))
    products["variant_parent_group_id"] = products["canonical_product_id"].map(lambda x: var_parent_map.get(x, "STANDALONE"))
    products["variant_type"] = products["canonical_product_id"].map(lambda x: var_type_map.get(x, "NONE"))
    products["is_variant_product"] = products["variant_parent_group_id"] != "STANDALONE"
    
    # Reorder and format registry
    registry_cols = [
        "canonical_product_id",
        "product_id",
        "marketplace",
        "source_product_id",
        "country",
        "currency",
        "product_title",
        "normalized_title",
        "brand",
        "normalized_brand",
        "category",
        "subcategory",
        "product_description",
        "product_url",
        "extracted_specs_json",
        "seller_id",
        "seller_name",
        "seller_id_semantics",
        "has_image",
        "has_review",
        "has_price",
        "modality_tier",
        "domain_partition",
        "entity_completeness_score",
        "is_variant_product",
        "variant_parent_group_id",
        "variant_type",
        "has_cross_marketplace_candidate",
        "cross_marketplace_candidate_count",
        "validation_status",
        "reconciliation_version"
    ]
    
    df_registry = products[registry_cols].copy()
    df_registry["reconciliation_version"] = "v1.7_FROZEN"
    df_registry.to_parquet(OUTPUT_REGISTRY, index=False)
    logger.info(f"Saved canonical product registry ({len(df_registry)} rows) to {OUTPUT_REGISTRY}")
    
    # 5. Enriched Product Variants Table
    df_variants = variants_raw.copy()
    df_variants["reconciliation_version"] = "v1.7_FROZEN"
    # Enrich with product title from registry
    title_map = dict(zip(products["canonical_product_id"], products["product_title"]))
    df_variants["product_title"] = df_variants["canonical_product_id"].map(title_map)
    df_variants.to_parquet(OUTPUT_VARIANTS, index=False)
    logger.info(f"Saved enriched product variants ({len(df_variants)} rows) to {OUTPUT_VARIANTS}")
    
    logger.info("Cross-marketplace entity resolution completed successfully.")

if __name__ == "__main__":
    run_cross_marketplace_resolution()
