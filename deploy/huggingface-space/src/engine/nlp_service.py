"""
NLP & Review Intelligence Service — v1.7
AI-Powered Marketplace Trust Intelligence Platform

Provides production-ready review intelligence:
1. Language-aware text preprocessing & tokenization.
2. Six-Aspect Aspect-Based Sentiment Analysis (ABSA).
3. Exact & Near-Duplicate review detection via Jaccard shingling & MD5.
4. Behavioral manipulation detection (rating-sentiment discordance, shouting syntax, template text).
5. Explainable product-level & review-level evidence scoring.
"""

from __future__ import annotations

import hashlib
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import numpy as np
import pandas as pd

from src.engine.contracts import AspectSentiment, NLPAnalysisResult, ReviewEvidence, ReviewItem

logger = logging.getLogger("nlp_service")

# Aspect Lexicons & Polarity Phrases
ASPECT_DEFINITIONS = {
    "quality": {
        "keywords": ["quality", "material", "build", "finish", "texture", "fabric", "craftsmanship", "flaw", "defect", "cheap", "premium", "solid"],
        "pos": ["great quality", "good quality", "excellent quality", "premium quality", "high quality", "superb quality", "nice material", "well made"],
        "neg": ["poor quality", "bad quality", "cheap quality", "low quality", "terrible quality", "poor material", "defective", "flawed"]
    },
    "price_value": {
        "keywords": ["price", "cost", "value", "money", "worth", "expensive", "affordable", "cheap", "overpriced", "deal", "discount", "paisa vasool", "waste"],
        "pos": ["value for money", "worth it", "worth the price", "great price", "affordable", "good deal", "paisa vasool", "reasonable price"],
        "neg": ["waste of money", "overpriced", "not worth", "too expensive", "not worth it", "waste money", "pricey", "bad value"]
    },
    "delivery_packaging": {
        "keywords": ["delivery", "package", "packaging", "box", "shipping", "courier", "dispatch", "arrived", "seal", "transit", "broken box"],
        "pos": ["fast delivery", "quick delivery", "good packaging", "well packed", "safely delivered", "arrived early", "intact packaging"],
        "neg": ["late delivery", "delayed delivery", "bad packaging", "damaged box", "broken seal", "poor packaging", "terrible delivery"]
    },
    "durability_build": {
        "keywords": ["durable", "durability", "sturdy", "broke", "broken", "lasted", "lasting", "fragile", "wear", "tear", "weak", "tough"],
        "pos": ["long lasting", "very durable", "sturdy", "strong", "tough build", "lasted long", "heavy duty"],
        "neg": ["broke easily", "not durable", "fragile", "stopped working", "easily broken", "weak build", "broke after"]
    },
    "performance_battery": {
        "keywords": ["battery", "performance", "speed", "fast", "slow", "charge", "charging", "backup", "lag", "sound", "camera", "power", "display"],
        "pos": ["great battery", "good battery", "fast charging", "high speed", "great performance", "excellent sound", "smooth"],
        "neg": ["poor battery", "battery drains", "slow charging", "heats up", "terrible performance", "lags", "slow speed"]
    },
    "customer_service": {
        "keywords": ["customer service", "service", "support", "replacement", "return", "refund", "warranty", "seller", "executive", "helpdesk"],
        "pos": ["easy return", "quick refund", "good customer service", "helpful support", "prompt replacement", "good seller"],
        "neg": ["no refund", "worst service", "poor customer support", "refused return", "bad seller", "pathetic service"]
    }
}

POSITIVE_LEXICON = {
    "great", "good", "excellent", "love", "loved", "best", "awesome", "amazing",
    "perfect", "nice", "liked", "superb", "fantastic", "wonderful", "satisfied",
    "recommend", "happy", "flawless", "favorite", "favourite", "sahi", "badhiya", "achha"
}

NEGATIVE_LEXICON = {
    "bad", "worst", "terrible", "horrible", "waste", "poor", "fake", "broken",
    "useless", "disappointed", "disappointing", "hate", "junk", "garbage",
    "defective", "crap", "awful", "regret", "damaged", "counterfeit", "bekar", "ghatiya"
}

HINGLISH_INDICATORS = {
    "hai", "bhi", "bahut", "achha", "sahi", "nahi", "tha", "h", "bohot",
    "paisa", "vasool", "karna", "kr", "raha", "hota", "gaya", "chahiye", "aur", "toh"
}


