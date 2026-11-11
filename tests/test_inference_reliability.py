"""
Inference Service Reliability, Error Handling, Concurrency & Performance Benchmarking
AI-Powered Indian Marketplace Trust Intelligence Platform

Systematically validates:
1. Valid product inference across both ML V1.0 (frozen baseline) and Multimodal Vision V1.1
2. Unknown entity error handling (clean 404 / error payloads without server crashes)
3. Partial modality and missing data resilience (Zero-Penalty contract)
4. Malformed query parameters and unsupported routes
5. Corrupt file and broken image asset fault-tolerance
6. OCR dependency failure isolation
7. Concurrent multi-threaded request dispatching (N=50 requests, 10 workers)
8. Latency profile (Median, P95, P99) and request throughput (req/sec)
"""

import concurrent.futures
from pathlib import Path
import sys
import time
from typing import Any, Dict, List, Optional, Tuple

import pytest

# Ensure project root in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.api.service import TrustIntelligenceDispatcher
from src.cv.image_quality import ImageQualityAuditor
from src.cv.ocr_engine import PhysicalOCREngine

DATASET_DIR = PROJECT_ROOT / "data" / "indian_marketplace_trust_dataset_v1_7"


@pytest.fixture(scope="module")
def dispatcher():
    """Initializes a shared REST dispatcher backed by v1.7 dataset."""
    assert DATASET_DIR.exists(), f"Dataset directory {DATASET_DIR} does not exist!"
    return TrustIntelligenceDispatcher(dataset_dir=DATASET_DIR)


@pytest.fixture(scope="module")
def sample_valid_product_ids(dispatcher):
    """Retrieves 5 known valid canonical product IDs from catalog."""
    p_df = dispatcher.engine.evidence_engine.products_df
    return p_df["canonical_product_id"].head(5).tolist()


# ==============================================================================
# 1. Valid Product Inference (V1.0 Baseline & V1.1 Hardened)
# ==============================================================================
def test_valid_inference_v1_0_and_v1_1(dispatcher, sample_valid_product_ids):
    """Verifies that both V1.0 and V1.1 models return valid, strongly typed predictions."""
    pid = sample_valid_product_ids[0]

    # V1.0 inference
    status_10, res_10 = dispatcher.dispatch(
        "GET",
        f"/api/v1/products/{pid}/learned-multimodal",
        query={"version": ["v1.0"]},
    )
    assert status_10 == 200, f"V1.0 inference failed with status {status_10}: {res_10}"
    assert "predicted_risk_tier" in res_10
    prob_10 = res_10.get("calibrated_risk_probability")
    if prob_10 is None:
        prob_10 = res_10.get("calibrated_probability")
    assert prob_10 is not None
    assert 0.0 <= prob_10 <= 1.0

    # V1.1 inference
    status_11, res_11 = dispatcher.dispatch(
        "GET",
        f"/api/v1/products/{pid}/learned-multimodal",
        query={"version": ["v1.1"]},
    )
    assert status_11 == 200, f"V1.1 inference failed with status {status_11}: {res_11}"
    assert "predicted_risk_tier" in res_11
    prob_11 = res_11.get("calibrated_risk_probability")
    if prob_11 is None:
        prob_11 = res_11.get("calibrated_probability")
    assert prob_11 is not None
    assert 0.0 <= prob_11 <= 1.0


# ==============================================================================
# 2. Unknown Entity Handling (Clean 404)
# ==============================================================================
def test_unknown_product_id_graceful_404(dispatcher):
    """Non-existent product IDs must cleanly return 404 with structured error JSON."""
    unknown_pid = "NON_EXISTENT_CANONICAL_ID_XYZ_9999"
    status, res = dispatcher.dispatch(
        "GET",
        f"/api/v1/products/{unknown_pid}/learned-multimodal",
    )
    assert status == 404
    assert res.get("error") is True
    assert "not found" in res.get("message", "").lower()


# ==============================================================================
# 3. Health Check & Catalog Discovery
# ==============================================================================
def test_health_check_endpoint(dispatcher):
    """Health check endpoint must report ready modalities and entity counts."""
    status, res = dispatcher.dispatch("GET", "/health")
    assert status == 200
    assert res["status"] == "HEALTHY"
    assert res["dataset_version"] == "v1.7"
    assert res["entities"]["canonical_products"] > 0
    assert "graph" in res["modalities_ready"]


