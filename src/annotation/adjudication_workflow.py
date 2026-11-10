"""Dual-Annotator Adjudication Workflow and Inter-Rater Reliability Protocol.

Defines the double-blind annotation schema, agreement calculation (Cohen's Kappa,
Krippendorff's Alpha proxy), conflict resolution logic, and workflow management
for resolving unadjudicated tasks into Tier 1 Gold annotations.
"""

from dataclasses import dataclass, asdict
from enum import Enum
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.metrics import cohen_kappa_score

logger = logging.getLogger(__name__)


class AnnotationTier(str, Enum):
    TIER_1_ADJUDICATED_GOLD = "TIER_1_ADJUDICATED_GOLD"
    TIER_2_PROVISIONAL_SINGLE = "TIER_2_PROVISIONAL_SINGLE_ANNOTATOR"
    TIER_3_SILVER_HEURISTIC = "TIER_3_SILVER_HEURISTIC"
    PENDING_EVALUATION = "PENDING_HUMAN_EVALUATION"


class ReviewLabel(str, Enum):
    VERIFIED_GENUINE = "VERIFIED_GENUINE"
    SUSPICIOUS = "SUSPICIOUS"
    VERIFIED_DECEPTIVE = "VERIFIED_DECEPTIVE"


@dataclass
class AnnotationRecord:
    task_id: str
    target_id: str
    canonical_product_id: str
    annotator_id: str
    assigned_label: str
    confidence: float
    rationale: str
    timestamp: float


class DualAnnotatorAdjudicator:
    """Manages double-blind annotations, calculates inter-annotator agreement,

    and resolves conflicts into adjudicated Gold ground truth.
    """

    def __init__(self, kappa_threshold: float = 0.70):
        self.kappa_threshold = kappa_threshold

    def calculate_agreement(
        self, labels_a: List[str], labels_b: List[str]
    ) -> Dict[str, Any]:
        """Calculates percentage agreement and Cohen's Kappa between two annotators."""
        if len(labels_a) != len(labels_b):
            raise ValueError("Annotator label lists must have identical lengths.")
        if len(labels_a) == 0:
            return {"percent_agreement": 0.0, "cohen_kappa": 0.0, "sample_size": 0}

        matches = sum(1 for a, b in zip(labels_a, labels_b) if a == b)
        percent_agreement = matches / len(labels_a)

        try:
            kappa = cohen_kappa_score(labels_a, labels_b)
            if np.isnan(kappa):
                kappa = 1.0 if percent_agreement == 1.0 else 0.0
        except Exception:
            kappa = 0.0

        return {
            "sample_size": len(labels_a),
            "identical_matches": matches,
            "percent_agreement": round(float(percent_agreement), 4),
            "cohen_kappa": round(float(kappa), 4),
            "is_reliable": bool(kappa >= self.kappa_threshold),
        }

    def adjudicate_pair(
        self,
        record_a: Dict[str, Any],
        record_b: Dict[str, Any],
        lead_adjudicator_record: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Resolves label between Annotator A and Annotator B.

        If agreement exists: accept consensus as Tier 1 Adjudicated Gold.
        If conflict exists: require lead adjudicator tie-breaker or flag for review.
        """
        task_id = record_a.get("task_id", record_b.get("task_id", "UNKNOWN"))
        target_id = record_a.get("target_id", record_b.get("target_id", "UNKNOWN"))
        label_a = record_a.get("assigned_label")
        label_b = record_b.get("assigned_label")

        if label_a == label_b:
            consensus_label = label_a
            adjudication_status = "CONSENSUS_AGREED"
            tier = AnnotationTier.TIER_1_ADJUDICATED_GOLD.value
            confidence = (float(record_a.get("confidence", 1.0)) + float(record_b.get("confidence", 1.0))) / 2.0
            lead_used = False
        else:
            if lead_adjudicator_record:
                consensus_label = lead_adjudicator_record.get("assigned_label")
                adjudication_status = "LEAD_ADJUDICATED_TIEBREAKER"
                tier = AnnotationTier.TIER_1_ADJUDICATED_GOLD.value
                confidence = float(lead_adjudicator_record.get("confidence", 0.9))
                lead_used = True
            else:
                consensus_label = "CONFLICT_UNRESOLVED"
                adjudication_status = "DISAGREEMENT_PENDING_LEAD"
                tier = AnnotationTier.PENDING_EVALUATION.value
                confidence = 0.0
                lead_used = False

        return {
            "task_id": task_id,
            "target_id": target_id,
            "annotator_a_label": label_a,
            "annotator_b_label": label_b,
            "consensus_label": consensus_label,
            "adjudication_status": adjudication_status,
            "provenance_tier": tier,
            "confidence": round(confidence, 3),
            "lead_adjudicator_involved": lead_used,
        }

    def create_pending_task_manifest(self, pending_df: pd.DataFrame) -> Dict[str, Any]:
        """Audits pending annotation queue and formats double-blind task distribution."""
        total_tasks = len(pending_df)
        marketplaces = pending_df["marketplace"].value_counts().to_dict() if "marketplace" in pending_df.columns else {}
        avg_text_len = int(pending_df["review_text"].str.len().mean()) if "review_text" in pending_df.columns else 0

        # Create randomized split for dual assignment (Annotator 1 & Annotator 2)
        task_batches = {
            "total_pending_records": total_tasks,
            "workflow_phase": "READY_FOR_DOUBLE_BLIND_ANNOTATION",
            "protocol": {
                "annotators_per_record": 2,
                "adjudication_trigger": "label_discordance",
                "kappa_target": self.kappa_threshold,
                "estimated_annotation_hours": round(total_tasks * 2 * 1.5 / 60, 1),  # 1.5 min per review
            },
            "source_distribution": marketplaces,
            "average_text_characters": avg_text_len,
        }
        return task_batches
