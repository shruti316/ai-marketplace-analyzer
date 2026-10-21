import json
from pathlib import Path
import pandas as pd

def inspect_notebook(path):
    print(f"==================================================")
    print(f"NOTEBOOK: {path}")
    print(f"==================================================")
    with open(path, "r", encoding="utf-8") as f:
        nb = json.load(f)
    for i, cell in enumerate(nb["cells"]):
        ctype = cell["cell_type"]
        src = "".join(cell["source"])
        print(f"--- Cell {i} [{ctype}] ---")
        print(src)
        print()

inspect_notebook("notebooks/04_nlp_analysis.ipynb")
