"""
Aspect-Based Review Sentiment and Defect Mining Engine (NLP Intelligence V2.0).

Performs:
1. Multi-Aspect Sentiment Dissection (Durability, Comfort/Fit, Packaging, Authenticity, Value).
2. Indian Marketplace Hinglish & Slang Sentiment Calibration.
3. Rating-Review Dissonance Analysis (e.g. 5-star rating with "nakli / duplicate" text).
4. Product Defect & Shortcoming Extraction (identifies what is lacking from customer evidence).
5. Granular Aspect Sentiment Polarity Scoring (-1.0 to +1.0).
"""

from dataclasses import asdict, dataclass, field
import logging
import re
from typing import Any, Dict, List, Optional, Set, Tuple
import unicodedata

try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
    _VADER_ANALYZER = SentimentIntensityAnalyzer()
except ImportError:
    _VADER_ANALYZER = None

logger = logging.getLogger("AspectReviewAnalyzer")

# Aspect Keyword Dictionary for E-commerce & Footwear/Apparel/General Goods
ASPECT_TAXONOMY: Dict[str, Dict[str, Any]] = {
    "material_durability": {
        "display_name": "Material & Sole Durability",
        "keywords": [
            "sole", "gum", "gumming", "paste", "pasting", "stitch", "stitching",
            "durability", "tear", "torn", "peel", "peeled", "broken", "quality",
            "material", "leather", "rubber", "plastic", "lifespan", "wear", "grip"
        ],
        "weight": 0.30
    },
    "comfort_fit": {
        "display_name": "Comfort & Ergonomics",
        "keywords": [
            "comfort", "comfortable", "cushion", "cushioning", "pain", "bite", "shoe bite",
            "tight", "loose", "size", "sizing", "fit", "fitting", "insole", "arch",
            "walk", "walking", "running", "heavy", "lightweight", "breathable"
        ],
        "weight": 0.25
    },
    "packaging_compliance": {
        "display_name": "Packaging & Box Integrity",
        "keywords": [
            "box", "packaging", "package", "tag", "tags", "label", "seal", "invoice",
            "bill", "wrap", "barcode", "damaged box", "torn box", "no box", "plain box",
            "mfg date", "mrp tag"
        ],
        "weight": 0.15
    },
    "authenticity_trust": {
        "display_name": "Authenticity & Genuineness",
        "keywords": [
            "original", "genuine", "authentic", "fake", "copy", "first copy", "1st copy",
            "duplicate", "replica", "counterfeit", "nakli", "asli", "dhokha", "scam",
            "cheat", "brand check", "verify", "logo"
        ],
        "weight": 0.20
    },
    "price_value": {
        "display_name": "Price-to-Value Proposition",
        "keywords": [
            "price", "cost", "value", "worth", "expensive", "cheap", "paisa vasool",
            "loot", "waste", "money", "discount", "offer", "sale", "overpriced"
        ],
        "weight": 0.10
    }
}

# Domain-Specific Footwear & Product Defect Expressions
PRODUCT_DEFECT_PATTERNS = {
    "came off": -0.85,
    "sole off": -0.90,
    "sole came off": -0.95,
    "peeled off": -0.85,
    "not genuine": -0.95,
    "not original": -0.95,
    "not authentic": -0.95,
    "bad gumming": -0.85,
    "gumming": -0.50,
    "stitching coming out": -0.85,
    "loose stitching": -0.75,
    "chemical smell": -0.80,
    "glue smell": -0.80,
    "shoe bite": -0.85,
    "hard plastic": -0.70,
    "hard insole": -0.75,
    "plain brown box": -0.80,
    "without tags": -0.75,
    "no tags": -0.75,
    "no barcode": -0.80,
    "no mrp": -0.75,
    "torn box": -0.65,
    "waste of": -0.85,
    "1st copy": -0.90,
    "first copy": -0.90,
    "duplicate": -0.90,
    "fake": -0.95,
    "nakli": -0.95,
    "dhokha": -0.95
}

