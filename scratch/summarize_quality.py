import pandas as pd
import numpy as np

df_manifest = pd.read_parquet("data/interim/expanded_image_manifest.parquet")
df_quality = pd.read_parquet("data/processed/image_quality_report.parquet")

print("=== TOTAL RECORD COUNTS ===")
print("Total rows:", len(df_manifest))
print("\nDownload Status Distribution:")
print(df_manifest["download_status"].value_counts(dropna=False))

print("\nQuality Status Distribution:")
print(df_quality["quality_status"].value_counts(dropna=False))

print("\nUsable Flag Distribution:")
print(df_quality["is_usable"].value_counts(dropna=False))

print("\nRelevance Status:")
print(df_quality["relevance_status"].value_counts(dropna=False))

print("\nReadability:")
print(df_quality["is_readable"].value_counts(dropna=False))

print("\n=== OCR METRICS ===")
print("OCR Status Distribution:")
print(df_quality["ocr_status"].value_counts(dropna=False))
print("OCR Text Non-Null Count:", df_manifest["ocr_text"].notna().sum())
print("Has Readable Text (True):", df_manifest["has_readable_text"].sum())
print("Packaging Consistency Scores Non-Null:", df_manifest["packaging_consistency_score"].notna().sum())
if df_manifest["packaging_consistency_score"].notna().sum() > 0:
    ps = df_manifest["packaging_consistency_score"].dropna()
    print(f"Packaging Score Mean: {ps.mean():.4f}, Std: {ps.std():.4f}, Min: {ps.min():.4f}, Max: {ps.max():.4f}")

print("\n=== DUPLICATE ANALYSIS ===")
print("Exact Duplicates (is_exact_duplicate == True):", df_manifest["is_exact_duplicate"].sum())
valid_sha = df_manifest[df_manifest["content_hash_sha256"].notna()]
print("Total with valid SHA-256:", len(valid_sha))
print("Distinct SHA-256 hashes:", valid_sha["content_hash_sha256"].nunique())
dup_sha_groups = valid_sha[valid_sha.duplicated("content_hash_sha256", keep=False)]
print("Exact duplicate SHA-256 groups count:", dup_sha_groups["content_hash_sha256"].nunique())
print("Total rows in duplicate SHA-256 groups:", len(dup_sha_groups))

print("Near Duplicates (is_near_duplicate == True):", df_manifest["is_near_duplicate"].sum())

print("\n=== LOW QUALITY REASONS ===")
low_q = df_manifest[df_manifest["quality_status"] == "LOW_QUALITY"]
print("Low Quality Count:", len(low_q))
print("Low Quality Notes Distribution:")
print(low_q["relevance_notes"].value_counts().head(10))

print("\n=== MISSING METADATA AUDIT ===")
cols_to_check = [
    "width", "height", "aspect_ratio", "image_format", "file_size_bytes",
    "content_hash_sha256", "perceptual_hash_dhash", "sharpness_score",
    "mean_luminance", "contrast_std"
]
downloaded = df_manifest[df_manifest["download_status"] == "DOWNLOADED"]
print("Downloaded rows:", len(downloaded))
for c in cols_to_check:
    missing_count = downloaded[c].isna().sum()
    print(f"  {c}: {missing_count} missing out of {len(downloaded)}")

print("\n=== BREAKDOWN BY MARKETPLACE ===")
for mkt in df_manifest["marketplace"].unique():
    sub = df_manifest[df_manifest["marketplace"] == mkt]
    total_mkt = len(sub)
    dl_mkt = (sub["download_status"] == "DOWNLOADED").sum()
    usable_mkt = sub["is_usable"].sum()
    val_mkt = (sub["quality_status"] == "VALIDATED").sum()
    low_mkt = (sub["quality_status"] == "LOW_QUALITY").sum()
    irrel_mkt = (sub["quality_status"] == "IRRELEVANT").sum()
    dup_mkt = (sub["quality_status"] == "DUPLICATE").sum()
    near_mkt = (sub["quality_status"] == "NEAR_DUPLICATE").sum()
    fail_mkt = (sub["quality_status"] == "DOWNLOAD_FAILED").sum()
    
    print(f"\n--- Marketplace: {mkt} (Total: {total_mkt}) ---")
    print(f"  Downloaded: {dl_mkt} ({dl_mkt/total_mkt*100:.2f}%)")
    print(f"  Usable: {usable_mkt} ({usable_mkt/total_mkt*100:.2f}%)")
    print(f"  Validated: {val_mkt} ({val_mkt/total_mkt*100:.2f}%)")
    print(f"  Low Quality: {low_mkt} ({low_mkt/total_mkt*100:.2f}%)")
    print(f"  Duplicate (Exact): {dup_mkt} ({dup_mkt/total_mkt*100:.2f}%)")
    print(f"  Near Duplicate: {near_mkt} ({near_mkt/total_mkt*100:.2f}%)")
    print(f"  Irrelevant Placeholder: {irrel_mkt} ({irrel_mkt/total_mkt*100:.2f}%)")
    print(f"  Download Failed: {fail_mkt} ({fail_mkt/total_mkt*100:.2f}%)")
    
    dl_sub = sub[sub["download_status"] == "DOWNLOADED"]
    if len(dl_sub) > 0:
        print(f"  Avg Dimensions: {dl_sub['width'].mean():.1f} x {dl_sub['height'].mean():.1f} px")
        print(f"  Avg File Size: {dl_sub['file_size_bytes'].mean()/1024:.1f} KB")
        print(f"  Avg Sharpness: {dl_sub['sharpness_score'].mean():.1f}")
        print(f"  Avg Luminance: {dl_sub['mean_luminance'].mean():.1f} (0-255)")
        print(f"  Avg Contrast: {dl_sub['contrast_std'].mean():.1f}")
        print(f"  Readable OCR Text: {dl_sub['has_readable_text'].sum()} ({dl_sub['has_readable_text'].mean()*100:.2f}%)")
