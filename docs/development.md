# Developer Setup & Testing Guide

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Target Ecosystems:** Amazon India, Flipkart, Myntra  
**Status:** Frozen ML V1.0 Architecture  

---

## 1. Prerequisites & Environment Setup

### 1.1 Python Version
The machine learning pipeline and trust engine are validated against **Python 3.11** (tested on Python 3.11.9 on Windows 64-bit).

### 1.2 Creating the Virtual Environment
From the repository root:

```powershell
# Windows PowerShell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
```

```bash
# Linux / macOS / Bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
```

### 1.3 Installing Dependencies
Install core machine learning and evaluation dependencies:

```powershell
pip install -r requirements.txt
```

Core libraries include:
- `torch` & `torchvision` (PyTorch neural fusion and ResNet embeddings)
- `scikit-learn` (Isotonic regression, cross-validation, PR-AUC / ROC-AUC metrics)
- `networkx` (Seller-brand-product bipartite and multi-relational graphs)
- `vaderSentiment` (Rule-based sentiment discordance extraction)
- `pillow` & `imagehash` (Perceptual 64-bit dHash and duplicate image hashing)
- `pytest` (Comprehensive unit and integration testing)

---

## 2. Repository Organization

```
ai-based-marketplace-analyzer/
├── .vscode/               # Portable workspace editor settings & extensions
├── data/                  # Frozen catalog datasets & benchmarks
│   ├── raw/               # Raw marketplace crawl manifests
│   └── processed/         # Canonical SQLite databases & tabular matrices
├── docs/                  # Engineering & architecture specifications
│   ├── architecture.md    # System architecture, data flow & invariants
│   ├── development.md     # Developer setup and test execution (this file)
│   └── ml-integration.md  # Python SDK & REST API integration contract
├── manifests/             # Benchmark verification & split manifests
├── models/                # Trained model artifacts & calibrators
│   └── multimodal_fusion/ # 5-fold checkpoints, scalers & isotonic models
├── MODEL_CARDS/           # Production model cards for all active models
├── notebooks/             # Exploratory analysis & evaluation notebooks
├── reports/               # Archived audit findings & Phase 2 evaluations
│   ├── backend_audit/     # Initial Phase 2 Stage 0 architecture proposals
│   └── phase_2_multimodal/# Comprehensive evaluation reports & registry
├── scripts/               # Training, evaluation & verification CLI tools
│   └── archive/           # Legacy scripts retained for provenance
├── src/                   # Active Python source code
│   ├── api/               # REST API service endpoints & schemas
│   ├── graph/             # NetworkX graph construction & metrics
│   ├── multimodal/        # PyTorch fusion networks & isotonic calibration
│   ├── nlp/               # Review sentiment, discordance & shingling
│   ├── pricing/           # MAD robust statistics & discount scoring
│   ├── trust_engine/      # Master in-process TrustIntelligenceEngine SDK
│   └── vision/            # ResNet-18, CLIP, dHash & OCR engines
└── tests/                 # 534 unit, integration, and regression tests
```

---

## 3. Running the Test Suite

The test suite validates the deterministic trust engine, machine learning models, statistical boundaries, and API interfaces.

### 3.1 Running the Full Test Suite
Execute the entire test suite from the repository root:

```powershell
# Run all tests with concise progress reporting
python -m pytest tests/ -q
```

Expected baseline output:
- **534 collected tests**
- **534 passing** (or expected skips depending on hardware/Tesseract availability)
- **0 failures**

### 3.2 Running Targeted Domain Tests
To execute tests for specific domain subsystems:

```powershell
# Multimodal fusion model, calibration & uncertainty
python -m pytest tests/test_multimodal_fusion.py -v

# Deterministic trust engine & Zero-Penalty Invariant
python -m pytest tests/test_trust_engine.py -v

# Pricing anomaly detection (MAD, discount distributions)
python -m pytest tests/test_pricing.py -v

# Review NLP, sentiment discordance & 3-gram shingling
python -m pytest tests/test_nlp.py -v

# Computer vision, dHash & ResNet-18 embeddings
python -m pytest tests/test_vision.py -v

# Graph network relationships & PageRank
python -m pytest tests/test_graph.py -v

# REST API service & contract validations
python -m pytest tests/test_api_service.py -v
```

---

## 4. Key Testing Invariants & Contracts

When contributing or refactoring downstream application code, the following core invariants must never be broken:

1. **Zero-Penalty Invariant:**
   - If a product has missing modalities (e.g., no reviews or no images), those modalities must have their availability mask bit set to $0$.
   - Masked features must contribute zero risk score; absence of data is never penalized as suspicious behavior (`tests/test_trust_engine.py`).

2. **Calibration Monotonicity:**
   - Calibrated output probabilities must monotonically increase with respect to uncalibrated raw fusion logits (`tests/test_multimodal_fusion.py`).

3. **Deterministic Fallback Safety:**
   - If PyTorch checkpoints are unavailable or corrupted, the system must gracefully fall back to the deterministic heuristic policy without raising uncaught exceptions (`tests/test_trust_engine.py`).

4. **Bounded Uncertainty Interval:**
   - Dynamic confidence intervals must remain strictly bounded in $[0.0, 1.0]$, expanding inversely with active modality count $K_{\text{active}}$ (`tests/test_multimodal_fusion.py`).

---

## 5. VS Code Integration

The repository includes a pre-configured, machine-portable `.vscode/` setup:

- **`.vscode/settings.json`**:
  - Automatically formats on save (`editor.formatOnSave: true`).
  - Standardizes 4-space indentation for Python files.
  - Excludes ephemeral caches (`__pycache__`, `.pytest_cache`, `.ipynb_checkpoints`) from the file explorer.
  - Automatically configures pytest discovery pointing to `tests/`.
  - Omits hardcoded Python interpreter paths so it adapts to any local environment (`.venv\Scripts\python.exe` on Windows or `.venv/bin/python` on Linux/macOS).

- **`.vscode/extensions.json`**:
  - Recommends the official Microsoft Python, Pylance, Ruff, Even Better TOML, and Markdown All in One extensions.

---

## 6. Development Rules for Phase 3

1. **ML V1.0 Freeze:** The Python ML models, weights in `models/`, and canonical datasets in `data/` are frozen for ML V1.0. Do not modify or retrain models during Phase 3 application development.
2. **Import via Master SDK:** Downstream backend modules (Node.js microservices or Python workers) should integrate via `TrustIntelligenceEngine` (`src/trust_engine/api_service.py`) or the REST API (`src/api/service.py`).
3. **No Direct SQLite Writes:** Treat SQLite databases in `data/processed/` as read-only canonical stores for ML inference. Application user accounts, bookmarks, and sessions belong in Phase 3 databases (MySQL / PostgreSQL).
