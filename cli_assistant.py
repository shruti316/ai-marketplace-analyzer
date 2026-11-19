"""
TrustSphere CLI Assistant & Diagnostic Exploration Tool.

Runs directly in the terminal:
1. Performs instant multimodal forensic audit of the Nike ₹1,500 Flipkart case study.
2. Displays pricing anomaly analysis, review aspect breakdown, and defect diagnoses.
3. Generates high-res Matplotlib charts and the standalone downloadable HTML/PDF report.
4. Allows interactive conversational Q&A in the console.
"""

from datetime import datetime
import json
import os
from pathlib import Path
import tempfile
import sys

os.environ["MPLCONFIGDIR"] = tempfile.gettempdir()

from src.assistant.interactive_agent import TrustSphereAIAssistant
from src.trust_engine.downloadable_report import DownloadableReportGenerator

PROJECT_ROOT = Path(__file__).resolve().parent
REPORTS_DIR = PROJECT_ROOT / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


def main():
    print("=" * 80)
    print(" TRUSTSPHERE — AI PRODUCT FORENSICS & TRUST INTELLIGENCE ASSISTANT ")
    print("=" * 80)
    print("Initializing NLP review mining, Computer Vision forensics & Pricing engines...\n")

    assistant = TrustSphereAIAssistant(use_clip=False)
    report_gen = DownloadableReportGenerator()

    # Step 1: Run Nike Shoes Case Study
    print("▶ CASE STUDY: Nike Shoes on Flipkart for ₹1,500 (Claimed MRP ₹3,000, 50% Off)")
    print("Running deep multimodal inspection...\n")

    diag = assistant.analyze_product_query(
        product_title="Nike Men's Revolution 6 Running Shoes",
        brand="Nike",
        marketplace="Flipkart",
        listing_price=1500.0,
        claimed_mrp=3000.0
    )

    p = diag.pricing_analysis
    rev = diag.review_summary or {}
    aspects = rev.get("aspect_findings", {})

    print(f"📊 EXECUTIVE VERDICT: {diag.action_plan.summary_verdict}")
    print(f"⭐ OVERALL TRUST SCORE: {diag.overall_trust_score:.0f}/100 ({diag.risk_tier})")
    print("-" * 80)

    print("\n🏷️ 1. PRICING ANOMALY ANALYSIS:")
    print(f"   Listing Price:  ₹{p.listing_price:,.0f} (Claimed MRP: ₹{p.claimed_mrp:,.0f})")
    print(f"   Safe Corridor:  ₹{p.genuine_market_corridor_min:,.0f} - ₹{p.genuine_market_corridor_max:,.0f} (Median: ₹{p.corridor_median:,.0f})")
    print(f"   Knockoff Floor: Anything below ₹{p.genuine_market_corridor_min * 0.72:,.0f} is high counterfeit risk.")
    print(f"   Diagnosis:      {p.pricing_explanation}")

    print("\n💬 2. NLP REVIEW ASPECT SENTIMENT BREAKDOWN:")
    for asp_id, asp in aspects.items():
        score = asp.get("sentiment_score", 0.0)
        label = asp.get("sentiment_label", "NEUTRAL")
        complaints = asp.get("top_complaints", [])
        evidence_str = f" | Evidence: '{complaints[0]}'" if complaints else ""
        print(f"   • {asp.get('display_name', asp_id):<28}: Score {score:+.2f} [{label}]{evidence_str}")

    print("\n🔍 3. WHAT IS LACKING IN THIS PRODUCT (DISCOVERED DEFECTS & GAPS):")
    for idx, gap in enumerate(diag.identified_gaps, 1):
        print(f"   [{idx}] [{gap.severity}] {gap.title}")
        print(f"       Description: {gap.description}")
        print(f"       Evidence:    {gap.evidence_snippet}")

    print("\n🛡️ 4. WHAT WE HAVE TO DO (ACTIONABLE PRESCRIPTIONS):")
    print(f"   • Recommendation: {diag.action_plan.immediate_actions[0]}")
    print("   • Doorstep 5-Point Delivery Checklist:")
    for check in diag.action_plan.doorstep_verification_checklist:
        print(f"     - {check}")

    # Generate Report
    report_file = REPORTS_DIR / "Nike_Flipkart_1500_Intelligence_Report.html"
    report_gen.generate_html_report(diag, output_file_path=str(report_file))
    print("\n" + "=" * 80)
    print(f"✅ Downloadable Comprehensive Graphical Report Generated:")
    print(f"   File: {report_file.resolve()}")
    print("   (Open this HTML file in Chrome/Edge to view all graphs and print directly to PDF)")
    print("=" * 80)


if __name__ == "__main__":
    main()
