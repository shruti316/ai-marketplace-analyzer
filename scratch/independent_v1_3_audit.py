import os
import sys
import json
import hashlib
from pathlib import Path
import pandas as pd
import numpy as np

v13_dir = Path("data/marketplace_trust_dataset_v1.3")

print("=== PART A: RELEASE VERIFICATION ===")

# 1. 30 Tables & Schemas
print("\n--- 1. Tables and Schemas ---")
manifest_file = v13_dir / "manifests" / "dataset_manifest.json"
with open(manifest_file, "r", encoding="utf-8") as f:
    manifest = json.load(f)

table_counts = {}
for rel_path, meta in manifest["tables"].items():
    p = v13_dir / rel_path
    if p.suffix == ".parquet":
        df = pd.read_parquet(p)
        table_counts[rel_path] = (len(df), len(df.columns), list(df.columns)[:5])
    elif p.suffix == ".csv":
        df = pd.read_csv(p)
        table_counts[rel_path] = (len(df), len(df.columns), list(df.columns)[:5])
    else:
        table_counts[rel_path] = ("N/A", "N/A", [])

print(f"Total tables: {len(table_counts)}")
for t, (rc, cc, cols) in sorted(table_counts.items()):
    print(f" - {t}: {rc} rows, {cc} cols, cols={cols}")

# 2. Physical image files & product mappings
print("\n--- 2. Physical Images & Product Mappings ---")
images_df = pd.read_parquet(v13_dir / "evidence" / "images.parquet")
print(f"Total images table rows: {len(images_df)}")
print(f"Usable images: {images_df['is_usable'].sum()}")
print(f"Download status breakdown:\n{images_df['download_status'].value_counts()}")

usable_imgs = images_df[images_df["is_usable"]]
missing_files = []
zero_byte_files = []
for idx, row in usable_imgs.iterrows():
    lp = row["local_path"]
    if not lp or not os.path.exists(lp):
        missing_files.append((row["image_id"], lp))
    else:
        sz = os.path.getsize(lp)
        if sz == 0:
            zero_byte_files.append((row["image_id"], lp))

print(f"Missing physical image files on disk: {len(missing_files)}")
print(f"Zero-byte physical image files on disk: {len(zero_byte_files)}")

# Check product mappings
prods_df = pd.read_parquet(v13_dir / "entities" / "products.parquet")
prod_ids = set(prods_df["canonical_product_id"])
img_prod_ids = set(images_df["canonical_product_id"])
invalid_img_pids = img_prod_ids - prod_ids
print(f"Images with invalid canonical_product_id FK: {len(invalid_img_pids)}")

# 3. Five Indian Complete Multimodal Products
print("\n--- 3. Five Indian Complete Multimodal Products ---")
ind_mm = pd.read_parquet(v13_dir / "collections" / "indian_complete_multimodal.parquet")
print(f"Indian complete multimodal products count: {len(ind_mm)}")
print("Products detail:")
for _, r in ind_mm.iterrows():
    pid = r["canonical_product_id"]
    p_row = prods_df[prods_df["canonical_product_id"] == pid].iloc[0]
    p_imgs = images_df[images_df["canonical_product_id"] == pid]
    # check reviews
    revs_df = pd.read_parquet(v13_dir / "evidence" / "reviews.parquet")
    p_revs = revs_df[revs_df["canonical_product_id"] == pid]
    # check prices
    prices_df = pd.read_parquet(v13_dir / "evidence" / "price_observations.parquet")
    p_prices = prices_df[prices_df["canonical_product_id"] == pid]
    
    print(f"PID: {pid} | Title: {p_row['product_title'][:40]} | Mkt: {p_row['marketplace']} | Price INR: {p_prices['normalized_price_inr'].values} | Imgs: {len(p_imgs)} (Usable: {p_imgs['is_usable'].sum()}) | Revs: {len(p_revs)}")

# 4. Review Accounting Manifest & Review Records
print("\n--- 4. Review Accounting Manifest & Reviews ---")
acc_df = pd.read_parquet(v13_dir / "manifests" / "review_accounting.parquet")
print("Review Accounting Table:")
print(acc_df.to_string())
print(f"Total reviews in evidence/reviews.parquet: {len(revs_df)}")
print(f"Linked reviews: {(revs_df['linkage_type'] != 'UNLINKED').sum()}")
print(f"Unlinked reviews: {(revs_df['linkage_type'] == 'UNLINKED').sum()}")
print("Rating value counts:\n", revs_df["rating"].value_counts().sort_index())
print("Marketplace review breakdown:\n", revs_df["marketplace"].value_counts())
print("Languages:\n", revs_df["language"].value_counts())
print("Verified purchase status:\n", revs_df["verified_purchase_status"].value_counts())

