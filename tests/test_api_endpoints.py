"""Targeted Integration Tests for Milestone 6: REST API & Inference Deployment.

Tests REST API routes, error handling, health checks, and measures endpoint latency.
"""

from pathlib import Path
import sys
import time

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from src.api.service import TrustIntelligenceRestServer, create_app_server


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


def test_product_report_endpoint_json(api_server):
    """Verifies GET /api/v1/products/{product_id}/report returns structured JSON report."""
    pid = "amazon_in_B000052YQN"
    # Explicit format=json
    code, data = api_server.dispatch("GET", f"/api/v1/products/{pid}/report?format=json")
    assert code == 200
    assert isinstance(data, dict)
    assert "section_1_product_metadata" in data
    assert "section_2_overall_assessment" in data
    assert "section_12_confidence_and_limitations" in data
    assert data["section_1_product_metadata"]["canonical_product_id"] == pid

    # Default format (should default to JSON)
    code_def, data_def = api_server.dispatch("GET", f"/api/v1/products/{pid}/report")
    assert code_def == 200
    assert isinstance(data_def, dict)
    assert "section_1_product_metadata" in data_def


def test_product_report_endpoint_markdown(api_server):
    """Verifies GET /api/v1/products/{product_id}/report?format=markdown returns Markdown payload."""
    pid = "amazon_in_B000052YQN"
    code, data = api_server.dispatch("GET", f"/api/v1/products/{pid}/report?format=markdown")
    assert code == 200
    assert isinstance(data, dict)
    assert data["format"] == "markdown"
    assert "report_markdown" in data
    assert isinstance(data["report_markdown"], str)
    assert f"# Multimodal Trust Assessment Report: `{pid}`" in data["report_markdown"]
    assert "## 1. Product & Listing Metadata" in data["report_markdown"]


def test_product_report_unknown_product_returns_404(api_server):
    """Verifies unknown product report request returns 404."""
    code, data = api_server.dispatch("GET", "/api/v1/products/non_existent_product_id/report")
    assert code == 404
    assert data["error"] is True


def test_product_comparison_alias_endpoint(api_server):
    """Verifies POST /api/v1/products/compare alias produces identical results to /api/v1/compare."""
    payload = {"canonical_product_ids": ["amazon_in_B000052YQN", "amazon_in_B000CSH3YG"]}
    code_alias, data_alias = api_server.dispatch("POST", "/api/v1/products/compare", payload)
    assert code_alias == 200
    assert "comparison_matrix" in data_alias
    assert "recommended_product_id" in data_alias
    assert len(data_alias["compared_product_ids"]) == 2

    # Verify equivalence with existing route
    code_orig, data_orig = api_server.dispatch("POST", "/api/v1/compare", payload)
    assert code_orig == 200
    assert data_alias["compared_product_ids"] == data_orig["compared_product_ids"]
    assert data_alias["recommended_product_id"] == data_orig["recommended_product_id"]
    assert data_alias["evidence_density_ranking"] == data_orig["evidence_density_ranking"]


def test_product_subgraph_valid(api_server):
    """Verifies GET /api/v1/products/{product_id}/subgraph returns local graph neighborhood."""
    pid = "amazon_in_B000052YQN"
    code, data = api_server.dispatch("GET", f"/api/v1/products/{pid}/subgraph?depth=1")
    assert code == 200
    assert data["root_entity_id"] == pid
    assert data["depth"] == 1
    assert "nodes" in data
    assert "edges" in data
    assert data["total_nodes"] >= 1


def test_product_subgraph_invalid_depth(api_server):
    """Verifies invalid or non-positive depth parameters return HTTP 400 Bad Request."""
    pid = "amazon_in_B000052YQN"

    # Non-integer depth
    code_str, data_str = api_server.dispatch("GET", f"/api/v1/products/{pid}/subgraph?depth=invalid")
    assert code_str == 400
    assert data_str["error"] is True
    assert "Invalid depth" in data_str["message"]

    # Negative depth
    code_neg, data_neg = api_server.dispatch("GET", f"/api/v1/products/{pid}/subgraph?depth=-2")
    assert code_neg == 400
    assert data_neg["error"] is True
    assert "positive integer" in data_neg["message"]

    # Zero depth
    code_zero, data_zero = api_server.dispatch("GET", f"/api/v1/products/{pid}/subgraph?depth=0")
    assert code_zero == 400
    assert data_zero["error"] is True
    assert "positive integer" in data_zero["message"]


def test_product_subgraph_unknown_product_returns_404(api_server):
    """Verifies unknown product subgraph request returns 404 Not Found."""
    code, data = api_server.dispatch("GET", "/api/v1/products/non_existent_product_id/subgraph")
    assert code == 404
    assert data["error"] is True
    assert "not found in catalog" in data["message"]


def test_environment_based_server_configuration(monkeypatch):
    """Verifies host and port resolution from environment variables and explicit overrides."""
    # 1. Default resolution (no env vars, no args) -> 127.0.0.1:8000
    monkeypatch.delenv("SERVICE_HOST", raising=False)
    monkeypatch.delenv("SERVICE_PORT", raising=False)
    server_default = create_app_server(bind_socket=False)
    assert server_default.host == "127.0.0.1"
    assert server_default.port == 8000

    # 2. Environment override
    monkeypatch.setenv("SERVICE_HOST", "0.0.0.0")
    monkeypatch.setenv("SERVICE_PORT", "9090")
    server_env = create_app_server(bind_socket=False)
    assert server_env.host == "0.0.0.0"
    assert server_env.port == 9090

    # 3. Explicit parameter override takes precedence over env
    server_explicit = create_app_server(host="10.0.0.1", port=7070, bind_socket=False)
    assert server_explicit.host == "10.0.0.1"
    assert server_explicit.port == 7070
