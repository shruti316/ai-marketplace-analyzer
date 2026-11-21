"""TrustSphere Machine Learning & Computer Vision Inference Service.

Hugging Face Spaces + Gradio + ZeroGPU Runtime.
Provides decoupled computer vision, physical packaging OCR,
and multimodal trust prediction for the TrustSphere platform.
"""

import os
from pathlib import Path
import sys
import time
from typing import Any, Dict, Optional, Tuple

from PIL import Image

# Add current workspace directory to sys.path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# ZeroGPU Decorator Compatibility Wrapper
try:
    import spaces  # type: ignore
    HAS_ZEROGPU = True
except ImportError:
    HAS_ZEROGPU = False
    # Transparent CPU mock for local development and non-Linux test environments
    class _MockSpaces:
        @staticmethod
        def GPU(fn=None, duration=None):
            def decorator(func):
                return func
            if fn is not None:
                return fn
            return decorator
    spaces = _MockSpaces()

import gradio as gr
from src.cv.visual_inspector import UpgradedVisualInspector, get_shared_clip
from src.cv.ocr_engine import PhysicalOCREngine, PackagingIdentifierExtractor
from src.trust_engine.api_service import TrustIntelligenceEngine

DATASET_DIR = BASE_DIR / "data" / "indian_marketplace_trust_dataset_v1_7"
MODELS_DIR = BASE_DIR / "models"

# Lazy-loaded singleton engines
_ENGINE: Optional[TrustIntelligenceEngine] = None
_INSPECTOR: Optional[UpgradedVisualInspector] = None
_OCR_ENGINE: Optional[PhysicalOCREngine] = None


def get_trust_engine() -> TrustIntelligenceEngine:
    global _ENGINE
    if _ENGINE is None:
        _ENGINE = TrustIntelligenceEngine(dataset_dir=DATASET_DIR)
    return _ENGINE


def get_visual_inspector() -> UpgradedVisualInspector:
    global _INSPECTOR
    if _INSPECTOR is None:
        _INSPECTOR = UpgradedVisualInspector(use_clip=True)
    return _INSPECTOR


def get_ocr_engine() -> PhysicalOCREngine:
    global _OCR_ENGINE
    if _OCR_ENGINE is None:
        _OCR_ENGINE = PhysicalOCREngine(dataset_dir=DATASET_DIR)
    return _OCR_ENGINE


# =============================================================================
# TAB A: Product Image Analysis (ZeroGPU Accelerated CLIP Forward Pass)
# =============================================================================

