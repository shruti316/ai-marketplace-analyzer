"""Production-Grade REST API Service for Trust Intelligence Platform.

Provides standalone HTTP server with JSON routing, CORS support,
error handling, health checks, and in-memory test dispatching using standard Python library.
"""

from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import logging
from pathlib import Path
import sys
import threading
import time
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import parse_qs, urlparse

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.trust_engine.api_service import TrustIntelligenceEngine

logger = logging.getLogger("TrustIntelligenceREST")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class TrustIntelligenceDispatcher:
    """Core routing and dispatch engine decoupling business logic from TCP/HTTP transport."""

    def __init__(self, dataset_dir: Optional[Path] = None):
        self.engine = TrustIntelligenceEngine(dataset_dir)

    def dispatch(
        self, method: str, path: str, payload: Optional[Dict[str, Any]] = None, query: Optional[Dict[str, List[str]]] = None
    ) -> Tuple[int, Dict[str, Any]]:
        """Processes request and returns (status_code, response_dict)."""
        parsed = urlparse(path)
        clean_path = parsed.path.rstrip("/")
        q = query or parse_qs(parsed.query)

        if method == "GET":
            # 1. Health check
            if clean_path in ["", "/health", "/api/v1/health"]:
                return 200, {
                    "status": "HEALTHY",
                    "version": "1.7.0",
                    "dataset_version": "v1.7",
                    "architecture": "Multimodal Trust Intelligence Platform",
                    "entities": {
                        "canonical_products": len(self.engine.evidence_engine.products_df),
                        "marketplace_listings": len(self.engine.evidence_engine.listings_df),
                        "sellers": len(self.engine.evidence_engine.sellers_df),
                    },
                    "modalities_ready": ["reviews", "images", "prices", "sellers", "graph"],
                    "timestamp": time.time(),
                }

            # 2. Product Trust Assessment
            elif clean_path.startswith("/api/v1/products/") and clean_path.endswith("/trust-assessment"):
                pid = clean_path.split("/")[4]
                if pid not in self.engine.evidence_engine.products_df["canonical_product_id"].values:
                    return 404, {"error": True, "status_code": 404, "message": f"Product '{pid}' not found in catalog."}
                return 200, self.engine.assess_product(pid)

            # 3. Product Atomic Evidence
            elif clean_path.startswith("/api/v1/products/") and clean_path.endswith("/evidence"):
                pid = clean_path.split("/")[4]
                if pid not in self.engine.evidence_engine.products_df["canonical_product_id"].values:
                    return 404, {"error": True, "status_code": 404, "message": f"Product '{pid}' not found in catalog."}
                ev = self.engine.get_product_evidence(pid)
                return 200, {"canonical_product_id": pid, "evidence_count": len(ev), "evidence": ev}

            # 4. Product Explainable Report
            elif clean_path.startswith("/api/v1/products/") and clean_path.endswith("/report"):
                pid = clean_path.split("/")[4]
                if pid not in self.engine.evidence_engine.products_df["canonical_product_id"].values:
                    return 404, {"error": True, "status_code": 404, "message": f"Product '{pid}' not found in catalog."}
                fmt = q.get("format", ["json"])[0].lower()
                report = self.engine.generate_explainable_report(pid, format="json" if fmt == "json" else "markdown")
                if fmt == "markdown":
                    return 200, {"format": "markdown", "report_markdown": report}
                return 200, report if isinstance(report, dict) else json.loads(report)

            # 5. Listing Trust Assessment
            elif clean_path.startswith("/api/v1/listings/") and clean_path.endswith("/trust-assessment"):
                lid = clean_path.split("/")[4]
                if lid not in self.engine.evidence_engine.listings_df["listing_id"].values:
                    return 404, {"error": True, "status_code": 404, "message": f"Listing '{lid}' not found in catalog."}
                return 200, self.engine.assess_listing(lid)

            # 6. Seller Governance Assessment
            elif clean_path.startswith("/api/v1/sellers/") and clean_path.endswith("/trust-assessment"):
                sid = clean_path.split("/")[4]
                if sid not in self.engine.evidence_engine.sellers_df["seller_id"].values:
                    return 404, {"error": True, "status_code": 404, "message": f"Seller '{sid}' not found in catalog."}
                return 200, self.engine.assess_seller(sid)

            return 404, {"error": True, "status_code": 404, "message": f"Endpoint '{clean_path}' not found."}

        elif method == "POST":
            # 1. Product Comparison
            if clean_path in ["/api/v1/compare"]:
                pids = (payload or {}).get("canonical_product_ids", [])
                if not isinstance(pids, list) or len(pids) == 0:
                    return 400, {"error": True, "status_code": 400, "message": "Payload must contain a non-empty 'canonical_product_ids' list."}
                return 200, self.engine.compare_products(pids)

            # 2. Ad-hoc raw payload inference
            elif clean_path in ["/api/v1/infer"]:
                payload = payload or {}
                title = payload.get("product_title", "Unknown Product")
                price = payload.get("observed_price_inr")
                mrp = payload.get("mrp_inr")
                reviews = payload.get("reviews", [])
                images = payload.get("images", [])

                has_price = price is not None and price > 0
                has_reviews = len(reviews) > 0
                has_images = len(images) > 0
                core_count = sum([has_price, has_reviews, has_images])

                tier = "UNASSESSED_SPARSE_DATA" if core_count < 2 else "LOW_OBSERVED_ANOMALY"
                flags = []
                if has_price and mrp and price > mrp:
                    flags.append("PRICE_EXCEEDS_MRP")
                    tier = "MODERATE_SINGLE_MODALITY_ANOMALY"

                return 200, {
                    "product_title": title,
                    "available_modalities_count": core_count,
                    "overall_risk_tier": tier,
                    "flags": flags,
                    "zero_penalty_invariant_applied": core_count < 2,
                    "timestamp": time.time(),
                }

            return 404, {"error": True, "status_code": 404, "message": f"Endpoint '{clean_path}' not found."}

        return 405, {"error": True, "status_code": 405, "message": f"Method '{method}' not allowed."}


