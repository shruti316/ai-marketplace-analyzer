# Independent Ground-Truth Evaluation Plan & Adjudication Protocol

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Target Marketplaces:** Amazon India, Flipkart, Myntra  
**Date:** November 11, 2026  
**Artifact Path:** `reports/vision_v1_1_hardening/GROUND_TRUTH_EVALUATION_PLAN.md`  
**Milestone:** V1.1 Hardening & Evidence Integrity — Workstream 7  
**Status:** PROTOCOL FORMALIZED & SCHEMA IMPLEMENTED  

---

## 1. Executive Summary & Scientific Motivation

The definitive audit of our supervision target (`reports/final_acceptance/TARGET_PROVENANCE_AND_LEAKAGE_REPORT.md`) demonstrated that the label `overall_risk_tier == "ELEVATED_MULTIMODAL_ANOMALY"` ($N_{\text{pos}} = 154$, $N_{\text{neg}} = 3,489$) is a **deterministic heuristic proxy constructed by the fusion engine**, not an independently verified ground-truth label of e-commerce fraud or counterfeit goods.

While this proxy is scientifically valid for certifying Target Rule Reconstruction Fidelity ($F_1 = 0.98$), it **cannot prove real-world counterfeit detection efficacy** in prospective marketplace deployment.

To transition the platform from heuristic proxy reconstruction to validated real-world trust intelligence, we have formalized the **Independent Ground-Truth Evaluation Plan**. This plan provides:
1. A strongly-typed 5-tier classification taxonomy.
2. A double-blind multi-annotator review protocol with Cohen's Kappa agreement gates.
3. A stratified sampling methodology across Amazon India, Flipkart, and Myntra ($N = 1,500$ prospective listings).
4. Code artifacts implemented in `src/data/ground_truth_schema.py`.

> [!IMPORTANT]
> **Strict Anti-Fabrication Principle:** This plan formalizes the evaluation schema, adjudication contracts, and sampling rubric. In adherence to scientific ethics, **no synthetic or simulated ground-truth labels have been manufactured**. Prospective labeling will be conducted by qualified human domain experts in Phase 3+.

---

## 2. 5-Tier Human Ground-Truth Classification Taxonomy

Instead of a binary "fraud / not fraud" oversimplification, the evaluation protocol establishes a 5-tier taxonomy reflecting the nuanced realities of Indian marketplace commerce:

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
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
                  ┌──────────────┐              ┌──────────────┐
                  │  PACKAGING   │              │SPECIFICATION │
                  │  VIOLATION   │              │   MISMATCH   │
                  │ Tampered MRP,│              │ Technical    │
                  │ net quantity,│              │ specs differ │
                  │ or batch code│              │ from item.   │
                  └──────────────┘              └──────────────┘
```

### Detailed Taxonomy Criteria:

1. **`AUTHENTIC`**:
   - The listing offers genuine OEM merchandise from an authorized distribution channel.
   - Images represent the physical product; price is consistent with MRP and category norms; reviews reflect organic customer feedback.
2. **`UNAUTHORIZED_STOCK_PHOTO`**:
   - The underlying physical goods are genuine, but the seller uses unapproved, recycled, or generic stock hero photography from another brand or product.
   - Crucial distinction: Constitutes catalog policy non-compliance, but **not** consumer counterfeit fraud.
3. **`SUSPECTED_KNOCKOFF`**:
   - Deceptive replica, trademark infringement, or unauthorized clone ("first copy", cloned packaging font, deceptive logo variant).
4. **`PACKAGING_VIOLATION`**:
   - Legal Metrology Act violation: selling price exceeds physical packaging MRP, declared net quantity differs from physical delivery, or missing manufacturing/batch codes.
5. **`SPECIFICATION_MISMATCH`**:
   - Product delivered does not match digital listing attributes (e.g. 64GB storage delivered vs 128GB advertised, polyester delivered vs cotton advertised).

---

## 3. Double-Blind Adjudication Protocol

To eliminate subjective cognitive bias, the annotation workflow enforces a rigorous double-blind adjudication protocol implemented in `src/data/ground_truth_schema.py`:

```
[Listing Sample: Images, Metadata, Reviews, Physical Inspection]
                      │
           ┌──────────┴──────────┐
           ▼                     ▼
     [Annotator 1]         [Annotator 2]
     Blind Review          Blind Review
     Label + Conf (1-5)    Label + Conf (1-5)
           │                     │
           └──────────┬──────────┘
                      ▼
            [Consensus Evaluator]
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
   [Labels Match?]          [Labels Differ?]
   Status: DOUBLE_BLIND           │
   AGREEMENT                      ▼
   Consensus Confirmed     [Senior Expert Adjudicator]
                           Independent 3rd Review
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
            [Matches Rater 1 or 2]       [3-Way Disagreement]
            Status: RESOLVED_BY_EXPERT   Status: UNRESOLVED_AMBIGUITY
            Consensus = Expert Label     Sample Discarded
