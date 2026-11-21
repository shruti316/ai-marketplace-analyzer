"""
Image Quality Assessment and Robust Preprocessing Engine (V1.1)
AI-Powered Indian Marketplace Trust Intelligence Platform

Provides comprehensive quality auditing for e-commerce images:
- Laplacian variance blur detection
- Mean luminance brightness & contrast standard deviation
- Border luminance analysis for white studio background detection
- Safe RGBA transparency alpha-compositing on white background
- EXIF orientation transposition and format normalization
- Resolution tier classification and aspect ratio auditing
- Zero-Penalty guarantee: poor quality indicates low evidence fidelity, never fraud
"""

from dataclasses import asdict, dataclass
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
from PIL import Image, ImageOps

logger = logging.getLogger("ImageQualityV1_1")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


@dataclass
class ImageQualityMetrics:
    """Strongly typed quality assessment contract for marketplace imagery."""
    file_path: str
    file_size_bytes: int
    width: int
    height: int
    aspect_ratio: float
    format: str
    channels: int
    is_corrupted: bool
    blur_score: float                  # Laplacian variance: higher = sharper, < 100 = blurry
    mean_brightness: float             # Average luminance: 0 (black) to 255 (white)
    contrast_std: float                # Luminance std dev: < 20 = washed out / low contrast
    resolution_tier: str               # HIGH_RES, MEDIUM_RES, LOW_RES, TINY_UNUSABLE
    quality_status: str                # HIGH_QUALITY, ACCEPTABLE_QUALITY, BLURRY, LOW_CONTRAST, etc.
    is_suitable_for_inference: bool    # Whether visual models can reliably extract signals
    transparency_detected: bool        # Whether image contains alpha channel
    background_luminance: float        # Border pixel mean luminance
    is_white_background: bool          # Studio background indicator (border luminance > 240)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["aspect_ratio"] = round(self.aspect_ratio, 3)
        d["blur_score"] = round(self.blur_score, 2)
        d["mean_brightness"] = round(self.mean_brightness, 2)
        d["contrast_std"] = round(self.contrast_std, 2)
        d["background_luminance"] = round(self.background_luminance, 2)
        return d


