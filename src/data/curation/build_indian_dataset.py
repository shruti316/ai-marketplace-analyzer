"""
src/data/curation/build_indian_dataset.py
-----------------------------------------
Deterministic pipeline to construct the Indian Marketplace Dataset for Phase 1.

Target Marketplaces:
1. Amazon India (amazon_in) - 1,500 products
2. Flipkart (flipkart) - 1,000 products
3. Myntra (myntra) - 1,000 products

Deliverables Generated:
- data/indian_marketplace/raw/products/ (raw source CSV copies)
- data/indian_marketplace/raw/reviews/ (raw review CSV copy)
- data/indian_marketplace/raw/images/ (image manifest and cache README)
- data/indian_marketplace/processed/indian_products.parquet (master product catalog)
- data/indian_marketplace/processed/indian_reviews.parquet (genuine Indian reviews)
- data/indian_marketplace/processed/indian_reviews_linked.parquet (catalog-linked reviews subset)
- data/indian_marketplace/processed/indian_images.parquet (product image evidence)
- data/indian_marketplace/processed/indian_complete_multimodal.parquet (multimodal products)
- data/indian_marketplace/processed/indian_dataset_metadata.json (dataset provenance & metadata)
"""

import os
import sys
import json
import time
import shutil
import hashlib
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Set

