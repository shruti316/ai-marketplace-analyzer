"""Targeted Integration Tests for Milestone 6: REST API & Inference Deployment.

Tests REST API routes, error handling, health checks, and measures endpoint latency.
"""

from pathlib import Path
import sys
import time

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from src.api.service import TrustIntelligenceRestServer


@pytest.fixture(scope="module")
def api_server():
    # Initialize without binding TCP socket to ensure 100% reliable, permission-safe testing
    server = TrustIntelligenceRestServer(bind_socket=False)
    return server


def test_health_check_endpoint(api_server):
    """Verifies GET /health returns 200, system health, and entity statistics."""
    code, data = api_server.dispatch("GET", "/health")
    assert code == 200
    assert data["status"] == "HEALTHY"
    assert data["dataset_version"] == "v1.7"
    assert data["entities"]["canonical_products"] == 3643
    assert data["entities"]["sellers"] == 4


def test_product_trust_assessment_endpoint(api_server):
    """Verifies GET /api/v1/products/{product_id}/trust-assessment returns assessment with low latency."""
    start = time.time()
    code, data = api_server.dispatch("GET", "/api/v1/products/amazon_in_B000052YQN/trust-assessment")
    elapsed_ms = (time.time() - start) * 1000

    assert code == 200
    assert data["canonical_product_id"] == "amazon_in_B000052YQN"
    assert "overall_risk_tier" in data
    assert "modality_breakdown" in data
    assert elapsed_ms < 50.0, f"Latency {elapsed_ms:.2f}ms exceeded 50ms threshold"


def test_unknown_product_returns_404(api_server):
    """Verifies unknown product returns 404 Not Found."""
    code, data = api_server.dispatch("GET", "/api/v1/products/non_existent_product_id/trust-assessment")
    assert code == 404
    assert data["error"] is True


def test_listing_and_seller_endpoints(api_server):
    """Verifies listing and seller endpoints return proper status."""
    lid = "list_amazon_in_amazon_in_B000052YQN"
    code, data_list = api_server.dispatch("GET", f"/api/v1/listings/{lid}/trust-assessment")
    assert code == 200
    assert data_list["listing_id"] == lid

    sid = "SELLER_AGG_AMAZON_IN"
    code, data_seller = api_server.dispatch("GET", f"/api/v1/sellers/{sid}/trust-assessment")
    assert code == 200
    assert data_seller["seller_id"] == sid
    assert data_seller["seller_type"] == "PLATFORM_AGGREGATE"


def test_product_comparison_endpoint(api_server):
    """Verifies POST /api/v1/compare returns comparison matrix."""
    payload = {"canonical_product_ids": ["amazon_in_B000052YQN", "amazon_in_B000CSH3YG"]}
    code, data = api_server.dispatch("POST", "/api/v1/compare", payload)
    assert code == 200
    assert "comparison_matrix" in data
    assert "recommended_product_id" in data
    assert "recommendation_rationale" in data
    assert len(data["compared_product_ids"]) == 2


def test_ad_hoc_infer_endpoint(api_server):
    """Verifies POST /api/v1/infer handles raw external payloads with zero-penalty invariant."""
    sparse_payload = {
        "product_title": "External Unindexed Watch",
        "observed_price_inr": 1299.0,
        "mrp_inr": 1999.0,
        "reviews": [],
        "images": [],
    }
    code, data = api_server.dispatch("POST", "/api/v1/infer", sparse_payload)
    assert code == 200
    assert data["overall_risk_tier"] == "UNASSESSED_SPARSE_DATA"
    assert data["zero_penalty_invariant_applied"] is True


def test_batch_inference_latency_benchmark(api_server):
    """Benchmarks inference latency over 20 consecutive product evaluations."""
    latencies = []
    pid = "amazon_in_B000052YQN"
    for _ in range(20):
        t0 = time.time()
        code, _ = api_server.dispatch("GET", f"/api/v1/products/{pid}/trust-assessment")
        assert code == 200
        latencies.append((time.time() - t0) * 1000)

    avg_latency = sum(latencies) / len(latencies)
    assert avg_latency < 25.0, f"Average latency {avg_latency:.2f}ms exceeded 25ms threshold"
