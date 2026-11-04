# Reproducibility and Verification Guide (v1.2)

## 1. Build and Validation Pipeline Commands

To reproduce the v1.2 build from scratch:
```powershell
.venv\Scripts\python.exe src/data/curation/build_marketplace_trust_dataset_v1_2.py
```

To execute the automated 159-check data quality validation suite:
```powershell
.venv\Scripts\python.exe src/data/curation/validate_marketplace_trust_dataset_v1_2.py
```

To run the formal pytest release suite:
```powershell
.venv\Scripts\python.exe -m pytest tests/test_marketplace_trust_dataset_v1_2.py -v
```

To run the full regression test suite across the entire project:
```powershell
.venv\Scripts\python.exe -m pytest tests/
```

---

## 2. Deterministic Guarantees
- All evaluation splits use fixed random seed `42`.
- All table generation steps are 100% deterministic.
- Cryptographic SHA-256 hashes are verified in `dataset_manifest.json`.
