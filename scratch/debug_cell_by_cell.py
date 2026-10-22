import json
import sys
import time
from pathlib import Path
import traceback

with open("notebooks/04_nlp_analysis.ipynb", "r", encoding="utf-8") as f:
    nb = json.load(f)

global_scope = {"__file__": str(Path("notebooks/04_nlp_analysis.ipynb").resolve()), "display": print}

code_cells = [c for c in nb["cells"] if c["cell_type"] == "code"]
print(f"Total code cells: {len(code_cells)}")
sys.stdout.flush()

for idx, cell in enumerate(code_cells):
    src = "".join(cell["source"])
    
    # Patch Code Cell 11
    if idx == 10:
        src = src.replace('Path("../data/processed/canonical_products.parquet")', 'project_root / "data" / "processed" / "canonical_products.parquet"')
        src = src.replace('Path("../data/processed/canonical_reviews.parquet")', 'project_root / "data" / "processed" / "canonical_reviews.parquet"')
        src = src.replace('Path("../data/processed")', 'project_root / "data" / "processed"')

    print(f"=== Starting Code Cell {idx + 1}/{len(code_cells)} ===")
    sys.stdout.flush()
    t0 = time.time()
    try:
        exec(src, global_scope)
        sys.stdout.flush()
        t1 = time.time()
        print(f"[PASSED] Code Cell {idx + 1} completed in {t1 - t0:.2f}s\n")
        sys.stdout.flush()
    except Exception as e:
        sys.stdout.flush()
        print(f"[FAILED] Code Cell {idx + 1} raised {type(e).__name__}: {e}\n")
        traceback.print_exc()
        sys.stdout.flush()
        break