```

### Agreement Metric: Cohen's Kappa ($\kappa$)
Inter-rater reliability is measured across raters using Cohen's Kappa:
$$\kappa = \frac{p_o - p_e}{1 - p_e}$$
- $\kappa \ge 0.80$: Substantial to near-perfect agreement (adjudication batch certified).
- $0.60 \le \kappa < 0.80$: Moderate agreement (requires rubric calibration).
- $\kappa < 0.60$: Insufficient agreement (batch rejected; annotators retrained).

---

## 4. Stratified Prospective Sampling Plan

For the Phase 3 evaluation cohort, $N = 1,500$ prospective listings will be sampled according to a balanced 3-marketplace, 5-category design:

| Marketplace | Target Sample Size | High-Risk Categories | Baseline Stratification |
| :--- | :---: | :--- | :--- |
| **Amazon India** | 500 listings | Electronics, Beauty, Footwear, Grocery, Apparel | 200 high-discount ($> 40\%$), 200 median ($10-30\%$), 100 OEM |
| **Flipkart** | 500 listings | Electronics, Fast-Fashion, Home, Footwear, Personal Care | 250 promotional ($> 50\%$), 150 standard ($20-40\%$), 100 OEM |
| **Myntra** | 500 listings | Designer Wear, Athleisure, Cosmetics, Accessories, Footwear | 250 clearance ($> 60\%$), 150 seasonal ($30-50\%$), 100 Premium |
| **TOTAL** | **1,500 listings** | **All Core Indian Marketplace Sectors** | **Balanced across risk bands** |

---

## 5. Software Implementation & Contracts

The data structures and protocol methods are implemented and tested in:
- `src/data/ground_truth_schema.py`:
  - `GroundTruthTaxonomy(str, Enum)`
  - `AdjudicationStatus(str, Enum)`
  - `DoubleBlindAnnotationRecord` (dataclass)
  - `GroundTruthAdjudicationProtocol.adjudicate_record`
  - `GroundTruthAdjudicationProtocol.compute_cohens_kappa`
- `tests/test_vision_v1_1_hardening.py::test_double_blind_ground_truth_protocol`: **PASSED**.

---

## 6. Prospective Timeline for Phase 3 Execution

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      GROUND-TRUTH EXECUTION ROADMAP                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  Phase 3a (Weeks 1-2): Tooling & UI Integration                             │
│    - Integrate double-blind annotation interface in React admin console.     │
│    - Deploy ground-truth ingestion endpoints in Node.js backend.             │
│  Phase 3b (Weeks 3-6): Annotator Onboarding & Pilot Batch                   │
│    - Train 4 independent domain annotators on Indian Metrology rules.       │
│    - Run pilot cohort of 100 listings; verify Cohen's kappa >= 0.80.         │
│  Phase 3c (Weeks 7-10): Complete 1,500 Listing Collection & Adjudication    │
│    - Double-blind annotation across Amazon India, Flipkart, and Myntra.     │
│    - Expert adjudication of disagreements.                                  │
│  Phase 3d (Weeks 11-12): Prospective Model Benchmark & Fine-Tuning          │
│    - Benchmark frozen ML V1.0 and V1.1 against validated gold labels.       │
│    - Calibrate production threshold curves.                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```
