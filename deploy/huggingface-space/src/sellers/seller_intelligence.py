"""
Seller Identity and Reputation Intelligence Pipeline
AI-Powered Indian Marketplace Trust Intelligence Platform

Resolves seller identities against genuine source evidence, prevents converting platform
names into individual merchants, computes operational and reputation metrics per platform seller,
and enforces referential integrity between listings and sellers.
"""

from collections import defaultdict
import datetime
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

logger = logging.getLogger("SellerIntelligence")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class SellerIdentityResolver:
    """
    Resolves seller identities for listings while strictly enforcing the Honest Null
    and Platform Aggregate invariants. Never invents synthetic merchant IDs.
    """

    SELLER_MAPPING = {
        "amazon_in": "SELLER_AGG_AMAZON_IN",
        "flipkart": "SELLER_AGG_FLIPKART",
        "myntra": "SELLER_AGG_MYNTRA",
    }

    PLATFORM_MAPPING = {
        "PLATFORM_AMAZON_IN": "SELLER_AGG_AMAZON_IN",
        "PLATFORM_FLIPKART": "SELLER_AGG_FLIPKART",
        "PLATFORM_MYNTRA": "SELLER_AGG_MYNTRA",
    }

    @classmethod
    def resolve_listing_seller(cls, row: pd.Series) -> str:
        """Resolves seller_id for an individual listing based on verified marketplace partition."""
        mkt = str(row.get("marketplace", "")).lower().strip()
        pid = str(row.get("platform_id", "")).strip()

        if mkt in cls.SELLER_MAPPING:
            return cls.SELLER_MAPPING[mkt]
        if pid in cls.PLATFORM_MAPPING:
            return cls.PLATFORM_MAPPING[pid]
        return "SELLER_UNRESOLVED_THIRD_PARTY"

    @classmethod
    def resolve_listings(cls, listings_df: pd.DataFrame) -> pd.DataFrame:
        """
        Enriches listings DataFrame with foreign key seller_id and explicit resolution status.
        Does not mutate the caller's DataFrame.
        """
        df = listings_df.copy()
        df["seller_id"] = df.apply(cls.resolve_listing_seller, axis=1)
        df["seller_resolution_status"] = "UNRESOLVED_PLATFORM_AGGREGATE"
        df["seller_resolution_notes"] = (
            "Upstream PromptCloud catalog scrape omitted individual merchant tax IDs (GSTIN/store IDs). "
            "Linked to certified platform aggregate merchant pool."
        )
        logger.info(f"Resolved seller_id for {len(df)} listings across platforms: {df['seller_id'].value_counts().to_dict()}")
        return df


