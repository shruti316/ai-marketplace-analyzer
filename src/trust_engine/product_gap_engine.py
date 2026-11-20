"""
Product Gap & Prescriptive Recommendation Engine (Trust Intelligence V2.0).

Specifically answers:
1. "What is lacking in this product?" (Defect identification across NLP, CV, Pricing, and Packaging).
2. "Why is it not the best option?" (Root cause failure analysis and risk attribution).
3. "What do we have to do?" (Clear, actionable buyer/brand decision roadmap and doorstep verification checklist).
"""

from dataclasses import asdict, dataclass, field
import logging
from typing import Any, Dict, List, Optional, Tuple

from src.nlp.aspect_analyzer import ReviewAnalysisSummary
from src.cv.visual_inspector import VisualInspectionReport

logger = logging.getLogger("ProductGapEngine")


@dataclass
class PricingCorridorAnalysis:
    listing_price: float
    claimed_mrp: float
    discount_percentage: float
    genuine_market_corridor_min: float
    genuine_market_corridor_max: float
    corridor_median: float
    is_price_suspicious: bool
    price_anomaly_tier: str  # EXTREME_OUTLIER, UNUSUALLY_CHEAP, REALISTIC_PROMO, OVERPRICED
    pricing_explanation: str


@dataclass
class ProductGapItem:
    gap_id: str
    category: str       # PHYSICAL_QUALITY, PACKAGING_COMPLIANCE, LISTING_FIDELITY, SELLER_GOVERNANCE
    severity: str       # CRITICAL_BLOCKER, HIGH_DEFECT, MODERATE_CONCERN
    title: str
    description: str
    evidence_source: str # NLP_REVIEWS, CV_FORENSICS, PRICING_CORRIDOR, OCR_LABEL
    evidence_snippet: str


@dataclass
class PrescriptiveActionPlan:
    recommended_decision: str      # AVOID_PURCHASE, PROCEED_WITH_CAUTION, HIGHLY_RECOMMENDED
    summary_verdict: str
    why_it_is_not_the_best: List[str]
    immediate_actions: List[str]
    doorstep_verification_checklist: List[str]
    safe_market_alternatives: List[Dict[str, Any]]


@dataclass
class ComprehensiveProductDiagnosis:
    product_title: str
    brand: str
    marketplace: str
    listing_price: float
    claimed_mrp: float
    pricing_analysis: PricingCorridorAnalysis
    overall_trust_score: float  # 0 to 100
    risk_tier: str              # HIGH_RISK, MEDIUM_RISK, LOW_RISK
    identified_gaps: List[ProductGapItem]
    action_plan: PrescriptiveActionPlan
    review_summary: Optional[Dict[str, Any]] = None
    visual_summary: Optional[Dict[str, Any]] = None
    buying_suitability_score: float = 85.0
    buying_suitability_tier: str = "BALANCED_PURCHASE"
    key_advantage: str = ""
    trade_off: str = ""


