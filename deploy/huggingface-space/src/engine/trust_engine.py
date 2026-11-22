"""
Multimodal Trust Intelligence Engine — v1.7
AI-Powered Marketplace Trust Intelligence Platform

The core unified intelligence engine that integrates:
1. NLP & Review Intelligence (ABSA, discordance, duplicate reviews)
2. Computer Vision Intelligence (integrity, SHA/dHash duplicate clusters, embeddings)
3. Price Intelligence (category MAD z-scores, discount anomalies, FX conversion)
4. Graph Intelligence (heterogeneous topology, degree centrality, connected components)
5. Seller Intelligence (platform operator formalization, honest null governance)

Non-Circular Governance Rules:
- Transparent additive penalty aggregation.
- Missing modalities reduce confidence, NEVER inflate risk.
- Explicit INSUFFICIENT_EVIDENCE state for un-instrumented catalog items.
- Modality ablation support.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import pandas as pd

from src.engine.contracts import (
    GraphEvidence,
    MultimodalTrustReport,
    NLPAnalysisResult,
    PriceEvidence,
    ReviewItem,
    VisionEvidence,
)
from src.engine.graph_service import GraphIntelligenceService
from src.engine.nlp_service import NLPReviewIntelligenceService
from src.engine.pricing_service import PricingIntelligenceService
from src.engine.vision_service import ComputerVisionIntelligenceService

logger = logging.getLogger("trust_engine")


class MarketplaceTrustEngine:
    """
    Unified Multimodal Marketplace Trust Intelligence Engine.
    Coordinates specialized intelligence services and performs explainable trust evaluation.
    """

    def __init__(self, v17_dir: Optional[Path] = None) -> None:
        self.project_root = Path(__file__).resolve().parents[2]
        self.v17_dir = v17_dir or (self.project_root / "data" / "marketplace_trust_dataset_v1.7")

        # Initialize sub-services
        self.nlp_service = NLPReviewIntelligenceService(self.v17_dir)
        self.vision_service = ComputerVisionIntelligenceService(self.v17_dir)
        self.pricing_service = PricingIntelligenceService(self.v17_dir)
        self.graph_service = GraphIntelligenceService(self.v17_dir)

        self._products_df: Optional[pd.DataFrame] = None
        self._registry_df: Optional[pd.DataFrame] = None
        self._sellers_df: Optional[pd.DataFrame] = None

    def _ensure_metadata_loaded(self) -> None:
        if self._products_df is None:
            prod_path = self.v17_dir / "entities" / "products.parquet"
            reg_path = self.v17_dir / "entities" / "canonical_product_registry.parquet"
            seller_path = self.v17_dir / "entities" / "sellers.parquet"

            if prod_path.exists() and reg_path.exists():
                logger.info("Loading product catalog and seller registry...")
                self._products_df = pd.read_parquet(prod_path)
                self._registry_df = pd.read_parquet(reg_path)
                if seller_path.exists():
                    self._sellers_df = pd.read_parquet(seller_path)

    def analyze_product(
        self,
        canonical_product_id: str,
        custom_listing: Optional[Dict[str, Any]] = None,
        omitted_modalities: Optional[Set[str]] = None,
    ) -> MultimodalTrustReport:
        """
        Executes unified multimodal trust evaluation for a product.
        Supports ad-hoc listing input or retrieval from frozen v1.7 dataset.
        """
        self._ensure_metadata_loaded()
        omitted = omitted_modalities or set()

        # 1. Product Metadata
        title = "Unknown Listing"
        marketplace = "unknown"
        category = "Other"
        modality_tier = "TIER_D_CATALOG"

        if custom_listing:
            title = custom_listing.get("product_title", title)
            marketplace = custom_listing.get("marketplace", marketplace)
            category = custom_listing.get("category", category)
            modality_tier = custom_listing.get("modality_tier", modality_tier)
        elif self._registry_df is not None:
            match = self._registry_df[self._registry_df["canonical_product_id"] == canonical_product_id]
            if not match.empty:
                r = match.iloc[0]
                title = str(r["product_title"])
                marketplace = str(r["marketplace"])
                category = str(r["category"])
                modality_tier = str(r["modality_tier"])

        # 2. Gather Evidence across Modalities
        available_modalities = ["PRODUCT_METADATA"]
        missing_modalities = []
        all_risk_signals: List[str] = []
        all_explanations: List[str] = []

        # Modality 1: NLP Reviews
        nlp_res: Optional[NLPAnalysisResult] = None
        text_penalty = 0.0
        if "CUSTOMER_REVIEWS" not in omitted:
            custom_revs = custom_listing.get("reviews") if custom_listing else None
            nlp_res = self.nlp_service.analyze_product_reviews(canonical_product_id, custom_revs)
            if nlp_res.total_reviews > 0:
                available_modalities.append("CUSTOMER_REVIEWS")
                text_penalty = nlp_res.text_trust_penalty
                if text_penalty > 0:
                    for sig in nlp_res.risk_signals:
                        all_risk_signals.append(f"NLP: {sig}")
                        all_explanations.append(f"Review evidence flagged: {sig.lower().replace('_', ' ')}")
            else:
                missing_modalities.append("CUSTOMER_REVIEWS")
        else:
            missing_modalities.append("CUSTOMER_REVIEWS (ABLATED)")

        # Modality 2: Computer Vision
        vis_ev: Optional[VisionEvidence] = None
        vision_penalty = 0.0
        if "PRODUCT_IMAGES" not in omitted:
            vis_ev = self.vision_service.analyze_product_images(canonical_product_id)
            if vis_ev.usable_images > 0:
                available_modalities.append("PRODUCT_IMAGES")
                vision_penalty = vis_ev.visual_trust_penalty
                if vision_penalty > 0:
                    for sig in vis_ev.risk_signals:
                        all_risk_signals.append(f"VISION: {sig}")
                        all_explanations.append(f"Visual asset flagged: {sig.lower().replace('_', ' ')}")
            else:
                missing_modalities.append("PRODUCT_IMAGES")
        else:
            missing_modalities.append("PRODUCT_IMAGES (ABLATED)")

        # Modality 3: Price Intelligence
        price_ev: Optional[PriceEvidence] = None
        price_penalty = 0.0
        if "PRICE_INTELLIGENCE" not in omitted:
            if custom_listing and "price" in custom_listing:
                price_ev = self.pricing_service.analyze_product_price(
                    canonical_product_id,
                    custom_price=custom_listing.get("price"),
                    custom_currency=custom_listing.get("currency", "INR"),
                    custom_category=category,
                    custom_mrp=custom_listing.get("retail_mrp"),
                )
            else:
                price_ev = self.pricing_service.analyze_product_price(canonical_product_id)

            if price_ev.is_price_valid:
                available_modalities.append("PRICE_INTELLIGENCE")
                price_penalty = price_ev.price_trust_penalty
                if price_penalty > 0:
                    for sig in price_ev.risk_signals:
                        all_risk_signals.append(f"PRICE: {sig}")
                        all_explanations.append(f"Price anomaly flagged: {sig.lower().replace('_', ' ')}")
            else:
                missing_modalities.append("PRICE_INTELLIGENCE")
        else:
            missing_modalities.append("PRICE_INTELLIGENCE (ABLATED)")

        # Modality 4: Graph Topology
        graph_ev: Optional[GraphEvidence] = None
        graph_penalty = 0.0
        if "RELATIONSHIP_GRAPH" not in omitted:
            graph_ev = self.graph_service.extract_graph_evidence(canonical_product_id)
            available_modalities.append("RELATIONSHIP_GRAPH")
            graph_penalty = graph_ev.graph_trust_penalty
            if graph_penalty > 0:
                for sig in graph_ev.risk_signals:
                    all_risk_signals.append(f"GRAPH: {sig}")
                    all_explanations.append(f"Graph topology flagged: {sig.lower().replace('_', ' ')}")
        else:
            missing_modalities.append("RELATIONSHIP_GRAPH (ABLATED)")

        # Modality 5: Platform Seller
        available_modalities.append("PLATFORM_SELLER")

        # 3. Calculate Non-Circular Multimodal Trust Score
        total_penalty = round(min(0.85, text_penalty + vision_penalty + price_penalty + graph_penalty), 3)
        composite_trust_score = round(max(0.10, 1.0 - total_penalty), 3)

        # Calibrate confidence score by available modalities
        if "CUSTOMER_REVIEWS" in available_modalities and "PRODUCT_IMAGES" in available_modalities and "PRICE_INTELLIGENCE" in available_modalities:
            confidence_score = 1.00
        elif "PRODUCT_IMAGES" in available_modalities and "PRICE_INTELLIGENCE" in available_modalities:
            confidence_score = 0.75
        elif "CUSTOMER_REVIEWS" in available_modalities and "PRICE_INTELLIGENCE" in available_modalities:
            confidence_score = 0.70
        else:
            confidence_score = 0.40

        # Insufficient evidence flag
        is_insufficient = len(available_modalities) <= 3 and "CUSTOMER_REVIEWS" not in available_modalities and "PRODUCT_IMAGES" not in available_modalities

        # Assign Risk Level
        if is_insufficient:
            risk_level = "INSUFFICIENT_EVIDENCE"
            all_explanations.append("Insufficient multimodal evidence to assess marketplace risk with high confidence.")
        elif price_penalty > 0 and text_penalty > 0:
            risk_level = "HIGH_RISK"
            all_explanations.append("Multi-modal convergence: Both pricing anomaly and review manipulation signals detected.")
        elif composite_trust_score >= 0.85:
            risk_level = "LOW_RISK"
            all_explanations.append("High trust: Verified marketplace listing with concordant evidence.")
        elif composite_trust_score >= 0.70:
            risk_level = "MODERATE_RISK"
            all_explanations.append("Moderate risk: Minor behavioral or visual duplicate indicators present.")
        else:
            risk_level = "ELEVATED_RISK"
            all_explanations.append("Elevated risk: Substantial anomaly signals detected across one or more modalities.")

        # Modality component scores (1.0 - individual penalty)
        modality_scores = {
            "text_trust_score": round(1.0 - text_penalty, 3),
            "vision_trust_score": round(1.0 - vision_penalty, 3),
            "price_trust_score": round(1.0 - price_penalty, 3),
            "graph_trust_score": round(1.0 - graph_penalty, 3),
            "seller_trust_score": 1.0,  # Platform operator verified
        }

        return MultimodalTrustReport(
            canonical_product_id=canonical_product_id,
            product_title=title,
            marketplace=marketplace,
            category=category,
            modality_tier=modality_tier,
            composite_trust_score=composite_trust_score,
            confidence_score=confidence_score,
            risk_level=risk_level,
            modality_scores=modality_scores,
            available_modalities=available_modalities,
            missing_modalities=missing_modalities,
            risk_signals=all_risk_signals if all_risk_signals else ["NO_ELEVATED_RISK"],
            explanations=all_explanations,
            nlp_summary={
                "total_reviews": nlp_res.total_reviews if nlp_res else 0,
                "mean_rating": nlp_res.mean_rating if nlp_res else 0.0,
                "aspects": nlp_res.dominant_aspects if nlp_res else {},
            },
            vision_summary={
                "usable_images": vis_ev.usable_images if vis_ev else 0,
                "has_duplicates": vis_ev.has_exact_duplicate_cluster if vis_ev else False,
            },
            price_summary={
                "observed_price": price_ev.observed_price if price_ev else None,
                "currency": price_ev.original_currency if price_ev else "UNKNOWN",
                "mad_zscore": price_ev.mad_zscore if price_ev else 0.0,
            },
            graph_summary={
                "total_degree": graph_ev.total_degree if graph_ev else 0,
                "is_isolated": graph_ev.is_evidence_isolated if graph_ev else True,
            },
        )

    def evaluate_ablation(
        self,
        canonical_product_id: str,
        omitted_modalities: Set[str],
    ) -> Dict[str, Any]:
        """
        Evaluates impact on trust and confidence when specific modalities are withheld.
        """
        full_report = self.analyze_product(canonical_product_id)
        ablated_report = self.analyze_product(canonical_product_id, omitted_modalities=omitted_modalities)

        return {
            "canonical_product_id": canonical_product_id,
            "omitted_modalities": list(omitted_modalities),
            "full_trust_score": full_report.composite_trust_score,
            "ablated_trust_score": ablated_report.composite_trust_score,
            "full_confidence": full_report.confidence_score,
            "ablated_confidence": ablated_report.confidence_score,
            "trust_score_delta": round(ablated_report.composite_trust_score - full_report.composite_trust_score, 4),
            "confidence_delta": round(ablated_report.confidence_score - full_report.confidence_score, 4),
        }
