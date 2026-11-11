"""
Category-Aware CLIP Calibration and Vision-Language Consistency Engine (V1.1)
AI-Powered Indian Marketplace Trust Intelligence Platform

Solves the category baseline divergence in CLIP vision-language alignment:
- Categorizes images relative to their product category distribution
- Calculates standardized category z-scores: z = (similarity - mu_cat) / sigma_cat
- Prevents false-discordance flags in low-baseline categories (e.g. Clothing & Fashion)
- Flags true semantic discordance in high-baseline categories (e.g. Beauty & Personal Care)
- Integrates brand token concordance and title attribute alignment
"""

from dataclasses import asdict, dataclass
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import pandas as pd

logger = logging.getLogger("CategoryCLIPCalibratorV1_1")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATASET_DIR = PROJECT_ROOT / "data" / "indian_marketplace_trust_dataset_v1_7"


@dataclass
class CalibratedCLIPResult:
    """Strongly typed output contract for category-calibrated vision-language alignment."""
    canonical_product_id: str
    listing_title: str
    category: str
    raw_cosine_similarity: float
    category_mean: float
    category_std: float
    category_zscore: float
    category_percentile: float
    calibrated_alignment_status: str   # HIGH_ALIGNMENT, NORMAL_ALIGNMENT, BORDERLINE, DISCORDANT_ANOMALY
    is_category_discordant: bool
    brand_concordance_score: float
    confidence: float
    evidence_reason: str

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["raw_cosine_similarity"] = round(self.raw_cosine_similarity, 4)
        d["category_mean"] = round(self.category_mean, 4)
        d["category_std"] = round(self.category_std, 4)
        d["category_zscore"] = round(self.category_zscore, 3)
        d["category_percentile"] = round(self.category_percentile, 3)
        d["brand_concordance_score"] = round(self.brand_concordance_score, 3)
        d["confidence"] = round(self.confidence, 3)
        return d


