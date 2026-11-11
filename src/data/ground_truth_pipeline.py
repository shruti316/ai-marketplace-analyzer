"""
Independent Ground-Truth Ingestion, Adjudication, and Agreement Pipeline
Milestone 6 / Master Final Readiness: AI-Powered Indian Marketplace Trust Intelligence Platform

Implements a reproducible pipeline for:
- Ingesting multi-annotator human evaluation files.
- Computing inter-rater reliability: Cohen's Kappa (pair) and Fleiss' Kappa (multi-rater).
- Resolving disagreements via senior expert adjudication.
- Managing inconclusive or disputed samples.
- Strictly enforcing honest ground-truth status without synthetic fabrication.
"""

from collections import Counter
from dataclasses import asdict, dataclass, field
import datetime
from enum import Enum
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import pandas as pd

from src.data.ground_truth_schema import (
    AdjudicationStatus,
    DoubleBlindAnnotationRecord,
    GroundTruthAdjudicationProtocol,
    GroundTruthTaxonomy,
)

logger = logging.getLogger("GroundTruthPipeline")


@dataclass
class InterRaterReliabilityMetrics:
    """Statistical summary of multi-annotator agreement."""
    annotator_pair: Tuple[str, str]
    total_samples: int
    raw_agreement_rate: float
    cohens_kappa: float
    agreement_strength: str  # POOR, SLIGHT, FAIR, MODERATE, SUBSTANTIAL, NEAR_PERFECT
    confusion_distribution: Dict[str, Dict[str, int]]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "annotator_pair": list(self.annotator_pair),
            "total_samples": self.total_samples,
            "raw_agreement_rate": round(self.raw_agreement_rate, 4),
            "cohens_kappa": round(self.cohens_kappa, 4),
            "agreement_strength": self.agreement_strength,
            "confusion_distribution": self.confusion_distribution,
        }


class GroundTruthIngestionPipeline:
    """
    Ingests and validates human ground-truth files, adjudicates multi-rater inputs,
    and isolates verified ground truth from heuristic policy proxy labels.
    """

    @staticmethod
    def classify_kappa_strength(kappa: float) -> str:
        """Standard Landis & Koch (1977) agreement strength classification."""
        if kappa < 0.0:
            return "POOR"
        elif kappa <= 0.20:
            return "SLIGHT"
        elif kappa <= 0.40:
            return "FAIR"
        elif kappa <= 0.60:
            return "MODERATE"
        elif kappa <= 0.80:
            return "SUBSTANTIAL"
        else:
            return "NEAR_PERFECT"

    @classmethod
    def compute_fleiss_kappa(cls, label_matrix: np.ndarray, num_categories: int) -> float:
        """
        Computes Fleiss' Kappa for inter-rater agreement across multiple annotators.
        label_matrix: shape (N, k) where entry [i, j] is number of raters assigning category j to subject i.
        """
        N, k = label_matrix.shape
        n_raters = np.sum(label_matrix[0, :])
        if n_raters <= 1 or N == 0:
            return 0.0

        # P_i: extent of agreement for the i-th subject
        P_i = (np.sum(label_matrix ** 2, axis=1) - n_raters) / (n_raters * (n_raters - 1))
        P_bar = np.mean(P_i)

        # p_j: proportion of all assignments to the j-th category
        p_j = np.sum(label_matrix, axis=0) / (N * n_raters)
        P_e_bar = np.sum(p_j ** 2)

        if P_e_bar >= 1.0:
            return 1.0
        kappa = (P_bar - P_e_bar) / (1.0 - P_e_bar)
        return float(kappa)

    @classmethod
    def evaluate_annotator_pair(
        cls,
        records: List[DoubleBlindAnnotationRecord],
    ) -> InterRaterReliabilityMetrics:
        """Evaluates pair-wise agreement across a list of double-blind records."""
        if not records:
            return InterRaterReliabilityMetrics(
                annotator_pair=("NONE", "NONE"),
                total_samples=0,
                raw_agreement_rate=0.0,
                cohens_kappa=0.0,
                agreement_strength="POOR",
                confusion_distribution={},
            )

        r0 = records[0]
        pair = (r0.annotator_1_id, r0.annotator_2_id)
        labels_1 = [r.annotator_1_label for r in records]
        labels_2 = [r.annotator_2_label for r in records]

        agree_count = sum(1 for l1, l2 in zip(labels_1, labels_2) if l1 == l2)
        raw_rate = agree_count / len(records)
        kappa = GroundTruthAdjudicationProtocol.compute_cohens_kappa(labels_1, labels_2)
        strength = cls.classify_kappa_strength(kappa)

        confusion: Dict[str, Dict[str, int]] = {}
        for l1, l2 in zip(labels_1, labels_2):
            k1 = l1.value if hasattr(l1, "value") else str(l1)
            k2 = l2.value if hasattr(l2, "value") else str(l2)
            if k1 not in confusion:
                confusion[k1] = {}
            confusion[k1][k2] = confusion[k1].get(k2, 0) + 1

        return InterRaterReliabilityMetrics(
            annotator_pair=pair,
            total_samples=len(records),
            raw_agreement_rate=raw_rate,
            cohens_kappa=kappa,
            agreement_strength=strength,
            confusion_distribution=confusion,
        )

    @classmethod
    def ingest_annotation_file(cls, file_path: Union[str, Path]) -> Dict[str, Any]:
        """
        Inspects and ingests an annotation file.
        Detects whether the file contains real human labels or unannotated templates.
        """
        p = Path(file_path)
        if not p.exists():
            return {
                "file_path": str(p),
                "status": "FILE_NOT_FOUND",
                "verified_sample_count": 0,
                "is_definitive_ground_truth": False,
                "evaluation_status": "BLOCKED_BY_DATA_AVAILABILITY",
            }

        if p.suffix == ".csv":
            df = pd.read_csv(p)
        elif p.suffix == ".parquet":
            df = pd.read_parquet(p)
        else:
            return {"file_path": str(p), "status": "UNSUPPORTED_FORMAT", "verified_sample_count": 0}

        # Check for manual label columns
        label_cols = [c for c in df.columns if "label" in c.lower() or "consensus" in c.lower()]
        non_null_counts = {c: int(df[c].dropna().count()) for c in label_cols}
        total_rows = len(df)

        has_definitive = False
        if "is_definitive_ground_truth" in df.columns:
            has_definitive = bool(df["is_definitive_ground_truth"].any())

        is_real_ground_truth = has_definitive and any(cnt > 0 for cnt in non_null_counts.values())

        return {
            "file_path": str(p),
            "status": "INGESTED",
            "total_rows": total_rows,
            "label_columns_detected": non_null_counts,
            "is_definitive_ground_truth": is_real_ground_truth,
            "evaluation_status": "VALIDATED" if is_real_ground_truth else "BLOCKED_BY_DATA_AVAILABILITY",
            "operational_note": (
                "Verified double-blind human ground-truth labels available." if is_real_ground_truth
                else "Unannotated template or research pilot sample. Real-world evaluation blocked by data availability."
            ),
        }
