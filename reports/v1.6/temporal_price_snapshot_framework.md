# Temporal Price Snapshot Framework & Readiness Report (v1.6)

**Project:** AI-Powered Marketplace Trust Intelligence Platform  
**Milestone:** Release v1.6  
**Author:** Lead Data Architect & Pricing Intelligence Engineer  
**Status:** Certified Architecture  

---

## 1. Executive Summary

In Release v1.6, we formalize the **Temporal Price Snapshot Framework**, advancing the platform from single-timestamp static price points to an extensible, audit-ready temporal observation architecture.

```
+----------------------------------------------------------------------------------------------------+
| Temporal Price Observation Architecture                                                            |
+------------------------------+---------------------------------------------------------------------+
| Table                        | data/processed_v1_6/price_observations_v1_6.parquet                 |
| Total Observations           | 6,043 listings                                                      |
| Valid Observed Prices        | 5,153 listings (85.27%)                                             |
| Missing / Unobserved Prices  | 890 listings (14.73%, honest nulls preserved)                       |
| Current Collection Batch     | BATCH_20261102_BASELINE_T0                                          |
| Temporal Readiness Status    | READY_FOR_DATA_COLLECTION                                           |
+------------------------------+---------------------------------------------------------------------+
```

---

## 2. Scientific Integrity & Zero-Fabrication Guarantee

In strict compliance with Master Assignment Part 4 and scientific research ethics:
1. **Zero Historical Fabrication:** Historical timestamps, synthetic price fluctuations, artificial flash sales, and fabricated markdown curves have **NOT** been generated.
2. **True Baseline Representation:** All current 6,043 listings originate from single-point-in-time catalog crawls (collected October 28 – November 2, 2026).
3. **Explicit Readiness Status:** Rather than masking the lack of longitudinal observations, each listing is tagged with `observation_count = 1`, `price_volatility_score = 0.0`, and `temporal_readiness_status = "READY_FOR_DATA_COLLECTION"`.

---

## 3. Standardized Temporal Schema

The updated schema in `price_observations_v1_6.parquet` incorporates standardized temporal and provenance fields:

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `price_observation_id` | String | Unique primary key (`obs_{canonical_product_id}_{YYYYMMDD}`) |
| `canonical_product_id` | String | Foreign key to `entities/products.parquet` |
| `product_id` | String | Source marketplace product identifier (e.g. ASIN, PID) |
| `marketplace` | String | Marketplace code (`amazon_in`, `flipkart`, `myntra`, `amazon`, `walmart`, `bestbuy`) |
| `observed_price` | Float | Original observed price in local listing currency |
| `original_currency` | String | Currency of listing (`INR`, `USD`) |
| `normalized_price` | Float | Standardized price in benchmark currency |
| `normalized_price_inr` | Float | Calibrated INR price after official benchmark FX rate |
| `normalized_currency` | String | Constant benchmark currency (`INR`) |
| `fx_rate_id` | String | Identifier of applied FX conversion rate rule |
| `observation_timestamp`| String | ISO 8601 crawl observation timestamp |
| `source_timestamp` | String | Upstream source capture timestamp |
| `observation_method` | String | Method of extraction (`CATALOG_METADATA_EXTRACT`) |
| `source_reference` | String | Provenance crawl archive reference |
| `collection_batch_id` | String | Ingestion batch identifier (`BATCH_20261102_BASELINE_T0`) |
| `verification_status` | String | Verification verdict (`VALIDATED`) |
| `is_valid_price` | Boolean | True if non-null, positive, and verified against scraper artifacts |
| `retail_mrp` | Float | Manufacturer Suggested Retail Price / MRP |
| `discount_percentage` | Float | Computed discount percentage against MRP |
| `stock_status` | String | In-stock status (`IN_STOCK`, `UNKNOWN`, `OUT_OF_STOCK`, `UNAVAILABLE`) |
| `domain_partition` | String | Domain split (`INDIAN_MARKETPLACE`, `SUPPLEMENTARY_INTERNATIONAL`) |
| `temporal_status` | String | Temporal baseline state (`SINGLE_OBSERVATION_BASELINE`) |
| `reconciliation_version`| String | Dataset release version (`v1.6`) |

---

## 4. Multi-Snapshot Volatility Framework

The module `src/pricing/temporal_snapshot_framework_v1_6.py` provides multi-snapshot tracking capabilities ready for production crons:
- **Snapshot Stacking:** Appends new scheduled batches (`BATCH_{YYYYMMDD}_T1`, etc.) without altering historical observations.
- **Price Volatility Metric:** For listings with $N \ge 2$ observations:
  $$\text{Volatility} = \frac{\sigma(P_{\text{INR}})}{\mu(P_{\text{INR}})}$$
- **Discount Velocity:** Measures the rate of markdown change over consecutive crawl intervals $\Delta t$:
  $$\text{Velocity} = \frac{D_{t_2} - D_{t_1}}{t_2 - t_1}$$
- **Flash Anomaly Thresholds:** Flags sudden price drops exceeding 50% within a 24-hour window as candidate price-gouging or liquidation events for fraud intelligence investigation.
