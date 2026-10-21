"""
src/vision/image_analysis.py
----------------------------
Multimodal Visual and Packaging Consistency Intelligence Module.

Features:
- Cryptographic SHA-256 hashing for exact image duplication across listings.
- Perceptual difference hashing (dHash) for near-duplicate visual matching.
- Native WinRT OCR on Windows (with graceful fallback).
- Listing-to-packaging textual consistency scoring (brand & title overlap).
- Transparent handling of missing images, download timeouts, and textless packaging.
"""

import os
import hashlib
import logging
from typing import Dict, Any, Optional
import numpy as np
from PIL import Image

try:
    import winocr
    _HAS_WINOCR = True
except ImportError:
    _HAS_WINOCR = False

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


def compute_sha256(file_path: str) -> str:
    """Computes SHA-256 hash of an image file."""
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def compute_dhash(image: Image.Image, hash_size: int = 8) -> str:
    """Compute difference hash (dHash) for visual near-duplicate matching."""
    resized = image.convert("L").resize((hash_size + 1, hash_size), Image.Resampling.LANCZOS)
    pixels = np.array(resized)
    diff = pixels[:, 1:] > pixels[:, :-1]

    hex_chars = []
    flat = diff.flatten()
    for i in range(0, len(flat), 4):
        chunk = flat[i:i+4]
        val = sum(bit * (2 ** (3 - idx)) for idx, bit in enumerate(chunk))
        hex_chars.append(f"{val:x}")
    return "".join(hex_chars)


def extract_ocr_text(image_path: str) -> Optional[str]:
    """Extract on-packaging text using native Windows WinRT OCR if available."""
    if not os.path.exists(image_path):
        return None

    if _HAS_WINOCR:
        try:
            res = winocr.recognize_pil_sync(Image.open(image_path))
            if res:
                if isinstance(res, dict):
                    raw_text = res.get("text", "")
                elif hasattr(res, "text"):
                    raw_text = getattr(res, "text", "")
                else:
                    raw_text = str(res)
                return str(raw_text).strip() if raw_text else None
        except Exception as e:
            logging.warning("WinOCR extraction failed for %s: %s", image_path, e)

    return None


def calculate_packaging_consistency(ocr_text: Optional[str], title: str, brand: Optional[str]) -> float:
    """
    Computes consistency score (0.0 to 1.0) between OCR text on packaging
    and the product title / brand.
    """
    if not ocr_text or not ocr_text.strip():
        # No text on packaging (e.g. plain sponge, brush, tool) -> neutral score
        return 0.50

    ocr_tokens = set(ocr_text.lower().split())
    ref_tokens = set(str(title).lower().split())
    if brand:
        ref_tokens.update(str(brand).lower().split())

    # Remove short noise tokens
    ocr_words = {w for w in ocr_tokens if len(w) >= 3}
    ref_words = {w for w in ref_tokens if len(w) >= 3}

    if not ocr_words or not ref_words:
        return 0.50

    overlap = ocr_words.intersection(ref_words)
    # Overlap relative to the smaller set
    score = len(overlap) / min(len(ocr_words), len(ref_words))
    return round(float(min(1.0, score)), 2)


class ProductVisualAnalyzer:
    """
    Performs visual inspection and listing consistency analysis.
    """

    def analyze_local_image(
        self, image_path: Optional[str], product_title: str, product_brand: Optional[str]
    ) -> Dict[str, Any]:
        """
        Analyzes a downloaded product image.
        """
        if not image_path or not os.path.exists(image_path):
            return {
                "image_status": "MISSING_OR_NOT_CACHED",
                "sha256": None,
                "dhash": None,
                "ocr_text": None,
                "packaging_consistency_score": None,
                "evidence_flags": ["IMAGE_UNAVAILABLE_LOCALLY"],
                "evidence_summary": "No cached local image available for visual hashing or OCR verification.",
            }

        try:
            with Image.open(image_path) as img:
                width, height = img.size
                dhash_val = compute_dhash(img)

            sha_val = compute_sha256(image_path)
            ocr_text = extract_ocr_text(image_path)
            consistency = calculate_packaging_consistency(ocr_text, product_title, product_brand)

            evidence_flags = []
            if ocr_text and consistency < 0.15:
                evidence_flags.append(f"PACKAGING_TITLE_MISMATCH (consistency: {consistency})")

            summary = (
                f"Image verified ({width}x{height} px, dHash: {dhash_val}). "
                f"OCR Text: '{ocr_text[:50] if ocr_text else 'None'}'. "
                f"Packaging-to-listing consistency: {consistency}."
            )

            return {
                "image_status": "VALIDATED",
                "width": width,
                "height": height,
                "sha256": sha_val,
                "dhash": dhash_val,
                "ocr_text": ocr_text,
                "packaging_consistency_score": consistency,
                "evidence_flags": evidence_flags,
                "evidence_summary": summary,
            }
        except Exception as e:
            return {
                "image_status": "CORRUPTED_FILE",
                "error": str(e),
                "evidence_flags": ["IMAGE_DECODING_ERROR"],
                "evidence_summary": f"Failed to decode image file: {e}",
            }
