"""
Targeted Verification Script for Indian Marketplace Trust Dataset v1.5
Focus Areas:
1. Review duplicate validation
2. Temporal burst validation
3. Image similarity validation
4. Multimodal risk aggregation
"""

from collections import defaultdict
import json
from pathlib import Path
import networkx as nx
import numpy as np
import pandas as pd

DATA_DIR = Path("data/indian_marketplace_trust_dataset_v1_5")

def audit_review_duplicates():
    print("==================================================================")
    print("1. REVIEW DUPLICATE VALIDATION")
    print("==================================================================")
    clusters_path = DATA_DIR / "derived_evidence" / "review_similarity_clusters.parquet"
    nlp_path = DATA_DIR / "derived_evidence" / "review_nlp_features.parquet"
    reviews_path = DATA_DIR / "evidence" / "reviews.parquet"

    df_clust = pd.read_parquet(clusters_path)
    df_nlp = pd.read_parquet(nlp_path)
    df_rev = pd.read_parquet(reviews_path)

    print(f"Total duplicate clusters: {len(df_clust)}")
    print(f"Total reviews in duplicate clusters: {df_clust['member_count'].sum()}")

    # Word count distribution of clusters
    word_counts = df_clust["sample_text"].apply(lambda t: len(t.split()))
    print("\nCluster text word count percentiles:")
    print(word_counts.describe().to_dict())

    # Categorize clusters into generic short phrases vs substantive duplicate text
    generic_short = df_clust[word_counts <= 3]
    substantive = df_clust[word_counts > 3]

    print(f"\nGeneric Short Phrase Clusters (<= 3 words): {len(generic_short)} ({len(generic_short)/len(df_clust)*100:.1f}%)")
    print(f"Reviews in generic short clusters: {generic_short['member_count'].sum()} ({generic_short['member_count'].sum()/df_clust['member_count'].sum()*100:.1f}%)")

    print(f"\nSubstantive Text Duplicate Clusters (> 3 words): {len(substantive)} ({len(substantive)/len(df_clust)*100:.1f}%)")
    print(f"Reviews in substantive duplicate clusters: {substantive['member_count'].sum()} ({substantive['member_count'].sum()/df_clust['member_count'].sum()*100:.1f}%)")

    print("\nTop 10 Generic Short Clusters:")
    for _, r in generic_short.sort_values(by="member_count", ascending=False).head(10).iterrows():
        print(f"  [{r['cluster_id']}] {r['member_count']:3d} revs ({r['unique_product_count']:2d} prods): '{r['sample_text']}'")

    print("\nTop 10 Substantive Duplicate Clusters:")
    for _, r in substantive.sort_values(by="member_count", ascending=False).head(10).iterrows():
        print(f"  [{r['cluster_id']}] {r['member_count']:3d} revs ({r['unique_product_count']:2d} prods): '{r['sample_text'][:80]}...'")

    # Cross-product vs intra-product duplication
    cross_prod = df_clust[df_clust["is_cross_product"] == True]
    intra_prod = df_clust[df_clust["is_cross_product"] == False]
    print(f"\nCross-product duplicate clusters: {len(cross_prod)} (members: {cross_prod['member_count'].sum()})")
    print(f"Intra-product duplicate clusters: {len(intra_prod)} (members: {intra_prod['member_count'].sum()})")

    # Confirm signal semantics (is duplicate automatically labelled fraud?)
    print("\nFraud labeling check on duplicate reviews:")
    print("Does review_nlp_features have any 'fraud' or 'fake' column?")
    fraud_cols = [c for c in df_nlp.columns if "fraud" in c.lower() or "fake" in c.lower() or "deceptive" in c.lower()]
    print(f"Fraud-related columns in review_nlp_features: {fraud_cols}")
    print("Signal columns present:", [c for c in df_nlp.columns if "SIGNAL" in c])


