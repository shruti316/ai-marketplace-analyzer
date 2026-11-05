"""
Human Annotation Schemas and Contracts - v1.8
AI-Powered Marketplace Trust Intelligence Platform

Defines typed data contracts for human-in-the-loop fraud research annotation:
- Label taxonomy (CONFIRMED_FRAUD, SUSPICIOUS_REQUIRES_REVIEW, NO_EVIDENCE_OF_FRAUD, INSUFFICIENT_EVIDENCE)
- Individual annotator assignment and evaluation records
- Adjudicated consensus labels and inter-annotator agreement metrics
- Strict distinction between Human Research Consensus vs Platform-Adjudicated Legal Labels.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class FraudLabelTaxonomy(str, Enum):
    """Standardized 4-class research annotation label taxonomy."""
    CONFIRMED_FRAUD = "CONFIRMED_FRAUD"
    SUSPICIOUS_REQUIRES_REVIEW = "SUSPICIOUS_REQUIRES_REVIEW"
    NO_EVIDENCE_OF_FRAUD = "NO_EVIDENCE_OF_FRAUD"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"


class AnnotationEvidenceType(str, Enum):
    """Evidence category inspected during annotation."""
    RATING_SENTIMENT_DISCORDANCE = "RATING_SENTIMENT_DISCORDANCE"
    DUPLICATE_REVIEW_CLUSTER = "DUPLICATE_REVIEW_CLUSTER"
    IMAGE_CROSS_LISTING_HIJACK = "IMAGE_CROSS_LISTING_HIJACK"
    PRICE_ANOMALY_PLUNGE = "PRICE_ANOMALY_PLUNGE"
    SELLER_SHELL_ACTIVITY = "SELLER_SHELL_ACTIVITY"
    TEXT_SYNTAX_ANOMALY = "TEXT_SYNTAX_ANOMALY"


class VerificationLevel(str, Enum):
    """Distinguishes scientific research consensus from legal court/platform ground truth."""
    HUMAN_RESEARCH_CONSENSUS = "HUMAN_RESEARCH_CONSENSUS"
    PLATFORM_ADJUDICATED_ACTION = "PLATFORM_ADJUDICATED_ACTION"
    COURT_LEGAL_VERIFICATION = "COURT_LEGAL_VERIFICATION"
    UNVERIFIED_HEURISTIC = "UNVERIFIED_HEURISTIC"


@dataclass
class AnnotationRecord:
    """Individual human annotation submission."""
    annotation_id: str
    target_id: str  # review_id or product_id
    target_type: str  # "REVIEW" or "PRODUCT"
    annotator_pseudonym: str  # Privacy-preserving anonymized ID (e.g., "ANN_01")
    label: FraudLabelTaxonomy
    confidence_score: float  # [0.0, 1.0]
    evidence_types: List[AnnotationEvidenceType]
    annotator_notes: str
    timestamp: str  # ISO 8601
    guidelines_version: str = "v1.0"

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["label"] = self.label.value
        d["evidence_types"] = [e.value for e in self.evidence_types]
        return d


@dataclass
class AdjudicatedAnnotation:
    """Consensus ground-truth label derived from multi-annotator review."""
    adjudication_id: str
    target_id: str
    target_type: str
    consensus_label: FraudLabelTaxonomy
    annotator_count: int
    raw_vote_distribution: Dict[str, int]
    inter_annotator_agreement_score: float  # e.g., Fleiss' kappa or agreement %
    adjudication_method: str  # "MAJORITY_VOTE", "SENIOR_ARBITRATION", "UNANIMOUS"
    verification_level: VerificationLevel
    adjudicator_notes: str
    finalized_timestamp: str
    is_definitive_ground_truth: bool = False  # True ONLY if legally or platform verified

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["consensus_label"] = self.consensus_label.value
        d["verification_level"] = self.verification_level.value
        return d
