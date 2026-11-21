"""
Trust Engine Data Contracts & Schemas
Milestone 6: Final Multimodal Trust Intelligence Engine
AI-Powered Indian Marketplace Trust Intelligence Platform

Defines strongly-typed, schema-validated contracts for unified evidence items,
modality assessments, product and listing trust evaluations, and product comparisons.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class EvidenceNature(str, Enum):
    """Distinguishes raw ground-truth observations, rule-based heuristics, and model predictions."""
    OBSERVED_EVIDENCE = "OBSERVED_EVIDENCE"
    HEURISTIC_SIGNAL = "HEURISTIC_SIGNAL"
    MODEL_PREDICTION = "MODEL_PREDICTION"


class EvidenceModality(str, Enum):
    """Core modalities evaluated across the marketplace trust intelligence platform."""
    REVIEW_NLP = "REVIEW_NLP"
    IMAGE_CV = "IMAGE_CV"
    PRICING = "PRICING"
    SELLER_GOVERNANCE = "SELLER_GOVERNANCE"
    GRAPH_TOPOLOGY = "GRAPH_TOPOLOGY"
    OCR = "OCR"


class ModalityStatus(str, Enum):
    """Operational availability status of a platform modality."""
    OBSERVED = "OBSERVED"                      # Valid observations present and processed
    UNAVAILABLE = "UNAVAILABLE"                # Data absent in catalog crawl (0 reviews, 0 images)
    PROCESSING_FAILED = "PROCESSING_FAILED"    # Data present but processing/dependency failed
    NOT_APPLICABLE = "NOT_APPLICABLE"          # Not applicable to this category/entity


class VisualDuplicateCategory(str, Enum):
    """6-tier visual duplicate taxonomy for marketplace image relationships."""
    EXACT_DUPLICATE = "EXACT_DUPLICATE"                    # Bit-identical or dHash == 0
    NEAR_DUPLICATE_LIGHTING = "NEAR_DUPLICATE_LIGHTING"    # Luminance/contrast shift, dHash <= 4
    NEAR_DUPLICATE_CROP = "NEAR_DUPLICATE_CROP"            # Bounding box crop / aspect ratio shift
    NEAR_DUPLICATE_ROTATION = "NEAR_DUPLICATE_ROTATION"    # Transposition / orientation variant
    BRAND_CATALOG_HERO = "BRAND_CATALOG_HERO"              # Brand catalog stock photography across SKUs
    DISTINCT = "DISTINCT"                                  # Independent visual assets


@dataclass
class VisualEvidenceDetail:
    """Structured visual evidence explanation record (sanitized, no local host paths)."""
    canonical_product_id: str
    visual_asset_id: str
    duplicate_category: VisualDuplicateCategory
    clip_cosine_similarity: Optional[float] = None
    clip_category_zscore: Optional[float] = None
    is_category_discordant: bool = False
    is_white_background: bool = True
    blur_score: float = 0.0
    contrast_std: float = 0.0
    is_suitable_for_inference: bool = True
    shared_product_ids: List[str] = field(default_factory=list)
    sanitized_image_ref: str = ""
    explanation: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "canonical_product_id": self.canonical_product_id,
            "visual_asset_id": self.visual_asset_id,
            "duplicate_category": self.duplicate_category.value if isinstance(self.duplicate_category, Enum) else self.duplicate_category,
            "clip_cosine_similarity": round(self.clip_cosine_similarity, 4) if self.clip_cosine_similarity is not None else None,
            "clip_category_zscore": round(self.clip_category_zscore, 3) if self.clip_category_zscore is not None else None,
            "is_category_discordant": self.is_category_discordant,
            "is_white_background": self.is_white_background,
            "blur_score": round(self.blur_score, 2),
            "contrast_std": round(self.contrast_std, 2),
            "is_suitable_for_inference": self.is_suitable_for_inference,
            "shared_product_ids": self.shared_product_ids,
            "sanitized_image_ref": self.sanitized_image_ref,
            "explanation": self.explanation,
        }


class RiskTier(str, Enum):
    """Explainable risk tiers. Strictly avoids uncalibrated pseudo-probabilities."""
    UNASSESSED_SPARSE_DATA = "UNASSESSED_SPARSE_DATA"
    LOW_OBSERVED_ANOMALY = "LOW_OBSERVED_ANOMALY"
    MODERATE_SINGLE_MODALITY_ANOMALY = "MODERATE_SINGLE_MODALITY_ANOMALY"
    ELEVATED_MULTIMODAL_ANOMALY = "ELEVATED_MULTIMODAL_ANOMALY"


@dataclass
class UnifiedEvidenceItem:
    """Standardized atomic evidence unit across all platform modalities."""
    evidence_id: str
    entity_id: str
    canonical_product_id: str
    listing_id: Optional[str]
    evidence_modality: EvidenceModality
    evidence_type: str
    evidence_nature: EvidenceNature
    observed_value: str
    signal_severity: str  # INFO, LOW, MEDIUM, HIGH
    detection_method: str
    confidence: float
    uncertainty_note: str
    provenance: str
    timestamp: Optional[str]
    modality_available: bool
    evidence_limitations: str
    # V1.1 Provenance, Correlation & Deduplication fields
    evidence_event_id: Optional[str] = None
    correlation_group_id: Optional[str] = None
    related_product_ids: List[str] = field(default_factory=list)
    source_reference: Optional[str] = None
    modality_status: ModalityStatus = ModalityStatus.OBSERVED

    def to_dict(self) -> Dict[str, Any]:
        return {
            "evidence_id": self.evidence_id,
            "entity_id": self.entity_id,
            "canonical_product_id": self.canonical_product_id,
            "listing_id": self.listing_id,
            "evidence_modality": self.evidence_modality.value if isinstance(self.evidence_modality, Enum) else self.evidence_modality,
            "evidence_type": self.evidence_type,
            "evidence_nature": self.evidence_nature.value if isinstance(self.evidence_nature, Enum) else self.evidence_nature,
            "observed_value": self.observed_value,
            "signal_severity": self.signal_severity,
            "detection_method": self.detection_method,
            "confidence": round(self.confidence, 4),
            "uncertainty_note": self.uncertainty_note,
            "provenance": self.provenance,
            "timestamp": self.timestamp,
            "modality_available": self.modality_available,
            "evidence_limitations": self.evidence_limitations,
            "evidence_event_id": self.evidence_event_id,
            "correlation_group_id": self.correlation_group_id,
            "related_product_ids": self.related_product_ids,
            "source_reference": self.source_reference,
            "modality_status": self.modality_status.value if isinstance(self.modality_status, Enum) else self.modality_status,
        }


@dataclass
class ModalityAssessment:
    """Detailed trust assessment for a single modality."""
    modality: EvidenceModality
    status: str  # AVAILABLE, MODALITY_UNAVAILABLE, BLOCKED_DEPENDENCY
    has_anomaly: bool
    anomaly_type: Optional[str]
    summary_text: str
    evidence_count: int
    corroborating_evidence_ids: List[str] = field(default_factory=list)
    limitations: str = ""
    # V1.1 Transparency enhancements
    modality_status: ModalityStatus = ModalityStatus.OBSERVED
    status_reason: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "modality": self.modality.value if isinstance(self.modality, Enum) else self.modality,
            "status": self.status,
            "has_anomaly": self.has_anomaly,
            "anomaly_type": self.anomaly_type,
            "summary_text": self.summary_text,
            "evidence_count": self.evidence_count,
            "corroborating_evidence_ids": self.corroborating_evidence_ids,
            "limitations": self.limitations,
            "modality_status": self.modality_status.value if isinstance(self.modality_status, Enum) else self.modality_status,
            "status_reason": self.status_reason,
        }


@dataclass
class ProductTrustAssessment:
    """Comprehensive explainable trust assessment for a canonical product."""
    canonical_product_id: str
    marketplace: str
    brand: str
    category: str
    subcategory: str
    overall_risk_tier: RiskTier
    available_core_modalities_count: int
    active_anomaly_modality_count: int
    modality_breakdown: Dict[str, ModalityAssessment]
    positive_evidence: List[str]
    negative_evidence: List[str]
    missing_modalities: List[str]
    assessment_limitations: List[str]
    recommendation_summary: str
    assessment_framework: str = "EXPLAINABLE_MULTIMODAL_TRUST_ENGINE_V1_7"
    # V1.1 Provenance & Deduplication fields
    correlated_findings: List[Dict[str, Any]] = field(default_factory=list)
    independent_corroboration_count: int = 0
    visual_evidence_detail: Optional[VisualEvidenceDetail] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "canonical_product_id": self.canonical_product_id,
            "marketplace": self.marketplace,
            "brand": self.brand,
            "category": self.category,
            "subcategory": self.subcategory,
            "overall_risk_tier": self.overall_risk_tier.value if isinstance(self.overall_risk_tier, Enum) else self.overall_risk_tier,
            "available_core_modalities_count": self.available_core_modalities_count,
            "active_anomaly_modality_count": self.active_anomaly_modality_count,
            "modality_breakdown": {k: v.to_dict() for k, v in self.modality_breakdown.items()},
            "positive_evidence": self.positive_evidence,
            "negative_evidence": self.negative_evidence,
            "missing_modalities": self.missing_modalities,
            "assessment_limitations": self.assessment_limitations,
            "recommendation_summary": self.recommendation_summary,
            "assessment_framework": self.assessment_framework,
            "correlated_findings": self.correlated_findings,
            "independent_corroboration_count": self.independent_corroboration_count,
            "visual_evidence_detail": self.visual_evidence_detail.to_dict() if self.visual_evidence_detail else None,
        }


@dataclass
class ListingTrustAssessment:
    """Trust assessment for an individual marketplace listing offer."""
    listing_id: str
    canonical_product_id: str
    marketplace: str
    platform_id: str
    seller_id: str
    seller_resolution_status: str
    fulfillment_type: str
    listing_title: str
    observed_price_inr: Optional[float]
    mrp_inr: Optional[float]
    discount_percentage: float
    product_risk_tier: RiskTier
    listing_specific_flags: List[str]
    trust_summary: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "listing_id": self.listing_id,
            "canonical_product_id": self.canonical_product_id,
            "marketplace": self.marketplace,
            "platform_id": self.platform_id,
            "seller_id": self.seller_id,
            "seller_resolution_status": self.seller_resolution_status,
            "fulfillment_type": self.fulfillment_type,
            "listing_title": self.listing_title,
            "observed_price_inr": self.observed_price_inr,
            "mrp_inr": self.mrp_inr,
            "discount_percentage": self.discount_percentage,
            "product_risk_tier": self.product_risk_tier.value if isinstance(self.product_risk_tier, Enum) else self.product_risk_tier,
            "listing_specific_flags": self.listing_specific_flags,
            "trust_summary": self.trust_summary,
        }


@dataclass
class SellerTrustAssessment:
    """Governance and trust assessment for a seller entity."""
    seller_id: str
    seller_display_name: str
    seller_type: str
    is_individual_merchant: bool
    merchant_resolution_status: str
    governance_classification: str
    total_catalog_listings: int
    unique_brands_count: int
    pricing_anomalies_count: int
    mean_review_sentiment: Optional[float]
    governance_notice: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "seller_id": self.seller_id,
            "seller_display_name": self.seller_display_name,
            "seller_type": self.seller_type,
            "is_individual_merchant": self.is_individual_merchant,
            "merchant_resolution_status": self.merchant_resolution_status,
            "governance_classification": self.governance_classification,
            "total_catalog_listings": self.total_catalog_listings,
            "unique_brands_count": self.unique_brands_count,
            "pricing_anomalies_count": self.pricing_anomalies_count,
            "mean_review_sentiment": self.mean_review_sentiment,
            "governance_notice": self.governance_notice,
        }


@dataclass
class ProductComparisonResult:
    """Evidence-based comparison across two or more products."""
    compared_product_ids: List[str]
    comparison_matrix: Dict[str, Dict[str, Any]]
    evidence_density_ranking: List[str]  # Ordered by available modalities and data depth
    risk_ranking: List[str]  # Ordered from lowest observed risk to highest
    recommended_product_id: Optional[str]
    recommendation_rationale: str
    tradeoffs: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "compared_product_ids": self.compared_product_ids,
            "comparison_matrix": self.comparison_matrix,
            "evidence_density_ranking": self.evidence_density_ranking,
            "risk_ranking": self.risk_ranking,
            "recommended_product_id": self.recommended_product_id,
            "recommendation_rationale": self.recommendation_rationale,
            "tradeoffs": self.tradeoffs,
        }
