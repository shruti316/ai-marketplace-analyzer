# Dataset v1.5 Final Release Reconciliation Report
**Release Version:** Indian Marketplace Trust Dataset v1.5  
**Author:** Multimodal ML Architect, Data Quality Auditor & Research Dataset Engineer  
**Audit Pipeline:** [`scripts/verification/audit_milestone3_4_v1_5.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/scripts/verification/audit_milestone3_4_v1_5.py)  
**Execution Timestamp:** 2026-11-09T06:05:00Z  
**Dataset Path:** [`data/indian_marketplace_trust_dataset_v1_5/`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/)  

---

## 1. Executive Summary

This reconciliation report formally resolves the two documentation and count discrepancies identified during the Milestone 3+4 finalization of **Indian Marketplace Trust Dataset v1.5**:
1. **Risk-Tier Reconciliation:** Explains the exact mathematical root cause of the 143-product difference between the preliminary narrative count ($1,211$) and the verified algorithmic count ($1,068$) for `UNASSESSED_SPARSE_DATA`.
2. **Image Duplicate Reconciliation:** Disentangles the terminology distinguishing the 323 distinct duplicate hash groups, the 332 surplus duplicate instances, and the 655 total images belonging to duplicate groups.

All underlying pipelines in [`src/nlp/`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/nlp/), [`src/cv/`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/cv/), and [`src/multimodal/`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/multimodal/) remain 100% deterministic, reproducible, and certified by automated test suites.

---

## 2. Discrepancy 1: Risk-Tier Reconciliation (`UNASSESSED_SPARSE_DATA`)

### A. The Discrepancy
- **Preliminary Narrative Report:** Reported `UNASSESSED_SPARSE_DATA` $= 1,211$ products.
- **Audited Parquet Output:** [`derived_evidence/product_multimodal_summary.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/derived_evidence/product_multimodal_summary.parquet) records `UNASSESSED_SPARSE_DATA` $= 1,068$ products.
- **Delta:** Exactly $143$ products ($1,211 - 1,068 = 143$).

### B. Mathematical Root Cause Analysis
In [`src/multimodal/evidence_fusion.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/multimodal/evidence_fusion.py), the risk-tier assignment logic is defined as:
```python
available_modalities = sum([
    modality_status["review_modality_status"] == "AVAILABLE",
    modality_status["image_modality_status"] == "AVAILABLE",
    modality_status["price_modality_status"] == "AVAILABLE",
])

if available_modalities < 2:
  risk_tier = "UNASSESSED_SPARSE_DATA"
```

A complete cross-tabulation of the 3,643 canonical products across Image and Review modalities reveals:

| Category | Has Images (`usable_image_count > 0`) | Zero Images (`usable_image_count == 0`) | Total Products |
| :--- | :--- | :--- | :--- |
| **Zero Reviews (`review_count == 0`)** | 2,427 products | **1,068 products** (Sparse: Pricing only) | 3,495 products |
| **Has Reviews (`review_count > 0`)** | 5 products | **143 products** (Reviews + Pricing) | 148 products |
| **Total Products** | **2,432 products** | **1,211 products** | **3,643 products** |

### C. Resolution & Findings
1. **Total Unimaged Products:** Exactly **1,211 products** possess zero hero images (`image_modality_status = 'MODALITY_UNAVAILABLE'`).
2. **The 143 Review-Bearing Unimaged Products:** Out of the 1,211 unimaged products, exactly **143 products** (Flipkart catalog items) possess customer reviews! For these 143 products, two core modalities are actively available (`Reviews` and `Pricing`), so $\text{available\_modalities} = 2$.
3. **The 1,068 Truly Sparse Products:** Only **1,068 products** lack *both* images and reviews, leaving them with only a single modality (`Pricing`), so $\text{available\_modalities} = 1 < 2$.
4. **Conclusion:** The earlier narrative report inadvertently cited the total unimaged count ($1,211$) as sparse data. The programmatic assignment in `evidence_fusion.py` is mathematically correct: exactly **1,068 products** possess $< 2$ core modalities and are classified as `UNASSESSED_SPARSE_DATA`. The 143 review-bearing items are correctly evaluated on reviews and pricing.

---

## 3. Discrepancy 2: Image Duplicate Reconciliation (332 vs 323 vs 655)

### A. The Discrepancy
- **Earlier Narrative:** Stated `"655 exact duplicate file instances (332 duplicate groups)"`.
- **Targeted Audit Output:** Stated `"655 images across 323 duplicate hashes"`.
- **Question:** Are these conflicting definitions or a reporting inconsistency?

### B. Mathematical Reconciliation
An audit of all 4,708 usable images in [`derived_evidence/image_intelligence_features.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/derived_evidence/image_intelligence_features.parquet) establishes:

$$\text{Total Usable Images} = 4,708$$
$$\text{Unique SHA-256 Hashes} = 4,376$$
$$\text{Surplus Duplicate Instances} = 4,708 - 4,376 = \mathbf{332}$$
$$\text{Distinct Duplicate Hash Groups } (\text{count} > 1) = \mathbf{323}$$
$$\text{Total Images in Duplicate Groups } (\text{where } \text{is\_exact\_file\_duplicate} = \text{True}) = 323 + 332 = \mathbf{655}$$

