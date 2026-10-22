import json

with open("notebooks/04_nlp_analysis.ipynb", "r", encoding="utf-8") as f:
    nb = json.load(f)

for idx in [22, 23, 24, 25, 26, 27, 28]:
    c = nb["cells"][idx]
    print(f"=== Cell {idx} ===")
    print("".join(c["source"]))
    print("=" * 60)
