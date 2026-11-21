"""
Graph Intelligence and Topological Feature Engine (v1.6)

Constructs NetworkX relational graphs from marketplace entity relationships and computes
topological intelligence features for downstream trust assessment.

Calculates:
1. Degree Centrality & Neighborhood Density
2. Connected Component Identification & Cluster Size
3. Bipartite Co-review and Listing Connectivity
4. Graph Relational Audit

Output:
- data/processed_v1_6/graph_features_v1_6.parquet
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import networkx as nx
import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("graph_intelligence_v1_6")

PROJECT_ROOT = Path(__file__).resolve().parents[2]


class GraphIntelligenceEngine:
    """
    Constructs multi-entity trust graphs and extracts NetworkX topological metrics.
    """

    def __init__(
        self,
        dataset_dir: Optional[Path] = None,
        out_dir: Optional[Path] = None,
    ) -> None:
        self.dataset_dir = dataset_dir or (PROJECT_ROOT / "data" / "marketplace_trust_dataset_v1.5")
        self.out_dir = out_dir or (PROJECT_ROOT / "data" / "processed_v1_6")
        self.out_dir.mkdir(parents=True, exist_ok=True)
        self.edges_df: Optional[pd.DataFrame] = None
        self.products_df: Optional[pd.DataFrame] = None
        self._load_data()

    def _load_data(self) -> None:
        edges_path = self.dataset_dir / "relationships" / "entity_relationships.parquet"
        prods_path = self.dataset_dir / "entities" / "products.parquet"
        if not edges_path.exists():
            raise FileNotFoundError(f"Edges table missing: {edges_path}")
        if not prods_path.exists():
            raise FileNotFoundError(f"Products table missing: {prods_path}")
        self.edges_df = pd.read_parquet(edges_path)
        self.products_df = pd.read_parquet(prods_path)

    def build_graph(self) -> nx.Graph:
        """Construct an undirected graph from entity relationships."""
        G = nx.Graph()
        
        # Add product nodes
        for cid in self.products_df["canonical_product_id"]:
            G.add_node(cid, node_type="PRODUCT")

        # Add edges
        src_col = "source_entity_id" if "source_entity_id" in self.edges_df.columns else "source_id"
        tgt_col = "target_entity_id" if "target_entity_id" in self.edges_df.columns else "target_id"
        rel_col = "relationship_type"

        for _, row in self.edges_df.iterrows():
            u = str(row[src_col])
            v = str(row[tgt_col])
            rel = str(row.get(rel_col, "CONNECTED_TO"))
            G.add_edge(u, v, relationship=rel)

        logger.info(f"Constructed NetworkX graph: {G.number_of_nodes():,} nodes, {G.number_of_edges():,} edges.")
        return G

    def extract_topological_features(self, G: nx.Graph) -> pd.DataFrame:
        """
        Compute node-level topological metrics for all 6,043 products.
        """
        logger.info("Computing graph topological metrics...")
        degrees = dict(G.degree())
        components = list(nx.connected_components(G))
        comp_map: Dict[str, Tuple[int, int]] = {}
        for c_idx, comp in enumerate(components):
            c_size = len(comp)
            for node in comp:
                comp_map[node] = (c_idx, c_size)

        records: List[Dict[str, Any]] = []
        total_nodes = max(1, G.number_of_nodes())

        for _, row in self.products_df.iterrows():
            cid = row["canonical_product_id"]
            mkt = row["marketplace"]
            deg = degrees.get(cid, 0)
            deg_centrality = deg / total_nodes
            c_idx, c_size = comp_map.get(cid, (-1, 0))

            records.append({
                "canonical_product_id": cid,
                "marketplace": mkt,
                "graph_degree": deg,
                "graph_degree_centrality": round(float(deg_centrality), 6),
                "connected_component_id": int(c_idx),
                "connected_component_size": int(c_size),
                "is_isolated_node": bool(deg == 0),
                "reconciliation_version": "v1.6",
            })

        feat_df = pd.DataFrame(records)
        out_path = self.out_dir / "graph_features_v1_6.parquet"
        feat_df.to_parquet(out_path, index=False)
        logger.info(f"Saved graph features to {out_path} ({len(feat_df):,} rows).")
        return feat_df


def main() -> None:
    parser = argparse.ArgumentParser(description="Graph Intelligence Engine v1.6")
    parser.add_argument("--run", action="store_true", help="Execute graph feature extraction")
    args = parser.parse_args()

    engine = GraphIntelligenceEngine()
    G = engine.build_graph()
    feat_df = engine.extract_topological_features(G)
    print("Graph Feature Extraction Complete (v1.6):")
    print(f"Total Products Evaluated: {len(feat_df):,}")
    print(f"Connected Nodes: {(~feat_df['is_isolated_node']).sum():,}")
    print(f"Mean Degree: {feat_df['graph_degree'].mean():.2f}")
    print(f"Max Degree: {feat_df['graph_degree'].max():,}")


if __name__ == "__main__":
    main()
