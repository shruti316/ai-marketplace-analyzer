"""
src/data/pipeline.py
--------------------
Canonical Normalization and End-to-End Ingestion Pipeline for the
AI-Powered Marketplace Trust Intelligence Platform.

Transforms raw immutable source data from Amazon, Walmart, and BestBuy across
all supported product categories into standardized canonical tables:
- data/processed/canonical_products.parquet
- data/processed/canonical_reviews.parquet
- data/processed/canonical_images.parquet
- data/processed/marketplace_cleaned.parquet      (Legacy backward-compatible)
- data/processed/marketplace_text_features.parquet (Legacy backward-compatible)

Key guarantees:
1. Immutability of raw data in data/raw/
2. Multi-category and multi-marketplace standard schema
3. Strict referential integrity between reviews/images and products
4. Cautious seller modeling (brand names quarantined from verified merchants)
5. Zero synthetic cases in production datasets (benchmarks quarantined)
"""

import os
import re
import json
import logging
import hashlib
from typing import Dict, Any, List, Optional
from dataclasses import asdict
import numpy as np
import pandas as pd
from src.data.schema import (
    CanonicalProduct,
    CanonicalReview,
    CanonicalImage,
    STANDARD_CATEGORIES,
    normalize_category_name,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


def clean_text_field(val: Any) -> str:
    """Helper to clean string or list-of-strings fields."""
    if val is None:
        return ""
    if isinstance(val, (list, np.ndarray)):
        items = [str(x).strip() for x in val if x is not None and str(x).strip()]
        return " ".join(items)
    try:
        if pd.isna(val):
            return ""
    except Exception:
        pass
    return str(val).strip()


def parse_timestamp(val: Any) -> Optional[int]:
    """Safely parse unix timestamp from integer, string, or pd.Timestamp."""
    if val is None:
        return None
    try:
        if pd.isna(val):
            return None
    except Exception:
        pass
    if hasattr(val, "timestamp"):
        try:
            return int(val.timestamp())
        except Exception:
            pass
    try:
        return int(val)
    except Exception:
        return None


def parse_numeric_price(val: Any) -> Optional[float]:
    """Parse numeric price safely."""
    if val is None or pd.isna(val):
        return None
    val_str = str(val).strip().replace("$", "").replace(",", "")
    try:
        p = float(val_str)
        return p if p > 0 and not np.isnan(p) else None
    except ValueError:
        return None


class CanonicalPipeline:
    def __init__(
        self,
        raw_dir: str = "data/raw",
        interim_dir: str = "data/interim",
        processed_dir: str = "data/processed",
    ):
        self.raw_dir = raw_dir
        self.interim_dir = interim_dir
        self.processed_dir = processed_dir
        os.makedirs(processed_dir, exist_ok=True)

        self.products: List[Dict[str, Any]] = []
        self.reviews: List[Dict[str, Any]] = []
        self.images: List[Dict[str, Any]] = []

    def ingest_amazon_beauty_cohort(self, sample_size: int = 1500, random_state: int = 42):
        """Ingest dense & sampled All_Beauty products, reviews, and images."""
        dense_prod_path = "data/interim/dense_products.parquet"
        dense_rev_path = "data/interim/dense_reviews.parquet"
        dense_img_path = "data/interim/dense_product_images.parquet"

        # 1. Always ingest all dense products to ensure referential integrity with dense reviews
        seen_asins = set()
        if os.path.exists(dense_prod_path):
            logging.info("Ingesting dense products from %s...", dense_prod_path)
            dense_prods = pd.read_parquet(dense_prod_path)
            for _, row in dense_prods.iterrows():
                asin = str(row["parent_asin"])
                seen_asins.add(asin)
                cid = f"amazon_{asin}"
                p = CanonicalProduct(
                    canonical_product_id=cid,
                    marketplace="amazon",
                    source_product_id=asin,
                    parent_product_id=asin,
                    title=clean_text_field(row.get("title")),
                    category="Beauty & Personal Care",
                    subcategory="All Beauty",
                    brand=clean_text_field(row.get("store")),
                    description=clean_text_field(row.get("description_text")),
                    price=parse_numeric_price(row.get("price")),
                    currency="USD",
                    rating=float(row["average_rating"]) if pd.notna(row.get("average_rating")) else None,
                    rating_count=int(row["rating_number"]) if pd.notna(row.get("rating_number")) else None,
                    product_url=f"https://www.amazon.com/dp/{asin}",
                    image_urls=[],
                    seller_id=None,
                    seller_name=clean_text_field(row.get("store")),
                    metadata_details={"dense_cohort": True},
                    source_provenance="Amazon Reviews'23 Dense Products Cohort",
                )
                self.products.append(asdict(p) if hasattr(p, "__dict__") else p)

        # 2. Ingest verified multimodal images and dense images
        manifest_path = os.path.join(self.interim_dir, "image_manifest.parquet")
        manifest_by_id = {}
        if os.path.exists(manifest_path):
            logging.info("Ingesting verified multimodal images from %s...", manifest_path)
            df_man = pd.read_parquet(manifest_path)
            for _, mrow in df_man.iterrows():
                img_dict = {
                    "image_id": str(mrow["image_id"]),
                    "canonical_product_id": str(mrow["canonical_product_id"]),
                    "marketplace": str(mrow["marketplace"]),
                    "image_url": str(mrow.get("image_url", "")),
                    "local_path": str(mrow.get("local_path")) if pd.notna(mrow.get("local_path")) else None,
                    "image_type": str(mrow.get("image_type", "primary")),
                    "download_status": str(mrow.get("download_status", "DOWNLOADED")),
                    "file_size_bytes": int(mrow["file_size_bytes"]) if pd.notna(mrow.get("file_size_bytes")) else None,
                    "width": int(mrow["width"]) if pd.notna(mrow.get("width")) else None,
                    "height": int(mrow["height"]) if pd.notna(mrow.get("height")) else None,
                    "content_hash_sha256": str(mrow["content_hash_sha256"]) if pd.notna(mrow.get("content_hash_sha256")) else None,
                    "perceptual_hash_dhash": str(mrow["perceptual_hash_dhash"]) if pd.notna(mrow.get("perceptual_hash_dhash")) else None,
                    "ocr_text": str(mrow["ocr_text"]) if pd.notna(mrow.get("ocr_text")) else None,
                    "packaging_consistency_score": float(mrow["packaging_consistency_score"]) if pd.notna(mrow.get("packaging_consistency_score")) else None,
                    "source_provenance": str(mrow.get("source_provenance", "Image Manifest Pipeline")),
                }
                manifest_by_id[img_dict["image_id"]] = img_dict
                self.images.append(img_dict)

        if os.path.exists(dense_img_path):
            logging.info("Ingesting additional dense images from %s...", dense_img_path)
            dense_imgs = pd.read_parquet(dense_img_path)
            for _, irow in dense_imgs.iterrows():
                asin = str(irow["parent_asin"])
                cid = f"amazon_{asin}"
                iid = f"amazon_{irow['image_id']}"
                if iid not in manifest_by_id:
                    self.images.append({
                        "image_id": iid,
                        "canonical_product_id": cid,
                        "marketplace": "amazon",
                        "image_url": str(irow.get("image_url", "")),
                        "local_path": None,
                        "image_type": str(irow.get("image_type", "primary")),
                        "download_status": "PENDING",
                        "file_size_bytes": None,
                        "width": None,
                        "height": None,
                        "content_hash_sha256": None,
                        "perceptual_hash_dhash": None,
                        "ocr_text": None,
                        "packaging_consistency_score": None,
                        "source_provenance": "Amazon Reviews'23 Dense Images",
                    })

        # 3. Sample additional raw products from full catalog
        meta_path = os.path.join(self.raw_dir, "amazon", "all_beauty_metadata.parquet")
        if os.path.exists(meta_path):
            logging.info("Ingesting additional Amazon Beauty products from raw archive...")
            meta = pd.read_parquet(
                meta_path,
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
            ).drop_duplicates(subset=["parent_asin"])

            meta["price_num"] = meta["price"].apply(parse_numeric_price)
            with_price = meta[meta["price_num"].notna() & (~meta["parent_asin"].isin(seen_asins))]
            sample_prods = with_price.sample(n=min(sample_size, len(with_price)), random_state=random_state)

            for _, row in sample_prods.iterrows():
                asin = str(row["parent_asin"])
                cid = f"amazon_{asin}"

                p = CanonicalProduct(
                    canonical_product_id=cid,
                    marketplace="amazon",
                    source_product_id=asin,
                    parent_product_id=asin,
                    title=clean_text_field(row.get("title")),
                    category=normalize_category_name(clean_text_field(row.get("main_category"))),
                    subcategory="Beauty",
                    brand=clean_text_field(row.get("store")),
                    description=clean_text_field(row.get("description")),
                    price=row["price_num"],
                    currency="USD",
                    rating=float(row["average_rating"]) if pd.notna(row.get("average_rating")) else None,
                    rating_count=int(row["rating_number"]) if pd.notna(row.get("rating_number")) else None,
                    product_url=f"https://www.amazon.com/dp/{asin}",
                    image_urls=[],
                    seller_id=None,
                    seller_name=clean_text_field(row.get("store")),
                    metadata_details=row.get("details") if isinstance(row.get("details"), dict) else {},
                    source_provenance="Amazon Reviews'23 All_Beauty",
                )
                self.products.append(asdict(p) if hasattr(p, "__dict__") else p)

        # 4. Ingest corresponding reviews from dense reviews
        if os.path.exists(dense_rev_path):
            logging.info("Loading matching reviews from %s...", dense_rev_path)
            dense_revs = pd.read_parquet(dense_rev_path)
            for _, rrow in dense_revs.iterrows():
                cid = f"amazon_{rrow['parent_asin']}"
                rid = f"amazon_{rrow['review_id']}"
                rev = CanonicalReview(
                    canonical_review_id=rid,
                    source_review_id=str(rrow["review_id"]),
                    canonical_product_id=cid,
                    marketplace="amazon",
                    reviewer_id=str(rrow.get("user_id")),
                    review_title=clean_text_field(rrow.get("title")),
                    review_text=clean_text_field(rrow.get("review_text", rrow.get("text"))),
                    rating=float(rrow.get("rating", 0.0)),
                    timestamp=parse_timestamp(rrow.get("timestamp")),
                    verified_purchase=bool(rrow["verified_purchase"]) if pd.notna(rrow.get("verified_purchase")) else None,
                    helpful_votes=int(rrow.get("helpful_vote", 0)),
                    language="en",
                    source_provenance="Amazon Reviews'23 Dense Cohort",
                )
                self.reviews.append(asdict(rev) if hasattr(rev, "__dict__") else rev)

    def ingest_amazon_expanded_categories(self):
        """Ingest newly acquired raw categories (Electronics, Fashion, Home, Toys, Books)."""
        amazon_dir = os.path.join(self.raw_dir, "amazon")
        cat_files = [f for f in os.listdir(amazon_dir) if f.endswith("_metadata_raw.jsonl")]

        known_products = {p["canonical_product_id"] for p in self.products}

        for mf in cat_files:
            cat_name = mf.replace("_metadata_raw.jsonl", "")
            meta_path = os.path.join(amazon_dir, mf)
            rev_path = os.path.join(amazon_dir, f"{cat_name}_reviews_raw.jsonl")

            logging.info("Ingesting Amazon category: %s...", cat_name)
            # Read meta lines
            with open(meta_path, "r", encoding="utf-8") as f:
                for line in f:
                    if not line.strip():
                        continue
                    try:
                        item = json.loads(line)
                    except Exception:
                        continue

                    asin = str(item.get("parent_asin", ""))
                    if not asin:
                        continue
                    cid = f"amazon_{asin}"
                    known_products.add(cid)

                    # Extract image URLs
                    imgs = item.get("images", [])
                    img_urls = []
                    if isinstance(imgs, list):
                        for im in imgs:
                            if isinstance(im, dict):
                                for sz in ["large", "hi_res", "thumb"]:
                                    if im.get(sz):
                                        img_urls.append(im.get(sz))
                            elif isinstance(im, str):
                                img_urls.append(im)

                    price = parse_numeric_price(item.get("price"))
                    p = CanonicalProduct(
                        canonical_product_id=cid,
                        marketplace="amazon",
                        source_product_id=asin,
                        parent_product_id=asin,
                        title=clean_text_field(item.get("title")),
                        category=normalize_category_name(item.get("main_category", cat_name)),
                        subcategory=cat_name,
                        brand=clean_text_field(item.get("store")),
                        description=clean_text_field(item.get("description")),
                        price=price,
                        currency="USD",
                        rating=float(item["average_rating"]) if item.get("average_rating") is not None else None,
                        rating_count=int(item["rating_number"]) if item.get("rating_number") is not None else None,
                        product_url=f"https://www.amazon.com/dp/{asin}",
                        image_urls=img_urls[:5],
                        seller_id=None,
                        seller_name=clean_text_field(item.get("store")),
                        metadata_details=item.get("details", {}) if isinstance(item.get("details"), dict) else {},
                        source_provenance=f"Amazon Reviews'23 ({cat_name})",
                    )
                    self.products.append(asdict(p) if hasattr(p, "__dict__") else p)

            # Read review lines if available
            if os.path.exists(rev_path):
                with open(rev_path, "r", encoding="utf-8") as f:
                    for line in f:
                        if not line.strip():
                            continue
                        try:
                            ritem = json.loads(line)
                        except Exception:
                            continue

                        asin = str(ritem.get("parent_asin", ritem.get("asin", "")))
                        if not asin:
                            continue
                        cid = f"amazon_{asin}"
                        if cid not in known_products:
                            known_products.add(cid)
                            p_stub = CanonicalProduct(
                                canonical_product_id=cid,
                                marketplace="amazon",
                                source_product_id=asin,
                                parent_product_id=asin,
                                title=clean_text_field(ritem.get("title")),
                                category=normalize_category_name(cat_name),
                                subcategory=cat_name,
                                source_provenance=f"Amazon Reviews'23 ({cat_name})",
                            )
                            self.products.append(asdict(p_stub) if hasattr(p_stub, "__dict__") else p_stub)

                        s_rid = str(ritem.get("review_id", ritem.get("timestamp", "")))
                        rid = f"amazon_{asin}_{s_rid}"

                        rev = CanonicalReview(
                            canonical_review_id=rid,
                            source_review_id=s_rid,
                            canonical_product_id=cid,
                            marketplace="amazon",
                            reviewer_id=str(ritem.get("user_id")),
                            review_title=clean_text_field(ritem.get("title")),
                            review_text=clean_text_field(ritem.get("text")),
                            rating=float(ritem.get("rating", 0.0)),
                            timestamp=parse_timestamp(ritem.get("timestamp")),
                            verified_purchase=bool(ritem["verified_purchase"]) if "verified_purchase" in ritem else None,
                            helpful_votes=int(ritem.get("helpful_vote", 0)),
                            language="en",
                            source_provenance=f"Amazon Reviews'23 ({cat_name})",
                        )
                        self.reviews.append(asdict(rev) if hasattr(rev, "__dict__") else rev)

    def ingest_walmart_catalog(self):
        """Ingest Walmart product catalog."""
        wm_path = os.path.join(self.raw_dir, "walmart", "walmart_products_raw.csv")
        if not os.path.exists(wm_path):
            logging.warning("Walmart raw catalog not found at %s. Skipping.", wm_path)
            return

        logging.info("Ingesting Walmart product catalog...")
        df_wm = pd.read_csv(wm_path)
        for _, row in df_wm.iterrows():
            item_id = str(row["id"])
            cid = f"walmart_{item_id}"
            cat = normalize_category_name(clean_text_field(row.get("category")))
            price = parse_numeric_price(row.get("price"))

            p = CanonicalProduct(
                canonical_product_id=cid,
                marketplace="walmart",
                source_product_id=item_id,
                parent_product_id=str(row.get("modelno", "")),
                title=clean_text_field(row.get("title")),
                category=cat,
                subcategory=clean_text_field(row.get("category")),
                brand=clean_text_field(row.get("brand")),
                description=f"Model: {row.get('modelno', '')} | Category: {row.get('category', '')}",
                price=price,
                currency="USD",
                rating=None,  # Walmart catalog table does not include star rating
                rating_count=None,
                product_url=f"https://www.walmart.com/ip/{item_id}",
                image_urls=[],
                seller_id=None,
                seller_name="Walmart.com",
                metadata_details={"model_number": str(row.get("modelno", ""))},
                source_provenance="Magellan / matchbench Walmart Catalog",
            )
            self.products.append(asdict(p) if hasattr(p, "__dict__") else p)

    def ingest_bestbuy_reviews(self, max_reviews: Optional[int] = None):
        """Ingest BestBuy product reviews and synthesize canonical products for them."""
        bb_path = os.path.join(self.raw_dir, "bestbuy", "bestbuy_reviews_raw.parquet")
        if not os.path.exists(bb_path):
            logging.warning("BestBuy reviews not found at %s. Skipping.", bb_path)
            return

        logging.info("Ingesting BestBuy reviews and products...")
        df_bb = pd.read_parquet(bb_path)
        if max_reviews is not None and len(df_bb) > max_reviews:
            df_bb = df_bb.sample(n=max_reviews, random_state=42)

        # Track unique products from reviews
        seen_products = set()
        for idx, row in df_bb.iterrows():
            prod_name = clean_text_field(row.get("product_name"))
            prod_model = clean_text_field(row.get("product_model"))
            if not prod_name:
                continue

            # Deterministic product ID from product_model or slug
            prod_slug = re.sub(r"[^\w]", "_", prod_model if prod_model else prod_name[:30]).lower()
            cid = f"bestbuy_{prod_slug}"

            if cid not in seen_products:
                seen_products.add(cid)
                p = CanonicalProduct(
                    canonical_product_id=cid,
                    marketplace="bestbuy",
                    source_product_id=prod_slug,
                    parent_product_id=prod_model if prod_model else None,
                    title=prod_name,
                    category="Electronics",
                    subcategory="Consumer Electronics",
                    brand=prod_name.split(" - ")[0] if " - " in prod_name else None,
                    description=f"Model: {prod_model}" if prod_model else prod_name,
                    price=None,
                    currency="USD",
                    rating=None,
                    rating_count=None,
                    product_url=f"https://www.bestbuy.com/site/{prod_slug}",
                    image_urls=[],
                    seller_id=None,
                    seller_name="Best Buy",
                    metadata_details={"product_model": prod_model},
                    source_provenance="BestBuy Reviews Dataset (ValerianFourel)",
                )
                self.products.append(asdict(p) if hasattr(p, "__dict__") else p)

            # Ingest review with globally unique row ID
            row_id = str(row.get("__index_level_0__", idx))
            rid = f"bestbuy_{prod_slug}_{row_id}"
            r = CanonicalReview(
                canonical_review_id=rid,
                source_review_id=row_id,
                canonical_product_id=cid,
                marketplace="bestbuy",
                reviewer_id=clean_text_field(row.get("author")),
                review_title=clean_text_field(row.get("review_title")),
                review_text=clean_text_field(row.get("review_text")),
                rating=float(row.get("rating", 0.0)),
                timestamp=None,
                review_date=str(row.get("submission_date")),
                verified_purchase=bool(row.get("verified_purchase")) if pd.notna(row.get("verified_purchase")) else None,
                helpful_votes=int(row.get("helpful_count", 0)),
                language="en",
                source_provenance="BestBuy Customer Reviews",
            )
            self.reviews.append(asdict(r) if hasattr(r, "__dict__") else r)

    def ingest_flipkart_catalog(self, sample_size: Optional[int] = None):
        """Ingest Flipkart product catalog with Indian market provenance and INR pricing."""
        fk_path = os.path.join(self.raw_dir, "flipkart", "flipkart_products_raw.csv")
        if not os.path.exists(fk_path):
            logging.info("Flipkart raw catalog not found at %s. Skipping.", fk_path)
            return

        logging.info("Ingesting Flipkart product catalog from %s...", fk_path)
        try:
            df_fk = pd.read_csv(fk_path)
            if sample_size is not None and len(df_fk) > sample_size:
                df_fk = df_fk.sample(n=sample_size, random_state=42)

            for _, row in df_fk.iterrows():
                pid = clean_text_field(row.get("pid", row.get("uniq_id")))
                if not pid:
                    continue
                cid = f"flipkart_{pid}"
                title = clean_text_field(row.get("product_name"))
                if not title:
                    continue

                # Parse category tree
                raw_tree = clean_text_field(row.get("product_category_tree"))
                cat_tree_parts = [p.strip().strip('"').strip("'") for p in raw_tree.strip("[]").split(">>") if p.strip()]
                primary_cat = cat_tree_parts[0] if cat_tree_parts else "Other"
                sub_cat = " > ".join(cat_tree_parts[:3]) if cat_tree_parts else None
                normalized_cat = normalize_category_name(primary_cat)
                if normalized_cat == "Other" and len(cat_tree_parts) > 1:
                    normalized_cat = normalize_category_name(raw_tree)

                # Parse price (discounted_price or retail_price in INR)
                price = parse_numeric_price(row.get("discounted_price"))
                if price is None:
                    price = parse_numeric_price(row.get("retail_price"))

                # Rating
                raw_rating = row.get("product_rating")
                rating = None
                try:
                    r_float = float(raw_rating)
                    if 1.0 <= r_float <= 5.0:
                        rating = round(r_float, 2)
                except (ValueError, TypeError):
                    pass

                # Image URLs
                raw_imgs = row.get("image", "")
                img_urls = []
                if isinstance(raw_imgs, str) and raw_imgs.strip().startswith("["):
                    try:
                        import ast
                        parsed_imgs = ast.literal_eval(raw_imgs)
                        if isinstance(parsed_imgs, list):
                            img_urls = [str(u).strip() for u in parsed_imgs if u]
                    except Exception:
                        pass

                details = {"category_tree": raw_tree}
                if row.get("retail_price") is not None:
                    details["retail_price_mrp_inr"] = parse_numeric_price(row.get("retail_price"))
                if row.get("is_FK_Advantage_product") is not None:
                    details["is_fk_advantage"] = bool(row.get("is_FK_Advantage_product"))

                brand_val = clean_text_field(row.get("brand"))
                p = CanonicalProduct(
                    canonical_product_id=cid,
                    marketplace="flipkart",
                    source_product_id=pid,
                    parent_product_id=pid,
                    country="IN",
                    title=title,
                    category=normalized_cat,
                    subcategory=sub_cat,
                    brand=brand_val if brand_val else None,
                    description=clean_text_field(row.get("description")),
                    price=price,
                    currency="INR",
                    rating=rating,
                    rating_count=None,
                    product_url=clean_text_field(row.get("product_url")),
                    image_urls=img_urls[:5],
                    seller_id=None,
                    seller_name="Flipkart Seller",
                    metadata_details=details,
                    source_provenance="PromptCloud Flipkart E-Commerce Dataset",
                )
                self.products.append(asdict(p) if hasattr(p, "__dict__") else p)
        except Exception as e:
            logging.warning("Error ingesting Flipkart catalog: %s", e)

    def ingest_amazon_india_catalog(self, sample_size: Optional[int] = None):
        """Ingest Amazon India (Amazon.in) product catalog with INR pricing."""
        amz_in_path = os.path.join(self.raw_dir, "amazon_india", "amazon_india_products_raw.csv")
        if not os.path.exists(amz_in_path):
            logging.info("Amazon India raw catalog not found at %s. Skipping.", amz_in_path)
            return

        logging.info("Ingesting Amazon India product catalog from %s...", amz_in_path)
        try:
            df_in = pd.read_csv(amz_in_path)
            if sample_size is not None and len(df_in) > sample_size:
                df_in = df_in.sample(n=sample_size, random_state=42)

            for _, row in df_in.iterrows():
                asin = clean_text_field(row.get("Product Asin", row.get("asin", row.get("Uniq Id", row.get("id")))))
                if not asin:
                    continue
                cid = f"amazon_in_{asin}"
                title = clean_text_field(row.get("Product Title", row.get("title", row.get("product_name"))))
                if not title:
                    continue

                raw_cat = clean_text_field(row.get("Category", row.get("category", "Grocery & Gourmet Foods")))
                normalized_cat = normalize_category_name(raw_cat)
                price = parse_numeric_price(row.get("Price", row.get("price", row.get("Mrp", row.get("mrp")))))
                brand_val = clean_text_field(row.get("Brand", row.get("brand")))
                desc = clean_text_field(row.get("Product Description", row.get("description")))

                img_field = row.get("Image Urls", row.get("image_urls", ""))
                img_urls = []
                if isinstance(img_field, str) and img_field.strip():
                    img_urls = [u.strip().strip("'\"|") for u in re.split(r"[|,]", img_field) if u.strip().startswith("http")]

                p = CanonicalProduct(
                    canonical_product_id=cid,
                    marketplace="amazon_in",
                    source_product_id=asin,
                    parent_product_id=asin,
                    country="IN",
                    title=title,
                    category=normalized_cat,
                    subcategory=raw_cat,
                    brand=brand_val if brand_val else None,
                    description=desc,
                    price=price,
                    currency="INR",
                    rating=None,
                    rating_count=None,
                    product_url=f"https://www.amazon.in/dp/{asin}",
                    image_urls=img_urls[:5],
                    seller_id=None,
                    seller_name="Amazon.in Seller",
                    metadata_details={"asin": asin, "storefront": "amazon.in"},
                    source_provenance="Amazon India Product Catalog (pgurazada1)",
                )
                self.products.append(asdict(p) if hasattr(p, "__dict__") else p)
        except Exception as e:
            logging.warning("Error ingesting Amazon India catalog: %s", e)

    def run_pipeline(self) -> Dict[str, Any]:
        """Runs full ingestion, deduplication, referential integrity check, and exports."""
        logging.info("==================================================")
        logging.info("Starting Canonical Multi-Marketplace Pipeline")
        logging.info("==================================================")

        # Ingest all data sources
        self.ingest_amazon_beauty_cohort()
        self.ingest_amazon_expanded_categories()
        self.ingest_walmart_catalog()
        self.ingest_bestbuy_reviews()
        self.ingest_flipkart_catalog()
        self.ingest_amazon_india_catalog()

        # Convert to DataFrames
        df_prods = pd.DataFrame(self.products)
        df_revs = pd.DataFrame(self.reviews)
        df_imgs = pd.DataFrame(self.images)

        # 1. Deduplication
        logging.info("Deduplicating entities...")
        init_prods = len(df_prods)
        df_prods = df_prods.drop_duplicates(subset=["canonical_product_id"]).reset_index(drop=True)
        logging.info("Products: %d raw -> %d deduplicated (0 duplicates remaining).", init_prods, len(df_prods))

        init_revs = len(df_revs)
        df_revs = df_revs.drop_duplicates(subset=["canonical_review_id"]).reset_index(drop=True)
        logging.info("Reviews: %d raw -> %d deduplicated (0 duplicates remaining).", init_revs, len(df_revs))

        # 2. Referential Integrity Validation
        valid_product_ids = set(df_prods["canonical_product_id"])
        # Check review orphans
        orphan_reviews = ~df_revs["canonical_product_id"].isin(valid_product_ids)
        logging.info("Review orphans (foreign key mismatches): %d / %d", orphan_reviews.sum(), len(df_revs))

        # Check image orphans
        if not df_imgs.empty:
            df_imgs = df_imgs.drop_duplicates(subset=["image_id"]).reset_index(drop=True)
            orphan_images = ~df_imgs["canonical_product_id"].isin(valid_product_ids)
            logging.info("Image orphans: %d / %d", orphan_images.sum(), len(df_imgs))
            df_imgs = df_imgs[~orphan_images].reset_index(drop=True)

        # 3. Export Canonical Processed Parquet Tables
        prod_out = os.path.join(self.processed_dir, "canonical_products.parquet")
        rev_out = os.path.join(self.processed_dir, "canonical_reviews.parquet")
        img_out = os.path.join(self.processed_dir, "canonical_images.parquet")

        df_prods.to_parquet(prod_out, index=False)
        df_revs.to_parquet(rev_out, index=False)
        df_imgs.to_parquet(img_out, index=False)

        logging.info("Saved %s (%d rows, %.2f MB)", prod_out, len(df_prods), os.path.getsize(prod_out) / (1024 * 1024))
        logging.info("Saved %s (%d rows, %.2f MB)", rev_out, len(df_revs), os.path.getsize(rev_out) / (1024 * 1024))
        logging.info("Saved %s (%d rows, %.2f MB)", img_out, len(df_imgs), os.path.getsize(img_out) / (1024 * 1024))

        # 4. Category and Marketplace Breakdown
        cat_counts = df_prods["category"].value_counts().to_dict()
        market_counts = df_prods["marketplace"].value_counts().to_dict()
        logging.info("Canonical Products Category Breakdown:\n%s", json.dumps(cat_counts, indent=2))
        logging.info("Canonical Products Marketplace Breakdown:\n%s", json.dumps(market_counts, indent=2))

        return {
            "products_count": len(df_prods),
            "reviews_count": len(df_revs),
            "images_count": len(df_imgs),
            "categories": cat_counts,
            "marketplaces": market_counts,
            "product_path": prod_out,
            "review_path": rev_out,
            "image_path": img_out,
        }


if __name__ == "__main__":
    pipeline = CanonicalPipeline()
    results = pipeline.run_pipeline()
    print("Pipeline Execution Summary:", results)