class CategoryAwareCLIPCalibrator:
    """
    Calibrates CLIP similarity scores against empirical category priors
    to separate genuine image-title discordance from category-level vocabulary shifts.
    """

    # Global fallback statistics when category has fewer than 10 samples
    GLOBAL_MEAN = 0.318
    GLOBAL_STD = 0.045

    def __init__(self, dataset_dir: Path = DATASET_DIR):
        self.dataset_dir = Path(dataset_dir)
        self.category_priors: Dict[str, Dict[str, float]] = {}
        self.brand_map: Dict[str, str] = {}
        self._fit_category_priors()

    def _fit_category_priors(self) -> None:
        """Computes empirical mean, std, and sample counts per product category."""
        clip_path = self.dataset_dir / "derived_evidence" / "image_text_consistency.parquet"
        prod_path = self.dataset_dir / "entities" / "products.parquet"

        if not clip_path.exists() or not prod_path.exists():
            logger.warning("CLIP or Products table missing; using global fallback priors.")
            return

        c_df = pd.read_parquet(clip_path)
        p_df = pd.read_parquet(prod_path)

        merged = c_df.merge(p_df[["canonical_product_id", "category", "brand"]], on="canonical_product_id", how="left")

        # Clean categories
        merged["category"] = merged["category"].fillna("Uncategorized")
        
        # Build brand lookup
        self.brand_map = p_df.set_index("canonical_product_id")["brand"].dropna().to_dict()

        for cat, group in merged.groupby("category"):
            scores = group["cosine_similarity"].dropna().values
            if len(scores) >= 10:
                self.category_priors[cat] = {
                    "count": float(len(scores)),
                    "mean": float(np.mean(scores)),
                    "std": max(0.015, float(np.std(scores))),
                    "min": float(np.min(scores)),
                    "max": float(np.max(scores)),
                }
            else:
                self.category_priors[cat] = {
                    "count": float(len(scores)),
                    "mean": self.GLOBAL_MEAN,
                    "std": self.GLOBAL_STD,
                    "min": float(np.min(scores)) if len(scores) > 0 else 0.20,
                    "max": float(np.max(scores)) if len(scores) > 0 else 0.40,
                }

        logger.info(f"Fitted category-aware priors across {len(self.category_priors)} categories.")

    def calibrate_product(
        self,
        canonical_product_id: str,
        raw_cosine_sim: float,
        listing_title: str = "",
        category: Optional[str] = None,
        brand: Optional[str] = None,
    ) -> CalibratedCLIPResult:
        """
        Calibrates a single product's CLIP alignment relative to its category cohort.
        """
        cat = category or "Uncategorized"
        priors = self.category_priors.get(cat, {
            "mean": self.GLOBAL_MEAN,
            "std": self.GLOBAL_STD,
            "count": 0.0,
        })

        mu = priors["mean"]
        sigma = priors["std"]

        # Standardized category z-score
        z = (raw_cosine_sim - mu) / sigma if sigma > 0 else 0.0

        # Empirical percentile approximation from normal CDF
        from scipy.stats import norm
        pct = float(norm.cdf(z))

        # Brand concordance check
        b_name = brand or self.brand_map.get(canonical_product_id, "")
        brand_concordance = 1.0
        if b_name and isinstance(b_name, str) and len(b_name) > 2:
            if b_name.lower() in listing_title.lower():
                brand_concordance = 1.0
            else:
                brand_concordance = 0.5  # Brand omitted in title

        # Classification rules:
        # A pair is discordant ONLY if it is >= 2.2 std deviations below category mean
        # OR raw similarity is severely depressed (< 0.17)
        if z <= -2.2 or raw_cosine_sim < 0.17:
            status = "DISCORDANT_ANOMALY"
            is_disc = True
            conf = 0.90
            reason = f"Image-title alignment (cos={raw_cosine_sim:.3f}) is severely depressed ({z:.2f} std dev below '{cat}' mean {mu:.3f})."
        elif z <= -1.5 or raw_cosine_sim < 0.21:
            status = "BORDERLINE_LOW_ALIGNMENT"
            is_disc = False
            conf = 0.75
            reason = f"Image-title alignment is moderately below category expectation ({z:.2f} std dev below '{cat}' mean)."
        elif z >= 0.8:
            status = "HIGH_ALIGNMENT"
            is_disc = False
            conf = 0.95
            reason = f"Verified high visual-title concordance ({z:.2f} std dev above '{cat}' mean {mu:.3f})."
        else:
            status = "NORMAL_ALIGNMENT"
            is_disc = False
            conf = 0.85
            reason = f"Typical visual-title concordance for category '{cat}' (cos={raw_cosine_sim:.3f}, mean={mu:.3f})."

        return CalibratedCLIPResult(
            canonical_product_id=canonical_product_id,
            listing_title=listing_title,
            category=cat,
            raw_cosine_similarity=float(raw_cosine_sim),
            category_mean=mu,
            category_std=sigma,
            category_zscore=float(z),
            category_percentile=float(pct),
            calibrated_alignment_status=status,
            is_category_discordant=is_disc,
            brand_concordance_score=float(brand_concordance),
            confidence=float(conf),
            evidence_reason=reason,
        )

    def generate_v1_1_clip_derived_evidence(
        self, out_path: Optional[Path] = None
    ) -> pd.DataFrame:
        """
        Processes catalog CLIP records into V1.1 derived evidence with category calibration.
        Saves separately to `image_text_consistency_v1_1.parquet` without modifying V1.0!
        """
        clip_path = self.dataset_dir / "derived_evidence" / "image_text_consistency.parquet"
        prod_path = self.dataset_dir / "entities" / "products.parquet"

        if out_path is None:
            out_path = self.dataset_dir / "derived_evidence" / "image_text_consistency_v1_1.parquet"

        c_df = pd.read_parquet(clip_path)
        p_df = pd.read_parquet(prod_path)

        merged = c_df.merge(
            p_df[["canonical_product_id", "category", "brand"]],
            on="canonical_product_id",
            how="left"
        )

        records = []
        for _, row in merged.iterrows():
            pid = row["canonical_product_id"]
            sim = row["cosine_similarity"]
            title = str(row.get("listing_title", ""))
            cat = str(row.get("category", "Uncategorized"))
            brand = str(row.get("brand", ""))

            cal = self.calibrate_product(
                canonical_product_id=pid,
                raw_cosine_sim=sim,
                listing_title=title,
                category=cat,
                brand=brand,
            )

            rec = row.to_dict()
            rec["category_mean"] = cal.category_mean
            rec["category_std"] = cal.category_std
            rec["category_zscore"] = cal.category_zscore
            rec["category_percentile"] = cal.category_percentile
            rec["calibrated_alignment_status"] = cal.calibrated_alignment_status
            rec["is_category_discordant"] = cal.is_category_discordant
            rec["brand_concordance_score"] = cal.brand_concordance_score
            rec["provenance"] = "CALIBRATED_CLIP_VISION_LANGUAGE_V1_1"
            records.append(rec)

        v1_1_df = pd.DataFrame(records)
        v1_1_df.to_parquet(out_path, index=False)
        logger.info(f"Saved V1.1 Category-Calibrated CLIP evidence to: {out_path} ({len(v1_1_df)} rows)")
        return v1_1_df
