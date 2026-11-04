# Dataset v1.5 Pipeline Reproducibility Report

## Build Commands
```powershell
.venv\Scripts\python.exe src/data/curation/reconstruct_foundation_v1_5.py
.venv\Scripts\python.exe src/data/curation/build_marketplace_trust_dataset_v1_5.py
.venv\Scripts\python.exe src/data/curation/validate_marketplace_trust_dataset_v1_5.py
.venv\Scripts\python.exe -m pytest tests/test_marketplace_trust_dataset_v1_5.py -v
```
All commands execute deterministically using fixed random seeds.
