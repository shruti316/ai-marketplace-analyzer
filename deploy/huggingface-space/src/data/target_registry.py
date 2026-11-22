"""Independent Multimodal Target Registry & Supervision Governance.

Project: AI-Powered Indian Marketplace Trust Intelligence Platform
Phase: Phase 1 Final — Scientific Architecture Finalization

Establishes a principled hierarchy of prediction targets across modalities,
decoupling independent ground truth from heuristic flags, proxy tiers, and
synthetic rule outcomes. Eliminates circular supervision and enforces that every
supervised or benchmark task declares its target through this registry.
"""

from dataclasses import asdict, dataclass
from enum import Enum
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

logger = logging.getLogger("TargetRegistry")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
REPORTS_DIR = PROJECT_ROOT / "reports" / "phase_1_final"


class PredictionUnit(str, Enum):
    REVIEW = "review"
    IMAGE_PAIR = "image_pair"
    IMAGE_LISTING_PAIR = "image_listing_pair"
    LISTING_PRICE = "listing_price"
    PRODUCT_LISTING_PAIR = "product_listing_pair"
    PRODUCT = "product"
    SELLER = "seller"


class TargetNature(str, Enum):
    INDEPENDENT_GROUND_TRUTH = "INDEPENDENT_GROUND_TRUTH"
    RETRIEVAL_SIMILARITY = "RETRIEVAL_SIMILARITY"
    UNSUPERVISED_ANOMALY = "UNSUPERVISED_ANOMALY"
    DETERMINISTIC_EVALUATION = "DETERMINISTIC_EVALUATION"
    PROXY_RULE_DERIVED = "PROXY_RULE_DERIVED"


class EvaluationEligibility(str, Enum):
    ELIGIBLE_FOR_INDEPENDENT_SUPERVISION = "ELIGIBLE_FOR_INDEPENDENT_SUPERVISION"
    BLOCKED_AWAITING_HUMAN_GROUND_TRUTH = "BLOCKED_AWAITING_HUMAN_GROUND_TRUTH"
    BLOCKED_AWAITING_EXTERNAL_OUTCOMES = "BLOCKED_AWAITING_EXTERNAL_OUTCOMES"
    ELIGIBLE_UNSUPERVISED_BENCHMARK = "ELIGIBLE_UNSUPERVISED_BENCHMARK"
    ELIGIBLE_DETERMINISTIC_BENCHMARK = "ELIGIBLE_DETERMINISTIC_BENCHMARK"
    DEPRECATED_CIRCULAR_PROXY = "DEPRECATED_CIRCULAR_PROXY"


class RecommendedArchitecture(str, Enum):
    SUPERVISED_CLASSIFICATION = "SUPERVISED_CLASSIFICATION"
    WEAK_SUPERVISION_EXPERIMENTAL = "WEAK_SUPERVISION_EXPERIMENTAL"
    UNSUPERVISED_ANOMALY_DETECTION = "UNSUPERVISED_ANOMALY_DETECTION"
    SIMILARITY_LEARNING_RETRIEVAL = "SIMILARITY_LEARNING_RETRIEVAL"
    DETERMINISTIC_RULE_FUSION = "DETERMINISTIC_RULE_FUSION"
    HYBRID_RULE_AND_ML = "HYBRID_RULE_AND_ML"


@dataclass(frozen=True)
class TargetDefinition:
    """Rigorous specification for an independent prediction or evaluation target."""
    target_id: str
    task_name: str
    prediction_unit: PredictionUnit
    target_nature: TargetNature
    evaluation_eligibility: EvaluationEligibility
    recommended_architecture: RecommendedArchitecture
    label_definitions: Dict[str, str]
    label_source: str
    annotation_method: str
    independent_evidence_requirements: List[str]
    positive_classes: List[str]
    negative_classes: List[str]
    input_features_allowed: List[str]
    forbidden_features: List[str]
    known_limitations: List[str]
    version: str = "2.0.0"

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["prediction_unit"] = self.prediction_unit.value
        d["target_nature"] = self.target_nature.value
        d["evaluation_eligibility"] = self.evaluation_eligibility.value
        d["recommended_architecture"] = self.recommended_architecture.value
        return d


