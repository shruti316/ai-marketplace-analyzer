"""
Review NLP Intelligence Pipeline
AI-Powered Indian Marketplace Trust Intelligence Platform

Provides comprehensive NLP feature extraction, text quality auditing,
language/script detection, explainable sentiment and rating discordance,
aspect-based sentiment analysis (ABSA), and review manipulation signal detection.
"""

from collections import defaultdict
import datetime
import hashlib
import json
import logging
from pathlib import Path
import re
from typing import Any, Dict, List, Optional, Set, Tuple
import unicodedata

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger("ReviewIntelligence")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class ReviewTextProcessor:
    """Preprocesses and extracts structural text metrics from e-commerce reviews."""

    @staticmethod
    def normalize_text(text: Optional[str]) -> str:
        """Converts text to lowercase, normalizes unicode, removes excess whitespace."""
        if text is None or not isinstance(text, str):
            return ""
        norm = unicodedata.normalize("NFKC", text).lower()
        norm = re.sub(r"[\r\n\t]+", " ", norm)
        norm = re.sub(r"\s+", " ", norm).strip()
        return norm

    @staticmethod
    def extract_tokens(text: str) -> List[str]:
        """Extracts word tokens using standard alphanumeric regex."""
        if not text:
            return []
        return re.findall(r"\b\w+\b", text.lower())

    @classmethod
    def compute_text_stats(cls, raw_text: Optional[str]) -> Dict[str, Any]:
        """Computes length and token distribution metrics."""
        raw = raw_text if (raw_text is not None and isinstance(raw_text, str)) else ""
        norm = cls.normalize_text(raw)
        tokens = cls.extract_tokens(norm)

        char_len = len(raw)
        word_count = len(tokens)
        avg_word_len = float(np.mean([len(t) for t in tokens])) if tokens else 0.0

        num_digits = sum(c.isdigit() for c in raw)
        num_caps = sum(c.isupper() for c in raw)
        capital_ratio = float(num_caps / char_len) if char_len > 0 else 0.0

        return {
            "review_text_normalized": norm,
            "char_length": char_len,
            "word_count": word_count,
            "avg_word_length": round(avg_word_len, 2),
            "capital_ratio": round(capital_ratio, 3),
            "is_empty": (word_count == 0),
        }


class LanguageAndScriptDetector:
    """Identifies script, language, and code-mixed Hinglish in Indian marketplace reviews."""

    INDIC_SCRIPTS = {
        "Devanagari": (0x0900, 0x097F),
        "Bengali": (0x0980, 0x09FF),
        "Gurmukhi": (0x0A00, 0x0A7F),
        "Gujarati": (0x0A80, 0x0AFF),
        "Oriya": (0x0B00, 0x0B7F),
        "Tamil": (0x0B80, 0x0BFF),
        "Telugu": (0x0C00, 0x0C7F),
        "Kannada": (0x0C80, 0x0CFF),
        "Malayalam": (0x0D00, 0x0D7F),
    }

    # Common transliterated Hindi / Hinglish marketplace terms
    HINGLISH_LEXICON: Set[str] = {
        "acha", "achha", "achhi", "achhe", "bura", "kharab", "bekar", "bakwas",
        "sahi", "badhiya", "mast", "lajawab", "paisa", "vasool", "dhokha", "nakli",
        "asli", "sasta", "mehenga", "bahut", "bhai", "kripya", "yaar", "lelo",
        "mat", "lena", "chindi", "ganda", "shandar", "thik", "theek", "khoob",
        "chalega", "nahi", "nahin", "hota", "karo", "liya", "mil", "gaya", "aaya"
    }

    @classmethod
    def detect_script(cls, text: str) -> Tuple[str, float]:
        """Detects the dominant script in the string based on character frequencies."""
        if not text:
            return "Unknown", 0.0

        script_counts: Dict[str, int] = defaultdict(int)
        total_letters = 0

        for char in text:
            if not char.isalpha():
                continue
            total_letters += 1
            cp = ord(char)
            found_script = False
            for sname, (sstart, send) in cls.INDIC_SCRIPTS.items():
                if sstart <= cp <= send:
                    script_counts[sname] += 1
                    found_script = True
                    break
            if not found_script:
                if (0x0041 <= cp <= 0x005A) or (0x0061 <= cp <= 0x007A) or (0x00C0 <= cp <= 0x024F):
                    script_counts["Latin"] += 1
                else:
                    script_counts["Other"] += 1

        if total_letters == 0:
            return "Latin", 0.50

        dominant_script = max(script_counts.items(), key=lambda x: x[1])
        confidence = float(dominant_script[1] / total_letters)
        return dominant_script[0], round(confidence, 3)

    @classmethod
    def identify_language(cls, text: str) -> Dict[str, Any]:
        """Identifies language with support for English, Hindi, and Hinglish."""
        norm = ReviewTextProcessor.normalize_text(text)
        script, script_conf = cls.detect_script(norm)
        tokens = ReviewTextProcessor.extract_tokens(norm)

        if not tokens:
            return {
                "detected_language": "en",
                "detected_script": "Latin",
                "language_confidence": 0.50,
                "is_code_mixed": False,
                "is_language_uncertain": True,
            }

        if script == "Devanagari":
            return {
                "detected_language": "hi",
                "detected_script": "Devanagari",
                "language_confidence": max(0.85, script_conf),
                "is_code_mixed": False,
                "is_language_uncertain": False,
            }
        elif script in cls.INDIC_SCRIPTS:
            return {
                "detected_language": script.lower(),
                "detected_script": script,
                "language_confidence": script_conf,
                "is_code_mixed": False,
                "is_language_uncertain": False,
            }

        # For Latin script: test for code-mixed Hinglish
        hinglish_hits = sum(1 for t in tokens if t in cls.HINGLISH_LEXICON)
        hinglish_ratio = float(hinglish_hits / len(tokens))

        if hinglish_hits >= 2 or (len(tokens) <= 5 and hinglish_hits >= 1):
            return {
                "detected_language": "hi-en",
                "detected_script": "Latin",
                "language_confidence": min(0.95, round(0.60 + hinglish_ratio * 0.40, 2)),
                "is_code_mixed": True,
                "is_language_uncertain": False,
            }

        # Otherwise English baseline
        conf = 0.95 if len(tokens) >= 5 else 0.75
        return {
            "detected_language": "en",
            "detected_script": "Latin",
            "language_confidence": conf,
            "is_code_mixed": False,
            "is_language_uncertain": (len(tokens) < 3),
        }