class TrustIntelligenceRequestHandler(BaseHTTPRequestHandler):
    """HTTP Request Handler dispatching REST endpoints to the TrustIntelligenceDispatcher."""

    dispatcher: Optional[TrustIntelligenceDispatcher] = None

    def _set_headers(self, status_code: int = 200, content_type: str = "application/json"):
        self.send_response(status_code)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(204)

    def do_GET(self):
        try:
            status_code, resp = self.dispatcher.dispatch("GET", self.path)
            self._send_json(resp, status_code)
        except Exception as e:
            logger.error(f"Error handling GET {self.path}: {e}", exc_info=True)
            self._send_json({"error": True, "status_code": 500, "message": str(e)}, 500)

    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            payload = None
            if content_length > 0:
                body = self.rfile.read(content_length)
                payload = json.loads(body.decode("utf-8"))
            status_code, resp = self.dispatcher.dispatch("POST", self.path, payload)
            self._send_json(resp, status_code)
        except Exception as e:
            logger.error(f"Error handling POST {self.path}: {e}", exc_info=True)
            self._send_json({"error": True, "status_code": 500, "message": str(e)}, 500)

    def _send_json(self, data: Any, status_code: int = 200):
        body = json.dumps(data, indent=2, default=str).encode("utf-8")
        self._set_headers(status_code, "application/json")
        self.wfile.write(body)


class TrustIntelligenceRestServer:
    """Manages the REST API dispatcher and optional TCP HTTP server."""

    def __init__(self, host: str = "127.0.0.1", port: int = 8080, dataset_dir: Optional[Path] = None, bind_socket: bool = True):
        self.host = host
        self.port = port
        self.dispatcher = TrustIntelligenceDispatcher(dataset_dir)
        TrustIntelligenceRequestHandler.dispatcher = self.dispatcher
        self.httpd: Optional[HTTPServer] = None
        self.server_thread: Optional[threading.Thread] = None

        if bind_socket:
            self.httpd = HTTPServer((self.host, self.port), TrustIntelligenceRequestHandler)

    def dispatch(self, method: str, path: str, payload: Optional[Dict[str, Any]] = None) -> Tuple[int, Dict[str, Any]]:
        """In-memory request dispatch without network socket."""
        return self.dispatcher.dispatch(method, path, payload)

    def start_background(self):
        if self.httpd:
            self.server_thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
            self.server_thread.start()
            logger.info(f"REST API Server running on http://{self.host}:{self.port}")

    def stop(self):
        if self.httpd:
            self.httpd.shutdown()
            self.httpd.server_close()
            logger.info("REST API Server stopped.")


def create_app_server(host: str = "127.0.0.1", port: int = 8080, bind_socket: bool = True) -> TrustIntelligenceRestServer:
    return TrustIntelligenceRestServer(host, port, bind_socket=bind_socket)


if __name__ == "__main__":
    server = create_app_server(port=8080, bind_socket=True)
    print("Serving Trust Intelligence REST API on port 8080. Press Ctrl+C to stop.")
    try:
        server.httpd.serve_forever()
    except KeyboardInterrupt:
        server.stop()