class TargetRegistry:
    """Master registry enforcing target decoupling, independence, and scientific defensibility."""

    _REGISTRY: Dict[str, TargetDefinition] = {}

    @classmethod
    def register(cls, target: TargetDefinition) -> None:
        if target.target_id in cls._REGISTRY:
            logger.warning(f"Target '{target.target_id}' already registered. Overwriting.")
        cls._REGISTRY[target.target_id] = target

    @classmethod
    def get(cls, target_id: str) -> TargetDefinition:
        if target_id not in cls._REGISTRY:
            raise KeyError(f"Target '{target_id}' not found in TargetRegistry.")
        return cls._REGISTRY[target_id]

    @classmethod
    def list_all(cls) -> List[TargetDefinition]:
        return list(cls._REGISTRY.values())

    @classmethod
    def export_provenance_csv(cls, out_path: Optional[Path] = None) -> Path:
        """Exports the complete target provenance and governance table to CSV."""
        path = out_path or (REPORTS_DIR / "target_provenance.csv")
        path.parent.mkdir(parents=True, exist_ok=True)

        rows = []
        for t in cls.list_all():
            rows.append({
                "target_id": t.target_id,
                "task_name": t.task_name,
                "prediction_unit": t.prediction_unit.value,
                "target_nature": t.target_nature.value,
                "evaluation_eligibility": t.evaluation_eligibility.value,
                "recommended_architecture": t.recommended_architecture.value,
                "label_source": t.label_source,
                "annotation_method": t.annotation_method,
                "positive_classes": "|".join(t.positive_classes),
                "negative_classes": "|".join(t.negative_classes),
                "allowed_features_count": len(t.input_features_allowed),
                "forbidden_features_count": len(t.forbidden_features),
                "version": t.version,
            })

        df = pd.DataFrame(rows)
        df.to_csv(path, index=False)
        logger.info(f"Exported {len(rows)} target provenance records to {path}")
        return path


# =====================================================================
# OFFICIAL TARGET DEFINITIONS (WORKSTREAM 1)
# =====================================================================

# Task A — Review Authenticity
TargetRegistry.register(
    TargetDefinition(
        target_id="TARGET_REVIEW_AUTHENTICITY",
        task_name="Task A: Review Authenticity Classification",
        prediction_unit=PredictionUnit.REVIEW,
        target_nature=TargetNature.INDEPENDENT_GROUND_TRUTH,
        evaluation_eligibility=EvaluationEligibility.BLOCKED_AWAITING_HUMAN_GROUND_TRUTH,
        recommended_architecture=RecommendedArchitecture.SUPERVISED_CLASSIFICATION,
        label_definitions={
            "VERIFIED_GENUINE": "Organic customer product experience with verified physical usage evidence.",
            "SUSPICIOUS": "Substantiated behavioural anomalies, duplicate patterns, or verified non-buyer collusion.",
            "VERIFIED_DECEPTIVE": "Confirmed deceptive review fraud, syndicated bot submission, or paid incentive.",
            "UNCERTAIN": "Ambiguous feedback lacking sufficient evidentiary context.",
        },
        label_source="Independent multi-annotator double-blind adjudicated human annotations (v2.0 protocol).",
        annotation_method="Double-blind dual human annotation with lead adjudicator resolution and Cohen's Kappa >= 0.70.",
        independent_evidence_requirements=[
            "Independent of customer star rating.",
            "Independent of negative product quality sentiment.",
            "Corroborated by duplicate cluster IDs, burst timing, or text entropy.",
        ],
        positive_classes=["SUSPICIOUS", "VERIFIED_DECEPTIVE"],
        negative_classes=["VERIFIED_GENUINE"],
        input_features_allowed=[
            "review_text_tfidf", "char_length", "word_count", "sentiment_polarity",
            "subjectivity_score", "aspect_sentiment_vector"
        ],
        forbidden_features=[
            "rating", "rating_discordance_score", "active_anomalies", "overall_risk_tier",
            "authenticity_label"
        ],
        known_limitations=[
            "Historical 100 Gold annotations exhibit 100% negative-rating selection bias (rating <= 2.0).",
            "500 pending annotation queue must complete double-blind adjudication before model unfreezing.",
        ],
    )
)