class ImageQualityAuditor:
    """Evaluates image degradation, resolution, blur, and lighting conditions."""

    BLUR_THRESHOLD_SEVERE = 50.0       # Definitely blurry
    BLUR_THRESHOLD_MODERATE = 100.0    # Borderline softness
    LOW_CONTRAST_THRESHOLD = 25.0      # Washed out / flat
    WHITE_BG_BORDER_THRESHOLD = 238.0  # Mean border luminance indicating studio white backdrop
    MIN_INFERENCE_DIMENSION = 120      # Below this, ResNet/CLIP features degrade significantly

    @staticmethod
    def compute_laplacian_blur_score(gray_arr: np.ndarray) -> float:
        """
        Computes the variance of the discrete 2D Laplacian operator.
        Uses standard 3x3 kernel: [[0, 1, 0], [1, -4, 1], [0, 1, 0]].
        High variance indicates sharp edges; low variance indicates blur.
        """
        if gray_arr.shape[0] < 3 or gray_arr.shape[1] < 3:
            return 0.0
        
        # 2D convolution with 3x3 Laplacian kernel via slicing
        inner = gray_arr[1:-1, 1:-1]
        lap = (
            gray_arr[0:-2, 1:-1] +
            gray_arr[2:, 1:-1] +
            gray_arr[1:-1, 0:-2] +
            gray_arr[1:-1, 2:] -
            4.0 * inner
        )
        return float(np.var(lap))

    @staticmethod
    def measure_border_luminance(gray_arr: np.ndarray, border_fraction: float = 0.05) -> float:
        """
        Measures the average luminance of pixels in the outer border.
        Used to detect seamless white studio photography.
        """
        h, w = gray_arr.shape
        bh = max(1, int(h * border_fraction))
        bw = max(1, int(w * border_fraction))

        top = gray_arr[:bh, :]
        bottom = gray_arr[-bh:, :]
        left = gray_arr[:, :bw]
        right = gray_arr[:, -bw:]

        border_pixels = np.concatenate([top.flatten(), bottom.flatten(), left.flatten(), right.flatten()])
        return float(np.mean(border_pixels))

    @classmethod
    def audit_image(cls, file_path: Union[str, Path]) -> ImageQualityMetrics:
        """Performs full photometric and structural audit of an image on disk."""
        p = Path(file_path)
        if not p.exists() or p.stat().st_size == 0:
            return ImageQualityMetrics(
                file_path=str(p),
                file_size_bytes=0 if not p.exists() else p.stat().st_size,
                width=0,
                height=0,
                aspect_ratio=0.0,
                format="UNKNOWN",
                channels=0,
                is_corrupted=True,
                blur_score=0.0,
                mean_brightness=0.0,
                contrast_std=0.0,
                resolution_tier="TINY_UNUSABLE",
                quality_status="FILE_MISSING_OR_EMPTY",
                is_suitable_for_inference=False,
                transparency_detected=False,
                background_luminance=0.0,
                is_white_background=False,
            )

        file_size = p.stat().st_size

        try:
            with Image.open(p) as raw_img:
                # Correct EXIF orientation if present
                img = ImageOps.exif_transpose(raw_img) or raw_img
                img.load()

                w, h = img.size
                fmt = img.format or "JPEG"
                mode = img.mode
                has_alpha = mode in ("RGBA", "LA") or (mode == "P" and "transparency" in img.info)
                channels = len(mode)

                aspect = round(float(w) / float(h), 3) if h > 0 else 0.0

                # Convert to grayscale for metric computation
                gray = img.convert("L")
                gray_arr = np.array(gray, dtype=np.float32)

                # 1. Blur
                blur = cls.compute_laplacian_blur_score(gray_arr)

                # 2. Brightness & Contrast
                mean_bright = float(np.mean(gray_arr))
                contrast = float(np.std(gray_arr))

                # 3. Background border luminance
                border_lum = cls.measure_border_luminance(gray_arr)
                is_white_bg = border_lum >= cls.WHITE_BG_BORDER_THRESHOLD

                # 4. Resolution Tier
                min_dim = min(w, h)
                if min_dim >= 600:
                    res_tier = "HIGH_RES"
                elif min_dim >= 300:
                    res_tier = "MEDIUM_RES"
                elif min_dim >= cls.MIN_INFERENCE_DIMENSION:
                    res_tier = "LOW_RES"
                else:
                    res_tier = "TINY_UNUSABLE"

                # 5. Overall Quality Classification
                is_suitable = True
                if min_dim < cls.MIN_INFERENCE_DIMENSION:
                    status = "TINY_UNUSABLE_RESOLUTION"
                    is_suitable = False
                elif blur < cls.BLUR_THRESHOLD_SEVERE:
                    status = "SEVERELY_BLURRY"
                    is_suitable = False
                elif contrast < cls.LOW_CONTRAST_THRESHOLD:
                    status = "LOW_CONTRAST_WASHED_OUT"
                elif blur < cls.BLUR_THRESHOLD_MODERATE:
                    status = "MODERATELY_SOFT"
                elif is_white_bg and res_tier in ("HIGH_RES", "MEDIUM_RES"):
                    status = "HIGH_QUALITY_STUDIO"
                else:
                    status = "ACCEPTABLE_QUALITY"

                return ImageQualityMetrics(
                    file_path=str(p),
                    file_size_bytes=file_size,
                    width=w,
                    height=h,
                    aspect_ratio=aspect,
                    format=fmt,
                    channels=channels,
                    is_corrupted=False,
                    blur_score=blur,
                    mean_brightness=mean_bright,
                    contrast_std=contrast,
                    resolution_tier=res_tier,
                    quality_status=status,
                    is_suitable_for_inference=is_suitable,
                    transparency_detected=has_alpha,
                    background_luminance=border_lum,
                    is_white_background=is_white_bg,
                )

        except Exception as e:
            logger.warning(f"Corrupted or unreadable image at {p}: {e}")
            return ImageQualityMetrics(
                file_path=str(p),
                file_size_bytes=file_size,
                width=0,
                height=0,
                aspect_ratio=0.0,
                format="CORRUPT",
                channels=0,
                is_corrupted=True,
                blur_score=0.0,
                mean_brightness=0.0,
                contrast_std=0.0,
                resolution_tier="TINY_UNUSABLE",
                quality_status="CORRUPTED_FILE",
                is_suitable_for_inference=False,
                transparency_detected=False,
                background_luminance=0.0,
                is_white_background=False,
            )


class RobustImagePreprocessor:
    """Preprocesses diverse e-commerce images into standardized formats without distortion."""

    TARGET_SIZE = (224, 224)

    @classmethod
    def load_and_standardize(
        cls,
        image_path: Union[str, Path],
        target_size: Tuple[int, int] = TARGET_SIZE,
        pad_color: Tuple[int, int, int] = (255, 255, 255),
    ) -> Image.Image:
        """
        Loads an image, normalizes EXIF rotation, alpha-composites transparency onto white background,
        and letterboxes to target size with aspect-ratio preservation.
        """
        p = Path(image_path)
        with Image.open(p) as raw:
            img = ImageOps.exif_transpose(raw) or raw
            img.load()

            # Handle transparency (RGBA / P with transparency)
            if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                rgba = img.convert("RGBA")
                bg = Image.new("RGBA", rgba.size, pad_color + (255,))
                composited = Image.alpha_composite(bg, rgba)
                rgb_img = composited.convert("RGB")
            else:
                rgb_img = img.convert("RGB")

            # Aspect-ratio preserving letterbox
            return cls.letterbox_resize(rgb_img, target_size=target_size, fill_color=pad_color)

    @staticmethod
    def letterbox_resize(
        img: Image.Image,
        target_size: Tuple[int, int] = TARGET_SIZE,
        fill_color: Tuple[int, int, int] = (255, 255, 255),
    ) -> Image.Image:
        """
        Resizes an image preserving aspect ratio and pads borders to target size.
        Prevents geometric distortion of products.
        """
        target_w, target_h = target_size
        orig_w, orig_h = img.size

        if orig_w == 0 or orig_h == 0:
            return Image.new("RGB", target_size, fill_color)

        scale = min(target_w / orig_w, target_h / orig_h)
        new_w = max(1, int(orig_w * scale))
        new_h = max(1, int(orig_h * scale))

        resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

        canvas = Image.new("RGB", target_size, fill_color)
        paste_x = (target_w - new_w) // 2
        paste_y = (target_h - new_h) // 2
        canvas.paste(resized, (paste_x, paste_y))

        return canvas
