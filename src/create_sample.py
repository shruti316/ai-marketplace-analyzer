import os
import pandas as pd

# Create interim folder if it does not exist
os.makedirs("data/interim", exist_ok=True)

# Load review data
reviews = pd.read_parquet(
    "data/raw/amazon/all_beauty_reviews.parquet"
)

# Take a reproducible sample of 20,000 reviews
reviews = reviews.sample(
    n=20_000,
    random_state=42
)

# Keep useful review columns
reviews = reviews[
    [
        "rating",
        "title",
        "text",
        "asin",
        "parent_asin",
        "user_id",
        "timestamp",
        "helpful_vote",
        "verified_purchase",
    ]
]

# Load product metadata
metadata = pd.read_parquet(
    "data/raw/amazon/all_beauty_metadata.parquet"
)

# Keep useful product columns
metadata = metadata[
    [
        "main_category",
        "title",
        "average_rating",
        "rating_number",
        "price",
        "store",
        "details",
        "parent_asin",
    ]
]

# Make sure each product appears only once
metadata = metadata.drop_duplicates(
    subset="parent_asin"
)

# Connect reviews with product information
combined = reviews.merge(
    metadata,
    on="parent_asin",
    how="left",
    suffixes=("_review", "_product")
)

# Save working dataset
output_path = "data/interim/all_beauty_sample.parquet"

combined.to_parquet(
    output_path,
    index=False
)

# Display results
print("SAMPLE ROWS:", len(combined))
print(
    "MATCHED PRODUCTS:",
    combined["title_product"].notna().sum()
)
print("SAVED:", output_path)