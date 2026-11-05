import sys
import os
from pathlib import Path
sys.path.insert(0, os.path.abspath("."))

from PIL import Image
import numpy as np
from scipy import ndimage
import pandas as pd
from src.vision.image_analysis import compute_sha256, compute_dhash

def compute_sharpness(img_gray: np.ndarray) -> float:
    lap = ndimage.laplace(img_gray.astype(np.float64))
    return float(lap.var())

test_files = list(Path("data/raw/images/cache").glob("*.jpg"))[:3]
for p in test_files:
    sha = compute_sha256(str(p))
    with Image.open(p) as img:
        dh = compute_dhash(img)
        gray = np.array(img.convert("L"))
        sh = compute_sharpness(gray)
        lum = float(gray.mean())
        con = float(gray.std())
        w, h = img.size
    print(f"{p.name}: {w}x{h} | SHA={sha[:8]} | dHash={dh} | Sharpness={sh:.1f} | Lum={lum:.1f} | Con={con:.1f}")
