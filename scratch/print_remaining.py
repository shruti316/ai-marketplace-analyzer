import json

with open("notebooks/04_nlp_analysis.ipynb", "r", encoding="utf-8") as f:
    nb = json.load(f)

for idx in [25, 28, 29, 39]:
    c = nb["cells"][idx]
    print(f"=== Cell {idx} ===")
    print("".join(c["source"]))
    print()
