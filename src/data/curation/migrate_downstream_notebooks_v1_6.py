"""
src/data/curation/migrate_downstream_notebooks_v1_6.py
------------------------------------------------------
Appends dedicated v1.6 verification and analysis sections to notebooks 01 to 05.
Preserves all historical cells, outputs, and plots.
Generates version-specific processed artifacts:
- data/processed/marketplace_cleaned_v1_6.parquet
- data/processed/marketplace_text_features_v1_6.parquet
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
import sys
from typing import Any, Dict, List

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[3]
NOTEBOOKS_DIR = PROJECT_ROOT / "notebooks"
V16_BASE = PROJECT_ROOT / "data" / "marketplace_trust_dataset_v1.6"
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("migrate_downstream_notebooks_v1_6")


def make_cell(cell_type: str, source: str) -> Dict[str, Any]:
    lines = [line + "\n" for line in source.split("\n")]
    if lines and lines[-1].endswith("\n"):
        lines[-1] = lines[-1][:-1]
    cell: Dict[str, Any] = {
        "cell_type": cell_type,
        "metadata": {},
        "source": lines,
    }
    if cell_type == "code":
        cell["execution_count"] = None
        cell["outputs"] = []
    return cell


def migrate_01_eda() -> None:
    logger.info("Migrating 01_eda.ipynb to v1.6...")
    nb_path = NOTEBOOKS_DIR / "01_eda.ipynb"
    with open(nb_path, "r", encoding="utf-8") as f:
        nb = json.load(f)

    sources = ["".join(c["source"]) for c in nb["cells"]]
    if any("Marketplace Trust Dataset v1.6" in s for s in sources):
        logger.info("01_eda.ipynb already contains v1.6 section; skipping.")
    else:
        md_cell = make_cell("markdown", """## 16. Release v1.6 EDA — 4-Tier Modality Architecture & Seller Governance

> **v1.6 Additive Section:** Evaluates the Release v1.6 dataset (`data/marketplace_trust_dataset_v1.6/`).
> Features:
> - Formal 4-Tier Modality Coverage: Tier A Complete (305), Tier B Visual (2,506), Tier C Textual (127), Tier D Catalog (3,105).
> - Platform Operator Seller Entity Resolution with verified trust tiers and honest unobserved null handling.
> - Complete Indian marketplace representation (3,643 Indian listings across Amazon India, Flipkart, and Myntra).""")

        code_cell = make_cell("code", """# Load v1.6 dataset tables
from pathlib import Path
import pandas as pd

v16_dir = project_root / 'data' / 'marketplace_trust_dataset_v1.6'
prods_v16 = pd.read_parquet(v16_dir / 'entities' / 'products.parquet')
sellers_v16 = pd.read_parquet(v16_dir / 'entities' / 'sellers.parquet')
revs_v16 = pd.read_parquet(v16_dir / 'evidence' / 'reviews.parquet')
imgs_v16 = pd.read_parquet(v16_dir / 'evidence' / 'images.parquet')

print("=== v1.6 Verified Master Distribution ===")
print(f"Products: {len(prods_v16):,} (Indian: {(prods_v16['domain_partition'] == 'INDIAN_MARKETPLACE').sum():,}, Supplementary: {(prods_v16['domain_partition'] == 'SUPPLEMENTARY_INTERNATIONAL').sum():,})")
print(f"Sellers: {len(sellers_v16):,} platform entities (Individual products.seller_id honest nulls: {prods_v16['seller_id'].isna().sum():,})")

print("\n=== 4-Tier Modality Breakdown by Marketplace ===")
display(pd.crosstab(prods_v16['marketplace'], prods_v16['modality_tier'], margins=True))""")

        nb["cells"].extend([md_cell, code_cell])
        with open(nb_path, "w", encoding="utf-8") as f:
            json.dump(nb, f, indent=1)
        logger.info("Saved updated 01_eda.ipynb.")


def migrate_02_data_cleaning() -> None:
    logger.info("Migrating 02_data_cleaning.ipynb to v1.6...")
    nb_path = NOTEBOOKS_DIR / "02_data_cleaning.ipynb"
    with open(nb_path, "r", encoding="utf-8") as f:
        nb = json.load(f)

    sources = ["".join(c["source"]) for c in nb["cells"]]
    if any("Marketplace Trust Dataset v1.6" in s for s in sources):
        logger.info("02_data_cleaning.ipynb already contains v1.6 section; skipping.")
    else:
        md_cell = make_cell("markdown", """## 19. Release v1.6 Temporal Price Schema & Verification

