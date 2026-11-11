# Platform Technical Documentation Directory

Welcome to the technical documentation of the **AI-Powered Indian Marketplace Trust Intelligence Platform** (`ai-marketplace-analyzer`).

This directory contains in-depth architectural guides, formal model cards, dataset dictionaries, scientific evaluation methodologies, and operational manuals.

---

## Documentation Index

| Document | Primary Audience | Description |
|----------|------------------|-------------|
| [`project-overview.md`](project-overview.md) | All Developers / Evaluators | High-level problem statement, objectives, scope across Amazon India, Flipkart, and Myntra, technology stack, and current completion status. |
| [`architecture.md`](architecture.md) | System Architects / Backend Engineers | Multimodal data flow, 5 learned fusion streams, gating architecture, packaging OCR engine, and Phase 3 Node.js integration boundaries. |
| [`data-dictionary.md`](data-dictionary.md) | Data Engineers / ML Engineers | Full entity schema (products, listings, sellers, reviews, images) and derived feature matrix specifications. |
| [`ml-pipeline.md`](ml-pipeline.md) | ML Engineers | Step-by-step pipeline from raw marketplace data scraping to multi-stream feature extraction and gated multimodal prediction. |
| [`model-card-v1.0.md`](model-card-v1.0.md) | ML Engineers / Auditors | Formal Model Card for the frozen ML V1.0 baseline (13 features, out-of-fold calibration, Brier score 0.0266). |
| [`model-card-v1.1.md`](model-card-v1.1.md) | ML Engineers / Auditors | Formal Model Card for the Multimodal Vision V1.1 candidate (16 features, category CLIP calibration, 6-tier duplicate taxonomy). |
| [`evaluation-methodology.md`](evaluation-methodology.md) | Research / Scientific Reviewers | Cross-validation design, brand-isolated splits, target leakage controls, calibration assessment, and ablation methodology. |
| [`known-limitations.md`](known-limitations.md) | Product / Governance | Structured inventory of catalog limitations, ground-truth gaps, regional OCR constraints, and mitigation strategies. |
| [`development-setup.md`](development-setup.md) | New Developers | Complete local workstation setup guide, virtual environment creation, test execution commands, and troubleshooting. |
| [`api-overview.md`](api-overview.md) | Backend Developers | API specification for the existing Python REST inference dispatcher (`TrustIntelligenceDispatcher`). |
| [`artifact-management.md`](artifact-management.md) | DevOps / Maintainers | Versioning, checksum verification, storage hierarchy, and governance for datasets and trained model artifacts. |

---

## Directory Navigation

- For root project overview and quickstart: See [README.md](../README.md).
- For serialized model artifacts: See [models/](../models/).
- For dataset partitions: See [data/](../data/).
- For exploratory notebooks: See [notebooks/](../notebooks/).
- For scientific acceptance and validation reports: See [reports/final_ml_readiness/](../reports/final_ml_readiness/).
