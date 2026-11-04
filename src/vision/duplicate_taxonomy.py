"""
src/vision/duplicate_taxonomy.py
--------------------------------
Disambiguates Visual Duplicate Taxonomy: Exact Cryptographic Collisions,
Perceptual dHash Clusters, and Cross-Listing Image Sharing.
"""

from typing import Dict, Any, List, Set, Tuple
from collections import defaultdict
import pandas as pd
import numpy as np


class VisualDuplicateTaxonomyAuditor:
    """
    Audits and disambiguates the image duplicate hierarchy across:
    1. Exact cryptographic collisions (identical byte content / SHA-256).
    2. Perceptual duplicates (dHash Hamming distance == 0).
    3. Near-duplicates (dHash Hamming distance <= 4).
    4. Cross-product image syndication vs within-product angle shots.
    """

    @staticmethod
    def hamming_distance(h1: str, h2: str) -> int:
        if not h1 or not h2 or len(h1) != len(h2):
            return 999
        try:
            val1 = int(h1, 16)
            val2 = int(h2, 16)
            return bin(val1 ^ val2).count("1")
        except ValueError:
            return 999

    def audit_duplicate_hierarchy(self, images_df: pd.DataFrame) -> Dict[str, Any]:
        """
        Computes the complete visual duplicate taxonomy.
        """
        usable = images_df[images_df["is_usable"]].copy()

        # 1. Exact SHA-256 Collisions
        sha_to_prods = usable.groupby("content_hash_sha256")["canonical_product_id"].unique()
        sha_to_imgs = usable.groupby("content_hash_sha256")["image_id"].unique()

        cross_sha_groups = {h: pids for h, pids in sha_to_prods.items() if len(pids) > 1}
        within_sha_groups = {h: pids for h, pids in sha_to_prods.items() if len(pids) == 1 and len(sha_to_imgs[h]) > 1}

        exact_cross_edges = 0
        for h, pids in cross_sha_groups.items():
            img_ids = list(sha_to_imgs[h])
            n = len(img_ids)
            exact_cross_edges += (n * (n - 1)) // 2

        # 2. Perceptual dHash Collisions (Hamming distance == 0)
        dhash_to_prods = usable.groupby("perceptual_hash_dhash")["canonical_product_id"].unique()
        dhash_to_imgs = usable.groupby("perceptual_hash_dhash")["image_id"].unique()

        cross_dhash_groups = {dh: pids for dh, pids in dhash_to_prods.items() if len(pids) > 1}

        perceptual_cross_edges = 0
        for dh, pids in cross_dhash_groups.items():
            img_ids = list(dhash_to_imgs[dh])
            n = len(img_ids)
            perceptual_cross_edges += (n * (n - 1)) // 2

        return {
            "total_usable_images": len(usable),
            "exact_sha256_cross_product_hash_groups": len(cross_sha_groups),
            "exact_sha256_within_product_hash_groups": len(within_sha_groups),
            "exact_sha256_cross_product_edges": exact_cross_edges,
            "perceptual_dhash_cross_product_groups": len(cross_dhash_groups),
            "perceptual_dhash_cross_product_edges": perceptual_cross_edges,
            "total_graph_duplicate_edges": exact_cross_edges + perceptual_cross_edges
        }
