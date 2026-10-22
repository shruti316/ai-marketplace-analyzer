import json

with open("notebooks/04_nlp_analysis.ipynb", "r", encoding="utf-8") as f:
    nb = json.load(f)

for i in range(18, len(nb["cells"])):
    c = nb["cells"][i]
    print(f"=== Cell {i} ({c['cell_type']}) ===")
    print("".join(c["source"]))
    print("-" * 50)
