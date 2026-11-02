"""
src/vision/expanded_aggregation.py
----------------------------------
Stage 4: Product-Level Multimodal Visual Feature Aggregation Module.

Features:
- Preserves all 31,289 canonical products from data/processed/canonical_products.parquet.
- Exactly 1 row per canonical product ID.
- Rigorous Image Coverage & Count Aggregation:
  - total_image_records, downloaded_image_count, usable_image_count, validated_image_count,
    near_duplicate_image_count, exact_duplicate_image_count, low_quality_image_count,
    irrelevant_image_count, download_failed_image_count, unique_sha256_count, unique_dhash_count.
  - image_download_coverage_ratio, image_usability_ratio.
- Embedding Aggregation:
  - Mean pooling across UNIQUE exact image assets (SHA-256) per product, avoiding duplicate inflation.
  - Preserves NEAR_DUPLICATE images as distinct visual assets.
  - Final product vector is L2 normalized to unit length.
  - Products without usable embeddings have missing embeddings (NaN / None), never fabricated zero vectors.
- Comprehensive Image Quality & OCR Features:
  - Dimensions (width, height, aspect ratio), file sizes, Laplacian sharpness, luminance, contrast.
  - OCR readability counts, OCR coverage ratio, packaging consistency scores (mean, median, min, max).
  - Explicit duplicate evidence (within-product, cross-product, other sharing products).
- Visual Evidence Status:
  - NO_IMAGE_RECORDS, NO_USABLE_IMAGES, USABLE_IMAGE_EVIDENCE, PARTIAL_IMAGE_EVIDENCE.
  - Never penalizes missing visual evidence as fraud.
- Outputs:
  - data/processed/cv_product_features_expanded.parquet
  - data/processed/cv_product_embeddings_expanded.npy
  - data/processed/cv_product_embeddings_metadata.parquet
  - data/processed/cv_product_aggregation_report.json
"""

import os
import sys
import json
import time
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Set

sys.path.insert(0, os.path.abspath("."))

