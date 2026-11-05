import pandas as pd
import urllib.request
import time

df = pd.read_parquet('data/processed/canonical_images.parquet')
pending = df[df['download_status'] == 'PENDING']

headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AI-Marketplace-Analyzer/2.0"}

for mkt in ['amazon', 'amazon_in', 'flipkart']:
    mkt_pending = pending[pending['marketplace'] == mkt].head(5)
    print(f"=== Testing {mkt} ===")
    for _, row in mkt_pending.iterrows():
        url = row['image_url']
        t0 = time.time()
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = resp.read()
                elapsed = time.time() - t0
                print(f"  OK: {row['image_id']} | {len(data)} bytes | {elapsed:.2f}s | {resp.headers.get_content_type()}")
        except Exception as e:
            elapsed = time.time() - t0
            print(f"  ERR: {row['image_id']} | {elapsed:.2f}s | {e}")
