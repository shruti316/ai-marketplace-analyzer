import json
from pathlib import Path
import traceback

with open("notebooks/04_nlp_analysis.ipynb", "r", encoding="utf-8") as f:
    nb = json.load(f)

global_scope = {"__file__": str(Path("notebooks/04_nlp_analysis.ipynb").resolve()), "display": print}

code_cells = [c for c in nb["cells"] if c["cell_type"] == "code"]
print(f"Total code cells to execute: {len(code_cells)}")

for idx, cell in enumerate(code_cells):
    src = "".join(cell["source"])
    print(f"--- Executing Code Cell {idx + 1}/{len(code_cells)} ---")
    try:
        exec(src, global_scope)
        print(f"[OK] Code Cell {idx + 1} passed.")
    except Exception as e:
        print(f"[ERROR] Code Cell {idx + 1} failed with: {type(e).__name__}: {e}")
        traceback.print_exc()
        break
