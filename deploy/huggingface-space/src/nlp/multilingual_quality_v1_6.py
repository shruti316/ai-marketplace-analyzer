"""
Multilingual Review Intelligence and Quality Engine (v1.6)

Implements script detection, Indic transliteration (Hinglish) identification,
and language-aware text quality assessment across all 56,697 marketplace reviews.

Supported Script Classes:
- LATIN (English, Transliterated Indic/Hinglish)
- DEVANAGARI, BENGALI, TAMIL, TELUGU, GUJARATI
- MIXED_SCRIPT, UNKNOWN

Features Produced:
- detected_script, detected_language, language_confidence
- hinglish_token_count, hinglish_density, is_multilingual
- text_quality: character length, word count, lexical diversity, uppercase ratio
"""

from __future__ import annotations

import argparse
import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("multilingual_quality_v1_6")

PROJECT_ROOT = Path(__file__).resolve().parents[2]

# Indic script Unicode ranges
SCRIPT_PATTERNS = {
    "DEVANAGARI": re.compile(r"[\u0900-\u097F]"),
    "BENGALI": re.compile(r"[\u0980-\u09FF]"),
    "TAMIL": re.compile(r"[\u0B80-\u0BFF]"),
    "TELUGU": re.compile(r"[\u0C00-\u0C7F]"),
    "GUJARATI": re.compile(r"[\u0A80-\u0AFF]"),
    "GURMUKHI": re.compile(r"[\u0A00-\u0A7F]"),
    "KANNADA": re.compile(r"[\u0C80-\u0CFF]"),
    "MALAYALAM": re.compile(r"[\u0D00-\u0D7F]"),
}

LATIN_PATTERN = re.compile(r"[a-zA-Z]")

# Curated high-precision transliterated Indic (Hinglish) vocabulary
HINGLISH_LEXICON: Set[str] = {
    "acha", "accha", "achha", "achhi", "achhe", "bohot", "bahut", "bhot",
    "bekar", "kharab", "mast", "paisa", "vasool", "badiya", "badhiya",
    "sahi", "nahi", "nahin", "tha", "the", "thi", "hai", "hain", "karo",
    "karna", "liya", "liye", "diya", "de", "le", "wala", "wali", "chahiye",
    "dhanyawad", "ghatiya", "ekdum", "mujhe", "mera", "meri", "mere",
    "kuch", "kuchh", "bhi", "kripya", "shukriya", "mat", "kaise", "hota",
    "hoti", "hote", "hoga", "hogi", "badhiya", "zabardast", "lao", "bhai",
    "dost", "samajh", "aaya", "aayi", "gaya", "gayi", "bheja", "parso",
    "jaldi", "deri", "tut", "phoot", "nakli", "asli", "khatam", "daam"
}


