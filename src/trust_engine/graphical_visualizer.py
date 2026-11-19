"""
Graphical Report & Visual Analytics Engine.

Generates professional, publication-quality Matplotlib figures:
1. Price Corridor Analysis Chart (with Anomaly Red-Zone).
2. Review Aspect Sentiment Bar/Radar Chart.
3. Multimodal Trust & Forensics Radar Chart.
4. Defect Severity & Gap Matrix Chart.

Renders all figures as base64-encoded PNGs for direct embedding into HTML and downloadable reports.
"""

import base64
import io
import logging
import os
from pathlib import Path
import tempfile
from typing import Any, Dict, List, Optional
import numpy as np

os.environ["MPLCONFIGDIR"] = tempfile.gettempdir()

import matplotlib
matplotlib.use("Agg")  # Headless backend
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

logger = logging.getLogger("GraphicalVisualizer")

# Dark Cinematic Palette
COLOR_BG = "#100D20"
COLOR_CARD = "#171329"
COLOR_TEXT_MAIN = "#F5F2FF"
COLOR_TEXT_MUTED = "#A39CB8"
COLOR_PRIMARY = "#9875F5"
COLOR_SECONDARY = "#6D7CFF"
COLOR_ACCENT = "#C6B5FF"
COLOR_DANGER = "#EF4444"
COLOR_WARNING = "#F59E0B"
COLOR_SUCCESS = "#10B981"


