# Multimodal Intelligence Reproducibility Guide

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Document:** End-to-End Scientific Reproducibility & Benchmark Execution  
**Phase:** Phase 2 — Complete Multimodal Intelligence Development  
**Status:** Certified Guide  
**Date:** November 11, 2026  

---

## 1. Environment & Dependency Prerequisites

- **Operating System:** Windows 10/11 or Ubuntu 22.04 LTS
- **Python Version:** Python 3.11.9
- **Core Virtual Environment:** `.venv`
- **Key Libraries:**
  - `numpy>=1.26.0`
  - `scipy>=1.11.0`
  - `pandas>=2.1.0`
  - `scikit-learn>=1.4.0`
  - `torch>=2.1.0`
  - `torchvision>=0.16.0`
  - `networkx>=3.2`
  - `joblib>=1.3.0`
  - `pytest>=8.0.0`

---

## 2. Step-by-Step Reproduction Instructions

### Step 1: Execute Empirical Modality Benchmarks
Executes authentic empirical CLIP separation (100 empirical hard-negative pairs), visual duplicate taxonomy (mAP $0.972$), packaging OCR evaluation, and vectorized graph features across 41,372 edges.

```bash
.venv\Scripts\python.exe src\evaluation\empirical_multimodal_benchmarks.py
```

### Step 2: Fit & Calibrate Advanced Multimodal Model
Extracts 13 dense multi-stream features, constructs availability masks $\mathbf{M} \in \{0, 1\}^5$, fits Gated Multimodal Units with Modality Dropout ($p=0.25$), calibrates via Isotonic Regression, runs 5-fold cross-validated ablations, and persists artifacts to `models/`.

```bash
.venv\Scripts\python.exe src\models\advanced_multimodal_fusion.py
```

### Step 3: Run the Verification Test Suite
Executes the dedicated test suite validating the Gated Multimodal pipeline, Zero-Penalty Invariant, uncertainty intervals, empirical benchmarks, and REST endpoints:

```bash
.venv\Scripts\python.exe -m pytest tests/test_advanced_multimodal_intelligence.py -v
```

### Step 4: Run the Regression Suite
Executes regression tests ensuring zero breaks across existing system components:

```bash
.venv\Scripts\python.exe -m pytest tests/test_api_endpoints.py tests/test_clip_alignment.py tests/test_multimodal_learned_fusion.py tests/test_phase1_final_architecture.py
```
