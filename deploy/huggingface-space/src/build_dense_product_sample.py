"""
build_dense_product_sample.py
-----------------------------
Production data extraction pipeline for the AI Marketplace Analyzer.

Generates a complementary dense product cohort from raw Amazon Reviews'23
files while preserving all existing processed datasets.

Outputs:
- data/interim/dense_products.parquet      (300 products, 100% price coverage, >=10 reviews)
- data/interim/dense_reviews.parquet       (Capped at 40 reviews/product, with parent_asin FK)
- data/interim/dense_product_images.parquet (Live CDN image URLs linked to parent_asin)
"""

import os
import logging
import hashlib
import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


def format_text_list(val) -> str:
    """Helper to cleanly flatten raw numpy arrays / lists of strings into clean text."""
    if val is None:
        return ""
    if isinstance(val, (list, np.ndarray)):
        return " ".join([str(x).strip() for x in val if x is not None and str(x).strip()])
    return str(val).strip()


def build_dense_sample(
    raw_meta_path: str = "data/raw/amazon/all_beauty_metadata.parquet",
    raw_rev_path: str = "data/raw/amazon/all_beauty_reviews.parquet",
    output_dir: str = "data/interim",
    min_reviews_per_product: int = 10,
    target_products: int = 300,
    max_reviews_per_product: int = 40,
    random_state: int = 42,
) -> dict:
    os.makedirs(output_dir, exist_ok=True)
    logging.info("==================================================")
    logging.info("Starting Dense Product Cohort Generation Pipeline")
    logging.info("==================================================")

    # 1. Load Raw Metadata
    logging.info("Step 1: Loading raw metadata from %s...", raw_meta_path)
    meta = pd.read_parquet(
        raw_meta_path,
        columns=[
            "parent_asin",
            "title",
            "main_category",
            "average_rating",
            "rating_number",
            "price",
            "store",
            "details",
            "images",
            "description",
            "features",
        ],
    )
    meta = meta.drop_duplicates(subset=["parent_asin"]).copy()
    logging.info("Loaded %d unique catalog products.", len(meta))

    # Parse numeric price
    meta["price_numeric"] = pd.to_numeric(meta["price"].replace("None", np.nan), errors="coerce")

    # 2. Compute Review Counts from Full Raw Reviews
    logging.info("Step 2: Counting reviews per product from %s...", raw_rev_path)
    rev_counts = pd.read_parquet(raw_rev_path, columns=["parent_asin"])["parent_asin"].value_counts()
    meta["full_review_count"] = meta["parent_asin"].map(rev_counts).fillna(0).astype(int)

    # 3. Filter Candidate Products (Valid Positive Price & >= min_reviews)
    candidates = meta[
        (meta["price_numeric"].notna())
        & (meta["price_numeric"] > 0)
        & (meta["full_review_count"] >= min_reviews_per_product)
    ].copy()

    total_qualifying = len(candidates)
    logging.info(
        "Identified %d qualifying products with valid positive price and >= %d reviews.",
        total_qualifying,
        min_reviews_per_product,
    )

    if total_qualifying == 0:
        raise ValueError("No products met the qualification criteria!")

    # 4. Reproducible Sampling of Target Products
    n_sample = min(target_products, total_qualifying)
    selected_products = candidates.sample(n=n_sample, random_state=random_state).copy()
    selected_asins = set(selected_products["parent_asin"])
    logging.info("Selected %d products for the dense cohort (seed=%d).", len(selected_products), random_state)

    # 5. Extract and Cap Reviews for Selected Products
    logging.info("Step 3: Extracting and sampling reviews for selected products...")
    full_rev = pd.read_parquet(raw_rev_path)
    matched_rev = full_rev[full_rev["parent_asin"].isin(selected_asins)].copy()

    # Reproducible sampling per product up to max_reviews_per_product
    shuffled_rev = matched_rev.sample(frac=1.0, random_state=random_state)
    capped_rev = (
        shuffled_rev.groupby("parent_asin", as_index=False)
        .head(max_reviews_per_product)
        .copy()
        .reset_index(drop=True)
    )

    # Convert timestamp to standard datetime
    if np.issubdtype(capped_rev["timestamp"].dtype, np.integer):
        capped_rev["timestamp"] = pd.to_datetime(capped_rev["timestamp"], unit="ms")
    else:
        capped_rev["timestamp"] = pd.to_datetime(capped_rev["timestamp"])

    # Build review_text (title + text)
    title_clean = capped_rev["title"].fillna("").astype(str).str.strip()
    text_clean = capped_rev["text"].fillna("").astype(str).str.strip()
    capped_rev["review_text"] = (title_clean + " " + text_clean).str.strip()

    # Build deterministic review_id hash
    def make_review_id(row):
        h = hashlib.sha256()
        h.update(str(row["user_id"]).encode("utf-8"))
        h.update(str(row["asin"]).encode("utf-8"))
        h.update(str(row["timestamp"]).encode("utf-8"))
        return h.hexdigest()[:16]

    capped_rev["review_id"] = capped_rev.apply(make_review_id, axis=1)

    logging.info(
        "Extracted %d total reviews across %d products (mean %.1f reviews/product).",
        len(capped_rev),
        capped_rev["parent_asin"].nunique(),
        len(capped_rev) / capped_rev["parent_asin"].nunique(),
    )

    # 6. Extract Normalized Product Images Table
    logging.info("Step 4: Extracting relational product images...")
    image_records = []
    for _, row in selected_products.iterrows():
        p_asin = row["parent_asin"]
        raw_imgs = row.get("images")
        if isinstance(raw_imgs, dict):
            seen_urls = set()
            idx = 0
            for img_type in ["large", "hi_res", "thumb"]:
                items = raw_imgs.get(img_type, [])
                if hasattr(items, "__iter__") and not isinstance(items, (str, bytes)):
                    for u in items:
                        if u and isinstance(u, str) and u.startswith("http") and u not in seen_urls:
                            seen_urls.add(u)
                            image_records.append(
                                {
                                    "image_id": f"{p_asin}_img_{idx}",
                                    "parent_asin": p_asin,
                                    "image_type": "primary" if idx == 0 else img_type,
                                    "image_url": u,
                                    "image_index": idx,
                                }
                            )
                            idx += 1

    df_images = pd.DataFrame(image_records)
    logging.info(
        "Extracted %d image URLs across %d products (mean %.1f images/product).",
        len(df_images),
        df_images["parent_asin"].nunique(),
        len(df_images) / df_images["parent_asin"].nunique(),
    )

    # 7. Final Clean Products Table
    selected_products["description_text"] = selected_products["description"].apply(format_text_list)
    selected_products["features_text"] = selected_products["features"].apply(format_text_list)
    selected_products["store"] = selected_products["store"].fillna("Unknown")

    clean_prod_cols = [
        "parent_asin",
        "title",
        "main_category",
        "store",
        "price_numeric",
        "average_rating",
        "rating_number",
        "full_review_count",
        "description_text",
        "features_text",
        "details",
    ]
    df_products = selected_products[clean_prod_cols].rename(columns={"price_numeric": "price"}).copy()

    # 8. Clean Reviews Columns
    clean_rev_cols = [
        "review_id",
        "parent_asin",
        "asin",
        "user_id",
        "rating",
        "title",
        "text",
        "review_text",
        "timestamp",
        "helpful_vote",
        "verified_purchase",
    ]
    df_reviews_clean = capped_rev[clean_rev_cols].copy()

    # 9. Save Files Non-Destructively
    prod_path = os.path.join(output_dir, "dense_products.parquet")
    rev_path = os.path.join(output_dir, "dense_reviews.parquet")
    img_path = os.path.join(output_dir, "dense_product_images.parquet")

    df_products.to_parquet(prod_path, index=False)
    df_reviews_clean.to_parquet(rev_path, index=False)
    df_images.to_parquet(img_path, index=False)

    logging.info("Step 5: Successfully saved all relational parquet files:")
    logging.info("  -> Products: %s (%d rows)", prod_path, len(df_products))
    logging.info("  -> Reviews:  %s (%d rows)", rev_path, len(df_reviews_clean))
    logging.info("  -> Images:   %s (%d rows)", img_path, len(df_images))
    logging.info("Dense product cohort generation finished successfully.")

    return {
        "qualifying_products_in_source": total_qualifying,
        "selected_products": len(df_products),
        "total_reviews": len(df_reviews_clean),
        "mean_reviews_per_product": len(df_reviews_clean) / len(df_products),
        "total_images": len(df_images),
        "prod_path": prod_path,
        "rev_path": rev_path,
        "img_path": img_path,
    }


if __name__ == "__main__":
    build_dense_sample()
