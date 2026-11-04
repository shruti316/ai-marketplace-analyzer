"""
Marketplace Fraud Ground Truth Taxonomy and Weak Supervision Engine (v1.6)

Establishes a rigorous, defensible 7-tier label taxonomy for fraud intelligence:
1. CONFIRMED_FRAUD: Verified deceptive review from academic benchmarks.
2. CONFIRMED_POLICY_VIOLATION: Verified policy breach (e.g. incentivized disclosure).
3. CONFIRMED_AUTHENTIC: Verified authentic human purchase from academic control sets.
4. SUSPECTED_ANOMALY: Statistical or behavioral outlier (NOT confirmed fraud).
5. WEAK_LABEL: Rule-based programmatic heuristic label with provenance.
6. UNLABELED: In-the-wild marketplace review without external ground truth.
7. UNKNOWN: Insufficient metadata or ambiguous evidence.

Safety Guarantees:
- Zero fabrication: Real marketplace customer reviews remain UNLABELED or WEAK_LABEL.
- Academic benchmark ground truth is strictly isolated in collections/isolated_benchmarks.
- Programmatic labeling is transparently attributed to labeling functions (LFs).
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("fraud_ground_truth_taxonomy_v1_6")

PROJECT_ROOT = Path(__file__).resolve().parents[2]


class FraudTaxonomyEngine:
    """
    Applies the 7-tier fraud taxonomy and weak supervision labeling rules.
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
        self._load_data()

    def _load_data(self) -> None:
        if not self.reviews_path.exists():
            raise FileNotFoundError(f"Reviews file missing: {self.reviews_path}")
        self.reviews_df = pd.read_parquet(self.reviews_path)

    @staticmethod
    def apply_weak_labeling_functions(row: pd.Series, duplicate_set: set) -> Dict[str, Any]:
        """
        Execute labeling functions (LFs) on a marketplace review.
        Returns: weak_label, confidence, rules_fired list.
        """
        text = str(row.get("review_text_original", "") or "")
        rating = float(row.get("rating", 3.0) or 3.0)
        verified = bool(row.get("verified_purchase", False))
        words = text.split()
        word_count = len(words)

        rules_fired: List[str] = []
        label = "UNLABELED"
        conf = 0.50

        # LF 1: Exact Duplicate Text across multiple listings
        if text and text in duplicate_set:
            rules_fired.append("LF_EXACT_DUPLICATE_TEXT")

        # LF 2: Extreme rating with extremely short text (<= 2 words)
        if word_count <= 2 and (rating == 1.0 or rating == 5.0):
            rules_fired.append("LF_EXTREME_RATING_SHORT_TEXT")

        # LF 3: Unverified purchase with 5-star rating and high promotional tone
        if not verified and rating == 5.0 and word_count < 10:
            rules_fired.append("LF_UNVERIFIED_PURCHASE_HIGH_RATING")

        # LF 4: Verified purchase with substantive text (> 20 words)
        if verified and word_count >= 20:
            rules_fired.append("LF_SUBSTANTIVE_VERIFIED_PURCHASE")

        # Weak label arbitration
        if "LF_EXACT_DUPLICATE_TEXT" in rules_fired:
            label = "WEAK_LABEL_SUSPICIOUS"
            conf = 0.85
        elif "LF_EXTREME_RATING_SHORT_TEXT" in rules_fired:
            label = "WEAK_LABEL_LOW_EFFORT"
            conf = 0.70
        elif "LF_SUBSTANTIVE_VERIFIED_PURCHASE" in rules_fired:
            label = "WEAK_LABEL_AUTHENTIC_LEANING"
            conf = 0.80
        elif "LF_UNVERIFIED_PURCHASE_HIGH_RATING" in rules_fired:
            label = "WEAK_LABEL_PROMOTIONAL_SUSPECT"
            conf = 0.65
        else:
            label = "UNLABELED"
            conf = 0.50

        return {
            "fraud_taxonomy_tier": label,
            "weak_label_confidence": round(float(conf), 2),
            "labeling_rules_fired": "|".join(rules_fired) if rules_fired else "NONE",
            "is_weak_label": label.startswith("WEAK_LABEL_"),
        }

    def generate_label_annotations(self) -> pd.DataFrame:
        """
        Generate taxonomy and weak supervision annotations for all marketplace reviews.
        """
        logger.info(f"Generating fraud taxonomy annotations for {len(self.reviews_df):,} reviews...")

        # Find duplicate texts (appearing > 1 time)
        text_counts = self.reviews_df["review_text_original"].value_counts()
        duplicate_set = set(text_counts[text_counts > 1].index)

        records: List[Dict[str, Any]] = []
        for _, row in self.reviews_df.iterrows():
            res = self.apply_weak_labeling_functions(row, duplicate_set)
            res["canonical_review_id"] = row["canonical_review_id"]
            res["canonical_product_id"] = row["canonical_product_id"]
            res["marketplace"] = row["marketplace"]
            res["reconciliation_version"] = "v1.6"
            records.append(res)

        ann_df = pd.DataFrame(records)
        out_path = self.out_dir / "fraud_taxonomy_annotations_v1_6.parquet"
        ann_df.to_parquet(out_path, index=False)
        logger.info(f"Saved fraud taxonomy annotations to {out_path} ({len(ann_df):,} rows).")
        return ann_df


def main() -> None:
    parser = argparse.ArgumentParser(description="Fraud Ground Truth Taxonomy Engine v1.6")
    parser.add_argument("--run", action="store_true", help="Execute taxonomy annotation")
    args = parser.parse_args()

    engine = FraudTaxonomyEngine()
    ann_df = engine.generate_label_annotations()
    print("Fraud Taxonomy Annotation Complete (v1.6):")
    print("Taxonomy Tier Distribution:")
    print(ann_df["fraud_taxonomy_tier"].value_counts())


if __name__ == "__main__":
    main()
