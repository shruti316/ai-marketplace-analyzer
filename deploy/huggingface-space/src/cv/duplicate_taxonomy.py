"""
Fine-Grained 6-Tier Duplicate Image Taxonomy & Visual Intelligence Engine (V1.1)
AI-Powered Indian Marketplace Trust Intelligence Platform

Implements the formal 6-tier visual relationship taxonomy:
1. EXACT_DUPLICATE: Identical bitwise content (cryptographic SHA-256 match).
2. NEAR_DUPLICATE: Same underlying image with compression, resizing, brightness, or watermarking.
3. SAME_PRODUCT_DIFFERENT_IMAGE: Distinct photographs / camera angles of the same product entity.
4. SAME_PRODUCT_VARIANT: Legitimate product variants, colors, flavors, sizes, or packaging revisions.
5. RELATED_PRODUCT: Meaningful visual similarity within subcategory, but distinct product identities.
6. UNRELATED: Distinct items with low visual correlation.
7. REVIEW_REQUIRED: Ambiguous intermediate similarity requiring human investigator triage.

Zero-Penalty Guard:
Legitimate multi-angle shots and catalog variant groupings are never penalized as suspicious reuse.
Suspicious image reuse is flagged only when exact/near-duplicates bridge unrelated catalog products.
"""

from dataclasses import asdict, dataclass
import enum
import logging
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import pandas as pd

logger = logging.getLogger("DuplicateTaxonomyV1_1")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class VisualTaxonomyTier(str, enum.Enum):
    EXACT_DUPLICATE = "EXACT_DUPLICATE"
    NEAR_DUPLICATE = "NEAR_DUPLICATE"
    SAME_PRODUCT_DIFFERENT_IMAGE = "SAME_PRODUCT_DIFFERENT_IMAGE"
    SAME_PRODUCT_VARIANT = "SAME_PRODUCT_VARIANT"
    RELATED_PRODUCT = "RELATED_PRODUCT"
    UNRELATED = "UNRELATED"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"


@dataclass
class DuplicateTaxonomyResult:
    """Strongly typed classification outcome for an image pair."""
    pair_id: str
    image_id_1: str
    image_id_2: str
    canonical_product_id_1: str
    canonical_product_id_2: str
    marketplace_1: str
    marketplace_2: str
    taxonomy_tier: str                 # VisualTaxonomyTier
    confidence: float
    centered_cosine_similarity: float
    dhash_hamming_distance: int
    is_same_product: bool
    is_same_brand: bool
    is_cross_marketplace: bool
    is_suspicious_cross_product_reuse: bool
    classification_reason: str

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["centered_cosine_similarity"] = round(self.centered_cosine_similarity, 4)
        d["confidence"] = round(self.confidence, 4)
        return d


