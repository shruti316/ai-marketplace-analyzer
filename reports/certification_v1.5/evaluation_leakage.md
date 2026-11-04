# Dataset v1.5 Evaluation Leakage Audit

## Multi-Protocol Partition Suite
Release v1.5 implements six discrete evaluation protocols:

| Protocol ID | Protocol Name | Partitioning Entity | Cross-Split Overlap | Split Counts (Train / Val / Test) |
| :--- | :--- | :--- | :--- | :--- |
| **Protocol 1** | Product-Held-Out | Canonical Product ID + Image Clusters | **0 Product IDs, 0 Image Clusters** | 4,230 / 906 / 907 |
| **Protocol 2** | Variant-Family-Held-Out | Variant Parent Group ID | **0 Variant Groups, 0 Products** | 4,230 / 906 / 907 |
| **Protocol 3** | Reviewer-Held-Out | Reviewer Account ID | **0 Named Reviewers, 0 Products** | 4,230 / 906 / 907 |
| **Protocol 4** | Image-Cluster-Held-Out | dHash & SHA-256 Visual Clusters | **0 Image Clusters, 0 Products** | 4,230 / 906 / 907 |
| **Protocol 5** | Cross-Listing-Held-Out | Cross-Marketplace Matched Family | **0 Cross-Listing Families** | 4,230 / 906 / 907 |
| **Protocol 6** | Temporal Evaluation | Observation Timestamp | Prospective specification | Documented in JSON |

All splits maintain strict ~70/15/15 target distributions with zero inter-split contamination.
