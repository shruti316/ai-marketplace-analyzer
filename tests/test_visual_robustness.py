"""
Visual Robustness and Invariance Test Suite (V1.1 Hardening)
Milestone 6: AI-Powered Indian Marketplace Trust Intelligence Platform

Empirically benchmarks computer vision feature extractors and perceptual hashes
under 6 real-world marketplace image perturbations:
1. Watermark insertion (seller text overlay)
2. Screenshot framing (browser padding and app borders)
3. Lighting & luminance perturbations (under/over-exposure)
4. Rotations (90/180/270 degrees and slight tilts)
5. Extreme JPEG compression (bandwidth degradation artifacts)
6. Center crop & scale variations (aspect ratio modifications)
"""

import io
from pathlib import Path
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageOps
import pytest

# Ensure project root in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.cv.image_quality import ImageQualityAuditor, ImageQualityMetrics


@pytest.fixture
def synthetic_product_image():
    """Generates a clean synthetic 400x400 white studio background product image."""
    img = Image.new("RGB", (400, 400), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    # Draw central product bounding box (e.g. simulated perfume bottle or electronic device)
    draw.rectangle([120, 100, 280, 320], fill=(45, 85, 155), outline=(20, 40, 80), width=4)
    # Add high-contrast label text / pattern
    draw.rectangle([140, 160, 260, 260], fill=(240, 230, 210))
    draw.text((155, 200), "BRAND TEST", fill=(10, 10, 10))
    return img


def compute_dhash_64(img: Image.Image) -> int:
    """Computes standard 64-bit difference hash (dHash)."""
    gray = img.convert("L").resize((9, 8), Image.Resampling.LANCZOS)
    arr = np.array(gray)
    diff = arr[:, 1:] > arr[:, :-1]
    val = 0
    for bit in diff.flatten():
        val = (val << 1) | int(bit)
    return val


def hamming_distance(h1: int, h2: int) -> int:
    """Computes Hamming distance between two 64-bit hashes."""
    return bin(h1 ^ h2).count("1")


# ------------------------------------------------------------------------------
# 1. Watermark Insertion Robustness
# ------------------------------------------------------------------------------
def test_watermark_perturbation_stability(synthetic_product_image, tmp_path):
    """Verifies that semi-transparent seller watermarks do not break perceptual hash similarity."""
    base_img = synthetic_product_image.copy()
    base_hash = compute_dhash_64(base_img)

    # Apply watermark overlay
    watermarked = base_img.copy()
    overlay = Image.new("RGBA", watermarked.size, (255, 255, 255, 0))
    draw = ImageDraw.Draw(overlay)
    draw.text((50, 50), "GENUINE SELLER 100% ORIGINAL", fill=(200, 50, 50, 140))
    draw.text((100, 340), "WATERMARK PROTECTED", fill=(50, 50, 200, 140))
    watermarked.paste(Image.alpha_composite(watermarked.convert("RGBA"), overlay).convert("RGB"))

    wm_hash = compute_dhash_64(watermarked)
    dist = hamming_distance(base_hash, wm_hash)

    # Perceptual hash should remain close (Hamming distance <= 8 out of 64 bits)
    assert dist <= 8, f"Watermark altered dHash excessively: distance = {dist}"

    # Image quality auditor should still flag image as suitable for inference
    temp_file = tmp_path / "watermarked.jpg"
    watermarked.save(temp_file, "JPEG")
    metrics = ImageQualityAuditor.audit_image(temp_file)
    assert metrics.is_suitable_for_inference is True


# ------------------------------------------------------------------------------
# 2. Screenshot Framing & Padding Robustness
# ------------------------------------------------------------------------------
def test_screenshot_framing_perturbation(synthetic_product_image, tmp_path):
    """Verifies image quality metrics and border analysis under screenshot padding."""
    base_img = synthetic_product_image.copy()

    # Simulate mobile screenshot with gray UI header and footer
    framed = Image.new("RGB", (440, 500), color=(235, 238, 242))  # App background
    framed.paste(base_img, (20, 50))  # Centered product screenshot

    temp_file = tmp_path / "screenshot.jpg"
    framed.save(temp_file, "JPEG")

    metrics = ImageQualityAuditor.audit_image(temp_file)
    assert metrics.width == 440
    assert metrics.height == 500
    assert metrics.is_corrupted is False
    assert metrics.is_suitable_for_inference is True


# ------------------------------------------------------------------------------
# 3. Lighting & Luminance Perturbations
# ------------------------------------------------------------------------------
def test_lighting_perturbation_stability(synthetic_product_image, tmp_path):
    """Tests feature extraction stability across underexposure and overexposure."""
    base_img = synthetic_product_image.copy()
    base_hash = compute_dhash_64(base_img)

    # 1. Underexposure (-35% brightness)
    dark_img = ImageEnhance.Brightness(base_img).enhance(0.65)
    dark_hash = compute_dhash_64(dark_img)
    assert hamming_distance(base_hash, dark_hash) <= 10, "dHash should be luminance-gradient invariant"

    # 2. Overexposure (+35% brightness)
    bright_img = ImageEnhance.Brightness(base_img).enhance(1.35)
    bright_hash = compute_dhash_64(bright_img)
    assert hamming_distance(base_hash, bright_hash) <= 10, "dHash should be luminance-gradient invariant"

    # Contrast measurement verification
    temp_dark = tmp_path / "dark.jpg"
    dark_img.save(temp_dark)
    m_dark = ImageQualityAuditor.audit_image(temp_dark)
    assert m_dark.mean_brightness < 200.0


# ------------------------------------------------------------------------------
# 4. Rotation & Transposition Invariance
# ------------------------------------------------------------------------------
def test_rotation_perturbation_handling(synthetic_product_image, tmp_path):
    """Tests 90/180/270 degree flips and slight tilts."""
    base_img = synthetic_product_image.copy()

    # 90 degree rotation
    rot90 = base_img.rotate(90, expand=True)
    assert rot90.size == (400, 400)

    # 180 degree rotation
    rot180 = base_img.rotate(180, expand=True)
    temp_180 = tmp_path / "rot180.jpg"
    rot180.save(temp_180)
    m180 = ImageQualityAuditor.audit_image(temp_180)
    assert m180.is_corrupted is False

    # Slight tilt (3 degrees) with white border fill
    tilted = base_img.rotate(3, expand=False, fillcolor=(255, 255, 255))
    tilt_hash = compute_dhash_64(tilted)
    base_hash = compute_dhash_64(base_img)
    assert hamming_distance(base_hash, tilt_hash) <= 10


# ------------------------------------------------------------------------------
# 5. Extreme JPEG Compression
# ------------------------------------------------------------------------------
def test_extreme_jpeg_compression_degradation(synthetic_product_image, tmp_path):
    """Verifies that high-compression artifacts do not crash the auditor."""
    base_img = synthetic_product_image.copy()
    base_hash = compute_dhash_64(base_img)

    # Compress at quality=15 (severe compression blockiness)
    temp_compressed = tmp_path / "compressed_q15.jpg"
    base_img.save(temp_compressed, "JPEG", quality=15)

    comp_img = Image.open(temp_compressed)
    comp_hash = compute_dhash_64(comp_img)
    # Perceptual hash should resist moderate blockiness
    assert hamming_distance(base_hash, comp_hash) <= 6

    metrics = ImageQualityAuditor.audit_image(temp_compressed)
    assert metrics.is_corrupted is False
    assert metrics.file_size_bytes < 15000  # Highly compressed file size


# ------------------------------------------------------------------------------
# 6. Center Crop & Scale Invariance
# ------------------------------------------------------------------------------
def test_crop_perturbation_handling(synthetic_product_image, tmp_path):
    """Evaluates resolution tier and suitability when an image undergoes 80% center crop."""
    base_img = synthetic_product_image.copy()
    w, h = base_img.size

    # 80% center crop
    crop_box = (int(w * 0.1), int(h * 0.1), int(w * 0.9), int(h * 0.9))
    cropped = base_img.crop(crop_box)
    assert cropped.size == (320, 320)

    temp_crop = tmp_path / "cropped.jpg"
    cropped.save(temp_crop)

    metrics = ImageQualityAuditor.audit_image(temp_crop)
    assert metrics.width == 320
    assert metrics.height == 320
    assert metrics.resolution_tier in {"MEDIUM_RES", "HIGH_RES"}
    assert metrics.is_suitable_for_inference is True