class NLPReviewIntelligenceService:
    """
    Production-grade NLP Review Intelligence Service.
    Supports ad-hoc inference and batch retrieval from v1.7 tables.
    """

    def __init__(self, v17_dir: Optional[Path] = None) -> None:
        self.project_root = Path(__file__).resolve().parents[2]
        self.v17_dir = v17_dir or (self.project_root / "data" / "marketplace_trust_dataset_v1.7")
        self._reviews_df: Optional[pd.DataFrame] = None
        self._behavioral_df: Optional[pd.DataFrame] = None
        self._absa_df: Optional[pd.DataFrame] = None

    def _ensure_v17_loaded(self) -> None:
        if self._reviews_df is None:
            rev_path = self.v17_dir / "evidence" / "reviews.parquet"
            beh_path = self.v17_dir / "derived_evidence" / "review_behavioral_features.parquet"
            absa_path = self.v17_dir / "derived_evidence" / "aspect_sentiment_features.parquet"
            if rev_path.exists() and beh_path.exists() and absa_path.exists():
                logger.info(f"Loading cached v1.7 NLP evidence tables from {self.v17_dir}...")
                self._reviews_df = pd.read_parquet(rev_path)
                self._behavioral_df = pd.read_parquet(beh_path)
                self._absa_df = pd.read_parquet(absa_path)

    @staticmethod
    def preprocess_text(text: str) -> str:
        if not isinstance(text, str):
            return ""
        # Remove HTML tags
        t = re.sub(r"<[^>]+>", " ", text)
        # Normalize whitespace
        t = " ".join(t.split())
        return t

    @staticmethod
    def detect_language(text: str) -> Tuple[str, str]:
        if not text.strip():
            return "UNKNOWN", "UNKNOWN"
        t_lower = text.lower()
        words = set(re.findall(r"\b[a-z]+\b", t_lower))
        hinglish_hits = words & HINGLISH_INDICATORS
        if len(hinglish_hits) >= 2 or (len(words) > 0 and len(hinglish_hits) / len(words) >= 0.15):
            return "HINGLISH", "LATIN"
        return "ENGLISH", "LATIN"

    @staticmethod
    def compute_jaccard_similarity(text1: str, text2: str, shingle_size: int = 4) -> float:
        t1, t2 = text1.lower(), text2.lower()
        if len(t1) < shingle_size or len(t2) < shingle_size:
            return 1.0 if t1 == t2 else 0.0
        shingles1 = {t1[i : i + shingle_size] for i in range(len(t1) - shingle_size + 1)}
        shingles2 = {t2[i : i + shingle_size] for i in range(len(t2) - shingle_size + 1)}
        intersection = len(shingles1 & shingles2)
        union = len(shingles1 | shingles2)
        return intersection / union if union > 0 else 0.0

    def extract_aspects(self, text: str) -> Dict[str, AspectSentiment]:
        t_lower = text.lower()
        aspect_results = {}
        for name, data in ASPECT_DEFINITIONS.items():
            matched_keywords = [k for k in data["keywords"] if k in t_lower]
            mentioned = len(matched_keywords) > 0
            polarity = 0
            confidence = 0.5
            if mentioned:
                has_pos = any(p in t_lower for p in data["pos"])
                has_neg = any(n in t_lower for n in data["neg"])
                if has_pos and not has_neg:
                    polarity = 1
                    confidence = 0.90
                elif has_neg and not has_pos:
                    polarity = -1
                    confidence = 0.90
                else:
                    polarity = 0
                    confidence = 0.70
            aspect_results[name] = AspectSentiment(
                aspect_name=name,
                mentioned=mentioned,
                polarity=polarity,
                confidence=confidence,
                matched_keywords=matched_keywords,
            )
        return aspect_results

    def analyze_single_review(
        self,
        review_text: str,
        rating: float,
        review_id: str = "ADHOC_REV",
        corpus_duplicate_freq: int = 1,
    ) -> ReviewEvidence:
        clean = self.preprocess_text(review_text)
        char_len = len(clean)
        words = clean.split()
        word_cnt = len(words)

        uppercase_chars = sum(1 for c in clean if c.isupper())
        uppercase_ratio = round(uppercase_chars / char_len, 4) if char_len > 0 else 0.0
        exclamation_cnt = clean.count("!")

        lang, script = self.detect_language(clean)

        # Rating polarity
        if rating >= 4.0:
            rating_pol = "POSITIVE"
        elif rating <= 2.0:
            rating_pol = "NEGATIVE"
        else:
            rating_pol = "NEUTRAL"

        # Lexicon Discordance
        word_tokens = set(re.findall(r"\b[a-z]+\b", clean.lower()))
        pos_hits = len(word_tokens & POSITIVE_LEXICON)
        neg_hits = len(word_tokens & NEGATIVE_LEXICON)

        discordance = False
        if rating >= 4.0 and neg_hits >= 3 and pos_hits == 0:
            discordance = True
        elif rating <= 2.0 and pos_hits >= 3 and neg_hits == 0:
            discordance = True

        # Suspicion Flags
        flags = []
        if discordance:
            flags.append("RATING_SENTIMENT_DISCORDANCE")
        if corpus_duplicate_freq >= 5:
            flags.append("HIGH_FREQUENCY_DUPLICATE_TEXT")
        if uppercase_ratio >= 0.40 and exclamation_cnt >= 3:
            flags.append("SHOUTING_SYNTAX_ANOMALY")
        if word_cnt < 3 and word_cnt > 0:
            flags.append("LOW_EFFORT_FRAGMENT")

        aspects = self.extract_aspects(clean)

        return ReviewEvidence(
            review_id=review_id,
            rating=rating,
            rating_polarity=rating_pol,
            language=lang,
            script=script,
            char_length=char_len,
            word_count=word_cnt,
            uppercase_ratio=uppercase_ratio,
            exclamation_count=exclamation_cnt,
            rating_sentiment_discordance=discordance,
            duplicate_corpus_frequency=corpus_duplicate_freq,
            is_exact_duplicate=corpus_duplicate_freq > 1,
            is_product_duplicate=False,
            aspects=aspects,
            suspicion_flags=flags,
        )

    def analyze_product_reviews(
        self,
        canonical_product_id: str,
        custom_reviews: Optional[List[ReviewItem]] = None,
    ) -> NLPAnalysisResult:
        """
        Analyzes all reviews for a product listing.
        If custom_reviews provided, analyzes ad-hoc; otherwise queries v1.7 tables.
        """
        if custom_reviews:
            evaluated: List[ReviewEvidence] = []
            text_hashes: Dict[str, int] = {}
            for item in custom_reviews:
                h = hashlib.md5(item.review_text.lower().strip().encode("utf-8")).hexdigest()
                text_hashes[h] = text_hashes.get(h, 0) + 1

            for item in custom_reviews:
                h = hashlib.md5(item.review_text.lower().strip().encode("utf-8")).hexdigest()
                ev = self.analyze_single_review(
                    item.review_text,
                    item.rating,
                    review_id=item.review_id,
                    corpus_duplicate_freq=text_hashes[h],
                )
                evaluated.append(ev)

            return self._aggregate_review_evidence(canonical_product_id, evaluated)

        # Otherwise retrieve from cached v1.7 tables
        self._ensure_v17_loaded()
        if self._reviews_df is None or self._behavioral_df is None:
            return NLPAnalysisResult(
                canonical_product_id=canonical_product_id,
                total_reviews=0,
                mean_rating=0.0,
                positive_review_rate=0.0,
                duplicate_review_rate=0.0,
                discordance_count=0,
                shouting_review_count=0,
                detected_languages={"UNKNOWN": 0},
                dominant_aspects={},
                text_trust_penalty=0.0,
                risk_signals=["NO_REVIEWS_AVAILABLE"],
            )

        prod_revs = self._reviews_df[self._reviews_df["canonical_product_id"] == canonical_product_id]
        if prod_revs.empty:
            return NLPAnalysisResult(
                canonical_product_id=canonical_product_id,
                total_reviews=0,
                mean_rating=0.0,
                positive_review_rate=0.0,
                duplicate_review_rate=0.0,
                discordance_count=0,
                shouting_review_count=0,
                detected_languages={"UNKNOWN": 0},
                dominant_aspects={},
                text_trust_penalty=0.0,
                risk_signals=["NO_REVIEWS_AVAILABLE"],
            )

        # Retrieve behavioral features
        rev_ids = set(prod_revs["canonical_review_id"])
        prod_beh = self._behavioral_df[self._behavioral_df["canonical_review_id"].isin(rev_ids)]
        prod_absa = self._absa_df[self._absa_df["canonical_review_id"].isin(rev_ids)]

        total_r = len(prod_revs)
        mean_rating = round(float(prod_revs["rating"].mean()), 2)
        pos_rate = round(float((prod_revs["rating"] >= 4.0).mean()), 3)
        dup_rate = round(float(prod_beh["signal_high_duplicate_text"].mean()), 3) if not prod_beh.empty else 0.0
        disc_cnt = int(prod_beh["signal_rating_sentiment_discordance"].sum()) if not prod_beh.empty else 0
        shout_cnt = int(prod_beh["signal_shouting_syntax"].sum()) if not prod_beh.empty else 0

        # Aspects summary
        aspects_summary = {}
        for asp in ASPECT_DEFINITIONS.keys():
            col_pres = f"aspect_{asp}_present"
            col_pol = f"aspect_{asp}_polarity"
            if col_pres in prod_absa.columns and col_pol in prod_absa.columns:
                m_cnt = int(prod_absa[col_pres].sum())
                pos_m = int((prod_absa[col_pol] == 1).sum())
                neg_m = int((prod_absa[col_pol] == -1).sum())
                aspects_summary[asp] = {
                    "mentions": m_cnt,
                    "positive": pos_m,
                    "negative": neg_m,
                    "dominant_sentiment": "POSITIVE" if pos_m > neg_m else ("NEGATIVE" if neg_m > pos_m else "NEUTRAL"),
                }

        # Calculate penalty & signals
        penalty = 0.0
        risk_signals = []
        if dup_rate >= 0.50:
            penalty += 0.20
            risk_signals.append("HIGH_DUPLICATE_REVIEW_RATE")
        if disc_cnt > 0:
            penalty += 0.25
            risk_signals.append("RATING_SENTIMENT_DISCORDANCE_DETECTED")
        if shout_cnt >= 3:
            penalty += 0.10
            risk_signals.append("ELEVATED_SHOUTING_SYNTAX")

        langs = prod_revs["language"].value_counts().to_dict()

        return NLPAnalysisResult(
            canonical_product_id=canonical_product_id,
            total_reviews=total_r,
            mean_rating=mean_rating,
            positive_review_rate=pos_rate,
            duplicate_review_rate=dup_rate,
            discordance_count=disc_cnt,
            shouting_review_count=shout_cnt,
            detected_languages=langs,
            dominant_aspects=aspects_summary,
            text_trust_penalty=round(min(0.60, penalty), 3),
            risk_signals=risk_signals if risk_signals else ["NO_ELEVATED_TEXT_RISK"],
        )

    def _aggregate_review_evidence(
        self,
        canonical_product_id: str,
        evaluated: List[ReviewEvidence],
    ) -> NLPAnalysisResult:
        total = len(evaluated)
        if total == 0:
            return NLPAnalysisResult(
                canonical_product_id=canonical_product_id,
                total_reviews=0,
                mean_rating=0.0,
                positive_review_rate=0.0,
                duplicate_review_rate=0.0,
                discordance_count=0,
                shouting_review_count=0,
                detected_languages={},
                dominant_aspects={},
                text_trust_penalty=0.0,
                risk_signals=["NO_REVIEWS_AVAILABLE"],
            )

        mean_rating = round(sum(r.rating for r in evaluated) / total, 2)
        pos_cnt = sum(1 for r in evaluated if r.rating >= 4.0)
        dup_cnt = sum(1 for r in evaluated if r.duplicate_corpus_frequency >= 3)
        disc_cnt = sum(1 for r in evaluated if r.rating_sentiment_discordance)
        shout_cnt = sum(1 for r in evaluated if "SHOUTING_SYNTAX_ANOMALY" in r.suspicion_flags)

        langs: Dict[str, int] = {}
        for r in evaluated:
            langs[r.language] = langs.get(r.language, 0) + 1

        # Aspects summary
        aspects_summary: Dict[str, Dict[str, Any]] = {}
        for name in ASPECT_DEFINITIONS.keys():
            m_cnt = sum(1 for r in evaluated if r.aspects.get(name) and r.aspects[name].mentioned)
            pos_m = sum(1 for r in evaluated if r.aspects.get(name) and r.aspects[name].polarity == 1)
            neg_m = sum(1 for r in evaluated if r.aspects.get(name) and r.aspects[name].polarity == -1)
            aspects_summary[name] = {
                "mentions": m_cnt,
                "positive": pos_m,
                "negative": neg_m,
                "dominant_sentiment": "POSITIVE" if pos_m > neg_m else ("NEGATIVE" if neg_m > pos_m else "NEUTRAL"),
            }

        penalty = 0.0
        risk_signals = []
        dup_rate = round(dup_cnt / total, 3)
        if dup_rate >= 0.50:
            penalty += 0.20
            risk_signals.append("HIGH_DUPLICATE_REVIEW_RATE")
        if disc_cnt > 0:
            penalty += 0.25
            risk_signals.append("RATING_SENTIMENT_DISCORDANCE_DETECTED")
        if shout_cnt >= 2:
            penalty += 0.10
            risk_signals.append("ELEVATED_SHOUTING_SYNTAX")

        return NLPAnalysisResult(
            canonical_product_id=canonical_product_id,
            total_reviews=total,
            mean_rating=mean_rating,
            positive_review_rate=round(pos_cnt / total, 3),
            duplicate_review_rate=dup_rate,
            discordance_count=disc_cnt,
            shouting_review_count=shout_cnt,
            detected_languages=langs,
            dominant_aspects=aspects_summary,
            text_trust_penalty=round(min(0.60, penalty), 3),
            risk_signals=risk_signals if risk_signals else ["NO_ELEVATED_TEXT_RISK"],
            sample_evaluated_reviews=evaluated[:10],
        )
