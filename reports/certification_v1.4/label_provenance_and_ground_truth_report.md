# Workstream G: Label Provenance, Ground Truth & Weak Supervision

## 1. Label Stratification Architecture
To avoid the fatal mistake of conflating heuristic rules with verified truth, v1.4 enforces strict label provenance:

```
[Level 1: Gold Standard Ground Truth]
  - Ott Deceptive Opinion Spam (1,600 reviews; verified psycholinguistic lab truth)
  - Synthetic Stress Cases (5 hand-crafted adversarial edge cases)

[Level 2: Silver Standard Heuristic Labels]
  - E-Commerce Fake Reviews Dataset (40,526 computer-generated / suspicious reviews)
  - Rating discordance / extreme sentiment inversion signals

[Level 3: Bronze Standard Unsupervised Signals]
  - Cross-modal evidence anomalies (1,889 records in derived_evidence)
  - Isolation Forest price anomalies (258 records)
  - Perceptual dHash near-duplicate visual clusters (60 clusters)
```

## 2. Weak Supervision Integrity
- Production models must not treat Bronze unsupervised signals as binary training ground truth.
- Heuristic features are stored as continuous evidence scores in `derived_evidence/` to facilitate future Snorkel / programmatic labeling.
