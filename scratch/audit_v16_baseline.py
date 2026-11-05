"""
Phase 1: Complete Repository and Release Audit Script
Audits v1.6 dataset tables, checks protected baselines, and generates exact inventory.
"""
from pathlib import Path
import json
import hashlib
import pandas as pd
import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parent.parent
V16_DIR = PROJECT_ROOT / "data" / "marketplace_trust_dataset_v1.6"

PROTECTED_BASELINE_HASHES = {
    "data/processed/canonical_products.parquet": "b0a27e4803d5bf76d025da1abea2045e3920e61b26cf72343c5a0e6465e5cd0e",
    "data/processed/canonical_reviews.parquet": "17aa47d8aa60e447ce673e83fe2d8336e10c357c3afeb4e0a63503e46a01323c",
    "data/processed/canonical_images.parquet": "bdae434ef284fa8e7f600c65b4dd6a8be04c77b464d20bce0d7641005cbc5187",
    "data/processed/canonical_relationships.parquet": "490a37c8dfab90195778a6f43003c2704d9a5beb8a1204544037ce81c1ebced9",
    "data/processed/image_quality_report.parquet": "4acfcbeff74ba226ab69a7f513d6b0d487980e8b3f4631b7979e0c5a6616ca9a",
    "data/processed/review_corpus_unlinked.parquet": "7d7abde9d0962fdb03655a877cf327930a889f0e12b9dd5fced0525fe7e59613",
    "data/curated/curated_products_5684.parquet": "abcdb9e0e729d26113d9781910c614a8f36f1fee5f88aabbe18430666baa9024",
    "data/curated/curated_products_20000.parquet": "b2df7c98b8fb95d66e07727028b7b778e28cca615f376480a26e5c29b1145cc4",
    "data/curated/cohort_membership_20000.parquet": "961f992eeebd4df5dd6c0c7ac811e14a5ee0d45797c792caa99fbffe7675b461",
    "data/curated/cohort_metadata_20000.json": "050656b487b1a0321d009b2cfbd3972a959e4758deca973f33ebe57f500acf2c",
    "data/indian_marketplace/processed/indian_products.parquet": "a8ce91c897fa6639f2bee06b54fdefbf8524d6de497f9b3a4dcd878732ecc53b",
    "data/indian_marketplace/processed/indian_reviews.parquet": "cf1a3c7f3a0758bcbefec983355e862b1cb142bfd78abee63d3462c79f52ed62",
    "data/indian_marketplace/processed/indian_reviews_linked.parquet": "0bcebae7e37734406076c0176f56216030659f4f091cdd777ea0be59e2a3ffa8",
    "data/indian_marketplace/processed/indian_images.parquet": "f605ae7aa29aba550900aaadd5771fe4193168bffc09412ab5bb4e6c4ac18499",
    "data/indian_marketplace/processed/indian_complete_multimodal.parquet": "b052def824cfae44dcbb862ca42d49b87cf537a24e8aa90663e2ed8ee79c410b",
    "data/indian_marketplace/processed/indian_dataset_metadata.json": "fb8b9aaaaafc88ec828e2d067aee988e25449da7961efc01d48f422f2299b534",
}

def sha256_of_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()

print("=== 1. Verifying Protected Baseline Files ===")
baseline_results = {}
for rel_path, exp_hash in PROTECTED_BASELINE_HASHES.items():
    p = PROJECT_ROOT / rel_path
    if not p.exists():
        baseline_results[rel_path] = "MISSING"
    else:
        act_hash = sha256_of_file(p)
        baseline_results[rel_path] = "MATCH" if act_hash == exp_hash else f"MISMATCH ({act_hash[:8]} vs {exp_hash[:8]})"
print(pd.Series(baseline_results))

print("\n=== 2. Auditing Release v1.6 Tables ===")
inventory = []
for p in sorted(V16_DIR.rglob("*")):
    if p.is_file() and p.suffix in [".parquet", ".csv", ".json", ".npz"]:
        rel_path = str(p.relative_to(V16_DIR)).replace("\\", "/")
        size_kb = p.stat().st_size / 1024
        rows = None
        cols = None
        if p.suffix == ".parquet":
            try:
                df = pd.read_parquet(p)
                rows = len(df)
                cols = len(df.columns)
            except Exception as e:
                rows = f"Err: {e}"
        elif p.suffix == ".csv":
            try:
                df = pd.read_csv(p)
                rows = len(df)
                cols = len(df.columns)
            except Exception as e:
                rows = f"Err: {e}"
        inventory.append({
            "table_path": rel_path,
            "size_kb": round(size_kb, 1),
            "rows": rows,
            "cols": cols
        })

inv_df = pd.DataFrame(inventory)
print(inv_df.to_string())

# Check v1.6 products and reviews
prods = pd.read_parquet(V16_DIR / "entities" / "products.parquet")
revs = pd.read_parquet(V16_DIR / "evidence" / "reviews.parquet")
imgs = pd.read_parquet(V16_DIR / "evidence" / "images.parquet")
prices = pd.read_parquet(V16_DIR / "evidence" / "price_observations.parquet")

print("\n=== 3. Core Counts Summary ===")
print("Total Products:", len(prods))
print("Marketplaces:", prods['marketplace'].value_counts().to_dict())
print("Domain partition:", prods['domain_partition'].value_counts().to_dict())
print("Modality tiers:", prods['modality_tier'].value_counts().to_dict())
print("Total Reviews:", len(revs))
print("Review marketplaces:", revs['marketplace'].value_counts().to_dict())
print("Total Images:", len(imgs), "Usable:", (imgs['is_usable'] == True).sum())
print("Total Prices:", len(prices), "Valid:", (prices['is_valid_price'] == True).sum())
