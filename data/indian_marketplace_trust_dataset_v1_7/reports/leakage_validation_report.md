# Milestone 2: Leakage-Safe Data Preparation & Validation Report
**Platform:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Dataset Release:** `v1.7` Certified Benchmark Splits  
**Date:** November 10, 2026

---

## 1. Executive Summary & Root Cause Audit

During the independent audit of legacy benchmark splits (`Indian_Marketplace_Multimodal_Trust_Benchmark_v1_4`), a critical data leakage vulnerability was identified:
- While product IDs and review duplicate clusters were disjoint, **identical and near-duplicate visual assets crossed split boundaries**:
  - 15 identical image SHA-256 hashes leaked between Train and Val.
  - 10 identical image SHA-256 hashes leaked between Train and Test.
  - 2 identical image SHA-256 hashes leaked between Val and Test.
  - 45 perceptual image dHash matches crossed split partitions.

### Remediation Executed
A multimodal connected components graph was constructed in `src/data/curation/split_generator.py` linking:
1. Canonical Product IDs
2. Parent-child variant hierarchies (`parent_product_id` and `canonical_product_id`)
3. Exact and near-duplicate review clusters (`duplicate_cluster_id`)
4. Exact image SHA-256 hash duplicates
5. Perceptual image dHash duplicates
6. High visual similarity pairs (ResNet-18 cosine similarity $\ge 0.95$)

---

## 2. Certified Split Specifications

The 3,643 catalog products were grouped into **3,397 independent connected components** (60 multi-product components and 3,337 singletons) and partitioned via deterministic greedy bin packing:

| Split Partition | Product Count | Share (%) | Visual Assets (Images) | Total Reviews | Price Observations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Train Split** | 2,550 | 70.00% | 3,308 | 2,569 | 2,567 |
| **Validation Split** | 546 | 14.99% | 698 | 545 | 550 |
| **Test Split** | 547 | 15.01% | 702 | 545 | 550 |
| **Total Benchmark** | **3,643** | **100.00%** | **4,708** | **3,659** | **3,667** |

---

## 3. Automated Leakage Invariant Verification

The automated test suite in `tests/test_leakage_safeguards.py` executed 7 rigorous assertions across all splits:

```bash
.venv\Scripts\python.exe -m pytest tests/test_leakage_safeguards.py -v
```

| Leakage Safeguard Test | Assertion Checked | Result | Leakage Count |
| :--- | :--- | :--- | :--- |
| `test_product_split_completeness_and_disjointness` | Train $\cap$ Val $\cap$ Test = $\emptyset$ | **PASSED** | **0** |
| `test_split_proportions` | 70 / 15 / 15 target ratios | **PASSED** | **0** |
| `test_zero_variant_hierarchy_leakage` | Variants of product stay together | **PASSED** | **0** |
| `test_zero_review_duplicate_cluster_leakage` | Identical reviews stay together | **PASSED** | **0** |
| `test_zero_image_sha256_leakage` | Exact SHA-256 images stay together | **PASSED** | **0** |
| `test_zero_image_dhash_leakage` | Perceptual dHash images stay together | **PASSED** | **0** |
| `test_zero_high_similarity_visual_pair_leakage` | Image pairs with $\cos \ge 0.95$ stay together | **PASSED** | **0** |

**Zero data leakage is certified across all modalities.**
