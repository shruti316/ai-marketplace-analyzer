
"""
Marketplace-specific robust price anomaly detection.

Products are compared only with peers sharing the same:
    (marketplace, currency, category)

A peer group must contain at least min_sample_size valid prices.
Price anomalies are statistical signals, not evidence of fraud.
"""

import logging
from typing import Any, Dict, Optional, Tuple

import numpy as np
import pandas as pd


logger = logging.getLogger(__name__)

PeerGroupKey = Tuple[str, str, str]


class CategoryPricingAnalyzer:
    """Build and query marketplace-specific price distributions."""

    REQUIRED_COLUMNS = {"marketplace", "currency", "category", "price"}

    def __init__(self, min_sample_size: int = 20):
        if not isinstance(min_sample_size, int) or min_sample_size < 2:
            raise ValueError("min_sample_size must be an integer >= 2")

        self.min_sample_size = min_sample_size
        self.peer_group_baselines: Dict[PeerGroupKey, Dict[str, Any]] = {}
        self.is_fitted = False

    @staticmethod
    def _normalize_text(value: Any, field: str) -> Optional[str]:
        """Normalize a non-empty text field; return None when unavailable."""
        if value is None:
            return None

        try:
            if pd.isna(value):
                return None
        except (TypeError, ValueError):
            return None

        normalized = str(value).strip()
        if not normalized:
            return None

        if field == "currency":
            return normalized.upper()

        return normalized.casefold()

    @staticmethod
    def _valid_price(value: Any) -> Tuple[Optional[float], str]:
        """
        Return (numeric_price, status).

        Null/NaN values are missing.
        Nonnumeric, infinite, zero and negative values are invalid.
        """
        if value is None:
            return None, "MISSING_PRICE"

        try:
            if pd.isna(value):
                return None, "MISSING_PRICE"
        except (TypeError, ValueError):
            return None, "INVALID_PRICE"

        try:
            numeric_price = float(value)
        except (TypeError, ValueError, OverflowError):
            return None, "INVALID_PRICE"

        if not np.isfinite(numeric_price) or numeric_price <= 0:
            return None, "INVALID_PRICE"

        return numeric_price, "VALID"

    @staticmethod
    def _calculate_baseline(prices: pd.Series) -> Dict[str, Any]:
        """Calculate robust descriptive statistics without artificial floors."""
        values = prices.astype(float)

        q1 = float(values.quantile(0.25))
        median = float(values.median())
        q3 = float(values.quantile(0.75))
        iqr = q3 - q1
        mad = float((values - median).abs().median())

        return {
            "sample_size": int(len(values)),
            "q1": q1,
            "median": median,
            "q3": q3,
            "iqr": iqr,
            "mad": mad,
            "lower_fence": q1 - 1.5 * iqr,
            "upper_fence": q3 + 1.5 * iqr,
        }

    def fit(self, df_products: pd.DataFrame) -> "CategoryPricingAnalyzer":
        """
        Fit peer-group baselines from a canonical product dataframe.

        Required columns:
            marketplace, currency, category, price

        Rows with missing grouping fields or invalid prices are excluded.
        """
        missing_columns = self.REQUIRED_COLUMNS - set(df_products.columns)
        if missing_columns:
            raise ValueError(
                f"Missing required columns: {sorted(missing_columns)}"
            )

        # Always clear old baselines before fitting new data.
        self.peer_group_baselines = {}
        self.is_fitted = False

        data = df_products[list(self.REQUIRED_COLUMNS)].copy()

        data["marketplace_key"] = data["marketplace"].map(
            lambda value: self._normalize_text(value, "marketplace")
        )
        data["currency_key"] = data["currency"].map(
            lambda value: self._normalize_text(value, "currency")
        )
        data["category_key"] = data["category"].map(
            lambda value: self._normalize_text(value, "category")
        )

        parsed_prices = data["price"].map(self._valid_price)
        data["price_value"] = parsed_prices.map(lambda result: result[0])

        valid_rows = data.dropna(
            subset=[
                "marketplace_key",
                "currency_key",
                "category_key",
                "price_value",
            ]
        )

        group_columns = [
            "marketplace_key",
            "currency_key",
            "category_key",
        ]

        for key, group in valid_rows.groupby(group_columns, sort=True):
            peer_key: PeerGroupKey = tuple(key)
            self.peer_group_baselines[peer_key] = self._calculate_baseline(
                group["price_value"]
            )

        self.is_fitted = True

        eligible_groups = sum(
            baseline["sample_size"] >= self.min_sample_size
            for baseline in self.peer_group_baselines.values()
        )

        logger.info(
            "Fitted %d peer groups; %d meet the minimum sample size of %d.",
            len(self.peer_group_baselines),
            eligible_groups,
            self.min_sample_size,
        )

        return self

    def analyze_product_price(
        self,
        price: Any,
        marketplace: Optional[str],
        category: Optional[str],
        currency: Optional[str],
    ) -> Dict[str, Any]:
        """Evaluate a price against its exact marketplace peer group."""

        if not self.is_fitted:
            raise RuntimeError("Pricing analyzer has not been fitted. Call fit() first.")

        base_result = {
            "price_observed": None,
            "marketplace": marketplace,
            "currency": currency,
            "category": category,
            "peer_group_size": 0,
            "peer_median": None,
            "q1": None,
            "q3": None,
            "iqr": None,
            "mad": None,
            "robust_zscore": None,
            "robust_zscore_status": "NOT_CALCULATED",
            "lower_fence": None,
            "upper_fence": None,
            "anomaly_flag": "PRICE_NOT_EVALUATED",
        }

        def unavailable(status: str, explanation: str) -> Dict[str, Any]:
            return {
                **base_result,
                "price_status": status,
                "evidence_explanation": explanation,
            }

        marketplace_key = self._normalize_text(marketplace, "marketplace")
        if marketplace_key is None:
            return unavailable(
                "MISSING_MARKETPLACE",
                "Marketplace is unavailable; a marketplace-specific comparison cannot be made.",
            )

        currency_key = self._normalize_text(currency, "currency")
        if currency_key is None:
            return unavailable(
                "MISSING_CURRENCY",
                "Currency is unavailable; no currency assumption or conversion was applied.",
            )

        category_key = self._normalize_text(category, "category")
        if category_key is None:
            return unavailable(
                "MISSING_CATEGORY",
                "Category is unavailable; a category-specific comparison cannot be made.",
            )

        numeric_price, price_status = self._valid_price(price)
        if price_status == "MISSING_PRICE":
            return unavailable(
                "MISSING_PRICE",
                "The listing does not provide a price.",
            )
        if price_status == "INVALID_PRICE":
            return unavailable(
                "INVALID_PRICE",
                "The supplied price is nonnumeric, non-finite, zero, or negative.",
            )

        peer_key = (marketplace_key, currency_key, category_key)
        baseline = self.peer_group_baselines.get(peer_key)

        if baseline is None:
            return {
                **base_result,
                "price_observed": round(numeric_price, 2),
                "price_status": "INSUFFICIENT_PEER_GROUP",
                "anomaly_flag": "PRICE_NOT_EVALUATED",
                "evidence_explanation": (
                    "No matching peer group exists for this exact marketplace, "
                    "currency, and category."
                ),
            }

        peer_size = baseline["sample_size"]
        peer_details = {
            **base_result,
            "price_observed": round(numeric_price, 2),
            "peer_group_size": peer_size,
            "peer_median": round(baseline["median"], 2),
            "q1": round(baseline["q1"], 2),
            "q3": round(baseline["q3"], 2),
            "iqr": round(baseline["iqr"], 2),
            "mad": round(baseline["mad"], 2),
            "lower_fence": round(baseline["lower_fence"], 2),
            "upper_fence": round(baseline["upper_fence"], 2),
        }

        if peer_size < self.min_sample_size:
            return {
                **peer_details,
                "price_status": "INSUFFICIENT_PEER_GROUP",
                "anomaly_flag": "PRICE_NOT_EVALUATED",
                "evidence_explanation": (
                    f"Only {peer_size} valid peer prices are available; "
                    f"at least {self.min_sample_size} are required."
                ),
            }

        median = baseline["median"]
        mad = baseline["mad"]

        if mad > 0:
            robust_z = (numeric_price - median) / (1.4826 * mad)
            robust_z = round(float(robust_z), 2)
            robust_z_status = "AVAILABLE"
        else:
            robust_z = None
            robust_z_status = "ZERO_MAD"

        lower = baseline["lower_fence"]
        upper = baseline["upper_fence"]

        if numeric_price < lower:
            anomaly_flag = "PRICE_BELOW_LOWER_FENCE"
            explanation = (
                f"Observed price is below the peer-group Tukey lower fence "
                f"({lower:.2f} {currency_key}). This is a statistical price signal, "
                "not proof of fraud."
            )
        elif numeric_price > upper:
            anomaly_flag = "PRICE_ABOVE_UPPER_FENCE"
            explanation = (
                f"Observed price is above the peer-group Tukey upper fence "
                f"({upper:.2f} {currency_key}). This is a statistical price signal, "
                "not proof of fraud."
            )
        else:
            anomaly_flag = "NORMAL_PRICE_RANGE"
            explanation = (
                f"Observed price falls within the peer-group Tukey fences "
                f"({lower:.2f} to {upper:.2f} {currency_key})."
            )

        if robust_z_status == "ZERO_MAD":
            explanation += (
                " Robust Z-score is unavailable because the peer-group MAD is zero."
            )

        return {
            **peer_details,
            "price_status": "VALID",
            "robust_zscore": robust_z,
            "robust_zscore_status": robust_z_status,
            "anomaly_flag": anomaly_flag,
            "evidence_explanation": explanation,
        }
