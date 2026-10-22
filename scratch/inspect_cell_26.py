import json

with open("notebooks/04_nlp_analysis.ipynb", "r", encoding="utf-8") as f:
    nb = json.load(f)

c26 = nb["cells"][26]
print("Cell 26 source:")
print("".join(c26["source"]))
