"""
Multimodal Evidence Integration Layer
AI-Powered Indian Marketplace Trust Intelligence Platform

Constructs unified multimodal evidence records, enforces explicit missing modality handling,
and produces explainable, non-fabricating product-level risk assessments.
"""

from collections import defaultdict
import datetime
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

logger = logging.getLogger("EvidenceFusion")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class MissingModalityHandler:
    """
    Enforces the zero-penalty missing modality invariant:
    - Products without reviews MUST NOT receive a negative review penalty.
    - Products without images MUST NOT receive a negative image penalty.
    - Missing OCR or Vision-Language models MUST NOT be treated as inconsistency.
    - Missing modality is marked as MODALITY_UNAVAILABLE, never as zero risk or fraud.
    """

    @staticmethod
    def audit_modality_availability(
        product_id: str,
        review_count: int,
        usable_image_count: int,
        price_obs_count: int,
        has_ocr: bool,
    ) -> Dict[str, str]:
        """Returns availability status for each modality."""
        return {
            "review_modality_status": "AVAILABLE" if review_count > 0 else "MODALITY_UNAVAILABLE",
            "image_modality_status": "AVAILABLE" if usable_image_count > 0 else "MODALITY_UNAVAILABLE",
            "price_modality_status": "AVAILABLE" if price_obs_count > 0 else "MODALITY_UNAVAILABLE",
            "ocr_modality_status": "AVAILABLE" if has_ocr else "BLOCKED_OFFLINE_DEPENDENCY_ABSENT",
            "image_text_modality_status": "BLOCKED_OFFLINE_DEPENDENCY_ABSENT",
        }


