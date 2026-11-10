"""
Trust Assessment Engine
Milestone 6: Final Multimodal Trust Intelligence Engine
AI-Powered Indian Marketplace Trust Intelligence Platform

Coordinates atomic evidence retrieval and multimodal fusion to produce
distinct, explainable assessments for Products, Listings, and Sellers.
"""

from collections import defaultdict
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

from src.trust_engine.contracts import (
    ListingTrustAssessment,
    ModalityAssessment,
    ProductTrustAssessment,
    RiskTier,
    SellerTrustAssessment,
    UnifiedEvidenceItem,
)
from src.trust_engine.evidence_engine import UnifiedEvidenceEngine
from src.trust_engine.multimodal_fusion import MultimodalFusionEngine

logger = logging.getLogger("TrustAssessment")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class TrustAssessmentEngine:
    """
    Main trust evaluation orchestrator.
    Produces separate, modular assessments for Products, Listings, and Sellers.
    """

    def __init__(self, evidence_engine: Optional[UnifiedEvidenceEngine] = None):
        self.evidence_engine = evidence_engine or UnifiedEvidenceEngine()

    def assess_product(self, canonical_product_id: str) -> ProductTrustAssessment:
        """
        Generates comprehensive explainable trust assessment for a canonical product.
        """
        p_meta = self.evidence_engine.products_by_id.get(canonical_product_id)
        if not p_meta:
            raise ValueError(f"Product ID '{canonical_product_id}' not found in dataset.")

        # 1. Retrieve all atomic evidence items
        evidence_items = self.evidence_engine.get_product_evidence(canonical_product_id)

        # 2. Fuse evidence across modalities
        overall_tier, modality_breakdown, pos_ev, neg_ev, missing_mods = MultimodalFusionEngine.fuse_assessments(evidence_items)

        # 3. Formulate explainable recommendation summary
        avail_core_count = sum(1 for mod in MultimodalFusionEngine.CORE_MODALITIES if modality_breakdown[mod.value].status == "AVAILABLE")
        active_anomalies = sum(1 for m in modality_breakdown.values() if m.has_anomaly)

        if overall_tier == RiskTier.UNASSESSED_SPARSE_DATA:
            rec_summary = (
                "Sparse catalog instrumentation (< 2 core modalities). Zero penalty applied under "
                "Zero-Penalty Invariant. Recommended next step: Acquire customer reviews or hero image assets."
            )
        elif overall_tier == RiskTier.ELEVATED_MULTIMODAL_ANOMALY:
            rec_summary = (
                f"Elevated multimodal risk detected across {active_anomalies} independent modalities. "
                "Corroborating anomalies indicate catalog misrepresentation or cross-product visual reuse. Manual audit recommended."
            )
        elif overall_tier == RiskTier.MODERATE_SINGLE_MODALITY_ANOMALY:
            rec_summary = (
                "Moderate single-modality anomaly observed. Does not constitute fraud; "
                "suggests statistical price dispersion or stock photo reuse. Standard monitoring recommended."
            )
        else:
            rec_summary = (
                "High consistency observed across all available modalities with zero detected anomalies. "
                "Verified catalog alignment."
            )

        limitations = [
            "Point-in-time cross-sectional price observation; lacks longitudinal price velocity.",
            "Individual 3rd-party retail merchant identities omitted in upstream crawl (honest null modeling).",
            "Physical OCR execution blocked due to offline sandbox environment (safely avoiding synthetic fabrication).",
        ]

        return ProductTrustAssessment(
            canonical_product_id=canonical_product_id,
            marketplace=str(p_meta.get("marketplace", "")),
            brand=str(p_meta.get("brand", "")),
            category=str(p_meta.get("category", "")),
            subcategory=str(p_meta.get("subcategory", "")),
            overall_risk_tier=overall_tier,
            available_core_modalities_count=avail_core_count,
            active_anomaly_modality_count=active_anomalies,
            modality_breakdown=modality_breakdown,
            positive_evidence=pos_ev,
            negative_evidence=neg_ev,
            missing_modalities=missing_mods,
            assessment_limitations=limitations,
            recommendation_summary=rec_summary,
        )

    def assess_listing(self, listing_id: str) -> ListingTrustAssessment:
        """
        Generates trust assessment for an individual marketplace listing offer.
        """
        l_meta = self.evidence_engine.listings_by_id.get(listing_id)
        if not l_meta:
            raise ValueError(f"Listing ID '{listing_id}' not found in dataset.")

        pid = l_meta["canonical_product_id"]
        prod_assessment = self.assess_product(pid)

        p_info = self.evidence_engine.pricing_by_product.get(pid, {})
        sp = float(p_info.get("observed_price_inr", 0.0)) if pd.notna(p_info.get("observed_price_inr")) else None
        mrp = float(p_info.get("mrp_inr", 0.0)) if pd.notna(p_info.get("mrp_inr")) else None
        disc = float(p_info.get("discount_percentage", 0.0))

        listing_flags: List[str] = []
        if l_meta.get("seller_resolution_status") == "UNRESOLVED_PLATFORM_AGGREGATE":
            listing_flags.append("PLATFORM_AGGREGATE_FULFILLMENT_POOL")
        if p_info.get("is_discount_anomaly", False):
            listing_flags.append("EXTREME_DISCOUNT_BADGE_DETECTED")
        if p_info.get("is_price_outlier", False):
            listing_flags.append("STATISTICAL_CORRIDOR_DEVIATION")

        summary = (
            f"Listing '{listing_id}' on {l_meta['marketplace']} reflects product risk tier '{prod_assessment.overall_risk_tier.value}'. "
            f"Fulfillment: {l_meta.get('fulfillment_type', 'STANDARD')}."
        )

        return ListingTrustAssessment(
            listing_id=listing_id,
            canonical_product_id=pid,
            marketplace=str(l_meta.get("marketplace", "")),
            platform_id=str(l_meta.get("platform_id", "")),
            seller_id=str(l_meta.get("seller_id", "SELLER_UNRESOLVED_THIRD_PARTY")),
            seller_resolution_status=str(l_meta.get("seller_resolution_status", "UNRESOLVED")),
            fulfillment_type=str(l_meta.get("fulfillment_type", "UNKNOWN")),
            listing_title=str(l_meta.get("listing_title", "")),
            observed_price_inr=sp,
            mrp_inr=mrp,
            discount_percentage=disc,
            product_risk_tier=prod_assessment.overall_risk_tier,
            listing_specific_flags=listing_flags,
            trust_summary=summary,
        )

    def assess_seller(self, seller_id: str) -> SellerTrustAssessment:
        """
        Generates governance and operational assessment for a seller entity.
        Strictly enforces platform aggregate restrictions and honest null standards.
        """
        s_meta = self.evidence_engine.sellers_by_id.get(seller_id)
        if not s_meta:
            raise ValueError(f"Seller ID '{seller_id}' not found in dataset.")

        s_feat = self.evidence_engine.seller_feats_by_id.get(seller_id, {})
        is_indiv = bool(s_meta.get("is_individual_merchant", False))

        if not is_indiv:
            notice = (
                f"Entity '{seller_id}' represents a certified platform aggregate merchant pool "
                f"({s_meta.get('seller_display_name', '')}). Individual 3rd-party retail merchants were omitted "
                "in upstream catalog scrapes. This assessment describes platform-level catalog fulfillment, NOT individual merchant risk."
            )
        else:
            notice = (
                "Unresolved 3rd-party retail merchant pool. Individual store IDs and GSTINs remain omitted. "
                "No merchant-specific reputation claims can be verified."
            )

        return SellerTrustAssessment(
            seller_id=seller_id,
            seller_display_name=str(s_meta.get("seller_display_name", "")),
            seller_type=str(s_meta.get("seller_type", "PLATFORM_AGGREGATE")),
            is_individual_merchant=is_indiv,
            merchant_resolution_status=str(s_meta.get("merchant_resolution_status", "UNRESOLVED")),
            governance_classification=str(s_feat.get("governance_classification", "PLATFORM_OPERATOR_PROXY")),
            total_catalog_listings=int(s_feat.get("total_catalog_listings", 0)),
            unique_brands_count=int(s_feat.get("unique_brands_count", 0)),
            pricing_anomalies_count=int(s_feat.get("pricing_anomalies_count", 0)),
            mean_review_sentiment=float(s_feat["mean_review_sentiment"]) if pd.notna(s_feat.get("mean_review_sentiment")) else None,
            governance_notice=notice,
        )
