# Data Lineage & Provenance Report — Indian Marketplace Trust Dataset v1.4

## 1. Executive Summary
Documents complete lineage, extraction provenance, and cryptographic auditing for all dataset components.

## 2. Source Provenance Mappings
- **Catalog Products & Listings:** PromptCloud static crawls of Amazon India, Flipkart, Myntra.
- **Brand Entities:** Rule-based extraction & string disambiguation from verified catalog product titles and brand metadata.
- **Price Points:** Primary scrape observation timestamps + review-text corroborated price points.
- **Visual Features:** PyTorch ResNet-18 backbone (ImageNet pre-trained), unit L2-normalized.
- **Human Annotations:** Verified expert annotations (`HUMAN_EXPERT_ANNOTATOR_01`) evaluated against `annotation_guidelines.md`.
- **Silver Pseudo-Labels:** Rule-based heuristic pipeline (`RULE_HEURISTIC_PIPELINE_v1.2`, conf 0.70).
