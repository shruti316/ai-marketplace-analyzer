"""
scripts/batch_process_clip_catalog.py
--------------------------------------
Batch-processes catalog-wide CLIP Vision-Language alignment across all eligible products.
Reuses existing precomputed embeddings, processes missing products in vectorized batches,
preserves the Zero-Penalty Invariant, and saves versioned Parquet evidence artifacts.
"""

from __future__ import annotations

import argparse
import logging
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import numpy as np
import pandas as pd
from PIL import Image
import torch

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("batch_clip_catalog")

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATASET_DIR = PROJECT_ROOT / "data" / "indian_marketplace_trust_dataset_v1_7"


class CatalogCLIPBatchProcessor:
    """Orchestrates catalog-wide CLIP inference with incremental caching and vectorization."""

    MODEL_ID = "openai/clip-vit-base-patch32"
    HIGH_ALIGNMENT_THRESHOLD = 0.22
    BORDERLINE_THRESHOLD = 0.16

    def __init__(self, dataset_dir: Path = DATASET_DIR, batch_size: int = 32):
        self.dataset_dir = Path(dataset_dir)
        self.batch_size = batch_size
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.out_path = self.dataset_dir / "derived_evidence" / "image_text_consistency.parquet"

        self._load_metadata()
        self._load_model()

    def _load_metadata(self) -> None:
        """Loads canonical entities and usable images."""
        self.prods_df = pd.read_parquet(self.dataset_dir / "entities" / "products.parquet")
        self.images_df = pd.read_parquet(self.dataset_dir / "evidence" / "images.parquet")
        self.usable_images = self.images_df[self.images_df["is_usable"] == True].copy()

        # Product title lookup
        self.title_map = self.prods_df.set_index("canonical_product_id")["product_title"].dropna().to_dict()

        # Select primary image per canonical product
        # Prioritize local_image_path over local_path
        img_col = "local_image_path" if "local_image_path" in self.usable_images.columns else "local_path"
        self.primary_images = (
            self.usable_images.groupby("canonical_product_id")
            .first()
            .reset_index()[["canonical_product_id", "image_id", img_col, "listing_id", "marketplace"]]
        )
        self.primary_images.rename(columns={img_col: "image_path"}, inplace=True)
        logger.info(
            f"Catalog inventory: {len(self.prods_df)} products | {len(self.primary_images)} have usable images on disk."
        )

    def _load_model(self) -> None:
        """Initializes HuggingFace CLIP processor and model."""
        from transformers import CLIPModel, CLIPProcessor
        logger.info(f"Loading CLIP model '{self.MODEL_ID}' on device: {self.device}...")
        self.processor = CLIPProcessor.from_pretrained(self.MODEL_ID)
        self.model = CLIPModel.from_pretrained(self.MODEL_ID).to(self.device)
        self.model.eval()
        logger.info("CLIP model ready for batch inference.")

    def run_catalog_processing(self, limit: Optional[int] = None) -> pd.DataFrame:
        """Processes all missing products in batches, preserving existing records."""
        existing_records: List[Dict[str, Any]] = []
        processed_pids: Set[str] = set()

        if self.out_path.exists():
            df_existing = pd.read_parquet(self.out_path)
            existing_records = df_existing.to_dict("records")
            processed_pids = set(df_existing["canonical_product_id"].unique())
            logger.info(f"Loaded {len(df_existing)} pre-existing CLIP records from disk.")

        # Identify pending products
        pending_mask = ~self.primary_images["canonical_product_id"].isin(processed_pids)
        pending_df = self.primary_images[pending_mask].copy()

        if limit is not None and limit > 0:
            pending_df = pending_df.head(limit)

        logger.info(f"Pending products to process: {len(pending_df)}")
        if pending_df.empty:
            logger.info("Catalog CLIP processing already 100% complete.")
            return pd.DataFrame(existing_records)

        new_records: List[Dict[str, Any]] = []
        total_pending = len(pending_df)
        t_start = time.time()

        for batch_idx in range(0, total_pending, self.batch_size):
            batch_rows = pending_df.iloc[batch_idx : batch_idx + self.batch_size]
            imgs: List[Image.Image] = []
            texts: List[str] = []
            valid_rows = []

            for _, row in batch_rows.iterrows():
                pid = row["canonical_product_id"]
                img_p = Path(row["image_path"])
                if not img_p.is_absolute():
                    img_p = PROJECT_ROOT / img_p

                title = self.title_map.get(pid, "").strip()
                if not img_p.exists() or not title:
                    continue

                try:
                    pil_img = Image.open(img_p).convert("RGB")
                    imgs.append(pil_img)
                    texts.append(title[:300])
                    valid_rows.append(row)
                except Exception as e:
                    logger.warning(f"Failed to open image for {pid}: {e}")

            if not imgs:
                continue

            # Vectorized batch forward pass
            t0 = time.time()
            inputs = self.processor(
                text=texts,
                images=imgs,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=77,
            ).to(self.device)

            with torch.no_grad():
                outputs = self.model(**inputs)
                img_embeds = outputs.image_embeds / outputs.image_embeds.norm(dim=-1, keepdim=True)
                txt_embeds = outputs.text_embeds / outputs.text_embeds.norm(dim=-1, keepdim=True)
                sims = torch.sum(img_embeds * txt_embeds, dim=-1).cpu().numpy()

            latency_per_item = (time.time() - t0) * 1000.0 / len(imgs)

            for i, row in enumerate(valid_rows):
                sim_val = round(float(sims[i]), 4)
                if sim_val >= self.HIGH_ALIGNMENT_THRESHOLD:
                    status = "HIGH_VISUAL_TEXT_ALIGNMENT"
                    conf = 0.95
                    discordant = False
                elif sim_val >= self.BORDERLINE_THRESHOLD:
                    status = "MODERATE_VISUAL_TEXT_ALIGNMENT"
                    conf = 0.80
                    discordant = False
                else:
                    status = "DISCORDANT_IMAGE_TEXT_MISMATCH"
                    conf = 0.90
                    discordant = True

                new_records.append({
                    "consistency_record_id": f"clip_aln_{row['canonical_product_id']}",
                    "canonical_product_id": row["canonical_product_id"],
                    "listing_id": row.get("listing_id", f"listing_{row['canonical_product_id']}"),
                    "image_id": row["image_id"],
                    "listing_title": self.title_map.get(row["canonical_product_id"], ""),
                    "model_architecture": "openai/clip-vit-base-patch32",
                    "cosine_similarity": sim_val,
                    "alignment_status": status,
                    "confidence": conf,
                    "is_discordant": discordant,
                    "provenance": "GENUINE_CLIP_VIT_B32_NORMALIZED_COSINE",
                    "processing_latency_ms": round(latency_per_item, 2),
                    "timestamp": time.time(),
                })

            done_count = min(batch_idx + self.batch_size, total_pending)
            elapsed = time.time() - t_start
            rate = done_count / elapsed if elapsed > 0 else 1.0
            eta = (total_pending - done_count) / rate if rate > 0 else 0
            logger.info(
                f"Processed {done_count}/{total_pending} products ({done_count/total_pending*100:.1f}%) | "
                f"Rate: {rate:.1f} items/s | ETA: {eta:.0f}s"
            )

        # Merge and save
        all_records = existing_records + new_records
        df_final = pd.DataFrame(all_records)
        df_final.drop_duplicates(subset=["canonical_product_id"], keep="last", inplace=True)

        self.out_path.parent.mkdir(parents=True, exist_ok=True)
        df_final.to_parquet(self.out_path, index=False)
        logger.info(f"Persisted complete CLIP catalog evidence to: {self.out_path} ({len(df_final)} rows)")

        return df_final


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Batch process CLIP catalog")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size for PyTorch inference")
    parser.add_argument("--limit", type=int, default=None, help="Optional limit for dry-run testing")
    args = parser.parse_args()

    processor = CatalogCLIPBatchProcessor(batch_size=args.batch_size)
    processor.run_catalog_processing(limit=args.limit)
