# Contributing to AI-Powered Indian Marketplace Trust Intelligence Platform

Thank you for your interest in contributing to the **AI-Powered Indian Marketplace Trust Intelligence Platform** (`ai-marketplace-analyzer`).

This project analyzes product listings across **Amazon India**, **Flipkart**, and **Myntra** to detect policy anomalies, image reuse, pricing discrepancies, and review manipulation using a 5-modality gated fusion architecture.

---

## 1. Development Principles & Non-Negotiable Invariants

All contributions must preserve the scientific and architectural integrity of the platform:

1. **Zero-Penalty Invariant:**  
   Unobserved, unparseable, or missing modalities (`OBSERVED`, `UNAVAILABLE`, `PROCESSING_FAILED`, `NOT_APPLICABLE`) must **never** contribute negative evidence, increase anomaly probability, or inflate risk tier. A seller with sparse data must not be penalized.
2. **Preservation of Frozen Models:**  
   Models in `models/` (ML V1.0 baseline and V1.1 candidate) are certified and frozen. Do not retrain or overwrite them in place. New model architectures must be introduced as challenger candidates under versioned directories.
3. **No False Claims of Legal Fraud Detection:**  
   The platform's supervision target is an internal deterministic policy anomaly target (`overall_risk_tier == "ELEVATED_MULTIMODAL_ANOMALY"`). Never describe model outputs as verified legal counterfeits without human ground-truth adjudication.
4. **Data Privacy & Security:**  
   Never commit API keys, personal credentials, or machine-specific absolute file paths (`C:\Users\...`). Use `Path(__file__).resolve().parents[...]` for portable path resolution.

---

## 2. Local Environment Setup

### Prerequisites
- Python 3.10+ (Verified on Python 3.11.9)
- Git 2.30+

### Setup Steps

```bash
# 1. Clone repository
git clone https://github.com/shruti316/ai-marketplace-analyzer.git
cd ai-marketplace-analyzer

# 2. Create virtual environment
python -m venv .venv

# 3. Activate virtual environment
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Linux / macOS:
source .venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Copy environment template
cp .env.example .env
```

---

## 3. Running the Test Suite

Before submitting any changes, verify that the complete automated test suite passes:

```bash
# Execute full test suite
python -m pytest tests/ -q

# Run specific domain suites
python -m pytest tests/test_inference_reliability.py -v
python -m pytest tests/test_zero_penalty_stress.py -v
python -m pytest tests/test_visual_robustness_extended.py -v
```

---

## 4. Git Commit Guidelines

We enforce the **Conventional Commits** specification:

```text
<type>(<scope>): <short description in present tense>

[optional body explaining rationale and invariants]
```

### Allowed Types
- `feat`: New feature or capability
- `fix`: Bug fix
- `docs`: Documentation updates
- `test`: Adding or updating tests
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `chore`: Maintenance, dependency, or configuration updates
- `perf`: Performance improvement

### Examples
- `feat(monitoring): add categorical PSI calculation to drift detector`
- `fix(inference): handle zero-probability falsy check in REST dispatcher`
- `docs(model-card): document V1.1 category-aware CLIP calibration`

---

## 5. Pull Request Protocol

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Make concise, atomic commits with clear messages.
3. Verify all 619+ tests pass without warnings.
4. Open a Pull Request referencing related issues and describing:
   - What changed
   - Invariant impact (especially Zero-Penalty adherence)
   - Test evidence and execution outputs
