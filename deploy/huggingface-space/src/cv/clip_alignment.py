"""Vision-Language Consistency and CLIP Alignment Engine.

Utilizes OpenAI CLIP (clip-vit-base-patch32) to compute normalized multi-modal
embeddings between product imagery and listing titles/descriptions, measuring
semantic alignment and detecting packaging/listing discordance.
"""

from dataclasses import asdict, dataclass
import json
import logging
from pathlib import Path
import time
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from PIL import Image
import torch

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATASET_DIR = PROJECT_ROOT / "data" / "indian_marketplace_trust_dataset_v1_7"


@dataclass
class AlignmentRecord:
    consistency_record_id: str
    canonical_product_id: str
    listing_id: str
    image_id: str
    listing_title: str
    model_architecture: str
    cosine_similarity: float
    alignment_status: str
    confidence: float
    is_discordant: bool
    provenance: str
    processing_latency_ms: float
    timestamp: float


class CLIPAlignmentEngine:
    """Zero-shot Vision-Language Alignment engine using HuggingFace Transformers."""

    MODEL_ID = "openai/clip-vit-base-patch32"
    HIGH_ALIGNMENT_THRESHOLD = 0.22
    BORDERLINE_THRESHOLD = 0.16

    def __init__(self, dataset_dir: Path = DATASET_DIR, device: Optional[str] = None):
        self.dataset_dir = Path(dataset_dir)
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
        self.processor = None
        self.is_ready = False
        self._load_model()

    def _load_model(self):
        try:
            from transformers import CLIPModel, CLIPProcessor
            logger.info(f"Loading CLIP model '{self.MODEL_ID}' onto {self.device}...")
            self.processor = CLIPProcessor.from_pretrained(self.MODEL_ID)
            self.model = CLIPModel.from_pretrained(self.MODEL_ID).to(self.device)
            self.model.eval()
            self.is_ready = True
            logger.info("CLIP model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load CLIP model: {e}")
            self.is_ready = False

    def compute_similarity(self, image_path: Path, text: str) -> Dict[str, Any]:
        """Calculates cosine similarity between a physical image and a text string."""
        t0 = time.time()
        p = Path(image_path)
        if not p.is_absolute():
            p = PROJECT_ROOT / p

        if not self.is_ready:
            return {
                "cosine_similarity": 0.0,
                "alignment_status": "MODEL_UNAVAILABLE",
                "confidence": 0.0,
                "is_discordant": False,
                "latency_ms": (time.time() - t0) * 1000,
            }

        if not p.exists() or not text or not text.strip():
            return {
                "cosine_similarity": 0.0,
                "alignment_status": "INPUT_MISSING",
                "confidence": 0.0,
                "is_discordant": False,
                "latency_ms": (time.time() - t0) * 1000,
            }

        try:
            pil_img = Image.open(p).convert("RGB")
            # Truncate text to 77 tokens max for CLIP
            inputs = self.processor(
                text=[text[:300]],
                images=pil_img,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=77,
            ).to(self.device)

            with torch.no_grad():
                outputs = self.model(**inputs)
                image_embeds = outputs.image_embeds
                text_embeds = outputs.text_embeds

                # Normalize embeddings
                image_embeds = image_embeds / image_embeds.norm(dim=-1, keepdim=True)
                text_embeds = text_embeds / text_embeds.norm(dim=-1, keepdim=True)

                # Cosine similarity
                sim = torch.sum(image_embeds * text_embeds, dim=-1).item()

            sim_val = round(float(sim), 4)

            # Classify alignment
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

            return {
                "cosine_similarity": sim_val,
                "alignment_status": status,
                "confidence": conf,
                "is_discordant": discordant,
                "latency_ms": round((time.time() - t0) * 1000, 2),
            }

        except Exception as e:
            logger.error(f"Inference failed for {p}: {e}")
            return {
                "cosine_similarity": 0.0,
                "alignment_status": "INFERENCE_ERROR",
                "confidence": 0.0,
                "is_discordant": False,
                "latency_ms": round((time.time() - t0) * 1000, 2),
            }

    def process_dataset_cohort(self, limit: int = 100) -> pd.DataFrame:
        """Processes a benchmark cohort and writes derived evidence to parquet."""
        out_path = self.dataset_dir / "derived_evidence" / "image_text_consistency.parquet"
        img_path = self.dataset_dir / "evidence" / "images.parquet"
        prod_path = self.dataset_dir / "entities" / "products.parquet"
        list_path = self.dataset_dir / "entities" / "listings.parquet"

        img_df = pd.read_parquet(img_path)
        prod_df = pd.read_parquet(prod_path) if prod_path.exists() else pd.DataFrame()
        list_df = pd.read_parquet(list_path) if list_path.exists() else pd.DataFrame()

        title_map = {}
        if "product_title" in prod_df.columns:
            title_map = prod_df.set_index("canonical_product_id")["product_title"].to_dict()
        elif "listing_title" in list_df.columns:
            title_map = list_df.set_index("canonical_product_id")["listing_title"].to_dict()

        # Select first `limit` usable images with valid paths
        records = []
        logger.info(f"Computing CLIP vision-language consistency across {limit} product images...")

        sample_imgs = img_df[img_df["is_usable"] == True].head(limit)

        for _, row in sample_imgs.iterrows():
            iid = row["image_id"]
            pid = row["canonical_product_id"]
            lid = row.get("listing_id", f"listing_{pid}")
            lpath = row.get("local_path", "")
            title = str(title_map.get(pid, ""))

            align_res = self.compute_similarity(lpath, title)

            records.append({
                "consistency_record_id": f"clip_align_{iid}",
                "canonical_product_id": pid,
                "listing_id": lid,
                "image_id": iid,
                "listing_title": title[:200],
                "model_architecture": self.MODEL_ID,
                "cosine_similarity": align_res["cosine_similarity"],
                "alignment_status": align_res["alignment_status"],
                "confidence": align_res["confidence"],
                "is_discordant": align_res["is_discordant"],
                "provenance": "GENUINE_OPENAI_CLIP_INFERENCE",
                "processing_latency_ms": align_res["latency_ms"],
                "timestamp": time.time(),
            })

        result_df = pd.DataFrame(records)
        result_df.to_parquet(out_path, index=False)
        logger.info(f"Successfully processed {len(result_df)} records into {out_path}")
        return result_df


if __name__ == "__main__":
    aligner = CLIPAlignmentEngine()
    df = aligner.process_dataset_cohort(limit=100)
    print(df["alignment_status"].value_counts())
    print(df[["image_id", "cosine_similarity", "alignment_status", "listing_title"]].head(10))
