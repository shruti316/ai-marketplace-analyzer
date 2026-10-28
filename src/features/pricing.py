"""
src/features/pricing.py
-----------------------
Category-Relative Price Anomaly Detection for the
AI-Powered Marketplace Trust Intelligence Platform.

Features:
- Category-stratified robust price distributions (Median, IQR, Tukey Fences).
- Median Absolute Deviation (MAD) robust Z-score calculation.
- Minimum sample size guardrails (prevents spurious anomaly flags in sparse cohorts).
- Non-punitive, cautious anomaly classifications (PRICE_BELOW_LOWER_FENCE, PRICE_ABOVE_UPPER_FENCE).
- Explains observed evidence rather than asserting fraud.
"""

import logging
from typing import Dict, Any, Optional
import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class CategoryPricingAnalyzer:
    """
    Computes category-specific price benchmarks and evaluates individual listings
    against their legitimate category peer distributions.
    """

    def __init__(self, min_sample_size: int = 5):
        self.min_sample_size = min_sample_size
        self.category_baselines: Dict[str, Dict[str, float]] = {}
        self.currency_category_baselines: Dict[str, Dict[str, float]] = {}
        self.global_baseline: Dict[str, float] = {}

    def fit(self, df_products: pd.DataFrame) -> "CategoryPricingAnalyzer":
        """
        Fit category price distributions from a canonical product dataframe.
        Expects columns: ['category', 'price'] and optional ['currency']
        """
        priced = df_products[
            df_products["price"].notna()
            & (df_products["price"] > 0)
        ].copy()

        if priced.empty:
            logging.warning("No valid priced products found to fit pricing baselines!")
            return self

        if "currency" not in priced.columns:
            priced["currency"] = "USD"
        else:
            priced["currency"] = priced["currency"].fillna("USD").astype(str).str.upper()

        # 1. Global Baseline (Fallback)
        global_prices = priced["price"]
        q1_g = float(global_prices.quantile(0.25))
        med_g = float(global_prices.median())
        q3_g = float(global_prices.quantile(0.75))
        iqr_g = max(0.01, q3_g - q1_g)
        mad_g = float((global_prices - med_g).abs().median())

        self.global_baseline = {
            "sample_size": len(global_prices),
            "q1": q1_g,
            "median": med_g,
            "q3": q3_g,
            "iqr": iqr_g,
            "mad": max(1.0, mad_g),
            "lower_fence": max(0.01, q1_g - 1.5 * iqr_g),
            "upper_fence": q3_g + 1.5 * iqr_g,
        }

        # 2. Category-Specific Baselines (legacy fallback)
        self.category_baselines = {}
        for cat, group in priced.groupby("category"):
            p_series = group["price"]
            n = len(p_series)
            if n < self.min_sample_size:
                continue

            q1 = float(p_series.quantile(0.25))
            median = float(p_series.median())
            q3 = float(p_series.quantile(0.75))
            iqr = max(0.01, q3 - q1)
            mad = float((p_series - median).abs().median())

            self.category_baselines[str(cat)] = {
                "sample_size": n,
                "q1": q1,
                "median": median,
                "q3": q3,
                "iqr": iqr,
                "mad": max(0.5, mad),
                "lower_fence": max(0.01, q1 - 1.5 * iqr),
                "upper_fence": q3 + 1.5 * iqr,
            }

        # 3. Currency-Stratified Category Baselines (prevents USD/INR mixing)
        self.currency_category_baselines = {}
        for (cat, curr), group in priced.groupby(["category", "currency"]):
            p_series = group["price"]
            n = len(p_series)
            if n < self.min_sample_size:
                continue

            q1 = float(p_series.quantile(0.25))
            median = float(p_series.median())
            q3 = float(p_series.quantile(0.75))
            iqr = max(0.01, q3 - q1)
            mad = float((p_series - median).abs().median())

            pair_key = f"{cat}_{curr}"
            self.currency_category_baselines[pair_key] = {
                "sample_size": n,
                "currency": curr,
                "q1": q1,
                "median": median,
                "q3": q3,
                "iqr": iqr,
                "mad": max(0.5, mad),
                "lower_fence": max(0.01, q1 - 1.5 * iqr),
                "upper_fence": q3 + 1.5 * iqr,
            }

        logging.info(
            "Fitted pricing baselines for %d categories across currencies (Global median: $%.2f).",
            len(self.category_baselines),
            self.global_baseline["median"],
        )
        return self

    def analyze_product_price(
        self, price: Optional[float], category: str, currency: str = "USD"
    ) -> Dict[str, Any]:
        """
        Analyze a single product's price relative to category peers.
        """
        if price is None or price <= 0:
            return {
                "price_status": "MISSING_PRICE",
                "price_observed": None,
                "category": category,
                "category_median": None,
                "robust_zscore": None,
                "anomaly_flag": "PRICE_UNAVAILABLE",
                "evidence_explanation": "Listing does not provide a positive numeric price.",
            }

        curr_clean = str(currency).strip().upper() if currency else "USD"
        pair_key = f"{category}_{curr_clean}"
        baseline = self.currency_category_baselines.get(pair_key) or self.category_baselines.get(category, self.global_baseline)
        if not baseline:
            return {
                "price_status": "UNBASELINED",
                "price_observed": price,
                "category": category,
                "currency": curr_clean,
                "anomaly_flag": "NO_PEER_BASELINE",
                "evidence_explanation": f"Insufficient pricing baseline data for category '{category}' ({curr_clean}).",
            }

        med = baseline["median"]
        mad = baseline["mad"]
        lower = baseline["lower_fence"]
        upper = baseline["upper_fence"]

        # MAD robust z-score: (x - median) / (1.4826 * MAD)
        robust_z = (price - med) / (mad * 1.4826) if mad > 0 else 0.0

        sym = "₹" if curr_clean == "INR" else ("$" if curr_clean == "USD" else f"{curr_clean} ")

        if price < lower:
            pct_below = round(((med - price) / med) * 100, 1) if med > 0 else 0.0
            anomaly_flag = "PRICE_BELOW_LOWER_FENCE"
            explanation = (
                f"Observed price ({sym}{price:.2f}) is {pct_below}% below category median ({sym}{med:.2f}), "
                f"falling below the Tukey lower bound ({sym}{lower:.2f}, robust Z = {robust_z:.2f})."
            )
        elif price > upper:
            pct_above = round(((price - med) / med) * 100, 1) if med > 0 else 0.0
            anomaly_flag = "PRICE_ABOVE_UPPER_FENCE"
            explanation = (
                f"Observed price ({sym}{price:.2f}) is {pct_above}% above category median ({sym}{med:.2f}), "
                f"exceeding the Tukey upper bound ({sym}{upper:.2f}, robust Z = {robust_z:.2f})."
            )
        else:
            anomaly_flag = "NORMAL_PRICE_RANGE"
            explanation = (
                f"Price ({sym}{price:.2f}) falls within expected category interquartile range "
                f"({sym}{lower:.2f} to {sym}{upper:.2f}, robust Z = {robust_z:.2f})."
            )

        return {
            "price_status": "VALID",
            "price_observed": round(float(price), 2),
            "currency": curr_clean,
            "category": category,
            "category_median": round(med, 2),
            "category_sample_size": baseline.get("sample_size", 0),
            "robust_zscore": round(float(robust_z), 2),
            "lower_fence": round(lower, 2),
            "upper_fence": round(upper, 2),
            "anomaly_flag": anomaly_flag,
            "evidence_explanation": explanation,
        }