def audit_temporal_bursts():
    print("\n==================================================================")
    print("2. TEMPORAL BURST VALIDATION")
    print("==================================================================")
    rev_path = DATA_DIR / "evidence" / "reviews.parquet"
    nlp_path = DATA_DIR / "derived_evidence" / "review_nlp_features.parquet"

    df_rev = pd.read_parquet(rev_path)
    df_nlp = pd.read_parquet(nlp_path)

    # Inspect all timestamp/date columns
    date_cols = [c for c in df_rev.columns if "date" in c.lower() or "time" in c.lower()]
    print(f"Date/time columns in reviews.parquet: {date_cols}")
    for col in date_cols:
        non_null = df_rev[col].notna().sum()
        unique_vals = df_rev[col].nunique()
        sample = df_rev[col].dropna().iloc[0] if non_null > 0 else "N/A"
        print(f"  Column '{col}': {non_null}/{len(df_rev)} non-null, {unique_vals} unique values. Sample: '{sample}'")

    # Examine review_date vs review_timestamp vs collection_timestamp
    print("\nChecking if review_date matches review_timestamp date component:")
    if "review_date" in df_rev.columns and "review_timestamp" in df_rev.columns:
        ts_dates = df_rev["review_timestamp"].dropna().astype(str).str.slice(0, 10)
        match_rate = (df_rev["review_date"].dropna() == ts_dates).mean()
        print(f"  Match rate between review_date and review_timestamp[:10]: {match_rate*100:.2f}%")

    # Inspect why 3,454 of 3,659 appear in burst clusters
    print("\nAnalyzing why 3,454 reviews appeared in temporal burst clusters:")
    burst_revs = df_nlp[df_nlp["is_temporal_burst"] == True]
    print(f"Total reviews flagged is_temporal_burst: {len(burst_revs)} / {len(df_nlp)} ({len(burst_revs)/len(df_nlp)*100:.1f}%)")

    # Check reviews per (product, date)
    rev_grouped = df_rev.groupby(["canonical_product_id", "review_date"]).size()
    print("Reviews per (product, date) distribution:")
    print(rev_grouped.describe().to_dict())
    print(f"Total (product, date) pairs: {len(rev_grouped)}")
    print(f"(product, date) pairs with >= 3 reviews: {(rev_grouped >= 3).sum()}")
    print(f"(product, date) pairs with >= 5 reviews: {(rev_grouped >= 5).sum()}")
    print(f"(product, date) pairs with >= 10 reviews: {(rev_grouped >= 10).sum()}")
    print(f"Max reviews on a single product on a single date: {rev_grouped.max()}")

    # Check marketplaces
    print("\nMarketplace distribution of burst reviews:")
    print(df_rev.loc[burst_revs.index, "marketplace"].value_counts().to_dict())

    # Date granularity check
    print("\nTime component in review_timestamp:")
    has_nonzero_time = df_rev["review_timestamp"].dropna().apply(lambda x: "T00:00:00" not in str(x)).sum()
    print(f"Reviews with non-midnight timestamp: {has_nonzero_time} / {len(df_rev)}")