class ExplainableSentimentAnalyzer:
    """Computes sentiment score, confidence, and rating discordance without black-box drift."""

    POSITIVE_WORDS: Dict[str, float] = {
        "excellent": 1.0, "superb": 1.0, "awesome": 0.9, "amazing": 0.9, "loved": 0.85,
        "great": 0.8, "perfect": 0.9, "best": 0.85, "good": 0.6, "nice": 0.5,
        "happy": 0.7, "satisfied": 0.75, "genuine": 0.8, "original": 0.85, "authentic": 0.85,
        "worth": 0.75, "value": 0.7, "fast": 0.6, "recommend": 0.8, "comfortable": 0.75,
        "durable": 0.8, "beautiful": 0.8, "flawless": 0.95, "badhiya": 0.85, "mast": 0.8,
        "shandar": 0.9, "vasool": 0.8
    }

    NEGATIVE_WORDS: Dict[str, float] = {
        "worst": -1.0, "horrible": -1.0, "terrible": -0.95, "pathetic": -0.95, "fake": -0.9,
        "counterfeit": -1.0, "duplicate": -0.85, "broken": -0.85, "damaged": -0.85, "defective": -0.9,
        "poor": -0.75, "bad": -0.7, "cheap": -0.6, "waste": -0.9, "useless": -0.85,
        "disappointed": -0.8, "dont buy": -0.9, "never buy": -0.95, "cheat": -0.95,
        "fraud": -0.95, "scam": -0.95, "bakwas": -0.9, "kharab": -0.8, "bekar": -0.8,
        "dhokha": -0.95, "chindi": -0.7, "torn": -0.8, "delayed": -0.6, "loose": -0.4
    }

    NEGATORS: Set[str] = {
        "not", "no", "never", "hardly", "barely", "scarcely", "without", "neither", "nor", "nahi", "nahin", "mat"
    }

    INTENSIFIERS: Dict[str, float] = {
        "very": 1.3, "extremely": 1.5, "really": 1.25, "super": 1.3, "highly": 1.3, "too": 1.2, "bahut": 1.3
    }

    @classmethod
    def analyze_sentiment(cls, text: str) -> Dict[str, Any]:
        """Calculates bounded continuous sentiment [-1, 1], polarity, and confidence."""
        norm = ReviewTextProcessor.normalize_text(text)
        tokens = ReviewTextProcessor.extract_tokens(norm)

        if not tokens:
            return {
                "sentiment_score": 0.0,
                "sentiment_polarity": "NEUTRAL",
                "sentiment_confidence": 0.50,
                "sentiment_word_count": 0,
            }

        scores: List[float] = []
        n = len(tokens)

        for i, token in enumerate(tokens):
            w_score = 0.0
            if token in cls.POSITIVE_WORDS:
                w_score = cls.POSITIVE_WORDS[token]
            elif token in cls.NEGATIVE_WORDS:
                w_score = cls.NEGATIVE_WORDS[token]

            if w_score != 0.0:
                # Check for preceding negator (within 2 tokens)
                is_negated = False
                multiplier = 1.0
                for back in range(max(0, i - 2), i):
                    prev = tokens[back]
                    if prev in cls.NEGATORS:
                        is_negated = True
                    elif prev in cls.INTENSIFIERS:
                        multiplier *= cls.INTENSIFIERS[prev]

                if is_negated:
                    w_score = -w_score * 0.85

                scores.append(w_score * multiplier)

        if not scores:
            return {
                "sentiment_score": 0.0,
                "sentiment_polarity": "NEUTRAL",
                "sentiment_confidence": 0.60,
                "sentiment_word_count": 0,
            }

        raw_sentiment = float(np.mean(scores))
        clipped_sentiment = max(-1.0, min(1.0, raw_sentiment))

        if clipped_sentiment > 0.15:
            polarity = "POSITIVE"
        elif clipped_sentiment < -0.15:
            polarity = "NEGATIVE"
        else:
            polarity = "NEUTRAL"

        confidence = min(0.95, round(0.65 + 0.06 * len(scores), 2))

        return {
            "sentiment_score": round(clipped_sentiment, 3),
            "sentiment_polarity": polarity,
            "sentiment_confidence": confidence,
            "sentiment_word_count": len(scores),
        }

    @staticmethod
    def compute_discordance(rating: Optional[float], sentiment_score: float) -> Tuple[float, bool]:
        """
        Calculates discordance between normalized rating and sentiment score.
        rating in [1.0, 5.0] -> norm_rating in [0.0, 1.0]
        sentiment in [-1.0, 1.0] -> norm_sentiment in [0.0, 1.0]
        Discordance is absolute difference |r_norm - s_norm|.
        """
        if rating is None or np.isnan(rating):
            return 0.0, False

        r_norm = (float(rating) - 1.0) / 4.0
        s_norm = (float(sentiment_score) + 1.0) / 2.0
        discordance = abs(r_norm - s_norm)
        is_discordant = (discordance >= 0.50)

        return round(discordance, 3), is_discordant


