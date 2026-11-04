"""
src/data/curation/migrate_downstream_notebooks_v1_5.py
------------------------------------------------------
Appends dedicated v1.5 verification and analysis sections to notebooks 01 to 05.
Preserves all historical cells, outputs, and plots.
Generates version-specific processed artifacts:
- data/processed/marketplace_cleaned_v1_5.parquet
- data/processed/marketplace_text_features_v1_5.parquet
"""

import sys
import json
import logging
from pathlib import Path
import pandas as pd
import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parents[3]
NOTEBOOKS_DIR = PROJECT_ROOT / "notebooks"
V15_BASE = PROJECT_ROOT / "data" / "marketplace_trust_dataset_v1.5"
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


def make_cell(cell_type: str, source: str) -> dict:
    lines = [line + "\n" for line in source.split("\n")]
    if lines and lines[-1].endswith("\n"):
        lines[-1] = lines[-1][:-1]
    cell = {
        "cell_type": cell_type,
        "metadata": {},
        "source": lines
    }
    if cell_type == "code":
        cell["execution_count"] = None
        cell["outputs"] = []
    return cell


def migrate_01_eda():
    logging.info("Migrating 01_eda.ipynb to v1.5...")
    nb_path = NOTEBOOKS_DIR / "01_eda.ipynb"
    with open(nb_path, "r", encoding="utf-8") as f:
        nb = json.load(f)

    sources = ["".join(c["source"]) for c in nb["cells"]]
    if any("Marketplace Trust Dataset v1.5" in s for s in sources):
        logging.info("01_eda.ipynb already contains v1.5 section; skipping.")
    else:
        md_cell = make_cell("markdown", """## 15. Release v1.5 EDA — Reconciled Multimodal Dataset

> **v1.5 Additive Section:** Evaluates the audited, reconciled v1.5 dataset (`data/marketplace_trust_dataset_v1.5/`).
> Features:
> - True 10-category reconciliation (Clothing & Fashion: 1,709, Beauty & Personal Care: 1,480, Electronics: 1,177, etc.).
> - Reconciled marketplace review provenance (56,697 customer reviews: BestBuy 44,965, Amazon US 8,073, Flipkart 3,260, Uncertain 240, Amazon India 159).
> - Physically verified images (5,228 usable JPEG/PNG files: Flipkart 3,208, Amazon India 1,500, Amazon US 520).""")

        code_cell = make_cell("code", """# Load v1.5 dataset tables
from pathlib import Path
import pandas as pd

v15_dir = project_root / 'data' / 'marketplace_trust_dataset_v1.5'
prods_v15 = pd.read_parquet(v15_dir / 'entities' / 'products.parquet')
revs_v15 = pd.read_parquet(v15_dir / 'evidence' / 'reviews.parquet')
imgs_v15 = pd.read_parquet(v15_dir / 'evidence' / 'images.parquet')
prices_v15 = pd.read_parquet(v15_dir / 'evidence' / 'price_observations.parquet')

print("=== v1.5 Verified Master Distribution ===")
print(f"Products: {len(prods_v15):,} (Indian: {(prods_v15['domain_partition'] == 'INDIAN_MARKETPLACE').sum():,}, Supp: {(prods_v15['domain_partition'] == 'SUPPLEMENTARY_INTERNATIONAL').sum():,})")
print(f"Reviews: {len(revs_v15):,} (Linked: {(revs_v15['linkage_type'] != 'UNLINKED').sum():,}, Unlinked: {(revs_v15['linkage_type'] == 'UNLINKED').sum():,})")
print(f"Usable Images: {imgs_v15['is_usable'].sum():,} / {len(imgs_v15):,}")
print(f"Valid Prices: {prices_v15['is_valid_price'].sum():,} / {len(prices_v15):,}")

print("\n=== Reconciled 10-Category Breakdown ===")
display(prods_v15['category'].value_counts().to_frame('Product Count'))""")

        nb["cells"].extend([md_cell, code_cell])
        with open(nb_path, "w", encoding="utf-8") as f:
            json.dump(nb, f, indent=1)
        logging.info("Saved updated 01_eda.ipynb.")


