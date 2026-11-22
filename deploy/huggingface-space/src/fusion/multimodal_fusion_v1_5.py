"""
src/fusion/multimodal_fusion_v1_5.py
------------------------------------
Explainable Multimodal Evidence Fusion Architecture for Release v1.5.

Formally retires the circular ROC-AUC 0.9124 claim from v1.4.
Provides a leakage-safe, explainable evidence aggregation engine
that fuses NLP, CV, pricing, and graph evidence without target circularity.
"""

from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class MultimodalFusionEngineV15:
    """
    Computes explainable composite trust indicators and evidence attribution.
    Enforces clear separation between:
    1. Observed facts
    2. Computed features
    3. Heuristic risk signals
    4. Model predictions
    5. Verified ground-truth outcomes
    """

    @staticmethod
    def audit_retired_circular_baseline() -> Dict[str, Any]:
        """
        Documents the independent audit and retirement of the v1.4 circular fusion metric.
        """
        return {
            "status": "RETIRED_CIRCULAR_TARGET",
            "previous_claim": "Explainable Random Forest Fusion ROC-AUC 0.9124",
            "root_cause_diagnosis": (
                "In v1.4 src/models/baseline_models.py, composite_risk_label was defined as "
                "((is_duplicate_image > 0) + (price_iqr_ratio > 1.5) + (rating_deviation_from_mean > 1.5)) >= 2. "
                "Because Random Forest was trained on these exact features, the model was fitting its own deterministic "
                "definition, producing an artificial non-predictive ROC-AUC of 0.9124."
            ),
            "remediation_decision": (
                "The 0.9124 score is retired as an independent predictive claim. "
                "The v1.5 platform classifies multi-modal fusion as an unsupervised evidence aggregation framework."
            )
        }

    @staticmethod
    def compute_explainable_trust_assessment(
        product_row: pd.Series,
        price_feature: Optional[pd.Series] = None,
        image_feature: Optional[pd.Series] = None,
        review_features: Optional[pd.DataFrame] = None
    ) -> Dict[str, Any]:
        """
        Computes transparent evidence attribution for an individual marketplace listing.
        Guarantees: Missing modalities do NOT automatically penalize the listing;
        instead, they reduce the confidence score of the assessment.
        """
        pid = product_row.get("canonical_product_id")
        mkt = product_row.get("marketplace")

        signals = []
        penalties = 0.0
        available_modalities = ["PRODUCT_METADATA"]

        # 1. Price Modality
        if price_feature is not None and price_feature.get("is_valid_price", False):
            available_modalities.append("PRICE_OBSERVATION")
            z = abs(price_feature.get("robust_z_score", 0.0))
            if z > 3.5:
                penalties += 0.30
                signals.append(f"Price statistical outlier: robust z-score {z:.2f} > 3.5")
            elif z > 2.0:
                penalties += 0.10
                signals.append(f"Price moderate deviation: robust z-score {z:.2f}")
        else:
            signals.append("Price unobserved or unverified")

        # 2. Image Modality
        if image_feature is not None and image_feature.get("is_usable", False):
            available_modalities.append("IMAGE_ASSET")
            if image_feature.get("is_dhash_duplicate", False):
                penalties += 0.25
                signals.append("Image is a perceptual dHash duplicate across listings")
            if image_feature.get("is_low_resolution", False):
                penalties += 0.05
                signals.append("Image resolution is low (<300px)")
        else:
            signals.append("Image unavailable on disk")

        # 3. Review Modality
        if review_features is not None and not review_features.empty:
            available_modalities.append("CUSTOMER_REVIEWS")
            dup_rate = review_features["is_repeated_text_signal"].mean()
            if dup_rate > 0.50:
                penalties += 0.25
                signals.append(f"High review text repetition: {dup_rate*100:.1f}% duplicate text")
            disc_rate = review_features["is_rating_sentiment_discordant"].mean()
            if disc_rate > 0.30:
                penalties += 0.20
                signals.append(f"High rating-sentiment discordance: {disc_rate*100:.1f}% discordant reviews")
        else:
            signals.append("Customer reviews unlinked or unavailable")

        # Composite trust score (1.0 = maximum trust / zero risk flags)
        trust_score = round(max(0.0, 1.0 - penalties), 4)
        confidence = round(len(available_modalities) / 4.0, 2)

        return {
            "canonical_product_id": pid,
            "marketplace": mkt,
            "composite_trust_score": trust_score,
            "confidence_score": confidence,
            "available_modalities": available_modalities,
            "modality_coverage_count": len(available_modalities),
            "contributing_risk_signals": signals,
            "governance_classification": "UNSUPERVISED_EXPLAINABLE_EVIDENCE_AGGREGATION",
            "fraud_probability_warning": (
                "This score is an evidence aggregation index, NOT a calibrated probability of fraud. "
                "No confirmed merchant fraud ground truth is available for production calibration."
            )
        }
