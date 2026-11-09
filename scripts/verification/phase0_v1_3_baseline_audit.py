"""
Phase 0: Baseline Audit & Verification for v1.3
================================================
Independently verifies all reported counts for v1.3 against actual data on disk.
"""

from pathlib import Path
import json
import pandas as pd
import numpy as np

def run_audit():
    v13_dir = Path("data/indian_marketplace_trust_dataset_v1_3")
    assert v13_dir.exists(), "v1.3 directory does not exist!"

    tables = {
        "products": v13_dir / "entities" / "products.parquet",
        "listings": v13_dir / "entities" / "listings.parquet",
        "variants": v13_dir / "entities" / "variants.parquet",
        "platforms": v13_dir / "entities" / "platforms.parquet",
        "sellers": v13_dir / "entities" / "sellers.parquet",
        "images": v13_dir / "evidence" / "images.parquet",
        "reviews": v13_dir / "evidence" / "reviews.parquet",
        "prices": v13_dir / "evidence" / "price_observations.parquet",
        "ocr": v13_dir / "evidence" / "ocr_evidence.parquet",
        "review_features": v13_dir / "derived_evidence" / "review_features.parquet",
        "pricing_features": v13_dir / "derived_evidence" / "pricing_features.parquet",
        "seller_features": v13_dir / "derived_evidence" / "seller_features.parquet",
        "coverage_matrix": v13_dir / "derived_evidence" / "multimodal_coverage_matrix.parquet",
        "graph": v13_dir / "relationships" / "entity_relationships.parquet",
        "silver_reviews": v13_dir / "annotations" / "review_silver_annotations.parquet",
        "human_reviews": v13_dir / "annotations" / "review_human_annotations.parquet",
        "listing_ann": v13_dir / "annotations" / "listing_annotations.parquet",
        "image_ann": v13_dir / "annotations" / "image_annotations.parquet",
        "train_split": v13_dir / "benchmarks" / "train_split.parquet",
        "val_split": v13_dir / "benchmarks" / "validation_split.parquet",
        "test_split": v13_dir / "benchmarks" / "test_split.parquet",
    }

    results = []
    for name, p in tables.items():
        if not p.exists():
            results.append({"table": name, "status": "MISSING", "rows": 0, "cols": 0})
            continue
        df = pd.read_parquet(p)
        results.append({"table": name, "status": "OK", "rows": len(df), "cols": len(df.columns)})

    emb_p = v13_dir / "derived_evidence" / "visual_embeddings_resnet18.npz"
    if emb_p.exists():
        npz = np.load(emb_p, allow_pickle=True)
        results.append({"table": "resnet18_embeddings", "status": "OK", "rows": len(npz["image_ids"]), "cols": int(npz["embedding_dim"])})

    df_res = pd.DataFrame(results)
    print(df_res.to_string(index=False))

    # Check images usable count
    df_img = pd.read_parquet(tables["images"])
    usable_count = int(df_img["is_usable"].sum())
    print(f"\nImages total: {len(df_img)}, Usable images: {usable_count}")

    # Check price observation types
    df_prices = pd.read_parquet(tables["prices"])
    print("Price observations breakdown:")
    print(df_prices["observation_type"].value_counts().to_string())

    # Check graph relationship types
    df_graph = pd.read_parquet(tables["graph"])
    print("\nGraph relationship types:")
    print(df_graph["relationship_type"].value_counts().to_string())

    # Check listing annotation classes
    df_list = pd.read_parquet(tables["listing_ann"])
    print("\nListing annotation classes:")
    print(df_list["listing_integrity_label"].value_counts().to_string())

    # Check image annotation classes
    df_img_ann = pd.read_parquet(tables["image_ann"])
    print("\nImage annotation classes:")
    print(df_img_ann["visual_matching_label"].value_counts().to_string())

if __name__ == "__main__":
    run_audit()
