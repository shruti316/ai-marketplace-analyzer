"""
Engine Contracts, Data Transfer Objects & Schemas
AI-Powered Marketplace Trust Intelligence Platform

Provides strictly typed, immutable dataclasses for all service boundaries,
input requests, modality evidence, and inference reports.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional


@dataclass
class AspectSentiment:
    aspect_name: str
    mentioned: bool
    polarity: int  # -1 = Negative, 0 = Neutral, +1 = Positive
    confidence: float
    matched_keywords: List[str] = field(default_factory=list)


@dataclass
class ReviewItem:
    review_id: str
    review_text: str
    rating: float
    reviewer_id: Optional[str] = None
    review_date: Optional[str] = None
    verified_purchase: str = "NOT_SUPPLIED"
    language: str = "en"


@dataclass
class ReviewEvidence:
    review_id: str
    rating: float
    rating_polarity: str  # POSITIVE, NEUTRAL, NEGATIVE
    language: str  # ENGLISH, HINGLISH, UNKNOWN
    script: str  # LATIN, UNKNOWN
    char_length: int
    word_count: int
    uppercase_ratio: float
    exclamation_count: int
    rating_sentiment_discordance: bool
    duplicate_corpus_frequency: int
    is_exact_duplicate: bool
    is_product_duplicate: bool
    aspects: Dict[str, AspectSentiment] = field(default_factory=dict)
    suspicion_flags: List[str] = field(default_factory=list)


@dataclass
class NLPAnalysisResult:
    canonical_product_id: str
    total_reviews: int
    mean_rating: float
    positive_review_rate: float
    duplicate_review_rate: float
    discordance_count: int
    shouting_review_count: int
    detected_languages: Dict[str, int]
    dominant_aspects: Dict[str, Dict[str, Any]]
    text_trust_penalty: float
    risk_signals: List[str]
    sample_evaluated_reviews: List[ReviewEvidence] = field(default_factory=list)


@dataclass
class VisionEvidence:
    canonical_product_id: str
    total_images: int
    usable_images: int
    has_exact_duplicate_cluster: bool
    exact_duplicate_cluster_size: int
    has_perceptual_duplicate_cluster: bool
    perceptual_duplicate_cluster_size: int
    has_low_resolution: bool
    has_extreme_aspect_ratio: bool
    visual_embedding_available: bool
    visual_trust_penalty: float
    risk_signals: List[str]
    nearest_visual_neighbors: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class PriceEvidence:
    canonical_product_id: str
    observed_price: Optional[float]
    original_currency: str
    normalized_price_inr: Optional[float]
    is_price_valid: bool
    retail_mrp: Optional[float]
    discount_percentage: float
    category: str
    category_median_inr: float
    category_mad_inr: float
    mad_zscore: float
    category_price_percentile: float
    is_extreme_high_outlier: bool
    is_extreme_low_outlier: bool
    has_negative_discount: bool
    has_deep_discount: bool
    price_trust_penalty: float
    risk_signals: List[str]


@dataclass
class GraphEvidence:
    canonical_product_id: str
    total_degree: int
    evidence_degree: int
    degree_centrality: float
    connected_component_id: int
    connected_component_size: int
    is_evidence_isolated: bool
    propagated_risk_score: float
    graph_trust_penalty: float
    risk_signals: List[str]


@dataclass
class CrossMarketplaceMatch:
    candidate_product_id: str
    marketplace: str
    product_title: str
    similarity_score: float
    match_confidence: float
    match_stage: str
    resolution_status: str
    evidence_note: str


@dataclass
class MultimodalTrustReport:
    canonical_product_id: str
    product_title: str
    marketplace: str
    category: str
    modality_tier: str
    composite_trust_score: float  # 0.0 to 1.0 (Higher = more reliable evidence)
    confidence_score: float  # 0.0 to 1.0 (Calibrated by evidence richness)
    risk_level: str  # LOW_RISK, MODERATE_RISK, ELEVATED_RISK, HIGH_RISK, INSUFFICIENT_EVIDENCE
    modality_scores: Dict[str, float]
    available_modalities: List[str]
    missing_modalities: List[str]
    risk_signals: List[str]
    explanations: List[str]
    nlp_summary: Optional[Dict[str, Any]] = None
    vision_summary: Optional[Dict[str, Any]] = None
    price_summary: Optional[Dict[str, Any]] = None
    graph_summary: Optional[Dict[str, Any]] = None
    seller_summary: Optional[Dict[str, Any]] = None
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent)


@dataclass
class ProductComparisonReport:
    product_id_1: str
    product_id_2: str
    title_1: str
    title_2: str
    price_1_inr: Optional[float]
    price_2_inr: Optional[float]
    trust_score_1: float
    trust_score_2: float
    confidence_1: float
    confidence_2: float
    preferred_product_id: str
    preference_reason: str
    aspect_comparison: Dict[str, Dict[str, Any]]
    price_advantage_inr: Optional[float]
    risk_comparison: Dict[str, List[str]]
    comparison_summary: str


@dataclass
class RecommendationItem:
    canonical_product_id: str
    product_title: str
    marketplace: str
    category: str
    price_inr: Optional[float]
    trust_score: float
    similarity_score: float
    utility_score: float
    recommendation_reason: str


@dataclass
class DriftMetricResult:
    feature_name: str
    metric_type: str  # KS_TEST, PSI, TVD, CENTROID_COSINE
    test_statistic: float
    p_value_or_threshold: float
    drift_detected: bool
    alert_level: str  # NORMAL, WARNING, CRITICAL
    baseline_summary: Dict[str, Any]
    current_summary: Dict[str, Any]
    diagnostic_message: str


@dataclass
class DriftReport:
    report_id: str
    timestamp: str
    total_features_evaluated: int
    drifted_features_count: int
    system_alert_level: str  # NORMAL, WARNING, CRITICAL
    drift_details: List[DriftMetricResult]
    recommended_action: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
