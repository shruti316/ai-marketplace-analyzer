# Independent Ground-Truth Evaluation & Adjudication Pipeline Report

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Target Marketplaces:** Amazon India, Flipkart, Myntra  
**Date:** November 11, 2026  
**Artifact Path:** `reports/final_ml_readiness/INDEPENDENT_GROUND_TRUTH_VALIDATION_REPORT.md`  
**Milestone:** Master Final ML Readiness — Workstream 1  
**Status:** INGESTION PIPELINE IMPLEMENTED & CERTIFIED; PROSPECTIVE BENCHMARK HONESTLY GATED AS `BLOCKED_BY_DATA_AVAILABILITY`  

---

## 1. Executive Summary & Problem Context

The core scientific vulnerability identified in our previous audits is that the supervision target $y \in \{0, 1\}$ (`overall_risk_tier == "ELEVATED_MULTIMODAL_ANOMALY"`) is an internally generated, rule-based proxy constructed by the fusion engine.

While this target allows us to prove that the Random Forest Gated Fusion model successfully learns and reconstructs the multi-modal policy boundary with high fidelity (ROC-AUC $0.9990$, PR-AUC $0.9806$), **it does not constitute an independent validation of real-world counterfeit or fraud detection**.

In accordance with **Rule 1 (No false claims of fraud detection)** and **Rule 4 (No fabricated data or metrics)**:
1. We performed an exhaustive audit of all existing annotation repositories in the codebase.
2. We verified that **zero independently verified human ground-truth labels exist** in the historical crawl datasets.
3. We engineered the complete software infrastructure for multi-annotator ingestion, agreement calculation, and expert adjudication (`src/data/ground_truth_pipeline.py`).
4. We formally declared that prospective model evaluation on the 1,500-sample cohort is **`BLOCKED_BY_DATA_AVAILABILITY`** until human domain experts annotate listings in Phase 3.

---

## 2. Exhaustive Audit of Existing Annotation Artifacts

An empirical inspection of all files in `data/annotation/` yielded the following findings:

| Artifact Path | Format | Total Records | Non-Null Verified Labels | Definitive Ground Truth? | Operational Finding |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `data/annotation/cv_manual_evaluation_50.csv` | CSV | 50 | **0** | `False` | Empty review template for visual pairs; no manual annotations populated. |
| `data/annotation/human_annotation_sample_template.csv` | CSV | 50 | **0** | `False` | Multi-annotator template for reviews; `adjudicated_label` is 100% null. |
| `data/annotation/sample_adjudicated_research_annotations.parquet` | Parquet | 30 | 30 | **`False`** (`is_definitive_ground_truth: False`) | Synthetic research pilot from early milestone; explicitly flagged as non-ground-truth. |

### Conclusion of Audit:
There are **zero verified human ground-truth labels** in the existing repository. Any report claiming empirical real-world counterfeit detection accuracy from this static catalog would be scientifically fraudulent.

---

## 3. The 6-Tier Ground-Truth Taxonomy

To prevent multi-faceted marketplace issues from being forced into a simplistic binary label, the ingestion pipeline enforces a 6-tier classification rubric:

```
                          ┌───────────────────────────┐
                          │   PROSPECTIVE LISTING     │
                          └─────────────┬─────────────┘
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           ▼                            ▼                            ▼
    ┌──────────────┐             ┌──────────────┐             ┌──────────────┐
    │  AUTHENTIC   │             │ UNAUTHORIZED │             │  SUSPECTED   │
    │              │             │ STOCK PHOTO  │             │   KNOCKOFF   │
    │ Genuine OEM  │             │ Genuine item │             │ Counterfeit, │
    │ goods with   │             │ using shared │             │ replica, or  │
    │ accurate     │             │ manufacturer │             │ deceptive    │
    │ catalog data │             │ hero images. │             │ look-alike.  │
    └──────────────┘             └──────────────┘             └──────────────┘
           │                            │                            │
           └────────────────────────────┼────────────────────────────┘
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           ▼                            ▼                            ▼
    ┌──────────────┐             ┌──────────────┐             ┌──────────────┐
    │  PACKAGING   │             │SPECIFICATION │             │ INCONCLUSIVE │
    │  VIOLATION   │             │   MISMATCH   │             │              │
    │ Tampered MRP,│             │ Technical    │             │ Insufficient │
    │ net quantity,│             │ specs differ │             │ evidence to  │
    │ or batch code│             │ from item.   │             │ assign label │
    └──────────────┘             └──────────────┘             └──────────────┘
```

