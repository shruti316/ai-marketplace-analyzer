"""
Unit Tests for Image Quality Assessment and Preprocessing (V1.1)
AI-Powered Indian Marketplace Trust Intelligence Platform
"""

import os
from pathlib import Path
import tempfile
import numpy as np
import pytest
from PIL import Image, ImageFilter

from src.cv.image_quality import ImageQualityAuditor, RobustImagePreprocessor, ImageQualityMetrics


@pytest.fixture
def temp_image_dir(tmp_path):
    return tmp_path


def test_clean_sharp_image_audit(temp_image_dir):
    """Verifies that a high-contrast sharp image is recognized as high quality."""
    # Create checkerboard pattern (high contrast, high sharpness)
    arr = np.zeros((400, 400, 3), dtype=np.uint8)
    arr[::20, :] = 255
    arr[:, ::20] = 255
    img = Image.fromarray(arr)
    p = temp_image_dir / "sharp.jpg"
    img.save(p)

    metrics = ImageQualityAuditor.audit_image(p)
    assert metrics.is_corrupted is False
    assert metrics.width == 400
    assert metrics.height == 400
    assert metrics.blur_score > 100.0  # Sharp
    assert metrics.resolution_tier == "MEDIUM_RES"
    assert metrics.is_suitable_for_inference is True


def test_blurry_image_audit(temp_image_dir):
    """Verifies that Gaussian blurred images receive low blur scores."""
    arr = np.random.randint(0, 255, (300, 300, 3), dtype=np.uint8)
    img = Image.fromarray(arr).filter(ImageFilter.GaussianBlur(radius=8))
    p = temp_image_dir / "blurry.jpg"
    img.save(p)

    metrics = ImageQualityAuditor.audit_image(p)
    assert metrics.is_corrupted is False
    assert metrics.blur_score < ImageQualityAuditor.BLUR_THRESHOLD_MODERATE


def test_white_studio_background_detection(temp_image_dir):
    """Verifies that white border padding triggers the white studio background indicator."""
    arr = np.ones((500, 500, 3), dtype=np.uint8) * 255
    # Product in the middle
    arr[150:350, 150:350] = 50
    img = Image.fromarray(arr)
    p = temp_image_dir / "studio.jpg"
    img.save(p)

    metrics = ImageQualityAuditor.audit_image(p)
    assert metrics.is_white_background is True
    assert metrics.background_luminance > 240.0


def test_rgba_transparency_handling(temp_image_dir):
    """Verifies that RGBA images with transparency are cleanly composited without error."""
    # RGBA with transparent background
    arr = np.zeros((200, 200, 4), dtype=np.uint8)
    arr[50:150, 50:150] = [255, 0, 0, 255]  # Red square in center, transparent elsewhere
    img = Image.fromarray(arr, mode="RGBA")
    p = temp_image_dir / "transparent.png"
    img.save(p)

    metrics = ImageQualityAuditor.audit_image(p)
    assert metrics.transparency_detected is True
    assert metrics.channels == 4

    # Test standardization compositing
    std_img = RobustImagePreprocessor.load_and_standardize(p, target_size=(224, 224))
    assert std_img.mode == "RGB"
    assert std_img.size == (224, 224)
    # Border should be pure white (composited on white)
    border_pixel = std_img.getpixel((0, 0))
    assert border_pixel == (255, 255, 255)


def test_corrupted_and_missing_file_handling(temp_image_dir):
    """Verifies that missing and corrupted files do not crash the pipeline."""
    # 1. Non-existent file
    missing_metrics = ImageQualityAuditor.audit_image(temp_image_dir / "does_not_exist.jpg")
    assert missing_metrics.is_corrupted is True
    assert missing_metrics.quality_status == "FILE_MISSING_OR_EMPTY"
    assert missing_metrics.is_suitable_for_inference is False

    # 2. Corrupted file (random garbage bytes)
    corrupted_p = temp_image_dir / "corrupted.jpg"
    corrupted_p.write_bytes(b"INVALID_HEADER_GARBAGE_BYTES_123456789")
    corrupt_metrics = ImageQualityAuditor.audit_image(corrupted_p)
    assert corrupt_metrics.is_corrupted is True
    assert corrupt_metrics.quality_status == "CORRUPTED_FILE"
    assert corrupt_metrics.is_suitable_for_inference is False


def test_letterbox_aspect_ratio_preservation(temp_image_dir):
    """Verifies letterboxing prevents geometric distortion on extreme aspect ratio images."""
    # 400x100 panoramic image (aspect ratio 4.0)
    panoramic = Image.new("RGB", (400, 100), color=(0, 128, 255))
    p = temp_image_dir / "panoramic.png"
    panoramic.save(p)

    target_size = (224, 224)
    letterboxed = RobustImagePreprocessor.load_and_standardize(p, target_size=target_size)
    assert letterboxed.size == target_size

    # Top and bottom padding should be white
    assert letterboxed.getpixel((112, 5)) == (255, 255, 255)
    # Center pixel should match original color
    center_px = letterboxed.getpixel((112, 112))
    assert abs(center_px[0] - 0) <= 2
    assert abs(center_px[1] - 128) <= 2
    assert abs(center_px[2] - 255) <= 2


def test_zero_penalty_invariant_quality_metrics():
    """Confirms that poor quality metrics do not carry fraud accusations or penalty scores."""
    metrics = ImageQualityMetrics(
        file_path="dummy.jpg",
        file_size_bytes=1000,
        width=80,
        height=80,
        aspect_ratio=1.0,
        format="JPEG",
        channels=3,
        is_corrupted=False,
        blur_score=15.0,
        mean_brightness=200.0,
        contrast_std=10.0,
        resolution_tier="TINY_UNUSABLE",
        quality_status="TINY_UNUSABLE_RESOLUTION",
        is_suitable_for_inference=False,
        transparency_detected=False,
        background_luminance=245.0,
        is_white_background=True,
    )
    d = metrics.to_dict()
    assert "fraud" not in str(d).lower()
    assert "counterfeit" not in str(d).lower()
    assert metrics.is_suitable_for_inference is False
