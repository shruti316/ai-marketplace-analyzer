"""Unit and integration test suite for Python ML inspection and assistant endpoints."""

import base64
import io
import pytest
from PIL import Image

from src.api.service import create_app_server
from src.api.inspect_service import ImageInspectionService, ImageInspectionError


@pytest.fixture(scope="module")
def api_server():
    """Instantiates TrustIntelligenceRestServer without binding TCP socket for fast in-memory testing."""
    return create_app_server(bind_socket=False)


def create_test_image_bytes(format="JPEG", size=(200, 200), color=(100, 150, 200)) -> bytes:
    """Helper creating memory buffer of a valid test image."""
    bio = io.BytesIO()
    img = Image.new("RGB", size, color=color)
    img.save(bio, format=format)
    return bio.getvalue()


class TestImageInspectionEndpoint:
    """Tests POST /api/v1/inspect/image validation, quality scoring, and error handling."""

    def test_valid_jpeg_inspection(self, api_server):
        raw = create_test_image_bytes(format="JPEG", size=(250, 250))
        b64 = base64.b64encode(raw).decode("utf-8")

        status, resp = api_server.dispatch("POST", "/api/v1/inspect/image", {
            "image_base64": b64,
            "canonical_brand": "TEST_BRAND"
        })

        assert status == 200
        assert resp["processing_status"] in ("SUCCESS", "DEGRADED_OCR_UNAVAILABLE")
        assert resp["image_metadata"]["format"] == "JPEG"
        assert resp["image_metadata"]["width"] == 250
        assert resp["image_metadata"]["height"] == 250
        assert "quality_findings" in resp
        assert "blur_score" in resp["quality_findings"]
        assert "ocr_findings" in resp
        assert isinstance(resp["evidence_records"], list)
        assert len(resp["evidence_records"]) >= 1

    def test_valid_png_inspection(self, api_server):
        raw = create_test_image_bytes(format="PNG", size=(150, 150))
        b64 = base64.b64encode(raw).decode("utf-8")

        status, resp = api_server.dispatch("POST", "/api/v1/inspect/image", {
            "image_base64": f"data:image/png;base64,{b64}"
        })

        assert status == 200
        assert resp["image_metadata"]["format"] == "PNG"
        assert resp["image_metadata"]["width"] == 150

    def test_valid_webp_inspection(self, api_server):
        raw = create_test_image_bytes(format="WEBP", size=(180, 180))
        b64 = base64.b64encode(raw).decode("utf-8")

        status, resp = api_server.dispatch("POST", "/api/v1/inspect/image", {
            "image_base64": b64
        })

        assert status == 200
        assert resp["image_metadata"]["format"] == "WEBP"

    def test_malformed_base64_rejection(self, api_server):
        status, resp = api_server.dispatch("POST", "/api/v1/inspect/image", {
            "image_base64": "!!!not_valid_base64@@@"
        })

        assert status == 400
        assert resp["error"] is True
        assert resp["code"] == "INVALID_BASE64"

    def test_invalid_image_bytes_rejection(self, api_server):
        garbage = base64.b64encode(b"This is not a real image file.").decode("utf-8")
        status, resp = api_server.dispatch("POST", "/api/v1/inspect/image", {
            "image_base64": garbage
        })

        assert status == 400
        assert resp["error"] is True
        assert resp["code"] == "MALFORMED_IMAGE"

    def test_unsupported_image_format_rejection(self, api_server):
        # Create BMP format (not in SUPPORTED_FORMATS: JPEG, PNG, WEBP)
        bio = io.BytesIO()
        img = Image.new("RGB", (100, 100), color=(255, 0, 0))
        img.save(bio, format="BMP")
        b64 = base64.b64encode(bio.getvalue()).decode("utf-8")

        status, resp = api_server.dispatch("POST", "/api/v1/inspect/image", {
            "image_base64": b64
        })

        assert status == 415
        assert resp["error"] is True
        assert resp["code"] == "UNSUPPORTED_FORMAT"

    def test_oversized_image_rejection(self, api_server):
        # Exceeds max limit test via unit validator
        with pytest.raises(ImageInspectionError) as exc_info:
            ImageInspectionService.decode_and_validate_bytes(
                b"X" * 100, max_size_bytes=50
            )
        assert exc_info.value.status_code == 413
        assert exc_info.value.code == "IMAGE_TOO_LARGE"

    def test_missing_image_payload_rejection(self, api_server):
        status, resp = api_server.dispatch("POST", "/api/v1/inspect/image", {})
        assert status == 400
        assert resp["code"] == "MISSING_IMAGE_SOURCE"


class TestAssistantEndpoint:
    """Tests POST /api/v1/assistant/chat grounded evidence retrieval and query handling."""

    def test_valid_assistant_query_with_real_product(self, api_server):
        # Retrieve first canonical product from catalog
        pid = api_server.dispatcher.engine.evidence_engine.products_df["canonical_product_id"].iloc[0]

        status, resp = api_server.dispatch("POST", "/api/v1/assistant/chat", {
            "query": "What are the primary anomaly signals and risk flags for this product?",
            "canonical_product_id": pid,
            "conversation_history": [
                {"role": "user", "content": "Hello, I need an investigation report."},
                {"role": "assistant", "content": "I am ready to analyze the product."}
            ]
        })

        assert status == 200
        assert "message" in resp
        assert resp["message"]["role"] == "assistant"
        assert len(resp["message"]["content"]) > 50
        assert "grounded_context" in resp
        assert resp["grounded_context"]["canonical_product_id"] == pid
        assert resp["grounded_context"]["is_grounded"] is True
        assert resp["provider_info"]["status"] in ("DETERMINISTIC_FALLBACK", "SUCCESS")

    def test_assistant_query_without_product(self, api_server):
        status, resp = api_server.dispatch("POST", "/api/v1/assistant/chat", {
            "query": "How does the zero-penalty sparsity invariant work?"
        })

        assert status == 200
        assert resp["grounded_context"]["is_grounded"] is False
        assert "TrustSphere" in resp["message"]["content"]

    def test_assistant_empty_query_rejected(self, api_server):
        status, resp = api_server.dispatch("POST", "/api/v1/assistant/chat", {
            "query": "   "
        })

        assert status == 400
        assert resp["code"] == "INVALID_QUERY"

    def test_assistant_unknown_product_rejected(self, api_server):
        status, resp = api_server.dispatch("POST", "/api/v1/assistant/chat", {
            "query": "Tell me about this item.",
            "canonical_product_id": "CANONICAL_NONEXISTENT_XYZ_99999"
        })

        assert status == 404
        assert resp["code"] == "PRODUCT_NOT_FOUND"
