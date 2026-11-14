"""
Historical Parquet Dataset Extractor
Extracts the 9 approved historical seed entities from Parquet into clean, standard-compliant JSON staging files
for the TypeScript database seeding pipeline.
"""

import os
import json
import pandas as pd
import numpy as np

DATASET_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../../data/indian_marketplace_trust_dataset_v1_7")
)
OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "data"))

def clean_record(val):
    if val is None or pd.isna(val):
        return None
    if isinstance(val, (np.integer, int)):
        return int(val)
    if isinstance(val, (np.floating, float)):
        return float(val)
    if isinstance(val, (np.bool_, bool)):
        return bool(val)
    if isinstance(val, pd.Timestamp):
        return val.isoformat()
    if isinstance(val, list):
        return [clean_record(x) for x in val]
    if isinstance(val, dict):
        return {k: clean_record(v) for k, v in val.items()}
    return val

def extract_all():
    os.makedirs(OUT_DIR, exist_ok=True)
    print(f"[EXTRACTOR] Sourcing from: {DATASET_DIR}")
    print(f"[EXTRACTOR] Writing to:   {OUT_DIR}")

    targets = [
        ("platforms.json", "entities/platforms.parquet", 3),
        ("brands.json", "entities/brands.parquet", 1593),
        ("sellers.json", "entities/sellers.parquet", 4),
        ("canonical_products.json", "entities/products.parquet", 3643),
        ("marketplace_listings.json", "entities/listings.parquet", 3643),
        ("price_history.json", "evidence/price_observations.parquet", 3667),
        ("trust_assessments.json", "derived_evidence/trust_assessments_products.parquet", 3643),
        ("annotation_tasks.json", "annotations/human_annotation_pending_tasks.parquet", 500),
        ("ground_truth_annotations.json", "annotations/review_human_annotations.parquet", 100),
    ]

    for filename, relpath, expected_count in targets:
        src_path = os.path.join(DATASET_DIR, relpath)
        assert os.path.exists(src_path), f"Missing source file: {src_path}"
        df = pd.read_parquet(src_path)
        assert len(df) == expected_count, f"Count mismatch for {filename}: expected {expected_count}, got {len(df)}"
        
        # Clean records recursively so no NaN values exist in standard JSON
        raw_records = df.to_dict(orient="records")
        cleaned_records = [
            {k: clean_record(v) for k, v in rec.items()}
            for rec in raw_records
        ]
        
        dest_path = os.path.join(OUT_DIR, filename)
        with open(dest_path, "w", encoding="utf-8") as f:
            json.dump(cleaned_records, f, allow_nan=False)
        print(f"  [OK] {filename:<30} -> {len(cleaned_records):>5} rows extracted")

    print("[SUCCESS] All 9 seed datasets extracted successfully with strictly valid standard JSON.")

if __name__ == "__main__":
    extract_all()
