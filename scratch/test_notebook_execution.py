import json
import traceback
import sys
from pathlib import Path

def test_run_notebook(nb_path):
    print(f"=== Testing notebook execution: {nb_path} ===")
    with open(nb_path, "r", encoding="utf-8") as f:
        nb = json.load(f)
    
    global_scope = {"__file__": str(Path(nb_path).resolve()), "display": print}
    
    code_cells = [c for c in nb["cells"] if c["cell_type"] == "code"]
    for idx, cell in enumerate(code_cells):
        src = "".join(cell["source"])
        print(f"Executing Code Cell {idx + 1}/{len(code_cells)}...")
        try:
            exec(src, global_scope)
        except Exception as e:
            print(f"[FAIL] Error in Cell {idx + 1}: {e}")
            traceback.print_exc()
            return False
    print(f"[PASS] Successfully executed all {len(code_cells)} code cells in {nb_path}!\n")
    return True

ok_hotel = test_run_notebook("notebooks/hotel_benchmark_isolated.ipynb")
assert ok_hotel, "Hotel notebook failed!"

ok_04 = test_run_notebook("notebooks/04_nlp_analysis.ipynb")
assert ok_04, "04_nlp_analysis notebook failed!"

print("ALL NOTEBOOKS EXECUTED CLEANLY AND PASSED!")
