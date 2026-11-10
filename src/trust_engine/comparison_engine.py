"""
Product Comparison and Recommendation Engine
Milestone 6: Final Multimodal Trust Intelligence Engine
AI-Powered Indian Marketplace Trust Intelligence Platform

Compares two or more products across price corridors, review sentiments,
image assets, and evidence completeness. Recommends products based on
both evidence density and verified cross-modal consistency.
"""

from collections import defaultdict
import logging
from typing import Any, Dict, List, Optional, Tuple

from src.trust_engine.contracts import (
    EvidenceModality,
    ProductComparisonResult,
    ProductTrustAssessment,
    RiskTier,
)
from src.trust_engine.trust_assessment import TrustAssessmentEngine

logger = logging.getLogger("ComparisonEngine")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class ProductComparisonEngine:
    """
    Evidence-based comparative analysis engine for multiple products.
    Enforces that products with fewer detected anomalies are NOT automatically
    preferred over products with dense, verified positive evidence.
    """

    def __init__(self, assessment_engine: Optional[TrustAssessmentEngine] = None):
        self.assessment_engine = assessment_engine or TrustAssessmentEngine()

    def compare_products(self, canonical_product_ids: List[str]) -> ProductComparisonResult:
        """
        Executes comparative trust and evidence analysis across specified products.
        """
        if len(canonical_product_ids) < 2:
            raise ValueError("Comparison requires at least two canonical product IDs.")

        assessments: Dict[str, ProductTrustAssessment] = {}
        matrix: Dict[str, Dict[str, Any]] = {}

        for pid in canonical_product_ids:
            asmt = self.assessment_engine.assess_product(pid)
            assessments[pid] = asmt

            # Extract pricing info
            p_mod = asmt.modality_breakdown.get(EvidenceModality.PRICING.value)
            rev_mod = asmt.modality_breakdown.get(EvidenceModality.REVIEW_NLP.value)
            img_mod = asmt.modality_breakdown.get(EvidenceModality.IMAGE_CV.value)

            matrix[pid] = {
                "canonical_product_id": pid,
                "marketplace": asmt.marketplace,
                "brand": asmt.brand,
                "category": asmt.category,
                "subcategory": asmt.subcategory,
                "overall_risk_tier": asmt.overall_risk_tier.value,
                "available_core_modalities_count": asmt.available_core_modalities_count,
                "active_anomaly_modality_count": asmt.active_anomaly_modality_count,
                "pricing_status": p_mod.status if p_mod else "UNAVAILABLE",
                "pricing_has_anomaly": p_mod.has_anomaly if p_mod else False,
                "pricing_summary": p_mod.summary_text if p_mod else "",
                "review_status": rev_mod.status if rev_mod else "UNAVAILABLE",
                "review_has_anomaly": rev_mod.has_anomaly if rev_mod else False,
                "review_summary": rev_mod.summary_text if rev_mod else "",
                "image_status": img_mod.status if img_mod else "UNAVAILABLE",
                "image_has_anomaly": img_mod.has_anomaly if img_mod else False,
                "image_summary": img_mod.summary_text if img_mod else "",
                "positive_evidence_count": len(asmt.positive_evidence),
                "negative_evidence_count": len(asmt.negative_evidence),
                "missing_modalities": asmt.missing_modalities,
            }

        # Sort products by evidence density (higher available modalities first)
        evidence_density_ranking = sorted(
            canonical_product_ids,
            key=lambda x: (
                assessments[x].available_core_modalities_count,
                len(assessments[x].positive_evidence)
            ),
            reverse=True,
        )

        # Sort products by risk (LOW_OBSERVED_ANOMALY first, then MODERATE, then UNASSESSED, then ELEVATED)
        risk_tier_order = {
            RiskTier.LOW_OBSERVED_ANOMALY: 0,
            RiskTier.MODERATE_SINGLE_MODALITY_ANOMALY: 1,
            RiskTier.UNASSESSED_SPARSE_DATA: 2,
            RiskTier.ELEVATED_MULTIMODAL_ANOMALY: 3,
        }
        risk_ranking = sorted(
            canonical_product_ids,
            key=lambda x: (
                risk_tier_order.get(assessments[x].overall_risk_tier, 99),
                assessments[x].active_anomaly_modality_count,
            )
        )

        # Recommendation Logic:
        # Prioritize products that have >= 2 modalities AND low observed anomaly.
        # NEVER recommend an unassessed sparse product over a fully-verified consistent product!
        candidate_ids = [
            pid for pid in canonical_product_ids
            if assessments[pid].available_core_modalities_count >= 2
            and assessments[pid].overall_risk_tier == RiskTier.LOW_OBSERVED_ANOMALY
        ]

        tradeoffs: List[str] = []
        if candidate_ids:
            # Pick candidate with highest evidence density
            recommended_id = sorted(candidate_ids, key=lambda x: len(assessments[x].positive_evidence), reverse=True)[0]
            rationale = (
                f"Product '{recommended_id}' is recommended because it possesses dense, multi-modal evidence "
                f"({assessments[recommended_id].available_core_modalities_count} core modalities) with zero detected anomalies. "
                "Verified cross-modal consistency confirms high catalog integrity."
            )
        else:
            # If no product has LOW_OBSERVED_ANOMALY with >= 2 modalities, look for moderate or explain sparse
            non_elevated = [
                pid for pid in canonical_product_ids
                if assessments[pid].overall_risk_tier != RiskTier.ELEVATED_MULTIMODAL_ANOMALY
            ]
            if non_elevated:
                recommended_id = non_elevated[0]
                rationale = (
                    f"Product '{recommended_id}' has the lowest relative risk among compared options, but caution is advised. "
                    f"Tier: '{assessments[recommended_id].overall_risk_tier.value}'."
                )
            else:
                recommended_id = None
                rationale = "No product can be recommended with high confidence. All options exhibit elevated anomalies."

        # Generate comparative tradeoffs
        for pid in canonical_product_ids:
            asmt = assessments[pid]
            tier_str = asmt.overall_risk_tier.value
            mods_count = asmt.available_core_modalities_count
            if asmt.overall_risk_tier == RiskTier.UNASSESSED_SPARSE_DATA:
                tradeoffs.append(
                    f"Product '{pid}': Classified as SPARSE DATA ({mods_count} modality). "
                    "Has 0 anomalies flagged solely due to missing review/image evidence, NOT proven consistency."
                )
            elif asmt.overall_risk_tier == RiskTier.ELEVATED_MULTIMODAL_ANOMALY:
                tradeoffs.append(
                    f"Product '{pid}': Compounding risk detected across multiple modalities ({asmt.active_anomaly_modality_count} flags). "
                    "Not recommended."
                )
            elif asmt.overall_risk_tier == RiskTier.MODERATE_SINGLE_MODALITY_ANOMALY:
                tradeoffs.append(
                    f"Product '{pid}': Single modality anomaly detected. Evaluated on {mods_count} modalities."
                )
            else:
                tradeoffs.append(
                    f"Product '{pid}': Strongest profile with {mods_count} verified modalities and zero anomalies."
                )

        return ProductComparisonResult(
            compared_product_ids=canonical_product_ids,
            comparison_matrix=matrix,
            evidence_density_ranking=evidence_density_ranking,
            risk_ranking=risk_ranking,
            recommended_product_id=recommended_id,
            recommendation_rationale=rationale,
            tradeoffs=tradeoffs,
        )