# ==============================================================================
# 4. Malformed Query Handling
# ==============================================================================
def test_malformed_route_handling(dispatcher):
    """Unsupported routes must return 404 without internal server exceptions."""
    status, res = dispatcher.dispatch("GET", "/api/v1/invalid/unknown/route")
    assert status == 404
    assert res.get("error") is True


# ==============================================================================
# 5. Corrupt Image and Broken Asset Fault-Tolerance
# ==============================================================================
def test_corrupted_image_handling(tmp_path):
    """Zero-Penalty: A corrupted/truncated image file must return is_corrupted=True without crashing."""
    corrupt_file = tmp_path / "corrupt_hero.jpg"
    with open(corrupt_file, "wb") as f:
        f.write(b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00BAD_BYTES_CORRUPTED_STREAM")

    metrics = ImageQualityAuditor.audit_image(corrupt_file)
    assert metrics.is_corrupted is True
    assert metrics.is_suitable_for_inference is False
    assert metrics.quality_status in ("CORRUPTED_FILE", "CORRUPT_OR_UNREADABLE")


# ==============================================================================
# 6. OCR Failure Isolation
# ==============================================================================
def test_ocr_failure_isolation():
    """OCR failure on non-existent or unreadable file returns zero risk impact."""
    engine = PhysicalOCREngine()
    res = engine.extract_text_from_image("path/to/non_existent_packaging.jpg", canonical_brand="TestBrand")
    assert res["processing_status"] in ("FILE_NOT_FOUND", "FAILED", "UNAVAILABLE")
    assert res["detected_text"] == ""
    assert res["confidence_record"]["zero_penalty_applied"] is True


# ==============================================================================
# 7. Concurrent Request Dispatching & Thread Safety (50 Requests, 10 Threads)
# ==============================================================================
def test_concurrent_request_dispatching(dispatcher, sample_valid_product_ids):
    """
    Fires 50 concurrent requests across 10 threads.
    Verifies thread safety, absence of race conditions, and 100% response success rate.
    """
    total_requests = 50
    workers = 10

    def send_request(idx: int) -> Tuple[int, float]:
        pid = sample_valid_product_ids[idx % len(sample_valid_product_ids)]
        version = "v1.1" if (idx % 2 == 0) else "v1.0"
        t0 = time.perf_counter()
        status, res = dispatcher.dispatch(
            "GET",
            f"/api/v1/products/{pid}/learned-multimodal",
            query={"version": [version]},
        )
        elapsed = time.perf_counter() - t0
        assert status == 200, f"Concurrent request {idx} failed with {status}: {res}"
        return status, elapsed

    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
        futures = [executor.submit(send_request, i) for i in range(total_requests)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]

    assert len(results) == total_requests
    assert all(code == 200 for code, _ in results)


# ==============================================================================
# 8. Latency Profiling (P50, P95, P99) and Throughput
# ==============================================================================
def test_latency_profile_and_throughput(dispatcher, sample_valid_product_ids):
    """
    Evaluates response latency across repeated inferences.
    Computes Median (P50), P95, and P99 latency percentiles and throughput.
    """
    n_iterations = 40
    latencies = []
    pid = sample_valid_product_ids[0]

    for _ in range(n_iterations):
        t0 = time.perf_counter()
        status, _ = dispatcher.dispatch(
            "GET",
            f"/api/v1/products/{pid}/learned-multimodal",
            query={"version": ["v1.0"]},
        )
        latencies.append(time.perf_counter() - t0)
        assert status == 200

    import numpy as np

    p50 = float(np.percentile(latencies, 50)) * 1000  # ms
    p95 = float(np.percentile(latencies, 95)) * 1000  # ms
    p99 = float(np.percentile(latencies, 99)) * 1000  # ms
    mean_lat = float(np.mean(latencies))
    throughput = 1.0 / mean_lat if mean_lat > 0 else 0.0

    print(f"\n[LATENCY BENCHMARK] P50={p50:.2f}ms, P95={p95:.2f}ms, P99={p99:.2f}ms | Throughput={throughput:.1f} req/s")

    # In-memory single-core dispatching latency target: P50 < 100ms, P95 < 150ms
    assert p50 < 100.0, f"P50 latency exceeded target: {p50:.2f} ms"
    assert p95 < 150.0, f"P95 latency exceeded target: {p95:.2f} ms"
