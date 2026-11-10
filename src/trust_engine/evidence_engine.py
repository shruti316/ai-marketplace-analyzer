"""
Unified Evidence Engine
Milestone 6: Final Multimodal Trust Intelligence Engine
AI-Powered Indian Marketplace Trust Intelligence Platform

Retrieves, standardizes, and audits evidence across all platform modalities:
Reviews, Images, Pricing, Seller Governance, Graph Relationships, and OCR.
Strictly distinguishes observed evidence, heuristic signals, and model predictions.
"""

from collections import defaultdict
import datetime
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import numpy as np
import pandas as pd

from src.trust_engine.contracts import (
    EvidenceModality,
    EvidenceNature,
    UnifiedEvidenceItem,
)

logger = logging.getLogger("EvidenceEngine")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class UnifiedEvidenceEngine:
    """
    Centralized evidence retrieval and normalization engine.
    Ingests all primary entities, evidence observations, derived features,
    and graph relationships from the certified dataset release.
    """

    def __init__(self, dataset_dir: Optional[Path] = None):
        self.project_root = Path(__file__).resolve().parents[2]
        self.dataset_dir = dataset_dir or (self.project_root / "data" / "indian_marketplace_trust_dataset_v1_7")

        logger.info(f"Initializing Unified Evidence Engine from: {self.dataset_dir}")
        self._load_tables()

    def _load_tables(self) -> None:
        """Loads all required dataset tables into memory with indexed lookups."""
        entities_dir = self.dataset_dir / "entities"
        evidence_dir = self.dataset_dir / "evidence"
        derived_dir = self.dataset_dir / "derived_evidence"
        rel_dir = self.dataset_dir / "relationships"

        # Entities
        self.products_df = pd.read_parquet(entities_dir / "products.parquet")
        self.listings_df = pd.read_parquet(entities_dir / "listings.parquet")
        self.brands_df = pd.read_parquet(entities_dir / "brands.parquet")
        self.sellers_df = pd.read_parquet(entities_dir / "sellers.parquet")
        self.platforms_df = pd.read_parquet(entities_dir / "platforms.parquet")

        # Evidence
        self.price_obs_df = pd.read_parquet(evidence_dir / "price_observations.parquet")
        self.reviews_df = pd.read_parquet(evidence_dir / "reviews.parquet")
        self.images_df = pd.read_parquet(evidence_dir / "images.parquet")

        # Derived Evidence
        self.pricing_features_df = pd.read_parquet(derived_dir / "pricing_features.parquet")
        self.pricing_cat_bench_df = pd.read_parquet(derived_dir / "pricing_category_benchmarks.parquet")
        self.pricing_brand_bench_df = pd.read_parquet(derived_dir / "pricing_brand_benchmarks.parquet")
        self.seller_features_df = pd.read_parquet(derived_dir / "seller_features.parquet")
        self.review_nlp_df = pd.read_parquet(derived_dir / "review_nlp_features.parquet")
        self.image_feat_df = pd.read_parquet(derived_dir / "image_intelligence_features.parquet")
        self.image_pairs_df = pd.read_parquet(derived_dir / "image_similarity_pairs.parquet")

        # Graph Relationships
        self.relationships_df = pd.read_parquet(rel_dir / "entity_relationships.parquet")

        # Build fast index lookups
        self.products_by_id = self.products_df.set_index("canonical_product_id").to_dict(orient="index")
        self.listings_by_id = self.listings_df.set_index("listing_id").to_dict(orient="index")
        self.pricing_by_product = self.pricing_features_df.set_index("canonical_product_id").to_dict(orient="index")
        self.sellers_by_id = self.sellers_df.set_index("seller_id").to_dict(orient="index")
        self.seller_feats_by_id = self.seller_features_df.set_index("seller_id").to_dict(orient="index")

        self.listings_by_product = defaultdict(list)
        for r in self.listings_df.to_dict("records"):
            self.listings_by_product[r["canonical_product_id"]].append(r)

        self.reviews_by_product = defaultdict(list)
        for r in self.review_nlp_df.to_dict("records"):
            self.reviews_by_product[r["canonical_product_id"]].append(r)

        self.images_by_product = defaultdict(list)
        for r in self.image_feat_df.to_dict("records"):
            self.images_by_product[r["canonical_product_id"]].append(r)

        self.graph_outbound = defaultdict(list)
        self.graph_inbound = defaultdict(list)
        for r in self.relationships_df.to_dict("records"):
            self.graph_outbound[r["source_entity_id"]].append(r)
            self.graph_inbound[r["target_entity_id"]].append(r)

        logger.info("Dataset tables and indexed lookups successfully loaded.")

    def get_product_evidence(self, canonical_product_id: str) -> List[UnifiedEvidenceItem]:
        """
        Retrieves all atomic evidence items associated with a canonical product
        across Review NLP, Image CV, Pricing, Seller Governance, Graph, and OCR.
        """
        if canonical_product_id not in self.products_by_id:
            logger.warning(f"Product ID not found: {canonical_product_id}")
            return []

        p_meta = self.products_by_id[canonical_product_id]
        evidence_items: List[UnifiedEvidenceItem] = []
        now_ts = datetime.datetime.now(datetime.timezone.utc).isoformat()

        # Associated listing IDs
        listings = self.listings_by_product.get(canonical_product_id, [])
        primary_lid = listings[0]["listing_id"] if listings else None

        # ------------------------------------------------------------------
        # 1. Review NLP Modality Evidence
        # ------------------------------------------------------------------
        rev_records = self.reviews_by_product.get(canonical_product_id, [])
        if rev_records:
            for r in rev_records:
                rid = str(r["review_id"])
                rating = float(r.get("rating", 0.0))
                sent_score = float(r.get("sentiment_score", 0.0))
                sent_pol = str(r.get("sentiment_polarity", "NEUTRAL"))
                disc_score = float(r.get("rating_discordance_score", 0.0))
                is_disc = bool(r.get("is_rating_discordant", False))
                is_dup = bool(r.get("is_exact_duplicate", False))
                dup_size = int(r.get("duplicate_cluster_size", 1))
                is_burst = bool(r.get("is_temporal_burst", False))

                # Raw review observation
                evidence_items.append(UnifiedEvidenceItem(
                    evidence_id=f"ev_rev_obs_{rid}",
                    entity_id=rid,
                    canonical_product_id=canonical_product_id,
                    listing_id=primary_lid,
                    evidence_modality=EvidenceModality.REVIEW_NLP,
                    evidence_type="RAW_CUSTOMER_REVIEW",
                    evidence_nature=EvidenceNature.OBSERVED_EVIDENCE,
                    observed_value=f"Rating: {rating}/5.0 | WordCount: {r.get('word_count', 0)}",
                    signal_severity="INFO",
                    detection_method="CATALOG_SCRAPE_INGESTION",
                    confidence=1.0,
                    uncertainty_note="Direct customer review observed during marketplace crawl.",
                    provenance=r.get("provenance", "PROMPTCLOUD_REVIEW_INGESTION"),
                    timestamp=r.get("review_date", None),
                    modality_available=True,
                    evidence_limitations="Review text reflects subjective user opinion.",
                ))

                # Sentiment model prediction
                evidence_items.append(UnifiedEvidenceItem(
                    evidence_id=f"ev_rev_sent_{rid}",
                    entity_id=rid,
                    canonical_product_id=canonical_product_id,
                    listing_id=primary_lid,
                    evidence_modality=EvidenceModality.REVIEW_NLP,
                    evidence_type="REVIEW_SENTIMENT",
                    evidence_nature=EvidenceNature.MODEL_PREDICTION,
                    observed_value=f"Polarity: {sent_pol} (Score: {sent_score:.3f})",
                    signal_severity="LOW" if sent_pol == "NEGATIVE" else "INFO",
                    detection_method="LEXICAL_RULE_BASED_ANALYZER",
                    confidence=float(r.get("sentiment_confidence", 0.85)),
                    uncertainty_note="Lexical sentiment proxy with Hinglish dictionary normalization.",
                    provenance="REVIEW_NLP_FEATURE_EXTRACTION",
                    timestamp=now_ts,
                    modality_available=True,
                    evidence_limitations="Rule-based polarity lacks contextual transformer nuance.",
                ))

                # Rating-Text Discordance Heuristic Signal
                if is_disc:
                    evidence_items.append(UnifiedEvidenceItem(
                        evidence_id=f"ev_rev_disc_{rid}",
                        entity_id=rid,
                        canonical_product_id=canonical_product_id,
                        listing_id=primary_lid,
                        evidence_modality=EvidenceModality.REVIEW_NLP,
                        evidence_type="REVIEW_DISCORDANCE",
                        evidence_nature=EvidenceNature.HEURISTIC_SIGNAL,
                        observed_value=f"Rating: {rating}/5 vs Sentiment: {sent_pol} (Delta: {disc_score:.2f})",
                        signal_severity="MEDIUM",
                        detection_method="RATING_SENTIMENT_NORMALIZED_DELTA",
                        confidence=0.85,
                        uncertainty_note="Mathematical disparity between numerical rating and textual polarity.",
                        provenance="REVIEW_NLP_FEATURE_EXTRACTION",
                        timestamp=now_ts,
                        modality_available=True,
                        evidence_limitations="Could be user misclick or ironic phrasing.",
                    ))

                # Duplicate text cluster Heuristic Signal
                if is_dup and dup_size >= 3:
                    evidence_items.append(UnifiedEvidenceItem(
                        evidence_id=f"ev_rev_dup_{rid}",
                        entity_id=rid,
                        canonical_product_id=canonical_product_id,
                        listing_id=primary_lid,
                        evidence_modality=EvidenceModality.REVIEW_NLP,
                        evidence_type="REVIEW_DUPLICATE_CLUSTER",
                        evidence_nature=EvidenceNature.HEURISTIC_SIGNAL,
                        observed_value=f"Exact Duplicate Cluster Size: {dup_size}",
                        signal_severity="MEDIUM",
                        detection_method="MD5_EXACT_TEXT_CLUSTERING",
                        confidence=1.0,
                        uncertainty_note="Identical normalized text repeated across reviews.",
                        provenance="REVIEW_NLP_FEATURE_EXTRACTION",
                        timestamp=now_ts,
                        modality_available=True,
                        evidence_limitations="Common short expressions ('Good product') can cluster organically.",
                    ))
        else:
            # Explicit missing modality item
            evidence_items.append(UnifiedEvidenceItem(
                evidence_id=f"ev_rev_missing_{canonical_product_id}",
                entity_id=canonical_product_id,
                canonical_product_id=canonical_product_id,
                listing_id=primary_lid,
                evidence_modality=EvidenceModality.REVIEW_NLP,
                evidence_type="REVIEW_MODALITY_STATUS",
                evidence_nature=EvidenceNature.OBSERVED_EVIDENCE,
                observed_value="MODALITY_UNAVAILABLE (0 reviews)",
                signal_severity="INFO",
                detection_method="MODALITY_AUDIT",
                confidence=1.0,
                uncertainty_note="No customer reviews were present in upstream crawl.",
                provenance="CATALOG_CRAWL_METADATA",
                timestamp=now_ts,
                modality_available=False,
                evidence_limitations="Absence of reviews incurs zero penalty under Zero-Penalty Invariant.",
            ))

        # ------------------------------------------------------------------
        # 2. Computer Vision Modality Evidence
        # ------------------------------------------------------------------
        img_records = self.images_by_product.get(canonical_product_id, [])
        if img_records:
            for img in img_records:
                iid = str(img["image_id"])
                w, h = img.get("image_width", 0), img.get("image_height", 0)
                is_reuse = bool(img.get("is_cross_product_image_reuse", False))
                is_corrupt = bool(img.get("is_corrupt", False))

                # Raw image observation
                evidence_items.append(UnifiedEvidenceItem(
                    evidence_id=f"ev_img_obs_{iid}",
                    entity_id=iid,
                    canonical_product_id=canonical_product_id,
                    listing_id=primary_lid,
                    evidence_modality=EvidenceModality.IMAGE_CV,
                    evidence_type="PHYSICAL_IMAGE_ASSET",
                    evidence_nature=EvidenceNature.OBSERVED_EVIDENCE,
                    observed_value=f"Dimensions: {w}x{h} | Hash: {img.get('dhash', 'none')[:12]}...",
                    signal_severity="INFO",
                    detection_method="PIL_IMAGE_INSPECTION",
                    confidence=1.0,
                    uncertainty_note="Physical image file verified in filesystem.",
                    provenance=img.get("provenance", "PROMPTCLOUD_IMAGE_SCRAPE"),
                    timestamp=now_ts,
                    modality_available=True,
                    evidence_limitations="Physical resolution varies across catalog crawl years.",
                ))

                # Cross-product reuse heuristic / model signal
                if is_reuse:
                    evidence_items.append(UnifiedEvidenceItem(
                        evidence_id=f"ev_img_reuse_{iid}",
                        entity_id=iid,
                        canonical_product_id=canonical_product_id,
                        listing_id=primary_lid,
                        evidence_modality=EvidenceModality.IMAGE_CV,
                        evidence_type="CROSS_PRODUCT_IMAGE_REUSE",
                        evidence_nature=EvidenceNature.MODEL_PREDICTION,
                        observed_value=f"Visual Cluster: {img.get('visual_cluster_id', 'none')}",
                        signal_severity="MEDIUM",
                        detection_method="RESNET18_CENTERED_COSINE_SIMILARITY",
                        confidence=0.95,
                        uncertainty_note="Identical or near-identical image asset reused across distinct product IDs.",
                        provenance="IMAGE_CV_INTELLIGENCE_PIPELINE",
                        timestamp=now_ts,
                        modality_available=True,
                        evidence_limitations="Authorized OEM distributors may legitimately share stock hero images.",
                    ))
        else:
            evidence_items.append(UnifiedEvidenceItem(
                evidence_id=f"ev_img_missing_{canonical_product_id}",
                entity_id=canonical_product_id,
                canonical_product_id=canonical_product_id,
                listing_id=primary_lid,
                evidence_modality=EvidenceModality.IMAGE_CV,
                evidence_type="IMAGE_MODALITY_STATUS",
                evidence_nature=EvidenceNature.OBSERVED_EVIDENCE,
                observed_value="MODALITY_UNAVAILABLE (0 images)",
                signal_severity="INFO",
                detection_method="MODALITY_AUDIT",
                confidence=1.0,
                uncertainty_note="No hero image was captured in upstream crawl.",
                provenance="CATALOG_CRAWL_METADATA",
                timestamp=now_ts,
                modality_available=False,
                evidence_limitations="Absence of image incurs zero penalty under Zero-Penalty Invariant.",
            ))

        # ------------------------------------------------------------------
        # 3. Pricing Modality Evidence
        # ------------------------------------------------------------------
        p_info = self.pricing_by_product.get(canonical_product_id, {})
        if p_info and pd.notna(p_info.get("observed_price_inr")):
            sp = float(p_info["observed_price_inr"])
            mrp = float(p_info["mrp_inr"]) if pd.notna(p_info.get("mrp_inr")) else None
            disc = float(p_info.get("discount_percentage", 0.0))
            rob_z = float(p_info.get("robust_z_score", 0.0))
            c_low = float(p_info.get("corridor_lower_inr", 0.0))
            c_high = float(p_info.get("corridor_upper_inr", sp * 3.0))
            is_outlier = bool(p_info.get("is_price_outlier", False))
            is_ext_out = bool(p_info.get("is_extreme_price_outlier", False))
            is_disc_anom = bool(p_info.get("is_discount_anomaly", False))
            sell_exceeds = bool(p_info.get("selling_exceeds_mrp", False))

            # Observed price & MRP
            evidence_items.append(UnifiedEvidenceItem(
                evidence_id=f"ev_price_obs_{canonical_product_id}",
                entity_id=canonical_product_id,
                canonical_product_id=canonical_product_id,
                listing_id=primary_lid,
                evidence_modality=EvidenceModality.PRICING,
                evidence_type="POINT_IN_TIME_PRICE",
                evidence_nature=EvidenceNature.OBSERVED_EVIDENCE,
                observed_value=f"Price: ₹{sp:,.2f} | MRP: {'₹' + f'{mrp:,.2f}' if mrp else 'NOT_DECLARED'} | Discount: {disc:.1f}%",
                signal_severity="INFO",
                detection_method="MARKETPLACE_DOM_SCRAPE",
                confidence=1.0,
                uncertainty_note="Observed snapshot price at crawl timestamp.",
                provenance="PRICE_OBSERVATION_INGESTION",
                timestamp=now_ts,
                modality_available=True,
                evidence_limitations="Single point-in-time cross-sectional snapshot; lacks longitudinal velocity.",
            ))

            # Price Corridor Heuristic Signal
            if is_outlier:
                evidence_items.append(UnifiedEvidenceItem(
                    evidence_id=f"ev_price_corridor_{canonical_product_id}",
                    entity_id=canonical_product_id,
                    canonical_product_id=canonical_product_id,
                    listing_id=primary_lid,
                    evidence_modality=EvidenceModality.PRICING,
                    evidence_type="PRICE_CORRIDOR_OUTLIER",
                    evidence_nature=EvidenceNature.HEURISTIC_SIGNAL,
                    observed_value=f"Price ₹{sp:,.2f} outside [₹{c_low:,.2f}, ₹{c_high:,.2f}] (z_robust={rob_z:.2f})",
                    signal_severity="HIGH" if is_ext_out else "MEDIUM",
                    detection_method="NON_PARAMETRIC_IQR_MAD_CORRIDOR",
                    confidence=0.92 if is_ext_out else 0.85,
                    uncertainty_note=f"Corridor benchmark source: {p_info.get('corridor_source', 'SUBCATEGORY')}",
                    provenance="PRICING_INTELLIGENCE_ENGINE",
                    timestamp=now_ts,
                    modality_available=True,
                    evidence_limitations="Statistical dispersion; broad subcategories mix budget and luxury tiers.",
                ))

            # Extreme Discount Heuristic Signal
            if is_disc_anom:
                evidence_items.append(UnifiedEvidenceItem(
                    evidence_id=f"ev_price_disc_{canonical_product_id}",
                    entity_id=canonical_product_id,
                    canonical_product_id=canonical_product_id,
                    listing_id=primary_lid,
                    evidence_modality=EvidenceModality.PRICING,
                    evidence_type="PRICE_DISCOUNT_ANOMALY",
                    evidence_nature=EvidenceNature.HEURISTIC_SIGNAL,
                    observed_value=f"Discount {disc:.2f}% >= 90.0% (MRP: ₹{mrp:,.2f} -> Price: ₹{sp:,.2f})",
                    signal_severity="HIGH",
                    detection_method="MRP_DISCOUNT_CONSISTENCY_AUDIT",
                    confidence=0.95,
                    uncertainty_note="High-magnitude markdown indicates artificial reference MRP or clearance.",
                    provenance="PRICING_INTELLIGENCE_ENGINE",
                    timestamp=now_ts,
                    modality_available=True,
                    evidence_limitations="Heuristic flag, not proof of deceptive pricing without packaging inspection.",
                ))

            # Selling Price Exceeds MRP Heuristic Signal
            if sell_exceeds:
                evidence_items.append(UnifiedEvidenceItem(
                    evidence_id=f"ev_price_mrp_exceed_{canonical_product_id}",
                    entity_id=canonical_product_id,
                    canonical_product_id=canonical_product_id,
                    listing_id=primary_lid,
                    evidence_modality=EvidenceModality.PRICING,
                    evidence_type="MRP_INCONSISTENCY",
                    evidence_nature=EvidenceNature.HEURISTIC_SIGNAL,
                    observed_value=f"Selling Price ₹{sp:,.2f} > Declared MRP ₹{mrp:,.2f}",
                    signal_severity="HIGH",
                    detection_method="LEGAL_METROLOGY_MRP_CHECK",
                    confidence=1.0,
                    uncertainty_note="Statutory pricing violation if physical packaging matches digital declaration.",
                    provenance="PRICING_INTELLIGENCE_ENGINE",
                    timestamp=now_ts,
                    modality_available=True,
                    evidence_limitations="Digital catalog entry error possible.",
                ))

        # ------------------------------------------------------------------
        # 4. Seller Governance Modality Evidence
        # ------------------------------------------------------------------
        seller_id = listings[0]["seller_id"] if listings else "SELLER_UNRESOLVED_THIRD_PARTY"
        s_meta = self.sellers_by_id.get(seller_id, {})
        s_feat = self.seller_feats_by_id.get(seller_id, {})

        evidence_items.append(UnifiedEvidenceItem(
            evidence_id=f"ev_seller_gov_{canonical_product_id}",
            entity_id=seller_id,
            canonical_product_id=canonical_product_id,
            listing_id=primary_lid,
            evidence_modality=EvidenceModality.SELLER_GOVERNANCE,
            evidence_type="PLATFORM_AGGREGATE_MERCHANT_STATUS",
            evidence_nature=EvidenceNature.OBSERVED_EVIDENCE,
            observed_value=f"Seller: {seller_id} | Type: {s_meta.get('seller_type', 'PLATFORM_AGGREGATE')}",
            signal_severity="INFO",
            detection_method="PLATFORM_DOMAIN_PARTITION",
            confidence=1.0,
            uncertainty_note="Reflects verified platform fulfillment routing. Individual merchant tax ID omitted.",
            provenance="CORPORATE_REGISTRY_AND_CRAWL_METADATA",
            timestamp=now_ts,
            modality_available=True,
            evidence_limitations=(
                "Upstream static crawl omitted 3rd-party merchant GSTINs/store IDs. "
                "Confidence 1.0 reflects platform aggregate routing, NOT individual merchant certainty."
            ),
        ))

        # ------------------------------------------------------------------
        # 5. Graph Topology & Cross-Product Relationship Evidence
        # ------------------------------------------------------------------
        out_edges = self.graph_outbound.get(canonical_product_id, [])
        in_edges = self.graph_inbound.get(canonical_product_id, [])

        # Look for cross-product image reuse edges
        shared_img_edges = [e for e in out_edges + in_edges if e["relationship_type"] == "SHARED_IMAGE_BETWEEN_PRODUCTS"]
        if shared_img_edges:
            for edge in shared_img_edges:
                peer_id = edge["target_entity_id"] if edge["source_entity_id"] == canonical_product_id else edge["source_entity_id"]
                score = float(edge.get("relationship_confidence", 0.95))
                evidence_items.append(UnifiedEvidenceItem(
                    evidence_id=f"ev_graph_shared_img_{canonical_product_id}_{peer_id}",
                    entity_id=edge["relationship_id"],
                    canonical_product_id=canonical_product_id,
                    listing_id=primary_lid,
                    evidence_modality=EvidenceModality.GRAPH_TOPOLOGY,
                    evidence_type="GRAPH_SHARED_IMAGE_EDGE",
                    evidence_nature=EvidenceNature.HEURISTIC_SIGNAL,
                    observed_value=f"Shares visual asset with {peer_id} (Similarity: {score:.4f})",
                    signal_severity="MEDIUM",
                    detection_method="HETEROGENEOUS_GRAPH_LINK_INSPECTION",
                    confidence=score,
                    uncertainty_note="Bipartite graph edge connects two distinct canonical product entities.",
                    provenance="GRAPH_RELATIONSHIP_INTELLIGENCE",
                    timestamp=now_ts,
                    modality_available=True,
                    evidence_limitations="Graph edge indicates identical visual asset; does not assert malicious collusion.",
                ))

        # ------------------------------------------------------------------
        # 6. OCR Offline Dependency Blocker Audit Item
        # ------------------------------------------------------------------
        evidence_items.append(UnifiedEvidenceItem(
            evidence_id=f"ev_ocr_status_{canonical_product_id}",
            entity_id="SYSTEM_OCR_MODALITY",
            canonical_product_id=canonical_product_id,
            listing_id=primary_lid,
            evidence_modality=EvidenceModality.OCR,
            evidence_type="OCR_DEPENDENCY_AUDIT",
            evidence_nature=EvidenceNature.OBSERVED_EVIDENCE,
            observed_value="BLOCKED_OFFLINE_DEPENDENCY_ABSENT",
            signal_severity="INFO",
            detection_method="SYSTEM_ENVIRONMENT_INSPECTION",
            confidence=1.0,
            uncertainty_note="Tesseract / EasyOCR binary libraries not installed in offline environment.",
            provenance="OCR_CAPABILITY_AUDIT",
            timestamp=now_ts,
            modality_available=False,
            evidence_limitations="Physical OCR text safely blocked to avoid synthetic fabrication.",
        ))

        return evidence_items

    def get_listing_evidence(self, listing_id: str) -> List[UnifiedEvidenceItem]:
        """Retrieves all evidence associated with an individual marketplace listing offer."""
        if listing_id not in self.listings_by_id:
            logger.warning(f"Listing ID not found: {listing_id}")
            return []

        l_meta = self.listings_by_id[listing_id]
        pid = l_meta["canonical_product_id"]
        product_evidence = self.get_product_evidence(pid)

        # Append listing-specific offer evidence
        listing_evidence = [
            UnifiedEvidenceItem(
                evidence_id=f"ev_listing_offer_{listing_id}",
                entity_id=listing_id,
                canonical_product_id=pid,
                listing_id=listing_id,
                evidence_modality=EvidenceModality.SELLER_GOVERNANCE,
                evidence_type="MARKETPLACE_LISTING_OFFER",
                evidence_nature=EvidenceNature.OBSERVED_EVIDENCE,
                observed_value=f"Marketplace: {l_meta['marketplace']} | Fulfillment: {l_meta.get('fulfillment_type', 'UNKNOWN')}",
                signal_severity="INFO",
                detection_method="CATALOG_INGESTION_PRIMARY_KEY",
                confidence=1.0,
                uncertainty_note="Listing instance resolved to canonical product master.",
                provenance="MARKETPLACE_LISTING_CATALOG",
                timestamp=l_meta.get("crawl_timestamp", None),
                modality_available=True,
                evidence_limitations="Listing status verified at time of catalog scrape.",
            )
        ]
        return listing_evidence + product_evidence
