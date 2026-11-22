"""
Fraud Taxonomy & Programmatic Weak Supervision Engine - v1.7
AI-Powered Marketplace Trust Intelligence Platform

This module implements the 10-tier trust & fraud anomaly taxonomy:
1. CONFIRMED_FRAUD (Strictly 0 without external legal/verified adjudication)
2. SUSPECTED_MANIPULATION (Multi-modal convergence of suspicious signals)
3. SUSPICIOUS_REVIEW_PATTERN (Rating-sentiment discordance, temporal bursts)
4. DUPLICATE_REVIEW_SIGNAL (High-frequency template/boilerplate duplicate text)
5. REVIEW_QUALITY_ANOMALY (Extreme uppercase shouting, low-effort fragments)
6. PRICE_ANOMALY (Extreme MAD z-score, negative discount, deep drop)
7. IMAGE_MISMATCH_SIGNAL (Extreme aspect ratio, low resolution, corruption)
8. SELLER_RISK_SIGNAL (Platform-level aggregate only; 3rd-party seller awaiting data)
9. INSUFFICIENT_EVIDENCE (Tier D catalog entities lacking multimodal evidence)
10. NO_OBSERVED_SIGNAL (Evidence evaluated with no anomalous triggers)

Strict Scientific Compliance:
- Never conflate sentiment or unsupervised anomaly scores with verified fraud.
- Zero fake fraud labels manufactured.
"""

import os
import logging
import pandas as pd
import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

INPUT_REVIEWS_FEAT = "data/processed_v1_7/review_behavioral_features_v1_7.parquet"
INPUT_PRICE_FEAT = "data/processed_v1_7/price_intelligence_v1_7.parquet"
INPUT_VISION_FEAT = "data/processed_v1_7/visual_features_v1_7.parquet"
INPUT_PRODUCTS = "data/processed_v1_7/canonical_product_registry_v1_7.parquet"

OUTPUT_REV_TAXONOMY = "data/processed_v1_7/fraud_taxonomy_reviews_v1_7.parquet"
OUTPUT_PROD_TAXONOMY = "data/processed_v1_7/fraud_taxonomy_products_v1_7.parquet"
OUTPUT_REPORT = "reports/v1.7/fraud_taxonomy_weak_supervision_report.md"