> **v1.6 Additive Section:** Consumes `data/marketplace_trust_dataset_v1.6/` with temporal price observation schema and baseline batch IDs.
> Generates: `data/processed/marketplace_cleaned_v1_6.parquet`.""")

        code_cell = make_cell("code", """# Cleaned v1.6 Dataset Generation
from pathlib import Path
import pandas as pd

v16_dir = project_root / 'data' / 'marketplace_trust_dataset_v1.6'
prods_v16 = pd.read_parquet(v16_dir / 'entities' / 'products.parquet')
prices_v16 = pd.read_parquet(v16_dir / 'evidence' / 'price_observations.parquet')

cleaned_v16 = prods_v16.merge(
    prices_v16[['canonical_product_id', 'normalized_price_inr', 'is_valid_price', 'stock_status', 'collection_batch_id', 'temporal_status']],
    on='canonical_product_id',
    how='left'
)

out_path = project_root / 'data' / 'processed' / 'marketplace_cleaned_v1_6.parquet'
cleaned_v16.to_parquet(out_path, index=False)
print(f"Cleaned v1.6 dataset saved to {out_path} ({len(cleaned_v16):,} rows).")""")

        nb["cells"].extend([md_cell, code_cell])
        with open(nb_path, "w", encoding="utf-8") as f:
            json.dump(nb, f, indent=1)
        logger.info("Saved updated 02_data_cleaning.ipynb.")


def migrate_03_text_features() -> None:
    logger.info("Migrating 03_text_features.ipynb to v1.6...")
    nb_path = NOTEBOOKS_DIR / "03_text_features.ipynb"
    with open(nb_path, "r", encoding="utf-8") as f:
        nb = json.load(f)

    sources = ["".join(c["source"]) for c in nb["cells"]]
    if any("Marketplace Trust Dataset v1.6" in s for s in sources):
        logger.info("03_text_features.ipynb already contains v1.6 section; skipping.")
    else:
        md_cell = make_cell("markdown", """## 12. Release v1.6 Multilingual & Hinglish Review Features

> **v1.6 Additive Section:** Integrates script detection, language confidence, and Hinglish token density across all 56,697 reviews.
> Generates: `data/processed/marketplace_text_features_v1_6.parquet`.""")

        code_cell = make_cell("code", """# v1.6 Text Features Generation
from pathlib import Path
import pandas as pd

v16_dir = project_root / 'data' / 'marketplace_trust_dataset_v1.6'
revs_v16 = pd.read_parquet(v16_dir / 'evidence' / 'reviews.parquet')
rf_v16 = pd.read_parquet(v16_dir / 'derived_evidence' / 'review_quality_features.parquet')

merged_text_v16 = revs_v16.merge(
    rf_v16[['canonical_review_id', 'word_count', 'char_length', 'detected_script', 'detected_language', 'hinglish_density', 'is_multilingual']],
    on='canonical_review_id',
    how='left'
)

out_path = project_root / 'data' / 'processed' / 'marketplace_text_features_v1_6.parquet'
merged_text_v16.to_parquet(out_path, index=False)
print(f"v1.6 Text features dataset saved to {out_path} ({len(merged_text_v16):,} rows).")""")

        nb["cells"].extend([md_cell, code_cell])
        with open(nb_path, "w", encoding="utf-8") as f:
            json.dump(nb, f, indent=1)
        logger.info("Saved updated 03_text_features.ipynb.")


def migrate_04_nlp_analysis() -> None:
    logger.info("Migrating 04_nlp_analysis.ipynb to v1.6...")
    nb_path = NOTEBOOKS_DIR / "04_nlp_analysis.ipynb"
    with open(nb_path, "r", encoding="utf-8") as f:
        nb = json.load(f)

    sources = ["".join(c["source"]) for c in nb["cells"]]
    if any("Marketplace Trust Dataset v1.6" in s for s in sources):
        logger.info("04_nlp_analysis.ipynb already contains v1.6 section; skipping.")
    else:
        md_cell = make_cell("markdown", """## 24. Release v1.6 Leakage-Free Protocol 3 NLP Benchmarking

> **v1.6 Additive Section:** Benchmarks sentiment intelligence models on Protocol 3 (Reviewer-Held-Out Split) with 0 reviewer leakage.""")

        code_cell = make_cell("code", """# Protocol 3 NLP Benchmarking Results
import json
from pathlib import Path
import pandas as pd

