import pandas as pd
import numpy as np

reviews = pd.read_parquet("data/processed/canonical_reviews.parquet")
products = pd.read_parquet("data/processed/canonical_products.parquet")

print("=== CANONICAL REVIEWS ===")
print("Shape:", reviews.shape)
print("Unique canonical_review_id:", reviews["canonical_review_id"].nunique())
print("Unique source_review_id:", reviews["source_review_id"].nunique())
print("Marketplace distribution:")
print(reviews["marketplace"].value_counts())
print("\nProduct references in reviews:")
print("Unique canonical_product_id in reviews:", reviews["canonical_product_id"].nunique())
print("Are all canonical_product_id in products table?", reviews["canonical_product_id"].isin(products["canonical_product_id"]).all())

print("\nMissing/Empty text check:")
print("review_text is NA:", reviews["review_text"].isna().sum())
print("review_title is NA:", reviews["review_title"].isna().sum())
print("Empty or whitespace review_text:", reviews["review_text"].astype(str).str.strip().eq("").sum())
print("Short review_text (< 5 chars):", (reviews["review_text"].astype(str).str.strip().str.len() < 5).sum())

print("\nRatings check:")
print("Rating describe:\n", reviews["rating"].describe())
print("Rating value counts:\n", reviews["rating"].value_counts().sort_index())

print("\nTimestamps check:")
print("timestamp NA:", reviews["timestamp"].isna().sum())
print("review_date NA:", reviews["review_date"].isna().sum())
print("Sample timestamp values:", reviews["timestamp"].dropna().head())
print("Sample review_date values:", reviews["review_date"].dropna().head())

print("\nGround truth labels:")
print("ground_truth_label value counts:\n", reviews["ground_truth_label"].value_counts(dropna=False))

print("\n=== JOINING PRODUCTS AND REVIEWS ===")
merged = reviews.merge(products[["canonical_product_id", "category", "subcategory", "brand", "price"]], on="canonical_product_id", how="left")
print("Merged shape:", merged.shape)
print("Category distribution in merged reviews:")
print(merged["category"].value_counts(dropna=False))
print("\nMarketplace x Category crosstab:")
print(pd.crosstab(merged["marketplace"], merged["category"]))

print("\nProduct review count distribution across canonical_reviews:")
rev_counts_per_product = merged.groupby("canonical_product_id").size()
print(rev_counts_per_product.describe())
print("Products with 1 review:", (rev_counts_per_product == 1).sum(), f"({(rev_counts_per_product == 1).mean():.1%})")
print("Products with >= 2 reviews:", (rev_counts_per_product >= 2).sum(), f"({(rev_counts_per_product >= 2).mean():.1%})")
print("Products with >= 5 reviews:", (rev_counts_per_product >= 5).sum(), f"({(rev_counts_per_product >= 5).mean():.1%})")
print("Products with >= 10 reviews:", (rev_counts_per_product >= 10).sum(), f"({(rev_counts_per_product >= 10).mean():.1%})")
