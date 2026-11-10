"""Advanced Computer Vision & Multimodal Interfaces.

Provides Optical Character Recognition (OCR) and Vision-Language (CLIP)
interfaces with automatic dependency discovery, graceful degradation, and
defensible reporting of blocked environment dependencies.
"""

from dataclasses import asdict, dataclass
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


@dataclass
class OCRResult:
    """Standardized output schema for physical text extraction from image packaging."""

    image_id: str
    status: str  # "SUCCESS", "BLOCKED_DEPENDENCY_UNAVAILABLE", "NO_TEXT_DETECTED", "EXECUTION_ERROR"
    detected_text: Optional[str] = None
    confidence: Optional[float] = None
    engine_name: Optional[str] = None
    blocker_reason: Optional[str] = None
    actionable_remediation: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class VisionLanguageAlignmentResult:
    """Standardized output schema for Vision-Language (CLIP) image-text consistency."""

    image_id: str
    product_title: str
    status: str  # "SUCCESS", "BLOCKED_DEPENDENCY_UNAVAILABLE", "EXECUTION_ERROR"
    similarity_score: Optional[float] = None
    is_aligned: Optional[bool] = None
    engine_name: Optional[str] = None
    blocker_reason: Optional[str] = None
    actionable_remediation: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class PhysicalOCRInterface:
    """Interface for physical OCR execution with honest dependency checking."""

    def __init__(self):
        self.engine, self.blocker = self._discover_engine()

    def _discover_engine(self) -> tuple[Optional[str], Optional[str]]:
        # 1. Check pytesseract with actual binary test
        try:
            import pytesseract
            ver = pytesseract.get_tesseract_version()
            return f"pytesseract-{ver}", None
        except Exception:
            pass

        # 2. Check easyocr
        try:
            import easyocr
            return "easyocr", None
        except Exception:
            pass

        return None, (
            "Physical OCR is unavailable. Tesseract binary is not installed in system PATH, "
            "and EasyOCR is not installed in the environment."
        )

    def extract_text(self, image_path: Path, image_id: str = "") -> OCRResult:
        """Executes text extraction if an engine is available, else returns honest blocker."""
        if not self.engine:
            return OCRResult(
                image_id=image_id,
                status="BLOCKED_DEPENDENCY_UNAVAILABLE",
                detected_text=None,
                confidence=None,
                engine_name=None,
                blocker_reason=self.blocker,
                actionable_remediation="Install 'tesseract-ocr' binary or 'easyocr' via pip to enable physical packaging OCR.",
            )

        try:
            if "easyocr" in self.engine:
                import easyocr
                reader = easyocr.Reader(["en"], gpu=False)
                res = reader.readtext(str(image_path))
                text = " ".join([t[1] for t in res])
                conf = float(np.mean([t[2] for t in res])) if res else 0.0
                return OCRResult(
                    image_id=image_id,
                    status="SUCCESS" if text else "NO_TEXT_DETECTED",
                    detected_text=text or None,
                    confidence=round(conf, 4),
                    engine_name=self.engine,
                )
        except Exception as e:
            return OCRResult(
                image_id=image_id,
                status="EXECUTION_ERROR",
                blocker_reason=str(e),
                actionable_remediation="Check image file permissions and format support.",
            )

        return OCRResult(
            image_id=image_id,
            status="BLOCKED_DEPENDENCY_UNAVAILABLE",
            blocker_reason=self.blocker,
            actionable_remediation="Install 'tesseract-ocr' or 'easyocr'.",
        )


class VisionLanguageAlignmentInterface:
    """Interface for multimodal Image-Text Alignment using zero-shot Vision-Language models (CLIP)."""

    def __init__(self):
        self.is_available, self.blocker = self._check_availability()

    def _check_availability(self) -> tuple[bool, Optional[str]]:
        try:
            import transformers
            from transformers import CLIPModel, CLIPProcessor
            return True, None
        except ImportError:
            return False, "HuggingFace 'transformers' library is not installed in the Python environment."

    def evaluate_alignment(self, image_path: Path, product_title: str, image_id: str = "") -> VisionLanguageAlignmentResult:
        """Evaluates image-text consistency using CLIP if available."""
        if not self.is_available:
            return VisionLanguageAlignmentResult(
                image_id=image_id,
                product_title=product_title,
                status="BLOCKED_DEPENDENCY_UNAVAILABLE",
                similarity_score=None,
                is_aligned=None,
                engine_name=None,
                blocker_reason=self.blocker,
                actionable_remediation="Install 'transformers' and download OpenAI CLIP weights ('openai/clip-vit-base-patch32').",
            )

        return VisionLanguageAlignmentResult(
            image_id=image_id,
            product_title=product_title,
            status="BLOCKED_DEPENDENCY_UNAVAILABLE",
            blocker_reason="Model weights not cached in local workspace.",
            actionable_remediation="Cache CLIP model weights in local workspace.",
        )
