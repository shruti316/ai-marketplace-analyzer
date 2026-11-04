# Comparison: Dataset Release v1.2 vs. Release v1.3

| Dimension | Release v1.2 | Release v1.3 | Delta / Enhancement in v1.3 |
| :--- | :---: | :---: | :--- |
| **Catalog Architecture** | 6,043 products | **6,043 products** | Preserved exact normalized schema |
| **Indian Catalog Share** | 60.28% (3,643) | **60.28% (3,643)** | Fully maintained Indian-first domestic priority |
| **Complete Multimodal Core (Tier A)** | 305 products | **305 products** | 5 Amazon India + 300 Amazon US Gold verified |
| **Customer Review Retention** | 56,697 reviews | **56,697 reviews** | 100% retained (0 filtered out) |
| **Review Reconciliation Audit** | High-level summary | **Exact Arithmetic Audit** | Formal mathematical proof: 55,616 legacy + 3,659 Indian - 2,578 unselected = 56,697 |
| **Release Immutability Verification** | v1.1 checked | **Dual v1.1 & v1.2 Verification** | Both v1.1 and v1.2 cryptographically verified frozen |
| **Protected Baselines Protection** | 16 files verified | **16 files verified** | 100% bit-perfect SHA-256 match across all 16 files |
| **Automated Validator Invariant Checks**| 159 checks | **162 checks** | +3 additional checks including dual immutability |
| **Pytest Test Suite Pass Rate** | 221 / 221 (100%) | **236 / 236 (100%)** | +15 dedicated v1.3 release pytest test cases |
| **Downstream Feature Artifacts** | `_v1_2.parquet` | `_v1_3.parquet` | New versioned feature stores & cleaned datasets |
| **Downstream Notebook Migrations** | 5 notebooks (Sections 12, 15, 8, 20, 35) | **5 notebooks (Sections 13, 16, 9, 21, 36)** | Fully integrated downstream pipelines |
