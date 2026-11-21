# Price Observation Evidence and Temporal Limitations Report (v1.1)

> [!NOTE]
> **Total Price Observations**: 6,043 point-in-time observations (exactly 1-to-1 referential mapping with master products).

---

## 1. Price Observation Architecture

Pricing signals are crucial for detecting predatory pricing, bait-and-switch discounts, and luxury brand counterfeit anomalies.

| Currency | Observation Count | Valid Positive Prices | Unpriced / Unavailable | Dominant Marketplaces |
| :--- | :--- | :--- | :--- | :--- |
| **INR (₹)** | 3,643 | 3,480 (95.5%) | 163 (4.5%) | Amazon India, Flipkart, Myntra |
| **USD ($)** | 2,400 | 1,581 (65.9%) | 819 (34.1%) | Amazon US, BestBuy, Walmart |
| **Total** | **6,043** | **5,061 (83.75%)** | **982 (16.25%)** | **Full Master Catalog** |

---

## 2. Stock Status Semantics and Correction

In earlier project iterations, missing prices were improperly mapped to `OUT_OF_STOCK`. In v1.1, stock status adheres strictly to empirical evidence:

| Stock Status | Count | Share | Applied Logic |
| :--- | :--- | :--- | :--- |
| `IN_STOCK` | 5,061 | 83.75% | Valid positive price observation recorded at crawl time. |
| `UNKNOWN` | 982 | 16.25% | Price missing or unparseable in raw source; availability unverified. |
| `OUT_OF_STOCK` | 0 | 0.00% | Only applied when explicit out-of-stock badge existed in raw HTML. |

---

## 3. Honest Temporal Limitations

> [!WARNING]
> **No Longitudinal Price Histories**: All 6,043 price records represent a single point-in-time crawl snapshot.

- **Temporal Granularity**: The raw crawl data collected product listings at a single timestamp. No daily, weekly, or monthly price tracking was captured by the underlying crawl pipelines.
- **Zero Synthetic Timestamps**: We strictly refuse to fabricate synthetic historical price drop curves or fictitious promotional discount histories.
- **Cross-Sectional Baseline**: Price anomaly detection in the platform operates cross-sectionally (comparing product price against category/brand distributions) rather than longitudinally.
