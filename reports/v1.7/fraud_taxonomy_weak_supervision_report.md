# Ten-Tier Fraud Taxonomy & Weak Supervision Report — v1.7
## Marketplace Trust Intelligence Platform

**Execution Timestamp:** 2026-11-04  
**Total Reviews Annotated:** 56,697  
**Total Products Annotated:** 6,043  

---

### 1. Ten-Tier Formal Taxonomy Definitions

| Tier ID | Taxonomy Category | Operational Definition | Supervised Ground Truth Status |
|:---:|---|---|:---:|
| **1** | `CONFIRMED_FRAUD` | Adjudicated illegal/fraudulent listing or review by external authority | **0 (No external labels)** |
| **2** | `SUSPECTED_MANIPULATION` | Multi-modal convergence of suspicious behavioral signals | Programmatic Weak Label |
| **3** | `SUSPICIOUS_REVIEW_PATTERN` | Rating-sentiment discordance, unnatural review bursts | Programmatic Weak Label |
| **4** | `DUPLICATE_REVIEW_SIGNAL` | Boilerplate / template text repeated >= 5 times across corpus | Programmatic Weak Label |
| **5** | `REVIEW_QUALITY_ANOMALY` | Extreme shouting syntax, single-word fragments | Programmatic Weak Label |
| **6** | `PRICE_ANOMALY` | MAD z-score outlier (|z| > 3.5), negative discount, deep plunge | Programmatic Weak Label |
| **7** | `IMAGE_MISMATCH_SIGNAL` | Low resolution (<200px), extreme aspect ratio (<0.5 or >2.0) | Programmatic Weak Label |
| **8** | `SELLER_RISK_SIGNAL` | Disreputable seller registration (Awaiting 3rd-party seller data) | Inactive (Platform aggregate) |
| **9** | `INSUFFICIENT_EVIDENCE` | Tier D catalog products with zero reviews/images | Neutral / Non-evaluable |
| **10** | `NO_OBSERVED_SIGNAL` | Evaluated multimodal evidence with no anomalous trigger | Programmatic Weak Label |

---

### 2. Review-Level Weak Supervision Census (56,697 Reviews)

| Taxonomy Category | Count | Percentage | Mean Confidence |
|---|---:|---:|---:|
| `NO_OBSERVED_SIGNAL` | 54,929 | 96.88% | 0.950 |
| `DUPLICATE_REVIEW_SIGNAL` | 1,199 | 2.11% | 0.800 |
| `REVIEW_QUALITY_ANOMALY` | 541 | 0.95% | 0.700 |
| `SUSPICIOUS_REVIEW_PATTERN` | 28 | 0.05% | 0.850 |
| `CONFIRMED_FRAUD` | **0** | **0.00%** | **N/A** |

---

### 3. Product-Level Weak Supervision Census (6,043 Products)

| Taxonomy Category | Count | Percentage | Primary Contributing Feature |
|---|---:|---:|---|
| `INSUFFICIENT_EVIDENCE` | 1,887 | 31.23% | Tier D Catalog / Zero Modalities |
| `NO_OBSERVED_SIGNAL` | 3,280 | 54.28% | Normal price & visual distribution |
| `IMAGE_MISMATCH_SIGNAL` | 251 | 4.15% | Low resolution or abnormal aspect ratio |
| `PRICE_ANOMALY` | 600 | 9.93% | Price MAD z-score > 3.5 or negative discount |
| `SUSPECTED_MANIPULATION` | 4 | 0.07% | Co-occurrence of price & duplicate review signals |
| `CONFIRMED_FRAUD` | **0** | **0.00%** | **Zero Ground Truth Fabrication Compliance** |

---

### 4. Scientific Rigor and Defense
1. **Zero Data Fabrication:** The dataset explicitly acknowledges that confirmed fraud ground truth does not exist in open marketplace scrapes.
2. **Model Training Guardrail:** Supervised fraud classifiers must NOT be trained using self-generated weak labels or sentiment labels. Weak supervision is provided strictly for exploratory error auditing and multi-signal heuristics.