class AdvancedDuplicateTaxonomyClassifier:
    """
    Classifies image pairs into fine-grained taxonomic tiers using multi-evidence fusion:
    - SHA-256 bitwise equality
    - 64-bit dHash Hamming distance
    - ResNet-18 centered cosine similarity
    - Entity metadata (canonical_product_id, brand, category, seller)
    """

    # Default calibrated thresholds
    DHASH_EXACT_THRESHOLD = 0          # Bitwise dHash match
    DHASH_NEAR_DUP_THRESHOLD = 4       # Max Hamming distance for near duplicate
    RESNET_NEAR_DUP_THRESHOLD = 0.96   # Centered cosine similarity cutoff for near dup
    RESNET_VARIANT_THRESHOLD = 0.85    # Variant similarity cutoff
    RESNET_RELATED_THRESHOLD = 0.70    # Related product similarity cutoff
    DHASH_UNRELATED_THRESHOLD = 18     # Obvious perceptual mismatch

    @staticmethod
    def compute_hamming_distance(hex_hash_1: Optional[str], hex_hash_2: Optional[str]) -> int:
        """Computes Hamming distance between two 16-character hex dHash strings."""
        if not hex_hash_1 or not hex_hash_2 or len(hex_hash_1) != 16 or len(hex_hash_2) != 16:
            return 64  # Max distance for invalid/missing hashes
        try:
            val1 = int(hex_hash_1, 16)
            val2 = int(hex_hash_2, 16)
            xor_val = val1 ^ val2
            return bin(xor_val).count("1")
        except ValueError:
            return 64

    @classmethod
    def classify_image_pair(
        cls,
        meta_1: Dict[str, Any],
        meta_2: Dict[str, Any],
        centered_cosine_sim: float,
        dhash_distance: Optional[int] = None,
        category: Optional[str] = None,
    ) -> DuplicateTaxonomyResult:
        """
        Classifies the relationship between two images into the 6-tier taxonomy.
        """
        img1 = str(meta_1.get("image_id", ""))
        img2 = str(meta_2.get("image_id", ""))
        pid1 = str(meta_1.get("canonical_product_id", ""))
        pid2 = str(meta_2.get("canonical_product_id", ""))
        mkt1 = str(meta_1.get("marketplace", ""))
        mkt2 = str(meta_2.get("marketplace", ""))
        sha1 = str(meta_1.get("sha256", meta_1.get("sha256_hash", "")))
        sha2 = str(meta_2.get("sha256", meta_2.get("sha256_hash", "")))
        brand1 = str(meta_1.get("brand", "")).lower().strip()
        brand2 = str(meta_2.get("brand", "")).lower().strip()

        if dhash_distance is None:
            dh1 = str(meta_1.get("perceptual_hash_dhash", meta_1.get("dhash", "")))
            dh2 = str(meta_2.get("perceptual_hash_dhash", meta_2.get("dhash", "")))
            dhash_dist = cls.compute_hamming_distance(dh1, dh2)
        else:
            dhash_dist = int(dhash_distance)

        is_same_pid = (pid1 == pid2) and (pid1 != "")
        is_same_brand = (brand1 == brand2) and (brand1 != "")
        is_cross_mkt = (mkt1 != mkt2) and (mkt1 != "") and (mkt2 != "")

        # Category-specific tightening for uniform white background categories
        resnet_near_cut = cls.RESNET_NEAR_DUP_THRESHOLD
        dhash_near_cut = cls.DHASH_NEAR_DUP_THRESHOLD
        if category in ("Electronics", "Clothing & Fashion"):
            resnet_near_cut = 0.975
            dhash_near_cut = 3

        # 1. Tier 1: EXACT_DUPLICATE
        if sha1 and sha2 and sha1 == sha2:
            is_suspicious = (not is_same_pid)
            reason = "Cryptographically identical SHA-256 bitwise file duplicate."
            if is_suspicious:
                reason += " Cross-product asset copy detected across distinct listings."
            return DuplicateTaxonomyResult(
                pair_id=f"pair_{img1}_{img2}",
                image_id_1=img1,
                image_id_2=img2,
                canonical_product_id_1=pid1,
                canonical_product_id_2=pid2,
                marketplace_1=mkt1,
                marketplace_2=mkt2,
                taxonomy_tier=VisualTaxonomyTier.EXACT_DUPLICATE.value,
                confidence=1.00,
                centered_cosine_similarity=float(centered_cosine_sim),
                dhash_hamming_distance=dhash_dist,
                is_same_product=is_same_pid,
                is_same_brand=is_same_brand,
                is_cross_marketplace=is_cross_mkt,
                is_suspicious_cross_product_reuse=is_suspicious,
                classification_reason=reason,
            )

        # 2. Tier 2: NEAR_DUPLICATE
        # Perceptual gradient match + high deep visual similarity
        if dhash_dist <= dhash_near_cut and centered_cosine_sim >= resnet_near_cut:
            is_suspicious = (not is_same_pid)
            reason = f"Perceptual near-duplicate (dHash H={dhash_dist}, cos={centered_cosine_sim:.3f})."
            if is_suspicious:
                reason += " Unaffiliated listing asset reuse with minor modifications/compression."
            return DuplicateTaxonomyResult(
                pair_id=f"pair_{img1}_{img2}",
                image_id_1=img1,
                image_id_2=img2,
                canonical_product_id_1=pid1,
                canonical_product_id_2=pid2,
                marketplace_1=mkt1,
                marketplace_2=mkt2,
                taxonomy_tier=VisualTaxonomyTier.NEAR_DUPLICATE.value,
                confidence=0.96,
                centered_cosine_similarity=float(centered_cosine_sim),
                dhash_hamming_distance=dhash_dist,
                is_same_product=is_same_pid,
                is_same_brand=is_same_brand,
                is_cross_marketplace=is_cross_mkt,
                is_suspicious_cross_product_reuse=is_suspicious,
                classification_reason=reason,
            )

        # 3. Tier 3: SAME_PRODUCT_DIFFERENT_IMAGE
        # Different photos of the exact same canonical product
        if is_same_pid:
            reason = f"Multi-angle photography of the same canonical product (dHash H={dhash_dist}, cos={centered_cosine_sim:.3f})."
            return DuplicateTaxonomyResult(
                pair_id=f"pair_{img1}_{img2}",
                image_id_1=img1,
                image_id_2=img2,
                canonical_product_id_1=pid1,
                canonical_product_id_2=pid2,
                marketplace_1=mkt1,
                marketplace_2=mkt2,
                taxonomy_tier=VisualTaxonomyTier.SAME_PRODUCT_DIFFERENT_IMAGE.value,
                confidence=0.92,
                centered_cosine_similarity=float(centered_cosine_sim),
                dhash_hamming_distance=dhash_dist,
                is_same_product=is_same_pid,
                is_same_brand=is_same_brand,
                is_cross_marketplace=is_cross_mkt,
                is_suspicious_cross_product_reuse=False,
                classification_reason=reason,
            )

        # 4. Tier 4: SAME_PRODUCT_VARIANT
        # Legitimate brand variants (same brand, high visual similarity, moderate dHash)
        if is_same_brand and centered_cosine_sim >= cls.RESNET_VARIANT_THRESHOLD:
            reason = f"Legitimate product variant within brand '{brand1}' (cos={centered_cosine_sim:.3f})."
            return DuplicateTaxonomyResult(
                pair_id=f"pair_{img1}_{img2}",
                image_id_1=img1,
                image_id_2=img2,
                canonical_product_id_1=pid1,
                canonical_product_id_2=pid2,
                marketplace_1=mkt1,
                marketplace_2=mkt2,
                taxonomy_tier=VisualTaxonomyTier.SAME_PRODUCT_VARIANT.value,
                confidence=0.88,
                centered_cosine_similarity=float(centered_cosine_sim),
                dhash_hamming_distance=dhash_dist,
                is_same_product=is_same_pid,
                is_same_brand=is_same_brand,
                is_cross_marketplace=is_cross_mkt,
                is_suspicious_cross_product_reuse=False,
                classification_reason=reason,
            )

        # 5. Review Required: Borderline Ambiguous
        if centered_cosine_sim >= 0.92 and dhash_dist <= 8:
            reason = f"Ambiguous visual overlap across different brands (dHash H={dhash_dist}, cos={centered_cosine_sim:.3f}). Human review recommended."
            return DuplicateTaxonomyResult(
                pair_id=f"pair_{img1}_{img2}",
                image_id_1=img1,
                image_id_2=img2,
                canonical_product_id_1=pid1,
                canonical_product_id_2=pid2,
                marketplace_1=mkt1,
                marketplace_2=mkt2,
                taxonomy_tier=VisualTaxonomyTier.REVIEW_REQUIRED.value,
                confidence=0.70,
                centered_cosine_similarity=float(centered_cosine_sim),
                dhash_hamming_distance=dhash_dist,
                is_same_product=is_same_pid,
                is_same_brand=is_same_brand,
                is_cross_marketplace=is_cross_mkt,
                is_suspicious_cross_product_reuse=True,
                classification_reason=reason,
            )

        # 6. Tier 5: RELATED_PRODUCT
        if centered_cosine_sim >= cls.RESNET_RELATED_THRESHOLD:
            reason = f"Related category aesthetics (cos={centered_cosine_sim:.3f}, dHash H={dhash_dist})."
            return DuplicateTaxonomyResult(
                pair_id=f"pair_{img1}_{img2}",
                image_id_1=img1,
                image_id_2=img2,
                canonical_product_id_1=pid1,
                canonical_product_id_2=pid2,
                marketplace_1=mkt1,
                marketplace_2=mkt2,
                taxonomy_tier=VisualTaxonomyTier.RELATED_PRODUCT.value,
                confidence=0.80,
                centered_cosine_similarity=float(centered_cosine_sim),
                dhash_hamming_distance=dhash_dist,
                is_same_product=is_same_pid,
                is_same_brand=is_same_brand,
                is_cross_marketplace=is_cross_mkt,
                is_suspicious_cross_product_reuse=False,
                classification_reason=reason,
            )

        # 7. Tier 6: UNRELATED
        return DuplicateTaxonomyResult(
            pair_id=f"pair_{img1}_{img2}",
            image_id_1=img1,
            image_id_2=img2,
            canonical_product_id_1=pid1,
            canonical_product_id_2=pid2,
            marketplace_1=mkt1,
            marketplace_2=mkt2,
            taxonomy_tier=VisualTaxonomyTier.UNRELATED.value,
            confidence=0.95,
            centered_cosine_similarity=float(centered_cosine_sim),
            dhash_hamming_distance=dhash_dist,
            is_same_product=is_same_pid,
            is_same_brand=is_same_brand,
            is_cross_marketplace=is_cross_mkt,
            is_suspicious_cross_product_reuse=False,
            classification_reason=f"Visually and structurally unrelated (cos={centered_cosine_sim:.3f}, dHash H={dhash_dist}).",
        )
