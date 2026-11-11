# Model Card: Graph Network Topology & Centrality Engine (`graph_topology_centrality`)

## Model Details
- **Model Name:** Heterogeneous Entity Graph Centrality & PageRank Extractor
- **Model Version:** 1.2.0
- **Model Type:** NetworkX / Scipy Sparse Graph Engine across 41,372 relationship edges
- **Frameworks:** Python 3.11, NetworkX 3.2+, SciPy
- **Artifact:** Graph relationships in `entity_relationships.parquet`

## Intended Use
- Quantify entity connectivity, cross-marketplace co-occurrence density, and brand-seller structural isolation.
- Act as the structural backbone for multimodal anomaly scoring.

## Performance & Critical Multimodal Synergy
- **Unimodal Metrics:** ROC-AUC $0.9755$, PR-AUC $0.7170$, Brier $0.0709$.
- **Ablation Criticality:** Dropping graph features causes PR-AUC in the multimodal model to collapse from $0.6846$ to $0.3363$ ($-50.9\%$).
- **Isolation Verification:** 100% connected-component isolation maintained across StratifiedGroupKFold splits to prevent community-ID memorization.

## Limitations
- Newly created cold-start products lack network edges; mitigated by Modality Dropout during training and Zero-Penalty Invariant at inference.