class AspectBasedSentimentAnalyzer:
    """Extracts sentiment and supporting evidence spans across 6 e-commerce domains."""

    ASPECT_KEYWORDS = {
        "quality": [
            "quality", "fabric", "material", "durab", "stitch", "finish",
            "cloth", "fitting", "comfort", "build", "defect", "torn", "damage"
        ],
        "authenticity": [
            "original", "fake", "copy", "first copy", "authentic", "genuine",
            "counterfeit", "real", "duplicate", "asli", "nakli"
        ],
        "delivery": [
            "delivery", "courier", "dispatch", "late", "delay", "fast",
            "speed", "ekart", "bluedart", "shipped", "arrived"
        ],
        "packaging": [
            "packag", "packing", "box", "bubble", "seal", "sealed",
            "tamper", "damaged box", "torn pack"
        ],
        "customer_service": [
            "customer service", "support", "return", "replacement",
            "refund", "seller", "executive", "helpdesk"
        ],
        "value_for_money": [
            "price", "worth", "value", "costly", "expensive", "cheap",
            "paisa vasool", "pocket friendly", "overpriced", "budget"
        ],
    }

    PRODUCT_EXPERIENCE_ASPECTS = {"quality", "authenticity", "value_for_money"}
    SELLER_LOGISTICS_ASPECTS = {"delivery", "packaging", "customer_service"}

    @classmethod
    def analyze_aspects(cls, text: str) -> Dict[str, Dict[str, Any]]:
        """Extracts presence, polarity, evidence span, and confidence for all 6 aspects."""
        norm = ReviewTextProcessor.normalize_text(text)
        sentences = [s.strip() for s in re.split(r"[.!?;\n]+", norm) if s.strip()]
        if not sentences and norm:
            sentences = [norm]

        results: Dict[str, Dict[str, Any]] = {}

        for aspect, keywords in cls.ASPECT_KEYWORDS.items():
            matching_spans: List[str] = []
            aspect_scores: List[float] = []

            for s in sentences:
                for kw in keywords:
                    if re.search(r"\b" + re.escape(kw), s):
                        matching_spans.append(s)
                        sent_res = ExplainableSentimentAnalyzer.analyze_sentiment(s)
                        aspect_scores.append(sent_res["sentiment_score"])
                        break

            if matching_spans:
                mean_score = float(np.mean(aspect_scores)) if aspect_scores else 0.0
                if mean_score > 0.15:
                    polarity = "POSITIVE"
                elif mean_score < -0.15:
                    polarity = "NEGATIVE"
                else:
                    polarity = "NEUTRAL"

                exp_type = "PRODUCT_EXPERIENCE" if aspect in cls.PRODUCT_EXPERIENCE_ASPECTS else "SELLER_LOGISTICS_EXPERIENCE"

                results[aspect] = {
                    "present": True,
                    "polarity": polarity,
                    "polarity_score": round(mean_score, 3),
                    "supporting_span": matching_spans[0][:200],
                    "span_count": len(matching_spans),
                    "confidence": min(0.95, round(0.70 + 0.10 * len(matching_spans), 2)),
                    "experience_type": exp_type,
                    "extraction_method": "LEXICAL_KEYWORD_SPAN_RULE_EXTRACTOR",
                }
            else:
                results[aspect] = {
                    "present": False,
                    "polarity": "NOT_MENTIONED",
                    "polarity_score": 0.0,
                    "supporting_span": None,
                    "span_count": 0,
                    "confidence": 0.0,
                    "experience_type": "PRODUCT_EXPERIENCE" if aspect in cls.PRODUCT_EXPERIENCE_ASPECTS else "SELLER_LOGISTICS_EXPERIENCE",
                    "extraction_method": "LEXICAL_KEYWORD_SPAN_RULE_EXTRACTOR",
                }

        return results


