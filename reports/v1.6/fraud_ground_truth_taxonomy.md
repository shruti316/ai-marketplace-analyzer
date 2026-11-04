# Marketplace Fraud Ground Truth Taxonomy & Weak Supervision Report (v1.6)

**Project:** AI-Powered Marketplace Trust Intelligence Platform  
**Milestone:** Release v1.6  
**Author:** Lead Evaluation Auditor & ML Security Specialist  
**Status:** Certified Architecture  

---

## 1. Executive Summary

In Release v1.6, we formalize the **7-Tier Marketplace Fraud Label Taxonomy** and programmatic weak supervision framework. 

A central risk in machine learning for trust intelligence is label leakage and data fabrication, where heuristic anomalies (such as an unusual price discount or duplicate review snippet) are falsely asserted as "confirmed fraud." The v1.6 taxonomy establishes clear boundaries between verified academic ground truth, statistical anomalies, heuristic weak labels, and unverified in-the-wild marketplace data.

---

## 2. The 7-Tier Label Taxonomy

| Tier Code | Label Tier Name | Definition & Evidence Requirements | Examples / Data Origin |
| :--- | :--- | :--- | :--- |
| **Tier 1** | `CONFIRMED_FRAUD` | Verified fraudulent review/product confirmed by human domain audit, undercover sting, or gold-standard academic benchmarks. | Ott et al. crowdsourced deceptive reviews (isolated benchmark). |
| **Tier 2** | `CONFIRMED_POLICY_VIOLATION` | Verified terms-of-service violation without legal fraud finding (e.g. undisclosed incentivized review, seller review swap). | Amazon TOS enforcement benchmark cases. |
| **Tier 3** | `CONFIRMED_AUTHENTIC` | Verified authentic human purchase from verified control sets. | Ott et al. verified customer reviews (isolated control benchmark). |
| **Tier 4** | `SUSPECTED_ANOMALY` | Statistical outlier or abnormal pattern exceeding behavioral thresholds (NOT confirmed fraud). | Products with price robust z-score > 3.0 or extreme review burst. |
| **Tier 5** | `WEAK_LABEL` | Programmatic label generated via deterministic labeling functions (LFs) with explicit rule tracking. | Exact duplicate text across multiple listings (`WEAK_LABEL_SUSPICIOUS`). |
| **Tier 6** | `UNLABELED` | In-the-wild marketplace review/product with no ground truth or rule trigger. | Standard crawled customer reviews (31,059 reviews). |
| **Tier 7** | `UNKNOWN` | Conflicting or insufficient metadata. | Incomplete crawl records / corrupt fields. |

---

## 3. Strict Academic Benchmark Isolation

To eliminate evaluation leakage and target circularity:
1. Academic benchmark corpora (Ott Deceptive Reviews, Kaggle Fake Reviews Benchmark) are stored exclusively in:
   `data/marketplace_trust_dataset_v1.6/collections/isolated_benchmarks/`
2. In-the-wild marketplace reviews (`evidence/reviews.parquet`) are **never mixed** with isolated benchmark ground truth.
3. Training splits for marketplace trust models strictly exclude benchmark rows.

---

## 4. Programmatic Weak Supervision Results (v1.6)

Across the 56,697 marketplace reviews in `data/processed_v1_6/fraud_taxonomy_annotations_v1_6.parquet`:

| Taxonomy Label | Count | Percentage | Primary Labeling Rule |
| :--- | :--- | :--- | :--- |
| `UNLABELED` | 31,059 | 54.78% | Baseline organic customer reviews (no heuristic trigger). |
| `WEAK_LABEL_SUSPICIOUS` | 22,105 | 38.99% | `LF_EXACT_DUPLICATE_TEXT` (text shared across multiple records). |
| `WEAK_LABEL_PROMOTIONAL_SUSPECT` | 3,276 | 5.78% | `LF_UNVERIFIED_PURCHASE_HIGH_RATING` (unverified 5-star short review). |
| `WEAK_LABEL_LOW_EFFORT` | 257 | 0.45% | `LF_EXTREME_RATING_SHORT_TEXT` (<= 2 words with 1-star or 5-star). |
| **Total** | **56,697** | **100.00%** | All 5 Review Platforms |

---

## 5. Certification Guarantee
- Zero marketplace reviews have been labeled as `CONFIRMED_FRAUD`.
- All automated weak labels are tagged with their rule provenance and confidence scores.
- Zero circular training: weak labels are not used as targets for models that evaluate those same features.