class MultimodalEvidenceFusionEngine:
    """
    Builds the unified atomic evidence records table and aggregates
    an explainable product-level trust summary.
    """

    def __init__(
        self,
        products_df: pd.DataFrame,
        listings_df: pd.DataFrame,
        review_features_df: pd.DataFrame,
        image_features_df: pd.DataFrame,
        pricing_features_df: pd.DataFrame,
    ):
        self.products_df = products_df.copy()
        self.listings_df = listings_df.copy()
        self.review_features_df = review_features_df.copy()
        self.image_features_df = image_features_df.copy()
        self.pricing_features_df = pricing_features_df.copy()

    def build_atomic_evidence_records(self) -> pd.DataFrame:
        """
        Creates unified atomic evidence records across review NLP, image CV,
        pricing, OCR, and seller graph modalities.
        """
        logger.info("Synthesizing unified atomic multimodal evidence records...")
        records: List[Dict[str, Any]] = []
        now_ts = datetime.datetime.now(datetime.timezone.utc).isoformat()

        # 1. Review Evidence Records
        logger.info(f"Processing {len(self.review_features_df)} review features for atomic evidence...")
        for _, r in self.review_features_df.iterrows():
            rid = str(r["review_id"])
            pid = str(r["canonical_product_id"])

            # Review sentiment evidence
            records.append({
                "evidence_id": f"ev_rev_sent_{rid}",
                "entity_id": rid,
                "canonical_product_id": pid,
                "listing_id": None,
                "evidence_modality": "REVIEW_NLP",
                "evidence_type": "REVIEW_SENTIMENT",
                "evidence_signal_name": f"SENTIMENT_{r['sentiment_polarity']}",
                "signal_value": str(r["sentiment_score"]),
                "signal_severity": "INFO" if r["sentiment_polarity"] != "NEGATIVE" else "LOW",
                "detection_method": "LEXICAL_RULE_BASED_ANALYZER",
                "confidence": float(r["sentiment_confidence"]),
                "modality_available": True,
                "provenance": "REVIEW_NLP_FEATURE_EXTRACTION",
                "timestamp": now_ts,
            })

            # Rating-review discordance
            if r.get("is_rating_discordant", False):
                records.append({
                    "evidence_id": f"ev_rev_disc_{rid}",
                    "entity_id": rid,
                    "canonical_product_id": pid,
                    "listing_id": None,
                    "evidence_modality": "REVIEW_NLP",
                    "evidence_type": "REVIEW_DISCORDANCE",
                    "evidence_signal_name": "RATING_TEXT_DISCORDANCE_SIGNAL",
                    "signal_value": str(r["rating_discordance_score"]),
                    "signal_severity": "MEDIUM",
                    "detection_method": "RATING_SENTIMENT_NORMALIZED_DELTA",
                    "confidence": 0.85,
                    "modality_available": True,
                    "provenance": "REVIEW_NLP_FEATURE_EXTRACTION",
                    "timestamp": now_ts,
                })

            # Duplicate review signal
            if r.get("is_exact_duplicate", False) and r.get("duplicate_cluster_size", 1) >= 3:
                records.append({
                    "evidence_id": f"ev_rev_dup_{rid}",
                    "entity_id": rid,
                    "canonical_product_id": pid,
                    "listing_id": None,
                    "evidence_modality": "REVIEW_NLP",
                    "evidence_type": "REVIEW_DUPLICATE_CLUSTER",
                    "evidence_signal_name": "REVIEW_SIMILARITY_SIGNAL",
                    "signal_value": str(r["duplicate_cluster_size"]),
                    "signal_severity": "MEDIUM",
                    "detection_method": "MD5_EXACT_TEXT_CLUSTERING",
                    "confidence": 1.0,
                    "modality_available": True,
                    "provenance": "REVIEW_NLP_FEATURE_EXTRACTION",
                    "timestamp": now_ts,
                })

            # Temporal burst signal
            if r.get("is_temporal_burst", False):
                records.append({
                    "evidence_id": f"ev_rev_burst_{rid}",
                    "entity_id": rid,
                    "canonical_product_id": pid,
                    "listing_id": None,
                    "evidence_modality": "REVIEW_NLP",
                    "evidence_type": "REVIEW_BURST",
                    "evidence_signal_name": "REVIEW_BURST_SIGNAL",
                    "signal_value": str(r.get("temporal_burst_cluster_id", "")),
                    "signal_severity": "LOW",
                    "detection_method": "TEMPORAL_WINDOW_GROUPING",
                    "confidence": 0.90,
                    "modality_available": True,
                    "provenance": "REVIEW_NLP_FEATURE_EXTRACTION",
                    "timestamp": now_ts,
                })

        # 2. Image Evidence Records
        logger.info(f"Processing {len(self.image_features_df)} image features for atomic evidence...")
        for _, img in self.image_features_df.iterrows():
            iid = str(img["image_id"])
            pid = str(img["canonical_product_id"])
            lid = str(img.get("listing_id", ""))

            # Corrupt image evidence
            if img.get("is_corrupt", False):
                records.append({
                    "evidence_id": f"ev_img_corr_{iid}",
                    "entity_id": iid,
                    "canonical_product_id": pid,
                    "listing_id": lid,
                    "evidence_modality": "IMAGE_CV",
                    "evidence_type": "IMAGE_CORRUPT",
                    "evidence_signal_name": "IMAGE_CORRUPT_SIGNAL",
                    "signal_value": "CORRUPT_OR_UNREADABLE",
                    "signal_severity": "HIGH",
                    "detection_method": "PIL_IMAGE_VERIFY",
                    "confidence": 1.0,
                    "modality_available": True,
                    "provenance": "IMAGE_CV_INTELLIGENCE",
                    "timestamp": now_ts,
                })

            # Cross-product image reuse
            if img.get("is_cross_product_image_reuse", False):
                records.append({
                    "evidence_id": f"ev_img_reuse_{iid}",
                    "entity_id": iid,
                    "canonical_product_id": pid,
                    "listing_id": lid,
                    "evidence_modality": "IMAGE_CV",
                    "evidence_type": "CROSS_PRODUCT_IMAGE_REUSE",
                    "evidence_signal_name": "CROSS_PRODUCT_IMAGE_REUSE_SIGNAL",
                    "signal_value": str(img.get("visual_cluster_id", "")),
                    "signal_severity": "MEDIUM",
                    "detection_method": "RESNET18_CENTERED_COSINE_SIMILARITY",
                    "confidence": 0.92,
                    "modality_available": True,
                    "provenance": "IMAGE_CV_INTELLIGENCE",
                    "timestamp": now_ts,
                })

        # 3. Pricing Evidence Records
        logger.info(f"Processing {len(self.pricing_features_df)} pricing features for atomic evidence...")
        for _, p in self.pricing_features_df.iterrows():
            pid = str(p["canonical_product_id"])
            is_outlier = p.get("is_price_outlier", False)
            robust_z = p.get("robust_z_score", 0.0)

            if is_outlier:
                records.append({
                    "evidence_id": f"ev_price_out_{pid}",
                    "entity_id": pid,
                    "canonical_product_id": pid,
                    "listing_id": None,
                    "evidence_modality": "PRICING",
                    "evidence_type": "PRICE_OUTLIER",
                    "evidence_signal_name": "PRICE_ANOMALY_SIGNAL",
                    "signal_value": str(round(robust_z, 2)) if pd.notna(robust_z) else "OUTLIER",
                    "signal_severity": "MEDIUM",
                    "detection_method": "ROBUST_Z_SCORE_CORRIDOR",
                    "confidence": 0.88,
                    "modality_available": True,
                    "provenance": "PRICING_INTELLIGENCE_CORRIDOR",
                    "timestamp": now_ts,
                })

        # 4. OCR Modality Blocker Records (Audit representation)
        records.append({
            "evidence_id": "ev_ocr_status_offline_blocker",
            "entity_id": "SYSTEM_OCR_MODALITY",
            "canonical_product_id": "ALL_PRODUCTS",
            "listing_id": None,
            "evidence_modality": "OCR",
            "evidence_type": "OCR_STATUS",
            "evidence_signal_name": "OCR_DEPENDENCY_BLOCKED",
            "signal_value": "BLOCKED_OFFLINE_DEPENDENCY_ABSENT",
            "signal_severity": "INFO",
            "detection_method": "ENVIRONMENT_INSPECTION",
            "confidence": 1.0,
            "modality_available": False,
            "provenance": "OCR_ENGINE_AUDIT",
            "timestamp": now_ts,
        })

        evidence_df = pd.DataFrame(records)
        logger.info(f"Synthesized {len(evidence_df)} atomic multimodal evidence records.")
        return evidence_df

    def build_product_multimodal_summary(self) -> pd.DataFrame:
        """
        Builds explainable product-level aggregation with explicit missing modality handling.
        """
        logger.info("Computing product-level multimodal summary...")
        prods = self.products_df.copy()

        # Precompute per-product review metrics
        rev_grouped = self.review_features_df.groupby("canonical_product_id")
        rev_counts = rev_grouped.size().to_dict()
        rev_sentiment_means = rev_grouped["sentiment_score"].mean().to_dict()
        rev_discordant_counts = rev_grouped["is_rating_discordant"].sum().to_dict()
        rev_duplicate_counts = rev_grouped["is_exact_duplicate"].sum().to_dict()
        rev_burst_counts = rev_grouped["is_temporal_burst"].sum().to_dict()

        # Precompute per-product image metrics
        img_grouped = self.image_features_df.groupby("canonical_product_id")
        img_counts = img_grouped.size().to_dict()
        img_corrupt_counts = img_grouped["is_corrupt"].sum().to_dict()
        img_reuse_counts = img_grouped["is_cross_product_image_reuse"].sum().to_dict()
        img_exact_dup_counts = img_grouped["is_exact_file_duplicate"].sum().to_dict()

        # Precompute pricing metrics
        pricing_map = self.pricing_features_df.set_index("canonical_product_id").to_dict(orient="index")

        summary_records: List[Dict[str, Any]] = []

        for idx, row in prods.iterrows():
            pid = str(row["canonical_product_id"])
            mkt = str(row.get("marketplace", ""))
            brand = str(row.get("brand", ""))
            cat = str(row.get("category", ""))

            r_count = rev_counts.get(pid, 0)
            i_count = img_counts.get(pid, 0)

            p_info = pricing_map.get(pid, {})
            p_obs_count = p_info.get("observation_count", 1)
            is_price_outlier = bool(p_info.get("is_price_outlier", False))

            # Missing Modality Status
            modality_status = MissingModalityHandler.audit_modality_availability(
                pid, r_count, i_count, p_obs_count, has_ocr=False
            )

            # Review signals (only evaluated if modality is AVAILABLE)
            if modality_status["review_modality_status"] == "AVAILABLE":
                mean_sent = round(float(rev_sentiment_means.get(pid, 0.0)), 3)
                disc_count = int(rev_discordant_counts.get(pid, 0))
                dup_count = int(rev_duplicate_counts.get(pid, 0))
                burst_count = int(rev_burst_counts.get(pid, 0))

                has_rev_risk = (dup_count >= 3) or (burst_count >= 5) or (disc_count >= 2)
                rev_risk_signal = "ELEVATED_REVIEW_ANOMALY" if has_rev_risk else "NORMAL_REVIEW_ACTIVITY"
            else:
                mean_sent = None
                disc_count = 0
                dup_count = 0
                burst_count = 0
                has_rev_risk = False
                rev_risk_signal = "NOT_EVALUATED_MODALITY_UNAVAILABLE"

            # Image signals (only evaluated if modality is AVAILABLE)
            if modality_status["image_modality_status"] == "AVAILABLE":
                corrupt_count = int(img_corrupt_counts.get(pid, 0))
                reuse_count = int(img_reuse_counts.get(pid, 0))
                exact_dup_count = int(img_exact_dup_counts.get(pid, 0))

                has_img_risk = (corrupt_count > 0) or (reuse_count > 0)
                img_risk_signal = "CROSS_PRODUCT_IMAGE_REUSE" if reuse_count > 0 else (
                    "IMAGE_CORRUPT" if corrupt_count > 0 else "NORMAL_HERO_IMAGE"
                )
            else:
                corrupt_count = 0
                reuse_count = 0
                exact_dup_count = 0
                has_img_risk = False
                img_risk_signal = "NOT_EVALUATED_MODALITY_UNAVAILABLE"

            # Pricing signals
            if modality_status["price_modality_status"] == "AVAILABLE":
                has_price_risk = is_price_outlier
                price_risk_signal = "PRICE_CORRIDOR_ANOMALY" if is_price_outlier else "WITHIN_EXPECTED_CORRIDOR"
            else:
                has_price_risk = False
                price_risk_signal = "NOT_EVALUATED_MODALITY_UNAVAILABLE"

            # Composite Explainable Risk Tier
            # Strictly marked as heuristic rule-based classification, avoiding fake probabilities!
            available_modalities = sum([
                modality_status["review_modality_status"] == "AVAILABLE",
                modality_status["image_modality_status"] == "AVAILABLE",
                modality_status["price_modality_status"] == "AVAILABLE",
            ])

            active_risk_flags = sum([has_rev_risk, has_img_risk, has_price_risk])

            if available_modalities < 2:
                risk_tier = "UNASSESSED_SPARSE_DATA"
            elif active_risk_flags >= 2:
                risk_tier = "ELEVATED_MULTIMODAL_ANOMALY"
            elif active_risk_flags == 1:
                risk_tier = "MODERATE_SINGLE_MODALITY_ANOMALY"
            else:
                risk_tier = "LOW_OBSERVED_ANOMALY"

            rec = {
                "canonical_product_id": pid,
                "marketplace": mkt,
                "brand": brand,
                "category": cat,
                # Modality Availability
                "review_modality_status": modality_status["review_modality_status"],
                "image_modality_status": modality_status["image_modality_status"],
                "price_modality_status": modality_status["price_modality_status"],
                "ocr_modality_status": modality_status["ocr_modality_status"],
                "image_text_modality_status": modality_status["image_text_modality_status"],
                "available_core_modalities_count": available_modalities,
                # Review Observed Counts & Signals
                "review_count": r_count,
                "mean_sentiment_score": mean_sent,
                "discordant_review_count": disc_count,
                "duplicate_review_count": dup_count,
                "temporal_burst_review_count": burst_count,
                "review_risk_signal": rev_risk_signal,
                # Image Observed Counts & Signals
                "usable_image_count": i_count,
                "corrupt_image_count": corrupt_count,
                "cross_product_reuse_image_count": reuse_count,
                "exact_duplicate_image_count": exact_dup_count,
                "image_risk_signal": img_risk_signal,
                # Pricing Signals
                "price_observation_count": p_obs_count,
                "is_price_outlier": is_price_outlier,
                "price_risk_signal": price_risk_signal,
                # Explainable Assessment
                "active_risk_flag_count": active_risk_flags,
                "provisional_risk_tier": risk_tier,
                "assessment_framework": "EXPLAINABLE_MULTIMODAL_EVIDENCE_V1_5",
            }
            summary_records.append(rec)

        summary_df = pd.DataFrame(summary_records)
        logger.info(f"Computed product multimodal summary for {len(summary_df)} products.")
        return summary_df