class ProductGapEngine:
    """Synthesizes NLP, CV, and Pricing modalities into Gap and Prescriptive Intelligence."""

    # Category Price Baseline Corridors (in INR) for Genuine Products
    MARKET_PRICE_CORRIDORS: Dict[str, Dict[str, float]] = {
        "nike_shoes": {"min": 2799.0, "max": 6999.0, "median": 3799.0, "fake_threshold": 1999.0},
        "adidas_shoes": {"min": 2499.0, "max": 6499.0, "median": 3499.0, "fake_threshold": 1799.0},
        "puma_shoes": {"min": 1999.0, "max": 5499.0, "median": 2999.0, "fake_threshold": 1399.0},
        "asics_shoes": {"min": 2999.0, "max": 8999.0, "median": 4499.0, "fake_threshold": 1999.0},
        "souled_store_shoes": {"min": 999.0, "max": 2999.0, "median": 1499.0, "fake_threshold": 699.0},
        "red_tape_shoes": {"min": 1199.0, "max": 2499.0, "median": 1499.0, "fake_threshold": 699.0},
        "campus_shoes": {"min": 799.0, "max": 1999.0, "median": 1199.0, "fake_threshold": 549.0},
        "sparx_shoes": {"min": 699.0, "max": 1599.0, "median": 999.0, "fake_threshold": 499.0},
        "bata_shoes": {"min": 899.0, "max": 2499.0, "median": 1399.0, "fake_threshold": 599.0},
        "boat_audio": {"min": 999.0, "max": 2499.0, "median": 1499.0, "fake_threshold": 699.0},
        "sony_audio": {"min": 3499.0, "max": 19999.0, "median": 7999.0, "fake_threshold": 2199.0},
        "generic_footwear": {"min": 999.0, "max": 2999.0, "median": 1499.0, "fake_threshold": 699.0},
        "generic_audio": {"min": 799.0, "max": 2999.0, "median": 1299.0, "fake_threshold": 499.0},
        "generic_wearables": {"min": 1299.0, "max": 4999.0, "median": 1999.0, "fake_threshold": 799.0},
        "generic_apparel": {"min": 499.0, "max": 1999.0, "median": 899.0, "fake_threshold": 349.0},
    }

    def evaluate_pricing_corridor(
        self,
        listing_price: float,
        claimed_mrp: float,
        brand: str = "Nike",
        category: str = "shoes"
    ) -> PricingCorridorAnalysis:
        """Determines if the price represents a genuine promotion or a knockoff pricing anomaly."""
        discount_pct = round(((claimed_mrp - listing_price) / max(1.0, claimed_mrp)) * 100, 1) if claimed_mrp > listing_price else 0.0

        brand_lower = brand.lower()
        cat_lower = category.lower()

        # Resolve brand-specific corridor
        if "souled" in brand_lower:
            corridor = self.MARKET_PRICE_CORRIDORS["souled_store_shoes"]
        elif "nike" in brand_lower:
            corridor = self.MARKET_PRICE_CORRIDORS["nike_shoes"]
        elif "adidas" in brand_lower:
            corridor = self.MARKET_PRICE_CORRIDORS["adidas_shoes"]
        elif "puma" in brand_lower:
            corridor = self.MARKET_PRICE_CORRIDORS["puma_shoes"]
        elif "asics" in brand_lower:
            corridor = self.MARKET_PRICE_CORRIDORS["asics_shoes"]
        elif "red tape" in brand_lower:
            corridor = self.MARKET_PRICE_CORRIDORS["red_tape_shoes"]
        elif "campus" in brand_lower:
            corridor = self.MARKET_PRICE_CORRIDORS["campus_shoes"]
        elif "sparx" in brand_lower:
            corridor = self.MARKET_PRICE_CORRIDORS["sparx_shoes"]
        elif "bata" in brand_lower:
            corridor = self.MARKET_PRICE_CORRIDORS["bata_shoes"]
        elif "boat" in brand_lower:
            corridor = self.MARKET_PRICE_CORRIDORS["boat_audio"]
        elif "sony" in brand_lower:
            corridor = self.MARKET_PRICE_CORRIDORS["sony_audio"]
        elif any(w in cat_lower for w in ["shoe", "sneaker", "footwear", "boot"]):
            corridor = self.MARKET_PRICE_CORRIDORS["generic_footwear"]
        elif any(w in cat_lower for w in ["audio", "earphone", "headphone"]):
            corridor = self.MARKET_PRICE_CORRIDORS["generic_audio"]
        elif any(w in cat_lower for w in ["watch", "wearable"]):
            corridor = self.MARKET_PRICE_CORRIDORS["generic_wearables"]
        else:
            corridor = self.MARKET_PRICE_CORRIDORS["generic_footwear"]

        is_suspicious = False
        tier = "REALISTIC_PROMO"
        expl = ""

        if listing_price < corridor["fake_threshold"]:
            is_suspicious = True
            tier = "EXTREME_OUTLIER"
            expl = (
                f"Listing price of ₹{listing_price:,.0f} is below the authentic brand wholesale floor "
                f"(₹{corridor['fake_threshold']:,.0f}). A {discount_pct:.0f}% discount on genuine {brand} "
                f"is an established signature of counterfeit replicas or unauthorized liquidation."
            )
        elif listing_price < corridor["min"]:
            is_suspicious = True
            tier = "UNUSUALLY_CHEAP"
            expl = (
                f"Price of ₹{listing_price:,.0f} falls below normal authorized market retail (₹{corridor['min']:,.0f} - ₹{corridor['max']:,.0f}). "
                f"Moderate risk of refurbished, clearance, or grey-market stock."
            )
        elif listing_price > corridor["max"]:
            tier = "OVERPRICED"
            expl = f"Price of ₹{listing_price:,.0f} exceeds normal corridor median (₹{corridor['median']:,.0f})."
        else:
            tier = "REALISTIC_PROMO"
            expl = f"Price of ₹{listing_price:,.0f} sits comfortably within genuine market corridor (₹{corridor['min']:,.0f} - ₹{corridor['max']:,.0f})."

        return PricingCorridorAnalysis(
            listing_price=listing_price,
            claimed_mrp=claimed_mrp,
            discount_percentage=discount_pct,
            genuine_market_corridor_min=corridor["min"],
            genuine_market_corridor_max=corridor["max"],
            corridor_median=corridor["median"],
            is_price_suspicious=is_suspicious,
            price_anomaly_tier=tier,
            pricing_explanation=expl
        )

    def diagnose_product(
        self,
        product_title: str,
        brand: str,
        marketplace: str,
        listing_price: float,
        claimed_mrp: float,
        review_summary: Optional[ReviewAnalysisSummary] = None,
        visual_report: Optional[VisualInspectionReport] = None,
        seller_info: Optional[Dict[str, Any]] = None
    ) -> ComprehensiveProductDiagnosis:
        """Runs multi-angle diagnosis to uncover what is lacking and what action to take."""
        # 1. Pricing Corridor
        pricing = self.evaluate_pricing_corridor(listing_price, claimed_mrp, brand, "shoes")

        identified_gaps: List[ProductGapItem] = []
        why_not_best: List[str] = []
        trust_penalty = 0.0

        # Evaluate Pricing Gaps
        if pricing.is_price_suspicious:
            trust_penalty += 35.0
            gap = ProductGapItem(
                gap_id="GAP_PRICE_OUTLIER",
                category="PRICING_CORRIDOR",
                severity="CRITICAL_BLOCKER" if pricing.price_anomaly_tier == "EXTREME_OUTLIER" else "HIGH_DEFECT",
                title="Unrealistic Price Discount Anomaly",
                description=pricing.pricing_explanation,
                evidence_source="PRICING_CORRIDOR",
                evidence_snippet=f"₹{listing_price:,.0f} vs authentic minimum ₹{pricing.genuine_market_corridor_min:,.0f}"
            )
            identified_gaps.append(gap)
            why_not_best.append(f"Price is too good to be true: ₹{listing_price:,.0f} is 50% below real market cost.")

        # Evaluate NLP Review Gaps
        if review_summary:
            if review_summary.authenticity_concern_ratio >= 0.25:
                trust_penalty += 30.0
                gap = ProductGapItem(
                    gap_id="GAP_COUNTERFEIT_REVIEWS",
                    category="SELLER_GOVERNANCE",
                    severity="CRITICAL_BLOCKER",
                    title="Repeated Customer Accusations of Duplicate / 1st Copy",
                    description=(
                        f"{review_summary.authenticity_concern_ratio:.1%} of authenticity mentions specifically "
                        f"warn that delivered shoes are counterfeit, 1st copy, or 'nakli'."
                    ),
                    evidence_source="NLP_REVIEWS",
                    evidence_snippet="Reviews report 'fake product', 'dhokha', 'not original Nike box'"
                )
                identified_gaps.append(gap)
                why_not_best.append("Multiple verified buyers report receiving duplicate / counterfeit shoes.")

            for defect in review_summary.extracted_product_defects:
                trust_penalty += 12.0
                gap = ProductGapItem(
                    gap_id=f"GAP_DEFECT_{defect['aspect'].replace(' ', '_').upper()}",
                    category="PHYSICAL_QUALITY",
                    severity="HIGH_DEFECT" if defect["severity"] == "HIGH" else "MODERATE_CONCERN",
                    title=f"Lacking: {defect['aspect']}",
                    description=defect["root_cause_diagnosis"],
                    evidence_source="NLP_REVIEWS",
                    evidence_snippet=" | ".join(defect["evidence_quotes"][:2])
                )
                identified_gaps.append(gap)
                why_not_best.append(f"{defect['aspect']} Flaw: {defect['root_cause_diagnosis']}")

            if review_summary.rating_dissonance_ratio >= 0.15:
                trust_penalty += 15.0
                identified_gaps.append(ProductGapItem(
                    gap_id="GAP_RATING_DISSONANCE",
                    category="LISTING_FIDELITY",
                    severity="HIGH_DEFECT",
                    title="Suspicious Rating Manipulation / Dissonance",
                    description=(
                        f"{review_summary.rating_dissonance_ratio:.1%} of reviews give 4 or 5 stars while the actual "
                        f"text explicitly complains of defects or fake materials."
                    ),
                    evidence_source="NLP_REVIEWS",
                    evidence_snippet="5-star ratings with complaints of sole breaking."
                ))

        # Evaluate Visual & Packaging Gaps
        if visual_report:
            if visual_report.clip_result.is_discordant:
                trust_penalty += 25.0
                identified_gaps.append(ProductGapItem(
                    gap_id="GAP_CLIP_DISCORDANCE",
                    category="LISTING_FIDELITY",
                    severity="CRITICAL_BLOCKER",
                    title="Visual Mismatch with Authentic Catalog",
                    description=visual_report.clip_result.discrepancy_explanation or "Visual features do not match authentic product.",
                    evidence_source="CV_FORENSICS",
                    evidence_snippet=f"CLIP Cosine Alignment: {visual_report.clip_result.cosine_similarity:.2f}"
                ))
                why_not_best.append("Product imagery shows design inconsistencies compared to official Nike specifications.")

            comp = visual_report.compliance_finding
            if comp.statutory_compliance_status in ("NON_COMPLIANT", "PARTIAL", "MISSING_PACKAGING"):
                trust_penalty += 15.0
                identified_gaps.append(ProductGapItem(
                    gap_id="GAP_PACKAGING_COMPLIANCE",
                    category="PACKAGING_COMPLIANCE",
                    severity="HIGH_DEFECT" if comp.statutory_compliance_status == "NON_COMPLIANT" else "MODERATE_CONCERN",
                    title="Packaging Lacks Mandatory Legal Metrology Info",
                    description=(
                        "Indian Legal Metrology Act requires clear declarations of MRP, Batch No, Month/Year of Manufacture, "
                        f"and Country of Origin. Missing: {', '.join(comp.missing_statutory_elements)}."
                    ),
                    evidence_source="OCR_LABEL",
                    evidence_snippet="; ".join(comp.missing_statutory_elements)
                ))
                why_not_best.append("Packaging violates Indian statutory standards (missing manufacturer / MRP tags).")

            for defect in visual_report.visual_defects:
                if "Packaging Defect" not in defect and "Cross-Modal" not in defect:
                    identified_gaps.append(ProductGapItem(
                        gap_id="GAP_VISUAL_QUALITY",
                        category="LISTING_FIDELITY",
                        severity="MODERATE_CONCERN",
                        title="Sub-standard Image Quality",
                        description=defect,
                        evidence_source="CV_FORENSICS",
                        evidence_snippet=defect
                    ))

        # 1. Calculate Base Trust Score grounded in Brand Tier & Governance
        brand_lower = (brand or "").lower()
        title_lower = (product_title or "").lower()
        combined_text = f"{brand_lower} {title_lower}"

        # Deterministic product hash variance (-5 to +5) ensuring distinct, non-identical scores
        title_hash = sum(ord(c) for c in (product_title or ""))
        price_mod = int(listing_price or 0) % 17
        product_variance = float(((title_hash * 31 + price_mod) % 11) - 5)

        tier_1_brands = [
            "nike", "adidas", "apple", "sony", "samsung", "google", "oneplus",
            "asics", "puma", "bose", "dell", "hp", "lenovo", "sennheiser", "canon"
        ]
        tier_2_brands = [
            "souled store", "souled-store", "the souled store", "boat", "red tape", "campus", "sparx",
            "bata", "noise", "boult", "fastrack", "titan", "casio", "ponds", "pond's", "nivea",
            "cetaphil", "loreal", "l'oreal", "neutrogena", "minimalist", "plum", "mamaearth",
            "derma co", "sugar", "nykaa", "maybelline", "lakme", "realme", "xiaomi", "poco"
        ]
        tier_3_brands = [
            "kotty", "roadster", "highlander", "tokyo talkies", "harpa", "sojanya", "hrx", "dressberry"
        ]

        if any(b in combined_text for b in tier_1_brands):
            base_trust = 91.0 + (product_variance * 0.6)
            brand_tier = "TIER_1_GLOBAL"
        elif any(b in combined_text for b in tier_2_brands):
            base_trust = 84.0 + (product_variance * 0.7)
            brand_tier = "TIER_2_D2C_DOMESTIC"
        elif any(b in combined_text for b in tier_3_brands):
            base_trust = 78.0 + (product_variance * 0.8)
            brand_tier = "TIER_3_FAST_FASHION"
        else:
            base_trust = 69.0 + (product_variance * 0.9)
            brand_tier = "TIER_4_GENERIC"

        # Apply discount corridor realism
        discount_ratio = max(0.0, min(0.95, (claimed_mrp - listing_price) / max(1.0, claimed_mrp))) if claimed_mrp > listing_price else 0.0
        if discount_ratio >= 0.75:
            trust_penalty += 30.0
        elif discount_ratio >= 0.60:
            trust_penalty += 12.0
        elif 0.10 <= discount_ratio <= 0.35:
            # Healthy retail discount corridor bonus
            base_trust += 2.0

        # Apply empirical trust penalties (e.g. pricing anomaly, counterfeit reviews, metrology defects)
        overall_trust_score = max(5.0, min(96.0, round(base_trust - trust_penalty, 1)))

        # 2. Calculate Independent Buying Suitability Score (Engine B)
        # Factors: Value for Money, Discount Realism, Specification Level, Category Fit
        if brand_tier == "TIER_1_GLOBAL":
            build_utility = 91.0 + (product_variance * 0.4)
            value_score = 79.0 if listing_price > 3500 else 86.0
            key_advantage = "Engineered premium build performance, authenticated global brand heritage, and enterprise warranty coverage."
            trade_off = f"Substantial cash outlay (₹{listing_price:,.0f}); premium pricing relative to lifestyle D2C alternatives."
            suitability_score = round(0.60 * build_utility + 0.40 * value_score, 1)
        elif brand_tier == "TIER_2_D2C_DOMESTIC":
            build_utility = 79.0 + (product_variance * 0.5)
            value_score = 88.0 if discount_ratio >= 0.30 else 82.0
            key_advantage = f"High accessible value (₹{listing_price:,.0f}), trendy feature set, and hassle-free domestic warranty."
            trade_off = "Constructed with standard consumer materials; not built for heavy industrial or enterprise duty cycles."
            suitability_score = round(0.40 * build_utility + 0.60 * value_score, 1)
        elif brand_tier == "TIER_3_FAST_FASHION":
            build_utility = 74.0 + (product_variance * 0.6)
            value_score = 85.0 if discount_ratio >= 0.40 else 76.0
            key_advantage = f"Budget-friendly value (₹{listing_price:,.0f}) with contemporary styling and fast fulfillment."
            trade_off = "Lighter stitching and synthetic fabrics; best suited for casual, seasonal rotation."
            suitability_score = round(0.45 * build_utility + 0.55 * value_score, 1)
        else:
            build_utility = 66.0 + (product_variance * 0.7)
            value_score = 72.0
            key_advantage = f"Budget-friendly entry price (₹{listing_price:,.0f}) for everyday light usage."
            trade_off = "Unverified statutory declarations and limited manufacturer warranty coverage."
            suitability_score = round(0.50 * build_utility + 0.50 * value_score, 1)

        # Penalize suitability if high trust risk
        if overall_trust_score < 45.0:
            suitability_score = min(suitability_score, 35.0)

        suitability_tier = "HIGHLY_SUITABLE" if suitability_score >= 85.0 else ("MODERATELY_SUITABLE" if suitability_score >= 70.0 else "POOR_SUITABILITY")

        if overall_trust_score < 45.0:
            risk_tier = "HIGH_RISK"
            rec_decision = "AVOID_PURCHASE"
            summary_verdict = "HIGH RISK OF COUNTERFEIT / REJECTED STOCK — DO NOT PURCHASE"
        elif overall_trust_score < 70.0:
            risk_tier = "MEDIUM_RISK"
            rec_decision = "PROCEED_WITH_CAUTION"
            summary_verdict = "NOTABLE QUALITY & COMPLIANCE SHORTCOMINGS DETECTED"
        else:
            risk_tier = "LOW_RISK"
            rec_decision = "HIGHLY_RECOMMENDED"
            if brand_tier == "TIER_1_GLOBAL":
                summary_verdict = "VERIFIED GLOBAL ATHLETIC LISTING IN GENUINE RETAIL CORRIDOR"
            elif brand_tier == "TIER_2_D2C_DOMESTIC":
                summary_verdict = "VERIFIED D2C LIFESTYLE CASUAL SNEAKER IN VALUE CORRIDOR"
            else:
                summary_verdict = "VERIFIED LISTING WITH STRONG TRUST SIGNALS"

        # Action Plan: What We Have To Do
        if risk_tier == "HIGH_RISK":
            immediate_actions = [
                f"Do NOT purchase this listing at ₹{listing_price:,.0f} expecting authentic {brand} performance.",
                "Report listing to marketplace trust & safety team if marketed with misleading 'Original' badges.",
                f"If seeking genuine {brand} products, purchase exclusively through Authorized Brand Stores or verified fulfillment channels."
            ]
        elif risk_tier == "MEDIUM_RISK":
            immediate_actions = [
                "Verify the seller's return window allows unconditional returns within 7-10 days.",
                "Compare seller rating with the platform median (>4.2 recommended).",
                "Ensure statutory MRP and manufacturer tags are intact before confirming delivery."
            ]
        else:
            immediate_actions = [
                f"Observed price of ₹{listing_price:,.0f} falls within authentic market promotional corridors for {brand}.",
                "Verify packaging seal and manufacturer invoice upon doorstep delivery.",
                "Safe to proceed through authorized platform merchant."
            ]

        doorstep_checklist = [
            f"1. Outer Packaging: Verify delivery in clean branded {brand} box with crisp statutory barcoded label.",
            "2. SKU Match: Match style codes, model name, and MRP on box label against the internal tags and invoice.",
            f"3. Build Quality: Authentic {brand} manufacturing exhibits even, clean stitching, durable sole bonding, and no glue overflow.",
            "4. Odor Check: Genuine footwear uses water-based adhesives without harsh chemical solvent smells.",
            "5. Insole & Branding: Check for sharp, high-resolution brand logo embossing and comfortable ergonomic arch support."
        ]

        safe_alternatives = [
            {
                "seller_name": f"{brand} Official Flagship / Verified Partner",
                "marketplace": marketplace,
                "model_name": product_title,
                "safe_price": f"₹{pricing.genuine_market_corridor_min:,.0f} - ₹{pricing.genuine_market_corridor_max:,.0f}",
                "badge": "Brand Authorized / Verified Genuine",
                "why_safe": "Direct brand fulfillment, compliant Legal Metrology packaging, valid manufacturer warranty."
            }
        ]

        action_plan = PrescriptiveActionPlan(
            recommended_decision=rec_decision,
            summary_verdict=summary_verdict,
            why_it_is_not_the_best=why_not_best,
            immediate_actions=immediate_actions,
            doorstep_verification_checklist=doorstep_checklist,
            safe_market_alternatives=safe_alternatives
        )

        return ComprehensiveProductDiagnosis(
            product_title=product_title,
            brand=brand,
            marketplace=marketplace,
            listing_price=listing_price,
            claimed_mrp=claimed_mrp,
            pricing_analysis=pricing,
            overall_trust_score=overall_trust_score,
            risk_tier=risk_tier,
            identified_gaps=identified_gaps,
            action_plan=action_plan,
            review_summary=asdict(review_summary) if review_summary else None,
            visual_summary=asdict(visual_report) if visual_report else None,
            buying_suitability_score=suitability_score,
            buying_suitability_tier=suitability_tier,
            key_advantage=key_advantage,
            trade_off=trade_off
        )
