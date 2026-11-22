"""
Marketplace-Specific Calibration and Decision Policy Engine
Milestone 6 / V1.1 Hardening: AI-Powered Indian Marketplace Trust Intelligence Platform

Handles the domain transfer disparity across Indian e-commerce platforms:
- Amazon India: Validated baseline (threshold 0.50, mean discount 17.46%, median 15.00%).
- Flipkart: Promotional markdown environment (mean discount 39.28%, median 40.00%).
  Using Amazon's 0.50 threshold causes precision collapse to 10.64%.
  Requires marketplace-adapted threshold (0.65) to protect against false alarms.
- Myntra: Unvalidated threshold (mean discount 42.10%). Lacks independent ground-truth calibration.
  Explicitly disclaimed as UNVALIDATED_THRESHOLD / EXPLORATORY.
"""

from dataclasses import dataclass, field
from enum import Enum
import logging
from typing import Any, Dict, List, Optional, Tuple

from src.trust_engine.contracts import RiskTier

logger = logging.getLogger("MarketplacePolicy")


class ThresholdValidationStatus(str, Enum):
    """Validation maturity of marketplace decision thresholds."""
    VALIDATED = "VALIDATED"                                            # Independently verified with balanced precision/recall
    VALIDATED_MARKETPLACE_ADAPTED = "VALIDATED_MARKETPLACE_ADAPTED"    # Shift-adapted threshold mitigating domain false alarms
    UNVALIDATED_THRESHOLD = "UNVALIDATED_THRESHOLD"                    # Sparse ground-truth; provisional exploratory cutoff


@dataclass
class MarketplacePolicyConfig:
    """Strongly-typed policy configuration for an individual marketplace partition."""
    marketplace: str
    decision_threshold: float
    validation_status: ThresholdValidationStatus
    baseline_discount_pct: float
    median_discount_pct: float
    max_recommended_unverified_tier: RiskTier
    policy_rationale: str
    operational_guidance: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "marketplace": self.marketplace,
            "decision_threshold": self.decision_threshold,
            "validation_status": self.validation_status.value if isinstance(self.validation_status, Enum) else self.validation_status,
            "baseline_discount_pct": round(self.baseline_discount_pct, 2),
            "median_discount_pct": round(self.median_discount_pct, 2),
            "max_recommended_unverified_tier": self.max_recommended_unverified_tier.value if isinstance(self.max_recommended_unverified_tier, Enum) else self.max_recommended_unverified_tier,
            "policy_rationale": self.policy_rationale,
            "operational_guidance": self.operational_guidance,
        }


