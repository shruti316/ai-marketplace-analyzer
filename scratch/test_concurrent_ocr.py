import sys
import os
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.abspath("."))

from PIL import Image
from src.vision.image_analysis import extract_ocr_text

test_files = list(Path("data/raw/images/cache").glob("*.jpg"))[:10]

t0 = time.time()
with ThreadPoolExecutor(max_workers=4) as executor:
    results = list(executor.map(extract_ocr_text, [str(f) for f in test_files]))

print(f"10 OCRs in {time.time() - t0:.2f}s:")
for f, r in zip(test_files, results):
    print(" ", f.name, "->", repr(r))