def migrate_02_data_cleaning():
    logging.info("Migrating 02_data_cleaning.ipynb to v1.5...")
    nb_path = NOTEBOOKS_DIR / "02_data_cleaning.ipynb"
    with open(nb_path, "r", encoding="utf-8") as f:
        nb = json.load(f)

    sources = ["".join(c["source"]) for c in nb["cells"]]
    if any("Marketplace Trust Dataset v1.5" in s for s in sources):
        logging.info("02_data_cleaning.ipynb already contains v1.5 section; skipping.")
    else:
        md_cell = make_cell("markdown", """## 18. Release v1.5 Data Cleaning & Normalization Pipeline

> **v1.5 Additive Section:** Consumes `data/marketplace_trust_dataset_v1.5/` with date-aware FX semantics and true category mappings.
> Generates: `data/processed/marketplace_cleaned_v1_5.parquet`.""")

        code_cell = make_cell("code", """# Cleaned v1.5 Dataset Generation
from pathlib import Path
import pandas as pd

v15_dir = project_root / 'data' / 'marketplace_trust_dataset_v1.5'
prods_v15 = pd.read_parquet(v15_dir / 'entities' / 'products.parquet')
prices_v15 = pd.read_parquet(v15_dir / 'evidence' / 'price_observations.parquet')

cleaned_v15 = prods_v15.merge(
    prices_v15[['canonical_product_id', 'normalized_price_inr', 'is_valid_price', 'stock_status', 'fx_conversion_method']],
    on='canonical_product_id',
    how='left'
)

out_path = project_root / 'data' / 'processed' / 'marketplace_cleaned_v1_5.parquet'
cleaned_v15.to_parquet(out_path, index=False)
print(f"Cleaned v1.5 dataset saved to {out_path} ({len(cleaned_v15):,} rows).")""")

        nb["cells"].extend([md_cell, code_cell])
        with open(nb_path, "w", encoding="utf-8") as f:
            json.dump(nb, f, indent=1)
        logging.info("Saved updated 02_data_cleaning.ipynb.")


def migrate_03_text_features():
    logging.info("Migrating 03_text_features.ipynb to v1.5...")
    nb_path = NOTEBOOKS_DIR / "03_text_features.ipynb"
    with open(nb_path, "r", encoding="utf-8") as f:
        nb = json.load(f)

    sources = ["".join(c["source"]) for c in nb["cells"]]
    if any("Marketplace Trust Dataset v1.5" in s for s in sources):
        logging.info("03_text_features.ipynb already contains v1.5 section; skipping.")
    else:
        md_cell = make_cell("markdown", """## 11. Release v1.5 Text Features Pipeline

> **v1.5 Additive Section:** Extracts text features across all 56,697 reviews from `data/marketplace_trust_dataset_v1.5/evidence/reviews.parquet`.
> Generates: `data/processed/marketplace_text_features_v1_5.parquet`.""")

        code_cell = make_cell("code", """# v1.5 Text Features Generation
from pathlib import Path
import pandas as pd

v15_dir = project_root / 'data' / 'marketplace_trust_dataset_v1.5'
revs_v15 = pd.read_parquet(v15_dir / 'evidence' / 'reviews.parquet')
rf_v15 = pd.read_parquet(v15_dir / 'derived_evidence' / 'review_quality_features.parquet')

merged_text_v15 = revs_v15.merge(
    rf_v15[['canonical_review_id', 'word_count', 'char_length', 'uppercase_ratio', 'exclamation_count', 'is_extreme_rating', 'is_exact_text_duplicate']],
    on='canonical_review_id',
    how='left'
)

out_path = project_root / 'data' / 'processed' / 'marketplace_text_features_v1_5.parquet'
merged_text_v15.to_parquet(out_path, index=False)
print(f"v1.5 Text features dataset saved to {out_path} ({len(merged_text_v15):,} rows).")""")

        nb["cells"].extend([md_cell, code_cell])
        with open(nb_path, "w", encoding="utf-8") as f:
            json.dump(nb, f, indent=1)
        logging.info("Saved updated 03_text_features.ipynb.")


def migrate_04_nlp_analysis():
    logging.info("Migrating 04_nlp_analysis.ipynb to v1.5...")
    nb_path = NOTEBOOKS_DIR / "04_nlp_analysis.ipynb"
    with open(nb_path, "r", encoding="utf-8") as f:
        nb = json.load(f)

    sources = ["".join(c["source"]) for c in nb["cells"]]
    if any("Marketplace Trust Dataset v1.5" in s for s in sources):
        logging.info("04_nlp_analysis.ipynb already contains v1.5 section; skipping.")
    else:
        md_cell = make_cell("markdown", """## 23. Release v1.5 NLP Quality & Deception Analysis

> **v1.5 Additive Section:** Audits language identification (English vs Hinglish vs Native Indic) and evaluates the isolated Ott benchmark.""")

        code_cell = make_cell("code", """# NLP Audit and Deception Baseline Evaluation
from pathlib import Path
import pandas as pd
from src.nlp.nlp_intelligence_v1_5 import NLPIntelligenceEngineV15

v15_dir = project_root / 'data' / 'marketplace_trust_dataset_v1.5'
revs_v15 = pd.read_parquet(v15_dir / 'evidence' / 'reviews.parquet')
bench_v15 = pd.read_parquet(v15_dir / 'collections' / 'isolated_benchmarks' / 'deceptive_opinion_spam.parquet')

lang_audit = NLPIntelligenceEngineV15.audit_language_composition(revs_v15)
print("=== Linguistic Breakdown ===")
print(lang_audit['percentages'])

bench_res = NLPIntelligenceEngineV15.evaluate_isolated_deceptive_spam_benchmark(bench_v15)
print("\n=== Ott Deception Baseline Performance ===")
display(pd.DataFrame(bench_res['models']).T)""")

        nb["cells"].extend([md_cell, code_cell])
        with open(nb_path, "w", encoding="utf-8") as f:
            json.dump(nb, f, indent=1)
        logging.info("Saved updated 04_nlp_analysis.ipynb.")


