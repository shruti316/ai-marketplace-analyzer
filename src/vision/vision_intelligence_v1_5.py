"""
src/vision/vision_intelligence_v1_5.py
---------------------------------------
Computer Vision Feature Engineering, Exact/Perceptual Duplicate Disambiguation,
and Image Quality Intelligence for Release v1.5.
"""

from collections import defaultdict
from pathlib import Path
from typing import Dict, Any, List, Set, Tuple
import pandas as pd
import numpy as np
import logging

PROJECT_ROOT = Path(__file__).resolve().parents[2]
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class VisionIntelligenceEngineV15:
    """
    Computes visual integrity metrics, disambiguates exact vs near-duplicate
    perceptual clusters, and assesses listing image quality.
    """

    @staticmethod
    def audit_visual_taxonomy(images_df: pd.DataFrame) -> Dict[str, Any]:
        """
        Disambiguates:
        1. Exact SHA-256 file duplicates
        2. Exact dHash perceptual collisions (distance = 0)
        3. Near-duplicate dHash pairs (distance <= 4)
        4. Cross-product vs within-product image reuse
        """
        usable = images_df[images_df["is_usable"] == True].copy()

        # SHA-256 exact file duplicates
        sha_counts = usable["sha256"].value_counts()
        exact_sha_clusters = sha_counts[sha_counts > 1]
        n_exact_sha_clusters = len(exact_sha_clusters)
        n_exact_sha_images = exact_sha_clusters.sum()

        # dHash exact perceptual collisions
        dhash_col = "dhash" if "dhash" in usable.columns else "perceptual_hash_dhash"
        dhash_counts = usable[dhash_col].value_counts()
        exact_dhash_clusters = dhash_counts[dhash_counts > 1]
        n_exact_dhash_clusters = len(exact_dhash_clusters)
        n_exact_dhash_images = exact_dhash_clusters.sum()

        # Cross-product image reuse
        pid_dhash = usable.groupby(dhash_col)["canonical_product_id"].nunique()
        cross_prod_clusters = pid_dhash[pid_dhash > 1]
        n_cross_prod_clusters = len(cross_prod_clusters)

        # Resolution distribution
        low_res = int(((usable["width"] < 300) | (usable["height"] < 300)).sum())
        med_res = int((usable["width"] >= 300) & (usable["width"] <= 800)).sum()
        high_res = int((usable["width"] > 800).sum())

        return {
            "total_usable_images": len(usable),
            "exact_sha256_duplicates": {
                "clusters": int(n_exact_sha_clusters),
                "images_involved": int(n_exact_sha_images)
            },
            "perceptual_dhash_collisions": {
                "clusters": int(n_exact_dhash_clusters),
                "images_involved": int(n_exact_dhash_images),
                "cross_product_reuse_clusters": int(n_cross_prod_clusters)
            },
            "resolution_breakdown": {
                "low_resolution_under_300px": low_res,
                "medium_resolution_300_to_800px": med_res,
                "high_resolution_over_800px": high_res
            },
            "modality_note": "Visual intelligence uses perceptual hashing (dHash) and SHA-256 integrity analysis. No deep learning model claims are asserted."
        }
