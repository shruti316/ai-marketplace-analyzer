# Non-Vision ML Components Final Acceptance Report: NLP, Pricing & Graph

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Target Marketplaces:** Amazon India, Flipkart, Myntra  
**Date:** November 11, 2026  
**Artifact Path:** `reports/final_acceptance/ML_COMPONENT_ACCEPTANCE_REPORT.md`  
**Status:** ALL COMPONENTS AUDITED, SCIENTIFICALLY CONSTRAINED & ACCEPTED  

---

## 1. Executive Summary

This report delivers the final engineering and scientific acceptance audit for the non-vision modalities of the platform: Review NLP, Statistical Pricing Intelligence, and Relationship Graph Intelligence.

All components have been verified for honest methodology:
- Gold Review Classifier remains quarantined pending independent human annotations.
- Review ABSA is explicitly documented as lexical aspect extraction, not a deep transformer model.
- Pricing intelligence is recognized as single-snapshot cross-sectional dispersion, not longitudinal velocity.
- Graph topology is acknowledged as entity co-occurrence, not individual merchant conspiracy.

---

## 2. Review NLP & Text Intelligence Acceptance

```
┌─────────────────────────────────┬─────────────────────┬────────────────────────────────┐
│ Component                       │ Current Status      │ Scientific Governance Verdict  │
├─────────────────────────────────┼─────────────────────┼────────────────────────────────┤
│ Silver NLP Review Classifier    │ Operational (v1.6)  │ ACCEPTED for heuristic ranking │
│ Gold Deep Transformer Classifier│ Formally Quarantined│ QUARANTINED (Zero leak-free GT)│
│ Exact Review De-duplication     │ MD5 / SHA-256 Hashing│ ACCEPTED (100% deterministic)  │
│ Near-Duplicate Review Detection │ Jaccard n-gram Sim  │ ACCEPTED (Cutoff >= 0.85)      │
│ Hinglish Lexicon Normalizer     │ Rule-based Dictionary│ ACCEPTED for Indian colloquial │
│ Lexical ABSA Aspect Extractor   │ Keyword Seed Dict   │ ACCEPTED (Documented as Lexical│
│ Zero-Penalty Missing Reviews    │ Status = UNAVAILABLE│ 100% compliant (0 risk points) │
└─────────────────────────────────┴─────────────────────┴────────────────────────────────┘
```

### Scientific Safeguards
1. **Gold Classifier Quarantine:** The Gold review classifier was trained on weak pseudolabels. As established in Phase 1, it remains **strictly quarantined** from the production pipeline until double-blind human adjudication data is collected.
2. **Lexical ABSA Acknowledgment:** Aspect sentiment analysis relies on a domain-specific Indian e-commerce lexicon (`src/nlp/`). It is honestly documented as rule-assisted lexical matching rather than end-to-end BERT.

---

## 3. Statistical Pricing Intelligence Acceptance

```
┌─────────────────────────────────┬─────────────────────┬────────────────────────────────┐
│ Component                       │ Current Status      │ Scientific Governance Verdict  │
├─────────────────────────────────┼─────────────────────┼────────────────────────────────┤
│ Median & MAD Estimation         │ Category & Subcat   │ ACCEPTED (Robust to outliers)  │
│ Robust Z-Score Calculation      │ z = (P - Med) / MAD │ ACCEPTED (Capped at [-5, 5])   │
│ Identical Price Corridor        │ Min corridor = 10%  │ ACCEPTED (Prevents div-by-zero)│
│ MRP Consistency Verification    │ Observed <= MRP     │ ACCEPTED (Flags selling > MRP) │
│ Single-Snapshot Limitation      │ Point-in-time crawl │ Explicitly documented limitation│
└─────────────────────────────────┴─────────────────────┴────────────────────────────────┘
```

### Scientific Safeguards
1. **Single-Snapshot Limitation:** The current catalog crawl represents a cross-sectional snapshot. The platform does not claim historical price velocity or dynamic surge pricing fraud.
2. **Corridor Protection:** In subcategories where all observed items share an identical price (MAD = 0), the engine enforces an empirical minimum corridor width ($10\%$ of median) to prevent mathematical instability.

---

## 4. Relationship Graph Intelligence Acceptance

```
┌─────────────────────────────────┬─────────────────────┬────────────────────────────────┐
│ Component                       │ Current Status      │ Scientific Governance Verdict  │
├─────────────────────────────────┼─────────────────────┼────────────────────────────────┤
│ Entity Relationship Graph       │ 41,372 Bipartite    │ ACCEPTED for co-occurrence     │
│ Degree Centrality & PageRank    │ NetworkX α=0.85     │ ACCEPTED                       │
│ Shared Image Edges              │ Pairwise Hash Links │ ACCEPTED (Explains 88.96% proxy│
│ Merchant Tax ID Absence         │ Omitted upstream    │ Honest null modeling enforced  │
└─────────────────────────────────┴─────────────────────┴────────────────────────────────┘
```

### Scientific Safeguards
1. **No Merchant Conspiracy Claims:** Because upstream marketplace crawls did not expose merchant GSTIN/PAN tax identifiers, graph connections between listings do **not** assert criminal merchant collusion.
2. **Topological Feature Decoupling:** In the Target Provenance audit, we established that shared image edges in the graph mirror the visual reuse flag in Image CV. The system documents this structural coupling transparently.