import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class ProductFeatureAggregator:
    """
    Builds the expanded 31,289-product visual feature dataset.
    """

    def __init__(
        self,
        canonical_products_path: str = "data/processed/canonical_products.parquet",
        manifest_path: str = "data/interim/expanded_image_manifest.parquet",
        quality_report_path: str = "data/processed/image_quality_report.parquet",
        embeddings_matrix_path: str = "data/processed/expanded_image_embeddings_resnet18.npy",
        embeddings_metadata_path: str = "data/processed/expanded_image_embeddings_metadata.parquet",
        output_features_path: str = "data/processed/cv_product_features_expanded.parquet",
        output_product_embeddings_matrix_path: str = "data/processed/cv_product_embeddings_expanded.npy",
        output_product_embeddings_meta_path: str = "data/processed/cv_product_embeddings_metadata.parquet",
        output_report_path: str = "data/processed/cv_product_aggregation_report.json",
    ):
        self.canonical_products_path = Path(canonical_products_path)
        self.manifest_path = Path(manifest_path)
        self.quality_report_path = Path(quality_report_path)
        self.embeddings_matrix_path = Path(embeddings_matrix_path)
        self.embeddings_metadata_path = Path(embeddings_metadata_path)
        self.output_features_path = Path(output_features_path)
        self.output_product_embeddings_matrix_path = Path(output_product_embeddings_matrix_path)
        self.output_product_embeddings_meta_path = Path(output_product_embeddings_meta_path)
        self.output_report_path = Path(output_report_path)

        self.output_features_path.parent.mkdir(parents=True, exist_ok=True)

    def run(self) -> Tuple[pd.DataFrame, np.ndarray, pd.DataFrame, Dict[str, Any]]:
        """
        Executes full aggregation and validates all integrity constraints.
        """
        t0 = time.time()
        logging.info("==================================================")
        logging.info("Starting Stage 4: Product-Level Feature Aggregation")
        logging.info("==================================================")

        # 1. Load canonical products catalog (strictly preserving all 31,289 products)
        logging.info("Loading canonical products from %s", self.canonical_products_path)
        df_products = pd.read_parquet(self.canonical_products_path)
        total_products = len(df_products)
        assert total_products == 31289, f"Expected 31,289 products, found {total_products}"
        assert df_products["canonical_product_id"].is_unique, "Duplicate product IDs in source canonical products!"

        base_df = df_products[["canonical_product_id", "marketplace", "category"]].drop_duplicates().copy()

        # 2. Load Stage 2 Manifest
        logging.info("Loading expanded image manifest from %s", self.manifest_path)
        df_images = pd.read_parquet(self.manifest_path)
        assert len(df_images) == 13390, f"Expected 13,390 image records, found {len(df_images)}"

        # 3. Load Stage 3 Image Embeddings
        logging.info("Loading Stage 3 embeddings from %s", self.embeddings_matrix_path)
        img_emb_matrix = np.load(self.embeddings_matrix_path)
        img_emb_meta = pd.read_parquet(self.embeddings_metadata_path)
        assert img_emb_matrix.shape == (5887, 512), f"Expected (5887, 512), found {img_emb_matrix.shape}"
        assert len(img_emb_meta) == 5887, f"Expected 5,887 metadata rows, found {len(img_emb_meta)}"

        # Build fast vector lookup: image_id -> vector
        img_id_to_vec = {row["image_id"]: img_emb_matrix[row["embedding_index"]] for _, row in img_emb_meta.iterrows()}

        # 4. Product-level Embedding Aggregation (Pooling over UNIQUE SHA-256 assets)
        logging.info("Aggregating product embeddings over unique SHA-256 assets...")
        product_emb_rows = []
        product_vec_list = []

        # Group usable image metadata by product
        usable_by_product = img_emb_meta.groupby("canonical_product_id")

        for prod_id, grp in usable_by_product:
            mkt = grp["marketplace"].iloc[0]
            total_usable_imgs = len(grp)

            # Unique exact assets: deduplicate by content_hash_sha256
            unique_assets = grp.drop_duplicates(subset=["content_hash_sha256"])
            unique_asset_count = len(unique_assets)

            # Extract vectors for each unique asset
            asset_vectors = np.stack([img_id_to_vec[img_id] for img_id in unique_assets["image_id"]])

            # Mean pooling over unique assets
            mean_vec = np.mean(asset_vectors, axis=0)
            norm = np.linalg.norm(mean_vec)
            if norm > 0:
                normed_vec = (mean_vec / norm).astype(np.float32)
            else:
                normed_vec = mean_vec.astype(np.float32)

            prod_idx = len(product_vec_list)
            product_vec_list.append(normed_vec)

            product_emb_rows.append({
                "product_embedding_index": prod_idx,
                "canonical_product_id": prod_id,
                "marketplace": mkt,
                "embedding_image_count": total_usable_imgs,
                "embedding_unique_asset_count": unique_asset_count,
                "embedding_aggregation_method": "mean_pooling_over_unique_sha256",
                "product_embedding": normed_vec,
            })

        df_prod_emb = pd.DataFrame(product_emb_rows)
        product_emb_matrix = np.stack(product_vec_list).astype(np.float32) if product_vec_list else np.empty((0, 512), dtype=np.float32)

        logging.info("Product embeddings computed: %d products (Shape: %s)", len(df_prod_emb), product_emb_matrix.shape)
        assert len(df_prod_emb) == 1647, f"Expected 1,647 products with embeddings, found {len(df_prod_emb)}"
        assert product_emb_matrix.shape == (1647, 512)

        # 5. Image Count & Coverage Aggregation per Product
        logging.info("Computing granular image counts and ratios per product...")
        img_work = df_images.copy()

        # Indicators
        img_work["is_dl"] = img_work["download_status"].eq("DOWNLOADED")
        img_work["is_usable_bool"] = img_work["is_usable"].eq(True)
        img_work["is_val"] = img_work["quality_status"].eq("VALIDATED")
        img_work["is_near_dup"] = img_work["quality_status"].eq("NEAR_DUPLICATE")
        img_work["is_exact_dup"] = img_work["quality_status"].eq("DUPLICATE")
        img_work["is_low_q"] = img_work["quality_status"].eq("LOW_QUALITY")
        img_work["is_irrel"] = img_work["quality_status"].eq("IRRELEVANT")
        img_work["is_fail"] = img_work["download_status"].eq("DOWNLOAD_FAILED")
        img_work["has_readable_txt"] = img_work["has_readable_text"].eq(True)

        prod_counts = (
            img_work.groupby("canonical_product_id")
            .agg(
                total_image_records=("image_id", "count"),
                downloaded_image_count=("is_dl", "sum"),
                usable_image_count=("is_usable_bool", "sum"),
                validated_image_count=("is_val", "sum"),
                near_duplicate_image_count=("is_near_dup", "sum"),
                exact_duplicate_image_count=("is_exact_dup", "sum"),
                low_quality_image_count=("is_low_q", "sum"),
                irrelevant_image_count=("is_irrel", "sum"),
                download_failed_image_count=("is_fail", "sum"),
                unique_sha256_count=("content_hash_sha256", lambda s: s.dropna().nunique()),
                unique_dhash_count=("perceptual_hash_dhash", lambda s: s.dropna().nunique()),
                ocr_readable_image_count=("has_readable_txt", "sum"),
            )
            .reset_index()
        )

        # Coverage ratios (strictly NaN when denominator is 0)
        prod_counts["image_download_coverage_ratio"] = np.where(
            prod_counts["total_image_records"] > 0,
            prod_counts["downloaded_image_count"] / prod_counts["total_image_records"],
            np.nan,
        )

        prod_counts["image_usability_ratio"] = np.where(
            prod_counts["total_image_records"] > 0,
            prod_counts["usable_image_count"] / prod_counts["total_image_records"],
            np.nan,
        )

        prod_counts["ocr_coverage_ratio"] = np.where(
            prod_counts["usable_image_count"] > 0,
            prod_counts["ocr_readable_image_count"] / prod_counts["usable_image_count"],
            np.nan,
        )

        # 6. Image Quality & Dimension Aggregations (Computed over downloaded images only)
        logging.info("Computing quality metrics (dimensions, sharpness, luminance, packaging)...")
        dl_images = img_work[img_work["is_dl"]].copy()

        quality_aggs = (
            dl_images.groupby("canonical_product_id")
            .agg(
                image_width_mean=("width", "mean"),
                image_height_mean=("height", "mean"),
                image_aspect_ratio_mean=("aspect_ratio", "mean"),
                file_size_bytes_mean=("file_size_bytes", "mean"),
                file_size_bytes_max=("file_size_bytes", "max"),
                sharpness_score_mean=("sharpness_score", "mean"),
                sharpness_score_median=("sharpness_score", "median"),
                sharpness_score_min=("sharpness_score", "min"),
                sharpness_score_max=("sharpness_score", "max"),
                mean_luminance_mean=("mean_luminance", "mean"),
                contrast_std_mean=("contrast_std", "mean"),
                primary_image_format=("image_format", lambda s: s.mode().iloc[0] if not s.empty else None),
            )
            .reset_index()
        )

        # Packaging consistency scores (Computed only where packaging_consistency_score is non-null)
        pkg_images = dl_images.dropna(subset=["packaging_consistency_score"])
        pkg_aggs = (
            pkg_images.groupby("canonical_product_id")
            .agg(
                packaging_score_mean=("packaging_consistency_score", "mean"),
                packaging_score_median=("packaging_consistency_score", "median"),
                packaging_score_min=("packaging_consistency_score", "min"),
                packaging_score_max=("packaging_consistency_score", "max"),
            )
            .reset_index()
        )

        # 7. Duplication and Syndication Evidence per Product
        logging.info("Computing duplicate and near-duplicate evidence...")
        # A. Within-product exact duplicates
        lead_prod_lookup = img_work.set_index("image_id")["canonical_product_id"].to_dict()
        exact_dup_rows = img_work[img_work["is_exact_dup"]].copy()
        exact_dup_rows["lead_prod_id"] = exact_dup_rows["duplicate_of_image_id"].map(lead_prod_lookup)

        within_prod_dups = (
            exact_dup_rows[exact_dup_rows["canonical_product_id"] == exact_dup_rows["lead_prod_id"]]
            .groupby("canonical_product_id")["image_id"]
            .count()
            .reset_index(name="within_product_duplicate_image_count")
        )

        # B. Cross-product exact duplicates
        # Hash to products mapping
        hash_to_prods = (
            img_work.dropna(subset=["content_hash_sha256"])
            .groupby("content_hash_sha256")["canonical_product_id"]
            .unique()
            .to_dict()
        )
        cross_hashes = {h: prods for h, prods in hash_to_prods.items() if len(prods) > 1}

        cp_rows = []
        for h, prods in cross_hashes.items():
            for p in prods:
                for other in prods:
                    if other != p:
                        cp_rows.append({"canonical_product_id": p, "content_hash_sha256": h, "other_prod": other})

        df_cp = pd.DataFrame(cp_rows)
        if not df_cp.empty:
            cp_summary = (
                df_cp.groupby("canonical_product_id")
                .agg(
                    cross_product_duplicate_hash_count=("content_hash_sha256", "nunique"),
                    distinct_other_products_sharing_image=("other_prod", "nunique"),
                )
                .reset_index()
            )
            # Count of cross-product duplicate images for product
            cp_img_counts = (
                img_work[img_work["content_hash_sha256"].isin(cross_hashes.keys())]
                .groupby("canonical_product_id")["image_id"]
                .count()
                .reset_index(name="cross_product_duplicate_image_count")
            )
            cp_summary = cp_summary.merge(cp_img_counts, on="canonical_product_id", how="left")
        else:
            cp_summary = pd.DataFrame(columns=[
                "canonical_product_id", "cross_product_duplicate_hash_count",
                "distinct_other_products_sharing_image", "cross_product_duplicate_image_count"
            ])

        # C. Near-duplicate breakdown (same product vs cross product)
        near_dup_rows = img_work[img_work["is_near_dup"]].copy()
        near_dup_rows["lead_prod_id"] = near_dup_rows["near_duplicate_of_image_id"].map(lead_prod_lookup)

        near_same_prod = (
            near_dup_rows[near_dup_rows["canonical_product_id"] == near_dup_rows["lead_prod_id"]]
            .groupby("canonical_product_id")["image_id"]
            .count()
            .reset_index(name="near_duplicate_same_product_count")
        )

        near_cross_prod = (
            near_dup_rows[near_dup_rows["canonical_product_id"] != near_dup_rows["lead_prod_id"]]
            .groupby("canonical_product_id")["image_id"]
            .count()
            .reset_index(name="near_duplicate_cross_product_count")
        )

        # 8. Merge all feature subsets into canonical products master frame
        logging.info("Merging features into 31,289 canonical products master table...")
        final_df = base_df.merge(prod_counts, on="canonical_product_id", how="left")
        final_df = final_df.merge(quality_aggs, on="canonical_product_id", how="left")
        final_df = final_df.merge(pkg_aggs, on="canonical_product_id", how="left")
        final_df = final_df.merge(within_prod_dups, on="canonical_product_id", how="left")
        final_df = final_df.merge(cp_summary, on="canonical_product_id", how="left")
        final_df = final_df.merge(near_same_prod, on="canonical_product_id", how="left")
        final_df = final_df.merge(near_cross_prod, on="canonical_product_id", how="left")

        # Merge product embeddings metadata
        final_df = final_df.merge(
            df_prod_emb[["canonical_product_id", "product_embedding_index", "embedding_image_count",
                         "embedding_unique_asset_count", "embedding_aggregation_method", "product_embedding"]],
            on="canonical_product_id",
            how="left",
        )

        # 9. Clean up and fill counts (0 for missing counts; keep measurements NaN)
        count_cols = [
            "total_image_records",
            "downloaded_image_count",
            "usable_image_count",
            "validated_image_count",
            "near_duplicate_image_count",
            "exact_duplicate_image_count",
            "low_quality_image_count",
            "irrelevant_image_count",
            "download_failed_image_count",
            "unique_sha256_count",
            "unique_dhash_count",
            "ocr_readable_image_count",
            "within_product_duplicate_image_count",
            "cross_product_duplicate_image_count",
            "cross_product_duplicate_hash_count",
            "distinct_other_products_sharing_image",
            "near_duplicate_same_product_count",
            "near_duplicate_cross_product_count",
            "embedding_image_count",
            "embedding_unique_asset_count",
        ]

        for col in count_cols:
            if col in final_df.columns:
                final_df[col] = final_df[col].fillna(0).astype("int64")

        # Embedding flag
        final_df["has_product_embedding"] = final_df["product_embedding_index"].notna()

        # 10. Assign Visual Evidence Status
        # - NO_IMAGE_RECORDS: total == 0
        # - NO_USABLE_IMAGES: total > 0 and usable == 0
        # - USABLE_IMAGE_EVIDENCE: usable > 0 and usable == total
        # - PARTIAL_IMAGE_EVIDENCE: usable > 0 and usable < total
        final_df["visual_evidence_status"] = "NO_IMAGE_RECORDS"

        total_gt_0 = final_df["total_image_records"] > 0
        usable_eq_0 = final_df["usable_image_count"] == 0
        usable_gt_0 = final_df["usable_image_count"] > 0
        usable_eq_total = final_df["usable_image_count"] == final_df["total_image_records"]
        usable_lt_total = final_df["usable_image_count"] < final_df["total_image_records"]

        final_df.loc[total_gt_0 & usable_eq_0, "visual_evidence_status"] = "NO_USABLE_IMAGES"
        final_df.loc[usable_gt_0 & usable_eq_total, "visual_evidence_status"] = "USABLE_IMAGE_EVIDENCE"
        final_df.loc[usable_gt_0 & usable_lt_total, "visual_evidence_status"] = "PARTIAL_IMAGE_EVIDENCE"

        # Also populate image_evidence_status for notebook backward compatibility
        final_df["image_evidence_status"] = final_df["visual_evidence_status"]

        # 11. Mandatory Validations
        logging.info("Executing mandatory Stage 4 validations...")
        assert len(final_df) == 31289, f"Row count mismatch: {len(final_df)} vs 31,289"
        assert final_df["canonical_product_id"].is_unique, "Product IDs are not unique!"
        assert set(final_df["canonical_product_id"]) == set(df_products["canonical_product_id"]), "Product ID set mismatch!"
        assert final_df["total_image_records"].sum() == 13390, f"Image count sum mismatch: {final_df['total_image_records'].sum()} vs 13,390"
        assert final_df["downloaded_image_count"].sum() == 11808, f"Downloaded count mismatch: {final_df['downloaded_image_count'].sum()} vs 11,808"
        assert final_df["usable_image_count"].sum() == 5887, f"Usable count mismatch: {final_df['usable_image_count'].sum()} vs 5,887"
        assert final_df["embedding_image_count"].sum() == 5887, f"Embedding count mismatch: {final_df['embedding_image_count'].sum()} vs 5,887"

        # Embeddings check
        prods_with_emb = final_df[final_df["has_product_embedding"]]
        assert len(prods_with_emb) == 1647, f"Expected 1,647 products with embeddings, got {len(prods_with_emb)}"
        prods_without_emb = final_df[~final_df["has_product_embedding"]]
        assert prods_without_emb["product_embedding"].isna().all(), "Products without usable images have non-missing embeddings!"
        assert prods_without_emb["product_embedding_index"].isna().all()

        emb_matrix_norms = np.linalg.norm(product_emb_matrix, axis=1)
        assert np.allclose(emb_matrix_norms, 1.0, atol=1e-4), "Product embedding norms deviate from 1.0!"
        assert np.isfinite(product_emb_matrix).all(), "Product embedding matrix contains non-finite values!"
        assert product_emb_matrix.shape == (1647, 512), f"Product embedding matrix shape mismatch: {product_emb_matrix.shape}"

        # Missing measurements check
        prods_no_imgs = final_df[final_df["total_image_records"] == 0]
        assert prods_no_imgs["sharpness_score_mean"].isna().all(), "Products without images must have missing sharpness!"
        assert prods_no_imgs["packaging_score_mean"].isna().all(), "Products without images must have missing packaging score!"
        assert prods_no_imgs["image_download_coverage_ratio"].isna().all(), "Coverage ratio must be NaN for products with 0 images!"

        # 12. Save Artifacts Safely
        logging.info("Saving Stage 4 artifacts...")
        # Save parquet feature table
        final_df.to_parquet(self.output_features_path, index=False)
        logging.info("Saved product features to %s (%d rows, %d columns)", self.output_features_path, len(final_df), len(final_df.columns))

        # Save product embeddings matrix and metadata
        np.save(self.output_product_embeddings_matrix_path, product_emb_matrix)
        df_prod_emb_meta = df_prod_emb[[
            "product_embedding_index", "canonical_product_id", "marketplace",
            "embedding_image_count", "embedding_unique_asset_count", "embedding_aggregation_method"
        ]].copy()
        df_prod_emb_meta.to_parquet(self.output_product_embeddings_meta_path, index=False)
        logging.info("Saved product embedding matrix to %s (Shape: %s)", self.output_product_embeddings_matrix_path, product_emb_matrix.shape)
        logging.info("Saved product embedding metadata to %s (Rows: %d)", self.output_product_embeddings_meta_path, len(df_prod_emb_meta))

        # 13. Build Report
        elapsed = time.time() - t0
        report = {
            "execution_timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "elapsed_seconds": round(elapsed, 2),
            "total_canonical_products": total_products,
            "products_with_image_records": int((final_df["total_image_records"] > 0).sum()),
            "products_without_image_records": int((final_df["total_image_records"] == 0).sum()),
            "products_with_usable_images": int((final_df["usable_image_count"] > 0).sum()),
            "products_with_images_but_no_usable": int(((final_df["total_image_records"] > 0) & (final_df["usable_image_count"] == 0)).sum()),
            "products_with_embeddings": len(prods_with_emb),
            "product_embedding_dimensions": 512,
            "product_embedding_matrix_shape": list(product_emb_matrix.shape),
            "evidence_status_distribution": final_df["visual_evidence_status"].value_counts().to_dict(),
            "embedding_aggregation_method": "mean_pooling_over_unique_sha256_normalized_l2",
            "exact_duplicate_handling": "Pooled strictly across unique SHA-256 assets per product to prevent weight inflation",
            "near_duplicate_handling": "Retained as distinct visual assets contributing to the pooled representation",
            "cross_product_sharing": {
                "products_sharing_images": int((final_df["cross_product_duplicate_image_count"] > 0).sum()),
                "total_affected_image_instances": int(final_df["cross_product_duplicate_image_count"].sum()),
            },
            "ocr_feature_coverage": {
                "products_with_readable_ocr": int((final_df["ocr_readable_image_count"] > 0).sum()),
                "products_with_packaging_score": int(final_df["packaging_score_mean"].notna().sum()),
                "packaging_score_mean_across_products": float(final_df["packaging_score_mean"].dropna().mean()),
            },
            "output_artifacts": {
                "features_table": str(self.output_features_path),
                "product_embeddings_matrix": str(self.output_product_embeddings_matrix_path),
                "product_embeddings_metadata": str(self.output_product_embeddings_meta_path),
                "report_json": str(self.output_report_path),
            },
            "validations_passed": {
                "exactly_31289_products": True,
                "unique_product_ids": True,
                "complete_id_match": True,
                "image_counts_reconciled": True,
                "usable_counts_reconciled": True,
                "embedding_counts_reconciled": True,
                "missing_embeddings_for_non_usable": True,
                "unit_l2_normalization": True,
                "finite_values": True,
                "missing_measurements_preserved": True,
            },
        }

        with open(self.output_report_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
        logging.info("Saved aggregation report to %s", self.output_report_path)

        return final_df, product_emb_matrix, df_prod_emb_meta, report


if __name__ == "__main__":
    aggregator = ProductFeatureAggregator()
    df_features, matrix, meta, report = aggregator.run()
    print("\nAggregation Report Summary:\n", json.dumps(report, indent=2))
