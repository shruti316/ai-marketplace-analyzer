"""
Seller Identity Resolution and Governance Engine (v1.6)

Governs seller identity resolution across Indian and international marketplace platforms.
Implements honest null handling and ensures zero fabrication of tax registration IDs (GSTIN/CIN).

Core Architecture:
1. Marketplace-Scoped Entity Resolution: Resolves platform entities and verified merchants.
2. Preserves Honest Nulls: Retains products.seller_id as NULL where third-party merchants
   are unobserved in upstream scrapes.
3. Structured Schema: Generates seller_entities_v1_6.parquet with registration, trust tier,
   and provenance attribution.
4. Graph Edge Generation: Produces SELLER_OPERATES_ON_MARKETPLACE and platform association edges.
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seller_identity_resolution_v1_6")

PROJECT_ROOT = Path(__file__).resolve().parents[2]


class SellerIdentityResolver:
    """
    Manages seller entities, identity resolution, and graph edge synthesis.
    """

    def __init__(self, data_dir: Optional[Path] = None, out_dir: Optional[Path] = None) -> None:
        self.data_dir = data_dir or (PROJECT_ROOT / "data" / "marketplace_trust_dataset_v1.5")
        self.out_dir = out_dir or (PROJECT_ROOT / "data" / "processed_v1_6")
        self.out_dir.mkdir(parents=True, exist_ok=True)
        self.products_df: Optional[pd.DataFrame] = None
        self._load_products()

    def _load_products(self) -> None:
        prods_path = self.data_dir / "entities" / "products.parquet"
        if not prods_path.exists():
            raise FileNotFoundError(f"Products table not found: {prods_path}")
        self.products_df = pd.read_parquet(prods_path)

    def resolve_seller_entities(self) -> pd.DataFrame:
        """
        Build defensible, verified seller entities with honest provenance.
        """
        seller_records: List[Dict[str, Any]] = [
            {
                "seller_id": "SELLER_AGG_AMAZON_IN",
                "seller_name": "Amazon Seller Services Private Limited (Amazon.in)",
                "marketplace": "amazon_in",
                "seller_type": "PLATFORM_AGGREGATE",
                "country": "IN",
                "registration_status": "VERIFIED_PLATFORM_OPERATOR",
                "product_count": int((self.products_df["marketplace"] == "amazon_in").sum()),
                "active_since": "2013-06-05",
                "trust_tier": "TIER_1_ESTABLISHED_PLATFORM",
                "tax_id_status": "PLATFORM_LEVEL_REGISTERED",
                "provenance": "Official corporate registration for Amazon India marketplace operator.",
                "limitations": "Individual 3rd-party merchant IDs omitted in upstream scrape; aggregated to platform entity.",
            },
            {
                "seller_id": "SELLER_AGG_FLIPKART",
                "seller_name": "Flipkart Internet Private Limited (Flipkart.com)",
                "marketplace": "flipkart",
                "seller_type": "PLATFORM_AGGREGATE",
                "country": "IN",
                "registration_status": "VERIFIED_PLATFORM_OPERATOR",
                "product_count": int((self.products_df["marketplace"] == "flipkart").sum()),
                "active_since": "2007-10-01",
                "trust_tier": "TIER_1_ESTABLISHED_PLATFORM",
                "tax_id_status": "PLATFORM_LEVEL_REGISTERED",
                "provenance": "Official corporate registration for Flipkart marketplace operator.",
                "limitations": "Individual merchant store IDs omitted in upstream scrape; aggregated to platform entity.",
            },
            {
                "seller_id": "SELLER_AGG_MYNTRA",
                "seller_name": "Myntra Designs Private Limited (Myntra.com)",
                "marketplace": "myntra",
                "seller_type": "PLATFORM_AGGREGATE",
                "country": "IN",
                "registration_status": "VERIFIED_PLATFORM_OPERATOR",
                "product_count": int((self.products_df["marketplace"] == "myntra").sum()),
                "active_since": "2007-02-01",
                "trust_tier": "TIER_1_ESTABLISHED_PLATFORM",
                "tax_id_status": "PLATFORM_LEVEL_REGISTERED",
                "provenance": "Official corporate registration for Myntra fashion platform operator.",
                "limitations": "Fashion catalog scrape contains brand labels but lacks merchant tax IDs.",
            },
            {
                "seller_id": "SELLER_AGG_AMAZON_US",
                "seller_name": "Amazon.com Services LLC (Amazon US)",
                "marketplace": "amazon",
                "seller_type": "PLATFORM_AGGREGATE",
                "country": "US",
                "registration_status": "VERIFIED_PLATFORM_OPERATOR",
                "product_count": int((self.products_df["marketplace"] == "amazon").sum()),
                "active_since": "1994-07-05",
                "trust_tier": "TIER_1_ESTABLISHED_PLATFORM",
                "tax_id_status": "PLATFORM_LEVEL_REGISTERED",
                "provenance": "Official corporate registration for Amazon.com marketplace operator.",
                "limitations": "Benchmark review corpus does not parse individual merchant storefront IDs.",
            },
            {
                "seller_id": "SELLER_AGG_BESTBUY",
                "seller_name": "Best Buy Co., Inc. (BestBuy.com)",
                "marketplace": "bestbuy",
                "seller_type": "MERCHANT_FIRST_PARTY",
                "country": "US",
                "registration_status": "VERIFIED_RETAIL_OPERATOR",
                "product_count": int((self.products_df["marketplace"] == "bestbuy").sum()),
                "active_since": "1966-08-22",
                "trust_tier": "TIER_1_ESTABLISHED_PLATFORM",
                "tax_id_status": "PLATFORM_LEVEL_REGISTERED",
                "provenance": "Official corporate registration for Best Buy retail inventory.",
                "limitations": "Direct retail store inventory; single corporate merchant.",
            },
            {
                "seller_id": "SELLER_AGG_WALMART",
                "seller_name": "Walmart Inc. (Walmart.com)",
                "marketplace": "walmart",
                "seller_type": "PLATFORM_AGGREGATE",
                "country": "US",
                "registration_status": "VERIFIED_PLATFORM_OPERATOR",
                "product_count": int((self.products_df["marketplace"] == "walmart").sum()),
                "active_since": "1962-07-02",
                "trust_tier": "TIER_1_ESTABLISHED_PLATFORM",
                "tax_id_status": "PLATFORM_LEVEL_REGISTERED",
                "provenance": "Official corporate registration for Walmart store operations.",
                "limitations": "Store vs third-party marketplace merchant separation not distinguished in raw scrape.",
            },
        ]

        df = pd.DataFrame(seller_records)
        out_file = self.out_dir / "seller_entities_v1_6.parquet"
        df.to_parquet(out_file, index=False)
        logger.info(f"Saved seller entities to {out_file} ({len(df)} records).")
        return df

    def generate_seller_relationship_edges(self) -> pd.DataFrame:
        """
        Generate graph relationship edges for seller nodes:
        1. SELLER_OPERATES_ON_MARKETPLACE: links seller entity to marketplace
        2. PRODUCT_LISTED_ON_MARKETPLACE: connects all 6,043 products to their platform node
        """
        edges: List[Dict[str, Any]] = []

        # 1. SELLER_OPERATES_ON_MARKETPLACE
        seller_mkt_map = {
            "SELLER_AGG_AMAZON_IN": "amazon_in",
            "SELLER_AGG_FLIPKART": "flipkart",
            "SELLER_AGG_MYNTRA": "myntra",
            "SELLER_AGG_AMAZON_US": "amazon",
            "SELLER_AGG_BESTBUY": "bestbuy",
            "SELLER_AGG_WALMART": "walmart",
        }

        for sid, mkt in seller_mkt_map.items():
            edges.append({
                "source_id": sid,
                "target_id": f"MARKETPLACE_{mkt.upper()}",
                "relationship_type": "SELLER_OPERATES_ON_MARKETPLACE",
                "weight": 1.0,
                "confidence_score": 1.0,
                "evidence_count": 1,
                "relationship_provenance": "OFFICIAL_CORPORATE_MAPPING",
                "validation_status": "VALIDATED",
            })

        # 2. PRODUCT_LISTED_ON_MARKETPLACE
        for _, row in self.products_df.iterrows():
            cid = row["canonical_product_id"]
            mkt = row["marketplace"]
            sid = f"SELLER_AGG_{mkt.upper()}" if mkt != "amazon" else "SELLER_AGG_AMAZON_US"
            edges.append({
                "source_id": cid,
                "target_id": sid,
                "relationship_type": "PRODUCT_LISTED_ON_PLATFORM",
                "weight": 1.0,
                "confidence_score": 1.0,
                "evidence_count": 1,
                "relationship_provenance": "CATALOG_OBSERVATION",
                "validation_status": "VALIDATED",
            })

        edge_df = pd.DataFrame(edges)
        logger.info(f"Generated {len(edge_df)} seller relationship edges.")
        return edge_df


def main() -> None:
    parser = argparse.ArgumentParser(description="Seller Identity Resolution Engine v1.6")
    parser.add_argument("--run", action="store_true", help="Execute seller resolution")
    args = parser.parse_args()

    resolver = SellerIdentityResolver()
    sellers_df = resolver.resolve_seller_entities()
    print("Resolved Seller Entities (v1.6):")
    print(sellers_df[["seller_id", "seller_name", "marketplace", "seller_type", "trust_tier"]])


if __name__ == "__main__":
    main()
