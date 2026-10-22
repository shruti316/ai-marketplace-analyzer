import json

with open("notebooks/04_nlp_analysis.ipynb", "r", encoding="utf-8") as f:
    nb = json.load(f)

target_cells = [21, 25, 28, 29, 39, 41, 44]
for idx in target_cells:
    c = nb["cells"][idx]
    print(f"=== Cell {idx} ({c['cell_type']}) ===")
    print("".join(c["source"]))
    print("=" * 60)
