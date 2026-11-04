# Dataset Comparison: Release v1.5 vs. Release v1.6

| Metric / Dimension | Release v1.5 | Release v1.6 | Engineering Progression |
| :--- | :--- | :--- | :--- |
| **Release Version** | `v1.5` | `v1.6` | Successor release |
| **Certification Status** | CERTIFIED_WITH_LIMITATIONS | CERTIFIED_WITH_LIMITATIONS | Fully Audited |
| **Total Products** | 6,043 | 6,043 | Foundation preserved |
| **Indian Product Count** | 3,643 (60.28%) | 3,643 (60.28%) | Preserved |
| **Modality Architecture** | 2 Tiers (Complete vs Partial) | **4 Tiers (Tier A, B, C, D)** | Explicit mathematical classification |
| **Tier A Complete Listings** | 305 | 305 | Preserved |
| **Tier B Visual Listings** | — | **2,506** | Formalized visual commerce partition |
| **Tier C Textual Listings** | — | **127** | Formalized review-bearing partition |
| **Tier D Catalog Listings** | — | **3,105** | Formalized single modality partition |
| **Flipkart 127 Manifest** | None | `flipkart_127_image_target_manifest.csv` | Governed acquisition ready |
| **Seller Modeling** | Static 6 entities | **Resolved Seller Entities & Registration** | Trust tiers & corporate provenance |
| **Price Schema** | Static observation | **Temporal Schema with Batch IDs** | Standardized for longitudinal tracking |
| **Price Readiness Status** | Unspecified | **READY_FOR_DATA_COLLECTION** | Transparent temporal state |
| **Multilingual NLP** | English assumption | **Script & Hinglish Identification** | 11,672 Hinglish reviews identified |
| **Fraud Label Taxonomy** | Ad-hoc binary | **7-Tier Formal Taxonomy & Weak LFs** | Rigorous ground truth separation |
| **Visual Embeddings** | Perceptual dHash only | **512-Dim ResNet Deep Embeddings** | Feature vectors for 5,228 images |
| **Graph Intelligence** | Static edge audit | **NetworkX Degree Centrality Features** | Node-level topological intelligence |
| **NLP Benchmarking** | Isolated Ott eval | **Protocol 3 Reviewer-Disjoint Baselines** | ROC-AUC 0.9774 on zero-leakage split |
| **Automated Validator Checks** | 99/99 (100.0%) | **102/102 (100.0%)** | Expanded invariant suite |
| **Full Pytest Suite** | 275/275 passed | **316/316 passed (100.0%)** | Zero regression |
| **Protected Baselines** | 16/16 bit-perfect | **16/16 bit-perfect** | 100% cryptographic integrity |