def audit_image_similarity():
    print("\n==================================================================")
    print("3. IMAGE SIMILARITY & EMBEDDING VALIDATION")
    print("==================================================================")
    pairs_path = DATA_DIR / "derived_evidence" / "image_similarity_pairs.parquet"
    clusters_path = DATA_DIR / "derived_evidence" / "image_clusters.parquet"
    features_path = DATA_DIR / "derived_evidence" / "image_intelligence_features.parquet"
    npz_path = DATA_DIR / "derived_evidence" / "visual_embeddings_resnet18.npz"

    df_pairs = pd.read_parquet(pairs_path)
    df_clust = pd.read_parquet(clusters_path)
    df_feat = pd.read_parquet(features_path)
    npz = np.load(npz_path)

    print(f"Total similarity pairs (threshold >= 0.90): {len(df_pairs)}")
    print(f"Pairs with similarity >= 0.95: {(df_pairs['similarity_score'] >= 0.95).sum()}")
    print(f"Pairs with similarity >= 0.98: {(df_pairs['similarity_score'] >= 0.98).sum()}")

    # Verify centering consistency
    raw_emb = npz["normalized_embeddings"]
    mean_vec = np.mean(raw_emb, axis=0, keepdims=True)
    centered = raw_emb - mean_vec
    centered_norm = centered / np.linalg.norm(centered, axis=1, keepdims=True)

    # Check sample pair from pairs_df
    sample_pair = df_pairs.iloc[0]
    img1, img2 = sample_pair["image_id_1"], sample_pair["image_id_2"]
    img_ids = list(npz["image_ids"])
    idx1, idx2 = img_ids.index(img1), img_ids.index(img2)
    computed_sim = float(np.dot(centered_norm[idx1], centered_norm[idx2]))
    recorded_sim = sample_pair["similarity_score"]
    print(f"\nCentering consistency check on sample pair ({img1}, {img2}):")
    print(f"  Recorded sim: {recorded_sim}, Computed centered sim: {computed_sim:.4f}")
    assert abs(recorded_sim - computed_sim) < 1e-3, "Centering inconsistency detected!"
    print("  Centering calculation verified exact match.")

    # Exact file duplicates vs visual similarity
    exact_dup_images = df_feat[df_feat["is_exact_file_duplicate"] == True]
    print(f"\nExact file duplicates (SHA-256 match): {len(exact_dup_images)} images across {exact_dup_images['sha256_hash'].nunique()} hashes")

    # Cross-product matches
    cross_prod_pairs = df_pairs[df_pairs["is_cross_product"] == True]
    intra_prod_pairs = df_pairs[df_pairs["is_cross_product"] == False]
    print(f"\nCross-product image pairs: {len(cross_prod_pairs)} / {len(df_pairs)} ({len(cross_prod_pairs)/len(df_pairs)*100:.1f}%)")
    print(f"Intra-product image pairs: {len(intra_prod_pairs)} / {len(df_pairs)} ({len(intra_prod_pairs)/len(df_pairs)*100:.1f}%)")

    # Inspect representative cross-product pairs
    print("\nSample Cross-Product Image Pairs at cos >= 0.95:")
    df_prods = pd.read_parquet(DATA_DIR / "entities" / "products.parquet")
    sample_cross = cross_prod_pairs[cross_prod_pairs["similarity_score"] >= 0.95].head(5)
    for _, r in sample_cross.iterrows():
        p1 = df_prods[df_prods["canonical_product_id"] == r["canonical_product_id_1"]].iloc[0]
        p2 = df_prods[df_prods["canonical_product_id"] == r["canonical_product_id_2"]].iloc[0]
        print(f"  [{r['similarity_score']:.4f}] {r['canonical_product_id_1']} (Brand: {p1['brand']}, Cat: {p1['category']}) <-> {r['canonical_product_id_2']} (Brand: {p2['brand']}, Cat: {p2['category']})")
        print(f"    P1: {p1['product_title'][:70]}")
        print(f"    P2: {p2['product_title'][:70]}")

    # Connected-component chaining evaluation
    print("\nConnected Component Chaining Evaluation:")
    print(f"Total visual clusters: {len(df_clust)}")
    cluster_sizes = df_clust["image_count"]
    print(f"Cluster size distribution: min={cluster_sizes.min()}, median={cluster_sizes.median()}, mean={cluster_sizes.mean():.1f}, max={cluster_sizes.max()}")
    print(f"Clusters with size == 2: {(cluster_sizes == 2).sum()} ({(cluster_sizes == 2).mean()*100:.1f}%)")
    print(f"Clusters with size 3-5: {((cluster_sizes >= 3) & (cluster_sizes <= 5)).sum()}")
    print(f"Clusters with size > 10: {(cluster_sizes > 10).sum()}")

    # Check largest cluster for diameter / chaining
    largest_cid = df_clust.loc[cluster_sizes.idxmax(), "cluster_id"]
    largest_imgs = df_clust.loc[cluster_sizes.idxmax(), "member_image_ids"]
    print(f"\nLargest cluster '{largest_cid}' has {len(largest_imgs)} images.")
    # Check pairwise similarities within largest cluster
    largest_indices = [img_ids.index(iid) for iid in largest_imgs if iid in img_ids]
    sub_emb = centered_norm[largest_indices]
    sub_sims = np.dot(sub_emb, sub_emb.T)
    off_diag_sub = sub_sims[~np.eye(len(largest_indices), dtype=bool)]
    print(f"  Within-cluster pairwise similarity min={off_diag_sub.min():.3f}, mean={off_diag_sub.mean():.3f}, max={off_diag_sub.max():.3f}")