### C. Definition Standard
To eliminate future reporting ambiguity:
1. **Distinct Duplicate Hash Groups ($323$):** The number of unique SHA-256 hash values that appear two or more times in the dataset.
2. **Surplus Duplicate Instances ($332$):** The number of duplicate image records beyond the primary canonical image of each group ($\text{Total Records} - \text{Unique Hashes} = 4,708 - 4,376 = 332$).
3. **Total Images in Duplicate Clusters ($655$):** The aggregate sum of all image records that share their hash with at least one other record ($323 \text{ primary images} + 332 \text{ surplus copies} = 655$).
4. **Resolution:** The earlier phrase `"332 duplicate groups"` was a typographical conflation of surplus instances ($332$) with hash groups ($323$). The true count of duplicate groups is **323**, containing **655 total images** with **332 redundant duplicate instances**.

---

## 4. Final Reconciled Record Counts for Dataset v1.5

| Data Category | Table / Entity | Exact Reconciled Count | Status |
| :--- | :--- | :--- | :--- |
| **Entities** | Canonical Products | **3,643** | 100% Verified Primary Keys |
| | Marketplace Listings | **3,643** | 1-to-1 Product Linkage |
| | Canonical Brands | **1,593** | 16 casing clusters unified; aliases registered |
| | Platform Sellers | **3** | Platform aggregate entities (`amazon_in`, `flipkart`, `myntra`) |
| | Factual Variants | **3,643** | Specifications extracted (`pattern`, `sleeve`, etc.) |
| | Platform Nodes | **3** | Normalized platform taxonomy |
| **Evidence** | Customer Reviews | **3,659** | 3,500 Flipkart, 159 Amazon India; 0 null text |
| | Physical Usable Images | **4,708** | 100% present on disk across 2,432 products |
| | Price Observations | **3,667** | Append-only normalized INR prices |
| | Physical OCR Evidence | **100** | Audited attempts (`BLOCKED_OFFLINE_DEPENDENCY_ABSENT`) |
| | Title-Token Packaging Proxy | **1,000** | Strictly isolated proxy records (`proxy_conf = 0.5`) |
| **Derived Features** | Review NLP Features | **3,659** | ABSA, sentiment, discordance, manipulation flags |
| | Review Duplicate Clusters | **143** | 108 short phrase clusters, 35 substantive clusters |
| | Image Intelligence Features | **4,708** | Dimensions, formats, SHA-256, dHash |
| | Image Similarity Pairs ($\cos \ge 0.90$) | **2,936** | 977 pairs at $\cos \ge 0.95$; 815 at $\cos \ge 0.98$ |
| | Visual Clusters ($\cos \ge 0.95$) | **694** | 660 isolated pairs (95.1%), 1 large 38-node cluster |
| | ResNet-18 Embeddings | **4,708 × 512** | Centered unit-normalized embeddings |
| | Multimodal Evidence Records | **5,618** | Atomic cross-modal observations |
| | Product Multimodal Summary | **3,643** | Reconciled 4-tier explainable assessment |
| **Risk Tiers** | `LOW_OBSERVED_ANOMALY` | **2,343 products (64.3%)** | Multimodal data present, 0 anomaly flags |
| | `UNASSESSED_SPARSE_DATA` | **1,068 products (29.3%)** | $< 2$ core modalities (Pricing only) |
| | `MODERATE_SINGLE_MODALITY_ANOMALY` | **232 products (6.4%)** | Exactly 1 active modality flag |
| | `ELEVATED_MULTIMODAL_ANOMALY` | **0 products (0.0%)** | $\ge 2$ corroborating multimodal flags |
| **Annotations** | Human Review Annotations | **100** | `TIER_2_PROVISIONAL_SINGLE_ANNOTATOR` |
| | Silver Review Pseudo-Labels | **600** | Isolated rule-based pretraining labels |
| | Queued Pending Tasks | **500** | Preserved in Parquet |
| | Active JSON Task Queue | **500 tasks** | Dual-annotator submission slots |
| | Image Annotations | **250** | Catalog image matching annotations |
| | Listing Annotations | **250** | Listing consistency and price corridor annotations |
| **Graph** | Entity Relationships | **30,229** | Typed graph edges connecting all entities |
| **Benchmarks** | Zero-Leakage Splits | **Train: 2,550** (70%), **Val: 546** (15%), **Test: 547** (15%) |

---

## 5. Automated Regression Verification

The targeted test suite was executed against the finalized v1.5 release:

```
tests/test_milestone3_4_multimodal.py:              18/18 PASSED (100% Green in 17.08s)
tests/test_milestone2_entities.py:                   6/6  PASSED (100% Green)
tests/test_indian_marketplace_dataset_v1_4.py:      22/22 PASSED (100% Green)
tests/test_indian_marketplace_dataset_v1_3.py:      25/25 PASSED (100% Green)
tests/test_indian_marketplace_dataset_v1_2.py:       9/9  PASSED (100% Green)
tests/test_indian_marketplace_dataset_v1_1.py:       9/9  PASSED (100% Green)
========================================================================
TOTAL MULTI-VERSION REGRESSION SUITE:               89/89 PASSED (100% Green)
```

---

## 6. Final Recommendation

### **CERTIFIED FOR RELEASE FREEZE: DATASET v1.5**

1. Both documentation discrepancies have been resolved with mathematical proofs and exact Parquet cross-tabulations.
2. The Zero Synthetic Fabrication Invariant has been strictly preserved across all 48 tables and files.
3. The Missing Modality Invariant is rigorously enforced (unreviewed and unimaged products receive zero trust penalties).
4. All 132 files in [`data/indian_marketplace_trust_dataset_v1_5/`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/) are hashed in `sha256_manifest.json` and `checksums.sha256`.

The dataset is certified as research-ready and recommended for release freeze.
