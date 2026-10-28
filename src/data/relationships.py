"""
src/data/relationships.py
-------------------------
Auditable Entity Relationship Graph Modeling for the
AI-Powered Marketplace Trust Intelligence Platform.

Constructs genuine, non-fabricated relational edges between entities:
- Product -> Review  (`has_review`)     [VERIFIED_FK_LINKAGE]
- Product -> Image   (`has_image`)      [VERIFIED_FK_LINKAGE]
- Product -> Brand   (`belongs_to_brand`)[OBSERVED_CATALOG_ATTRIBUTE]
- Review  -> Author  (`written_by`)     [ANONYMOUS_REVIEWER_LINKAGE]

Enforces core seller integrity policy:
- Brand names are strictly isolated as unverified merchant affiliations.
- No fabricated seller IDs, collusion scores, or ghost accounts.

Outputs:
- data/processed/canonical_relationships.parquet
"""

import os
import logging
from dataclasses import dataclass, asdict
from typing import Dict, Any, List, Optional
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


@dataclass
class CanonicalRelationship:
    """
    Standardized entity relationship edge.
    """
    relationship_id: str                  # Format: {rel_type}_{src}_{tgt}
    source_entity_id: str                 # e.g., 'amazon_B00176GTAG'
    source_entity_type: str               # 'product', 'review', 'seller'
    target_entity_id: str                 # e.g., 'amazon_img_0', 'brand_philips'
    target_entity_type: str               # 'image', 'review', 'brand', 'reviewer'
    relationship_type: str                # 'has_image', 'has_review', 'belongs_to_brand', 'written_by'
    marketplace: str                      # 'amazon', 'walmart', 'bestbuy'
    evidence_source: str                  # Origin dataset table & key
    verification_status: str              # 'VERIFIED_FK_LINKAGE', 'OBSERVED_ATTRIBUTE', 'UNVERIFIED_MERCHANT'
    confidence_score: float = 1.0         # 1.0 for verified foreign keys; 0.85 for string brand attributes


