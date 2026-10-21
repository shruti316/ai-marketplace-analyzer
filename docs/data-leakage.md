# Data Leakage Prevention Guidelines

**Project:** AI-Based Marketplace Analyzer  
**Scope:** Machine Learning, NLP, Pricing Anomaly, and Risk Engine Modeling  

---

## 1. Principles of Leakage Prevention

Marketplace risk analysis is highly susceptible to subtle forms of data leakage. To ensure our models evaluate genuine out-of-sample generalization rather than memorized artifacts, the following protocols must be enforced across all experiments:

### A. Group-Based Product Isolation (Group-ASIN Split)
- **The Risk:** If reviews belonging to the same product (`parent_asin`) appear in both training and test sets, the model can memorize product-specific vocabulary, pricing quirks, or catalog attributes, leading to artificially inflated accuracy.
- **Protocol:** Any train/test split on review data must use **Group-K-Fold** or **Group-Shuffle-Split** grouped on `parent_asin`. An entire product listing and all of its associated reviews must belong strictly to one partition.

### B. Temporal Cutoff Validation
- **The Risk:** Using future reviews or catalog updates to judge earlier listings introduces lookahead bias.
- **Protocol:** Where time-series signals (such as review velocity spikes or price drop anomalies) are evaluated, partitions must be ordered chronologically:
  - **Training Window:** Historical observations (e.g., reviews published $\le$ 2020).
  - **Validation / Test Window:** Subsequent observations (e.g., 2021–2023).

### C. Preprocessing & Vectorizer Isolation
- **The Risk:** Fitting TF-IDF vectorizers, standard scalers, or missing-value imputers on the entire dataset leaks global token frequencies and distribution statistics into the test set.
- **Protocol:** All transformers (scikit-learn `TfidfVectorizer`, `StandardScaler`, `SimpleImputer`) must be fit strictly on the **training fold** and applied via `transform()` to the validation/test folds.

### D. Duplicate Review Text Handling
- **The Risk:** Identical or near-identical boilerplate reviews appearing across multiple products can leak between splits if an author or review ring spams multiple listings.
- **Protocol:** Exact text hashes (SHA-256) and n-gram overlap must be checked. Identical reviews must not span across train and test partitions.

### E. Synthetic Benchmark Segregation
- **The Risk:** Including synthetic stress-test cases (`is_synthetic = True`) in training data distorts the empirical feature distributions and invalidates risk score calibration.
- **Protocol:** Synthetic cases must be stored separately in `data/raw/benchmarks/synthetic_stress_test_cases.parquet` and utilized strictly for **system unit testing and end-to-end explainability verification**, never for fitting statistical or machine learning parameters.

---

## 2. Leakage Status Audit Checklist

| Check | Requirement | Audit Result | Status |
|---|---|---|---|
| Split Leakage | No cross-partition review overlap | No train/test splits materialized in interim data | **PASS (By Design)** |
| Grouping Rule | All splits must group by `parent_asin` | Protocol codified in pipeline scripts | **ENFORCED** |
| Vectorizer Isolation | Pipelines must fit transformers on train only | Verified in Week 3 script template | **ENFORCED** |
| Synthetic Isolation | `is_synthetic=True` records quarantined | Quarantined in `data/raw/benchmarks/` | **PASS** |