# Task B — Image Relationship Intelligence
TargetRegistry.register(
    TargetDefinition(
        target_id="TARGET_IMAGE_RELATIONSHIP",
        task_name="Task B: Image Relationship Intelligence & Visual Duplicate Retrieval",
        prediction_unit=PredictionUnit.IMAGE_PAIR,
        target_nature=TargetNature.RETRIEVAL_SIMILARITY,
        evaluation_eligibility=EvaluationEligibility.ELIGIBLE_FOR_INDEPENDENT_SUPERVISION,
        recommended_architecture=RecommendedArchitecture.SIMILARITY_LEARNING_RETRIEVAL,
        label_definitions={
            "EXACT_FILE_DUPLICATE": "Identical binary payload (SHA-256 hash match).",
            "PERCEPTUAL_NEAR_DUPLICATE": "Visually indistinguishable asset under compression/resizing (dHash distance <= 4).",
            "CROSS_CATALOG_REUSE": "Identical hero image reused across disparate canonical products (cos >= 0.95).",
            "UNRELATED_IMAGE": "Distinct visual asset representing different merchandise (cos < 0.90).",
        },
        label_source="Cryptographic hashes, perceptual hashes, and validated visual embedding benchmarks.",
        annotation_method="Deterministic hashing combined with manual visual alignment verification.",
        independent_evidence_requirements=[
            "Cryptographic SHA-256 match or perceptual dHash hamming distance <= 4.",
            "ResNet-18 normalized embedding cosine similarity >= 0.95.",
        ],
        positive_classes=["EXACT_FILE_DUPLICATE", "PERCEPTUAL_NEAR_DUPLICATE", "CROSS_CATALOG_REUSE"],
        negative_classes=["UNRELATED_IMAGE"],
        input_features_allowed=[
            "resnet18_embedding_a", "resnet18_embedding_b", "dhash_hamming_distance",
            "image_width", "image_height", "aspect_ratio", "file_size_bytes"
        ],
        forbidden_features=[
            "overall_risk_tier", "cv_has_cross_catalog_reuse", "is_elevated_risk"
        ],
        known_limitations=[
            "Manufacturer stock photos shared across authorized sellers are valid catalog reuse, not malicious fraud.",
        ],
    )
)

# Task C — Image-Listing Consistency
TargetRegistry.register(
    TargetDefinition(
        target_id="TARGET_IMAGE_LISTING_CONSISTENCY",
        task_name="Task C: Image-Listing Visual-Text Consistency",
        prediction_unit=PredictionUnit.IMAGE_LISTING_PAIR,
        target_nature=TargetNature.INDEPENDENT_GROUND_TRUTH,
        evaluation_eligibility=EvaluationEligibility.ELIGIBLE_FOR_INDEPENDENT_SUPERVISION,
        recommended_architecture=RecommendedArchitecture.SIMILARITY_LEARNING_RETRIEVAL,
        label_definitions={
            "CONSISTENT": "Hero image depicts the exact merchandise and brand described in the listing title.",
            "PARTIALLY_CONSISTENT": "Image depicts merchandise of the correct category but ambiguous variant/brand.",
            "INCONSISTENT": "Hero image depicts merchandise completely discordant with listing text or brand.",
            "INSUFFICIENT_EVIDENCE": "Hero image corrupted, placeholder, or unresolvable.",
        },
        label_source="OpenAI CLIP ViT-B/32 multimodal zero-shot alignment evaluated against synthetic & human-verified pairs.",
        annotation_method="Zero-shot cross-modal embedding similarity with validation-calibrated discordance thresholds.",
        independent_evidence_requirements=[
            "CLIP ViT-B/32 text-image cosine similarity.",
            "Brand name alignment check between packaging OCR and listing title.",
        ],
        positive_classes=["INCONSISTENT"],
        negative_classes=["CONSISTENT"],
        input_features_allowed=[
            "clip_cosine_similarity", "title_length", "image_sharpness", "ocr_brand_verified"
        ],
        forbidden_features=[
            "overall_risk_tier", "clip_is_discordant", "is_elevated_risk"
        ],
        known_limitations=[
            "CLIP can exhibit domain bias on Indian vernacular brand packaging text.",
        ],
    )
)

