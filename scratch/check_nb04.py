"""
scratch/check_nb04.py
---------------------
Inspect cells in 04_nlp_analysis.ipynb relating to product_review_features.
"""

import json

with open('notebooks/04_nlp_analysis.ipynb', 'r', encoding='utf-8') as f:
    nb = json.load(f)

for idx, cell in enumerate(nb['cells']):
    src = ''.join(cell.get('source', []))
    if 'product_review_features' in src:
        print(f"=== Cell {idx} ({cell.get('cell_type')}) ===")
        print(src)
        print("\n" + "="*50 + "\n")
