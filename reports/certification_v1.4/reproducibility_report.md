# Workstream K: Reproducibility & Build Instructions Report

## Build & Validation Commands
1. **Rebuild Dataset Manifest & Tables:**
   ```powershell
   .venv\Scripts\python.exe src/data/curation/build_marketplace_trust_dataset_v1_4.py
   ```
2. **Execute Full 169-Invariant Validator:**
   ```powershell
   .venv\Scripts\python.exe src/data/curation/validate_marketplace_trust_dataset_v1_4.py
   ```
3. **Execute Complete Regression Pytest Suite:**
   ```powershell
   .venv\Scripts\python.exe -m pytest tests/
   ```
4. **Migrate Notebooks & Feature Stores:**
   ```powershell
   .venv\Scripts\python.exe src/data/curation/migrate_downstream_notebooks_v1_4.py
   ```