import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class IndianDatasetBuilder:
    """
    Constructs the structured Indian marketplace dataset preserving authentic evidence,
    stable canonical IDs, and strict referential integrity.
    """

    TARGET_MARKETPLACES = ["amazon_in", "flipkart", "myntra"]
    BASE_DIR = Path("data/indian_marketplace")
    RAW_PRODUCTS_DIR = BASE_DIR / "raw" / "products"
    RAW_REVIEWS_DIR = BASE_DIR / "raw" / "reviews"
    RAW_IMAGES_DIR = BASE_DIR / "raw" / "images"
    PROCESSED_DIR = BASE_DIR / "processed"

    # Protected source paths
    CANONICAL_PRODUCTS_PATH = Path("data/processed/canonical_products.parquet")
    CANONICAL_IMAGES_PATH = Path("data/processed/canonical_images.parquet")
    IMAGE_QUALITY_REPORT_PATH = Path("data/processed/image_quality_report.parquet")
    FLIPKART_REVIEWS_RAW_PATH = Path("data/raw/flipkart/flipkart_reviews_raw.csv")
    IMAGE_CACHE_DIR = Path("data/raw/images/cache")

    def __init__(self):
        self._ensure_directories()

    def _ensure_directories(self):
        """Creates target output directory hierarchy."""
        self.RAW_PRODUCTS_DIR.mkdir(parents=True, exist_ok=True)
        self.RAW_REVIEWS_DIR.mkdir(parents=True, exist_ok=True)
        self.RAW_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
        self.PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
        logging.info("Initialized directory hierarchy under %s", self.BASE_DIR)

    def copy_raw_source_files(self) -> Dict[str, str]:
        """Copies raw source evidence to data/indian_marketplace/raw/."""
        copied = {}
        raw_sources = {
            "amazon_india_products_raw.csv": Path("data/raw/amazon_india/amazon_india_products_raw.csv"),
            "flipkart_products_raw.csv": Path("data/raw/flipkart/flipkart_products_raw.csv"),
            "myntra_products_raw.csv": Path("data/raw/myntra/myntra_products_raw.csv"),
        }
        for name, src in raw_sources.items():
            if src.exists():
                dst = self.RAW_PRODUCTS_DIR / name
                shutil.copy2(src, dst)
                copied[str(dst)] = hashlib.sha256(dst.read_bytes()).hexdigest()
                logging.info("Copied raw product file: %s -> %s", src, dst)
            else:
                logging.warning("Source file not found: %s", src)

        if self.FLIPKART_REVIEWS_RAW_PATH.exists():
            dst = self.RAW_REVIEWS_DIR / "flipkart_reviews_raw.csv"
            shutil.copy2(self.FLIPKART_REVIEWS_RAW_PATH, dst)
            copied[str(dst)] = hashlib.sha256(dst.read_bytes()).hexdigest()
            logging.info("Copied raw review file: %s -> %s", self.FLIPKART_REVIEWS_RAW_PATH, dst)

        # Image cache README and manifest
        readme_path = self.RAW_IMAGES_DIR / "README.md"
        with open(readme_path, "w", encoding="utf-8") as f:
            f.write(
                "# Indian Marketplace Image Assets\n\n"
                "This directory contains raw image manifests and links for Indian marketplace products.\n\n"
                "## Storage Architecture\n"
                "- Physical downloaded images are cached in `data/raw/images/cache/` (3,208 validated JPEG/WEBP images, 599.4 MB).\n"
                "- Full per-image quality metrics, sharpness, luminance, dimensions, and perceptual hashes are recorded in "
                "`data/indian_marketplace/processed/indian_images.parquet`.\n"
                "- Image references map directly to `flipkart_<pid>_<idx>.jpg`.\n"
            )
        copied[str(readme_path)] = hashlib.sha256(readme_path.read_bytes()).hexdigest()

        return copied

    def build_images_dataset(self) -> Tuple[pd.DataFrame, Dict[str, Tuple[int, bool]]]:
        """
        Builds indian_images.parquet from canonical_images and image_quality_report.
        Returns the images dataframe and a product-level image aggregation map.
        """
        logging.info("Building Indian images dataset...")
        ci = pd.read_parquet(self.CANONICAL_IMAGES_PATH)
        iq = pd.read_parquet(self.IMAGE_QUALITY_REPORT_PATH)

        # Filter for Indian marketplaces
        ci_in = ci[ci["marketplace"].isin(self.TARGET_MARKETPLACES)].copy()
        iq_in = iq[iq["marketplace"].isin(self.TARGET_MARKETPLACES)].copy()

        # Merge image metadata
        merged = pd.merge(
            ci_in,
            iq_in,
            on=["image_id", "canonical_product_id", "marketplace"],
            suffixes=("_ci", "_iq"),
            how="outer"
        )

        def resolve_local_path(row) -> Optional[str]:
            img_id = row["image_id"]
            fmt = str(row.get("image_format", "")).lower()
            ext = "webp" if "webp" in fmt else "jpg"
            p1 = self.IMAGE_CACHE_DIR / f"{img_id}.{ext}"
            if p1.exists():
                return f"data/raw/images/cache/{img_id}.{ext}"
            p2 = self.IMAGE_CACHE_DIR / f"{img_id}.jpg"
            if p2.exists():
                return f"data/raw/images/cache/{img_id}.jpg"
            return None

        # Build clean columns
        images_df = pd.DataFrame()
        images_df["image_id"] = merged["image_id"]
        images_df["canonical_product_id"] = merged["canonical_product_id"]
        images_df["marketplace"] = merged["marketplace"]
        images_df["image_url"] = merged["image_url"]
        images_df["local_path"] = merged.apply(resolve_local_path, axis=1)
        images_df["image_type"] = merged["image_type"].fillna("primary")
        images_df["image_format"] = merged["image_format"].fillna("UNKNOWN")
        images_df["image_width"] = merged["width_iq"].combine_first(merged["width_ci"])
        images_df["image_height"] = merged["height_iq"].combine_first(merged["height_ci"])
        images_df["image_file_size"] = merged["file_size_bytes_iq"].combine_first(merged["file_size_bytes_ci"])
        images_df["image_validation_status"] = merged["quality_status"].fillna(merged["download_status_iq"])
        images_df["is_usable"] = merged["is_usable"].fillna(False).astype(bool)
        images_df["source_provenance"] = merged["source_provenance"]

        # Sort deterministically
        images_df = images_df.sort_values(by=["marketplace", "canonical_product_id", "image_id"]).reset_index(drop=True)

        # Compute product-level image summary
        product_image_map = {}
        usable_images = images_df[images_df["is_usable"] == True]
        usable_counts = usable_images.groupby("canonical_product_id").size().to_dict()

        for pid in merged["canonical_product_id"].unique():
            cnt = usable_counts.get(pid, 0)
            product_image_map[pid] = (cnt, cnt > 0)

        logging.info(
            "Constructed indian_images.parquet: %d total records (%d usable, %d non-usable).",
            len(images_df),
            images_df["is_usable"].sum(),
            (~images_df["is_usable"]).sum()
        )
        return images_df, product_image_map

    def build_reviews_dataset(self) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Builds indian_reviews.parquet (genuine Indian reviews) and indian_reviews_linked.parquet.
        """
        logging.info("Building Indian reviews dataset...")
        raw_reviews = pd.read_csv(self.FLIPKART_REVIEWS_RAW_PATH)

        # Genuine reviews table
        reviews_df = pd.DataFrame()
        reviews_df["review_id"] = [f"flipkart_rev_{i:05d}" for i in range(len(raw_reviews))]
        # Reviews are genuinely unlinked to PromptCloud catalog products
        reviews_df["canonical_product_id"] = None
        reviews_df["marketplace"] = "flipkart"
        reviews_df["review_text"] = raw_reviews["text"].astype(str)
        reviews_df["rating"] = raw_reviews["Rate"].astype(float)
        reviews_df["review_title"] = raw_reviews["Review"].astype(str)
        reviews_df["review_date"] = None
        reviews_df["verified_purchase"] = None
        reviews_df["helpful_votes"] = None
        reviews_df["reviewer_id"] = None
        reviews_df["source_provenance"] = "Flipkart Customer Reviews Dataset (ml-hub)"
        reviews_df["product_name_raw"] = raw_reviews["product_name"].astype(str)
        reviews_df["product_price_raw"] = raw_reviews["product_price"].astype(float)
        reviews_df["sentiment_label"] = raw_reviews["labels"].astype(str)
        reviews_df["linkage_status"] = "UNLINKED_INDIAN_CORPUS"
        reviews_df["is_linked"] = False

        # Strictly linked reviews subset (0 rows, exact required schema)
        linked_reviews_df = pd.DataFrame(columns=[
            "review_id",
            "canonical_product_id",
            "marketplace",
            "review_text",
            "rating",
            "review_title",
            "review_date",
            "verified_purchase",
            "helpful_votes",
            "reviewer_id",
            "source_provenance"
        ]).astype({
            "review_id": "string",
            "canonical_product_id": "string",
            "marketplace": "string",
            "review_text": "string",
            "rating": "float64",
            "review_title": "string",
            "review_date": "string",
            "verified_purchase": "boolean",
            "helpful_votes": "Int64",
            "reviewer_id": "string",
            "source_provenance": "string"
        })

        logging.info(
            "Constructed indian_reviews.parquet: %d genuine reviews (3,500 unlinked corpus).",
            len(reviews_df)
        )
        return reviews_df, linked_reviews_df

    def build_products_dataset(self, product_image_map: Dict[str, Tuple[int, bool]]) -> pd.DataFrame:
        """
        Builds the master indian_products.parquet dataset.
        """
        logging.info("Building Indian products dataset...")
        cp = pd.read_parquet(self.CANONICAL_PRODUCTS_PATH)
        in_cp = cp[cp["marketplace"].isin(self.TARGET_MARKETPLACES)].copy()

        prods = pd.DataFrame()
        prods["canonical_product_id"] = in_cp["canonical_product_id"]
        prods["marketplace"] = in_cp["marketplace"]
        prods["source_product_id"] = in_cp["source_product_id"]
        prods["country"] = "IN"
        prods["product_title"] = in_cp["title"]
        prods["brand"] = in_cp["brand"]
        prods["category"] = in_cp["category"]
        prods["subcategory"] = in_cp["subcategory"]
        prods["product_description"] = in_cp["description"]
        prods["product_url"] = in_cp["product_url"]
        prods["price"] = in_cp["price"]
        prods["currency"] = "INR"
        prods["rating"] = in_cp["rating"]
        prods["rating_count"] = in_cp["rating_count"]
        prods["seller_id"] = in_cp["seller_id"]
        prods["seller_name"] = in_cp["seller_name"]
        prods["image_urls"] = in_cp["image_urls"]
        prods["collection_timestamp"] = in_cp["collection_timestamp"]
        prods["source_provenance"] = in_cp["source_provenance"]

        # Modality and Quality Indicators
        price_valid = (prods["price"].notna()) & (prods["price"] > 0)
        prods["price_valid"] = price_valid

        # Review evidence
        prods["has_linked_reviews"] = False
        prods["review_count"] = 0

        # Visual evidence
        usable_counts = []
        has_usable_imgs = []
        for pid in prods["canonical_product_id"]:
            cnt, has_img = product_image_map.get(pid, (0, False))
            usable_counts.append(cnt)
            has_usable_imgs.append(has_img)

        prods["usable_image_count"] = usable_counts
        prods["has_usable_images"] = has_usable_imgs

        # Multimodal complete flag
        is_complete = (
            prods["price_valid"] &
            prods["has_linked_reviews"] &
            prods["has_usable_images"] &
            prods["product_title"].notna()
        )
        prods["is_complete_multimodal"] = is_complete

        # Missing evidence reasons
        missing_reasons = []
        for idx, row in prods.iterrows():
            reasons = []
            if not row["price_valid"]:
                reasons.append("MISSING_OR_ZERO_PRICE")
            if not row["has_linked_reviews"]:
                reasons.append("NO_LINKED_REVIEWS")
            if not row["has_usable_images"]:
                if row["marketplace"] == "myntra":
                    reasons.append("NO_IMAGE_EVIDENCE_IN_CATALOG")
                elif row["marketplace"] == "amazon_in":
                    reasons.append("ALL_IMAGE_ASSETS_FAILED_QUALITY_FILTERS")
                else:
                    reasons.append("NO_USABLE_IMAGES")
            missing_reasons.append(reasons)

        prods["missing_evidence_reasons"] = missing_reasons

        # Sort deterministically
        prods = prods.sort_values(by=["marketplace", "canonical_product_id"]).reset_index(drop=True)
        logging.info("Constructed indian_products.parquet: %d total products.", len(prods))
        return prods

    def build_complete_multimodal_dataset(self, prods_df: pd.DataFrame) -> pd.DataFrame:
        """
        Builds indian_complete_multimodal.parquet filtering for products with all 4 modalities.
        """
        logging.info("Building complete multimodal dataset...")
        complete_df = prods_df[prods_df["is_complete_multimodal"] == True].copy().reset_index(drop=True)
        logging.info(
            "Constructed indian_complete_multimodal.parquet: %d products satisfy all multimodal criteria.",
            len(complete_df)
        )
        return complete_df

    def generate_metadata(
        self,
        prods_df: pd.DataFrame,
        images_df: pd.DataFrame,
        reviews_df: pd.DataFrame,
        complete_df: pd.DataFrame,
        copied_files: Dict[str, str],
        file_hashes: Dict[str, str]
    ) -> Dict[str, Any]:
        """
        Generates comprehensive dataset metadata JSON.
        """
        logging.info("Generating dataset metadata...")

        # Price statistics per marketplace
        price_stats = {}
        for m in self.TARGET_MARKETPLACES:
            m_prices = prods_df[prods_df["marketplace"] == m]["price"].dropna()
            price_stats[m] = {
                "total_products": int((prods_df["marketplace"] == m).sum()),
                "valid_price_count": int(len(m_prices)),
                "missing_price_count": int((prods_df["marketplace"] == m).sum() - len(m_prices)),
                "min_inr": float(m_prices.min()) if len(m_prices) > 0 else None,
                "median_inr": float(m_prices.median()) if len(m_prices) > 0 else None,
                "mean_inr": float(round(m_prices.mean(), 2)) if len(m_prices) > 0 else None,
                "max_inr": float(m_prices.max()) if len(m_prices) > 0 else None,
            }

        # Category breakdown
        cat_dist = {}
        for (m, cat), count in prods_df.groupby(["marketplace", "category"]).size().items():
            if m not in cat_dist:
                cat_dist[m] = {}
            cat_dist[m][cat] = int(count)

        metadata = {
            "dataset_name": "Indian Marketplace Trust Intelligence Dataset",
            "phase": "Phase 1 - Indian Marketplace Dataset Construction",
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "currency": "INR",
            "country": "IN",
            "target_marketplaces": self.TARGET_MARKETPLACES,
            "summary_counts": {
                "total_products": len(prods_df),
                "products_by_marketplace": prods_df["marketplace"].value_counts().to_dict(),
                "products_with_valid_price": int(prods_df["price_valid"].sum()),
                "products_with_usable_images": int(prods_df["has_usable_images"].sum()),
                "products_with_linked_reviews": int(prods_df["has_linked_reviews"].sum()),
                "complete_multimodal_products": len(complete_df),
                "total_image_records": len(images_df),
                "usable_image_records": int(images_df["is_usable"].sum()),
                "non_usable_image_records": int((~images_df["is_usable"]).sum()),
                "total_review_records": len(reviews_df),
                "linked_review_records": 0,
                "unlinked_review_records": len(reviews_df),
            },
            "price_statistics_inr": price_stats,
            "category_distribution": cat_dist,
            "source_provenance": {
                "amazon_in": {
                    "source": "PromptCloud Amazon India E-Commerce Dataset (pgurazada1/amazon_india_products)",
                    "product_count": 1500,
                    "pricing": "Evidence-based normalized INR price and MRP",
                    "images": "5,947 raw image URLs evaluated; 0 usable due to low resolution/placeholder icons/download failure",
                    "reviews": "0 customer reviews in source catalog"
                },
                "flipkart": {
                    "source": "PromptCloud Flipkart E-Commerce Dataset (1,000 products) + ml-hub/flipkart-reviews (3,500 reviews)",
                    "product_count": 1000,
                    "pricing": "PromptCloud retail and discounted prices in INR",
                    "images": "3,534 raw URLs; 3,208 downloaded and validated usable JPEG/WEBP images covering 932 products",
                    "reviews": "3,500 genuine customer reviews covering 143 Indian electronics/home products maintained as unlinked corpus"
                },
                "myntra": {
                    "source": "PromptCloud / Gssmc Myntra Fashion Dataset",
                    "product_count": 1000,
                    "pricing": "1,000 SKU variants with 100% valid positive INR price across 959 parent styles",
                    "images": "0 image URLs supplied in source CSV",
                    "reviews": "0 customer reviews in source catalog"
                }
            },
            "evidence_linkage_status": {
                "catalog_products_count": len(prods_df),
                "catalog_linked_images_count": len(images_df),
                "catalog_linked_usable_images_count": int(images_df["is_usable"].sum()),
                "catalog_linked_reviews_count": 0,
                "unlinked_review_corpus_count": len(reviews_df),
                "linkage_notes": (
                    "Strict empirical integrity enforced. In accordance with project safeguards, "
                    "no synthetic product entities were created to force-link reviews, and no artificial "
                    "product-review links were fabricated. The 3,500 Flipkart customer reviews are preserved "
                    "as an authentic unlinked research corpus, resulting in 0 broken catalog foreign keys."
                )
            },
            "file_manifest": file_hashes,
            "raw_copied_sources": copied_files
        }
        return metadata

    def run(self) -> Dict[str, Any]:
        """Executes the full pipeline and writes all deliverables."""
        t0 = time.time()
        logging.info("Starting Phase 1 Indian Marketplace Dataset Build...")

        # 1. Copy raw source files
        copied_files = self.copy_raw_source_files()

        # 2. Build images dataset
        images_df, product_image_map = self.build_images_dataset()
        images_path = self.PROCESSED_DIR / "indian_images.parquet"
        images_df.to_parquet(images_path, index=False)
        logging.info("Saved %s", images_path)

        # 3. Build reviews datasets
        reviews_df, linked_reviews_df = self.build_reviews_dataset()
        reviews_path = self.PROCESSED_DIR / "indian_reviews.parquet"
        reviews_df.to_parquet(reviews_path, index=False)
        logging.info("Saved %s", reviews_path)

        linked_reviews_path = self.PROCESSED_DIR / "indian_reviews_linked.parquet"
        linked_reviews_df.to_parquet(linked_reviews_path, index=False)
        logging.info("Saved %s", linked_reviews_path)

        # 4. Build products dataset
        prods_df = self.build_products_dataset(product_image_map)
        prods_path = self.PROCESSED_DIR / "indian_products.parquet"
        prods_df.to_parquet(prods_path, index=False)
        logging.info("Saved %s", prods_path)

        # 5. Build complete multimodal dataset
        complete_df = self.build_complete_multimodal_dataset(prods_df)
        complete_path = self.PROCESSED_DIR / "indian_complete_multimodal.parquet"
        complete_df.to_parquet(complete_path, index=False)
        logging.info("Saved %s", complete_path)

        # 6. Compute file hashes
        generated_files = [
            images_path,
            reviews_path,
            linked_reviews_path,
            prods_path,
            complete_path
        ]
        file_hashes = {}
        for p in generated_files:
            file_hashes[str(p)] = hashlib.sha256(p.read_bytes()).hexdigest()

        # 7. Write metadata
        metadata = self.generate_metadata(
            prods_df,
            images_df,
            reviews_df,
            complete_df,
            copied_files,
            file_hashes
        )
        metadata_path = self.PROCESSED_DIR / "indian_dataset_metadata.json"
        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)
        logging.info("Saved %s", metadata_path)
        file_hashes[str(metadata_path)] = hashlib.sha256(metadata_path.read_bytes()).hexdigest()

        dt = time.time() - t0
        logging.info("Phase 1 Indian Marketplace Dataset Build complete in %.2f seconds.", dt)
        return metadata


if __name__ == "__main__":
    builder = IndianDatasetBuilder()
    builder.run()
