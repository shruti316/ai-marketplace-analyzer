import json
import re
import glob
import os

with open('backend/database/migrations/001_initial_schema.up.sql', 'r', encoding='utf-8') as f:
    sql = f.read()

# Parse table column varchar sizes
tables = {}
current_table = None
for line in sql.splitlines():
    m_table = re.search(r'CREATE TABLE IF NOT EXISTS ([a-zA-Z0-9_]+)', line)
    if m_table:
        current_table = m_table.group(1)
        tables[current_table] = {}
        continue
    if current_table:
        if line.strip().startswith(')') or line.strip().startswith('PRIMARY KEY') or line.strip().startswith('CONSTRAINT') or line.strip().startswith('INDEX') or line.strip().startswith('UNIQUE KEY'):
            continue
        m_col = re.search(r'^\s*([a-zA-Z0-9_]+)\s+([a-zA-Z0-9_]+)(?:\((\d+)(?:,\s*\d+)?\))?', line)
        if m_col:
            col_name = m_col.group(1)
            col_type = m_col.group(2).upper()
            col_len = int(m_col.group(3)) if m_col.group(3) else None
            tables[current_table][col_name] = (col_type, col_len)

print('Parsed schema tables:', list(tables.keys()))

json_table_map = {
    'platforms.json': 'platforms',
    'brands.json': 'brands',
    'sellers.json': 'sellers',
    'canonical_products.json': 'canonical_products',
    'marketplace_listings.json': 'marketplace_listings',
    'price_history.json': 'price_history',
    'trust_assessments.json': 'trust_assessments',
    'annotation_tasks.json': 'annotation_tasks',
    'ground_truth_annotations.json': 'ground_truth_annotations',
}

overflows = []
for json_file, table_name in json_table_map.items():
    file_path = os.path.join('backend/database/seeds/data', json_file)
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    col_defs = tables.get(table_name, {})
    for idx, item in enumerate(data):
        for k, v in item.items():
            if k in col_defs and isinstance(v, str):
                ctype, clen = col_defs[k]
                if clen and len(v) > clen:
                    overflows.append((table_name, k, ctype, clen, len(v), v, idx))

if overflows:
    print(f'\nFound {len(overflows)} column overflows:')
    # Group by table and column
    grouped = {}
    for t, c, ct, cl, vl, val, idx in overflows:
        key = f'{t}.{c} ({ct}({cl}))'
        if key not in grouped:
            grouped[key] = []
        grouped[key].append((vl, val, idx))
    for key, items in grouped.items():
        print(f'\n- {key} (Total violations: {len(items)}):')
        for vl, val, idx in items[:5]:
            print(f'    row {idx}: len {vl} -> "{val}"')
else:
    print('\nNo column overflows detected!')