@spaces.GPU(duration=15)
def analyze_product_image(
    image: Optional[Image.Image],
    listing_title: str,
    claimed_brand: str,
    claimed_mrp: Optional[float] = None
) -> Tuple[Dict[str, float], float, Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
    """Runs zero-shot CLIP classification, image quality audit, and cross-modal alignment."""
    if image is None:
        return (
            {"Error: No Image": 1.0},
            0.0,
            {"error": "Please upload a product image."},
            {},
            {}
        )

    # Abuse protection: cap resolution to 2048x2048 to prevent memory exhaustion
    if image.width > 2048 or image.height > 2048:
        image = image.copy()
        image.thumbnail((2048, 2048), Image.Resampling.LANCZOS)
    listing_title = (listing_title or "Product")[:300]
    claimed_brand = (claimed_brand or "Unknown")[:100]

    inspector = get_visual_inspector()
    report = inspector.inspect_product_image(
        image_input=image,
        listing_title=listing_title or "Product",
        claimed_mrp=float(claimed_mrp) if claimed_mrp else None,
        claimed_brand=claimed_brand or "Unknown"
    )

    # Risk Tier output for gr.Label
    risk_mapping = {
        "LOW": {"Low Visual Risk": 0.95, "Medium Visual Risk": 0.05, "High Visual Risk": 0.0},
        "MEDIUM": {"Low Visual Risk": 0.1, "Medium Visual Risk": 0.8, "High Visual Risk": 0.1},
        "HIGH": {"Low Visual Risk": 0.0, "Medium Visual Risk": 0.15, "High Visual Risk": 0.85}
    }
    tier_label = risk_mapping.get(report.visual_risk_tier, {"Unassessed": 1.0})

    alignment_score = round(float(report.clip_result.cosine_similarity), 4)

    zero_shot_findings = {
        "detected_category": report.zero_shot.detected_category,
        "category_confidence": round(float(report.zero_shot.category_confidence), 4),
        "detected_brand": report.zero_shot.detected_brand_guess or "Unbranded / Ambiguous",
        "brand_confidence": round(float(report.zero_shot.brand_confidence), 4),
        "is_brand_confident": report.zero_shot.is_brand_confident,
        "title_image_consistent": report.zero_shot.title_image_consistent,
        "consistency_score": round(float(report.zero_shot.consistency_score), 4),
        "consistency_note": report.zero_shot.consistency_note,
        "model_used": report.zero_shot.model_used,
        "inference_device": report.zero_shot.inference_device
    }

    quality_metrics = report.quality_metrics

    forensic_audit = {
        "visual_risk_tier": report.visual_risk_tier,
        "visual_defects": report.visual_defects,
        "forensic_notes": report.forensic_notes,
        "is_discordant": report.clip_result.is_discordant,
        "discrepancy_explanation": report.clip_result.discrepancy_explanation
    }

    return tier_label, alignment_score, zero_shot_findings, quality_metrics, forensic_audit


# =============================================================================
# TAB B: OCR Packaging Compliance Analysis (CPU)
# =============================================================================

def analyze_packaging_ocr(
    packaging_image: Optional[Image.Image],
    claimed_mrp: Optional[float] = None,
    claimed_brand: str = ""
) -> Tuple[Dict[str, float], Dict[str, Any], str, str]:
    """Runs Tesseract OCR and Legal Metrology Act identifier extraction with zero-penalty guard."""
    if packaging_image is None:
        return (
            {"Error: No Image": 1.0},
            {"error": "Please upload packaging photo."},
            "No text extracted.",
            "N/A"
        )

    # Abuse protection: cap resolution to 2048x2048 to prevent memory exhaustion
    if packaging_image.width > 2048 or packaging_image.height > 2048:
        packaging_image = packaging_image.copy()
        packaging_image.thumbnail((2048, 2048), Image.Resampling.LANCZOS)
    claimed_brand = (claimed_brand or "")[:100]

    ocr = get_ocr_engine()
    raw_text = ocr.recognize_pil_text(packaging_image)
    identifiers = PackagingIdentifierExtractor.extract_identifiers(raw_text)

    # Word count and brand matching
    word_count = len(raw_text.split()) if raw_text else 0
    from src.cv.ocr_engine import PackagingBrandMatcher
    brand_status, brand_tokens, brand_conf = PackagingBrandMatcher.match_brand(
        claimed_brand, raw_text, word_count
    )
    identifiers["brand_alignment_status"] = brand_status
    identifiers["brand_tokens_detected"] = brand_tokens
    identifiers["brand_match_confidence"] = round(float(brand_conf), 4)

    # Compliance status & zero-penalty rule
    if word_count == 0:
        compliance_status = {"No Packaging Text (Zero-Penalty Rule)": 0.95, "Violation": 0.05}
        zero_penalty_note = "ACTIVE (Preserved Invariant: Clean product photos without packaging text are NEVER penalized)."
    else:
        mrp_detected = identifiers.get("mrp_detected")
        if claimed_mrp and mrp_detected and mrp_detected < float(claimed_mrp):
            compliance_status = {"MRP Inflation Mismatch": 0.95, "Compliant": 0.05}
            zero_penalty_note = "VIOLATION DETECTED: Physical packaging MRP is lower than claimed listing price."
        elif identifiers.get("batch_code") or identifiers.get("net_quantity") or mrp_detected:
            compliance_status = {"Compliant Packaging Verified": 0.98, "Non-Compliant": 0.02}
            zero_penalty_note = "COMPLIANT: Mandatory Legal Metrology Act declarations observed on physical packaging."
        else:
            compliance_status = {"Statutory Omission Risk": 0.85, "Compliant": 0.15}
            zero_penalty_note = "AUDIT NOTE: Text observed on packaging but mandatory statutory fields partially missing."

    return compliance_status, identifiers, raw_text or "(No visible text detected)", zero_penalty_note


# =============================================================================
# TAB C: Marketplace Trust Assessment (CPU)
# =============================================================================

def assess_marketplace_trust(
    product_id: str,
    model_version: str = "v1.0"
) -> Tuple[Dict[str, float], float, str, Dict[str, Any], Dict[str, Any]]:
    """Evaluates multimodal trust using frozen GBDT models (v1.0 Champion or v1.1 Challenger)."""
    if not product_id or not product_id.strip():
        return (
            {"Error: Missing Product ID": 1.0},
            0.0,
            "N/A",
            {"error": "Please enter or select a Canonical Product ID."},
            {}
        )

    pid = product_id.strip()
    engine = get_trust_engine()

    try:
        ver = "v1.1" if "1.1" in model_version else "v1.0"
        assessment = engine.assess_product_learned_multimodal(pid, version=ver)
    except Exception as e:
        return (
            {"Product Not Found": 1.0},
            0.0,
            "N/A",
            {"error": str(e)},
            {}
        )

    tier = assessment.get("predicted_risk_tier", "UNASSESSED_SPARSE_DATA")
    tier_mapping = {
        "LOW_OBSERVED_ANOMALY": {"Low Observed Anomaly": 0.95, "Moderate Risk": 0.05, "Elevated Risk": 0.0},
        "MODERATE_SINGLE_MODALITY_ANOMALY": {"Low Risk": 0.1, "Moderate Single-Modality Anomaly": 0.85, "Elevated Risk": 0.05},
        "ELEVATED_MULTIMODAL_ANOMALY": {"Low Risk": 0.0, "Moderate Risk": 0.1, "Elevated Multimodal Anomaly": 0.90},
        "UNASSESSED_SPARSE_DATA": {"Unassessed Sparse Data": 1.0}
    }
    tier_label = tier_mapping.get(tier, {"Unknown Tier": 1.0})

    score = round(float(assessment.get("calibrated_anomaly_score", 0.0)), 4)
    ci_lower = round(float(assessment.get("ci_lower", 0.0)), 4)
    ci_upper = round(float(assessment.get("ci_upper", 0.0)), 4)
    ci_str = f"[{ci_lower:.4f}, {ci_upper:.4f}]"

    contributions = assessment.get("modality_contributions", {})
    full_evidence = {
        "canonical_product_id": pid,
        "model_version": assessment.get("model_version"),
        "predicted_risk_tier": tier,
        "continuous_anomaly_score": assessment.get("continuous_anomaly_score"),
        "calibrated_anomaly_score": score,
        "active_modalities_count": assessment.get("active_modalities_count"),
        "zero_penalty_invariant_applied": assessment.get("zero_penalty_invariant_applied"),
        "recommendation_summary": assessment.get("recommendation_summary")
    }

    return tier_label, score, ci_str, contributions, full_evidence


# =============================================================================
# TAB D: System Health & Modalities
# =============================================================================

def get_system_health() -> Dict[str, Any]:
    """Probes engine readiness, dataset tables, and available modalities."""
    engine = get_trust_engine()
    evidence = engine.evidence_engine
    inspector = get_visual_inspector()

    return {
        "service": "TrustSphere Python ML Intelligence",
        "status": "HEALTHY",
        "zerogpu_active": HAS_ZEROGPU,
        "clip_model_ready": inspector.clip_ready,
        "clip_device": inspector.clip_device,
        "ocr_engine": "Tesseract (Linux) / WinOCR (Win32)",
        "dataset_version": "v1.7",
        "total_canonical_products": len(evidence.products_df) if evidence.products_df is not None else 0,
        "total_marketplace_listings": len(evidence.listings_df) if evidence.listings_df is not None else 0,
        "total_sellers": len(evidence.sellers_df) if evidence.sellers_df is not None else 0,
        "total_brands": len(evidence.brands_df) if evidence.brands_df is not None else 0,
        "available_modalities": ["pricing", "reviews_nlp", "computer_vision", "clip_alignment", "seller_graph"],
        "timestamp": time.time()
    }


# =============================================================================
# GRADIO APPLICATION BUILDER
# =============================================================================

def create_app() -> gr.Blocks:
    # Sample product IDs from dataset for one-click testing
    sample_product_ids = [
        "amazon_in_B000052YQN",
        "amazon_in_B000067O5H",
        "amazon_in_B00007E7JU",
        "flipkart_AUDIO_001",
        "myntra_APPAREL_001"
    ]

    with gr.Blocks(title="TrustSphere ML Intelligence (ZeroGPU)") as demo:
        gr.Markdown(
            """
            # 🛡️ TrustSphere — AI-Powered Marketplace Trust Intelligence
            ### Multi-Modal Counterfeit & Anomaly Detection for Indian E-Commerce
            *Powered by Hugging Face ZeroGPU (Dynamic Nvidia A100/L4 Acceleration)*
            """
        )

        with gr.Tabs():
            # -----------------------------------------------------------------
            # TAB A: Product Image Analysis (ZeroGPU)
            # -----------------------------------------------------------------
            with gr.TabItem("🖼️ Product Image Analysis (ZeroGPU)"):
                gr.Markdown(
                    """
                    Upload a product image to evaluate **Zero-Shot CLIP classification**, 
                    cross-modal text-image consistency, and studio image quality metrics.
                    """
                )
                with gr.Row():
                    with gr.Column(scale=1):
                        img_input = gr.Image(type="pil", label="Product Image")
                        title_input = gr.Textbox(
                            label="Listing Title",
                            value="boAt Rockerz 450 Bluetooth On Ear Headphones with Mic",
                            placeholder="Enter product title..."
                        )
                        brand_input = gr.Textbox(
                            label="Claimed Brand",
                            value="boAt",
                            placeholder="e.g. boAt, Nike, Sony..."
                        )
                        mrp_input = gr.Number(
                            label="Claimed MRP (INR)",
                            value=1499.0
                        )
                        btn_analyze_img = gr.Button("🔍 Run Visual Inspection (ZeroGPU)", variant="primary")

                    with gr.Column(scale=1):
                        out_img_risk = gr.Label(label="Visual Risk Tier")
                        out_clip_score = gr.Number(label="CLIP Title-Image Cosine Similarity", precision=4)
                        out_zero_shot = gr.JSON(label="Zero-Shot Classification Findings")
                        out_img_quality = gr.JSON(label="Photometric & Structural Quality Metrics")
                        out_forensics = gr.JSON(label="Forensic Defects & Discrepancies")

                btn_analyze_img.click(
                    fn=analyze_product_image,
                    inputs=[img_input, title_input, brand_input, mrp_input],
                    outputs=[out_img_risk, out_clip_score, out_zero_shot, out_img_quality, out_forensics],
                    api_name="product_image_analysis"
                )

            # -----------------------------------------------------------------
            # TAB B: OCR Packaging Compliance Analysis (CPU)
            # -----------------------------------------------------------------
            with gr.TabItem("📦 Packaging OCR & Statutory Compliance"):
                gr.Markdown(
                    """
                    Upload physical packaging photographs to audit **Legal Metrology Act** mandatory declarations
                    *(FSSAI license, MRP, batch number, country of origin)* with the **zero-penalty invariant** preserved.
                    """
                )
                with gr.Row():
                    with gr.Column(scale=1):
                        ocr_img_input = gr.Image(type="pil", label="Packaging Photo")
                        ocr_brand_input = gr.Textbox(
                            label="Claimed Brand",
                            value="Organic India",
                            placeholder="Brand name..."
                        )
                        ocr_mrp_input = gr.Number(
                            label="Claimed MRP (INR)",
                            value=250.0
                        )
                        btn_run_ocr = gr.Button("📑 Extract & Audit Packaging Text", variant="primary")

                    with gr.Column(scale=1):
                        out_ocr_status = gr.Label(label="Statutory Packaging Compliance")
                        out_zero_penalty = gr.Textbox(label="Zero-Penalty Rule Status")
                        out_identifiers = gr.JSON(label="Extracted Mandatory Packaging Declarations")
                        out_ocr_raw = gr.Textbox(label="Raw OCR Extracted Text", lines=8)

                btn_run_ocr.click(
                    fn=analyze_packaging_ocr,
                    inputs=[ocr_img_input, ocr_mrp_input, ocr_brand_input],
                    outputs=[out_ocr_status, out_identifiers, out_ocr_raw, out_zero_penalty],
                    api_name="ocr_analysis"
                )

            # -----------------------------------------------------------------
            # TAB C: Marketplace Trust Assessment (CPU)
            # -----------------------------------------------------------------
            with gr.TabItem("📊 Marketplace Trust Assessment"):
                gr.Markdown(
                    """
                    Assess holistic product trust across 5 modalities *(Pricing, Review NLP, Computer Vision, CLIP, Graph)*
                    using the certified GBDT multimodal fusion models.
                    """
                )
                with gr.Row():
                    with gr.Column(scale=1):
                        pid_dropdown = gr.Dropdown(
                            choices=sample_product_ids,
                            value=sample_product_ids[0],
                            label="Sample Canonical Product ID",
                            allow_custom_value=True
                        )
                        model_ver_radio = gr.Radio(
                            choices=["v1.0 (Primary Champion)", "v1.1 (Vision Challenger)"],
                            value="v1.0 (Primary Champion)",
                            label="Model Architecture Version"
                        )
                        btn_assess_trust = gr.Button("⚖️ Compute Multimodal Trust Assessment", variant="primary")

                    with gr.Column(scale=1):
                        out_trust_tier = gr.Label(label="Predicted Risk Tier")
                        out_trust_score = gr.Number(label="Calibrated Anomaly Score", precision=4)
                        out_ci = gr.Textbox(label="95% Confidence Interval")
                        out_contributions = gr.JSON(label="Modality Risk Contributions")
                        out_full_evidence = gr.JSON(label="Full Evidence Record")

                btn_assess_trust.click(
                    fn=assess_marketplace_trust,
                    inputs=[pid_dropdown, model_ver_radio],
                    outputs=[out_trust_tier, out_trust_score, out_ci, out_contributions, out_full_evidence],
                    api_name="marketplace_trust_assessment"
                )

            # -----------------------------------------------------------------
            # TAB D: System Health & Modalities
            # -----------------------------------------------------------------
            with gr.TabItem("🩺 Service Health & Modalities"):
                gr.Markdown("Inspect dataset status, model loading status, and available modalities.")
                btn_probe_health = gr.Button("🔄 Refresh Health Status")
                out_health_json = gr.JSON(label="System Health Diagnostic Payload")

                btn_probe_health.click(
                    fn=get_system_health,
                    inputs=[],
                    outputs=[out_health_json],
                    api_name="health"
                )
                demo.load(
                    fn=get_system_health,
                    inputs=[],
                    outputs=[out_health_json]
                )

        # Enable queue for request buffering, concurrency throttling, and abuse protection
        demo.queue(max_size=20, default_concurrency_limit=4)

    return demo


# Create app instance for Hugging Face Spaces launcher
app = create_app()

if __name__ == "__main__":
    app.launch(server_name="0.0.0.0", server_port=7860)
