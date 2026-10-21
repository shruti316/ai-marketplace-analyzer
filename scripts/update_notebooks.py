"""
scripts/update_notebooks.py
---------------------------
Updates and refactors notebook files:
- 04_nlp_analysis.ipynb: Clearly separates the core marketplace NLP pipeline from the isolated hotel deception benchmark.
- 01_eda.ipynb, 02_data_cleaning.ipynb, 03_text_features.ipynb: Adds Path.cwd() resolution and documentation on foundational baseline vs. canonical platform datasets.
"""

import os
import json
from pathlib import Path


def update_notebook_04():
    nb_cells = [
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "# Week 3 — Natural Language Processing & Review Trust Intelligence\n",
                "## AI-Powered Marketplace Trust Intelligence Platform\n",
                "\n",
                "### Scope & Architecture\n",
                "This notebook evaluates customer review text across multiple dimensions to uncover explainable risk signals:\n",
                "1. **Intra-Listing Review Similarity:** Detects repetitive wording and copy-paste review rings within the same product listing.\n",
                "2. **Rating–Sentiment Discordance:** Identifies disconnects between numeric star ratings and text sentiment polarity.\n",
                "3. **Writing Style & Stylometry:** Extracts uppercase density, exclamation bursts, and punctuation repetition.\n",
                "4. **Multi-Category Generalization:** Validates review signals across Electronics, Beauty, Fashion, Home, Toys, and Books.\n",
                "5. **Isolated Benchmark Experiment:** Evaluates an external deception benchmark (Ott et al.) strictly in isolation, without conflating hotel reviews with marketplace product risk.\n"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": ["## 1. Load Baseline Processed Dataset\n"]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "from pathlib import Path\n",
                "import pandas as pd\n",
                "\n",
                "project_root = Path.cwd()\n",
                "if not (project_root / 'data').exists():\n",
                "    project_root = project_root.parent\n",
                "\n",
                "baseline_path = project_root / 'data' / 'processed' / 'marketplace_text_features.parquet'\n",
                "df = pd.read_parquet(baseline_path)\n",
                "\n",
                "print('Dataset shape:', df.shape)\n",
                "print('Review text missing:', df['review_text'].isna().sum())\n",
                "print('Unique ratings:', sorted(df['rating'].dropna().unique()))\n",
                "display(df[['rating', 'review_text']].sample(min(5, len(df)), random_state=42))\n"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": ["## 2. Text Normalization & Global Vocabulary\n"]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "from sklearn.feature_extraction.text import TfidfVectorizer\n",
                "\n",
                "# Create clean NLP text column\n",
                "df['nlp_text'] = (\n",
                "    df['review_text']\n",
                "    .astype('string')\n",
                "    .str.lower()\n",
                "    .str.replace(r'\\s+', ' ', regex=True)\n",
                "    .str.strip()\n",
                ")\n",
                "\n",
                "nlp_df = df[df['nlp_text'].notna() & df['nlp_text'].str.strip().ne('')].copy()\n",
                "print('Total usable reviews:', len(nlp_df))\n",
                "print('Unique normalized reviews:', nlp_df['nlp_text'].nunique())\n",
                "\n",
                "tfidf = TfidfVectorizer(stop_words='english', max_features=5000, ngram_range=(1, 2), min_df=2)\n",
                "X_tfidf = tfidf.fit_transform(nlp_df['nlp_text'])\n",
                "print('TF-IDF matrix shape:', X_tfidf.shape)\n",
                "print('Vocabulary size:', len(tfidf.vocabulary_))\n"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": ["## 3. Intra-Product Review Similarity Analysis (Dense Cohort)\n"]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "from sklearn.metrics.pairwise import cosine_similarity\n",
                "\n",
                "dense_reviews_path = project_root / 'data' / 'interim' / 'dense_reviews.parquet'\n",
                "dense_df = pd.read_parquet(dense_reviews_path)\n",
                "dense_df['nlp_text'] = (\n",
                "    dense_df['review_text']\n",
                "    .astype('string')\n",
                "    .str.lower()\n",
                "    .str.replace(r'\\s+', ' ', regex=True)\n",
                "    .str.strip()\n",
                ")\n",
                "dense_df = dense_df[dense_df['nlp_text'].notna() & dense_df['nlp_text'].ne('')].copy()\n",
                "\n",
                "print('Dense cohort reviews:', len(dense_df))\n",
                "print('Products in dense cohort:', dense_df['parent_asin'].nunique())\n",
                "\n",
                "similar_pairs = []\n",
                "for product_id, group in dense_df.groupby('parent_asin'):\n",
                "    if len(group) < 2:\n",
                "        continue\n",
                "    vec = TfidfVectorizer(stop_words='english', ngram_range=(1, 2), min_df=1, max_features=1000)\n",
                "    X = vec.fit_transform(group['nlp_text'])\n",
                "    sim_mat = cosine_similarity(X)\n",
                "    for i in range(len(group)):\n",
                "        for j in range(i + 1, len(group)):\n",
                "            score = sim_mat[i, j]\n",
                "            if score >= 0.80:\n",
                "                similar_pairs.append({\n",
                "                    'parent_asin': product_id,\n",
                "                    'similarity': round(float(score), 3),\n",
                "                    'review_1': group.iloc[i]['nlp_text'][:80],\n",
                "                    'review_2': group.iloc[j]['nlp_text'][:80],\n",
                "                })\n",
                "\n",
                "similarity_df = pd.DataFrame(similar_pairs)\n",
                "print(f'Highly similar review pairs (cosine >= 0.80): {len(similarity_df)}')\n",
                "if not similarity_df.empty:\n",
                "    display(similarity_df.head(5))\n"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": ["## 4. Sentiment Analysis & Rating–Sentiment Disagreement\n"]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "from src.nlp.review_analysis import get_sentiment_compound\n",
                "\n",
                "dense_df['sentiment_compound'] = dense_df['nlp_text'].apply(get_sentiment_compound)\n",
                "\n",
                "def rating_category(r):\n",
                "    return 'Negative' if r <= 2 else ('Neutral' if r == 3 else 'Positive')\n",
                "\n",
                "def text_sentiment_cat(s):\n",
                "    return 'Positive' if s >= 0.05 else ('Negative' if s <= -0.05 else 'Neutral')\n",
                "\n",
                "dense_df['rating_sentiment'] = dense_df['rating'].apply(rating_category)\n",
                "dense_df['text_sentiment'] = dense_df['sentiment_compound'].apply(text_sentiment_cat)\n",
                "dense_df['sentiment_disagreement'] = dense_df['rating_sentiment'] != dense_df['text_sentiment']\n",
                "\n",
                "print('Sentiment disagreement rate:', round(dense_df['sentiment_disagreement'].mean() * 100, 2), '%')\n",
                "display(pd.crosstab(dense_df['rating_sentiment'], dense_df['text_sentiment'], margins=True))\n"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 5. Multi-Category Review Analysis (Canonical Platform Dataset)\n",
                "Evaluates review distributions and sentiment dynamics across multiple categories (Electronics, Fashion, Home, Toys, Books, BestBuy).\n"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "canonical_reviews_path = project_root / 'data' / 'processed' / 'canonical_reviews.parquet'\n",
                "canonical_prods_path = project_root / 'data' / 'processed' / 'canonical_products.parquet'\n",
                "\n",
                "df_can_revs = pd.read_parquet(canonical_reviews_path)\n",
                "df_can_prods = pd.read_parquet(canonical_prods_path)\n",
                "\n",
                "# Link product categories to reviews\n",
                "cat_map = dict(zip(df_can_prods['canonical_product_id'], df_can_prods['category']))\n",
                "df_can_revs['category'] = df_can_revs['canonical_product_id'].map(cat_map).fillna('Other')\n",
                "\n",
                "print('Canonical reviews by marketplace:')\n",
                "display(df_can_revs['marketplace'].value_counts())\n",
                "print('\\nCanonical reviews by category:')\n",
                "display(df_can_revs['category'].value_counts().head(10))\n"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "---\n",
                "## 6. Isolated NLP Deception Benchmark (Ott et al. Corpus)\n",
                "\n",
                "> **CRITICAL RESEARCH BOUNDARY NOTICE**  \n",
                "> The following experiment evaluates the Ott et al. (ACL 2011, EMNLP 2013) deceptive opinion spam corpus.  \n",
                "> **This is a separate research experiment on lexical deception stylometry in hotel reviews.**  \n",
                "> - It is NOT a marketplace product risk model.  \n",
                "> - Hotel deception labels are NEVER assigned or transferred to marketplace listings.  \n",
                "> - Real-world marketplace trust intelligence relies on multi-signal evidence aggregation (Price + Reviews + Images), not hotel sentiment classifiers.  \n"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "benchmark_path = project_root / 'data' / 'raw' / 'benchmarks' / 'deceptive_opinion_spam.parquet'\n",
                "benchmark_df = pd.read_parquet(benchmark_path)\n",
                "print('Benchmark dataset shape:', benchmark_df.shape)\n",
                "display(benchmark_df.head(3))\n",
                "print('\\nClass balance:')\n",
                "display(benchmark_df['deceptive'].value_counts())\n"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "from sklearn.model_selection import GroupShuffleSplit\n",
                "from sklearn.pipeline import Pipeline\n",
                "from sklearn.linear_model import LogisticRegression\n",
                "from sklearn.metrics import classification_report, accuracy_score\n",
                "import joblib\n",
                "\n",
                "# Grouped split by hotel to strictly prevent entity leakage across folds\n",
                "gss = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=42)\n",
                "train_idx, test_idx = next(gss.split(benchmark_df['text'], benchmark_df['deceptive'], groups=benchmark_df['hotel']))\n",
                "\n",
                "train_df = benchmark_df.iloc[train_idx]\n",
                "test_df = benchmark_df.iloc[test_idx]\n",
                "\n",
                "# Verify strict hotel isolation\n",
                "assert len(set(train_df['hotel']) & set(test_df['hotel'])) == 0, 'Data leakage detected across hotel groups!'\n",
                "print('Verified group split:', len(train_df), 'train reviews,', len(test_df), 'test reviews.')\n",
                "\n",
                "model = Pipeline([\n",
                "    ('tfidf', TfidfVectorizer(ngram_range=(1, 2), max_features=3000, stop_words='english')),\n",
                "    ('classifier', LogisticRegression(max_iter=500, random_state=42)),\n",
                "])\n",
                "\n",
                "model.fit(train_df['text'], train_df['deceptive'])\n",
                "y_pred = model.predict(test_df['text'])\n",
                "acc = accuracy_score(test_df['deceptive'], y_pred)\n",
                "print(f'\\nIsolated Benchmark Test Accuracy: {acc:.4f}')\n",
                "print('\\nClassification Report:')\n",
                "print(classification_report(test_df['deceptive'], y_pred))\n",
                "\n",
                "# Save model artifact\n",
                "models_dir = project_root / 'models'\n",
                "models_dir.mkdir(parents=True, exist_ok=True)\n",
                "joblib.dump(model, models_dir / 'hotel_review_baseline.joblib')\n",
                "print('Saved baseline benchmark artifact to models/hotel_review_baseline.joblib')\n"
            ]
        }
    ]

    nb_dict = {
        "cells": nb_cells,
        "metadata": {
            "language_info": {"name": "python", "version": "3.11.9"},
            "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"}
        },
        "nbformat": 4,
        "nbformat_minor": 5
    }

    with open("notebooks/04_nlp_analysis.ipynb", "w", encoding="utf-8") as f:
        json.dump(nb_dict, f, indent=2)

    print("Updated notebooks/04_nlp_analysis.ipynb successfully!")


