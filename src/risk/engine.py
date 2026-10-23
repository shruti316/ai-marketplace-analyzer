"""
src/risk/engine.py
------------------
Explainable, Multimodal Product Trust & Risk Intelligence Engine.

Synthesizes evidence across:
1. Category-stratified price anomaly signals
2. Customer review similarity, volume, and sentiment discordance
3. Packaging visual OCR consistency and image hashing
4. Information completeness & seller verification status

Adheres strictly to core design principles:
- Distinguishes observed facts from inferred risk.
- Explainable: itemizes every signal and its contribution.
- Handles missingness non-punitively: missing price or sparse reviews reduce confidence,
  NOT proof of malicious activity.
- Avoids uncalibrated "fraud probabilities": outputs cautious Risk Tiers and Confidence.
- Completely decoupled from the separate hotel deception benchmark.
"""

import logging
from typing import Dict, Any, List, Optional
import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class MarketplaceRiskEngine:
    """
    Multimodal explainable risk evaluation engine.
    """

    def __init__(self, engine_version: str = "2.1.0"):
        self.engine_version = engine_version

    def evaluate_product_listing(
        self,
        product: Dict[str, Any],
        price_analysis: Dict[str, Any],
        review_analysis: Dict[str, Any],
        visual_analysis: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Synthesizes multimodal signals for a single listing into an explainable assessment.
        """
        cid = product.get("canonical_product_id", "UNKNOWN")
        marketplace = product.get("marketplace", "unknown")
        category = product.get("category", "Other")

        observed_evidence: List[str] = []
        triggered_signals: List[str] = []
        missing_signals: List[str] = []

        
        # Customer experience is reported separately from fraud risk.
        average_rating = review_analysis.get("average_rating")
        average_sentiment = review_analysis.get("average_sentiment_compound")

        customer_experience_summary = "Insufficient review evidence to assess customer experience."

        if average_rating is not None:
            customer_experience_summary = (
                f"Average customer rating: {average_rating}/5."
            )

            if average_sentiment is not None:
                customer_experience_summary += (
                    f" Average review sentiment: {average_sentiment:.2f}."
                )

            if average_rating <= 2.5:
                customer_experience_summary += (
                    " Customer satisfaction appears low; this is not, by itself, evidence of fraud."
                )
            elif average_rating >= 4.0:
                customer_experience_summary += (
                    " Customer ratings are generally positive."
                )


        # Tracking signal availability for Confidence Scoring
        signal_weights = {
            "price": 0.25,
            "reviews": 0.35,
            "images": 0.20,
            "metadata": 0.20,
        }
        available_signal_weight = 0.0

        risk_penalty = 0.0

        # =====================================================================
        # 1. Metadata Completeness Evaluation
        # =====================================================================
        title = product.get("title", "")
        desc = product.get("description", "")
        brand = product.get("brand", "")
        seller_id = product.get("seller_id")

        if title and len(title.strip()) > 5:
            observed_evidence.append(f"Product title present ({len(title)} chars).")
            available_signal_weight += signal_weights["metadata"] * 0.5
        else:
            triggered_signals.append("INCOMPLETE_TITLE")
            missing_signals.append("TITLE_MISSING_OR_SHORT")
            risk_penalty += 10.0

        if desc and len(desc.strip()) > 10:
            observed_evidence.append("Listing description present.")
            available_signal_weight += signal_weights["metadata"] * 0.5
        else:
            missing_signals.append("DESCRIPTION_UNAVAILABLE")

        if seller_id:
            observed_evidence.append(f"Verified merchant ID linked ({seller_id}).")
        else:
            # Brand is displayed, but verified merchant token is not available
            missing_signals.append("MERCHANT_ACCOUNT_UNVERIFIED (Third-party merchant credentials unavailable)")

        # =====================================================================
        # 2. Price Signal Evaluation
        # =====================================================================
        price_status = price_analysis.get("price_status")
        price_val = price_analysis.get("price_observed")

        if price_status == "VALID" and price_val is not None:
            available_signal_weight += signal_weights["price"]
            observed_evidence.append(price_analysis.get("evidence_explanation", ""))

            anomaly_flag = price_analysis.get("anomaly_flag")
            if anomaly_flag == "PRICE_BELOW_LOWER_FENCE":
                triggered_signals.append("PRICE_ANOMALY_LOW (Significant discount relative to category peers)")
                risk_penalty += 25.0
            elif anomaly_flag == "PRICE_ABOVE_UPPER_FENCE":
                triggered_signals.append("PRICE_ANOMALY_HIGH (Significant premium above category upper fence)")
                risk_penalty += 15.0
        else:
            missing_signals.append("PRICE_UNAVAILABLE")

        # =====================================================================
        # 3. Review & NLP Signal Evaluation
        # =====================================================================
        rev_count = review_analysis.get("review_count", 0)
        rev_status = review_analysis.get("review_status")

        if rev_status == "ZERO_REVIEWS":
            missing_signals.append("CUSTOMER_REVIEWS_UNAVAILABLE (Zero reviews on record)")
            observed_evidence.append("No customer reviews currently available for NLP stylometry or sentiment checks.")
        elif rev_status == "SPARSE_SINGLE_REVIEW":
            available_signal_weight += signal_weights["reviews"] * 0.4
            observed_evidence.append(review_analysis.get("evidence_summary", ""))
            missing_signals.append("LIMITED_REVIEW_DENSITY (1 review - similarity clustering requires multiple reviews)")
        else:
            # Dense / multi-review listings
            available_signal_weight += signal_weights["reviews"]
            observed_evidence.append(review_analysis.get("evidence_summary", ""))

            # Repetitive reviews
            rep_pairs = review_analysis.get("repetitive_review_pairs", 0)
            if rep_pairs > 0:
                triggered_signals.append(f"REPETITIVE_REVIEW_CLUSTER ({rep_pairs} pairs with cosine similarity >= 0.80)")
                risk_penalty += min(30.0, rep_pairs * 10.0)

            # Sentiment-rating discordance
            disagree_ratio = review_analysis.get("sentiment_disagreement_ratio", 0.0)
            if disagree_ratio >= 0.30 and rev_count >= 5:
                triggered_signals.append(f"SENTIMENT_RATING_DISCORDANCE ({round(disagree_ratio * 100)}% reviews diverge)")
                risk_penalty += 20.0

            # Verified purchase ratio
            v_ratio = review_analysis.get("verified_purchase_ratio")
            if v_ratio is not None and v_ratio < 0.20 and rev_count >= 5:
                triggered_signals.append(f"LOW_VERIFIED_PURCHASE_RATIO ({round(v_ratio * 100)}% verified)")
                risk_penalty += 15.0

        # =====================================================================
        # 4. Visual & Packaging OCR Evaluation
        # =====================================================================
        if visual_analysis and visual_analysis.get("image_status") == "VALIDATED":
            available_signal_weight += signal_weights["images"]
            observed_evidence.append(visual_analysis.get("evidence_summary", ""))

            consistency = visual_analysis.get("packaging_consistency_score")
            ocr_text = visual_analysis.get("ocr_text")
            if ocr_text and consistency is not None and consistency < 0.15:
                triggered_signals.append(f"PACKAGING_LISTING_TEXT_MISMATCH (consistency score: {consistency})")
                risk_penalty += 25.0
        else:
            missing_signals.append("VISUAL_IMAGE_UNAVAILABLE_OR_UNCHECKED")

        # =====================================================================
        # 5. Composite Score & Confidence Calculation
        # =====================================================================
        # Risk score bounded [0, 100]
        final_risk_score = min(100.0, max(0.0, risk_penalty))
        confidence_score = round(min(1.0, max(0.1, available_signal_weight)), 2)

        if final_risk_score >= 60.0 and confidence_score >= 0.50:
            risk_tier = "HIGH"
        elif final_risk_score >= 35.0:
            risk_tier = "ELEVATED"
        elif final_risk_score >= 15.0:
            risk_tier = "MODERATE"
        else:
            risk_tier = "LOW"

        # Evidence-grounded synthesis narrative
        if triggered_signals:
            narrative = (
                f"Listing demonstrates {len(triggered_signals)} risk signal(s): {'; '.join(triggered_signals)}. "
                f"Overall risk evaluated as {risk_tier} (Risk Score: {final_risk_score:.0f}/100, "
                f"Confidence: {confidence_score:.2f})."
            )
        else:
            narrative = (
                f"No anomalous patterns detected across evaluated dimensions. Listing evaluated as {risk_tier} risk "
                f"(Risk Score: {final_risk_score:.0f}/100, Confidence: {confidence_score:.2f})."
            )

        return {
            "canonical_product_id": cid,
            "marketplace": marketplace,
            "category": category,
            "risk_tier": risk_tier,
            "risk_score": round(final_risk_score, 1),
            "confidence_score": confidence_score,
            
            "customer_experience": {
                "average_rating": average_rating,
                "average_sentiment_compound": average_sentiment,
                "summary": customer_experience_summary,
            },

            "risk_signals_triggered": triggered_signals,
            "missing_signals": missing_signals,
            "observed_evidence": observed_evidence,
            "risk_narrative": narrative,
            "engine_metadata": {
                "engine_version": self.engine_version,
                "confidence_interpretation": "evidence_availability_not_probability",
                "independent_of_hotel_benchmark": True,
                "cautious_terminology_enforced": True,
            },
        }