# Hinglish Polar Lexicons
HINGLISH_POS = {
    "paisa vasool": 2.0, "badhiya": 1.5, "badiya": 1.5, "mast": 1.6, "shandar": 1.7,
    "zabarjast": 1.8, "jabardast": 1.8, "asli": 1.9, "sahi": 1.2, "bohot accha": 1.6,
    "bahut accha": 1.6, "ek number": 1.8, "superb": 1.5, "genuine": 1.8
}

HINGLISH_NEG = {
    "kharab": -1.8, "khrab": -1.8, "bekar": -2.0, "bekaar": -2.0, "dhokha": -2.5,
    "nakli": -2.5, "ganda": -1.5, "bakwas": -2.0, "kachra": -2.2, "loot": -2.0,
    "ghatiya": -2.2, "chori": -2.5, "waste of money": -2.2, "fraud": -2.5, "scam": -2.5,
    "duplicate": -2.3, "first copy": -2.2, "1st copy": -2.2, "fake": -2.5
}


@dataclass
class AspectFinding:
    aspect_id: str
    display_name: str
    sentiment_score: float  # -1.0 to +1.0
    sentiment_label: str    # POSITIVE, NEUTRAL, CRITICAL_DEFECT, CONCERN
    mention_count: int
    positive_mentions: int
    negative_mentions: int
    top_complaints: List[str]
    top_praises: List[str]
    defect_risk_level: str  # HIGH, MEDIUM, LOW


@dataclass
class ReviewDissonanceRecord:
    review_id: str
    rating: float
    sentiment_score: float
    text_snippet: str
    is_dissonant: bool
    explanation: str


@dataclass
class ReviewAnalysisSummary:
    total_reviews_analyzed: int
    overall_sentiment_score: float
    aspect_findings: Dict[str, AspectFinding]
    rating_dissonance_ratio: float
    authenticity_concern_ratio: float
    extracted_product_defects: List[Dict[str, Any]]
    dissonant_reviews: List[ReviewDissonanceRecord]
    executive_review_verdict: str


