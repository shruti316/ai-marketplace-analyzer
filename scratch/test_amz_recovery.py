import urllib.request
import re, os, time, hashlib
from PIL import Image
import pandas as pd
from concurrent.futures import ThreadPoolExecutor

df = pd.read_csv('data/raw/amazon_india/amazon_india_products_raw.csv')

def clean_amazon_url(u):
    if not isinstance(u, str): return None
    if 'transparent-pixel' in u or 'grey-pixel' in u: return None
    m = re.match(r'(https?://images-[^/]+/images/I/[A-Za-z0-9%_\+\-]+?)(?:\._[^/]+)?\.(jpg|jpeg|png)', u, re.IGNORECASE)
    if m:
        return f"{m.group(1)}.{m.group(2).lower()}"
    return None

targets = []
for idx, row in df.head(50).iterrows():
    asin = row['Product Asin']
    urls = str(row['Image Urls']).split('|')
    clean = [clean_amazon_url(u) for u in urls if clean_amazon_url(u)]
    if clean:
        targets.append((asin, clean[0]))

os.makedirs('scratch/test_batch_50', exist_ok=True)

def fetch(item):
    asin, url = item
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = resp.read()
        p = f'scratch/test_batch_50/{asin}.jpg'
        with open(p, 'wb') as fp:
            fp.write(data)
        img = Image.open(p)
        return {
            'asin': asin,
            'status': 'SUCCESS',
            'width': img.width,
            'height': img.height,
            'size': len(data),
            'sha256': hashlib.sha256(data).hexdigest()
        }
    except Exception as e:
        return {'asin': asin, 'status': 'FAILED', 'error': str(e)}

t0 = time.time()
with ThreadPoolExecutor(max_workers=16) as ex:
    results = list(ex.map(fetch, targets))
dt = time.time() - t0

successes = [r for r in results if r['status'] == 'SUCCESS']
print(f"Downloaded {len(successes)}/{len(targets)} images in {dt:.2f}s ({len(targets)/dt:.1f} imgs/s)")
if successes:
    res_df = pd.DataFrame(successes)
    print("Dimensions Summary:")
    print(res_df[['width', 'height', 'size']].describe())

import shutil
shutil.rmtree('scratch/test_batch_50')