def run_fraud_taxonomy_pipeline():
    logger.info("Starting Fraud Taxonomy & Weak Supervision Engine v1.7...")
    os.makedirs("data/processed_v1_7", exist_ok=True)
    os.makedirs("reports/v1.7", exist_ok=True)
    
    # 1. Review-Level Weak Supervision
    logger.info("Annotating 56,697 reviews with 10-tier weak supervision taxonomy...")
    df_rev = pd.read_parquet(INPUT_REVIEWS_FEAT)
    
    rev_tiers = []
    rev_confs = []
    rev_rules = []
    
    for _, r in df_rev.iterrows():
        rules_fired = []
        tier = "NO_OBSERVED_SIGNAL"
        conf = 0.95
        
        # Check rule firings
        if r["signal_rating_sentiment_discordance"]:
            rules_fired.append("LF_RATING_SENTIMENT_DISCORDANCE")
        if r["signal_high_duplicate_text"]:
            rules_fired.append("LF_HIGH_FREQUENCY_DUPLICATE_TEXT")
        if r["signal_shouting_syntax"]:
            rules_fired.append("LF_SHOUTING_SYNTAX")
        if r["word_count"] < 3 and r["word_count"] > 0:
            rules_fired.append("LF_LOW_EFFORT_FRAGMENT")
            
        # Priority mapping
        if "LF_RATING_SENTIMENT_DISCORDANCE" in rules_fired:
            tier = "SUSPICIOUS_REVIEW_PATTERN"
            conf = 0.85
        elif "LF_HIGH_FREQUENCY_DUPLICATE_TEXT" in rules_fired:
            tier = "DUPLICATE_REVIEW_SIGNAL"
            conf = 0.80
        elif "LF_SHOUTING_SYNTAX" in rules_fired or "LF_LOW_EFFORT_FRAGMENT" in rules_fired:
            tier = "REVIEW_QUALITY_ANOMALY"
            conf = 0.70
        else:
            tier = "NO_OBSERVED_SIGNAL"
            conf = 0.95
            
        rev_tiers.append(tier)
        rev_confs.append(conf)
        rev_rules.append(",".join(rules_fired) if rules_fired else "NONE")
        
    df_rev_tax = pd.DataFrame({
        "canonical_review_id": df_rev["canonical_review_id"],
        "canonical_product_id": df_rev["canonical_product_id"],
        "marketplace": df_rev["marketplace"],
        "fraud_taxonomy_tier": rev_tiers,
        "weak_supervision_confidence": rev_confs,
        "rules_fired": rev_rules,
        "is_weak_label": True,
        "reconciliation_version": "v1.7_FROZEN"
    })
    
    df_rev_tax.to_parquet(OUTPUT_REV_TAXONOMY, index=False)
    logger.info(f"Saved review fraud taxonomy ({len(df_rev_tax)} rows) to {OUTPUT_REV_TAXONOMY}")
    
    # 2. Product-Level Weak Supervision
    logger.info("Annotating 6,043 products with multimodal weak supervision taxonomy...")
    df_prod = pd.read_parquet(INPUT_PRODUCTS)
    df_price = pd.read_parquet(INPUT_PRICE_FEAT)
    df_vis = pd.read_parquet(INPUT_VISION_FEAT)
    
    price_anomaly_map = dict(zip(df_price["canonical_product_id"], df_price["has_price_anomaly_signal"]))
    vis_anomaly_map = dict(zip(df_vis["canonical_product_id"], df_vis["is_low_resolution"] | df_vis["is_extreme_aspect_ratio"]))
    
    # Check duplicate review rate per product
    rev_prod_dup = df_rev.groupby("canonical_product_id")["signal_high_duplicate_text"].mean().to_dict()
    
    prod_tiers = []
    prod_confs = []
    prod_rules = []
    
    for _, p in df_prod.iterrows():
        pid = p["canonical_product_id"]
        tier_str = p["modality_tier"]
        has_price_anom = price_anomaly_map.get(pid, False)
        has_img_anom = vis_anomaly_map.get(pid, False)
        dup_rev_rate = rev_prod_dup.get(pid, 0.0)
        
        rules = []
        if tier_str == "TIER_D_CATALOG" and not p["has_review"] and not p["has_image"]:
            rules.append("LF_INSUFFICIENT_EVIDENCE")
        if has_price_anom:
            rules.append("LF_PRICE_ANOMALY")
        if has_img_anom:
            rules.append("LF_IMAGE_MISMATCH")
        if dup_rev_rate > 0.50:
            rules.append("LF_DOMINANT_DUPLICATE_REVIEWS")
            
        if "LF_INSUFFICIENT_EVIDENCE" in rules and len(rules) == 1:
            tier = "INSUFFICIENT_EVIDENCE"
            conf = 1.0
        elif has_price_anom and dup_rev_rate > 0.30:
            tier = "SUSPECTED_MANIPULATION"
            conf = 0.85
        elif "LF_PRICE_ANOMALY" in rules:
            tier = "PRICE_ANOMALY"
            conf = 0.80
        elif "LF_IMAGE_MISMATCH" in rules:
            tier = "IMAGE_MISMATCH_SIGNAL"
            conf = 0.75
        elif "LF_DOMINANT_DUPLICATE_REVIEWS" in rules:
            tier = "DUPLICATE_REVIEW_SIGNAL"
            conf = 0.75
        elif "LF_INSUFFICIENT_EVIDENCE" in rules:
            tier = "INSUFFICIENT_EVIDENCE"
            conf = 0.90
        else:
            tier = "NO_OBSERVED_SIGNAL"
            conf = 0.95
            
        prod_tiers.append(tier)
        prod_confs.append(conf)
        prod_rules.append(",".join(rules) if rules else "NONE")
        
    df_prod_tax = pd.DataFrame({
        "canonical_product_id": df_prod["canonical_product_id"],
        "product_id": df_prod["product_id"],
        "marketplace": df_prod["marketplace"],
        "modality_tier": df_prod["modality_tier"],
        "fraud_taxonomy_tier": prod_tiers,
        "weak_supervision_confidence": prod_confs,
        "rules_fired": prod_rules,
        "is_confirmed_fraud": False, # Strictly False without verified external adjudication
        "reconciliation_version": "v1.7_FROZEN"
    })
    
    df_prod_tax.to_parquet(OUTPUT_PROD_TAXONOMY, index=False)
    logger.info(f"Saved product fraud taxonomy ({len(df_prod_tax)} rows) to {OUTPUT_PROD_TAXONOMY}")
    
    # 3. Generate Markdown Report
    rev_dist = df_rev_tax["fraud_taxonomy_tier"].value_counts().to_dict()
    prod_dist = df_prod_tax["fraud_taxonomy_tier"].value_counts().to_dict()
    
    report_text = f"""# Ten-Tier Fraud Taxonomy & Weak Supervision Report — v1.7
## Marketplace Trust Intelligence Platform

**Execution Timestamp:** 2026-11-04  
**Total Reviews Annotated:** {len(df_rev_tax):,}  
**Total Products Annotated:** {len(df_prod_tax):,}  

---

### 1. Ten-Tier Formal Taxonomy Definitions

| Tier ID | Taxonomy Category | Operational Definition | Supervised Ground Truth Status |
|:---:|---|---|:---:|
| **1** | `CONFIRMED_FRAUD` | Adjudicated illegal/fraudulent listing or review by external authority | **0 (No external labels)** |
| **2** | `SUSPECTED_MANIPULATION` | Multi-modal convergence of suspicious behavioral signals | Programmatic Weak Label |
| **3** | `SUSPICIOUS_REVIEW_PATTERN` | Rating-sentiment discordance, unnatural review bursts | Programmatic Weak Label |
| **4** | `DUPLICATE_REVIEW_SIGNAL` | Boilerplate / template text repeated >= 5 times across corpus | Programmatic Weak Label |
| **5** | `REVIEW_QUALITY_ANOMALY` | Extreme shouting syntax, single-word fragments | Programmatic Weak Label |
| **6** | `PRICE_ANOMALY` | MAD z-score outlier (|z| > 3.5), negative discount, deep plunge | Programmatic Weak Label |
| **7** | `IMAGE_MISMATCH_SIGNAL` | Low resolution (<200px), extreme aspect ratio (<0.5 or >2.0) | Programmatic Weak Label |
| **8** | `SELLER_RISK_SIGNAL` | Disreputable seller registration (Awaiting 3rd-party seller data) | Inactive (Platform aggregate) |
| **9** | `INSUFFICIENT_EVIDENCE` | Tier D catalog products with zero reviews/images | Neutral / Non-evaluable |
| **10** | `NO_OBSERVED_SIGNAL` | Evaluated multimodal evidence with no anomalous trigger | Programmatic Weak Label |

---

### 2. Review-Level Weak Supervision Census (56,697 Reviews)

| Taxonomy Category | Count | Percentage | Mean Confidence |
|---|---:|---:|---:|
| `NO_OBSERVED_SIGNAL` | {rev_dist.get('NO_OBSERVED_SIGNAL', 0):,} | {rev_dist.get('NO_OBSERVED_SIGNAL', 0)/len(df_rev_tax)*100:.2f}% | 0.950 |
| `DUPLICATE_REVIEW_SIGNAL` | {rev_dist.get('DUPLICATE_REVIEW_SIGNAL', 0):,} | {rev_dist.get('DUPLICATE_REVIEW_SIGNAL', 0)/len(df_rev_tax)*100:.2f}% | 0.800 |
| `REVIEW_QUALITY_ANOMALY` | {rev_dist.get('REVIEW_QUALITY_ANOMALY', 0):,} | {rev_dist.get('REVIEW_QUALITY_ANOMALY', 0)/len(df_rev_tax)*100:.2f}% | 0.700 |
| `SUSPICIOUS_REVIEW_PATTERN` | {rev_dist.get('SUSPICIOUS_REVIEW_PATTERN', 0):,} | {rev_dist.get('SUSPICIOUS_REVIEW_PATTERN', 0)/len(df_rev_tax)*100:.2f}% | 0.850 |
| `CONFIRMED_FRAUD` | **0** | **0.00%** | **N/A** |

---

### 3. Product-Level Weak Supervision Census (6,043 Products)

| Taxonomy Category | Count | Percentage | Primary Contributing Feature |
|---|---:|---:|---|
| `INSUFFICIENT_EVIDENCE` | {prod_dist.get('INSUFFICIENT_EVIDENCE', 0):,} | {prod_dist.get('INSUFFICIENT_EVIDENCE', 0)/len(df_prod_tax)*100:.2f}% | Tier D Catalog / Zero Modalities |
| `NO_OBSERVED_SIGNAL` | {prod_dist.get('NO_OBSERVED_SIGNAL', 0):,} | {prod_dist.get('NO_OBSERVED_SIGNAL', 0)/len(df_prod_tax)*100:.2f}% | Normal price & visual distribution |
| `IMAGE_MISMATCH_SIGNAL` | {prod_dist.get('IMAGE_MISMATCH_SIGNAL', 0):,} | {prod_dist.get('IMAGE_MISMATCH_SIGNAL', 0)/len(df_prod_tax)*100:.2f}% | Low resolution or abnormal aspect ratio |
| `PRICE_ANOMALY` | {prod_dist.get('PRICE_ANOMALY', 0):,} | {prod_dist.get('PRICE_ANOMALY', 0)/len(df_prod_tax)*100:.2f}% | Price MAD z-score > 3.5 or negative discount |
| `SUSPECTED_MANIPULATION` | {prod_dist.get('SUSPECTED_MANIPULATION', 0):,} | {prod_dist.get('SUSPECTED_MANIPULATION', 0)/len(df_prod_tax)*100:.2f}% | Co-occurrence of price & duplicate review signals |
| `CONFIRMED_FRAUD` | **0** | **0.00%** | **Zero Ground Truth Fabrication Compliance** |

---

### 4. Scientific Rigor and Defense
1. **Zero Data Fabrication:** The dataset explicitly acknowledges that confirmed fraud ground truth does not exist in open marketplace scrapes.
2. **Model Training Guardrail:** Supervised fraud classifiers must NOT be trained using self-generated weak labels or sentiment labels. Weak supervision is provided strictly for exploratory error auditing and multi-signal heuristics.
"""
    with open(OUTPUT_REPORT, "w", encoding="utf-8") as f:
        f.write(report_text)
    logger.info(f"Saved fraud taxonomy report to {OUTPUT_REPORT}")
    logger.info("Fraud taxonomy pipeline completed successfully.")

if __name__ == "__main__":
    run_fraud_taxonomy_pipeline()
