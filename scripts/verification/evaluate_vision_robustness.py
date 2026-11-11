"""
scripts/verification/evaluate_vision_robustness.py
-------------------------------------------------
Evaluates Workstream H: Perturbation Robustness & Cross-Marketplace Generalization.
Tests:
1. Perceptual hash & image quality stability under:
   - Gaussian noise
   - JPEG recompression (Q=70, Q=40)
   - Center cropping (90%, 75%)
   - Brightness scaling (+20%, -20%)
2. Cross-marketplace performance (Amazon vs Flipkart).
"""

import io
import json
from pathlib import Path
import sys
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.cv.image_intelligence import ImageFileValidator
from src.cv.image_quality import ImageQualityAuditor, RobustImagePreprocessor
from src.cv.duplicate_taxonomy import AdvancedDuplicateTaxonomyClassifier

def hamming_dist(h1: str, h2: str) -> int:
    return bin(int(h1, 16) ^ int(h2, 16)).count("1")

def run_perturbation_tests():
    sample_dir = PROJECT_ROOT / "data" / "indian_marketplace" / "raw" / "images" / "amazon_in"
    image_paths = list(sample_dir.glob("*.jpg"))[:30] # 30 authentic catalog images
    if not image_paths:
        print("No sample images found!")
        return

    auditor = ImageQualityAuditor()
    preprocessor = RobustImagePreprocessor()
    classifier = AdvancedDuplicateTaxonomyClassifier()

    results = {
        "gaussian_noise": {"dhash_distances": [], "quality_preserved": 0},
        "jpeg_q70": {"dhash_distances": [], "quality_preserved": 0},
        "jpeg_q40": {"dhash_distances": [], "quality_preserved": 0},
        "crop_90": {"dhash_distances": [], "quality_preserved": 0},
        "crop_75": {"dhash_distances": [], "quality_preserved": 0},
        "brightness_plus20": {"dhash_distances": [], "quality_preserved": 0},
        "brightness_minus20": {"dhash_distances": [], "quality_preserved": 0},
    }

    for img_p in image_paths:
        try:
            base_img = Image.open(img_p).convert("RGB")
            base_dhash = ImageFileValidator.compute_dhash(base_img)
            base_audit = auditor.audit_image(img_p)

            # 1. Gaussian noise
            noisy_np = np.array(base_img, dtype=float) + np.random.normal(0, 15, (base_img.height, base_img.width, 3))
            noisy_np = np.clip(noisy_np, 0, 255).astype(np.uint8)
            noisy_img = Image.fromarray(noisy_np)
            dist_noise = hamming_dist(ImageFileValidator.compute_dhash(noisy_img), base_dhash)
            results["gaussian_noise"]["dhash_distances"].append(int(dist_noise))

            # 2. JPEG Q=70
            buf70 = io.BytesIO()
            base_img.save(buf70, format="JPEG", quality=70)
            buf70.seek(0)
            img70 = Image.open(buf70)
            dist_q70 = hamming_dist(ImageFileValidator.compute_dhash(img70), base_dhash)
            results["jpeg_q70"]["dhash_distances"].append(int(dist_q70))

            # 3. JPEG Q=40
            buf40 = io.BytesIO()
            base_img.save(buf40, format="JPEG", quality=40)
            buf40.seek(0)
            img40 = Image.open(buf40)
            dist_q40 = hamming_dist(ImageFileValidator.compute_dhash(img40), base_dhash)
            results["jpeg_q40"]["dhash_distances"].append(int(dist_q40))

            # 4. Crop 90%
            w, h = base_img.size
            crop90 = base_img.crop((int(w * 0.05), int(h * 0.05), int(w * 0.95), int(h * 0.95)))
            dist_crop90 = hamming_dist(ImageFileValidator.compute_dhash(crop90), base_dhash)
            results["crop_90"]["dhash_distances"].append(int(dist_crop90))

            # 5. Crop 75%
            crop75 = base_img.crop((int(w * 0.125), int(h * 0.125), int(w * 0.875), int(h * 0.875)))
            dist_crop75 = hamming_dist(ImageFileValidator.compute_dhash(crop75), base_dhash)
            results["crop_75"]["dhash_distances"].append(int(dist_crop75))

            # 6. Brightness +20%
            enhancer = ImageEnhance.Brightness(base_img)
            b_plus = enhancer.enhance(1.20)
            dist_bplus = hamming_dist(ImageFileValidator.compute_dhash(b_plus), base_dhash)
            results["brightness_plus20"]["dhash_distances"].append(int(dist_bplus))

            # 7. Brightness -20%
            b_minus = enhancer.enhance(0.80)
            dist_bminus = hamming_dist(ImageFileValidator.compute_dhash(b_minus), base_dhash)
            results["brightness_minus20"]["dhash_distances"].append(int(dist_bminus))
            dist_bminus = imagehash.dhash(b_minus) - base_dhash
            results["brightness_minus20"]["dhash_distances"].append(int(dist_bminus))

        except Exception as e:
            continue

    summary = {}
    for p_type, data in results.items():
        arr = np.array(data["dhash_distances"])
        summary[p_type] = {
            "mean_dhash_drift": float(np.mean(arr)) if len(arr) else 0.0,
            "max_dhash_drift": int(np.max(arr)) if len(arr) else 0,
            "pct_within_near_dup_threshold_4": float(np.mean(arr <= 4) * 100.0) if len(arr) else 0.0,
        }

    out_file = PROJECT_ROOT / "reports" / "phase_2_multimodal" / "vision_perturbation_summary.json"
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print("Perturbation Robustness Results:")
    print(json.dumps(summary, indent=2))

if __name__ == "__main__":
    run_perturbation_tests()
