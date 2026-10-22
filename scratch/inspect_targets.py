import json
import re

with open("notebooks/04_nlp_analysis.ipynb", "r", encoding="utf-8") as f:
    nb = json.load(f)

for idx, cell in enumerate(nb["cells"]):
    src = "".join(cell["source"])
    if "../data" in src or "Path.cwd().parent" in src or "canonical_products.parquet" in src or "canonical_reviews.parquet" in src:
        print(f"=== Cell {idx} ({cell['cell_type']}) ===")
        print(src)
        print("=" * 60)
