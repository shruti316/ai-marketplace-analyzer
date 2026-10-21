"""
scripts/update_notebooks.py
---------------------------
Updates and refactors notebook files:
- 04_nlp_analysis.ipynb: Primary marketplace NLP pipeline across canonical multi-category, multi-marketplace reviews.
- hotel_benchmark_isolated.ipynb: Quarantined research experiment on Ott et al. hotel opinion spam.
- 01_eda.ipynb, 02_data_cleaning.ipynb, 03_text_features.ipynb: Adds Path.cwd() resolution and documentation on foundational baseline vs. canonical platform datasets.
"""

import os
import json
from pathlib import Path


def update_notebook_04():
    """Generates the primary canonical marketplace NLP analysis notebook."""
    import scratch.create_notebook_04 as c4
    c4.generate_notebook_04()
    print("Updated notebooks/04_nlp_analysis.ipynb successfully!")


def update_hotel_notebook():
    """Generates the isolated hotel deception benchmark notebook."""
    import scratch.create_hotel_nb as ch
    ch.create_hotel_benchmark_notebook()
    print("Updated notebooks/hotel_benchmark_isolated.ipynb successfully!")


def update_notebook_01():
    """Ensure 01_eda.ipynb has path-independent root and clear baseline scope documentation."""
    path = "notebooks/01_eda.ipynb"
    with open(path, "r", encoding="utf-8") as f:
        nb = json.load(f)

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
    update_hotel_notebook()
    update_notebook_01()
    update_notebook_02()
    update_notebook_03()
