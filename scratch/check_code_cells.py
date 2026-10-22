import json
from pathlib import Path
import traceback

with open("notebooks/04_nlp_analysis.ipynb", "r", encoding="utf-8") as f:
    nb = json.load(f)

# Let's inspect cells from 18 to 45
code_cells = [c for c in nb["cells"] if c["cell_type"] == "code"]
print(f"Total code cells: {len(code_cells)}")
for idx, cell in enumerate(code_cells):
    src = "".join(cell["source"])
    if "canonical_products.parquet" in src or "product_review_features.parquet" in src:
        print(f"Code cell {idx + 1} has dataset paths:")
        for line in cell["source"]:
            if "parquet" in line or "Path" in line:
                print("   ", line.strip())
