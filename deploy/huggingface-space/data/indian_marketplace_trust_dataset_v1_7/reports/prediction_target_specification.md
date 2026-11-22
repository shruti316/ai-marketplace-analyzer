# Milestone 1: Prediction Target & Annotation Specification
**Platform:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Date:** November 10, 2026

---

## 1. Prediction Units & Hierarchical Target Architecture

To eliminate ambiguity between product, listing, seller, and atomic evidence units, the platform defines the following prediction hierarchy:

```
┌─────────────────────────────────────────────────────────────┐
│ Prediction Unit: Canonical Product (Primary Decision Unit)   │
│ Target: Product Trust Risk Tier                            │
│ Classes: UNASSESSED_SPARSE_DATA, LOW_OBSERVED_ANOMALY,     │
│          MODERATE_SINGLE_MODALITY_ANOMALY,                  │
│          ELEVATED_MULTIMODAL_ANOMALY                        │
└──────────────────────────────┬──────────────────────────────┘
                               │ Aggregates
┌──────────────────────────────▼──────────────────────────────┐
│ Prediction Unit: Marketplace Listing                        │
│ Target: Listing Integrity Status                           │
│ Classes: VERIFIED_OFFER, CATALOG_DISCORDANT, PRICING_DEFECT │
└──────────────────────────────┬──────────────────────────────┘
                               │ Evaluates
┌──────────────────────────────▼──────────────────────────────┐
│ Atomic Evidence Modalities:                                 │
│ 1. Review: Review Authenticity (GENUINE vs INAUTHENTIC)    │
│ 2. Image: Visual Reuse Status (HERO vs REUSED vs ANOMALY)   │
│ 3. Price: Price Corridor Status (IN_CORRIDOR vs OUTLIER)    │
│ 4. Seller: Fulfillment Reliability (AGGREGATE_RETAIL)       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Definition of Prediction Outcomes

1. **Legitimate (`LOW_OBSERVED_ANOMALY`):**
   - $\ge 2$ core modalities observed with active evidence.
   - Selling price strictly within the brand and category benchmark corridor ($[Q_1 - 1.5 \times \text{IQR}, Q_3 + 1.5 \times \text{IQR}]$).
   - Images verified original or legitimate manufacturer hero photos.
   - Reviews show organic text distribution with zero coordinated duplication.
2. **Suspicious (`ELEVATED_MULTIMODAL_ANOMALY`):**
   - Independent anomalous signals corroborated across $\ge 2$ distinct modalities.
   - Example: Extreme discount outlier corroborated by lexical review duplication or unverified cross-product image recycling.
3. **Uncertain (`MODERATE_SINGLE_MODALITY_ANOMALY`):**
   - Anomaly flag present in exactly one modality with zero cross-modal corroboration.
   - Example: Price corridor outlier with organic reviews and unique product image. Flagged for manual review, not labeled fraudulent.
4. **Insufficient Evidence (`UNASSESSED_SPARSE_DATA`):**
   - Product has $< 2$ core modalities available (e.g. image only, no reviews, no pricing benchmarks).
   - Protected by the Zero-Penalty Invariant.

---

## 3. Human Annotation Guidelines (Protocol v1.0)

For ongoing human annotation of reviews (`human_annotation_pending_tasks.parquet`):

### Guideline 1: Review Deception Rubric
- **GENUINE (Score 1):** Mentions specific product usage attributes, material defects, delivery timelines, or detailed unboxing experiences consistent with the rating.
- **SUSPICIOUS (Score 2):** Generic repetitive praises ("best product in the world buy now"), high rating with negative text without explanation, or extreme superlatives lacking product specifics.
- **DECEPTIVE (Score 3):** Explicit mention of receiving incentives, cashback offers in exchange for 5-star ratings, or verbatim identical text found across unrelated products.

### Guideline 2: Adjudication Protocol
- Each review task must be assigned to two independent annotators.
- If annotators disagree, a senior ML auditor performs final tie-breaking adjudication.
- Agreement must achieve Cohen's Kappa $\kappa \ge 0.70$ before promoting records to Tier 1 gold ground truth.
