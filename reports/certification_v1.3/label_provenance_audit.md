# Label Taxonomy and Provenance Audit (v1.2)

## 1. Formal 8-Class Trust Label Taxonomy

| Label Class | Ground Truth? | Current Count | Evidence Type & Role |
| :--- | :---: | :---: | :--- |
| `VERIFIED_FRAUDULENT` | True | 0 | Enforcement records / legal outcome (0 in raw crawl) |
| `VERIFIED_LEGITIMATE` | True | 249 | BestBuy 1P authorized retail store listings |
| `BENCHMARK_LABELLED_DECEPTIVE` | True | 800 | Ott et al. ACL 2011 crowdsourced deceptive reviews (Tier C) |
| `COMPUTER_GENERATED_REVIEW` | True | 20,263 | Synthetic NLP fake reviews benchmark (Tier C) |
| `ORGANIC_REVIEW` | True | 21,063 | Truthful human control reviews from benchmarks (Tier C) |
| `HEURISTIC_SUSPICIOUS_SIGNAL` | False | 1,889 | Cross-modal investigation signals (rating mismatch, reuse) |
| `SYNTHETIC_STRESS_TEST_CASE` | False | 5 | Hand-crafted adversarial edge cases (Tier C) |
| `UNVERIFIED` | False | 56,697 | Standard real-world e-commerce customer reviews |
