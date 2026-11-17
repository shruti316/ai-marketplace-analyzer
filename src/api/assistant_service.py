"""Evidence-Grounded Assistant Service for TrustSphere Intelligence.

Synthesizes multimodal trust evidence, domain policy constraints, and empirical
model findings into explainable conversational explanations for operators.
"""

from dataclasses import dataclass
import json
import logging
import os
from pathlib import Path
import time
from typing import Any, Dict, List, Optional, Tuple
import urllib.error
import urllib.request
import uuid

logger = logging.getLogger("TrustIntelligenceAssistant")


@dataclass
class AssistantResponse:
    request_id: str
    query: str
    canonical_product_id: Optional[str]
    message: Dict[str, str]
    evidence_citations: List[str]
    grounded_context: Dict[str, Any]
    provider_info: Dict[str, str]
    timestamp: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "request_id": self.request_id,
            "query": self.query,
            "canonical_product_id": self.canonical_product_id,
            "message": self.message,
            "evidence_citations": self.evidence_citations,
            "grounded_context": self.grounded_context,
            "provider_info": self.provider_info,
            "timestamp": self.timestamp,
        }


class EvidenceGroundedAssistantService:
    """Provides conversational explainability strictly grounded in empirical marketplace evidence."""

    def __init__(self, trust_engine: Any):
        self.engine = trust_engine

    def _call_external_llm(
        self,
        system_prompt: str,
        user_query: str,
        history: List[Dict[str, str]],
        api_key: str,
        provider: str = "openai",
        timeout_seconds: float = 12.0
    ) -> Optional[str]:
        """Optionally calls an external LLM if operator explicitly provided API keys."""
        messages = [{"role": "system", "content": system_prompt}]
        for turn in history[-6:]:  # Bounded history window
            if isinstance(turn, dict) and "role" in turn and "content" in turn:
                messages.append({"role": turn["role"], "content": str(turn["content"])[:2000]})
        messages.append({"role": "user", "content": user_query})

        if provider == "openai":
            url = "https://api.openai.com/v1/chat/completions"
            payload = {
                "model": os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
                "messages": messages,
                "temperature": 0.2,
                "max_tokens": 800,
            }
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            }
            req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
            try:
                with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
                    if resp.status == 200:
                        data = json.loads(resp.read().decode("utf-8"))
                        return data["choices"][0]["message"]["content"]
            except Exception as e:
                logger.warning(f"External LLM call failed or timed out: {e}")
                return None

        return None

    def _build_deterministic_grounded_response(
        self,
        query: str,
        product_meta: Dict[str, Any],
        assessment: Dict[str, Any],
        evidence_items: List[Dict[str, Any]],
        report: Dict[str, Any],
    ) -> Tuple[str, List[str]]:
        """Constructs an exhaustive, transparent evidence-grounded response without hallucination."""
        title = product_meta.get("product_title", "Unknown Product")
        brand = product_meta.get("brand_id", "Unknown Brand")
        platform = product_meta.get("platform_id", "Unknown Platform")
        risk_tier = assessment.get("overall_risk_tier", "UNASSESSED")
        core_mods = assessment.get("available_core_modalities_count", 0)

        negative_ev = report.get("section_5_negative_evidence", [])
        positive_ev = report.get("section_4_positive_evidence", [])
        missing_info = report.get("section_11_missing_information", [])
        limitations = report.get("section_12_confidence_and_limitations", {}).get("assessment_limitations", [])

        citations: List[str] = []
        for ev in negative_ev:
            if isinstance(ev, dict) and "evidence_id" in ev:
                citations.append(ev["evidence_id"])
        for ev in positive_ev[:3]:
            if isinstance(ev, dict) and "evidence_id" in ev:
                citations.append(ev["evidence_id"])

        q_lower = query.lower()

        # Tailor focus based on user query intent
        lines = []
        lines.append(f"### Product Trust Analysis: {title[:75]}...")
        lines.append(f"**Platform:** {platform} | **Brand:** {brand} | **Risk Tier:** `{risk_tier}`")
        lines.append(f"**Active Corroborating Modalities:** {core_mods}/5 evaluated\n")

        # 1. Negative Evidence / Anomaly Explanation
        if any(w in q_lower for w in ["anomaly", "risk", "fake", "counterfeit", "issue", "problem", "why", "flag"]):
            if negative_ev:
                lines.append("#### Observed Anomaly Signals:")
                for i, ev in enumerate(negative_ev, 1):
                    lines.append(f"{i}. **[{ev.get('modality', 'GENERAL')}]** {ev.get('claim', 'Anomaly observed.')}")
                    if "observed_anomaly" in ev:
                        lines.append(f"   - *Observation:* {ev.get('observed_anomaly')}")
            else:
                lines.append("#### Observed Anomaly Signals:")
                lines.append("- **No active anomalies detected.** All evaluated modalities match canonical baseline standards.")
            lines.append("")

        # 2. Modality Breakdown & Consistency
        if any(w in q_lower for w in ["modality", "evidence", "price", "image", "review", "seller", "graph"]):
            lines.append("#### Evaluated Modalities Breakdown:")
            mod_breakdown = report.get("section_3_modality_breakdown", {})
            for mod_name, mod_info in mod_breakdown.items():
                if isinstance(mod_info, dict):
                    status = mod_info.get("status", "UNASSESSED")
                    has_anomaly = mod_info.get("has_anomaly", False)
                    lines.append(f"- **{mod_name.replace('_', ' ').title()}:** {status} (Anomaly: {'YES' if has_anomaly else 'NONE'})")
            lines.append("")

        # 3. Missing Information & Honest Sparse Data Modeling
        if any(w in q_lower for w in ["missing", "sparse", "limit", "confidence", "review"]):
            if missing_info:
                lines.append("#### Sparse Data & Omitted Signals (Honest Zero-Penalty Modeling):")
                for item in missing_info:
                    lines.append(f"- {item}")
                lines.append("")

        # 4. Limitations
        if limitations:
            lines.append("#### Known Assessment Limitations:")
            for lim in limitations:
                lines.append(f"- *{lim}*")
            lines.append("")

        # 5. Recommendation Summary
        rec = assessment.get("recommendation_summary") or report.get("section_2_overall_assessment", {}).get("recommendation_summary", "")
        if rec:
            lines.append(f"**Recommendation Summary:** {rec}")

        content = "\n".join(lines)
        return content, citations

    def process_chat_query(
        self,
        query: str,
        canonical_product_id: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """Processes an operator inquiry, synthesizing evidence or delegating to configured LLM."""
        request_id = str(uuid.uuid4())
        t0 = time.time()
        history = conversation_history or []

        if not query or not query.strip():
            raise ValueError("Query string cannot be empty.")

        # If canonical_product_id is supplied, look up actual data
        product_meta = {}
        assessment = {}
        evidence_items = []
        report = {}
        citations = []

        if canonical_product_id:
            pid = canonical_product_id.strip()
            df = self.engine.evidence_engine.products_df
            match = df[df["canonical_product_id"] == pid]
            if match.empty:
                raise KeyError(f"Product '{pid}' not found in canonical catalog.")

            product_meta = match.iloc[0].to_dict()
            assessment = self.engine.assess_product(pid)
            evidence_items = self.engine.get_product_evidence(pid)
            raw_report = self.engine.generate_report(pid, format_type="json")
            report = raw_report if isinstance(raw_report, dict) else json.loads(raw_report)

        # Check for configured LLM Provider
        openai_key = os.environ.get("OPENAI_API_KEY", "").strip()
        anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
        gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()

        llm_response = None
        provider_name = "DETERMINISTIC_EVIDENCE_ENGINE"
        model_name = "evidence_grounded_v1.7"
        provider_status = "DETERMINISTIC_FALLBACK"

        if openai_key and canonical_product_id:
            system_prompt = (
                "You are TrustSphere AI Assistant, an expert marketplace trust intelligence analyst. "
                "You must strictly ground your answer in the empirical evidence provided below. "
                "Never hallucinate policy violations, counterfeit claims, or confidence numbers not in the text.\n\n"
                f"EVIDENCE CONTEXT:\n{json.dumps(report, default=str)[:6000]}"
            )
            llm_text = self._call_external_llm(system_prompt, query, history, openai_key, "openai")
            if llm_text:
                llm_response = llm_text
                provider_name = "OPENAI"
                model_name = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
                provider_status = "SUCCESS"

        if not llm_response:
            if canonical_product_id:
                content, citations = self._build_deterministic_grounded_response(
                    query, product_meta, assessment, evidence_items, report
                )
            else:
                content = (
                    "Welcome to TrustSphere Assistant. You can ask me to analyze any marketplace product by specifying "
                    "its canonical product ID, or ask general questions about trust assessment methodologies, "
                    "modality ablations, and zero-penalty sparsity invariants."
                )
                citations = []
        else:
            content = llm_response
            # Extract citations from known negative evidence
            for ev in report.get("section_5_negative_evidence", []):
                if isinstance(ev, dict) and "evidence_id" in ev:
                    citations.append(ev["evidence_id"])

        grounded_context = {
            "canonical_product_id": canonical_product_id,
            "overall_risk_tier": assessment.get("overall_risk_tier", "UNASSESSED"),
            "core_modalities_count": assessment.get("available_core_modalities_count", 0),
            "negative_evidence_count": len(report.get("section_5_negative_evidence", [])),
            "positive_evidence_count": len(report.get("section_4_positive_evidence", [])),
            "is_grounded": bool(canonical_product_id),
        }

        resp = AssistantResponse(
            request_id=request_id,
            query=query,
            canonical_product_id=canonical_product_id,
            message={"role": "assistant", "content": content},
            evidence_citations=citations,
            grounded_context=grounded_context,
            provider_info={
                "provider": provider_name,
                "model": model_name,
                "status": provider_status,
            },
            timestamp=time.time(),
        )

        return resp.to_dict()