1. **`AUTHENTIC`**: Genuine manufacturer goods matching digital specifications.
2. **`UNAUTHORIZED_STOCK_PHOTO`**: Authentic physical product where seller used unauthorized stock hero imagery (catalog compliance defect, not counterfeit fraud).
3. **`SUSPECTED_KNOCKOFF`**: Deceptive clone, trademark infringement, or physical replica.
4. **`PACKAGING_VIOLATION`**: Legal Metrology violation (selling price exceeds declared packaging MRP, tampered batch code, missing net quantity).
5. **`SPECIFICATION_MISMATCH`**: Delivered item does not match listing specifications.
6. **`INCONCLUSIVE`**: Disputed case or ambiguous evidence where consensus cannot be established.

---

## 4. Multi-Rater Agreement & Adjudication Protocol

The pipeline implements statistical agreement metrics:

### 4.1 Cohen's Kappa ($\kappa$) for Pairwise Rater Review
$$\kappa = \frac{p_o - p_e}{1 - p_e}$$
- $p_o$: Observed relative agreement between Annotator 1 and Annotator 2.
- $p_e$: Hypothetical probability of chance agreement based on marginal frequencies.

### 4.2 Fleiss' Kappa ($\kappa_{\text{Fleiss}}$) for Multi-Rater Review ($k \ge 3$)
For $N$ subjects and $k$ categories rated by $n$ annotators:
$$\kappa_{\text{Fleiss}} = \frac{\bar{P} - \bar{P}_e}{1 - \bar{P}_e}$$

### 4.3 Strength Classification (Landis & Koch):
- $\kappa \ge 0.80$: **`NEAR_PERFECT`** $\to$ Batch certified for evaluation.
- $0.60 \le \kappa < 0.80$: **`SUBSTANTIAL`** $\to$ Minor tie-breaker adjudication required.
- $0.40 \le \kappa < 0.60$: **`MODERATE`** $\to$ Rubric recalibration required.
- $\kappa < 0.40$: **`POOR / FAIR`** $\to$ Batch rejected.

---

## 5. Automated Pipeline Verification

The pipeline implementation in [`src/data/ground_truth_pipeline.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/data/ground_truth_pipeline.py) was verified via automated tests:

1. **Fleiss' Kappa Calculation:** Verified across multi-annotator matrices.
2. **Pairwise Agreement & Landis-Koch Classification:** Verified across synthetic evaluation records.
3. **File Ingestion Gating:** Verified that unannotated templates in `data/annotation/` return:
   ```json
   {
     "status": "INGESTED",
     "is_definitive_ground_truth": false,
     "evaluation_status": "BLOCKED_BY_DATA_AVAILABILITY"
   }
   ```

---

## 6. Official Status & Phase 3 Transition Gate

| Evaluation Dimension | Required Condition | Actual Verified Status | Final Decision |
| :--- | :--- | :---: | :---: |
| **Annotation Schema** | Strongly-typed 6-tier taxonomy | Functional | **`PASSED`** |
| **Agreement Pipeline** | Cohen's & Fleiss' Kappa implementation | Functional | **`PASSED`** |
| **Historical Data Audit**| Determine if verified ground truth exists | 0 verified records found | **`PASSED`** |
| **Prospective Evaluation**| Execute 1,500-sample human evaluation | Awaiting Phase 3 annotators | **`BLOCKED_BY_DATA_AVAILABILITY`** |

> [!NOTE]
> This gate is cleanly resolved: The software pipeline is complete and integration-ready. Prospective evaluation will occur as an operational capability in Phase 3 without requiring modifications to the ML core.
