"""
src/relationships/graph_intelligence_v1_5.py
--------------------------------------------
Entity Relationship Graph Intelligence and Bipartite Network Construction for Release v1.5.
"""

from typing import Dict, Any, List, Set, Tuple
import pandas as pd
import numpy as np
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class GraphIntelligenceEngineV15:
    """
    Constructs and audits the multi-entity marketplace trust graph.
    """

    @staticmethod
    def audit_graph_architecture(
        edges_df: pd.DataFrame,
        products_df: pd.DataFrame,
        sellers_df: pd.DataFrame
    ) -> Dict[str, Any]:
        """
        Audits bipartite and multi-entity relationship edges and verifies integrity.
        """
        edge_types = edges_df["relationship_type"].value_counts().to_dict()
        source_types = edges_df["source_entity_type"].value_counts().to_dict()
        target_types = edges_df["target_entity_type"].value_counts().to_dict()

        total_edges = len(edges_df)
        unique_sources = edges_df["source_entity_id"].nunique()
        unique_targets = edges_df["target_entity_id"].nunique()

        # Verify seller keys: 100% NULL on products
        null_sellers = int(products_df["seller_id"].isna().sum())
        total_products = len(products_df)

        return {
            "total_relationship_edges": total_edges,
            "unique_source_entities": unique_sources,
            "unique_target_entities": unique_targets,
            "edge_type_distribution": edge_types,
            "source_entity_types": source_types,
            "target_entity_types": target_types,
            "seller_identity_modeling": {
                "individual_seller_ids_null_count": null_sellers,
                "individual_seller_null_rate": round(float(null_sellers / total_products * 100), 2),
                "aggregate_platform_merchants": len(sellers_df),
                "merchant_entities": sellers_df["seller_id"].tolist()
            },
            "gcn_model_status": "GRAPH_STRUCTURED_EVIDENCE_STORE_ONLY",
            "fraud_claim_warning": "No GCN or graph neural network fraud classifier is claimed. Edges serve as relational evidence indexing."
        }