# Task D — Pricing Intelligence
TargetRegistry.register(
    TargetDefinition(
        target_id="TARGET_PRICING_INTELLIGENCE",
        task_name="Task D: Robust Statistical Pricing Dispersion & Discount Anomalies",
        prediction_unit=PredictionUnit.LISTING_PRICE,
        target_nature=TargetNature.UNSUPERVISED_ANOMALY,
        evaluation_eligibility=EvaluationEligibility.ELIGIBLE_UNSUPERVISED_BENCHMARK,
        recommended_architecture=RecommendedArchitecture.UNSUPERVISED_ANOMALY_DETECTION,
        label_definitions={
            "CORRIDOR_CONSISTENT": "Observed price falls within robust Median +/- 3.0*MAD category corridor.",
            "PRICE_CORRIDOR_OUTLIER": "Selling price deviates substantially (|MAD z-score| >= 3.0).",
            "EXTREME_DISCOUNT_ANOMALY": "Observed discount magnitude >= 90.0% against declared MRP.",
            "MRP_CONSISTENCY_BREACH": "Observed selling price strictly exceeds declared MRP.",
        },
        label_source="Cross-sectional price observations normalized to INR with category benchmarks (N >= 5).",
        annotation_method="Non-parametric median absolute deviation (MAD) and deterministic statutory bounds.",
        independent_evidence_requirements=[
            "Observed selling price in INR.",
            "Category or brand benchmark sample size N >= 5.",
            "Declared MRP observation.",
        ],
        positive_classes=["PRICE_CORRIDOR_OUTLIER", "EXTREME_DISCOUNT_ANOMALY", "MRP_CONSISTENCY_BREACH"],
        negative_classes=["CORRIDOR_CONSISTENT"],
        input_features_allowed=[
            "observed_price_inr", "category_median_price_inr", "category_mad_inr",
            "robust_z_score", "discount_percentage", "declared_mrp_inr"
        ],
        forbidden_features=[
            "is_price_outlier", "is_discount_anomaly", "overall_risk_tier"
        ],
        known_limitations=[
            "Point-in-time cross-sectional crawl lacks longitudinal price history; statistical outliers do not prove fraud.",
        ],
    )
)

# Task E — Product/Listing Consistency
TargetRegistry.register(
    TargetDefinition(
        target_id="TARGET_PRODUCT_LISTING_CONSISTENCY",
        task_name="Task E: Cross-Marketplace Product-Listing Entity Alignment",
        prediction_unit=PredictionUnit.PRODUCT_LISTING_PAIR,
        target_nature=TargetNature.DETERMINISTIC_EVALUATION,
        evaluation_eligibility=EvaluationEligibility.ELIGIBLE_DETERMINISTIC_BENCHMARK,
        recommended_architecture=RecommendedArchitecture.DETERMINISTIC_RULE_FUSION,
        label_definitions={
            "ALIGNED_IDENTICAL": "Listing maps directly to canonical product with matching brand, category, and attributes.",
            "BRAND_MISMATCH": "Listing declared brand conflicts with canonical product brand.",
            "SPECIFICATION_MISMATCH": "Listing attributes contradict canonical product packaging specifications.",
            "CROSS_MARKETPLACE_IDENTITY_MISMATCH": "Same external GTIN/SKU resolves to conflicting products across marketplaces.",
        },
        label_source="Deterministic schema normalization and canonical brand mapping across platforms.",
        annotation_method="Deterministic string matching, fuzzy brand clustering, and relationship graph resolution.",
        independent_evidence_requirements=[
            "Canonical brand lookup dictionary.",
            "Cross-marketplace listing attributes.",
        ],
        positive_classes=["BRAND_MISMATCH", "SPECIFICATION_MISMATCH", "CROSS_MARKETPLACE_IDENTITY_MISMATCH"],
        negative_classes=["ALIGNED_IDENTICAL"],
        input_features_allowed=[
            "listing_brand", "canonical_brand", "brand_similarity_score",
            "category_match_flag", "platform_id"
        ],
        forbidden_features=[
            "overall_risk_tier", "is_elevated_risk"
        ],
        known_limitations=[
            "Unresolved third-party brand aliases can generate false brand discordances without expert mapping.",
        ],
    )
)

