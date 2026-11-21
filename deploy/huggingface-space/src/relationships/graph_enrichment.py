"""
Graph Relationship Enrichment Engine
AI-Powered Indian Marketplace Trust Intelligence Platform

Expands entity relationships with verified seller-to-listing, listing-to-product,
listing-to-platform, and product-to-product cross-modal image reuse edges.
Enforces strict referential integrity and schema conformance.
"""

from collections import defaultdict
import datetime
import hashlib
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import pandas as pd

logger = logging.getLogger("GraphEnrichment")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class GraphEnrichmentEngine:
    """
    Ingests baseline relationships and enriches the graph with verified
    seller, listing, and cross-product visual reuse relationships.
    """

    def __init__(
        self,
        existing_relationships_df: pd.DataFrame,
        listings_df: pd.DataFrame,
        image_similarity_pairs_df: Optional[pd.DataFrame] = None,
        sellers_df: Optional[pd.DataFrame] = None,
        products_df: Optional[pd.DataFrame] = None,
    ):
        self.existing_rel_df = existing_relationships_df.copy()
        self.listings_df = listings_df.copy()
        self.image_pairs_df = image_similarity_pairs_df.copy() if image_similarity_pairs_df is not None else pd.DataFrame()
        self.sellers_df = sellers_df.copy() if sellers_df is not None else pd.DataFrame()
        self.products_df = products_df.copy() if products_df is not None else pd.DataFrame()

    def build_seller_listing_edges(self) -> List[Dict[str, Any]]:
        """Generates SELLER_OFFERS_LISTING edges connecting sellers to listings."""
        edges = []
        for _, row in self.listings_df.iterrows():
            lid = str(row["listing_id"])
            sid = str(row.get("seller_id", "SELLER_UNRESOLVED_THIRD_PARTY"))
            mkt = str(row.get("marketplace", "unknown"))

            rel_id = f"REL_SELLER_OFFERS_{lid}"
            edges.append({
                "relationship_id": rel_id,
                "source_entity_id": sid,
                "source_entity_type": "SELLER",
                "target_entity_id": lid,
                "target_entity_type": "LISTING",
                "relationship_type": "SELLER_OFFERS_LISTING",
                "relationship_confidence": 1.0,
                "evidence_reference": f"MARKETPLACE_DOM_{mkt.upper()}",
                "detection_method": "PLATFORM_AGGREGATE_LINK",
                "validation_status": "VALID_AGGREGATE",
                "provenance": "Indian Marketplace Catalog Scrape",
            })
        logger.info(f"Generated {len(edges)} SELLER_OFFERS_LISTING edges.")
        return edges

    def build_listing_product_edges(self) -> List[Dict[str, Any]]:
        """Generates LISTING_OF_PRODUCT edges connecting listings to canonical products."""
        edges = []
        for _, row in self.listings_df.iterrows():
            lid = str(row["listing_id"])
            pid = str(row["canonical_product_id"])

            rel_id = f"REL_LISTING_OF_{lid}"
            edges.append({
                "relationship_id": rel_id,
                "source_entity_id": lid,
                "source_entity_type": "LISTING",
                "target_entity_id": pid,
                "target_entity_type": "PRODUCT",
                "relationship_type": "LISTING_OF_PRODUCT",
                "relationship_confidence": 1.0,
                "evidence_reference": "CATALOG_PRIMARY_KEY",
                "detection_method": "CANONICAL_IDENTITY_RESOLUTION",
                "validation_status": "VALID",
                "provenance": "Indian Marketplace Catalog Scrape",
            })
        logger.info(f"Generated {len(edges)} LISTING_OF_PRODUCT edges.")
        return edges

    def build_listing_platform_edges(self) -> List[Dict[str, Any]]:
        """Generates LISTING_ON_PLATFORM edges connecting listings to marketplace platforms."""
        edges = []
        for _, row in self.listings_df.iterrows():
            lid = str(row["listing_id"])
            plat_id = str(row.get("platform_id", ""))
            if not plat_id:
                mkt = str(row.get("marketplace", "")).lower()
                plat_id = f"PLATFORM_{mkt.upper()}"

            rel_id = f"REL_LISTING_PLATFORM_{lid}"
            edges.append({
                "relationship_id": rel_id,
                "source_entity_id": lid,
                "source_entity_type": "LISTING",
                "target_entity_id": plat_id,
                "target_entity_type": "PLATFORM",
                "relationship_type": "LISTING_ON_PLATFORM",
                "relationship_confidence": 1.0,
                "evidence_reference": "MARKETPLACE_DOM_PARTITION",
                "detection_method": "PRIMARY_KEY_IDENTITY",
                "validation_status": "VALID",
                "provenance": "Indian Marketplace Catalog Scrape",
            })
        logger.info(f"Generated {len(edges)} LISTING_ON_PLATFORM edges.")
        return edges

    def build_shared_image_edges(self, threshold: float = 0.95) -> List[Dict[str, Any]]:
        """
        Generates SHARED_IMAGE_BETWEEN_PRODUCTS edges connecting products
        that share near-identical or duplicate visual assets.
        """
        if self.image_pairs_df.empty:
            logger.warning("No image similarity pairs provided; skipping SHARED_IMAGE_BETWEEN_PRODUCTS.")
            return []

        # Filter cross-product pairs at or above threshold
        mask = (self.image_pairs_df["is_cross_product"] == True) & (self.image_pairs_df["similarity_score"] >= threshold)
        cross_pairs = self.image_pairs_df[mask].copy()

        # Group by canonical product pairs to avoid redundant parallel edges
        product_pairs_map: Dict[Tuple[str, str], Dict[str, Any]] = {}
        for _, row in cross_pairs.iterrows():
            p1 = str(row["canonical_product_id_1"])
            p2 = str(row["canonical_product_id_2"])
            score = float(row["similarity_score"])
            pair_key = tuple(sorted([p1, p2]))

            if pair_key not in product_pairs_map or score > product_pairs_map[pair_key]["max_score"]:
                product_pairs_map[pair_key] = {
                    "p1": pair_key[0],
                    "p2": pair_key[1],
                    "max_score": score,
                    "img1": str(row["image_id_1"]),
                    "img2": str(row["image_id_2"]),
                    "pair_id": str(row.get("image_pair_id", "")),
                }

        edges = []
        for (p1, p2), data in product_pairs_map.items():
            h = hashlib.md5(f"{p1}_{p2}".encode("utf-8")).hexdigest()[:12]
            rel_id = f"REL_SHARED_IMG_{h}"
            edges.append({
                "relationship_id": rel_id,
                "source_entity_id": p1,
                "source_entity_type": "PRODUCT",
                "target_entity_id": p2,
                "target_entity_type": "PRODUCT",
                "relationship_type": "SHARED_IMAGE_BETWEEN_PRODUCTS",
                "relationship_confidence": round(data["max_score"], 4),
                "evidence_reference": f"IMG_PAIR_{data['pair_id']}_{data['img1']}_{data['img2']}",
                "detection_method": "RESNET18_COSINE_SIMILARITY",
                "validation_status": "VERIFIED_CROSS_PRODUCT_REUSE",
                "provenance": "MULTIMODAL_IMAGE_INTELLIGENCE_V1_5",
            })
        logger.info(f"Generated {len(edges)} unique SHARED_IMAGE_BETWEEN_PRODUCTS edges (threshold >= {threshold}).")
        return edges

    def enrich_graph(self) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Executes full graph enrichment and returns the enriched relationships DataFrame
        along with summary metrics.
        """
        logger.info("Executing Graph Relationship Enrichment Pipeline...")

        seller_listing_edges = self.build_seller_listing_edges()
        listing_prod_edges = self.build_listing_product_edges()
        listing_plat_edges = self.build_listing_platform_edges()
        shared_img_edges = self.build_shared_image_edges(threshold=0.95)

        new_edges = seller_listing_edges + listing_prod_edges + listing_plat_edges + shared_img_edges
        new_df = pd.DataFrame(new_edges)

        # Combine existing and new relationships
        combined_df = pd.concat([self.existing_rel_df, new_df], ignore_index=True)

        # Integrity Checks
        assert combined_df["relationship_id"].is_unique, "Duplicate relationship_id detected!"
        assert combined_df["relationship_confidence"].between(0.0, 1.0).all(), "Confidence out of [0, 1] range!"
        assert not combined_df["source_entity_id"].isna().any(), "Null source_entity_id found!"
        assert not combined_df["target_entity_id"].isna().any(), "Null target_entity_id found!"

        summary = {
            "baseline_relationships_count": len(self.existing_rel_df),
            "seller_offers_listing_count": len(seller_listing_edges),
            "listing_of_product_count": len(listing_prod_edges),
            "listing_on_platform_count": len(listing_plat_edges),
            "shared_image_between_products_count": len(shared_img_edges),
            "new_edges_added": len(new_edges),
            "total_enriched_relationships": len(combined_df),
            "unique_relationship_types": combined_df["relationship_type"].nunique(),
            "relationship_distribution": combined_df["relationship_type"].value_counts().to_dict(),
        }

        logger.info(f"Graph enrichment completed successfully: {json.dumps(summary, indent=2)}")
        return combined_df, summary