class RelationshipGraphBuilder:
    """
    Constructs the canonical entity relationship dataset from processed tables.
    """

    def __init__(self, processed_dir: str = "data/processed"):
        self.processed_dir = processed_dir
        self.relationships: List[Dict[str, Any]] = []

    def build_graph(
        self,
        products_path: str = "data/processed/canonical_products.parquet",
        reviews_path: str = "data/processed/canonical_reviews.parquet",
        images_path: str = "data/processed/canonical_images.parquet",
    ) -> pd.DataFrame:
        logging.info("==================================================")
        logging.info("Starting Canonical Relationship Graph Generation")
        logging.info("==================================================")

        df_prods = pd.read_parquet(products_path)
        df_revs = pd.read_parquet(reviews_path)
        df_imgs = pd.read_parquet(images_path) if os.path.exists(images_path) else pd.DataFrame()

        prod_id_set = set(df_prods["canonical_product_id"])

        # 1. Product -> Brand Relationships (Cautiously flagged as unverified merchant account)
        logging.info("Extracting product-to-brand relationships...")
        for _, row in df_prods.iterrows():
            cid = str(row["canonical_product_id"])
            brand = str(row.get("brand", "")).strip()
            market = str(row.get("marketplace", "unknown"))

            if brand and brand.lower() not in ["none", "unknown", "nan", ""]:
                brand_slug = f"brand_{brand.lower().replace(' ', '_')}"
                rel = CanonicalRelationship(
                    relationship_id=f"brand_{cid}_{brand_slug}",
                    source_entity_id=cid,
                    source_entity_type="product",
                    target_entity_id=brand_slug,
                    target_entity_type="brand",
                    relationship_type="belongs_to_brand",
                    marketplace=market,
                    evidence_source="canonical_products.brand",
                    verification_status="OBSERVED_CATALOG_ATTRIBUTE (Brand name only - NOT verified seller ID)",
                    confidence_score=0.85,
                )
                self.relationships.append(asdict(rel))

        # 2. Product -> Review Relationships
        logging.info("Extracting product-to-review relationships...")
        for _, rrow in df_revs.iterrows():
            cid = str(rrow["canonical_product_id"])
            rid = str(rrow["canonical_review_id"])
            market = str(rrow.get("marketplace", "unknown"))
            reviewer = str(rrow.get("reviewer_id", "")).strip()

            if cid in prod_id_set:
                rel = CanonicalRelationship(
                    relationship_id=f"rev_{cid}_{rid}",
                    source_entity_id=cid,
                    source_entity_type="product",
                    target_entity_id=rid,
                    target_entity_type="review",
                    relationship_type="has_review",
                    marketplace=market,
                    evidence_source="canonical_reviews.canonical_product_id",
                    verification_status="VERIFIED_FK_LINKAGE",
                    confidence_score=1.0,
                )
                self.relationships.append(asdict(rel))

                # Review -> Reviewer Linkage
                if reviewer and reviewer.lower() not in ["none", "unknown", "nan", ""]:
                    rev_author = CanonicalRelationship(
                        relationship_id=f"author_{rid}_{reviewer}",
                        source_entity_id=rid,
                        source_entity_type="review",
                        target_entity_id=f"reviewer_{reviewer}",
                        target_entity_type="reviewer",
                        relationship_type="written_by",
                        marketplace=market,
                        evidence_source="canonical_reviews.reviewer_id",
                        verification_status="OBSERVED_ANONYMOUS_REVIEWER",
                        confidence_score=0.95,
                    )
                    self.relationships.append(asdict(rev_author))

        # 3. Product -> Image Relationships
        if not df_imgs.empty:
            logging.info("Extracting product-to-image relationships...")
            for _, irow in df_imgs.iterrows():
                cid = str(irow["canonical_product_id"])
                iid = str(irow["image_id"])
                market = str(irow.get("marketplace", "unknown"))

                if cid in prod_id_set:
                    rel = CanonicalRelationship(
                        relationship_id=f"img_{cid}_{iid}",
                        source_entity_id=cid,
                        source_entity_type="product",
                        target_entity_id=iid,
                        target_entity_type="image",
                        relationship_type="has_image",
                        marketplace=market,
                        evidence_source="canonical_images.canonical_product_id",
                        verification_status="VERIFIED_FK_LINKAGE",
                        confidence_score=1.0,
                    )
                    self.relationships.append(asdict(rel))

        # 4. Product Variant -> Parent Product Relationships (Hierarchical Variant Modeling)
        logging.info("Extracting product variant-to-parent relationships...")
        for _, prow in df_prods.iterrows():
            cid = str(prow["canonical_product_id"])
            parent_id = str(prow.get("parent_product_id", "")).strip()
            market = str(prow.get("marketplace", "unknown"))

            if parent_id and parent_id.lower() not in ["none", "unknown", "nan", ""] and parent_id != cid:
                rel = CanonicalRelationship(
                    relationship_id=f"variant_{cid}_{parent_id}",
                    source_entity_id=cid,
                    source_entity_type="product_variant",
                    target_entity_id=parent_id,
                    target_entity_type="parent_product",
                    relationship_type="is_variant_of",
                    marketplace=market,
                    evidence_source="canonical_products.parent_product_id",
                    verification_status="VERIFIED_VARIANT_HIERARCHY",
                    confidence_score=1.0,
                )
                self.relationships.append(asdict(rel))

        df_rel = pd.DataFrame(self.relationships).drop_duplicates(subset=["relationship_id"]).reset_index(drop=True)

        out_path = os.path.join(self.processed_dir, "canonical_relationships.parquet")
        df_rel.to_parquet(out_path, index=False)
        logging.info("Saved %s (%d total relationships across entities, %.2f MB)", out_path, len(df_rel), os.path.getsize(out_path) / (1024 * 1024))

        rel_type_counts = df_rel["relationship_type"].value_counts().to_dict()
        logging.info("Relationship breakdown:\n%s", rel_type_counts)

        return df_rel


if __name__ == "__main__":
    builder = RelationshipGraphBuilder()
    builder.build_graph()
