# Comparative Analysis: Release v1.4 vs. Release v1.5

| Feature / Dimension | Release v1.4 | Release v1.5 | Delta / Technical Improvement |
| :--- | :--- | :--- | :--- |
| **Catalog Count** | 6,043 products | 6,043 products | Preserved canonical master |
| **Category Distribution** | Narrative claimed 12 or 6 cats | **10 genuine categories** | 100% reconciled against Parquet data |
| **Review Breakdown** | Fictitious narrative breakdown | **Exact Parquet reconciliation** | BestBuy 44,965; Amazon US 8,073; Flipkart 3,260; Uncertain 240; Amazon India 159 |
| **Image Usability Count** | Narrative claimed 4,832 | **5,228 usable physical images** | Resolved 396-image difference; 100% PIL verified |
| **Prices Breakdown** | Inverted narrative breakdown | **Exact Parquet reconciliation** | 5,153 valid prices; 890 missing prices |
| **FX Conversion** | Static scalar ₹83.25 reused | **Traceable RBI benchmark fixings** | Explicit date-aware semantics |
| **Evaluation Protocols** | Protocols 1, 2, 3 | **Protocols 1, 2, 3, 4, 5, 6** | Added Image-Cluster, Cross-Listing, Temporal |
| **Fusion Model** | Circular ROC-AUC 0.9124 | **Formally retired; explainable index**| Eliminated target circularity |
| **Release Manifest** | 37 indexed tables | **43 indexed artifacts** | Includes all 6 protocols and drift baseline |
| **Pytest Suite** | 255 tests | **275 tests (100% passing)** | +20 comprehensive v1.5 tests |
| **Release Immutability** | v1.1, v1.2, v1.3 Frozen | **v1.1, v1.2, v1.3, v1.4 Frozen** | Quadruple release immutability verified |
