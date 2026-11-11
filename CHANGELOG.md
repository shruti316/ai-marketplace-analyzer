# Changelog

All notable changes to the **AI-Powered Indian Marketplace Trust Intelligence Platform** (`ai-marketplace-analyzer`) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] - Phase 3 Backend Preparation

### Planned
- Node.js API gateway orchestration and express route integration.
- MySQL transactional entity persistence and audit logs.
- React web dashboard for interactive trust exploration.
- Prospective 1,500-sample human ground-truth collection and adjudication.

---

## [1.8.0] - 2026-11-11: Repository Professionalization & Documentation

### Added
- **Technical Documentation Suite (`docs/`):**
  - Comprehensive project overview (`docs/project-overview.md`).
  - Multimodal data flow and system architecture with Mermaid diagrams (`docs/architecture.md`).
  - Standardized entity and derived evidence data dictionary (`docs/data-dictionary.md`).
  - End-to-end ML training and feature pipeline guide (`docs/ml-pipeline.md`).
  - Independent Model Cards for ML V1.0 Baseline (`docs/model-card-v1.0.md`) and Multimodal Vision V1.1 Candidate (`docs/model-card-v1.1.md`).
  - Scientific evaluation, brand-isolated CV, and calibration methodology (`docs/evaluation-methodology.md`).
  - Structured limitations registry (`docs/known-limitations.md`).
  - Developer environment and reproduction guide (`docs/development-setup.md`).
  - REST inference service API specification (`docs/api-overview.md`).
  - Artifact and dataset storage governance guide (`docs/artifact-management.md`).
- **Engineering Standards:**
  - Added `.env.example`, `.gitattributes`, `CONTRIBUTING.md`, `SECURITY.md`, and upgraded `requirements.txt`.
  - Added GitHub Actions CI workflow (`.github/workflows/ci.yml`), issue templates, and PR template.
  - Directory navigation READMEs across `docs/`, `data/`, `models/`, and `notebooks/`.

### Changed
- Re-architected root `README.md` into an executive, scientifically honest, portfolio-grade presentation covering all 12 platform dimensions.

---

## [1.7.0] - 2026-11-11: Final ML Readiness, Scientific Validation & Production Hardening

### Added
- **12 Master Scientific Validation Reports** under `reports/final_ml_readiness/`:
  - Gap register, ground-truth audit, evidence correlation invariants, zero-penalty stress benchmarks, marketplace calibration, visual robustness (12 transforms), OCR evaluation, CLIP semantic prior isolation, inference reliability benchmarks, catalog drift monitoring, final model comparison, and release readiness verdict.
- **Independent Ground-Truth Pipeline (`src/data/ground_truth_pipeline.py`):**
  - Multi-rater double-blind annotation ingestion supporting Landis-Koch Cohen's and Fleiss' Kappa statistics.
- **Catalog Data Drift Detector (`src/monitoring/catalog_drift_detector.py`):**
  - Population Stability Index (PSI) and continuous 2-sample Kolmogorov-Smirnov test monitoring with automated triage alerts.
- **In-Memory Feature Matrix Caching:**
  - Integrated `_cached_matrix` into `AdvancedMultimodalIntelligenceService` achieving sub-70ms inference latencies.
- **Expanded Automated Test Suite:**
  - Added test suites for evidence deduplication, zero-penalty stress across all 32 availability masks, 12-transform visual perturbations, CLIP isolation, inference reliability under 50 concurrent threads, and data drift monitoring (test suite expanded to **619 passed tests**).

### Verified
- Immutable checksum verification of frozen ML V1.0 baseline and V1.1 candidate models.
- Mathematical confirmation of the Zero-Penalty Invariant.

---

## [1.1.0] - 2026-11-11: Multimodal Vision V1.1 & Hardening

### Added
- **16-Feature Multi-Stream Matrix:**
  - Integrated studio white-background indicator, normalized image count, and category-calibrated CLIP z-scores.
- **6-Tier Duplicate Image Taxonomy (`AdvancedDuplicateTaxonomyClassifier`):**
  - Fine-grained classification: `EXACT_DUPLICATE`, `NEAR_DUPLICATE`, `SAME_PRODUCT_DIFFERENT_IMAGE`, `SAME_PRODUCT_VARIANT`, `RELATED_PRODUCT`, `UNRELATED`, and `REVIEW_REQUIRED`.
- **Category-Aware CLIP Calibration (`CategoryAwareCLIPCalibrator`):**
  - Standardized $z$-score normalization eliminating false alarms in Indian ethnic fashion apparel.
- **Physical Packaging OCR Engine (`PhysicalOCREngine`):**
  - Native WinRT OCR on Windows with statutory regex extraction for MRP (INR), Net Quantity, and Batch codes.
- **Cross-Modal Event Deduplication:**
  - Event-level correlation between computer vision image reuse and graph topological edges.
- **Marketplace Decision Policies:**
  - Adapted decision threshold ($0.65$) for Flipkart promotional discounts.

---

## [1.0.0] - 2026-11-10: ML V1.0 Frozen Baseline

### Added
- **5-Modality Gated Fusion Model:**
  - 13-feature architecture combining Pricing, Review NLP, Computer Vision (ResNet-18/dHash), CLIP ViT-B/32, and Relationship Graph Topology.
- **Leak-Free Probability Calibration:**
  - Out-of-fold Isotonic Regression achieving $0.0266$ Brier score on holdout validation.
- **Unified Evidence Engine & Atomic Provenance:**
  - Standardized `UnifiedEvidenceItem` schema and explainable reporting.
- **Initial REST Inference Service:**
  - Python HTTP server routing endpoints for product trust assessment.
