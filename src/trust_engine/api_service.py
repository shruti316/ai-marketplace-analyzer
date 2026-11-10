"""
API-Ready Trust Intelligence Engine Service
Milestone 6: Final Multimodal Trust Intelligence Engine
AI-Powered Indian Marketplace Trust Intelligence Platform

Exposes a clean, modular API surface suitable for backend REST endpoints,
command-line scripts, or SDK consumption.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from src.trust_engine.comparison_engine import ProductComparisonEngine
from src.trust_engine.contracts import (
    ListingTrustAssessment,
    ProductComparisonResult,
    ProductTrustAssessment,
    SellerTrustAssessment,
    UnifiedEvidenceItem,
)
from src.trust_engine.evidence_engine import UnifiedEvidenceEngine
from src.trust_engine.graph_intelligence import GraphIntelligenceService
from src.trust_engine.report_generator import ExplainableReportGenerator
from src.trust_engine.trust_assessment import TrustAssessmentEngine

logger = logging.getLogger("TrustIntelligenceAPI")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class TrustIntelligenceEngine:
    """
    Master unified entry-point for the AI-Powered Marketplace Trust Intelligence Platform.
    Provides backend-ready service methods with strict separation of retrieval,
    assessment, comparison, and reporting.
    """

    def __init__(self, dataset_dir: Optional[Path] = None):
        self.evidence_engine = UnifiedEvidenceEngine(dataset_dir)
        self.assessment_engine = TrustAssessmentEngine(self.evidence_engine)
        self.graph_service = GraphIntelligenceService(
            self.evidence_engine.relationships_df,
            self.evidence_engine.products_df
        )
        self.comparison_engine = ProductComparisonEngine(self.assessment_engine)
        self.report_generator = ExplainableReportGenerator(
            self.assessment_engine,
            self.graph_service
        )

    def get_product_evidence(self, canonical_product_id: str) -> List[Dict[str, Any]]:
        """Retrieves all atomic evidence items for a canonical product."""
        items = self.evidence_engine.get_product_evidence(canonical_product_id)
        return [it.to_dict() for it in items]

    def get_listing_evidence(self, listing_id: str) -> List[Dict[str, Any]]:
        """Retrieves all atomic evidence items for a marketplace listing offer."""
        items = self.evidence_engine.get_listing_evidence(listing_id)
        return [it.to_dict() for it in items]

    def assess_product(self, canonical_product_id: str) -> Dict[str, Any]:
        """Performs multimodal trust assessment for a canonical product."""
        asmt = self.assessment_engine.assess_product(canonical_product_id)
        return asmt.to_dict()

    def assess_listing(self, listing_id: str) -> Dict[str, Any]:
        """Performs trust assessment for an individual marketplace listing offer."""
        asmt = self.assessment_engine.assess_listing(listing_id)
        return asmt.to_dict()

    def assess_seller(self, seller_id: str) -> Dict[str, Any]:
        """Performs governance assessment for a platform seller entity."""
        asmt = self.assessment_engine.assess_seller(seller_id)
        return asmt.to_dict()

    def compare_products(self, canonical_product_ids: List[str]) -> Dict[str, Any]:
        """Compares multiple products across price, sentiment, images, and data density."""
        res = self.comparison_engine.compare_products(canonical_product_ids)
        return res.to_dict()

    def generate_report(self, canonical_product_id: str, format_type: str = "markdown") -> Union[str, Dict[str, Any]]:
        """Generates comprehensive explainable trust report in Markdown or JSON format."""
        if format_type.lower() == "markdown":
            return self.report_generator.generate_product_report_markdown(canonical_product_id)
        elif format_type.lower() == "json":
            return self.report_generator.generate_product_report_dict(canonical_product_id)
        else:
            raise ValueError(f"Unsupported format '{format_type}'. Choose 'markdown' or 'json'.")

    def get_entity_subgraph(self, entity_id: str, depth: int = 1) -> Dict[str, Any]:
        """Extracts local egocentric graph around entity_id."""
        return self.graph_service.get_entity_subgraph(entity_id, depth=depth)
