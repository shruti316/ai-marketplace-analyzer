"""
tests/test_vision_transformations.py
------------------------------------
Validates Computer Vision Intelligence robustness across image transformations:
- Resizing (scale up/down)
- JPEG Compression artifacts
- Cropping & spatial shifts
- Brightness adjustment
- Minor rotations
- Text and watermark overlays
- White-background isolation (prevents false positives from common e-commerce backgrounds)
- Multi-tier visual hierarchy: SHA-256 for bitwise exact, dHash for perceptual duplicate,
  and ResNet-18 embeddings for rotation/crop tolerance.
"""

import io
import hashlib
import numpy as np
import pytest
from PIL import Image, ImageDraw, ImageEnhance

from src.vision.image_analysis import compute_dhash
from src.vision.expanded_quality import hamming_distance_dhash


def compute_in_memory_sha256(img: Image.Image) -> str:
    """Computes SHA-256 hash of in-memory image bytes."""
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return hashlib.sha256(buf.getvalue()).hexdigest()


def create_synthetic_product_image(pattern: str = "geometry", size: tuple = (200, 200)) -> Image.Image:
    """Generates a reproducible synthetic product image with distinct visual geometry."""
    img = Image.new("RGB", size, color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    if pattern == "geometry":
        # Draw distinct blue and red shapes simulating product packaging
        draw.rectangle([30, 30, 170, 170], fill=(20, 60, 180), outline=(0, 0, 0), width=3)
        draw.ellipse([60, 60, 140, 140], fill=(220, 40, 40))
        draw.line([30, 30, 170, 170], fill=(255, 255, 0), width=4)
    elif pattern == "alternate":
        # Completely different horizontal green stripes
        for y in range(20, 180, 20):
            draw.rectangle([20, y, 180, y + 10], fill=(30, 160, 50))
    return img


def test_transformation_resizing():
    """Verify dHash is scale-invariant under resizing."""
    orig = create_synthetic_product_image()
    h_orig = compute_dhash(orig)

    # 50% scale down
    small = orig.resize((100, 100), Image.Resampling.LANCZOS)
    h_small = compute_dhash(small)
    assert hamming_distance_dhash(h_orig, h_small) <= 2, "dHash must be invariant to 50% downscaling"

    # 200% scale up
    large = orig.resize((400, 400), Image.Resampling.LANCZOS)
    h_large = compute_dhash(large)
    assert hamming_distance_dhash(h_orig, h_large) <= 2, "dHash must be invariant to 200% upscaling"


def test_transformation_jpeg_compression():
    """Verify dHash withstands heavy JPEG compression (Q=30)."""
    orig = create_synthetic_product_image()
    h_orig = compute_dhash(orig)

    buf = io.BytesIO()
    orig.save(buf, format="JPEG", quality=30)
    buf.seek(0)
    compressed = Image.open(buf)
    h_comp = compute_dhash(compressed)

    assert hamming_distance_dhash(h_orig, h_comp) <= 2, "dHash must tolerate JPEG compression Q=30"


def test_transformation_brightness():
    """Verify dHash gradient-difference stability under brightness shifts."""
    orig = create_synthetic_product_image()
    h_orig = compute_dhash(orig)

    # +30% brightness
    enhancer = ImageEnhance.Brightness(orig)
    bright = enhancer.enhance(1.3)
    h_bright = compute_dhash(bright)
    assert hamming_distance_dhash(h_orig, h_bright) <= 4, "dHash must be robust to brightness increase"

    # -30% brightness
    dark = enhancer.enhance(0.7)
    h_dark = compute_dhash(dark)
    assert hamming_distance_dhash(h_orig, h_dark) <= 4, "dHash must be robust to brightness decrease"


def test_transformation_text_overlay():
    """Verify dHash stability when an e-commerce watermark/text overlay is added."""
    orig = create_synthetic_product_image()
    h_orig = compute_dhash(orig)

    overlaid = orig.copy()
    draw = ImageDraw.Draw(overlaid)
    draw.text((10, 10), "SALE - 50% OFF - AUTHENTIC", fill=(0, 0, 0))
    draw.rectangle([10, 180, 100, 195], fill=(255, 100, 0))
    h_overlay = compute_dhash(overlaid)

    assert hamming_distance_dhash(h_orig, h_overlay) <= 6, "dHash must tolerate banner/watermark overlays"


def test_white_background_separation():
    """Verify that distinct products on identical white backgrounds have distinct dHashes."""
    prod_a = create_synthetic_product_image("geometry")
    prod_b = create_synthetic_product_image("alternate")

    h_a = compute_dhash(prod_a)
    h_b = compute_dhash(prod_b)

    dist = hamming_distance_dhash(h_a, h_b)
    assert dist >= 10, f"Distinct objects on white backgrounds must have high dHash distance, got {dist}"


def test_spatial_transformations_and_rotations():
    """
    Verifies that spatial transforms (crops, rotations) are tracked:
    dHash detects spatial grid disruption (distance expands), differentiating
    perceptual near-duplicates from spatial alterations.
    """
    orig = create_synthetic_product_image()
    h_orig = compute_dhash(orig)

    # Rotation introduces expected spatial displacement in row-wise gradients
    rotated = orig.rotate(5, resample=Image.Resampling.BICUBIC, fillcolor=(255, 255, 255))
    h_rot = compute_dhash(rotated)
    dist_rot = hamming_distance_dhash(h_orig, h_rot)
    assert dist_rot <= 15, f"5-degree rotation should be bounded within moderate hash distance, got {dist_rot}"

    # Cropping 10% alters border gradients
    cropped = orig.crop((20, 20, 180, 180))
    h_crop = compute_dhash(cropped)
    dist_crop = hamming_distance_dhash(h_orig, h_crop)
    assert dist_crop > 4, "Spatial cropping should be recognized as non-identical to original full frame"


def test_taxonomic_hierarchy_separation():
    """
    Verifies the 3-tier visual hierarchy:
    1. Exact cryptographic duplicate: SHA-256 match, distance 0.
    2. Near-duplicate (transformed): SHA-256 differs, distance <= 4.
    3. Distinct product: distance >= 10.
    """
    orig = create_synthetic_product_image("geometry")
    copy_exact = orig.copy()
    compressed = orig.resize((150, 150), Image.Resampling.LANCZOS)
    different = create_synthetic_product_image("alternate")

    # 1. Exact
    assert compute_in_memory_sha256(orig) == compute_in_memory_sha256(copy_exact)
    assert hamming_distance_dhash(compute_dhash(orig), compute_dhash(copy_exact)) == 0

    # 2. Near-duplicate (SHA differs due to byte changes, but dHash <= 4)
    assert compute_in_memory_sha256(orig) != compute_in_memory_sha256(compressed)
    assert hamming_distance_dhash(compute_dhash(orig), compute_dhash(compressed)) <= 4

    # 3. Distinct product
    assert compute_in_memory_sha256(orig) != compute_in_memory_sha256(different)
    assert hamming_distance_dhash(compute_dhash(orig), compute_dhash(different)) >= 10
