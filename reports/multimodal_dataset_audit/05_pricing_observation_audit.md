# Independent Pricing Observation & Snapshot Audit Report

**Project:** AI-Powered Marketplace Trust Intelligence Platform  
**Target:** `data/indian_marketplace/phase3/products.parquet` (Pricing Columns)  
**Date:** November 2, 2026  

---

## 1. Pricing Snapshot Architecture vs. Historical Time-Series

### Critical Audit Determination:
- **Snapshot Nature:** All current prices in the dataset represent **single static point-in-time snapshots** captured during original scrapings.
- **Zero Historical Time-Series:** The existing dataset does NOT contain time-series price histories (e.g. daily/weekly price trajectories).
- **Architectural Action Required:** In Part 3, we must establish a dedicated `price_observations.parquet` table where each observation is explicitly timestamped with an observation ID, rather than pretending static snapshot prices are longitudinal time-series data.

---

## 2. Quantitative Pricing Distributions

| Metric | Selling Price (₹) | MRP / List Price (₹) | Discount Percentage (%) |
| :--- | :---: | :---: | :---: |
| **Count** | 3,623 | 3,616 | 2,772 |
| **Minimum** | ₹17.00 | ₹20.00 | 0.12% |
| **25th Percentile** | ₹444.00 | ₹717.81 | 20.12% |
| **Median** | ₹799.00 | ₹1499.00 | 40.58% |
| **75th Percentile** | ₹1699.50 | ₹2894.25 | 58.19% |
| **Maximum** | ₹107750.00 | ₹107750.00 | 90.44% |
| **Mean** | ₹2061.85 | ₹2927.42 | 40.42% |

---

## 3. Stock Status Semantics Verification

Following Phase 2 targeted corrections:
- **`IN_STOCK` (3,218 products):** Active listings with verified positive selling prices.
- **`OUT_OF_STOCK` (420 products):** 10 Amazon India listings and 410 Myntra listings backed by explicit source inventory flags (`Stock Availibility: NO`, `is_in_stock: FALSE`).
- **`UNKNOWN` (5 products):** Flipkart listings where price was missing, correctly avoiding false OOS assumptions.
