from pathlib import Path
import pandas as pd

for f in Path('data').rglob('*.parquet'):
    parts = f.parts
    if not any(x in parts for x in ['.venv', 'marketplace_trust_dataset_v1.1', 'marketplace_trust_dataset_v1.2', 'marketplace_trust_dataset_v1.3', 'marketplace_trust_dataset_v1.4', 'marketplace_trust_dataset_v1.5']):
        try:
            df = pd.read_parquet(f)
            if 'marketplace' in df.columns:
                mkt = df['marketplace'].value_counts().to_dict()
                for k, v in mkt.items():
                    if 'amazon' in str(k).lower():
                        print(f"{f}: {len(df)} rows, {k}={v}")
        except Exception:
            pass
