"""
Image and Computer Vision Intelligence Pipeline
AI-Powered Indian Marketplace Trust Intelligence Platform

Provides image file validation, exact file hashing, perceptual hashing (dHash/aHash),
ResNet-18 embedding centered cosine similarity matching, duplicate and near-duplicate clustering,
and cross-product image reuse detection.
"""

from collections import defaultdict
import hashlib
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import networkx as nx
import numpy as np
import pandas as pd
from PIL import Image

logger = logging.getLogger("ImageIntelligence")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class ImageFileValidator:
    """Validates physical image files and computes cryptographic and perceptual hashes."""

    @staticmethod
    def compute_dhash(img: Image.Image) -> str:
        """Calculates 64-bit difference hash (dHash) represented as 16-character hex string."""
        resized = img.convert("L").resize((9, 8), Image.Resampling.LANCZOS)
        arr = np.array(resized, dtype=np.float32)
        diff = arr[:, :-1] > arr[:, 1:]
        val = 0
        for bit in diff.flatten():
            val = (val << 1) | int(bit)
        return f"{val:016x}"

    @staticmethod
    def compute_ahash(img: Image.Image) -> str:
        """Calculates 64-bit average hash (aHash) represented as 16-character hex string."""
        resized = img.convert("L").resize((8, 8), Image.Resampling.LANCZOS)
        arr = np.array(resized, dtype=np.float32)
        avg = arr.mean()
        diff = arr > avg
        val = 0
        for bit in diff.flatten():
            val = (val << 1) | int(bit)
        return f"{val:016x}"

    @classmethod
    def audit_image_file(cls, file_path: str, precomputed_meta: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Audits physical file integrity, dimensions, format, file size, and hashes."""
        if not file_path or not os.path.exists(file_path):
            return {
                "file_exists": False,
                "is_corrupt": True,
                "file_size_bytes": 0,
                "width": 0,
                "height": 0,
                "aspect_ratio": 0.0,
                "format": "UNKNOWN",
                "sha256_hash": None,
                "dhash": None,
            }

        try:
            file_size = os.path.getsize(file_path)
            if file_size == 0:
                return {
                    "file_exists": True,
                    "is_corrupt": True,
                    "file_size_bytes": 0,
                    "width": 0,
                    "height": 0,
                    "aspect_ratio": 0.0,
                    "format": "CORRUPT",
                    "sha256_hash": None,
                    "dhash": None,
                }

            # If metadata already precomputed in evidence table, use verified values
            if precomputed_meta and pd.notna(precomputed_meta.get("sha256")) and pd.notna(precomputed_meta.get("width")):
                w = int(precomputed_meta["width"])
                h = int(precomputed_meta["height"])
                aspect = round(float(w) / float(h), 3) if h > 0 else 0.0
                return {
                    "file_exists": True,
                    "is_corrupt": False,
                    "file_size_bytes": file_size,
                    "width": w,
                    "height": h,
                    "aspect_ratio": aspect,
                    "format": str(precomputed_meta.get("format", "JPEG")),
                    "sha256_hash": str(precomputed_meta["sha256"]),
                    "dhash": str(precomputed_meta.get("perceptual_hash_dhash", "")),
                }

            with Image.open(file_path) as img:
                img.load()
                w, h = img.size
                fmt = img.format or "JPEG"
                aspect = round(float(w) / float(h), 3) if h > 0 else 0.0
                dhash_str = cls.compute_dhash(img)

            with open(file_path, "rb") as f:
                sha256_str = hashlib.sha256(f.read()).hexdigest()

            return {
                "file_exists": True,
                "is_corrupt": False,
                "file_size_bytes": file_size,
                "width": w,
                "height": h,
                "aspect_ratio": aspect,
                "format": fmt,
                "sha256_hash": sha256_str,
                "dhash": dhash_str,
            }
        except Exception as e:
            logger.warning(f"Error auditing image {file_path}: {e}")
            return {
                "file_exists": True,
                "is_corrupt": True,
                "file_size_bytes": os.path.getsize(file_path) if os.path.exists(file_path) else 0,
                "width": 0,
                "height": 0,
                "aspect_ratio": 0.0,
                "format": "CORRUPT",
                "sha256_hash": None,
                "dhash": None,
            }


class VisualEmbeddingMatcher:
    """Performs centered cosine similarity matching and clustering on ResNet-18 embeddings."""

    @staticmethod
    def center_and_normalize(embeddings: np.ndarray) -> np.ndarray:
        """
        Removes representation anisotropy (positive orthant cone effect) by subtracting
        the global mean activation vector before re-normalizing to unit L2 norm.
        """
        mean_vec = np.mean(embeddings, axis=0, keepdims=True)
        centered = embeddings - mean_vec
        norms = np.linalg.norm(centered, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        return centered / norms

    @classmethod
    def find_similar_pairs(
        cls,
        embeddings: np.ndarray,
        image_ids: List[str],
        product_ids: List[str],
        marketplaces: List[str],
        similarity_threshold: float = 0.90,
    ) -> List[Dict[str, Any]]:
        """Finds pairs of images exceeding centered cosine similarity threshold."""
        logger.info(f"Computing centered pairwise cosine similarities for {len(image_ids)} images...")
        norm_emb = cls.center_and_normalize(embeddings)
        sim_matrix = np.dot(norm_emb, norm_emb.T)

        n = len(image_ids)
        pairs: List[Dict[str, Any]] = []

        # Extract upper triangle indices where similarity >= threshold
        row_indices, col_indices = np.where(np.triu(sim_matrix, k=1) >= similarity_threshold)

        for r, c in zip(row_indices, col_indices):
            sim_score = float(sim_matrix[r, c])
            img1, img2 = image_ids[r], image_ids[c]
            prod1, prod2 = product_ids[r], product_ids[c]
            mkt1, mkt2 = marketplaces[r], marketplaces[c]

            is_cross_prod = (prod1 != prod2)
            is_cross_mkt = (mkt1 != mkt2)

            if sim_score >= 0.98:
                evidence_status = "NEAR_IDENTICAL_IMAGE"
            elif sim_score >= 0.95:
                evidence_status = "VERY_HIGH_VISUAL_SIMILARITY"
            else:
                evidence_status = "MODERATE_HIGH_VISUAL_SIMILARITY"

            pairs.append({
                "image_pair_id": f"img_pair_{r:05d}_{c:05d}",
                "image_id_1": img1,
                "image_id_2": img2,
                "canonical_product_id_1": prod1,
                "canonical_product_id_2": prod2,
                "marketplace_1": mkt1,
                "marketplace_2": mkt2,
                "similarity_score": round(sim_score, 4),
                "similarity_method": "RESNET18_CENTERED_COSINE_SIMILARITY",
                "threshold_used": similarity_threshold,
                "is_cross_product": is_cross_prod,
                "is_cross_marketplace": is_cross_mkt,
                "evidence_status": evidence_status,
            })

        logger.info(f"Found {len(pairs)} image pairs with centered cosine similarity >= {similarity_threshold}.")
        return pairs


class ImageClusterDetector:
    """Builds connected component clusters of duplicate and near-duplicate images."""

    @classmethod
    def cluster_images(
        cls,
        image_ids: List[str],
        similar_pairs: List[Dict[str, Any]],
        exact_duplicate_map: Dict[str, str],
    ) -> Tuple[Dict[str, str], List[Dict[str, Any]]]:
        """Creates graph connected components for images sharing high visual similarity."""
        g = nx.Graph()
        for iid in image_ids:
            g.add_node(iid)

        # Add edges for high similarity pairs (sim >= 0.95)
        for p in similar_pairs:
            if p["similarity_score"] >= 0.95:
                g.add_edge(p["image_id_1"], p["image_id_2"], weight=p["similarity_score"])

        clusters = []
        node_cluster_map = {}

        components = list(nx.connected_components(g))
        cid_counter = 0

        for comp in components:
            if len(comp) > 1:
                cid = f"img_vis_cluster_{cid_counter:05d}"
                cid_counter += 1
                for node in comp:
                    node_cluster_map[node] = cid

                clusters.append({
                    "cluster_id": cid,
                    "cluster_type": "HIGH_VISUAL_SIMILARITY_CLUSTER",
                    "image_count": len(comp),
                    "member_image_ids": list(comp),
                })

        return node_cluster_map, clusters


class ImageIntelligenceEngine:
    """Master orchestrator for Image and Computer Vision Intelligence."""

    def __init__(self, images_df: pd.DataFrame, embeddings_path: str):
        self.images_df = images_df[images_df["is_usable"] == True].copy()
        self.embeddings_path = embeddings_path

    def run_pipeline(self) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, Dict[str, Any]]:
        """Executes the CV intelligence pipeline."""
        df = self.images_df
        logger.info(f"Starting Image Intelligence Pipeline on {len(df)} usable images...")

        # 1. Audit Physical Files
        logger.info("Auditing physical files and computing hashes...")
        file_audit_records = []
        for idx, row in df.iterrows():
            lpath = row.get("local_path", "")
            precomp = {
                "width": row.get("width"),
                "height": row.get("height"),
                "format": row.get("format"),
                "sha256": row.get("sha256"),
                "perceptual_hash_dhash": row.get("perceptual_hash_dhash"),
            }
            finfo = ImageFileValidator.audit_image_file(lpath, precomputed_meta=precomp)
            file_audit_records.append({
                "image_id": row["image_id"],
                "canonical_product_id": row["canonical_product_id"],
                "listing_id": row.get("listing_id", ""),
                "marketplace": row.get("marketplace", ""),
                "local_path": lpath,
                **finfo,
            })

        features_df = pd.DataFrame(file_audit_records)

        # 2. Exact duplicate file hashing
        sha_counts = features_df["sha256_hash"].value_counts()
        dup_shas = set(sha_counts[sha_counts > 1].index)
        features_df["is_exact_file_duplicate"] = features_df["sha256_hash"].isin(dup_shas)

        # 3. Load ResNet-18 Embeddings
        logger.info(f"Loading ResNet-18 embeddings from {self.embeddings_path}...")
        npz = np.load(self.embeddings_path)
        emb_arr = npz["normalized_embeddings"]
        emb_img_ids = npz["image_ids"].tolist()
        emb_prod_ids = npz["canonical_product_ids"].tolist()

        # Map embeddings to features_df order
        img_id_to_idx = {iid: idx for idx, iid in enumerate(emb_img_ids)}
        ordered_indices = [img_id_to_idx[iid] for iid in features_df["image_id"] if iid in img_id_to_idx]

        ordered_emb = emb_arr[ordered_indices]
        ordered_ids = [emb_img_ids[i] for i in ordered_indices]
        ordered_prods = [emb_prod_ids[i] for i in ordered_indices]
        ordered_mkts = features_df["marketplace"].tolist()

        # 4. Pairwise Centered Cosine Similarity Matching
        similar_pairs = VisualEmbeddingMatcher.find_similar_pairs(
            ordered_emb, ordered_ids, ordered_prods, ordered_mkts, similarity_threshold=0.90
        )
        pairs_df = pd.DataFrame(similar_pairs)

        # 5. Connected Component Clustering
        cluster_map, clusters = ImageClusterDetector.cluster_images(
            ordered_ids, similar_pairs, {}
        )
        clusters_df = pd.DataFrame(clusters)

        features_df["visual_cluster_id"] = features_df["image_id"].map(cluster_map)
        features_df["is_visual_near_duplicate"] = features_df["visual_cluster_id"].notna()

        # Cross product reuse signal
        prod_reuse_images = set()
        if not pairs_df.empty:
            cross_pairs = pairs_df[(pairs_df["is_cross_product"] == True) & (pairs_df["similarity_score"] >= 0.95)]
            prod_reuse_images.update(cross_pairs["image_id_1"])
            prod_reuse_images.update(cross_pairs["image_id_2"])

        features_df["is_cross_product_image_reuse"] = features_df["image_id"].isin(prod_reuse_images)
        features_df["IMAGE_REUSE_SIGNAL"] = features_df["is_cross_product_image_reuse"]
        features_df["IMAGE_CORRUPT_SIGNAL"] = features_df["is_corrupt"]
        features_df["provenance"] = "REPRODUCIBLE_CV_INTELLIGENCE_V1_5"

        summary = {
            "total_images_processed": len(features_df),
            "valid_physical_files": int(features_df["file_exists"].sum()),
            "corrupt_images": int(features_df["is_corrupt"].sum()),
            "exact_file_duplicates": int(features_df["is_exact_file_duplicate"].sum()),
            "near_duplicate_pairs_ge_90": len(pairs_df),
            "near_duplicate_pairs_ge_95": int((pairs_df["similarity_score"] >= 0.95).sum()) if not pairs_df.empty else 0,
            "visual_similarity_clusters": len(clusters_df),
            "cross_product_reuse_images": int(features_df["is_cross_product_image_reuse"].sum()),
            "format_distribution": features_df["format"].value_counts().to_dict(),
        }

        logger.info(f"Image Intelligence Pipeline completed successfully: {json.dumps(summary, indent=2)}")
        return features_df, pairs_df, clusters_df, summary