class GraphicalVisualizer:
    """Creates styled graphical charts for trust and defect reports."""

    def __init__(self):
        plt.style.use("dark_background")

    def _fig_to_base64(self, fig: plt.Figure) -> str:
        """Serializes a Matplotlib figure to a base64-encoded PNG string."""
        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=130, bbox_inches="tight", facecolor=COLOR_BG, edgecolor="none")
        plt.close(fig)
        buf.seek(0)
        encoded = base64.b64encode(buf.read()).decode("utf-8")
        return f"data:image/png;base64,{encoded}"

    def generate_price_corridor_chart(
        self,
        listing_price: float,
        claimed_mrp: float,
        corridor_min: float,
        corridor_max: float,
        corridor_median: float,
        fake_threshold: float,
        product_name: str = "Nike Shoes"
    ) -> str:
        """Plots the Price Anomaly Corridor comparing listing price to authentic market bounds."""
        fig, ax = plt.subplots(figsize=(8, 3.2), facecolor=COLOR_BG)
        ax.set_facecolor(COLOR_CARD)

        y_pos = 0.5

        # Corridor Bar (Safe Zone)
        ax.barh(
            y=y_pos,
            width=corridor_max - corridor_min,
            left=corridor_min,
            height=0.35,
            color=COLOR_PRIMARY,
            alpha=0.35,
            edgecolor=COLOR_PRIMARY,
            linewidth=1.5,
            label="Authentic Market Corridor"
        )

        # Knockoff Red Zone (< fake_threshold)
        ax.barh(
            y=y_pos,
            width=fake_threshold,
            left=0,
            height=0.35,
            color=COLOR_DANGER,
            alpha=0.25,
            edgecolor=COLOR_DANGER,
            linestyle="--",
            linewidth=1.2,
            label="Knockoff Risk Zone"
        )

        # Median Marker
        ax.plot([corridor_median, corridor_median], [0.2, 0.8], color=COLOR_ACCENT, linewidth=2.5, linestyle=":", label=f"Market Median (₹{corridor_median:,.0f})")

        # Claimed MRP Marker
        ax.scatter([claimed_mrp], [y_pos], color=COLOR_WARNING, s=120, zorder=5, label=f"Claimed MRP (₹{claimed_mrp:,.0f})", marker="s")

        # Listing Price Point
        is_bad = listing_price < fake_threshold
        color_pt = COLOR_DANGER if is_bad else COLOR_SUCCESS
        ax.scatter([listing_price], [y_pos], color=color_pt, s=180, zorder=6, label=f"Flipkart Listing (₹{listing_price:,.0f})", edgecolors="white", linewidth=2)

        # Annotations
        ax.annotate(
            f"Listing: ₹{listing_price:,.0f}\n({'SUSPICIOUS ANOMALY' if is_bad else 'NORMAL'})",
            xy=(listing_price, y_pos),
            xytext=(listing_price, y_pos + 0.35),
            arrowprops=dict(facecolor=color_pt, arrowstyle="->", lw=1.5),
            ha="center",
            fontsize=9,
            fontweight="bold",
            color=color_pt,
            bbox=dict(boxstyle="round,pad=0.3", facecolor=COLOR_BG, edgecolor=color_pt, alpha=0.9)
        )

        ax.set_ylim(-0.1, 1.2)
        ax.set_xlim(0, max(claimed_mrp * 1.15, corridor_max * 1.15))
        ax.set_yticks([])
        ax.set_xlabel("Price in INR (₹)", color=COLOR_TEXT_MUTED, fontsize=9, labelpad=8)
        ax.set_title(f"Marketplace Price Corridor vs. Listing Price ({product_name})", color=COLOR_TEXT_MAIN, fontsize=11, fontweight="bold", pad=12)

        ax.tick_params(colors=COLOR_TEXT_MUTED, labelsize=8)
        for spine in ax.spines.values():
            spine.set_color("#2E284A")

        ax.legend(loc="upper right", fontsize=8, facecolor=COLOR_BG, edgecolor="#2E284A", labelcolor=COLOR_TEXT_MAIN)
        plt.tight_layout()
        return self._fig_to_base64(fig)

    def generate_aspect_sentiment_chart(self, aspect_findings: Dict[str, Any]) -> str:
        """Generates horizontal bar chart of NLP sentiment scores across product aspects."""
        fig, ax = plt.subplots(figsize=(8, 3.8), facecolor=COLOR_BG)
        ax.set_facecolor(COLOR_CARD)

        aspects = []
        scores = []
        colors = []

        for k, v in aspect_findings.items():
            name = v.get("display_name", k)
            score = v.get("sentiment_score", 0.0)
            aspects.append(name)
            scores.append(score)
            if score <= -0.20:
                colors.append(COLOR_DANGER)
            elif score < 0.15:
                colors.append(COLOR_WARNING)
            else:
                colors.append(COLOR_SUCCESS)

        y_positions = np.arange(len(aspects))

        bars = ax.barh(y_positions, scores, height=0.55, color=colors, edgecolor="none", alpha=0.85)

        # Center line
        ax.axvline(0, color=COLOR_TEXT_MUTED, linestyle="--", linewidth=1.0, alpha=0.6)

        # Value labels on bars
        for bar, score in zip(bars, scores):
            x_val = bar.get_width()
            ha = "left" if x_val >= 0 else "right"
            offset = 0.03 if x_val >= 0 else -0.03
            ax.text(
                x_val + offset,
                bar.get_y() + bar.get_height() / 2,
                f"{score:+.2f}",
                va="center",
                ha=ha,
                color=COLOR_TEXT_MAIN,
                fontsize=8,
                fontweight="bold"
            )

        ax.set_yticks(y_positions)
        ax.set_yticklabels(aspects, color=COLOR_TEXT_MAIN, fontsize=9)
        ax.set_xlim(-1.0, 1.0)
        ax.set_xlabel("Sentiment Polarity Score (-1.0 Defective to +1.0 Flawless)", color=COLOR_TEXT_MUTED, fontsize=8, labelpad=8)
        ax.set_title("Customer Review Aspect-Based Sentiment Breakdown", color=COLOR_TEXT_MAIN, fontsize=11, fontweight="bold", pad=12)

        ax.tick_params(colors=COLOR_TEXT_MUTED, labelsize=8)
        for spine in ax.spines.values():
            spine.set_color("#2E284A")

        # Custom legend
        patches = [
            mpatches.Patch(color=COLOR_DANGER, label="Critical Flaw / Defect"),
            mpatches.Patch(color=COLOR_WARNING, label="Sub-par / Concern"),
            mpatches.Patch(color=COLOR_SUCCESS, label="Satisfactory / Praised")
        ]
        ax.legend(handles=patches, loc="lower right", fontsize=8, facecolor=COLOR_BG, edgecolor="#2E284A", labelcolor=COLOR_TEXT_MAIN)

        plt.tight_layout()
        return self._fig_to_base64(fig)

    def generate_multimodal_radar_chart(
        self,
        scores: Dict[str, float],
        benchmark_scores: Optional[Dict[str, float]] = None
    ) -> str:
        """Generates a spider/radar chart comparing multimodal trust dimensions."""
        categories = list(scores.keys())
        N = len(categories)

        values = list(scores.values())
        values += values[:1]  # Complete loop

        angles = [n / float(N) * 2 * np.pi for n in range(N)]
        angles += angles[:1]

        fig, ax = plt.subplots(figsize=(5.5, 4.5), subplot_kw=dict(polar=True), facecolor=COLOR_BG)
        ax.set_facecolor(COLOR_CARD)

        # Plot Subject Listing
        ax.plot(angles, values, color=COLOR_DANGER, linewidth=2, linestyle="solid", label="Inspected Listing")
        ax.fill(angles, values, color=COLOR_DANGER, alpha=0.25)

        # Benchmark
        if benchmark_scores:
            bench_vals = list(benchmark_scores.values())
            bench_vals += bench_vals[:1]
            ax.plot(angles, bench_vals, color=COLOR_SUCCESS, linewidth=2, linestyle="--", label="Genuine Benchmark")
            ax.fill(angles, bench_vals, color=COLOR_SUCCESS, alpha=0.10)

        ax.set_theta_offset(np.pi / 2)
        ax.set_theta_direction(-1)

        plt.xticks(angles[:-1], categories, color=COLOR_TEXT_MAIN, size=8)
        ax.set_rlabel_position(0)
        plt.yticks([20, 40, 60, 80, 100], ["20", "40", "60", "80", "100"], color=COLOR_TEXT_MUTED, size=7)
        plt.ylim(0, 100)

        ax.grid(color="#2E284A", linestyle="--", linewidth=0.8)
        ax.spines["polar"].set_color("#2E284A")

        plt.title("Multimodal Intelligence Radar", color=COLOR_TEXT_MAIN, size=11, fontweight="bold", y=1.08)
        plt.legend(loc="lower center", bbox_to_anchor=(0.5, -0.22), ncol=2, fontsize=8, facecolor=COLOR_BG, edgecolor="#2E284A", labelcolor=COLOR_TEXT_MAIN)

        plt.tight_layout()
        return self._fig_to_base64(fig)

    def generate_defect_distribution_chart(self, gap_items: List[Any]) -> str:
        """Visualizes defect counts categorized by severity."""
        severities = {"CRITICAL_BLOCKER": 0, "HIGH_DEFECT": 0, "MODERATE_CONCERN": 0}
        for item in gap_items:
            sev = getattr(item, "severity", "MODERATE_CONCERN")
            if sev in severities:
                severities[sev] += 1

        fig, ax = plt.subplots(figsize=(6, 2.6), facecolor=COLOR_BG)
        ax.set_facecolor(COLOR_CARD)

        labels = ["Critical Blockers", "High Defects", "Moderate Concerns"]
        counts = [severities["CRITICAL_BLOCKER"], severities["HIGH_DEFECT"], severities["MODERATE_CONCERN"]]
        colors = [COLOR_DANGER, COLOR_WARNING, COLOR_SECONDARY]

        y_pos = np.arange(len(labels))
        bars = ax.barh(y_pos, counts, height=0.45, color=colors, alpha=0.85)

        for bar, count in zip(bars, counts):
            ax.text(
                bar.get_width() + 0.1,
                bar.get_y() + bar.get_height() / 2,
                str(count),
                va="center",
                ha="left",
                color=COLOR_TEXT_MAIN,
                fontsize=9,
                fontweight="bold"
            )

        ax.set_yticks(y_pos)
        ax.set_yticklabels(labels, color=COLOR_TEXT_MAIN, fontsize=8)
        ax.set_xlim(0, max(counts + [3]) + 1)
        ax.set_xlabel("Number of Issues Identified", color=COLOR_TEXT_MUTED, fontsize=8)
        ax.set_title("Identified Product Defect & Risk Severity", color=COLOR_TEXT_MAIN, fontsize=10, fontweight="bold", pad=8)

        ax.tick_params(colors=COLOR_TEXT_MUTED, labelsize=8)
        for spine in ax.spines.values():
            spine.set_color("#2E284A")

        plt.tight_layout()
        return self._fig_to_base64(fig)