class SellerReputationEngine:
    """
    Computes operational catalog, fulfillment, pricing, and reputation features
    for certified seller entities.
    """

    def __init__(
        self,
        listings_df: pd.DataFrame,
        products_df: pd.DataFrame,
        price_obs_df: pd.DataFrame,
        reviews_df: Optional[pd.DataFrame] = None,
        pricing_features_df: Optional[pd.DataFrame] = None,
    ):
        self.listings_df = listings_df.copy()
        self.products_df = products_df.copy()
        self.price_obs_df = price_obs_df.copy()
        self.reviews_df = reviews_df.copy() if reviews_df is not None else pd.DataFrame()
        self.pricing_features_df = pricing_features_df.copy() if pricing_features_df is not None else pd.DataFrame()

    def compute_seller_features(self) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Computes operational features and returns:
        1. Enriched sellers_df (entities/sellers.parquet)
        2. Detailed seller_features_df (derived_evidence/seller_features.parquet)
        """
        logger.info("Computing Seller Reputation and Operational Metrics...")

        # Base metadata for certified seller entities
        base_sellers = [
            {
                "seller_id": "SELLER_AGG_AMAZON_IN",
                "platform_id": "PLATFORM_AMAZON_IN",
                "marketplace": "amazon_in",
                "seller_display_name": "Amazon India Aggregate Merchant Pool",
                "operator_entity": "Amazon Seller Services Private Limited",
                "seller_type": "PLATFORM_AGGREGATE",
                "is_individual_merchant": False,
                "merchant_resolution_status": "UNRESOLVED_THIRD_PARTY_MERCHANT",
                "registration_status": "PLATFORM_OPERATOR_VERIFIED",
                "source_provenance": "UPSTREAM_CRAWL_METADATA_OMISSION",
                "verification_notes": (
                    "Upstream PromptCloud Amazon India crawl did not capture individual 3rd-party retail merchant store IDs."
                ),
            },
            {
                "seller_id": "SELLER_AGG_FLIPKART",
                "platform_id": "PLATFORM_FLIPKART",
                "marketplace": "flipkart",
                "seller_display_name": "Flipkart Marketplace Aggregate Merchant Pool",
                "operator_entity": "Flipkart Internet Private Limited",
                "seller_type": "PLATFORM_AGGREGATE",
                "is_individual_merchant": False,
                "merchant_resolution_status": "UNRESOLVED_THIRD_PARTY_MERCHANT",
                "registration_status": "PLATFORM_OPERATOR_VERIFIED",
                "source_provenance": "UPSTREAM_CRAWL_METADATA_OMISSION",
                "verification_notes": (
                    "Upstream PromptCloud Flipkart crawl did not capture individual merchant store IDs."
                ),
            },
            {
                "seller_id": "SELLER_AGG_MYNTRA",
                "platform_id": "PLATFORM_MYNTRA",
                "marketplace": "myntra",
                "seller_display_name": "Myntra Marketplace Aggregate Merchant Pool",
                "operator_entity": "Myntra Designs Private Limited",
                "seller_type": "PLATFORM_AGGREGATE",
                "is_individual_merchant": False,
                "merchant_resolution_status": "UNRESOLVED_THIRD_PARTY_MERCHANT",
                "registration_status": "PLATFORM_OPERATOR_VERIFIED",
                "source_provenance": "UPSTREAM_CRAWL_METADATA_OMISSION",
                "verification_notes": (
                    "Upstream PromptCloud Myntra crawl did not capture individual merchant store IDs."
                ),
            },
            {
                "seller_id": "SELLER_UNRESOLVED_THIRD_PARTY",
                "platform_id": "PLATFORM_MULTI",
                "marketplace": "all",
                "seller_display_name": "Unresolved Third-Party Marketplace Retail Merchants",
                "operator_entity": "UNRESOLVED_RETAIL_ENTITIES",
                "seller_type": "UNRESOLVED_MERCHANT_POOL",
                "is_individual_merchant": True,
                "merchant_resolution_status": "AWAITING_SOURCE_DATA",
                "registration_status": "UNVERIFIED_SOURCE_DATA_OMITTED",
                "source_provenance": "PROMPTCLOUD_CRAWL_OMISSION",
                "verification_notes": (
                    "Ground-truth individual merchant retail tax IDs were omitted in the upstream static crawl."
                ),
            },
        ]

        # Merge listings with products to get canonical attributes
        merged_listings = self.listings_df.merge(
            self.products_df[["canonical_product_id", "category", "subcategory", "brand"]],
            on="canonical_product_id",
            how="left",
            suffixes=("", "_prod")
        )

        # Merge price observations
        if not self.price_obs_df.empty:
            latest_prices = self.price_obs_df.groupby("canonical_product_id")["normalized_price_inr"].median().to_dict()
            merged_listings["price_inr"] = merged_listings["canonical_product_id"].map(latest_prices)
        else:
            merged_listings["price_inr"] = np.nan

        # Merge reviews sentiment if available
        review_sentiment_by_mkt = {}
        review_count_by_mkt = {}
        if not self.reviews_df.empty and "marketplace" in self.reviews_df.columns:
            for mkt, grp in self.reviews_df.groupby("marketplace"):
                review_count_by_mkt[mkt] = len(grp)
                if "sentiment_score" in grp.columns:
                    valid_s = grp["sentiment_score"].dropna()
                    review_sentiment_by_mkt[mkt] = round(float(valid_s.mean()), 3) if not valid_s.empty else None
                elif "compound" in grp.columns:
                    valid_s = grp["compound"].dropna()
                    review_sentiment_by_mkt[mkt] = round(float(valid_s.mean()), 3) if not valid_s.empty else None
                elif "rating" in grp.columns:
                    valid_r = grp["rating"].dropna()
                    # Scale 1-5 rating to -1 to +1 sentiment proxy
                    review_sentiment_by_mkt[mkt] = round(float((valid_r.mean() - 3.0) / 2.0), 3) if not valid_r.empty else None
                else:
                    review_sentiment_by_mkt[mkt] = None

        # Count pricing anomalies if pricing features available
        anomalies_by_mkt = defaultdict(int)
        if not self.pricing_features_df.empty and "marketplace" in self.pricing_features_df.columns:
            for mkt, grp in self.pricing_features_df.groupby("marketplace"):
                anomalies = (grp["is_price_outlier"] == True) | (grp["is_discount_anomaly"] == True) | (grp["selling_exceeds_mrp"] == True)
                anomalies_by_mkt[mkt] = int(anomalies.sum())

        seller_records = []
        feature_records = []

        for s_meta in base_sellers:
            sid = s_meta["seller_id"]
            mkt = s_meta["marketplace"]
            sub_listings = merged_listings[merged_listings["seller_id"] == sid]

            listings_count = len(sub_listings)
            if listings_count > 0:
                brands = sub_listings["brand"].dropna().unique().tolist()
                categories = sub_listings["category"].dropna().unique().tolist()
                subcategories = sub_listings["subcategory"].dropna().unique().tolist()

                brand_counts = sub_listings["brand"].value_counts()
                top_brand = str(brand_counts.index[0]) if not brand_counts.empty else "UNKNOWN"

                prices = sub_listings["price_inr"].dropna().tolist()
                if prices:
                    p_min = round(float(np.min(prices)), 2)
                    p_max = round(float(np.max(prices)), 2)
                    p_median = round(float(np.median(prices)), 2)
                    p_mean = round(float(np.mean(prices)), 2)
                    p_q1 = float(np.percentile(prices, 25))
                    p_q3 = float(np.percentile(prices, 75))
                    p_iqr = round(float(p_q3 - p_q1), 2)
                else:
                    p_min = p_max = p_median = p_mean = p_iqr = 0.0

                fulfillment_dist = sub_listings["fulfillment_type"].value_counts().to_dict() if "fulfillment_type" in sub_listings.columns else {}
                rev_count = review_count_by_mkt.get(mkt, 0)
                mean_sent = review_sentiment_by_mkt.get(mkt, None)
                anomaly_count = anomalies_by_mkt.get(mkt, 0)
            else:
                brands = []
                categories = []
                subcategories = []
                top_brand = "NONE_UNRESOLVED"
                p_min = p_max = p_median = p_mean = p_iqr = 0.0
                fulfillment_dist = {}
                rev_count = 0
                mean_sent = None
                anomaly_count = 0

            # Enriched entities/sellers.parquet record
            s_rec = dict(s_meta)
            s_rec.update({
                "seller_rating": np.nan,
                "seller_review_count": rev_count,
                "total_catalog_listings": listings_count,
                "unique_brands_count": len(brands),
                "unique_categories_count": len(categories),
                "median_price_inr": p_median,
                "mean_price_inr": p_mean,
                "validation_status": "CERTIFIED_PLATFORM_AGGREGATE_V1_6",
            })
            seller_records.append(s_rec)

            # Only active aggregate pools go into derived_evidence/seller_features.parquet
            if s_meta["seller_type"] == "PLATFORM_AGGREGATE":
                feature_records.append({
                    "seller_id": sid,
                    "marketplace": mkt,
                    "total_catalog_listings": listings_count,
                    "unique_brands_count": len(brands),
                    "top_brand": top_brand,
                    "categories_represented": len(categories),
                    "unique_subcategories_count": len(subcategories),
                    "min_price_inr": p_min,
                    "max_price_inr": p_max,
                    "median_price_inr": p_median,
                    "mean_price_inr": p_mean,
                    "price_iqr_inr": p_iqr,
                    "fulfillment_distribution_json": json.dumps(fulfillment_dist),
                    "total_reviews_count": rev_count,
                    "mean_review_sentiment": mean_sent,
                    "pricing_anomalies_count": anomaly_count,
                    "is_single_merchant_verified": False,
                    "governance_classification": "PLATFORM_OPERATOR_PROXY",
                    "data_quality_flag": "AGGREGATE_PROXY_METADATA_LIMITATION",
                    "provenance": "UPSTREAM_CRAWL_METADATA_OMISSION_AUDIT",
                    "validation_status": "CERTIFIED_PLATFORM_AGGREGATE_V1_6",
                })

        sellers_df = pd.DataFrame(seller_records)
        seller_features_df = pd.DataFrame(feature_records)

        logger.info(f"Generated {len(sellers_df)} sellers and {len(seller_features_df)} seller feature profiles.")
        return sellers_df, seller_features_df