def audit_multimodal_risk():
    print("\n==================================================================")
    print("4. MULTIMODAL RISK AGGREGATION & ZERO-PENALTY INVARIANT")
    print("==================================================================")
    summary_path = DATA_DIR / "derived_evidence" / "product_multimodal_summary.parquet"
    atomic_path = DATA_DIR / "derived_evidence" / "multimodal_evidence_records.parquet"

    df_sum = pd.read_parquet(summary_path)
    df_atomic = pd.read_parquet(atomic_path)

    print(f"Total products in multimodal summary: {len(df_sum)}")
    print(f"Provisional risk tier distribution:\n{df_sum['provisional_risk_tier'].value_counts().to_dict()}")

    # Missing modality zero penalty check
    print("\nChecking Missing Modality Handling:")
    # 1. Zero reviews
    zero_rev = df_sum[df_sum["review_count"] == 0]
    print(f"Products with 0 reviews: {len(zero_rev)}")
    print(f"  review_modality_status values: {zero_rev['review_modality_status'].value_counts().to_dict()}")
    print(f"  review_risk_signal values: {zero_rev['review_risk_signal'].value_counts().to_dict()}")
    print(f"  mean_sentiment_score all null: {zero_rev['mean_sentiment_score'].isna().all()}")

    # 2. Zero images
    zero_img = df_sum[df_sum["usable_image_count"] == 0]
    print(f"Products with 0 images: {len(zero_img)}")
    print(f"  image_modality_status values: {zero_img['image_modality_status'].value_counts().to_dict()}")
    print(f"  image_risk_signal values: {zero_img['image_risk_signal'].value_counts().to_dict()}")

    # 3. Risk tier for sparse products
    print(f"Sparse products risk tier distribution:\n{zero_img['provisional_risk_tier'].value_counts().to_dict()}")

    # Inspect representative products from all 4 risk tiers
    print("\nRepresentative Products from each Risk Tier:")
    for tier in ["UNASSESSED_SPARSE_DATA", "LOW_OBSERVED_ANOMALY", "MODERATE_SINGLE_MODALITY_ANOMALY", "ELEVATED_MULTIMODAL_ANOMALY"]:
        sub = df_sum[df_sum["provisional_risk_tier"] == tier]
        if len(sub) == 0:
            print(f"\n--- Tier: {tier} (0 products) ---")
            print("  No products currently in this tier.")
            continue
        sample = sub.iloc[0]
        print(f"\n--- Tier: {tier} ({len(sub)} products) ---")
        print(f"  Sample Product ID: {sample['canonical_product_id']}")
        print(f"  Marketplace: {sample['marketplace']}, Brand: {sample['brand']}, Category: {sample['category']}")
        print(f"  Reviews: count={sample['review_count']}, signal={sample['review_risk_signal']}")
        print(f"  Images: count={sample['usable_image_count']}, signal={sample['image_risk_signal']}")
        print(f"  Pricing: outlier={sample['is_price_outlier']}, signal={sample['price_risk_signal']}")
        print(f"  Active Risk Flags: {sample['active_risk_flag_count']}")

    # Correlated signals double counting check
    print("\nCorrelated Signals Double-Counting Check:")
    print("How are active_risk_flag_count calculated?")
    # In evidence_fusion: active_risk_flags = sum([has_rev_risk, has_img_risk, has_price_risk])
    # Exactly 1 boolean per modality!
    print("  active_risk_flag_count is calculated as the sum of 3 binary modality-level flags:")
    print("  [has_rev_risk, has_img_risk, has_price_risk]")
    print(f"  Max possible active_risk_flag_count: 3")
    print(f"  Observed active_risk_flag_count distribution: {df_sum['active_risk_flag_count'].value_counts().to_dict()}")


if __name__ == "__main__":
    audit_review_duplicates()
    audit_temporal_bursts()
    audit_image_similarity()
    audit_multimodal_risk()