def update_notebook_01():
    """Ensure 01_eda.ipynb has path-independent root and clear baseline scope documentation."""
    path = "notebooks/01_eda.ipynb"
    with open(path, "r", encoding="utf-8") as f:
        nb = json.load(f)

    # Add header markdown cell if not present
    first_cell = nb["cells"][0]
    if first_cell.get("cell_type") != "markdown":
        header_cell = {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "# Week 1 — Exploratory Data Analysis (EDA)\n",
                "## AI-Powered Marketplace Trust Intelligence Platform\n",
                "\n",
                "> **Dataset Note:** This notebook documents the initial Week 1 baseline exploratory analysis on the sampled Amazon All_Beauty cohort.  \n",
                "> The platform has since expanded to a unified canonical schema (`data/processed/canonical_products.parquet`) supporting multiple product categories (Electronics, Fashion, Home, Books, Toys, Beauty) and multiple marketplaces (Amazon, Walmart, BestBuy).\n"
            ]
        }
        nb["cells"].insert(0, header_cell)

    # Fix relative load path in code cell 1
    for cell in nb["cells"]:
        if cell.get("cell_type") == "code":
            src = "".join(cell.get("source", []))
            if "all_beauty_sample.parquet" in src and "Path.cwd()" not in src:
                cell["source"] = [
                    "from pathlib import Path\n",
                    "import pandas as pd\n",
                    "import numpy as np\n",
                    "import matplotlib.pyplot as plt\n",
                    "import seaborn as sns\n",
                    "\n",
                    "project_root = Path.cwd()\n",
                    "if not (project_root / 'data').exists():\n",
                    "    project_root = project_root.parent\n",
                    "\n",
                    "# Load working baseline dataset\n",
                    "df = pd.read_parquet(project_root / 'data' / 'interim' / 'all_beauty_sample.parquet')\n",
                    "print('Dataset loaded successfully! Shape:', df.shape)\n"
                ]
                break

    with open(path, "w", encoding="utf-8") as f:
        json.dump(nb, f, indent=2)
    print("Updated notebooks/01_eda.ipynb successfully!")


