"""
Independent Double-Blind Ground-Truth Evaluation Schema and Adjudication Protocol
Milestone 6 / V1.1 Hardening: AI-Powered Indian Marketplace Trust Intelligence Platform

Defines the formal data contracts, label taxonomy, and inter-rater agreement protocols
required for collecting, adjudicating, and validating real-world human ground truth
before Phase 3 backend deployment and prospective model evaluation.

IMPORTANT: This module defines the scientific evaluation protocol and contracts.
It strictly prohibits synthetic or fabricated ground-truth labels.
"""

from dataclasses import asdict, dataclass, field
import datetime
from enum import Enum
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np


class GroundTruthTaxonomy(str, Enum):
    """5-tier standardized ground-truth classification taxonomy."""
    AUTHENTIC = "AUTHENTIC"                                      # Genuine OEM product with accurate representation
    UNAUTHORIZED_STOCK_PHOTO = "UNAUTHORIZED_STOCK_PHOTO"        # Authentic goods using unapproved stock imagery
    SUSPECTED_KNOCKOFF = "SUSPECTED_KNOCKOFF"                    # Counterfeit, replica, or deceptive knockoff
    PACKAGING_VIOLATION = "PACKAGING_VIOLATION"                  # Mislabeled MRP, net quantity, or batch tampering
    SPECIFICATION_MISMATCH = "SPECIFICATION_MISMATCH"            # Technical specs or material mismatch between listing & item


class AdjudicationStatus(str, Enum):
    """Status of the double-blind human review protocol."""
    DOUBLE_BLIND_AGREEMENT = "DOUBLE_BLIND_AGREEMENT"            # Both independent reviewers assigned the identical label
    RESOLVED_BY_THIRD_EXPERT = "RESOLVED_BY_THIRD_EXPERT"        # Initial disagreement resolved by senior expert tie-breaker
    UNRESOLVED_AMBIGUITY = "UNRESOLVED_AMBIGUITY"                # Irreconcilable disagreement; discarded from gold benchmark


@dataclass
class DoubleBlindAnnotationRecord:
    """Strongly-typed record capturing independent multi-annotator review."""
    sample_id: str
    canonical_product_id: str
    marketplace: str
    annotator_1_id: str
    annotator_1_label: GroundTruthTaxonomy
    annotator_1_confidence: int                                  # Likert scale 1 (low) to 5 (absolute certainty)
    annotator_2_id: str
    annotator_2_label: GroundTruthTaxonomy
    annotator_2_confidence: int
    third_adjudicator_id: Optional[str] = None
    third_adjudicator_label: Optional[GroundTruthTaxonomy] = None
    consensus_label: Optional[GroundTruthTaxonomy] = None
    adjudication_status: AdjudicationStatus = AdjudicationStatus.UNRESOLVED_AMBIGUITY
    adjudication_notes: str = ""
    timestamp: str = field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "sample_id": self.sample_id,
            "canonical_product_id": self.canonical_product_id,
            "marketplace": self.marketplace,
            "annotator_1_id": self.annotator_1_id,
            "annotator_1_label": self.annotator_1_label.value if isinstance(self.annotator_1_label, Enum) else self.annotator_1_label,
            "annotator_1_confidence": self.annotator_1_confidence,
            "annotator_2_id": self.annotator_2_id,
            "annotator_2_label": self.annotator_2_label.value if isinstance(self.annotator_2_label, Enum) else self.annotator_2_label,
            "annotator_2_confidence": self.annotator_2_confidence,
            "third_adjudicator_id": self.third_adjudicator_id,
            "third_adjudicator_label": self.third_adjudicator_label.value if isinstance(self.third_adjudicator_label, Enum) and self.third_adjudicator_label else self.third_adjudicator_label,
            "consensus_label": self.consensus_label.value if isinstance(self.consensus_label, Enum) and self.consensus_label else self.consensus_label,
            "adjudication_status": self.adjudication_status.value if isinstance(self.adjudication_status, Enum) else self.adjudication_status,
            "adjudication_notes": self.adjudication_notes,
            "timestamp": self.timestamp,
        }


class GroundTruthAdjudicationProtocol:
    """
    Orchestrates double-blind adjudication, measures inter-rater reliability (Cohen's Kappa),
    and enforces rigorous ground-truth hygiene without synthetic data contamination.
    """

    @staticmethod
    def adjudicate_record(
        sample_id: str,
        canonical_product_id: str,
        marketplace: str,
        annotator_1_id: str,
        annotator_1_label: GroundTruthTaxonomy,
        annotator_1_conf: int,
        annotator_2_id: str,
        annotator_2_label: GroundTruthTaxonomy,
        annotator_2_conf: int,
        third_adjudicator_id: Optional[str] = None,
        third_label: Optional[GroundTruthTaxonomy] = None,
        notes: str = "",
    ) -> DoubleBlindAnnotationRecord:
        """Adjudicates a pair of blind annotations according to the consensus rubric."""
        if annotator_1_label == annotator_2_label:
            status = AdjudicationStatus.DOUBLE_BLIND_AGREEMENT
            consensus = annotator_1_label
        elif third_label is not None:
            if third_label in (annotator_1_label, annotator_2_label):
                status = AdjudicationStatus.RESOLVED_BY_THIRD_EXPERT
                consensus = third_label
            else:
                status = AdjudicationStatus.UNRESOLVED_AMBIGUITY
                consensus = None
        else:
            status = AdjudicationStatus.UNRESOLVED_AMBIGUITY
            consensus = None

        return DoubleBlindAnnotationRecord(
            sample_id=sample_id,
            canonical_product_id=canonical_product_id,
            marketplace=marketplace,
            annotator_1_id=annotator_1_id,
            annotator_1_label=annotator_1_label,
            annotator_1_confidence=annotator_1_conf,
            annotator_2_id=annotator_2_id,
            annotator_2_label=annotator_2_label,
            annotator_2_confidence=annotator_2_conf,
            third_adjudicator_id=third_adjudicator_id,
            third_adjudicator_label=third_label,
            consensus_label=consensus,
            adjudication_status=status,
            adjudication_notes=notes,
        )

    @staticmethod
    def compute_cohens_kappa(labels_1: List[GroundTruthTaxonomy], labels_2: List[GroundTruthTaxonomy]) -> float:
        """
        Computes Cohen's Kappa inter-rater agreement statistic between two raters.
        kappa = (p_o - p_e) / (1 - p_e)
        """
        if len(labels_1) != len(labels_2) or len(labels_1) == 0:
            return 0.0

        n = len(labels_1)
        categories = list(GroundTruthTaxonomy)
        cat_to_idx = {c: i for i, c in enumerate(categories)}
        k = len(categories)

        # Build confusion matrix
        matrix = np.zeros((k, k), dtype=int)
        for l1, l2 in zip(labels_1, labels_2):
            i = cat_to_idx.get(l1, 0)
            j = cat_to_idx.get(l2, 0)
            matrix[i, j] += 1

        # Observed agreement
        p_o = np.trace(matrix) / n

        # Expected agreement by chance
        row_sums = np.sum(matrix, axis=1)
        col_sums = np.sum(matrix, axis=0)
        p_e = np.sum((row_sums / n) * (col_sums / n))

        if p_e >= 1.0:
            return 1.0
        kappa = (p_o - p_e) / (1.0 - p_e)
        return float(kappa)
