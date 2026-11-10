"""
Graph Intelligence Service
Milestone 6: Final Multimodal Trust Intelligence Engine
AI-Powered Indian Marketplace Trust Intelligence Platform

Analyzes heterogeneous graph relationships connecting products, listings, brands,
platforms, and sellers. Identifies cross-product asset sharing and graph anomalies.
"""

from collections import defaultdict
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import pandas as pd

logger = logging.getLogger("GraphIntelligence")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class GraphIntelligenceService:
    """
    Graph-based intelligence service for querying local subgraphs,
    tracing multi-hop entity pathways, and detecting cross-product visual reuse.
    """

    def __init__(self, relationships_df: pd.DataFrame, products_df: pd.DataFrame):
        self.rel_df = relationships_df.copy()
        self.prods_df = products_df.copy()

        # Build adjacency maps
        self.outbound_edges = defaultdict(list)
        self.inbound_edges = defaultdict(list)
        for r in self.rel_df.to_dict("records"):
            self.outbound_edges[r["source_entity_id"]].append(r)
            self.inbound_edges[r["target_entity_id"]].append(r)

        self.products_by_id = self.prods_df.set_index("canonical_product_id").to_dict(orient="index")

    def get_entity_subgraph(self, entity_id: str, depth: int = 1) -> Dict[str, Any]:
        """
        Extracts local egocentric subgraph around entity_id up to specified depth.
        """
        visited_nodes: Set[str] = {entity_id}
        collected_edges: List[Dict[str, Any]] = []
        current_layer: Set[str] = {entity_id}

        for _ in range(depth):
            next_layer: Set[str] = set()
            for node in current_layer:
                # Outbound
                for e in self.outbound_edges.get(node, []):
                    collected_edges.append(e)
                    tgt = e["target_entity_id"]
                    if tgt not in visited_nodes:
                        visited_nodes.add(tgt)
                        next_layer.add(tgt)
                # Inbound
                for e in self.inbound_edges.get(node, []):
                    collected_edges.append(e)
                    src = e["source_entity_id"]
                    if src not in visited_nodes:
                        visited_nodes.add(src)
                        next_layer.add(src)
            current_layer = next_layer
            if not current_layer:
                break

        # Deduplicate edges by relationship_id
        unique_edges = {e["relationship_id"]: e for e in collected_edges}

        return {
            "root_entity_id": entity_id,
            "depth": depth,
            "total_nodes": len(visited_nodes),
            "total_edges": len(unique_edges),
            "nodes": list(visited_nodes),
            "edges": list(unique_edges.values()),
        }

    def detect_cross_product_image_sharing(self, canonical_product_id: str) -> List[Dict[str, Any]]:
        """
        Identifies peer products sharing identical or near-identical visual assets.
        """
        all_edges = self.outbound_edges.get(canonical_product_id, []) + self.inbound_edges.get(canonical_product_id, [])
        shared_img_edges = [e for e in all_edges if e["relationship_type"] == "SHARED_IMAGE_BETWEEN_PRODUCTS"]

        peer_findings: List[Dict[str, Any]] = []
        for e in shared_img_edges:
            peer_id = e["target_entity_id"] if e["source_entity_id"] == canonical_product_id else e["source_entity_id"]
            peer_meta = self.products_by_id.get(peer_id, {})
            current_meta = self.products_by_id.get(canonical_product_id, {})

            peer_brand = str(peer_meta.get("brand", "UNKNOWN"))
            current_brand = str(current_meta.get("brand", "UNKNOWN"))
            is_cross_brand = (peer_brand.lower() != current_brand.lower())

            peer_findings.append({
                "relationship_id": e["relationship_id"],
                "peer_product_id": peer_id,
                "peer_title": str(peer_meta.get("product_title", "")),
                "peer_brand": peer_brand,
                "current_brand": current_brand,
                "is_cross_brand_image_reuse": is_cross_brand,
                "similarity_score": float(e.get("relationship_confidence", 0.95)),
                "evidence_reference": e.get("evidence_reference", ""),
            })

        return peer_findings

    def analyze_graph_trust_patterns(self, canonical_product_id: str) -> Dict[str, Any]:
        """
        Analyzes graph structural patterns (degree, image sharing, cross-brand reuse)
        to identify relationship-level investigation signals.
        """
        out_edges = self.outbound_edges.get(canonical_product_id, [])
        in_edges = self.inbound_edges.get(canonical_product_id, [])
        total_degree = len(out_edges) + len(in_edges)

        shared_images = self.detect_cross_product_image_sharing(canonical_product_id)
        has_cross_brand_reuse = any(p["is_cross_brand_image_reuse"] for p in shared_images)

        patterns = []
        if shared_images:
            patterns.append("CROSS_PRODUCT_IMAGE_REUSE_DETECTED")
        if has_cross_brand_reuse:
            patterns.append("CROSS_BRAND_IMAGE_RECYCLING_ANOMALY")
        if total_degree < 3:
            patterns.append("ISOLATED_LOW_DEGREE_NODE")

        return {
            "canonical_product_id": canonical_product_id,
            "total_degree": total_degree,
            "outbound_edge_count": len(out_edges),
            "inbound_edge_count": len(in_edges),
            "shared_image_peers_count": len(shared_images),
            "shared_image_peers": shared_images,
            "has_cross_brand_reuse": has_cross_brand_reuse,
            "graph_patterns": patterns,
            "governance_rule": (
                "Relationship patterns represent exploratory graph investigation signals. "
                "No individual seller ownership or merchant collusion is inferred."
            ),
        }