v16_dir = project_root / 'data' / 'marketplace_trust_dataset_v1.6'
nlp_results_path = v16_dir / 'metadata' / 'nlp_baseline_results.json'

with open(nlp_results_path, 'r', encoding='utf-8') as f:
    nlp_res = json.load(f)

print("=== Protocol 3 NLP Benchmark Performance ===")
display(pd.DataFrame(nlp_res['baselines']).T)""")

        nb["cells"].extend([md_cell, code_cell])
        with open(nb_path, "w", encoding="utf-8") as f:
            json.dump(nb, f, indent=1)
        logger.info("Saved updated 04_nlp_analysis.ipynb.")


def migrate_05_computer_vision() -> None:
    logger.info("Migrating 05_computer_vision.ipynb to v1.6...")
    nb_path = NOTEBOOKS_DIR / "05_computer_vision.ipynb"
    with open(nb_path, "r", encoding="utf-8") as f:
        nb = json.load(f)

    sources = ["".join(c["source"]) for c in nb["cells"]]
    if any("Marketplace Trust Dataset v1.6" in s for s in sources):
        logger.info("05_computer_vision.ipynb already contains v1.6 section; skipping.")
    else:
        md_cell = make_cell("markdown", """## 39. Release v1.6 ResNet Deep Embedding Verification

> **v1.6 Additive Section:** Audits 512-dimensional deep visual embeddings extracted for all 5,228 verified marketplace listing images.""")

        code_cell = make_cell("code", """# Deep Visual Embeddings Audit
from pathlib import Path
import pandas as pd

v16_dir = project_root / 'data' / 'marketplace_trust_dataset_v1.6'
vis_meta = pd.read_parquet(v16_dir / 'derived_evidence' / 'visual_embeddings_metadata.parquet')

print("=== Visual Embeddings Master Inventory ===")
print(f"Total Embedded Images: {len(vis_meta):,}")
print(f"Embedding Architecture: {vis_meta['embedding_model'].iloc[0]}")
print(f"Vector Dimensions: {vis_meta['embedding_dim'].iloc[0]}")
print(f"Mean L2-Norm: {vis_meta['l2_norm'].mean():.4f}")
display(vis_meta.groupby('marketplace').agg(
    image_count=('image_id', 'count'),
    mean_feature_val=('embedding_mean', 'mean')
))""")

        nb["cells"].extend([md_cell, code_cell])
        with open(nb_path, "w", encoding="utf-8") as f:
            json.dump(nb, f, indent=1)
        logger.info("Saved updated 05_computer_vision.ipynb.")


def generate_processed_artifacts() -> None:
    logger.info("Generating processed feature stores for v1.6...")
    prods = pd.read_parquet(V16_BASE / "entities" / "products.parquet")
    prices = pd.read_parquet(V16_BASE / "evidence" / "price_observations.parquet")
    revs = pd.read_parquet(V16_BASE / "evidence" / "reviews.parquet")
    rf = pd.read_parquet(V16_BASE / "derived_evidence" / "review_quality_features.parquet")

    # 1. marketplace_cleaned_v1_6.parquet
    cleaned = prods.merge(
        prices[["canonical_product_id", "normalized_price_inr", "is_valid_price", "stock_status", "collection_batch_id", "temporal_status"]],
        on="canonical_product_id",
        how="left",
    )
    cleaned_path = PROCESSED_DIR / "marketplace_cleaned_v1_6.parquet"
    cleaned.to_parquet(cleaned_path, index=False)
    logger.info(f"Generated {cleaned_path} ({len(cleaned):,} rows).")

    # 2. marketplace_text_features_v1_6.parquet
    text_cols = [c for c in ["canonical_review_id", "word_count", "char_length", "detected_script", "detected_language", "hinglish_density", "is_multilingual"] if c in rf.columns]
    text_feat = revs.merge(rf[text_cols], on="canonical_review_id", how="left")
    text_feat_path = PROCESSED_DIR / "marketplace_text_features_v1_6.parquet"
    text_feat.to_parquet(text_feat_path, index=False)
    logger.info(f"Generated {text_feat_path} ({len(text_feat):,} rows).")


def main() -> None:
    migrate_01_eda()
    migrate_02_data_cleaning()
    migrate_03_text_features()
    migrate_04_nlp_analysis()
    migrate_05_computer_vision()
    generate_processed_artifacts()
    logger.info("All downstream notebooks and feature stores migrated successfully to v1.6!")


if __name__ == "__main__":
    main()
