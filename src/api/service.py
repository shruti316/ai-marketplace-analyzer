"""Production-Grade REST API Service for Trust Intelligence Platform.

Provides standalone HTTP server with JSON routing, CORS support,
error handling, health checks, and in-memory test dispatching using standard Python library.
"""

from http.server import BaseHTTPRequestHandler, HTTPServer
try:
    from http.server import ThreadingHTTPServer
except ImportError:
    ThreadingHTTPServer = HTTPServer
import json
import logging
import os
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
from src.api.inspect_service import ImageInspectionService, ImageInspectionError
from src.api.assistant_service import EvidenceGroundedAssistantService

logger = logging.getLogger("TrustIntelligenceREST")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class TrustIntelligenceDispatcher:
    """Core routing and dispatch engine decoupling business logic from TCP/HTTP transport."""

    def __init__(self, dataset_dir: Optional[Path] = None):
        self.engine = TrustIntelligenceEngine(dataset_dir)
        self.inspect_service = ImageInspectionService(dataset_dir=dataset_dir)
        self.assistant_service = EvidenceGroundedAssistantService(self.engine)

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
            elif clean_path.startswith("/api/v1/products/") and clean_path.endswith("/learned-multimodal"):
                pid = clean_path.split("/")[4]
                if pid not in self.engine.evidence_engine.products_df["canonical_product_id"].values:
                    return 404, {"error": True, "status_code": 404, "message": f"Product '{pid}' not found in catalog."}
                version = q.get("version", ["v1.0"])[0]
                return 200, self.engine.assess_product_learned_multimodal(pid, version=version)

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
                report = self.engine.generate_report(pid, format_type="json" if fmt == "json" else "markdown")
                if fmt == "markdown":
                    return 200, {"format": "markdown", "report_markdown": report}
                return 200, report if isinstance(report, dict) else json.loads(report)

            # 5. Product Subgraph
            elif clean_path.startswith("/api/v1/products/") and clean_path.endswith("/subgraph"):
                pid = clean_path.split("/")[4]
                if pid not in self.engine.evidence_engine.products_df["canonical_product_id"].values:
                    return 404, {"error": True, "status_code": 404, "message": f"Product '{pid}' not found in catalog."}
                depth_raw = q.get("depth", ["1"])[0]
                try:
                    depth = int(depth_raw)
                    if depth < 1:
                        return 400, {"error": True, "status_code": 400, "message": f"Depth must be a positive integer, got '{depth_raw}'."}
                except (ValueError, TypeError):
                    return 400, {"error": True, "status_code": 400, "message": f"Invalid depth parameter '{depth_raw}'. Must be an integer."}
                return 200, self.engine.get_entity_subgraph(pid, depth=depth)

            # 6. Listing Trust Assessment
            elif clean_path.startswith("/api/v1/listings/") and clean_path.endswith("/trust-assessment"):
                lid = clean_path.split("/")[4]
                if lid not in self.engine.evidence_engine.listings_df["listing_id"].values:
                    return 404, {"error": True, "status_code": 404, "message": f"Listing '{lid}' not found in catalog."}
                return 200, self.engine.assess_listing(lid)

            # 7. Seller Governance Assessment
            elif clean_path.startswith("/api/v1/sellers/") and clean_path.endswith("/trust-assessment"):
                sid = clean_path.split("/")[4]
                if sid not in self.engine.evidence_engine.sellers_df["seller_id"].values:
                    return 404, {"error": True, "status_code": 404, "message": f"Seller '{sid}' not found in catalog."}
                return 200, self.engine.assess_seller(sid)

            # 8. Modality Ablation Studies
            elif clean_path in ["/api/v1/ablations", "/ablations"]:
                version = q.get("version", ["v1.0"])[0]
                return 200, self.engine.get_modality_ablations(version=version)

            return 404, {"error": True, "status_code": 404, "message": f"Endpoint '{clean_path}' not found."}

        elif method == "POST":
            # 1. Product Comparison
            if clean_path in ["/api/v1/compare", "/api/v1/products/compare"]:
                pids = (payload or {}).get("canonical_product_ids", [])
                if not isinstance(pids, list) or len(pids) == 0:
                    return 400, {"error": True, "status_code": 400, "message": "Payload must contain a non-empty 'canonical_product_ids' list."}
                return 200, self.engine.compare_products(pids)

            # 2. Ad-hoc raw payload inference (Live Real-Time Multimodal Intelligence)
            elif clean_path in ["/api/v1/infer"]:
                payload = payload or {}
                title = payload.get("product_title", "Marketplace Product")
                brand = payload.get("brand") or payload.get("brand_id") or "Generic"
                category = payload.get("category", "General")
                price = float(payload.get("observed_price_inr") or 1500.0)
                mrp = float(payload.get("mrp_inr") or (price * 1.6))
                raw_reviews = payload.get("reviews", [])
                marketplace = payload.get("marketplace", "Online Marketplace")

                # Parse reviews format
                formatted_reviews = []
                if isinstance(raw_reviews, list):
                    for idx, r in enumerate(raw_reviews):
                        if isinstance(r, str) and r.strip():
                            formatted_reviews.append({
                                "review_id": f"rev_{idx+1}",
                                "rating": 3.0,
                                "review_text": r.strip(),
                                "verified_purchase": True
                            })
                        elif isinstance(r, dict):
                            formatted_reviews.append(r)

                from src.assistant.interactive_agent import TrustSphereAIAssistant
                from src.trust_engine.downloadable_report import DownloadableReportGenerator
                from dataclasses import asdict

                assistant_engine = TrustSphereAIAssistant(use_clip=False)
                diagnosis = assistant_engine.analyze_product_query(
                    product_title=title,
                    brand=brand,
                    category=category,
                    marketplace=marketplace,
                    listing_price=price,
                    claimed_mrp=mrp,
                    sample_reviews=formatted_reviews if formatted_reviews else None
                )

                # Generate publication-quality base64 charts
                report_gen = DownloadableReportGenerator()
                p = diagnosis.pricing_analysis
                c_price = report_gen.visualizer.generate_price_corridor_chart(
                    p.listing_price, p.claimed_mrp, p.genuine_market_corridor_min,
                    p.genuine_market_corridor_max, p.corridor_median,
                    p.genuine_market_corridor_min * 0.72, diagnosis.product_title
                )
                aspect_dict = diagnosis.review_summary.get("aspect_findings", {}) if diagnosis.review_summary else {}
                c_aspect = report_gen.visualizer.generate_aspect_sentiment_chart(aspect_dict)
                c_radar = report_gen.visualizer.generate_multimodal_radar_chart(
                    {"Price Realism": 25.0 if p.is_price_suspicious else 90.0, "Review Trust": 25.0, "Visual Quality": 60.0, "Packaging Compliance": 40.0, "Seller Authenticity": 35.0},
                    {"Price Realism": 85.0, "Review Trust": 88.0, "Visual Quality": 92.0, "Packaging Compliance": 95.0, "Seller Authenticity": 90.0}
                )
                c_defects = report_gen.visualizer.generate_defect_distribution_chart(diagnosis.identified_gaps)

                resp_data = asdict(diagnosis)
                available_mods = 1  # Pricing corridor
                if diagnosis.review_summary:
                    available_mods += 1
                if diagnosis.visual_summary and diagnosis.visual_summary.get("evaluation_state") == "COMPLETED":
                    available_mods += 1

                resp_data["available_modalities_count"] = available_mods
                resp_data["confidence_score"] = round(0.55 + (available_mods * 0.13), 2)
                resp_data["overall_risk_tier"] = diagnosis.risk_tier
                resp_data["overall_trust_score"] = float(diagnosis.overall_trust_score)
                resp_data["trust_score"] = float(diagnosis.overall_trust_score)
                resp_data["flags"] = [g.title for g in diagnosis.identified_gaps if g.severity == "CRITICAL_BLOCKER"]
                resp_data["zero_penalty_invariant_applied"] = False
                resp_data["charts"] = {
                    "price_corridor": c_price,
                    "aspect_sentiment": c_aspect,
                    "radar": c_radar,
                    "defect_distribution": c_defects
                }
                try:
                    resp_data["report_html"] = report_gen.generate_html_report(diagnosis)
                except Exception as ex:
                    logger.warning(f"Could not compile standalone HTML report: {ex}")
                    resp_data["report_html"] = None
                resp_data["timestamp"] = time.time()
                return 200, resp_data

            # 3. Image Inspection Endpoint
            elif clean_path in ["/api/v1/inspect/image", "/inspect/image"]:
                payload = payload or {}
                try:
                    result = self.inspect_service.inspect_image(
                        image_base64=payload.get("image_base64"),
                        image_path=payload.get("image_path"),
                        canonical_brand=payload.get("canonical_brand"),
                        product_title=payload.get("product_title"),
                    )
                    return 200, result
                except ImageInspectionError as e:
                    return e.status_code, {"error": True, "status_code": e.status_code, "code": e.code, "message": str(e)}
                except Exception as e:
                    logger.error(f"Image inspection unhandled failure: {e}", exc_info=True)
                    return 500, {"error": True, "status_code": 500, "code": "IMAGE_INSPECTION_FAILED", "message": str(e)}

            # 4. Evidence-Grounded Assistant Endpoint
            elif clean_path in ["/api/v1/assistant/chat", "/assistant/chat"]:
                payload = payload or {}
                query_str = payload.get("query")
                if not query_str or not isinstance(query_str, str) or not query_str.strip():
                    return 400, {"error": True, "status_code": 400, "code": "INVALID_QUERY", "message": "'query' is required and must be non-empty string."}
                pid = payload.get("canonical_product_id")
                history = payload.get("conversation_history", [])
                try:
                    resp = self.assistant_service.process_chat_query(
                        query=query_str,
                        canonical_product_id=pid,
                        conversation_history=history,
                    )
                    return 200, resp
                except KeyError as e:
                    return 404, {"error": True, "status_code": 404, "code": "PRODUCT_NOT_FOUND", "message": str(e).strip("'\"")}
                except ValueError as e:
                    return 400, {"error": True, "status_code": 400, "code": "INVALID_INPUT", "message": str(e)}
                except Exception as e:
                    logger.error(f"Assistant processing failure: {e}", exc_info=True)
                    return 500, {"error": True, "status_code": 500, "code": "ASSISTANT_FAILED", "message": str(e)}

            # 7. Modality Ablation Studies
            elif clean_path in ["/api/v1/ablations", "/ablations"]:
                version = q.get("version", ["v1.0"])[0]
                return 200, self.engine.get_modality_ablations(version=version)

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
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Connection", "close")
        self.end_headers()
        self.wfile.write(body)
        self.wfile.flush()