class AspectReviewAnalyzer:
    """Advanced Aspect-Based Sentiment and Defect Analyzer for E-commerce Reviews."""

    def __init__(self):
        self.vader = _VADER_ANALYZER

    def clean_text(self, text: str) -> str:
        if not text:
            return ""
        norm = unicodedata.normalize("NFC", str(text))
        return re.sub(r"\s+", " ", norm).strip()

    def score_sentence_sentiment(self, sentence: str) -> float:
        """Computes sentiment score (-1.0 to 1.0) with VADER + Hinglish calibration."""
        if not sentence.strip():
            return 0.0

        clean = self.clean_text(sentence)
        lower = clean.lower()

        # Check VADER base
        base_score = 0.0
        if self.vader:
            vs = self.vader.polarity_scores(clean)
            base_score = vs["compound"]

        # Apply domain-specific defect pattern penalties
        defect_penalty = 0.0
        for pattern, weight in PRODUCT_DEFECT_PATTERNS.items():
            if pattern in lower:
                defect_penalty += weight

        # Apply Hinglish boosts
        hinglish_delta = 0.0
        for phrase, weight in HINGLISH_POS.items():
            if phrase in lower:
                hinglish_delta += weight * 0.25
        for phrase, weight in HINGLISH_NEG.items():
            if phrase in lower:
                hinglish_delta += weight * 0.25

        # If severe defect found, override positive false-positives
        if defect_penalty < -0.6:
            combined = min(-0.4, base_score + defect_penalty + hinglish_delta)
        else:
            combined = base_score + defect_penalty + hinglish_delta

        return max(-1.0, min(1.0, round(combined, 3)))

    def analyze_reviews(
        self,
        reviews: List[Dict[str, Any]],
        product_category: str = "footwear"
    ) -> ReviewAnalysisSummary:
        """
        Analyzes a collection of customer reviews for a product.
        Each review expected to have:
        - 'review_id': str or int
        - 'rating': float (1.0 to 5.0)
        - 'review_text': str
        - 'verified_purchase': bool (optional)
        """
        if not reviews:
            return ReviewAnalysisSummary(
                total_reviews_analyzed=0,
                overall_sentiment_score=0.0,
                aspect_findings={},
                rating_dissonance_ratio=0.0,
                authenticity_concern_ratio=0.0,
                extracted_product_defects=[],
                dissonant_reviews=[],
                executive_review_verdict="NO_REVIEWS_AVAILABLE"
            )

        aspect_mentions: Dict[str, Dict[str, Any]] = {
            k: {
                "scores": [],
                "positive": [],
                "negative": [],
                "complaints": [],
                "praises": []
            }
            for k in ASPECT_TAXONOMY
        }

        all_scores: List[float] = []
        dissonant_records: List[ReviewDissonanceRecord] = []
        authenticity_mentions = 0
        authenticity_negative = 0

        for r in reviews:
            rid = str(r.get("review_id", f"rev_{len(all_scores)}"))
            rating = float(r.get("rating", 3.0))
            text = self.clean_text(r.get("review_text", ""))
            if not text:
                continue

            sentiment = self.score_sentence_sentiment(text)
            all_scores.append(sentiment)

            # Rating Dissonance Check (e.g. 4 or 5 stars but negative text)
            is_dissonant = False
            expl = ""
            if rating >= 4.0 and sentiment <= -0.25:
                is_dissonant = True
                expl = f"Rating is {rating}★ (high) but review sentiment is negative ({sentiment:.2f})."
            elif rating <= 2.0 and sentiment >= 0.40:
                is_dissonant = True
                expl = f"Rating is {rating}★ (low) but review sentiment is positive ({sentiment:.2f})."

            if is_dissonant:
                dissonant_records.append(
                    ReviewDissonanceRecord(
                        review_id=rid,
                        rating=rating,
                        sentiment_score=sentiment,
                        text_snippet=text[:120] + ("..." if len(text) > 120 else ""),
                        is_dissonant=True,
                        explanation=expl
                    )
                )

            # Aspect Matching
            lower_text = text.lower()
            sentences = re.split(r"[.!?\n]+", text)

            for asp_id, asp_cfg in ASPECT_TAXONOMY.items():
                matched_keywords = [kw for kw in asp_cfg["keywords"] if kw in lower_text]
                if matched_keywords:
                    # Find specific sentence matching the aspect
                    for s in sentences:
                        s_clean = s.strip()
                        if any(kw in s_clean.lower() for kw in matched_keywords):
                            s_score = self.score_sentence_sentiment(s_clean)
                            aspect_mentions[asp_id]["scores"].append(s_score)
                            if s_score < -0.15:
                                aspect_mentions[asp_id]["negative"].append(s_score)
                                if len(aspect_mentions[asp_id]["complaints"]) < 5:
                                    aspect_mentions[asp_id]["complaints"].append(s_clean)
                            elif s_score > 0.15:
                                aspect_mentions[asp_id]["positive"].append(s_score)
                                if len(aspect_mentions[asp_id]["praises"]) < 5:
                                    aspect_mentions[asp_id]["praises"].append(s_clean)

            # Authenticity tracking
            if any(w in lower_text for w in ASPECT_TAXONOMY["authenticity_trust"]["keywords"]):
                authenticity_mentions += 1
                if any(neg in lower_text for neg in ["fake", "copy", "nakli", "duplicate", "dhokha", "first copy"]):
                    authenticity_negative += 1

        # Aggregate Aspects
        aspect_findings: Dict[str, AspectFinding] = {}
        extracted_defects: List[Dict[str, Any]] = []

        for asp_id, asp_cfg in ASPECT_TAXONOMY.items():
            scores = aspect_mentions[asp_id]["scores"]
            pos = len(aspect_mentions[asp_id]["positive"])
            neg = len(aspect_mentions[asp_id]["negative"])
            total_m = len(scores)

            if total_m > 0:
                avg_score = round(float(sum(scores) / total_m), 3)
            else:
                avg_score = 0.0

            if avg_score <= -0.30 or (total_m > 0 and neg / total_m >= 0.50):
                label = "CRITICAL_DEFECT"
                risk_level = "HIGH"
            elif avg_score < 0.0:
                label = "CONCERN"
                risk_level = "MEDIUM"
            elif avg_score >= 0.35:
                label = "POSITIVE"
                risk_level = "LOW"
            else:
                label = "NEUTRAL"
                risk_level = "LOW"

            finding = AspectFinding(
                aspect_id=asp_id,
                display_name=asp_cfg["display_name"],
                sentiment_score=avg_score,
                sentiment_label=label,
                mention_count=total_m,
                positive_mentions=pos,
                negative_mentions=neg,
                top_complaints=aspect_mentions[asp_id]["complaints"],
                top_praises=aspect_mentions[asp_id]["praises"],
                defect_risk_level=risk_level
            )
            aspect_findings[asp_id] = finding

            # Extract concrete defect if risk is MEDIUM or HIGH
            if risk_level in ("HIGH", "MEDIUM") and finding.top_complaints:
                extracted_defects.append({
                    "aspect": asp_cfg["display_name"],
                    "severity": risk_level,
                    "sentiment_score": avg_score,
                    "evidence_quotes": finding.top_complaints[:3],
                    "root_cause_diagnosis": self._diagnose_defect_cause(asp_id, finding.top_complaints)
                })

        overall_sentiment = round(float(sum(all_scores) / len(all_scores)), 3) if all_scores else 0.0
        dissonance_ratio = round(len(dissonant_records) / len(reviews), 3) if reviews else 0.0
        auth_concern_ratio = round(authenticity_negative / max(1, authenticity_mentions), 3)

        # Executive verdict
        if auth_concern_ratio >= 0.35 or len([d for d in extracted_defects if d["severity"] == "HIGH"]) >= 2:
            verdict = "SEVERE_PRODUCT_DEFECTS_AND_HIGH_COUNTERFEIT_RISK"
        elif len(extracted_defects) > 0 or dissonance_ratio > 0.20:
            verdict = "NOTABLE_QUALITY_ISSUES_DETECTED"
        else:
            verdict = "GENERALLY_POSITIVE_REVIEW_PROFILE"

        return ReviewAnalysisSummary(
            total_reviews_analyzed=len(reviews),
            overall_sentiment_score=overall_sentiment,
            aspect_findings=aspect_findings,
            rating_dissonance_ratio=dissonance_ratio,
            authenticity_concern_ratio=auth_concern_ratio,
            extracted_product_defects=extracted_defects,
            dissonant_reviews=dissonant_records,
            executive_review_verdict=verdict
        )

    def _diagnose_defect_cause(self, aspect_id: str, complaints: List[str]) -> str:
        text = " ".join(complaints).lower()
        if aspect_id == "material_durability":
            if "sole" in text or "gum" in text or "paste" in text:
                return "Severe sole detachment / substandard adhesive failure reported within days of usage."
            if "stitch" in text:
                return "Inconsistent or unraveling stitch work indicating non-standard factory stitching."
            return "Poor material resilience and premature wear reported."
        elif aspect_id == "comfort_fit":
            if "bite" in text or "hard" in text:
                return "Rigid insole / collar causing blisters or shoe bite; lacks authentic brand cushioning."
            if "tight" in text or "small" in text or "size" in text:
                return "Non-standard sizing runs noticeably smaller or tighter than official brand size chart."
            return "Sub-par ergonomic support."
        elif aspect_id == "packaging_compliance":
            if "plain" in text or "damaged" in text or "no box" in text:
                return "Delivered in generic unbranded or crushed packaging missing official retail branding."
            return "Packaging anomalies or absent statutory retail tags."
        elif aspect_id == "authenticity_trust":
            return "Direct customer accusations of receiving duplicate / 1st-copy unauthorized merchandise."
        elif aspect_id == "price_value":
            return "Customers report the delivered item does not justify even the discounted price."
        return "Customer reported performance shortcomings."
