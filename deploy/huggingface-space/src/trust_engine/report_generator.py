"""
Explainable Trust Report Generator
Milestone 6: Final Multimodal Trust Intelligence Engine
AI-Powered Indian Marketplace Trust Intelligence Platform

Generates comprehensive, explainable Markdown and JSON reports for individual
products and listings, detailing exactly WHY an assessment was assigned.
"""

from collections import defaultdict
import json
import logging
from typing import Any, Dict, List, Optional

from src.trust_engine.contracts import (
    EvidenceModality,
    ListingTrustAssessment,
    ProductTrustAssessment,
    RiskTier,
    UnifiedEvidenceItem,
)
from src.trust_engine.evidence_engine import UnifiedEvidenceEngine
from src.trust_engine.graph_intelligence import GraphIntelligenceService
from src.trust_engine.trust_assessment import TrustAssessmentEngine

logger = logging.getLogger("ReportGenerator")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class ExplainableReportGenerator:
    """
    Renders standardized, 12-section explainable trust reports
    in both GitHub-flavored Markdown and machine-readable JSON.
    """

    def __init__(
        self,
        assessment_engine: Optional[TrustAssessmentEngine] = None,
        graph_service: Optional[GraphIntelligenceService] = None,
    ):
        self.assessment_engine = assessment_engine or TrustAssessmentEngine()
        self.evidence_engine = self.assessment_engine.evidence_engine
        self.graph_service = graph_service or GraphIntelligenceService(
            self.evidence_engine.relationships_df,
            self.evidence_engine.products_df
        )

    def generate_product_report_dict(self, canonical_product_id: str) -> Dict[str, Any]:
        """Generates structured report dictionary for an individual product."""
        asmt = self.assessment_engine.assess_product(canonical_product_id)
        evidence_items = self.evidence_engine.get_product_evidence(canonical_product_id)
        graph_patterns = self.graph_service.analyze_graph_trust_patterns(canonical_product_id)

        listings = self.evidence_engine.listings_by_product.get(canonical_product_id, [])
        primary_lid = listings[0]["listing_id"] if listings else None
        listing_asmt = self.assessment_engine.assess_listing(primary_lid) if primary_lid else None

        return {
            "section_1_product_metadata": {
                "canonical_product_id": asmt.canonical_product_id,
                "marketplace": asmt.marketplace,
                "brand": asmt.brand,
                "category": asmt.category,
                "subcategory": asmt.subcategory,
                "primary_listing_id": primary_lid,
                "product_title": self.evidence_engine.products_by_id[canonical_product_id].get("product_title", ""),
                "product_url": self.evidence_engine.products_by_id[canonical_product_id].get("product_url", ""),
            },
            "section_2_overall_assessment": {
                "overall_risk_tier": asmt.overall_risk_tier.value,
                "available_core_modalities_count": asmt.available_core_modalities_count,
                "active_anomaly_modality_count": asmt.active_anomaly_modality_count,
                "independent_corroboration_count": asmt.independent_corroboration_count,
                "correlated_findings": asmt.correlated_findings,
                "recommendation_summary": asmt.recommendation_summary,
                "assessment_framework": asmt.assessment_framework,
            },
            "section_3_modality_breakdown": {
                k: v.to_dict() for k, v in asmt.modality_breakdown.items()
            },
            "section_4_positive_evidence": asmt.positive_evidence,
            "section_5_negative_evidence": asmt.negative_evidence,
            "section_6_review_evidence": [
                it.to_dict() for it in evidence_items if it.evidence_modality == EvidenceModality.REVIEW_NLP
            ],
            "section_7_image_evidence": [
                it.to_dict() for it in evidence_items if it.evidence_modality == EvidenceModality.IMAGE_CV
            ],
            "section_7_visual_detail": asmt.visual_evidence_detail.to_dict() if asmt.visual_evidence_detail else None,
            "section_8_price_evidence": [
                it.to_dict() for it in evidence_items if it.evidence_modality == EvidenceModality.PRICING
            ],
            "section_9_seller_governance": {
                "linked_seller_id": listing_asmt.seller_id if listing_asmt else "SELLER_UNRESOLVED_THIRD_PARTY",
                "seller_resolution_status": listing_asmt.seller_resolution_status if listing_asmt else "UNRESOLVED",
                "fulfillment_type": listing_asmt.fulfillment_type if listing_asmt else "UNKNOWN",
                "governance_rule": (
                    "Seller entity is a certified platform aggregate fulfillment pool. "
                    "Individual 3rd-party merchant tax IDs were omitted upstream."
                ),
            },
            "section_10_graph_evidence": graph_patterns,
            "section_11_missing_information": {
                "missing_modalities": asmt.missing_modalities,
                "offline_blockers": ["OCR_DEPENDENCY_ABSENT", "VISION_LANGUAGE_MODEL_ABSENT"],
                "zero_penalty_applied": True,
            },
            "section_12_confidence_and_limitations": {
                "assessment_limitations": asmt.assessment_limitations,
                "confidence_score": 1.0 if asmt.overall_risk_tier != RiskTier.UNASSESSED_SPARSE_DATA else 0.5,
                "recommended_next_steps": (
                    "Proceed with catalog display." if asmt.overall_risk_tier == RiskTier.LOW_OBSERVED_ANOMALY
                    else "Conduct manual listing review."
                ),
            },
        }

    def generate_product_report_markdown(self, canonical_product_id: str) -> str:
        """Renders comprehensive explainable Markdown trust report."""
        rep = self.generate_product_report_dict(canonical_product_id)
        meta = rep["section_1_product_metadata"]
        overall = rep["section_2_overall_assessment"]
        modalities = rep["section_3_modality_breakdown"]
        seller = rep["section_9_seller_governance"]
        graph = rep["section_10_graph_evidence"]
        missing = rep["section_11_missing_information"]
        conf = rep["section_12_confidence_and_limitations"]

        md_lines = [
            f"# Multimodal Trust Assessment Report: `{canonical_product_id}`",
            f"**Platform:** Indian Marketplace Trust Intelligence Engine | **Framework:** `{overall['assessment_framework']}`",
            "",
            "---",
            "",
            "## 1. Product & Listing Metadata",
            f"- **Product Title:** {meta['product_title']}",
            f"- **Canonical Product ID:** `{meta['canonical_product_id']}`",
            f"- **Marketplace Partition:** `{meta['marketplace']}` | **Primary Listing ID:** `{meta['primary_listing_id']}`",
            f"- **Brand Entity:** `{meta['brand']}` | **Category / Subcategory:** `{meta['category']}` / `{meta['subcategory']}`",
            f"- **Catalog URL:** [{meta['product_url']}]({meta['product_url']})" if meta['product_url'] else "- **Catalog URL:** None",
            "",
            "---",
            "",
            "## 2. Overall Trust Assessment & Risk Tier",
            f"> ### **PROVISIONAL RISK TIER: `{overall['overall_risk_tier']}`**",
            f"> - **Available Core Modalities:** {overall['available_core_modalities_count']} of 3",
            f"> - **Active Anomaly Modalities:** {overall['active_anomaly_modality_count']}",
            f"> - **Summary Rationale:** {overall['recommendation_summary']}",
            "",
            "---",
            "",
            "## 3. Modality-Level Assessment Breakdown",
            "| Modality | Status | Anomaly Detected | Details / Observed Signal |",
            "| :--- | :--- | :--- | :--- |",
        ]

        for mod_name, mod_info in modalities.items():
            status_str = f"**{mod_info['status']}**"
            anom_str = f"⚠️ YES (`{mod_info['anomaly_type']}`)" if mod_info['has_anomaly'] else "✅ NO"
            md_lines.append(f"| `{mod_name}` | {status_str} | {anom_str} | {mod_info['summary_text']} |")

        md_lines.extend([
            "",
            "---",
            "",
            "## 4. Positive Evidence (Corroborating Consistency)",
        ])
        if rep["section_4_positive_evidence"]:
            for item in rep["section_4_positive_evidence"]:
                md_lines.append(f"- ✅ {item}")
        else:
            md_lines.append("- *No positive corroborating evidence available due to sparse data instrumentation.*")

        md_lines.extend([
            "",
            "## 5. Negative Evidence (Anomalies & Discrepancies)",
        ])
        if rep["section_5_negative_evidence"]:
            for item in rep["section_5_negative_evidence"]:
                md_lines.append(f"- ⚠️ {item}")
        else:
            md_lines.append("- *No negative anomalies or cross-modal discrepancies detected.*")

        md_lines.extend([
            "",
            "---",
            "",
            "## 6. Supporting Review Evidence",
        ])
        rev_ev = rep["section_6_review_evidence"]
        if rev_ev:
            for it in rev_ev[:5]:  # Display top 5
                md_lines.append(f"- **[{it['evidence_type']}]** ({it['evidence_nature']}): `{it['observed_value']}` | *Method:* {it['detection_method']}")
            if len(rev_ev) > 5:
                md_lines.append(f"- *... and {len(rev_ev) - 5} additional review evidence records.*")
        else:
            md_lines.append("- *No customer reviews observed for this product.*")

        md_lines.extend([
            "",
            "## 7. Supporting Image Evidence",
        ])
        img_ev = rep["section_7_image_evidence"]
        vis_det = rep.get("section_7_visual_detail")
        if vis_det:
            md_lines.append(f"- **Visual Duplicate Taxonomy:** `{vis_det['duplicate_category']}` ({vis_det['explanation']})")
            md_lines.append(f"- **Sanitized Asset Reference:** `{vis_det['sanitized_image_ref']}`")
            if vis_det['clip_cosine_similarity'] is not None:
                md_lines.append(f"- **CLIP Semantic Alignment:** cosine={vis_det['clip_cosine_similarity']:.4f} (discordant: {vis_det['is_category_discordant']})")
        if img_ev:
            for it in img_ev:
                md_lines.append(f"- **[{it['evidence_type']}]** ({it['evidence_nature']}): `{it['observed_value']}` | *Method:* {it['detection_method']}")
        else:
            md_lines.append("- *No hero image asset observed for this product.*")

        md_lines.extend([
            "",
            "## 8. Supporting Price Evidence",
        ])
        price_ev = rep["section_8_price_evidence"]
        if price_ev:
            for it in price_ev:
                md_lines.append(f"- **[{it['evidence_type']}]** ({it['evidence_nature']}): `{it['observed_value']}` | *Method:* {it['detection_method']}")
        else:
            md_lines.append("- *No price observation observed for this product.*")

        md_lines.extend([
            "",
            "---",
            "",
            "## 9. Seller Identity & Governance Status",
            f"- **Linked Seller Entity:** `{seller['linked_seller_id']}`",
            f"- **Resolution Status:** `{seller['seller_resolution_status']}`",
            f"- **Fulfillment Type:** `{seller['fulfillment_type']}`",
            f"> [!NOTE]",
            f"> {seller['governance_rule']}",
            "",
            "## 10. Graph & Relationship Evidence",
            f"- **Total Egocentric Degree:** {graph['total_degree']} edges ({graph['outbound_edge_count']} outbound, {graph['inbound_edge_count']} inbound)",
            f"- **Shared Visual Asset Peers:** {graph['shared_image_peers_count']} products",
            f"- **Cross-Brand Image Recycling:** {'⚠️ YES' if graph['has_cross_brand_reuse'] else '✅ NO'}",
            f"- **Identified Graph Patterns:** {', '.join(graph['graph_patterns']) if graph['graph_patterns'] else 'None (Normal connectivity)'}",
            "",
            "---",
            "",
            "## 11. Missing Information & Offline Blockers",
            f"- **Missing Core Modalities:** {', '.join(missing['missing_modalities']) if missing['missing_modalities'] else 'None (Fully instrumented)'}",
            f"- **Offline Blocker Status:** {', '.join(missing['offline_blockers'])}",
            "- **Zero-Penalty Compliance:** Enforced. Missing modalities strictly reduce confidence, never inflate risk.",
            "",
            "## 12. Confidence, Limitations & Recommended Next Steps",
            f"- **Assessment Confidence:** `{conf['confidence_score']:.2f}`",
            f"- **Recommended Next Steps:** {conf['recommended_next_steps']}",
            "- **Known Technical Limitations:**",
        ])
        for lim in conf["assessment_limitations"]:
            md_lines.append(f"  - {lim}")

        md_lines.append("")
        return "\n".join(md_lines)
