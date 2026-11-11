# Artifact & Dataset Management Governance

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Target Ecosystems:** Amazon India, Flipkart, Myntra  
**Release State:** ML V1.0 Baseline / Multimodal Vision V1.1 Hardened  

---

## 1. Overview & Core Governance Principles

In scientific machine learning projects, artifact reproducibility is paramount. This document defines the storage hierarchy, versioning policies, cryptographic verification standards, and lifecycle management for all models, datasets, and reports.

### Non-Negotiable Invariants:
1. **Immutability of Certified Models:** Serialized model artifacts in `models/` are frozen upon certification. They are never retrained or overwritten in place.
2. **Versioned Dataset Releases:** Historical datasets (`v1.6`, `v1.7`) represent certified milestone snapshots. Any future schema additions require a new versioned release directory.
3. **No Unnecessary Git LFS Overhead:** All tracked binary files are strictly under 20MB, well below GitHub's 50MB warning threshold and 100MB hard limit. Git LFS is not required and would introduce unnecessary friction for evaluators.

---

## 2. Storage Hierarchy

```text
ai-marketplace-analyzer/
│
├── models/                                      # Certified Serialized Models
│   ├── advanced_multimodal_gated_model.joblib   # ML V1.0 Frozen Baseline Champion
│   ├── modality_ablations.json                  # V1.0 Empirical ablation benchmarks
│   ├── hotel_review_baseline.joblib             # Reference sentiment baseline
│   └── v1_1/                                    # V1.1 Challenger Directory
│       ├── advanced_multimodal_gated_model_v1_1.joblib
│       └── modality_ablations_v1_1.json
│
├── data/                                        # Certified Tabular Datasets & Assets
│   ├── indian_marketplace_trust_dataset_v1_6/   # Baseline V1.0 Dataset (3,643 items)
│   ├── indian_marketplace_trust_dataset_v1_7/   # Certified V1.1 Dataset with OCR
│   ├── annotation/                              # Double-blind annotation templates
│   └── raw/images/                              # Local hero image assets (JPEG)
│
└── reports/                                     # Permanent Scientific Documentation
    ├── final_ml_readiness/                      # 12 Master ML readiness reports
    ├── vision_v1_1_hardening/                   # V1.1 hardening acceptance records
    └── repository_audit/                        # Audit & reproducibility verifications
```

---

## 3. Cryptographic Checksum Registry

To guarantee artifact integrity against corruption, bit-rot, or unintended modifications, all models are indexed by their SHA-256 cryptographic hashes:

| Artifact Path | Format | Size | SHA-256 Checksum |
|---------------|--------|------|------------------|
| `models/advanced_multimodal_gated_model.joblib` | Joblib | $858$ KB | `56F8304670C524B12A43F5BDE17D7AC6BF5E4EC16651079ED6BF246E141F9374` |
| `models/v1_1/advanced_multimodal_gated_model_v1_1.joblib` | Joblib | $660$ KB | `B7C00AFBCB54F5B05BBB8094746A7B3135DC01DA008EA3C1F0B7E49FC4F58564` |
| `models/hotel_review_baseline.joblib` | Joblib | $141$ KB | `4F92B54E691A083161C145FE07DF15DE8189D5AC3B11A1B436D81C3ACBA7AEB5` |
| `models/multimodal_fusion_model.joblib` | Joblib | $2.23$ MB | `A32F5DA55E0E8D9BD6B386450BF47C9200B093BF829285093A92A62C66A46307` |

### Checksum Verification Commands

- **Windows (PowerShell):**
  ```powershell
  Get-FileHash models/advanced_multimodal_gated_model.joblib, models/v1_1/advanced_multimodal_gated_model_v1_1.joblib -Algorithm SHA256
  ```

- **Linux / macOS:**
  ```bash
  sha256sum models/advanced_multimodal_gated_model.joblib models/v1_1/advanced_multimodal_gated_model_v1_1.joblib
  ```

---

## 4. Git LFS Evaluation & Size Justification

A full audit of all tracked repository files was executed via `git ls-files`:

| Category | Count | Total Size | Largest Single File |
|----------|:-----:|:----------:|:-------------------:|
| **Serialized Models (`models/`)** | 4 files | $\approx 3.8$ MB | $2.23$ MB (`multimodal_fusion_model.joblib`) |
| **NumPy Embeddings (`.npz`)** | 3 files | $\approx 35.3$ MB | $18.1$ MB (`visual_embeddings_v1_7.npz`) |
| **Parquet Datasets (`.parquet`)** | 24 files | $\approx 112$ MB | $15.6$ MB (`reviews.parquet`) |
| **Catalog Imagery (`.jpg`)** | 3,643 files| $\approx 64$ MB | $210$ KB |

### Architectural Decision: Standard Git over Git LFS
1. **GitHub Native Limits:** GitHub permits files up to 100MB directly in standard Git repositories (issuing a soft warning at 50MB).
2. **Maximum Tracked Size:** The largest individual file in the repository is $18.1$ MB (`visual_embeddings_v1_7.npz`), which is less than $37\%$ of the warning threshold.
3. **Developer Usability:** Standard Git allows developers, evaluators, and CI runners to execute `git clone` without configuring Git LFS bandwidth quotas or local hooks.

---

## 5. Artifact Lifecycle & Promotion Protocol

When new experimental models are trained on live data:
1. **Staging:** Trained models are output to a separate staging directory (e.g. `models/staging/`).
2. **Audit & Validation:** Model must pass out-of-fold calibration tests, leakage audits, and zero-penalty stress benchmarks.
3. **Challenger Registration:** If validated, the model is committed into a new versioned candidate directory (e.g. `models/v1_2/`) with an accompanying Model Card.
4. **Champion Promotion:** A challenger is promoted to primary champion only when it meets the 4 promotion gates defined in [`docs/model-card-v1.1.md`](model-card-v1.1.md) against human ground truth.