# 5. Relationship Edges
print("\n--- 5. Relationship Edges ---")
edges_df = pd.read_parquet(v13_dir / "relationships" / "entity_relationships.parquet")
print(f"Total edges: {len(edges_df)}")
print("Edge types:\n", edges_df["relationship_type"].value_counts())
# FK integrity
source_types = edges_df["source_entity_type"].value_counts()
target_types = edges_df["target_entity_type"].value_counts()
print(f"Source entity types: {source_types.to_dict()}")
print(f"Target entity types: {target_types.to_dict()}")

# Check orphan edges
prod_edges = edges_df[edges_df["source_entity_type"] == "PRODUCT"]
orphan_prods = set(prod_edges["source_entity_id"]) - prod_ids
print(f"Orphan product sources in edges: {len(orphan_prods)}")

# 6. Cross-Modal Evidence
print("\n--- 6. Cross-Modal Evidence ---")
xmod_df = pd.read_parquet(v13_dir / "derived_evidence" / "cross_modal_evidence.parquet")
print(f"Total cross-modal evidence records: {len(xmod_df)}")
print("Investigation types:\n", xmod_df["investigation_type"].value_counts())
print("Modality pairs:\n", xmod_df["modality_pair"].value_counts())
print("Severity levels:\n", xmod_df["signal_severity"].value_counts())

# 7. Train, Val, Test Manifests
print("\n--- 7. Evaluation Manifests ---")
train_m = pd.read_parquet(v13_dir / "evaluation" / "train_manifest.parquet")
val_m = pd.read_parquet(v13_dir / "evaluation" / "validation_manifest.parquet")
test_m = pd.read_parquet(v13_dir / "evaluation" / "test_manifest.parquet")
print(f"Train: {len(train_m)}, Val: {len(val_m)}, Test: {len(test_m)}, Sum: {len(train_m) + len(val_m) + len(test_m)}")
train_pids = set(train_m["canonical_product_id"])
val_pids = set(val_m["canonical_product_id"])
test_pids = set(test_m["canonical_product_id"])
print(f"Train & Val intersection: {len(train_pids & val_pids)}")
print(f"Train & Test intersection: {len(train_pids & test_pids)}")
print(f"Val & Test intersection: {len(val_pids & test_pids)}")

# 8. v1.1 and v1.2 Immutability
print("\n--- 8. v1.1 and v1.2 Immutability ---")
v11_m_path = Path("data/marketplace_trust_dataset_v1.1/metadata/dataset_manifest.json")
v12_m_path = Path("data/marketplace_trust_dataset_v1.2/manifests/dataset_manifest.json")
print(f"v1.1 manifest exists: {v11_m_path.exists()}")
if v11_m_path.exists():
    with open(v11_m_path, "r", encoding="utf-8") as fp:
        v11_meta = json.load(fp)
    print(f"v1.1 version: {v11_meta.get('version') or v11_meta.get('release_version')}, status: {v11_meta.get('release_state') or v11_meta.get('release_status')}")
    print(f"v1.1 SHA-256: {hashlib.sha256(v11_m_path.read_bytes()).hexdigest()}")

print(f"v1.2 manifest exists: {v12_m_path.exists()}")
if v12_m_path.exists():
    with open(v12_m_path, "r", encoding="utf-8") as fp:
        v12_meta = json.load(fp)
    print(f"v1.2 version: {v12_meta.get('release_version')}, status: {v12_meta.get('release_status')}, verdict: {v12_meta.get('certification_verdict')}")
    print(f"v1.2 SHA-256: {hashlib.sha256(v12_m_path.read_bytes()).hexdigest()}")

# 9. 16 Protected Baselines
print("\n--- 9. 16 Protected Baselines ---")
from src.data.curation.validate_marketplace_trust_dataset_v1_3 import MarketplaceTrustDatasetValidatorV13
val_instance = MarketplaceTrustDatasetValidatorV13()
ref_hashes = val_instance.PROTECTED_BASELINE_HASHES
baseline_matches = 0
for p_str, exp_hash in ref_hashes.items():
    p = Path(p_str)
    if not p.exists():
        print(f"MISSING: {p_str}")
    else:
        act_hash = hashlib.sha256(p.read_bytes()).hexdigest()
        if act_hash == exp_hash:
            baseline_matches += 1
        else:
            print(f"HASH MISMATCH on baseline {p_str}: expected {exp_hash[:12]}, got {act_hash[:12]}")
print(f"16 Protected Baselines matching bit-perfect: {baseline_matches} / {len(ref_hashes)}")