def update_notebook_02():
    """Ensure 02_data_cleaning.ipynb has path-independent root and documentation."""
    path = "notebooks/02_data_cleaning.ipynb"
    with open(path, "r", encoding="utf-8") as f:
        nb = json.load(f)

    first_cell = nb["cells"][0]
    if first_cell.get("cell_type") != "markdown":
        header_cell = {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "# Week 2 — Data Cleaning & Missingness Imputation\n",
                "## AI-Powered Marketplace Trust Intelligence Platform\n",
                "\n",
                "> **Dataset Note:** Documents the data cleaning and missingness imputation on the baseline development sample.  \n",
                "> The automated production pipeline is implemented in `src/data/pipeline.py` for multi-category and multi-marketplace canonical processing.\n"
            ]
        }
        nb["cells"].insert(0, header_cell)

    for cell in nb["cells"]:
        if cell.get("cell_type") == "code":
            src = "".join(cell.get("source", []))
            if "all_beauty_sample.parquet" in src and "Path.cwd()" not in src:
                cell["source"] = [
                    "from pathlib import Path\n",
                    "import pandas as pd\n",
                    "import numpy as np\n",
                    "import matplotlib.pyplot as plt\n",
                    "import seaborn as sns\n",
                    "\n",
                    "project_root = Path.cwd()\n",
                    "if not (project_root / 'data').exists():\n",
                    "    project_root = project_root.parent\n",
                    "\n",
                    "df = pd.read_parquet(project_root / 'data' / 'interim' / 'all_beauty_sample.parquet')\n",
                    "print('Loaded dataset for cleaning. Shape:', df.shape)\n"
                ]
                break

    with open(path, "w", encoding="utf-8") as f:
        json.dump(nb, f, indent=2)
    print("Updated notebooks/02_data_cleaning.ipynb successfully!")


