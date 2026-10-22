import json
import re

with open("notebooks/04_nlp_analysis.ipynb", "r", encoding="utf-8") as f:
    nb = json.load(f)

print(f"Total cells: {len(nb['cells'])}")
patterns = [
    r"\.\./",
    r"Path\(\s*['\"]\.\.",
    r"Path\.cwd\(\)\.parent",
    r"data/processed",
    r"data/raw",
    r"canonical_",
    r"project_root",
    r"to_parquet",
    r"read_parquet",
    r"to_csv",
    r"read_csv"
]

code_idx = 0
for idx, cell in enumerate(nb["cells"]):
    if cell["cell_type"] == "code":
        code_idx += 1
    src = "".join(cell["source"])
    matched = []
    for pat in patterns:
        if re.search(pat, src):
            matched.append(pat)
    if matched:
        print(f"Cell {idx} (Code {code_idx if cell['cell_type'] == 'code' else 'MD'}) matched: {matched}")
        for line in cell["source"]:
            if any(re.search(pat, line) for pat in patterns):
                print(f"    {line.strip()}")
        print("-" * 50)