class ReviewManipulationDetector:
    """Identifies explainable manipulation and anomaly signals in reviews."""

    @classmethod
    def detect_exact_duplicates(cls, reviews_df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """Clusters exact text duplicates using MD5 hashes of normalized text."""
        norm_texts = reviews_df["review_text"].apply(ReviewTextProcessor.normalize_text)
        hashes = norm_texts.apply(lambda t: hashlib.md5(t.encode("utf-8")).hexdigest() if t else "")

        temp = pd.DataFrame({
            "review_id": reviews_df["review_id"],
            "canonical_product_id": reviews_df["canonical_product_id"],
            "hash": hashes,
            "norm_text": norm_texts,
        })

        # Group by hash where text is non-empty
        valid = temp[temp["norm_text"] != ""]
        hash_counts = valid["hash"].value_counts()
        dup_hashes = set(hash_counts[hash_counts > 1].index)

        dup_clusters = []
        cluster_map = {}
        cluster_size_map = {}

        for cid, (h, group) in enumerate(valid[valid["hash"].isin(dup_hashes)].groupby("hash")):
            cluster_id = f"rev_dup_cluster_{cid:05d}"
            r_ids = group["review_id"].tolist()
            p_ids = group["canonical_product_id"].unique().tolist()
            sample_text = group["norm_text"].iloc[0][:150]

            for rid in r_ids:
                cluster_map[rid] = cluster_id
                cluster_size_map[rid] = len(r_ids)

            dup_clusters.append({
                "cluster_id": cluster_id,
                "cluster_type": "EXACT_TEXT_MATCH",
                "member_count": len(r_ids),
                "unique_product_count": len(p_ids),
                "is_cross_product": (len(p_ids) > 1),
                "sample_text": sample_text,
                "text_hash": h,
            })

        clusters_df = pd.DataFrame(dup_clusters)
        return cluster_map, cluster_size_map, clusters_df

    @staticmethod
    def is_valid_date(val: Any) -> bool:
        """Validates that a date value is non-null, not 'None', and matches YYYY-MM-DD format."""
        if val is None or pd.isna(val):
            return False
        s = str(val).strip()
        if s in ("None", "", "nan", "null", "N/A", "NaT"):
            return False
        return bool(re.match(r"^\d{4}-\d{2}-\d{2}", s))

    @classmethod
    def detect_temporal_bursts(cls, reviews_df: pd.DataFrame, burst_threshold: int = 3) -> Tuple[Dict[str, str], Dict[str, str]]:
        """
        Detects date bursts where multiple reviews appear on the same product in a single date.
        Reviews with missing or invalid timestamps ('None', null) are marked as TEMPORAL_DATA_UNAVAILABLE
        and strictly excluded from temporal burst false positives.
        """
        burst_map = {}
        status_map = {}
        if "review_date" not in reviews_df.columns:
            return burst_map, {str(r): "TEMPORAL_DATA_UNAVAILABLE" for r in reviews_df["review_id"]}

        for rid, rdate in zip(reviews_df["review_id"], reviews_df["review_date"]):
            status_map[str(rid)] = "TEMPORAL_DATA_AVAILABLE" if cls.is_valid_date(rdate) else "TEMPORAL_DATA_UNAVAILABLE"

        valid_mask = reviews_df["review_date"].apply(cls.is_valid_date)
        valid = reviews_df[valid_mask].copy()

        if valid.empty:
            return burst_map, status_map

        grouped = valid.groupby(["canonical_product_id", "review_date"])
        burst_idx = 0
        for (pid, rdate), grp in grouped:
            if len(grp) >= burst_threshold:
                burst_id = f"burst_{pid}_{rdate}_{burst_idx:03d}"
                burst_idx += 1
                for rid in grp["review_id"]:
                    burst_map[str(rid)] = burst_id

        return burst_map, status_map


class ReviewNLPIntelligenceEngine:
    """Master orchestrator for Review NLP Intelligence."""

    def __init__(self, reviews_df: pd.DataFrame):
        self.reviews_df = reviews_df.copy()

    def run_pipeline(self) -> Tuple[pd.DataFrame, pd.DataFrame, Dict[str, Any]]:
        """Executes full NLP intelligence pipeline and returns feature DataFrame, cluster DataFrame, and summary."""
        df = self.reviews_df
        logger.info(f"Starting Review NLP Pipeline on {len(df)} reviews...")

        # 1. Exact Duplicate Clustering
        cluster_map, cluster_size_map, clusters_df = ReviewManipulationDetector.detect_exact_duplicates(df)
        logger.info(f"Found {len(clusters_df)} exact duplicate clusters spanning {len(cluster_map)} reviews.")

        # 2. Temporal Bursts
        burst_map, burst_status_map = ReviewManipulationDetector.detect_temporal_bursts(df)
        logger.info(f"Identified {len(set(burst_map.values()))} temporal burst clusters spanning {len(burst_map)} reviews.")

        records = []
        for idx, row in df.iterrows():
            rid = str(row["review_id"])
            pid = str(row["canonical_product_id"])
            raw_text = row.get("review_text", "")
            rating = float(row["rating"]) if pd.notna(row.get("rating")) else None

            # Text processing
            tstats = ReviewTextProcessor.compute_text_stats(raw_text)

            # Language / script
            lang_info = LanguageAndScriptDetector.identify_language(tstats["review_text_normalized"])

            # Sentiment
            sent_info = ExplainableSentimentAnalyzer.analyze_sentiment(tstats["review_text_normalized"])

            # Discordance
            disc_score, is_disc = ExplainableSentimentAnalyzer.compute_discordance(rating, sent_info["sentiment_score"])

            # ABSA
            aspects = AspectBasedSentimentAnalyzer.analyze_aspects(tstats["review_text_normalized"])

            # Manipulation / Duplicate features
            is_dup = (rid in cluster_map)
            dup_cid = cluster_map.get(rid, None)
            dup_size = cluster_size_map.get(rid, 1)

            burst_cid = burst_map.get(rid, None)
            is_burst = (burst_cid is not None)
            temporal_status = burst_status_map.get(rid, "TEMPORAL_DATA_UNAVAILABLE")

            # Review length anomaly: word count <= 2
            is_len_anomaly = (tstats["word_count"] <= 2 and not tstats["is_empty"])

            # Explainable manipulation signal flags
            review_similarity_signal = is_dup and (dup_size >= 3)
            review_burst_signal = is_burst
            rating_discordance_signal = is_disc
            review_length_anomaly_signal = is_len_anomaly

            rec = {
                "review_id": rid,
                "canonical_product_id": pid,
                "rating": rating,
                "review_text_normalized": tstats["review_text_normalized"],
                "char_length": tstats["char_length"],
                "word_count": tstats["word_count"],
                "avg_word_length": tstats["avg_word_length"],
                "capital_ratio": tstats["capital_ratio"],
                "is_empty": tstats["is_empty"],
                "detected_language": lang_info["detected_language"],
                "detected_script": lang_info["detected_script"],
                "language_confidence": lang_info["language_confidence"],
                "is_code_mixed": lang_info["is_code_mixed"],
                "is_language_uncertain": lang_info["is_language_uncertain"],
                "sentiment_score": sent_info["sentiment_score"],
                "sentiment_polarity": sent_info["sentiment_polarity"],
                "sentiment_confidence": sent_info["sentiment_confidence"],
                "sentiment_word_count": sent_info["sentiment_word_count"],
                "rating_discordance_score": disc_score,
                "is_rating_discordant": is_disc,
                # ABSA features
                "aspect_quality_present": aspects["quality"]["present"],
                "aspect_quality_polarity": aspects["quality"]["polarity"],
                "aspect_quality_score": aspects["quality"]["polarity_score"],
                "aspect_quality_span": aspects["quality"]["supporting_span"],
                "aspect_authenticity_present": aspects["authenticity"]["present"],
                "aspect_authenticity_polarity": aspects["authenticity"]["polarity"],
                "aspect_authenticity_score": aspects["authenticity"]["polarity_score"],
                "aspect_authenticity_span": aspects["authenticity"]["supporting_span"],
                "aspect_delivery_present": aspects["delivery"]["present"],
                "aspect_delivery_polarity": aspects["delivery"]["polarity"],
                "aspect_delivery_score": aspects["delivery"]["polarity_score"],
                "aspect_delivery_span": aspects["delivery"]["supporting_span"],
                "aspect_packaging_present": aspects["packaging"]["present"],
                "aspect_packaging_polarity": aspects["packaging"]["polarity"],
                "aspect_packaging_score": aspects["packaging"]["polarity_score"],
                "aspect_packaging_span": aspects["packaging"]["supporting_span"],
                "aspect_service_present": aspects["customer_service"]["present"],
                "aspect_service_polarity": aspects["customer_service"]["polarity"],
                "aspect_service_score": aspects["customer_service"]["polarity_score"],
                "aspect_service_span": aspects["customer_service"]["supporting_span"],
                "aspect_value_present": aspects["value_for_money"]["present"],
                "aspect_value_polarity": aspects["value_for_money"]["polarity"],
                "aspect_value_score": aspects["value_for_money"]["polarity_score"],
                "aspect_value_span": aspects["value_for_money"]["supporting_span"],
                # Signals
                "is_exact_duplicate": is_dup,
                "duplicate_cluster_id": dup_cid,
                "duplicate_cluster_size": dup_size,
                "temporal_status": temporal_status,
                "is_temporal_burst": is_burst,
                "temporal_burst_cluster_id": burst_cid,
                "is_length_anomaly": is_len_anomaly,
                "REVIEW_SIMILARITY_SIGNAL": review_similarity_signal,
                "REVIEW_BURST_SIGNAL": review_burst_signal,
                "RATING_DISCORDANCE_SIGNAL": rating_discordance_signal,
                "REVIEW_LENGTH_ANOMALY_SIGNAL": review_length_anomaly_signal,
                "provenance": "REPRODUCIBLE_NLP_INTELLIGENCE_V1_5",
            }
            records.append(rec)

        features_df = pd.DataFrame(records)

        summary = {
            "total_reviews_processed": len(features_df),
            "unique_products_with_reviews": features_df["canonical_product_id"].nunique(),
            "exact_duplicate_reviews": int(features_df["is_exact_duplicate"].sum()),
            "exact_duplicate_clusters": len(clusters_df),
            "discordant_reviews": int(features_df["is_rating_discordant"].sum()),
            "temporal_burst_reviews": int(features_df["is_temporal_burst"].sum()),
            "length_anomaly_reviews": int(features_df["is_length_anomaly"].sum()),
            "sentiment_polarity_counts": features_df["sentiment_polarity"].value_counts().to_dict(),
            "language_distribution": features_df["detected_language"].value_counts().to_dict(),
            "aspect_mention_counts": {
                "quality": int(features_df["aspect_quality_present"].sum()),
                "authenticity": int(features_df["aspect_authenticity_present"].sum()),
                "delivery": int(features_df["aspect_delivery_present"].sum()),
                "packaging": int(features_df["aspect_packaging_present"].sum()),
                "service": int(features_df["aspect_service_present"].sum()),
                "value": int(features_df["aspect_value_present"].sum()),
            },
        }

        logger.info(f"Review NLP Pipeline completed successfully: {json.dumps(summary, indent=2)}")
        return features_df, clusters_df, summary
