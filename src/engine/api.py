"""
Marketplace Trust Intelligence API & Inference Service — v1.7
AI-Powered Marketplace Trust Intelligence Platform

The public programmatic interface and API-ready inference layer:
1. Product trust report retrieval & ad-hoc listing analysis.
2. Evidence-grounded product comparisons.
3. Category-aware, trust-ranked product recommendations.
4. Cross-marketplace candidate match retrieval.
5. On-the-fly modality ablation evaluation.
6. System feature & embedding drift monitoring.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

from src.engine.contracts import (
    CrossMarketplaceMatch,
    DriftReport,
    MultimodalTrustReport,
    ProductComparisonReport,
    RecommendationItem,
)
from src.engine.drift_service import MarketplaceDriftMonitoringService
from src.engine.matching_service import CrossMarketplaceMatchingService
from src.engine.recommendation_service import RecommendationComparisonService
from src.engine.trust_engine import MarketplaceTrustEngine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("marketplace_api")


class MarketplaceTrustAPI:
    """
    Main entrypoint and programmatic facade for the Marketplace Trust Intelligence Engine.
    Provides clean, production-ready interfaces for application integration.
    """

    def __init__(self, v17_dir: Optional[Path] = None) -> None:
        self.project_root = Path(__file__).resolve().parents[2]
        self.v17_dir = v17_dir or (self.project_root / "data" / "marketplace_trust_dataset_v1.7")

        logger.info(f"Initializing MarketplaceTrustAPI with dataset at: {self.v17_dir}")
        self.trust_engine = MarketplaceTrustEngine(self.v17_dir)
        self.matching_service = CrossMarketplaceMatchingService(self.v17_dir)
        self.recommendation_service = RecommendationComparisonService(self.trust_engine, self.v17_dir)
        self.drift_service = MarketplaceDriftMonitoringService(self.v17_dir)
        logger.info("MarketplaceTrustAPI initialized successfully.")

    def get_product_trust_report(self, canonical_product_id: str) -> MultimodalTrustReport:
        """
        Retrieves a complete multimodal trust intelligence report for an indexed product.
        """
        logger.info(f"Generating trust report for product: {canonical_product_id}")
        return self.trust_engine.analyze_product(canonical_product_id)

    def analyze_custom_listing(self, listing_data: Dict[str, Any]) -> MultimodalTrustReport:
        """
        Evaluates a new or unindexed product listing provided as a dictionary.
        Expected keys: canonical_product_id, product_title, category, price, currency, reviews, retail_mrp.
        """
        pid = listing_data.get("canonical_product_id", "CUSTOM_ADHOC_PRODUCT")
        logger.info(f"Evaluating custom product listing: {pid}")
        return self.trust_engine.analyze_product(pid, custom_listing=listing_data)

    def compare_products(self, product_id_1: str, product_id_2: str) -> ProductComparisonReport:
        """
        Performs an evidence-grounded side-by-side comparison between two products.
        """
        logger.info(f"Comparing products: {product_id_1} vs {product_id_2}")
        return self.recommendation_service.compare_products(product_id_1, product_id_2)

    def recommend_alternatives(
        self,
        canonical_product_id: str,
        top_k: int = 5,
        min_trust_score: float = 0.70,
    ) -> List[RecommendationItem]:
        """
        Recommends trustworthy alternatives in the same category using trust-aware utility ranking.
        """
        logger.info(f"Finding alternatives for product: {canonical_product_id} (top_k={top_k})")
        return self.recommendation_service.recommend_alternatives(
            canonical_product_id, top_k=top_k, min_trust_score=min_trust_score
        )

    def find_cross_marketplace_matches(self, canonical_product_id: str) -> List[CrossMarketplaceMatch]:
        """
        Retrieves cross-marketplace candidate matches and variant mappings for a product.
        """
        logger.info(f"Retrieving cross-marketplace matches for: {canonical_product_id}")
        return self.matching_service.find_cross_marketplace_matches(canonical_product_id)

    def evaluate_modality_ablation(
        self,
        canonical_product_id: str,
        omitted_modalities: List[str],
    ) -> Dict[str, Any]:
        """
        Measures the impact on trust score and confidence when specific evidence modalities are omitted.
        """
        logger.info(f"Evaluating modality ablation for {canonical_product_id}: omitted={omitted_modalities}")
        return self.trust_engine.evaluate_ablation(canonical_product_id, set(omitted_modalities))

    def check_system_drift(self, batch_data: Optional[Dict[str, Any]] = None) -> DriftReport:
        """
        Performs statistical data and embedding drift monitoring against the certified v1.7 baseline.
        """
        logger.info("Executing system drift monitoring audit...")
        if batch_data:
            return self.drift_service.run_full_drift_audit(
                current_prices=batch_data.get("prices"),
                current_ratings=batch_data.get("ratings"),
                current_categories=batch_data.get("categories"),
                current_embeddings=batch_data.get("embeddings"),
            )
        return self.drift_service.run_full_drift_audit()
