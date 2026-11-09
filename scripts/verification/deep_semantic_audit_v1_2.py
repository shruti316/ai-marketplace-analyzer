"""
Deep Semantic and Evidence Audit Script for Indian Marketplace Trust Dataset v1.2
==================================================================================
Performs objective, evidence-based data extraction across all 9 audit dimensions.
"""

import json
from pathlib import Path
import numpy as np
import pandas as pd

ROOT = Path(".")
DATA_V12 = ROOT / "data" / "indian_marketplace_trust_dataset_v1_2"

def audit_all():
    print("=" * 80)
    print("EXECUTING DEEP SEMANTIC AUDIT ON v1.2 PARQUET DATA")
    print("=" * 80)
    
    # -------------------------------------------------------------
    # 1. SELLER RELATIONSHIPS & SOLD_BY EDGES
    # -------------------------------------------------------------
    print("\n[1] AUDIT: SELLER RELATIONSHIPS & SOLD_BY EDGES")
    df_sellers = pd.read_parquet(DATA_V12 / "entities" / "sellers.parquet")
    df_edges = pd.read_parquet(DATA_V12 / "relationships" / "entity_relationships.parquet")
    
    print(f"Total sellers in entities/sellers.parquet: {len(df_sellers)}")
    print(df_sellers[["seller_id", "marketplace", "seller_name", "registration_status", "seller_type", "limitations"]])
    
    sold_by_edges = df_edges[df_edges["relationship_type"] == "SOLD_BY"]
    print(f"\nTotal SOLD_BY edges: {len(sold_by_edges):,}")
    print("Target seller IDs in SOLD_BY edges:")
    print(sold_by_edges["target_entity_id"].value_counts())
    print("\nEvidence reference in SOLD_BY edges:")
    print(sold_by_edges["evidence_reference"].value_counts())
    print("Detection method in SOLD_BY edges:")
    print(sold_by_edges["detection_method"].value_counts())
    print("Sample SOLD_BY edge:")
    print(sold_by_edges.iloc[0].to_dict())
    
    # -------------------------------------------------------------
    # 2. PRODUCT VARIANTS
    # -------------------------------------------------------------
    print("\n[2] AUDIT: PRODUCT VARIANTS")
    df_var = pd.read_parquet(DATA_V12 / "entities" / "variants.parquet")
    df_prod = pd.read_parquet(DATA_V12 / "entities" / "products.parquet")
    
    print(f"Total rows in variants.parquet: {len(df_var):,}")
    print(f"Total products in products.parquet: {len(df_prod):,}")
    
    # Check 1-to-1 mapping
    prod_var_counts = df_var.groupby("canonical_product_id").size()
    print(f"Products with exactly 1 variant record: {(prod_var_counts == 1).sum():,}")
    print(f"Products with > 1 variant record: {(prod_var_counts > 1).sum():,}")
    
    print("\nVariant type distribution:")
    print(df_var["variant_type"].value_counts())
    
    print("\nSize values distribution (top 10):")
    print(df_var["size"].value_counts().head(10))
    
    print("\nColor values distribution:")
    print(df_var["color"].value_counts().head(5))
    
    print("\nMaterial values distribution:")
    print(df_var["material"].value_counts().head(5))
    
    default_placeholders = (df_var["variant_type"] == "PRIMARY_DEFAULT").sum()
    size_color_variants = (df_var["variant_type"] == "SIZE_COLOR").sum()
    print(f"Default/Placeholder variant records: {default_placeholders:,} ({default_placeholders/len(df_var)*100:.1f}%)")
    print(f"Extracted variant records (from Myntra size tags): {size_color_variants:,} ({size_color_variants/len(df_var)*100:.1f}%)")
    
    # -------------------------------------------------------------
    # 3. PRICE OBSERVATIONS
    # -------------------------------------------------------------
    print("\n[3] AUDIT: PRICE OBSERVATIONS & HISTORICAL DEPTH")
    df_price = pd.read_parquet(DATA_V12 / "evidence" / "price_observations.parquet")
    print(f"Total price observations: {len(df_price):,}")
    print("\nBreakdown by observation_type:")
    print(df_price["observation_type"].value_counts())
    
    # How many listings have >= 2 observations?
    obs_per_prod = df_price.groupby("canonical_product_id").size()
    print(f"\nProducts with exactly 1 price observation: {(obs_per_prod == 1).sum():,}")
    print(f"Products with >= 2 price observations: {(obs_per_prod >= 2).sum():,}")
    print(f"Max observations for any single product: {obs_per_prod.max()}")
    
    # Check the 24 products with >= 2 observations
    multi_obs_pids = obs_per_prod[obs_per_prod >= 2].index.tolist()
    print(f"\nSample product with 2 observations ({multi_obs_pids[0]}):")
    sample_multi = df_price[df_price["canonical_product_id"] == multi_obs_pids[0]]
    print(sample_multi[["price_observation_id", "observation_type", "selling_price", "observation_timestamp", "provenance"]])
    
    # -------------------------------------------------------------
    # 4. REVIEW ANNOTATIONS
    # -------------------------------------------------------------
    print("\n[4] AUDIT: REVIEW ANNOTATIONS (600 RECORDS)")
    df_ann_rev = pd.read_parquet(DATA_V12 / "annotations" / "review_annotations.parquet")
    print(f"Total review annotations: {len(df_ann_rev):,}")
    print("\nReview authenticity labels distribution:")
    print(df_ann_rev["review_authenticity_label"].value_counts())
    print("\nSentiment ground truth distribution:")
    print(df_ann_rev["sentiment_ground_truth"].value_counts())
    print("\nAnnotator ID values:")
    print(df_ann_rev["annotator_id"].value_counts())
    print("\nConfidence values:")
    print(df_ann_rev["confidence"].value_counts())
    print("\nAdjudication status values:")
    print(df_ann_rev["adjudication_status"].value_counts())
    print("\nAspect authenticity gold:")
    print(df_ann_rev["aspect_authenticity_gold"].value_counts())
    
    # -------------------------------------------------------------
    # 5. LISTING & IMAGE ANNOTATIONS
    # -------------------------------------------------------------
    print("\n[5] AUDIT: LISTING & IMAGE ANNOTATIONS")
    df_ann_list = pd.read_parquet(DATA_V12 / "annotations" / "listing_annotations.parquet")
    df_ann_img = pd.read_parquet(DATA_V12 / "annotations" / "image_annotations.parquet")
    
    print(f"Listing annotations count: {len(df_ann_list):,}")
    print("Listing integrity labels:")
    print(df_ann_list["listing_integrity_label"].value_counts())
    print("Suspicion reason:")
    print(df_ann_list["suspicion_reason"].value_counts())
    
    print(f"\nImage annotations count: {len(df_ann_img):,}")
    print("Visual matching labels:")
    print(df_ann_img["visual_matching_label"].value_counts())
    print("Packaging consistency:")
    print(df_ann_img["packaging_consistency"].value_counts())
    print("Title visual alignment:")
    print(df_ann_img["title_visual_alignment"].value_counts())
    
    # -------------------------------------------------------------
    # 6. REVIEW FEATURES & DUPLICATES
    # -------------------------------------------------------------
    print("\n[6] AUDIT: REVIEW FEATURES & DUPLICATE ACCOUNTING")
    df_rev_feat = pd.read_parquet(DATA_V12 / "derived_evidence" / "review_features.parquet")
    df_rev = pd.read_parquet(DATA_V12 / "evidence" / "reviews.parquet")
    
    print(f"Total reviews: {len(df_rev):,}")
    flagged_dups = df_rev_feat["is_exact_duplicate"].sum()
    print(f"Total review records flagged as is_exact_duplicate=True: {flagged_dups:,} ({flagged_dups/len(df_rev)*100:.1f}%)")
    
    # Unique text count among duplicates
    clean_texts = df_rev["review_text"].str.strip().str.lower()
    text_counts = clean_texts.value_counts()
    dup_unique_texts = (text_counts > 1).sum()
    print(f"Unique distinct review texts that have duplicates: {dup_unique_texts:,}")
    print(f"Total review instances accounted for by these duplicate texts: {text_counts[text_counts > 1].sum():,}")
    
    # Discordance distribution
    print("\nRating-text discordance distribution:")
    print(pd.cut(df_rev_feat["rating_text_discordance_score"], bins=[0.0, 0.1, 0.4, 0.8, 1.0]).value_counts())
    
    # Hinglish vs English samples
    hinglish_rows = df_rev[df_rev["language"] == "hi-en"]
    print(f"\nHinglish reviews count: {len(hinglish_rows)}")
    for idx, r in hinglish_rows.iterrows():
        print(f"  [{r['language']}] Rating: {r['rating']} | Text: '{r['review_text'][:80]}'")
        
    # -------------------------------------------------------------
    # 7. OCR EVIDENCE
    # -------------------------------------------------------------
    print("\n[7] AUDIT: OCR EVIDENCE QUALITY")
    df_ocr = pd.read_parquet(DATA_V12 / "evidence" / "ocr_evidence.parquet")
    print(f"Total OCR records: {len(df_ocr):,}")
    print("Packaging match status:")
    print(df_ocr["packaging_match_status"].value_counts())
    print("Detected brand distribution (top 5):")
    print(df_ocr["detected_brand"].value_counts().head(5))
    print("OCR Engine value:")
    print(df_ocr["ocr_engine"].value_counts())
    print("Sample OCR record:")
    print(df_ocr.iloc[0].to_dict())
    
    # -------------------------------------------------------------
    # 8. BENCHMARK SPLITS & LEAKAGE
    # -------------------------------------------------------------
    print("\n[8] AUDIT: BENCHMARK SPLITS LEAKAGE")
    df_train = pd.read_parquet(DATA_V12 / "benchmarks" / "train_split.parquet")
    df_val = pd.read_parquet(DATA_V12 / "benchmarks" / "validation_split.parquet")
    df_test = pd.read_parquet(DATA_V12 / "benchmarks" / "test_split.parquet")
    
    train_prods = set(df_train["canonical_product_id"])
    val_prods = set(df_val["canonical_product_id"])
    test_prods = set(df_test["canonical_product_id"])
    
    # Check review text leakage: do identical duplicate review texts span across train and test?
    rev_prod_map = dict(zip(df_rev["review_id"], df_rev["canonical_product_id"]))
    dup_text_to_pids = df_rev.groupby(clean_texts)["canonical_product_id"].apply(set).to_dict()
    
    dup_cross_split_leakage = 0
    for txt, pids in dup_text_to_pids.items():
        if len(pids) > 1:
            in_train = bool(pids.intersection(train_prods))
            in_val = bool(pids.intersection(val_prods))
            in_test = bool(pids.intersection(test_prods))
            if (in_train + in_val + in_test) > 1:
                dup_cross_split_leakage += 1
                
    print(f"Product overlap across splits: {len(train_prods.intersection(val_prods)) + len(train_prods.intersection(test_prods)) + len(val_prods.intersection(test_prods))}")
    print(f"Duplicate review text clusters that cross split boundaries: {dup_cross_split_leakage}")

if __name__ == "__main__":
    audit_all()
