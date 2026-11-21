"""
src/pricing/fx_reference.py
----------------------------
Foreign Exchange Reference Table Generator for Multimodal Marketplace Trust Dataset.
Provides historical, traceable Reserve Bank of India (RBI) reference rates for USD/INR
to support dynamic and point-in-time price normalization.
"""

from pathlib import Path
import pandas as pd


def build_fx_reference_table(output_path: Path = None) -> pd.DataFrame:
    """
    Constructs the versioned foreign exchange reference table.
    Rates reflect published historical Reserve Bank of India (RBI) Reference Rates
    and Financial Benchmark India Pvt. Ltd. (FBIL) benchmark fixings.
    """
    fx_records = [
        {
            "rate_id": "FX_USD_INR_20230116",
            "base_currency": "USD",
            "quote_currency": "INR",
            "exchange_rate": 81.58,
            "observation_date": "2023-01-16",
            "rate_source": "RBI_REFERENCE_RATE",
            "reference_institution": "Reserve Bank of India / FBIL",
            "retrieval_timestamp": "2026-11-04T09:00:00+05:30",
            "reference_type": "HISTORICAL_FIXING",
            "is_active_benchmark": False,
            "provenance": "Official RBI Daily Financial Benchmark Archive"
        },
        {
            "rate_id": "FX_USD_INR_20230417",
            "base_currency": "USD",
            "quote_currency": "INR",
            "exchange_rate": 81.95,
            "observation_date": "2023-04-17",
            "rate_source": "RBI_REFERENCE_RATE",
            "reference_institution": "Reserve Bank of India / FBIL",
            "retrieval_timestamp": "2026-11-04T09:00:00+05:30",
            "reference_type": "HISTORICAL_FIXING",
            "is_active_benchmark": False,
            "provenance": "Official RBI Daily Financial Benchmark Archive"
        },
        {
            "rate_id": "FX_USD_INR_20230717",
            "base_currency": "USD",
            "quote_currency": "INR",
            "exchange_rate": 82.04,
            "observation_date": "2023-07-17",
            "rate_source": "RBI_REFERENCE_RATE",
            "reference_institution": "Reserve Bank of India / FBIL",
            "retrieval_timestamp": "2026-11-04T09:00:00+05:30",
            "reference_type": "HISTORICAL_FIXING",
            "is_active_benchmark": False,
            "provenance": "Official RBI Daily Financial Benchmark Archive"
        },
        {
            "rate_id": "FX_USD_INR_20231016",
            "base_currency": "USD",
            "quote_currency": "INR",
            "exchange_rate": 83.26,
            "observation_date": "2023-10-16",
            "rate_source": "RBI_REFERENCE_RATE",
            "reference_institution": "Reserve Bank of India / FBIL",
            "retrieval_timestamp": "2026-11-04T09:00:00+05:30",
            "reference_type": "HISTORICAL_FIXING",
            "is_active_benchmark": False,
            "provenance": "Official RBI Daily Financial Benchmark Archive"
        },
        {
            "rate_id": "FX_USD_INR_20231101",
            "base_currency": "USD",
            "quote_currency": "INR",
            "exchange_rate": 83.25,
            "observation_date": "2023-11-01",
            "rate_source": "RBI_REFERENCE_RATE",
            "reference_institution": "Reserve Bank of India / FBIL",
            "retrieval_timestamp": "2026-11-04T09:00:00+05:30",
            "reference_type": "BENCHMARK_PROJECT_FIXING",
            "is_active_benchmark": True,
            "provenance": "Official RBI Fixing matching Project Crawl Benchmark Period"
        },
        {
            "rate_id": "FX_USD_INR_20240115",
            "base_currency": "USD",
            "quote_currency": "INR",
            "exchange_rate": 82.95,
            "observation_date": "2024-01-15",
            "rate_source": "RBI_REFERENCE_RATE",
            "reference_institution": "Reserve Bank of India / FBIL",
            "retrieval_timestamp": "2026-11-04T09:00:00+05:30",
            "reference_type": "HISTORICAL_FIXING",
            "is_active_benchmark": False,
            "provenance": "Official RBI Daily Financial Benchmark Archive"
        },
        {
            "rate_id": "FX_USD_INR_20240415",
            "base_currency": "USD",
            "quote_currency": "INR",
            "exchange_rate": 83.45,
            "observation_date": "2024-04-15",
            "rate_source": "RBI_REFERENCE_RATE",
            "reference_institution": "Reserve Bank of India / FBIL",
            "retrieval_timestamp": "2026-11-04T09:00:00+05:30",
            "reference_type": "HISTORICAL_FIXING",
            "is_active_benchmark": False,
            "provenance": "Official RBI Daily Financial Benchmark Archive"
        },
        {
            "rate_id": "FX_USD_INR_20240715",
            "base_currency": "USD",
            "quote_currency": "INR",
            "exchange_rate": 83.58,
            "observation_date": "2024-07-15",
            "rate_source": "RBI_REFERENCE_RATE",
            "reference_institution": "Reserve Bank of India / FBIL",
            "retrieval_timestamp": "2026-11-04T09:00:00+05:30",
            "reference_type": "HISTORICAL_FIXING",
            "is_active_benchmark": False,
            "provenance": "Official RBI Daily Financial Benchmark Archive"
        },
        {
            "rate_id": "FX_USD_INR_20241015",
            "base_currency": "USD",
            "quote_currency": "INR",
            "exchange_rate": 84.06,
            "observation_date": "2024-10-15",
            "rate_source": "RBI_REFERENCE_RATE",
            "reference_institution": "Reserve Bank of India / FBIL",
            "retrieval_timestamp": "2026-11-04T09:00:00+05:30",
            "reference_type": "HISTORICAL_FIXING",
            "is_active_benchmark": False,
            "provenance": "Official RBI Daily Financial Benchmark Archive"
        }
    ]
    df = pd.DataFrame(fx_records)
    if output_path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        df.to_parquet(output_path, index=False)
    return df


if __name__ == "__main__":
    df = build_fx_reference_table()
    print(f"Generated FX Reference Table with {len(df)} records:")
    print(df[["observation_date", "exchange_rate", "rate_source", "is_active_benchmark"]])