def migrate_05_computer_vision():
    logging.info("Migrating 05_computer_vision.ipynb to v1.5...")
    nb_path = NOTEBOOKS_DIR / "05_computer_vision.ipynb"
    with open(nb_path, "r", encoding="utf-8") as f:
        nb = json.load(f)

    sources = ["".join(c["source"]) for c in nb["cells"]]
    if any("Marketplace Trust Dataset v1.5" in s for s in sources):
        logging.info("05_computer_vision.ipynb already contains v1.5 section; skipping.")
    else:
        md_cell = make_cell("markdown", """## 38. Release v1.5 Visual Integrity Intelligence

> **v1.5 Additive Section:** Audits visual assets, exact SHA-256 duplicates, and perceptual dHash collisions.""")

        code_cell = make_cell("code", """# Visual Taxonomy and Integrity Audit
from pathlib import Path
import pandas as pd
from src.vision.vision_intelligence_v1_5 import VisionIntelligenceEngineV15

v15_dir = project_root / 'data' / 'marketplace_trust_dataset_v1.5'
imgs_v15 = pd.read_parquet(v15_dir / 'evidence' / 'images.parquet')

vis_audit = VisionIntelligenceEngineV15.audit_visual_taxonomy(imgs_v15)
print("=== Visual Asset Taxonomy ===")
print(f"Total Usable Images: {vis_audit['total_usable_images']:,}")
print(f"Exact SHA-256 Duplicates: {vis_audit['exact_sha256_duplicates']}")
print(f"dHash Perceptual Collisions: {vis_audit['perceptual_dhash_collisions']}")
print(f"Resolution Breakdown: {vis_audit['resolution_breakdown']}")""")

        nb["cells"].extend([md_cell, code_cell])
        with open(nb_path, "w", encoding="utf-8") as f:
            json.dump(nb, f, indent=1)
        logging.info("Saved updated 05_computer_vision.ipynb.")


def generate_processed_artifacts():
    logging.info("Generating processed feature stores for v1.5...")
    prods = pd.read_parquet(V15_BASE / "entities" / "products.parquet")
    prices = pd.read_parquet(V15_BASE / "evidence" / "price_observations.parquet")
    revs = pd.read_parquet(V15_BASE / "evidence" / "reviews.parquet")
    rf = pd.read_parquet(V15_BASE / "derived_evidence" / "review_quality_features.parquet")

    # 1. marketplace_cleaned_v1_5.parquet
    cleaned = prods.merge(
        prices[["canonical_product_id", "normalized_price_inr", "is_valid_price", "stock_status", "fx_conversion_method"]],
        on="canonical_product_id",
        how="left"
    )
    cleaned_path = PROCESSED_DIR / "marketplace_cleaned_v1_5.parquet"
    cleaned.to_parquet(cleaned_path, index=False)
    logging.info(f"Generated {cleaned_path} ({len(cleaned)} rows).")

    # 2. marketplace_text_features_v1_5.parquet
    text_feat = revs.merge(
        rf[["canonical_review_id", "word_count", "char_length", "uppercase_ratio", "exclamation_count", "is_extreme_rating", "is_exact_text_duplicate"]],
        on="canonical_review_id",
        how="left"
    )
    text_feat_path = PROCESSED_DIR / "marketplace_text_features_v1_5.parquet"
    text_feat.to_parquet(text_feat_path, index=False)
    logging.info(f"Generated {text_feat_path} ({len(text_feat)} rows).")


def main():
    migrate_01_eda()
    migrate_02_data_cleaning()
    migrate_03_text_features()
    migrate_04_nlp_analysis()
    migrate_05_computer_vision()
    generate_processed_artifacts()
    logging.info("All downstream notebooks and feature stores migrated successfully to v1.5!")


if __name__ == "__main__":
    main()
