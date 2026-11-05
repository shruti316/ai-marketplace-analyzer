import hashlib
import json
from pathlib import Path
import numpy as np
import pandas as pd

print("==================================================")
print("STAGE 3 MANDATORY VALIDATION SUITE")
print("==================================================")

# 1. Load artifacts
manifest_path = Path("data/interim/expanded_image_manifest.parquet")
matrix_path = Path("data/processed/expanded_image_embeddings_resnet18.npy")
meta_path = Path("data/processed/expanded_image_embeddings_metadata.parquet")
report_path = Path("data/processed/expanded_embedding_extraction_report.json")

df_manifest = pd.read_parquet(manifest_path)
eligible_df = df_manifest[df_manifest["is_usable"].eq(True)].copy().reset_index(drop=True)
matrix = np.load(matrix_path)
df_meta = pd.read_parquet(meta_path)
with open(report_path) as f:
    report = json.load(f)

# Check 1: Exactly 5,887 eligible records represented
c1 = len(matrix) == 5887 and len(df_meta) == 5887 and len(eligible_df) == 5887
print(f"Check 1: Exactly 5,887 records -> {'PASS' if c1 else 'FAIL'} (matrix={len(matrix)}, meta={len(df_meta)})")

# Check 2: Every eligible image ID appears exactly once in metadata
c2 = df_meta["image_id"].is_unique and set(df_meta["image_id"]) == set(eligible_df["image_id"])
print(f"Check 2: Every eligible image ID appears exactly once -> {'PASS' if c2 else 'FAIL'} (unique={df_meta['image_id'].nunique()})")

# Check 3: No ineligible image included
ineligible_ids = set(df_manifest[~df_manifest["is_usable"]]["image_id"])
c3 = len(ineligible_ids.intersection(set(df_meta["image_id"]))) == 0
print(f"Check 3: No ineligible image included -> {'PASS' if c3 else 'FAIL'} (overlap={len(ineligible_ids.intersection(set(df_meta['image_id'])))})")

# Check 4: Embedding matrix has 512 columns
c4 = matrix.shape == (5887, 512)
print(f"Check 4: Embedding matrix shape is (5887, 512) -> {'PASS' if c4 else 'FAIL'} (shape={matrix.shape})")

# Check 5: Every embedding contains finite values
c5 = np.isfinite(matrix).all()
print(f"Check 5: Finite values -> {'PASS' if c5 else 'FAIL'}")

# Check 6: No NaN or infinity
c6 = (not np.isnan(matrix).any()) and (not np.isinf(matrix).any())
print(f"Check 6: No NaN or Inf -> {'PASS' if c6 else 'FAIL'}")

# Check 7: Every vector has L2 norm approx 1.0 (atol=1e-4)
norms = np.linalg.norm(matrix, axis=1)
c7 = np.allclose(norms, 1.0, atol=1e-4)
print(f"Check 7: Unit L2 norms (atol=1e-4) -> {'PASS' if c7 else 'FAIL'} (min={norms.min():.6f}, max={norms.max():.6f}, mean={norms.mean():.6f})")

# Check 8: Every metadata embedding_index points to the correct vector row
indices_aligned = True
for idx in range(len(df_meta)):
    if df_meta.iloc[idx]["embedding_index"] != idx:
        indices_aligned = False
        break
print(f"Check 8: Metadata embedding_index alignment -> {'PASS' if indices_aligned else 'FAIL'}")

# Check 9: Duplicate-vector reuse preserves all original image IDs
reused_rows = df_meta[df_meta["embedding_extraction_status"] == "SUCCESS_REUSED_DUPLICATE"]
reused_all_present = len(reused_rows) == 330
reused_identical_vectors = True
for _, r in reused_rows.iterrows():
    curr_idx = r["embedding_index"]
    source_id = r["embedding_source_image_id"]
    source_idx = df_meta[df_meta["image_id"] == source_id]["embedding_index"].iloc[0]
    if not np.array_equal(matrix[curr_idx], matrix[source_idx]):
        reused_identical_vectors = False
        break
c9 = reused_all_present and reused_identical_vectors
print(f"Check 9: Duplicate-vector reuse preserves original image IDs & vectors -> {'PASS' if c9 else 'FAIL'} (count={len(reused_rows)}, identical={reused_identical_vectors})")

# Check 10: No missing or broken local paths among eligible records
broken_paths = [p for p in df_meta["local_path"] if not Path(p).exists()]
c10 = len(broken_paths) == 0
print(f"Check 10: No broken local paths on disk -> {'PASS' if c10 else 'FAIL'} (broken={len(broken_paths)})")

# Check 11: Checkpoint recovery does not create duplicate metadata records
c11 = df_meta["image_id"].duplicated().sum() == 0 and len(df_meta) == 5887
print(f"Check 11: No duplicate metadata records from checkpoint recovery -> {'PASS' if c11 else 'FAIL'}")

# Check 12: Original pilot embedding files remain byte-for-byte unchanged
expected_hashes = {
    "data/processed/canonical_images.parquet": (495330, "bdae434ef284fa8e7f600c65b4dd6a8be04c77b464d20bce0d7641005cbc5187"),
    "data/processed/image_embeddings_resnet18.npy": (1065088, "204d3c4269de94bb628cf6963a3ab524d20a0a1d462db1ee4117a225e3957e4c"),
    "data/processed/image_embeddings_resnet18_metadata.parquet": (15029, "2efe37104caf761bf44c1710672f84c415cd623cef17bf7a8e675550ebb1f6f8"),
}

c12 = True
for f_path, (exp_sz, exp_sha) in expected_hashes.items():
    p = Path(f_path)
    curr_sz = p.stat().st_size
    curr_sha = hashlib.sha256(p.read_bytes()).hexdigest()
    if curr_sz != exp_sz or curr_sha != exp_sha:
        print(f"  FAIL: {f_path} changed! Expected ({exp_sz}, {exp_sha[:8]}), got ({curr_sz}, {curr_sha[:8]})")
        c12 = False
    else:
        print(f"  OK: {f_path} matches byte-for-byte (SHA256: {curr_sha[:16]}...)")

print(f"Check 12: Original pilot embedding files unchanged -> {'PASS' if c12 else 'FAIL'}")

# Summary
all_passed = all([c1, c2, c3, c4, c5, c6, c7, indices_aligned, c9, c10, c11, c12])
print("\n==================================================")
print(f"ALL 12 MANDATORY VALIDATIONS: {'ALL PASSED' if all_passed else 'SOME FAILED'}")
print("==================================================")