def update_notebook_03():
    """Ensure 03_text_features.ipynb has path-independent root."""
    path = "notebooks/03_text_features.ipynb"
    with open(path, "r", encoding="utf-8") as f:
        nb = json.load(f)

    for cell in nb["cells"]:
        if cell.get("cell_type") == "code":
            src = "".join(cell.get("source", []))
            if "marketplace_cleaned.parquet" in src and "Path.cwd()" not in src:
                cell["source"] = [
                    "from pathlib import Path\n",
                    "import pandas as pd\n",
                    "\n",
                    "project_root = Path.cwd()\n",
                    "if not (project_root / 'data').exists():\n",
                    "    project_root = project_root.parent\n",
                    "\n",
                    "df = pd.read_parquet(project_root / 'data' / 'processed' / 'marketplace_cleaned.parquet')\n",
                    "print('Loaded cleaned dataset for feature engineering. Shape:', df.shape)\n"
                ]
                break

    with open(path, "w", encoding="utf-8") as f:
        json.dump(nb, f, indent=2)
    print("Updated notebooks/03_text_features.ipynb successfully!")


if __name__ == "__main__":
    os.makedirs("scripts", exist_ok=True)
    update_notebook_04()
    update_notebook_01()
    update_notebook_02()
    update_notebook_03()
