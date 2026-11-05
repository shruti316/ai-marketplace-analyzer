"""
Generate manifests/flipkart_127_image_target_manifest.csv
for the 127 Flipkart review-bearing products.
"""
from pathlib import Path
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MANIFESTS_DIR = PROJECT_ROOT / "manifests"
MANIFESTS_DIR.mkdir(parents=True, exist_ok=True)

v15_prods = pd.read_parquet(PROJECT_ROOT / "data/marketplace_trust_dataset_v1.5/entities/products.parquet")
v15_revs = pd.read_parquet(PROJECT_ROOT / "data/marketplace_trust_dataset_v1.5/evidence/reviews.parquet")
v15_prices = pd.read_parquet(PROJECT_ROOT / "data/marketplace_trust_dataset_v1.5/evidence/price_observations.parquet")

fk_revs = v15_revs[v15_revs["marketplace"] == "flipkart"]
rev_counts = fk_revs.groupby("canonical_product_id").size().to_dict()

target_ids = sorted(list(rev_counts.keys()))

price_map = v15_prices[v15_prices["canonical_product_id"].isin(target_ids)].set_index("canonical_product_id")["normalized_price_inr"].to_dict()

target_df = v15_prods[v15_prods["canonical_product_id"].isin(target_ids)].copy()
target_df["review_count"] = target_df["canonical_product_id"].map(rev_counts)
target_df["price_inr"] = target_df["canonical_product_id"].map(price_map)

# Target image URL placeholder and acquisition status
target_df["target_image_url"] = ""
target_df["image_source_domain"] = "flipkart.com"
target_df["expected_sha256"] = "PENDING_ACQUISITION"
target_df["acquisition_status"] = "UNACQUIRED_PENDING_APPROVAL"

out_cols = [
    "canonical_product_id",
    "product_title",
    "brand",
    "category",
    "price_inr",
    "review_count",
    "target_image_url",
    "image_source_domain",
    "expected_sha256",
    "acquisition_status",
]

out_df = target_df[out_cols].sort_values("canonical_product_id")
out_path = MANIFESTS_DIR / "flipkart_127_image_target_manifest.csv"
out_df.to_csv(out_path, index=False)
print(f"Generated {out_path} with {len(out_df)} records.")
print(out_df.head(5))
