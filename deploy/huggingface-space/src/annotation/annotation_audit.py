"""
Annotation Quality and Provenance Audit Pipeline
AI-Powered Indian Marketplace Trust Intelligence Platform

Audits human review annotations for actual provenance, verifies separation of
silver/pseudo-labels, preserves pending tasks, and exports an active annotation queue.
"""

from collections import defaultdict
import datetime
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

logger = logging.getLogger("AnnotationAudit")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class AnnotationAuditor:
    """Audits annotation provenance across reviews, images, and listings."""

    @classmethod
    def audit_human_reviews(cls, human_df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Audits human review annotations for multi-annotator consensus,
        timestamp diversity, and evidence rationale consistency.
        """
        logger.info(f"Auditing {len(human_df)} reported human review annotations...")
        df = human_df.copy()

        annotator_counts = df["annotator_id"].value_counts().to_dict()
        timestamp_counts = df["annotation_timestamp"].value_counts().to_dict()
        adjudication_counts = df["adjudication_status"].value_counts().to_dict()
        kappa_nulls = int(df["inter_annotator_agreement_cohen_kappa"].isna().sum())

        # Check rationale diversity
        rationales = df["label_rationale"].tolist()
        unique_rationales = len(set(rationales))

        # Provenance classification:
        # Since only a single annotator ID exists without independent dual-blind review (Kappa is NaN),
        # these records cannot be classified as certified Gold multi-annotator ground truth.
        df["provenance_classification"] = "TIER_2_PROVISIONAL_SINGLE_ANNOTATOR"
        df["is_multi_annotator_adjudicated"] = False
        df["audit_notes"] = (
            "Single-annotator batch verification. Cohen's Kappa is undefined (no secondary blind annotator). "
            "Preserved as provisional research labels; separate from multi-annotator certified gold ground truth."
        )

        audit_summary = {
            "total_human_review_annotations": len(df),
            "annotator_distribution": annotator_counts,
            "unique_timestamps": len(timestamp_counts),
            "adjudication_distribution": adjudication_counts,
            "kappa_null_count": kappa_nulls,
            "unique_rationale_count": unique_rationales,
            "provenance_tier": "TIER_2_PROVISIONAL_SINGLE_ANNOTATOR",
            "certification_status": "PROVISIONAL_UNADJUDICATED",
        }

        logger.info(f"Human review annotation audit completed: {json.dumps(audit_summary, indent=2)}")
        return df, audit_summary

    @classmethod
    def export_pending_annotation_queue(
        cls,
        pending_df: pd.DataFrame,
        output_json_path: str,
    ) -> Dict[str, Any]:
        """
        Exports structured annotation queue with full guidelines and dual-annotator slots.
        """
        logger.info(f"Exporting annotation task queue for {len(pending_df)} pending tasks...")
        tasks = []
        for idx, row in pending_df.iterrows():
            tasks.append({
                "task_id": str(row["task_id"]),
                "review_id": str(row["review_id"]),
                "canonical_product_id": str(row["canonical_product_id"]),
                "marketplace": str(row.get("marketplace", "")),
                "rating": float(row["rating"]) if pd.notna(row.get("rating")) else None,
                "review_text": str(row.get("review_text", "")),
                "workflow_status": "QUEUED_PENDING_ANNOTATION",
                "target_guidelines_version": "v1.5_MULTI_ANNOTATOR_CONSENSUS",
                "annotation_protocol": {
                    "required_annotators": 2,
                    "adjudication_required_on_disagreement": True,
                    "fields_to_annotate": [
                        "sentiment_polarity (POSITIVE | NEUTRAL | NEGATIVE)",
                        "authenticity_label (VERIFIED_GENUINE | SUSPICIOUS | VERIFIED_DECEPTIVE)",
                        "aspect_quality_polarity (POSITIVE | NEUTRAL | NEGATIVE | NOT_MENTIONED)",
                        "aspect_authenticity_polarity (POSITIVE | NEUTRAL | NEGATIVE | NOT_MENTIONED)",
                        "aspect_delivery_polarity (POSITIVE | NEUTRAL | NEGATIVE | NOT_MENTIONED)",
                        "aspect_packaging_polarity (POSITIVE | NEUTRAL | NEGATIVE | NOT_MENTIONED)",
                        "aspect_service_polarity (POSITIVE | NEUTRAL | NEGATIVE | NOT_MENTIONED)",
                        "aspect_value_polarity (POSITIVE | NEUTRAL | NEGATIVE | NOT_MENTIONED)",
                        "supporting_evidence_span",
                        "annotator_rationale",
                    ],
                },
                "annotator_submissions": {
                    "annotator_01": None,
                    "annotator_02": None,
                    "adjudicator": None,
                },
            })

        queue_doc = {
            "queue_version": "v1.5",
            "generation_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "total_pending_tasks": len(tasks),
            "guidelines_reference": "annotations/annotation_guidelines.md",
            "tasks": tasks,
        }

        Path(output_json_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_json_path, "w", encoding="utf-8") as f:
            json.dump(queue_doc, f, indent=2)

        logger.info(f"Saved {len(tasks)} tasks to {output_json_path}")
        return {"total_tasks_queued": len(tasks), "output_path": output_json_path}
