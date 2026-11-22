# Benchmark Hierarchy and Trust Label Taxonomy Report (v1.1)

> [!NOTE]
> **Label Taxonomy**: 8 formal trust classes with documented provenance, evidence criteria, and confidence thresholds.

---

## 1. Multi-Tier Dataset Architecture

The dataset is architected into 3 distinct tiers to support staged ML development:

| Tier | Name | Entities / Records | Modality Completeness | Role in AI Platform |
| :--- | :--- | :--- | :--- | :--- |
| **Tier A** | Complete Multimodal Core | 105 products | 100% (Image, Review, Price, Product) | Multimodal fusion, cross-attention encoders, joint trust scoring |
| **Tier B** | Partial Modalities | 5,938 products | 1 to 3 modalities | Unimodal training, retrieval baselines, partial evidence inference |
| **Tier C** | Isolated Benchmarks | 42,131 records | Quarantined calibration sets | Deception scoring, synthetic text detection, stress testing |

---

## 2. 8-Class Trust Label Taxonomy

The `metadata/label_taxonomy.parquet` table defines 8 standardized trust classes:

| Class ID | Class Name | Provenance | Confidence Threshold | Evidence Requirements |
| :--- | :--- | :--- | :--- | :--- |
| `VERIFIED_FRAUDULENT` | **Independently verified fraudulent listing, seller misconduct, or counterfeit enforcement outcome.** | True | Count: 0 | None verified in raw crawls; no synthetic fraud labels injected. |
| `VERIFIED_LEGITIMATE` | **Independently verified authentic product, authorized brand distributor, or confirmed genuine order.** | True | Count: 249 | BestBuy 1P retail products. |
| `BENCHMARK_LABELLED_DECEPTIVE` | **Text review verified as deceptive by academic crowdsourced ground truth (Ott et al. ACL 2011).** | True | Count: 800 | Isolated in Tier C deceptive_opinion_spam. |
| `COMPUTER_GENERATED_REVIEW` | **Text review synthetically generated via language models (E-Commerce Fake Reviews Benchmark).** | True | Count: 20263 | Isolated in Tier C ecommerce_fake_reviews ('CG' label). |
| `ORGANIC_REVIEW` | **Organic consumer review collected from live platforms or human control benchmarks.** | True | Count: 21063 | Ott et al. truthful (800) + Fake Reviews 'OR' (20,263). |
| `HEURISTIC_SUSPICIOUS_SIGNAL` | **Algorithmic anomaly signal detected across cross-modal evidence (rating contradiction, reuse, fence outlier).** | False | Count: 1661 | Investigation signal only; not proof of fraud. |
| `SYNTHETIC_STRESS_TEST_CASE` | **Hand-crafted adversarial and extreme boundary stress cases.** | False | Count: 5 | Explicitly segregated in Tier C synthetic_stress_test_cases. |
| `UNVERIFIED` | **Real-world marketplace listings or reviews without independent third-party fraud audit.** | False | Count: 51839 | Standard real-world e-commerce review corpus. |

---

## 3. Tier C Benchmark Quarantine Protocol

To eliminate benchmark contamination and label leakage:
- **Deceptive Opinion Spam (Ott et al. 2011)**: 1,600 reviews with gold standard truth/deception labels.
- **E-Commerce Fake Reviews**: 40,526 reviews with computer-generated synthetic text flags.
- **Synthetic Stress Cases**: 5 extreme boundary edge cases.
- **Isolation Guarantee**: Tier C benchmark records are stored exclusively under `collections/isolated_benchmarks/`. They are never injected into the `products.parquet` or `reviews.parquet` master tables, ensuring zero leakage into general training data.
