"""
scratch/build_reports_pack.py
------------------------------
Generates all 20 comprehensive certification reports for v1.1 release.
"""

import os
import json
import hashlib
from pathlib import Path
import pandas as pd
import numpy as np

CERT_DIR = Path("reports/certification_v1.1")
REPORTS_DIR = Path("reports")
CERT_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

DATA_DIR = Path("data/marketplace_trust_dataset_v1.1")

def save_report(filename: str, content: str):
    p1 = CERT_DIR / filename
    p2 = REPORTS_DIR / filename
    with open(p1, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    with open(p2, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    print(f"Generated: {filename} ({len(content)} chars)")

# Load manifest and tables for exact dynamic data
manifest = json.load(open(DATA_DIR / "metadata/dataset_manifest.json", encoding="utf-8"))
products = pd.read_parquet(DATA_DIR / "entities/products.parquet")
sellers = pd.read_parquet(DATA_DIR / "entities/sellers.parquet")
images = pd.read_parquet(DATA_DIR / "evidence/images.parquet")
reviews = pd.read_parquet(DATA_DIR / "evidence/reviews.parquet")
prices = pd.read_parquet(DATA_DIR / "evidence/price_observations.parquet")
edges = pd.read_parquet(DATA_DIR / "evidence_relationships/entity_relationships.parquet")
xmod = pd.read_parquet(DATA_DIR / "evidence_relationships/cross_modal_evidence.parquet")
tier_a = pd.read_parquet(DATA_DIR / "collections/complete_multimodal_core.parquet")
tier_b = pd.read_parquet(DATA_DIR / "collections/partial_modalities.parquet")
sources = pd.read_parquet(DATA_DIR / "metadata/source_registry.parquet")
taxonomy = pd.read_parquet(DATA_DIR / "metadata/label_taxonomy.parquet")
accounting = pd.read_parquet(DATA_DIR / "metadata/review_accounting_table.parquet")
train_split = pd.read_parquet(DATA_DIR / "evaluation/train_manifest.parquet")
val_split = pd.read_parquet(DATA_DIR / "evaluation/validation_manifest.parquet")
test_split = pd.read_parquet(DATA_DIR / "evaluation/test_manifest.parquet")
acq_manifest = pd.read_csv(DATA_DIR / "manifests/image_acquisition_manifest.csv")

print("All tables successfully loaded into memory for report generation.")
