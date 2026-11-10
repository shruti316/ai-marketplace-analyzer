# Annotation Sampling Strategy & Queue Allocation

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Document:** `annotation_sampling_strategy.md`  
**Target Queue:** 100 Gold Re-annotation Queue + 500 Pending Annotation Tasks  
**Version:** 2.0.0  

---

## 1. Executive Allocation Overview

The platform currently possesses two annotation queues:
1. **The 100 Gold Re-Audit Queue:** The original 100 provisional reviews that exhibited 100% rating selection bias (all genuine $\ge 3$ stars, all suspicious $\le 2$ stars). These must be re-annotated from scratch under double-blind conditions.
2. **The 500 Pending Tasks Queue (`human_annotation_pending_tasks.parquet`):** A cohort of unannotated customer reviews from Flipkart, Amazon India, and Myntra.

A naive random sample would heavily over-represent easy, generic 5-star positive reviews. To build a scientifically robust benchmark, we implement a **stratified, adversarial sampling strategy**.

---

## 2. Five-Stratum Sampling Matrix for the 500 Pending Tasks

| Stratum Code | Stratum Name | Sampling Objective | Filter Criteria | Target Allocation | Rationale |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **STRATUM-1** | **Genuine Critical Reviews** | Break the rating-deception conflation. | Rating $\in \{1.0, 2.0\}$, Length $> 100$ chars, Organic ABSA tokens. | **150 tasks (30%)** | Forces annotators and models to recognize genuine customer dissatisfaction. |
| **STRATUM-2** | **Suspicious 5-Star Praise** | Break the rating-authenticity conflation. | Rating $= 5.0$, Levenshtein duplicate or short generic text ($< 25$ chars). | **125 tasks (25%)** | Forces identification of review spam disguised as high praise. |
| **STRATUM-3** | **Duplicate & Cluster Flood** | Benchmark cross-catalog syndication. | In duplicate cluster (`duplicate_cluster_id.notna()`). | **100 tasks (20%)** | Evaluates bot-farming and syndicated promotional campaigns. |
| **STRATUM-4** | **Rating-Text Discordance** | Benchmark subtle sarcasm and contradiction. | High rating-sentiment discordance ($|R_{\text{norm}} - S| > 0.6$). | **75 tasks (15%)** | Tests ABSA discordance resolution. |
| **STRATUM-5** | **Cross-Category Representative Baseline** | Maintain catalog-wide distribution. | Uniform random sample stratified across Electronics, Beauty, Fashion. | **50 tasks (10%)** | Maintains background prior distribution. |
| **TOTAL** | — | — | — | **500 tasks (100%)** | Balanced, challenging benchmark. |

---

## 3. Platform and Category Coverage Invariant

To ensure the Indian e-commerce context is faithfully captured:
1. **Marketplace Distribution:**
   - Flipkart: Minimum 45% of tasks.
   - Amazon India: Minimum 45% of tasks.
   - Myntra: Remaining 10% of tasks (primarily fashion reviews).
2. **Category Balance:** Minimum 80 tasks each in Consumer Electronics, Personal Care / Beauty, and Apparel / Fashion.

---

## 4. Re-Audit Strategy for the 100 Historical Gold Reviews

To preserve historical audit integrity while enabling defensible scientific benchmarking:
1. The historical file [`review_human_annotations.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_7/annotations/review_human_annotations.parquet) is preserved **strictly untouched**.
2. A separate blinded evaluation queue is generated:
   - All historical labels (`authenticity_label`), rationales, and annotator IDs are stripped.
   - Two independent annotators (`Annotator_A` and `Annotator_B`) will evaluate all 100 reviews afresh under the v2.0 guidelines.
   - An adjudication report will contrast the old vs. new label distribution.