class TrustIntelligenceRestServer:
    """Manages the REST API dispatcher and optional TCP HTTP server."""

    def __init__(
        self,
        host: Optional[str] = None,
        port: Optional[int] = None,
        dataset_dir: Optional[Path] = None,
        bind_socket: bool = True,
    ):
        self.host = host if host is not None else os.environ.get("SERVICE_HOST", "127.0.0.1")
        self.port = int(port if port is not None else os.environ.get("SERVICE_PORT", "8000"))
        self.dispatcher = TrustIntelligenceDispatcher(dataset_dir)
        TrustIntelligenceRequestHandler.dispatcher = self.dispatcher
        self.httpd: Optional[HTTPServer] = None
        self.server_thread: Optional[threading.Thread] = None

        if bind_socket:
            self.httpd = ThreadingHTTPServer((self.host, self.port), TrustIntelligenceRequestHandler)

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


def create_app_server(
    host: Optional[str] = None,
    port: Optional[int] = None,
    bind_socket: bool = True,
) -> TrustIntelligenceRestServer:
    resolved_host = host if host is not None else os.environ.get("SERVICE_HOST", "127.0.0.1")
    resolved_port = int(port if port is not None else os.environ.get("SERVICE_PORT", "8000"))
    return TrustIntelligenceRestServer(host=resolved_host, port=resolved_port, bind_socket=bind_socket)


if __name__ == "__main__":
    host = os.environ.get("SERVICE_HOST", "127.0.0.1")
    port = int(os.environ.get("SERVICE_PORT", "8000"))
    server = create_app_server(host=host, port=port, bind_socket=True)
    print(f"Serving Trust Intelligence REST API on http://{host}:{port}. Press Ctrl+C to stop.")
    try:
        server.httpd.serve_forever()
    except KeyboardInterrupt:
        server.stop()