# Task F — Overall Product Trust Intelligence (Deterministic Rule System)
TargetRegistry.register(
    TargetDefinition(
        target_id="TARGET_PRODUCT_TRUST_INTELLIGENCE",
        task_name="Task F: Multimodal Product Trust Intelligence & Explainable Assessment",
        prediction_unit=PredictionUnit.PRODUCT,
        target_nature=TargetNature.DETERMINISTIC_EVALUATION,
        evaluation_eligibility=EvaluationEligibility.ELIGIBLE_DETERMINISTIC_BENCHMARK,
        recommended_architecture=RecommendedArchitecture.DETERMINISTIC_RULE_FUSION,
        label_definitions={
            "CONSISTENT_VERIFIED_ALIGNMENT": "High alignment observed across >= 2 core modalities with zero anomalies.",
            "MODERATE_SINGLE_MODALITY_ANOMALY": "Exactly one modality exhibits statistical anomaly; standard monitoring.",
            "ELEVATED_MULTIMODAL_ANOMALY": "Corroborating independent anomalies observed across >= 2 distinct modalities.",
            "UNASSESSED_SPARSE_DATA": "Catalog product instrumented with < 2 core modalities; zero penalty applied.",
        },
        label_source="Deterministic Multimodal Evidence Fusion Engine with Zero-Penalty Invariant.",
        annotation_method="Atomic evidence gathering across review, image, price, seller, and graph modalities.",
        independent_evidence_requirements=[
            "Multi-modal atomic evidence items with explicit provenance and uncertainty bounds.",
            "Strict de-duplication of correlated intra-modal signals.",
            "Zero-penalty invariant: missing modalities produce zero risk elevation.",
        ],
        positive_classes=["ELEVATED_MULTIMODAL_ANOMALY"],
        negative_classes=["CONSISTENT_VERIFIED_ALIGNMENT"],
        input_features_allowed=[
            "atomic_evidence_items", "modality_availability_flags", "corroborating_evidence_ids"
        ],
        forbidden_features=[
            "uncalibrated_fraud_probabilities", "fabricated_seller_reputation"
        ],
        known_limitations=[
            "Deterministic rule system; does not represent ground-truth legal fraud or counterfeit detection.",
            "Supervised fraud prediction at the product level remains explicitly BLOCKED pending external law enforcement ground truth.",
        ],
    )
)

# Deprecated Target (Explicitly tracked for scientific audit integrity)
TargetRegistry.register(
    TargetDefinition(
        target_id="TARGET_DEPRECATED_ELEVATED_RISK_SURROGATE",
        task_name="DEPRECATED: Active Anomaly Surrogate Target",
        prediction_unit=PredictionUnit.PRODUCT,
        target_nature=TargetNature.PROXY_RULE_DERIVED,
        evaluation_eligibility=EvaluationEligibility.DEPRECATED_CIRCULAR_PROXY,
        recommended_architecture=RecommendedArchitecture.DETERMINISTIC_RULE_FUSION,
        label_definitions={
            "1": "active_anomaly_modality_count >= 2",
            "0": "active_anomaly_modality_count < 2",
        },
        label_source="Heuristic rule threshold on trust_assessments_products.parquet.",
        annotation_method="Synthetic binary threshold on active_anomalies.",
        independent_evidence_requirements=["None (Purely synthetic proxy rule)."],
        positive_classes=["1"],
        negative_classes=["0"],
        input_features_allowed=[],
        forbidden_features=[
            "is_price_outlier", "is_extreme_price_outlier", "is_discount_anomaly",
            "cv_has_cross_catalog_reuse", "heur_prob_all", "robust_z_score"
        ],
        known_limitations=[
            "Direct circularity with anomaly flags; continuous feature reconstruction accuracy 99.18%, ROC-AUC 0.9999.",
            "Officially retired from independent supervised evaluation.",
        ],
    )
)


if __name__ == "__main__":
    out_csv = TargetRegistry.export_provenance_csv()
    print(f"Target Registry initialized with {len(TargetRegistry.list_all())} targets.")
    print(f"Exported to: {out_csv}")