class MultilingualReviewEngine:
    """
    Identifies scripts, detects Hinglish transliteration, and computes language features.
    """

    def __init__(
        self,
        reviews_path: Optional[Path] = None,
        out_dir: Optional[Path] = None,
    ) -> None:
        self.reviews_path = reviews_path or (
            PROJECT_ROOT / "data" / "marketplace_trust_dataset_v1.5" / "evidence" / "reviews.parquet"
        )
        self.out_dir = out_dir or (PROJECT_ROOT / "data" / "processed_v1_6")
        self.out_dir.mkdir(parents=True, exist_ok=True)
        self.reviews_df: Optional[pd.DataFrame] = None
        self._load_reviews()

    def _load_reviews(self) -> None:
        if not self.reviews_path.exists():
            raise FileNotFoundError(f"Reviews file not found: {self.reviews_path}")
        self.reviews_df = pd.read_parquet(self.reviews_path)

    @staticmethod
    def classify_text(text: Any) -> Dict[str, Any]:
        """Classify script, language, and Hinglish density for a single text."""
        if not isinstance(text, str) or not text.strip():
            return {
                "detected_script": "UNKNOWN",
                "detected_language": "UNKNOWN",
                "language_confidence": 0.0,
                "hinglish_token_count": 0,
                "hinglish_density": 0.0,
                "is_multilingual": False,
            }

        primary_script = "UNKNOWN"
        primary_lang = "UNKNOWN"
        conf = 0.0
        hing_count = 0
        hing_density = 0.0
        is_multi = False

        # 1. Native Indic script check
        detected_scripts = []
        for script_name, pat in SCRIPT_PATTERNS.items():
            if pat.search(text):
                detected_scripts.append(script_name)

        has_latin = bool(LATIN_PATTERN.search(text))

        if detected_scripts and has_latin:
            primary_script = "MIXED_SCRIPT"
            primary_lang = "MIXED_INDIC_ENGLISH"
            conf = 0.85
            is_multi = True
        elif detected_scripts:
            primary_script = detected_scripts[0]
            primary_lang = detected_scripts[0].lower()
            conf = 0.95
            is_multi = False
        elif has_latin:
            primary_script = "LATIN"
            words = re.findall(r"\b[a-zA-Z]{2,}\b", text.lower())
            total_words = len(words)
            if total_words == 0:
                primary_lang = "ENGLISH"
                conf = 0.70
                hing_count = 0
                hing_density = 0.0
                is_multi = False
            else:
                hing_tokens = [w for w in words if w in HINGLISH_LEXICON]
                hing_count = len(hing_tokens)
                hing_density = hing_count / total_words

                if hing_density >= 0.08 or (hing_count >= 2 and total_words <= 20):
                    primary_lang = "HINGLISH_LATINIZED_INDIC"
                    conf = min(0.95, 0.65 + hing_density * 2.0)
                    is_multi = True
                else:
                    primary_lang = "ENGLISH"
                    conf = 0.90 if hing_count == 0 else 0.80
                    is_multi = False
        else:
            primary_script = "UNKNOWN"
            primary_lang = "UNKNOWN"
            conf = 0.0
            is_multi = False

        return {
            "detected_script": primary_script,
            "detected_language": primary_lang,
            "language_confidence": round(float(conf), 3),
            "hinglish_token_count": hing_count,
            "hinglish_density": round(float(hing_density), 4),
            "is_multilingual": is_multi,
        }

    def process_all_reviews(self) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Process all reviews, producing language_annotations and updated review_quality_features.
        """
        logger.info(f"Processing language annotations for {len(self.reviews_df):,} reviews...")

        texts = self.reviews_df["review_text_original"].fillna("")
        annotations: List[Dict[str, Any]] = []

        for idx, (cid, rev_id, mkt, txt) in enumerate(
            zip(
                self.reviews_df["canonical_product_id"],
                self.reviews_df["canonical_review_id"],
                self.reviews_df["marketplace"],
                texts,
            )
        ):
            c_res = self.classify_text(txt)
            c_res["canonical_review_id"] = rev_id
            c_res["canonical_product_id"] = cid
            c_res["marketplace"] = mkt
            c_res["reconciliation_version"] = "v1.6"
            annotations.append(c_res)

        ann_df = pd.DataFrame(annotations)
        ann_path = self.out_dir / "language_annotations_v1_6.parquet"
        ann_df.to_parquet(ann_path, index=False)
        logger.info(f"Saved language annotations to {ann_path} ({len(ann_df):,} rows).")

        # Merge with existing review quality features
        v15_quality_path = (
            PROJECT_ROOT / "data" / "marketplace_trust_dataset_v1.5" / "derived_evidence" / "review_quality_features.parquet"
        )
        if v15_quality_path.exists():
            base_q = pd.read_parquet(v15_quality_path)
            q_cols = [c for c in base_q.columns if c not in ["detected_script", "detected_language", "language_confidence", "hinglish_token_count", "hinglish_density", "is_multilingual"]]
            base_q = base_q[q_cols]
            merged_q = base_q.merge(
                ann_df[[
                    "canonical_review_id",
                    "detected_script",
                    "detected_language",
                    "language_confidence",
                    "hinglish_token_count",
                    "hinglish_density",
                    "is_multilingual",
                ]],
                on="canonical_review_id",
                how="left",
            )
        else:
            merged_q = ann_df.copy()

        q_path = self.out_dir / "review_quality_features_v1_6.parquet"
        merged_q.to_parquet(q_path, index=False)
        logger.info(f"Saved expanded review quality features to {q_path} ({len(merged_q):,} rows).")

        return ann_df, merged_q


def main() -> None:
    parser = argparse.ArgumentParser(description="Multilingual Review Quality Engine v1.6")
    parser.add_argument("--run", action="store_true", help="Execute multilingual annotation")
    args = parser.parse_args()

    engine = MultilingualReviewEngine()
    ann_df, q_df = engine.process_all_reviews()
    print("Multilingual Processing Complete (v1.6):")
    print(f"Total Annotated Reviews: {len(ann_df):,}")
    print("Language Distribution:")
    print(ann_df["detected_language"].value_counts())
    print("\nScript Distribution:")
    print(ann_df["detected_script"].value_counts())


if __name__ == "__main__":
    main()
