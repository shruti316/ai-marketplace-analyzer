"""Verification test for PhysicalOCREngine with EasyOCR fallback."""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from PIL import Image, ImageDraw, ImageFont
import tempfile
import os
from src.cv.ocr_engine import PhysicalOCREngine

def main():
    print("=============================================================================")
    print("TEST SUITE: PHYSICAL OCR ENGINE & STATUTORY IDENTIFIER EXTRACTION")
    print("=============================================================================\n")

    engine = PhysicalOCREngine()
    print(f"[INFO] Initialized PhysicalOCREngine with engine_name: {engine.engine_name}")

    # Generate synthetic packaging image with clear typography
    img = Image.new("RGB", (900, 450), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype(r"C:\Windows\Fonts\arial.ttf", 32)
    except Exception:
        font = ImageFont.load_default()

    lines = [
        "boAt Rockerz 450 Bluetooth Headset",
        "MRP: Rs. 1499.00 (Incl. of all taxes)",
        "Net Qty: 1 units",
        "Batch No: BT-2026-X89",
    ]

    y = 40
    for line in lines:
        draw.text((40, y), line, fill=(0, 0, 0), font=font)
        y += 80

    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp_path = Path(tmp.name)
        img.save(tmp_path)

    try:
        print("[1/3] Extracting text from synthetic packaging image...")
        result = engine.extract_text_from_image(tmp_path, canonical_brand="boAt")

        print(f"Status: {result.get('processing_status')}")
        print(f"Engine used: {result.get('engine')}")
        print(f"Detected text: {result.get('detected_text')}")
        print(f"Word count: {result.get('word_count')}")
        print(f"Brand alignment: {result.get('brand_alignment_status')}")
        print(f"Extracted MRP: {result.get('extracted_mrp')}")
        print(f"Extracted Net Qty: {result.get('extracted_net_quantity')}")
        print(f"Extracted Batch: {result.get('extracted_batch_code')}")

        assert result.get("processing_status") in ["SUCCESS", "OBSERVED"], f"Unexpected status: {result.get('processing_status')}"
        assert result.get("word_count", 0) > 0, "Expected word_count > 0"
        assert "boat" in result.get("detected_text", "").lower(), "Expected 'boat' in detected text"
        print("\nPASS: Text accurately extracted and detected!")

        print("[2/3] Verifying brand alignment...")
        assert result.get("brand_alignment_status") in ["BRAND_VERIFIED_ON_PACKAGING", "BRAND_PARTIALLY_DETECTED"]
        print("PASS: Brand alignment correctly evaluated.")

        print("[3/3] Verifying statutory identifiers...")
        assert result.get("extracted_mrp") == 1499.0, f"Expected MRP 1499.0, got {result.get('extracted_mrp')}"
        print("PASS: Statutory MRP identifier correctly parsed.")

        print("\n=============================================================================")
        print("ALL OCR VERIFICATION TESTS PASSED (100%).")
        print("=============================================================================\n")
    finally:
        if tmp_path.exists():
            os.remove(tmp_path)

if __name__ == "__main__":
    main()
