# Provenance & Data Lineage Report — Indian Marketplace Trust Dataset v1.3

## 1. Upstream Source Lineage
- **Amazon India Catalog:** `data/raw/amazon_india/amazon_india_products_raw.csv` (PromptCloud Amazon India e-commerce cache, 1,500 products).
- **Flipkart Catalog:** `data/raw/flipkart/flipkart_products_raw.csv` (PromptCloud Flipkart products cache, 1,000 products).
- **Flipkart Reviews:** `data/raw/flipkart/flipkart_reviews_raw.csv` (Flipkart customer reviews corpus, 3,500 reviews; 143 recovered product titles yielding 240 recovered reviews).
- **Myntra Catalog:** `data/raw/myntra/myntra_products_raw.csv` (Myntra fashion crawl cache, 1,000 products / SKUs).
- **Physical Image Assets:** `data/indian_marketplace/raw/images/` and `data/raw/images/cache/` (4,708 verified usable JPEG assets).
- **Pre-computed Embeddings:** ResNet-18 ImageNet weights, extracted via PyTorch 2.x, unit L2-normalized.
- **Benchmark Fixtures:** `data/raw/benchmarks/synthetic_stress_test_cases.parquet` and `data/annotation/cv_manual_evaluation_50.csv`.

## 2. Release Lineage Architecture
$$\text{v1.0 (Baseline)} \longrightarrow \text{v1.1 (Resolved Taxonomy)} \longrightarrow \text{v1.2 (Commit } \texttt{ae0c9ec}\text{)} \longrightarrow \text{v1.3 (Current Release)}$$

- **v1.0 Baseline:** Preserved immutable under `data/indian_marketplace_trust_dataset_final/`.
- **v1.1 Release:** Preserved immutable under `data/indian_marketplace_trust_dataset_v1_1/`.
- **v1.2 Release:** Preserved immutable under `data/indian_marketplace_trust_dataset_v1_2/`.
- **v1.3 Release:** Generated under `data/indian_marketplace_trust_dataset_v1_3/`.

## 3. Provenance Classifications
- `CATALOG_INGESTION`: Derived directly from crawled marketplace DOM tables.
- `SPECIFICATION_EXTRACTION`: Factual attributes parsed from product specification key-value pairs.
- `TITLE_TOKEN_PROXY`: Packaging text reference extracted from product title tokens (confidence 0.50).
- `RULE_HEURISTIC_PIPELINE`: Heuristic silver pseudo-labels generated from linguistic rules (confidence 0.70).
- `HUMAN_EXPERT_ADJUDICATION`: Human-reviewed evaluation records with 6-domain aspect ontology (confidence 0.95).
- `CONNECTED_COMPONENTS_DUAL_GROUPING`: Partitioning via bipartite product-review text clustering.
