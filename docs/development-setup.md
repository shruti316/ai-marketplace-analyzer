# Developer Environment & Local Reproduction Guide

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Target Ecosystems:** Amazon India, Flipkart, Myntra  
**Supported Platforms:** Windows 10/11, Ubuntu 20.04+, macOS 12+  
**Target Runtime:** Python 3.10+ (Verified on Python 3.11.9)  

---

## 1. Prerequisites

Before installing, ensure your workstation meets the following requirements:
- **Python:** 3.10 or higher (`python --version`)
- **Git:** 2.30 or higher (`git --version`)
- **Memory:** 4 GB RAM minimum (8 GB recommended for multi-threaded testing)
- **Disk Space:** ~2.5 GB for repository, virtual environment, and certified datasets

---

## 2. Installation & Virtual Environment Setup

### 2.1 Clone the Repository
```bash
git clone https://github.com/shruti316/ai-marketplace-analyzer.git
cd ai-marketplace-analyzer
```

### 2.2 Create Virtual Environment
```bash
python -m venv .venv
```

### 2.3 Activate Virtual Environment
- **Windows (PowerShell):**
  ```powershell
  .venv\Scripts\Activate.ps1
  ```
  *(Note: If execution policy blocks script execution, run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`)*

- **Linux / macOS:**
  ```bash
  source .venv/bin/activate
  ```

### 2.4 Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 2.5 Configure Environment Variables
```bash
# Copy example configuration template
cp .env.example .env
```
*(The default `.env.example` settings work out-of-the-box for local testing.)*

---

## 3. Running the Test Suite

The repository contains an automated test suite comprising 619 unit, invariant, and integration tests across 53 test modules.

### 3.1 Run Full Suite
```bash
python -m pytest tests/ -q
```
*(Expected result: `619 passed in ~460s`)*

### 3.2 Run Targeted Domain Test Suites
```bash
# 1. Zero-Penalty Stress Benchmark (All 32 availability masks)
python -m pytest tests/test_zero_penalty_stress.py -v

# 2. Evidence Correlation & Event Deduplication
python -m pytest tests/test_evidence_correlation_invariants.py -v

# 3. Visual Robustness (12 image perturbation transforms)
python -m pytest tests/test_visual_robustness_extended.py -v

# 4. CLIP Semantic Prior Isolation
python -m pytest tests/test_clip_semantic_isolation.py -v

# 5. REST Inference Reliability & Concurrency
python -m pytest tests/test_inference_reliability.py -v

# 6. Catalog Data Drift Monitoring
python -m pytest tests/test_drift_monitoring.py -v
```

---

## 4. Starting the Python REST Inference Service

The platform provides a standalone, production-ready HTTP REST service (`src/api/service.py`) using standard Python libraries without external web framework bloat.

### 4.1 Launch Local Server
```bash
python src/api/service.py
```
*(Server starts listening on `http://127.0.0.1:8000`)*

### 4.2 Test Service Endpoints

```bash
# Health Check
curl http://127.0.0.1:8000/health

# Run ML V1.0 Multimodal Inference on a Product
curl "http://127.0.0.1:8000/api/v1/products/amazon_in_B000052YQN/learned-multimodal?version=v1.0"

# Run Multimodal Vision V1.1 Inference
curl "http://127.0.0.1:8000/api/v1/products/amazon_in_B000052YQN/learned-multimodal?version=v1.1"

# Retrieve Deduplicated Atomic Evidence Items
curl http://127.0.0.1:8000/api/v1/products/amazon_in_B000052YQN/evidence
```

---

## 5. Using the Python SDK In-Process

To evaluate listings directly from Python scripts, notebooks, or test harnesses:

```python
from src.trust_engine.api_service import TrustIntelligenceEngine

# Initialize master unified trust engine
engine = TrustIntelligenceEngine()

# 1. Assess product trust via ML V1.0 Baseline
asmt_v1_0 = engine.assess_product_learned_multimodal("amazon_in_B000052YQN", version="v1.0")
print("V1.0 Risk Tier:", asmt_v1_0["predicted_risk_tier"])
print("Calibrated Risk Probability:", asmt_v1_0["calibrated_risk_probability"])

# 2. Assess product trust via Multimodal Vision V1.1
asmt_v1_1 = engine.assess_product_learned_multimodal("amazon_in_B000052YQN", version="v1.1")
print("V1.1 Risk Tier:", asmt_v1_1["predicted_risk_tier"])

# 3. Retrieve explainable atomic evidence items
evidence = engine.get_product_evidence("amazon_in_B000052YQN")
print(f"Retrieved {len(evidence)} atomic evidence records.")

# 4. Generate human-readable Markdown investigation report
markdown_report = engine.generate_report("amazon_in_B000052YQN", format_type="markdown")
print(markdown_report[:400])
```

---

## 6. Running Research Notebooks

The exploratory Jupyter notebooks in `notebooks/` can be launched via:
```bash
jupyter notebook notebooks/
```
Follow the sequential execution guide in [`notebooks/README.md`](../notebooks/README.md) to explore the research trajectory.
