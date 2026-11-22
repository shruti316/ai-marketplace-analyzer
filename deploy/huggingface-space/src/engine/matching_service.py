"""
Cross-Marketplace Product Matching & Entity Resolution Service — v1.7
AI-Powered Marketplace Trust Intelligence Platform

Provides production-ready cross-marketplace matching:
1. Multi-stage product entity resolution (exact, brand+model, fuzzy).
2. Variant attribute extraction (volume/weight, pack size, apparel size, memory storage).
3. False-match prevention via spec conflict detection (preserves distinct variants).
4. Confidence-scored candidate match retrieval.
5. Canonical representation generation for side-by-side comparison.
"""

from __future__ import annotations

import json
import logging
import re
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

from src.engine.contracts import CrossMarketplaceMatch

logger = logging.getLogger("matching_service")


class CrossMarketplaceMatchingService:
    """
    Production-grade Cross-Marketplace Entity Resolution Service.
    Resolves products across Amazon India, Flipkart, Myntra, Amazon US, Best Buy, and Walmart.
    """

    def __init__(self, v17_dir: Optional[Path] = None) -> None:
        self.project_root = Path(__file__).resolve().parents[2]
        self.v17_dir = v17_dir or (self.project_root / "data" / "marketplace_trust_dataset_v1.7")
        self._matches_df: Optional[pd.DataFrame] = None
        self._registry_df: Optional[pd.DataFrame] = None
        self._variants_df: Optional[pd.DataFrame] = None

    def _ensure_loaded(self) -> None:
        if self._matches_df is None:
            matches_path = self.v17_dir / "relationships" / "cross_marketplace_matches.parquet"
            reg_path = self.v17_dir / "entities" / "canonical_product_registry.parquet"
            var_path = self.v17_dir / "entities" / "product_variants.parquet"

            if matches_path.exists() and reg_path.exists():
                logger.info(f"Loading cross-marketplace matching tables from {self.v17_dir}...")
                self._matches_df = pd.read_parquet(matches_path)
                self._registry_df = pd.read_parquet(reg_path)
                if var_path.exists():
                    self._variants_df = pd.read_parquet(var_path)

    @staticmethod
    def normalize_text(text: str) -> str:
        if not isinstance(text, str):
            return ""
        t = text.lower().strip()
        t = re.sub(r"[^\w\s]", " ", t)
        return " ".join(t.split())

    @staticmethod
    def extract_specifications(title: str) -> Dict[str, Any]:
        specs: Dict[str, Any] = {}
        if not isinstance(title, str):
            return specs
        m_vol = re.search(r"(\d+(?:\.\d+)?\s*(?:ml|gm|g|kg|l|oz|fl\s*oz))\b", title, re.I)
        if m_vol:
            specs["volume_weight"] = m_vol.group(1).lower().replace(" ", "")
        m_pack = re.search(r"pack\s+of\s+(\d+)", title, re.I)
        if m_pack:
            specs["pack_size"] = int(m_pack.group(1))
        m_size = re.search(r"\b(XXXL|XXL|XL|XS|[SML])\b", title)
        if m_size:
            specs["size"] = m_size.group(1).upper()
        m_mem = re.search(r"(\d+)\s*(?:gb|mb|tb)\b", title, re.I)
        if m_mem:
            specs["storage"] = m_mem.group(1).lower() + "gb"
        return specs

    def match_two_listings(
        self,
        title_1: str,
        brand_1: str,
        title_2: str,
        brand_2: str,
        mp_1: str = "marketplace_1",
        mp_2: str = "marketplace_2",
    ) -> CrossMarketplaceMatch:
        """
        Determines whether two listings represent the same canonical product, a variant family, or are distinct.
        """
        norm_b1 = self.normalize_text(brand_1)
        norm_b2 = self.normalize_text(brand_2)
        norm_t1 = self.normalize_text(title_1)
        norm_t2 = self.normalize_text(title_2)

        # Exact title
        if norm_t1 == norm_t2 and norm_t1 != "":
            return CrossMarketplaceMatch(
                candidate_product_id="EXTERNAL_TARGET",
                marketplace=mp_2,
                product_title=title_2,
                similarity_score=1.0,
                match_confidence=1.0,
                match_stage="STAGE_1_EXACT_TITLE",
                resolution_status="EXACT_CROSS_MARKETPLACE_MATCH",
                evidence_note="Identical normalized titles",
            )

        # Specifications check
        specs1 = self.extract_specifications(title_1)
        specs2 = self.extract_specifications(title_2)

        spec_conflict = False
        conflict_keys = []
        for k in ["volume_weight", "size", "storage", "pack_size"]:
            if k in specs1 and k in specs2 and specs1[k] != specs2[k]:
                spec_conflict = True
                conflict_keys.append(f"{k}: {specs1[k]} vs {specs2[k]}")

        sim = SequenceMatcher(None, title_1.lower(), title_2.lower()).ratio()

        # Token overlap
        tok1 = set(norm_t1.split())
        tok2 = set(norm_t2.split())
        tok_overlap = len(tok1 & tok2) / max(len(tok1), len(tok2)) if tok1 and tok2 else 0.0

        if spec_conflict:
            return CrossMarketplaceMatch(
                candidate_product_id="EXTERNAL_TARGET",
                marketplace=mp_2,
                product_title=title_2,
                similarity_score=round(sim, 4),
                match_confidence=round(sim * 0.85, 4),
                match_stage="STAGE_3_VARIANT_RESOLUTION",
                resolution_status="VARIANT_FAMILY_CROSS_MARKETPLACE",
                evidence_note=f"Shared product line but conflicting spec attributes ({', '.join(conflict_keys)})",
            )

        if sim >= 0.80 or (sim >= 0.70 and tok_overlap >= 0.70):
            return CrossMarketplaceMatch(
                candidate_product_id="EXTERNAL_TARGET",
                marketplace=mp_2,
                product_title=title_2,
                similarity_score=round(sim, 4),
                match_confidence=round(sim, 4),
                match_stage="STAGE_2_HIGH_CONFIDENCE_FUZZY",
                resolution_status="HIGH_CONFIDENCE_MATCH",
                evidence_note="High lexical similarity and compatible specifications",
            )

        if sim >= 0.55:
            return CrossMarketplaceMatch(
                candidate_product_id="EXTERNAL_TARGET",
                marketplace=mp_2,
                product_title=title_2,
                similarity_score=round(sim, 4),
                match_confidence=round(sim * 0.75, 4),
                match_stage="STAGE_4_UNCERTAIN_CANDIDATE",
                resolution_status="QUARANTINED_UNCERTAIN_MATCH",
                evidence_note="Moderate lexical similarity; requires human verification",
            )

        return CrossMarketplaceMatch(
            candidate_product_id="EXTERNAL_TARGET",
            marketplace=mp_2,
            product_title=title_2,
            similarity_score=round(sim, 4),
            match_confidence=round(sim * 0.3, 4),
            match_stage="STAGE_5_WEAK_SIMILARITY",
            resolution_status="DISTINCT_PRODUCT_ENTITIES",
            evidence_note="Low lexical similarity",
        )

    def find_cross_marketplace_matches(self, canonical_product_id: str) -> List[CrossMarketplaceMatch]:
        """
        Retrieves all pre-computed cross-marketplace candidate matches for a product from v1.7.
        """
        self._ensure_loaded()
        if self._matches_df is None or self._matches_df.empty:
            return []

        sub1 = self._matches_df[self._matches_df["product_id_1"] == canonical_product_id]
        sub2 = self._matches_df[self._matches_df["product_id_2"] == canonical_product_id]

        matches = []
        for _, r in sub1.iterrows():
            matches.append(
                CrossMarketplaceMatch(
                    candidate_product_id=r["product_id_2"],
                    marketplace=r["marketplace_2"],
                    product_title=r["product_title_2"],
                    similarity_score=float(r["similarity_score"]),
                    match_confidence=float(r["match_confidence"]),
                    match_stage=r["match_stage"],
                    resolution_status=r["resolution_status"],
                    evidence_note=r["evidence_note"],
                )
            )

        for _, r in sub2.iterrows():
            matches.append(
                CrossMarketplaceMatch(
                    candidate_product_id=r["product_id_1"],
                    marketplace=r["marketplace_1"],
                    product_title=r["product_title_1"],
                    similarity_score=float(r["similarity_score"]),
                    match_confidence=float(r["match_confidence"]),
                    match_stage=r["match_stage"],
                    resolution_status=r["resolution_status"],
                    evidence_note=r["evidence_note"],
                )
            )

        return matches