class MarketplaceDecisionPolicy:
    """
    Evaluates model probabilities against marketplace-calibrated thresholds.
    Ensures that domain distribution shifts (e.g. Flipkart promotional discounting)
    do not degrade operational precision or generate false-alarm enforcement actions.
    """

    # Certified platform default policies
    DEFAULT_POLICIES: Dict[str, MarketplacePolicyConfig] = {
        "amazon_in": MarketplacePolicyConfig(
            marketplace="amazon_in",
            decision_threshold=0.50,
            validation_status=ThresholdValidationStatus.VALIDATED,
            baseline_discount_pct=17.46,
            median_discount_pct=15.00,
            max_recommended_unverified_tier=RiskTier.ELEVATED_MULTIMODAL_ANOMALY,
            policy_rationale="Calibrated baseline on Amazon India. Produces balanced precision (88.46%) and recall (92.00%).",
            operational_guidance="Standard production enforcement tiering enabled.",
        ),
        "flipkart": MarketplacePolicyConfig(
            marketplace="flipkart",
            decision_threshold=0.65,
            validation_status=ThresholdValidationStatus.VALIDATED_MARKETPLACE_ADAPTED,
            baseline_discount_pct=39.28,
            median_discount_pct=40.00,
            max_recommended_unverified_tier=RiskTier.ELEVATED_MULTIMODAL_ANOMALY,
            policy_rationale=(
                "Promotional discount environment (39.28% baseline vs Amazon 17.46%). "
                "Default 0.50 threshold triggers severe false alarms (precision 10.64%). "
                "Adapted threshold of 0.65 restores precision to >= 82.5%."
            ),
            operational_guidance="Promotional markdowns require higher confidence cutoff before manual audit escalation.",
        ),
        "myntra": MarketplacePolicyConfig(
            marketplace="myntra",
            decision_threshold=0.50,
            validation_status=ThresholdValidationStatus.UNVALIDATED_THRESHOLD,
            baseline_discount_pct=42.10,
            median_discount_pct=45.00,
            max_recommended_unverified_tier=RiskTier.MODERATE_SINGLE_MODALITY_ANOMALY,
            policy_rationale=(
                "Fashion and lifestyle catalog with high seasonal markdown frequency. "
                "Lacks independent double-blind human ground-truth labels."
            ),
            operational_guidance="Provisional exploratory status only. Do NOT trigger automated catalog sanctions.",
        ),
    }

    def __init__(self, custom_policies: Optional[Dict[str, MarketplacePolicyConfig]] = None):
        self.policies = dict(self.DEFAULT_POLICIES)
        if custom_policies:
            self.policies.update(custom_policies)

    def get_policy(self, marketplace: str) -> MarketplacePolicyConfig:
        """Retrieves policy for marketplace partition with safe fallback."""
        norm_mkt = str(marketplace).lower().strip().replace("-", "_").replace(" ", "_")
        if norm_mkt in self.policies:
            return self.policies[norm_mkt]
        
        # Generic unvalidated fallback
        return MarketplacePolicyConfig(
            marketplace=marketplace,
            decision_threshold=0.50,
            validation_status=ThresholdValidationStatus.UNVALIDATED_THRESHOLD,
            baseline_discount_pct=25.00,
            median_discount_pct=20.00,
            max_recommended_unverified_tier=RiskTier.MODERATE_SINGLE_MODALITY_ANOMALY,
            policy_rationale=f"Unregistered marketplace '{marketplace}'. No calibrated prior available.",
            operational_guidance="Conservative exploratory evaluation only.",
        )

    def evaluate_risk(
        self,
        calibrated_probability: float,
        marketplace: str,
        active_anomaly_count: int = 0,
        available_core_modalities: int = 3,
    ) -> Dict[str, Any]:
        """
        Evaluates risk against marketplace-specific calibrated threshold.
        Enforces Zero-Penalty Invariant when available core modalities < 2.
        """
        policy = self.get_policy(marketplace)
        prob = max(0.0, min(1.0, float(calibrated_probability)))

        # Zero-penalty invariant for sparse data
        if available_core_modalities < 2:
            return {
                "assigned_risk_tier": RiskTier.UNASSESSED_SPARSE_DATA.value,
                "calibrated_probability": round(prob, 4),
                "decision_threshold": policy.decision_threshold,
                "validation_status": policy.validation_status.value,
                "is_above_threshold": False,
                "marketplace": policy.marketplace,
                "zero_penalty_applied": True,
                "warning": "Sparse instrumentation (< 2 core modalities). Unassessed under Zero-Penalty Invariant.",
            }

        is_above = prob >= policy.decision_threshold

        # Tier assignment
        if is_above and policy.validation_status == ThresholdValidationStatus.UNVALIDATED_THRESHOLD:
            # Cap unvalidated marketplaces at MODERATE to avoid false sanctions
            tier = RiskTier.MODERATE_SINGLE_MODALITY_ANOMALY
            warning = f"UNVALIDATED_THRESHOLD: {policy.marketplace} has not been ground-truth validated. Risk capped at {tier.value}."
        elif is_above:
            tier = RiskTier.ELEVATED_MULTIMODAL_ANOMALY
            warning = None
        elif active_anomaly_count >= 1 or prob >= 0.25:
            tier = RiskTier.MODERATE_SINGLE_MODALITY_ANOMALY
            warning = None
        else:
            tier = RiskTier.LOW_OBSERVED_ANOMALY
            warning = None

        return {
            "assigned_risk_tier": tier.value if isinstance(tier, Enum) else tier,
            "calibrated_probability": round(prob, 4),
            "decision_threshold": policy.decision_threshold,
            "validation_status": policy.validation_status.value,
            "is_above_threshold": is_above,
            "marketplace": policy.marketplace,
            "zero_penalty_applied": False,
            "warning": warning,
            "policy_details": policy.to_dict(),
        }
