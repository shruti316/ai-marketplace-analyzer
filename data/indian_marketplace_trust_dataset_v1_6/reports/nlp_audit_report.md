# AUDIT & REMEDIATION REPORT: MARKETPLACE NLP WORKFLOW
## AI-Powered Marketplace Trust Intelligence Platform

**Document Version:** 1.0.0  
**Status:** COMPLETE & EMPIRICALLY VALIDATED  
**Date:** October 2026  
**Auditor:** Senior NLP & ML Systems Engineer  
**Repository Working Directory:** `c:\Users\shruti\Desktop\project\ai-based-marketplace-analyzer`  
**Primary Artifact Under Audit:** `notebooks/04_nlp_analysis.ipynb`  
**Referenced Module:** `src/nlp/review_analysis.py`  

---

## Executive Summary

This report documents the comprehensive audit, architectural correction, and empirical validation of the Natural Language Processing (NLP) review intelligence workflow in the AI-Powered Marketplace Trust Intelligence Platform.

Prior to this intervention, the NLP workflow suffered from three critical architectural flaws:
1. **Domain Conflation:** An isolated research experiment on Chicago hotel reviews (Ott et al., 2011/2013) was embedded inside the marketplace notebook, creating the severe risk of treating hospitality deception stylometry as marketplace product fraud.
2. **Data Scope Mismatch:** Exploratory analysis was conducted almost exclusively on `data/interim/dense_reviews.parquet` (a 7,595-review Amazon Beauty cohort of listings with $\ge 10$ reviews), misrepresenting results as indicative of the broader platform. Meanwhile, the unified canonical dataset (`data/processed/canonical_reviews.parquet`, 55,616 reviews across six retail categories and two marketplaces) was loaded purely for descriptive count printing.
3. **Flawed Disagreement Heuristics & Combinatorial Inflation:** The notebook employed an overly broad categorical mismatch definition that inflated sentiment-rating disagreement to ~22% by treating neutral 3-star ratings and mildly polarized text as suspicious. Furthermore, intra-product review similarity counted all pairwise combinations ($(n(n-1))/2$), artificially multiplying repetitive signals.

### Key Remediation Actions Taken
- **Primary Marketplace Pipeline Established:** Rebuilt `notebooks/04_nlp_analysis.ipynb` to ingest `canonical_reviews.parquet` (55,616 reviews) and `canonical_products.parquet` (27,789 products), validating 100% unique primary keys, 0 orphan foreign keys, unified multi-format timestamp parsing, and full category/marketplace coverage across actual data.
- **Hotel Benchmark Isolated & Preserved:** Quarantined the Ott et al. hotel deception experiment into `notebooks/hotel_benchmark_isolated.ipynb` with strict entity-based grouping (`GroupShuffleSplit` by hotel), preserving the experiment, trained weights, and provenance while barring any transfer to marketplace listings.
- **E-Commerce Deception Benchmark Evaluated Separately:** Evaluated the 40,526-record Salminen et al. (2022) E-Commerce Fake Reviews Benchmark in `src/evaluation/benchmark_eval.py` and Section 6 of the primary notebook. Quarantined 33 duplicate texts to ensure 0 text overlap between partitions, fit TF-IDF strictly on training data, and achieved **87.85% accuracy**, **88.12% precision**, **87.52% recall**, **0.8782 F1**, and **0.9517 ROC-AUC**.
- **Empirical Discordance & Similarity Audited:** Implemented hardened polar discordance logic (4★/5★ with compound $\le -0.2$; 1★/2★ with compound $\ge +0.3$), revealing a 4.66% platform discordance rate. Audited intra-product similarity on the 580 multi-review products, revealing that 91.3% of similar pairs are exact short duplicates ("five stars great", "four stars works great") rather than complex deception rings.
- **Automated Verification:** Added 6 new unit tests to `tests/test_nlp.py` and integrated into `run_tests.py` (**28/28 tests passing**; `src/validate_dataset_integrity.py` passing with **32 PASS, 2 WARN, 0 FAIL**). Both notebooks execute end-to-end without errors.

---

## 1. Actual Sources and Sizes Used in Every Analysis

Every dataset utilized in the NLP workflows was audited for provenance, schema, row counts, and structural completeness:

| Dataset Identifier | File Path | Format | Size | Rows & Cols | Primary Key / Group Key | Provenance & Role |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Canonical Reviews** | `data/processed/canonical_reviews.parquet` | Parquet | 2.50 MB | 55,616 × 15 | `canonical_review_id` | **Primary Platform Reviews:** Ingested from BestBuy (44,965) and Amazon (10,651). 100% valid ratings [1.0, 5.0]. |
| **Canonical Products** | `data/processed/canonical_products.parquet` | Parquet | 3.79 MB | 27,789 × 21 | `canonical_product_id` | **Primary Platform Products:** Walmart (22,074), Amazon (5,466), BestBuy (249). Joined via `canonical_product_id`. |
| **Dense Reviews Cohort** | `data/interim/dense_reviews.parquet` | Parquet | 1.15 MB | 7,595 × 11 | `review_id` (grouped by `parent_asin`) | **Exploratory Interim Subset:** Sampled Amazon All_Beauty listings with $\ge 10$ reviews across 300 products. |
| **Dense Products Cohort** | `data/interim/dense_products.parquet` | Parquet | 0.08 MB | 300 × 11 | `parent_asin` | **Exploratory Interim Subset:** Metadata for the 300 dense beauty products. |
| **Baseline Text Features** | `data/processed/marketplace_text_features.parquet` | Parquet | 4.88 MB | 19,991 × 30 | N/A | **Preserved Baseline:** Initial Week 2 text feature engineering on Amazon Beauty sample. |
| **E-Commerce Fake Reviews** | `data/raw/benchmarks/ecommerce_fake_reviews_benchmark.parquet` | Parquet | 7.91 MB | 40,526 × 4 | N/A (deduplicated by `text` to 40,493) | **Isolated E-Commerce Benchmark:** Salminen et al. (2022) Hugging Face dataset (20,294 fake / 20,232 real). |
| **Ott Hotel Opinion Spam** | `data/raw/benchmarks/deceptive_opinion_spam.parquet` | Parquet | 0.44 MB | 1,600 × 5 | Grouped by `hotel` (20 hotels) | **Isolated Hospitality Benchmark:** Ott et al. (2011/2013) 20 Chicago hotels (800 truthful, 800 deceptive). |

### Data Scope Misuse in the Legacy Notebook
In the previous implementation of `notebooks/04_nlp_analysis.ipynb`:
- `df` was loaded from `data/processed/marketplace_text_features.parquet` (19,991 rows), which was solely Amazon All_Beauty.
- `dense_df` was loaded from `data/interim/dense_reviews.parquet` (7,595 rows, 300 products). All similarity and sentiment analysis was run exclusively on `dense_df`.
- `canonical_reviews.parquet` and `canonical_products.parquet` were loaded in Cell 10 only to print `.value_counts()` on marketplace and category. No NLP pipeline was executed on them.
- `benchmark_df` was loaded from `data/raw/benchmarks/deceptive_opinion_spam.parquet` (Ott hotel reviews) and evaluated as the sole benchmark, completely ignoring the retail e-commerce benchmark `ecommerce_fake_reviews_benchmark.parquet`.

---

## 2. Which Existing Results are Valid and Reproducible

The audit evaluated all historical metrics, pipeline steps, and benchmark results to establish reproducibility:

### 1. Ott Hotel Deception Baseline (`reports/nlp_benchmark_results.json`)
- **Status:** **Mathematically Valid & Reproducible, Domain Quarantined.**
- **Evaluation Details:** GroupShuffleSplit by hotel (15 train hotels, 5 test hotels; 1,200 train / 400 test reviews). TF-IDF (1-2 grams, 3,000 features) + L2 Logistic Regression.
- **Empirical Results:** Test Accuracy: 84.75% (85.25% under current split), Macro F1: 0.8473, Precision: 0.8495, Recall: 0.8475.
- **Validity Assessment:** The experiment correctly prevents hotel entity leakage across train and test folds. However, the model reflects Chicago hotel guest experiences (e.g., room cleanliness, valet service, vacation excitement) and possesses zero validity for detecting product counterfeits, merchant price gouging, or e-commerce review rings. It has been quarantined into `notebooks/hotel_benchmark_isolated.ipynb`.

### 2. E-Commerce Fake Reviews Benchmark (`reports/ecommerce_benchmark_evaluation_report.json`)
- **Status:** **Valid, Reproducible, and Fully Operationalized.**
- **Evaluation Details:** 40,493 deduplicated records across 10+ retail categories. Stratified 75/25 train/test split with zero text overlap. Preprocessing (TF-IDF 1-2 grams, 5,000 features) fit strictly on the training partition.
- **Empirical Results:**
  - Accuracy: **87.85%**
  - Precision: **88.12%**
  - Recall: **87.52%**
  - F1-Score: **0.8782**
  - ROC-AUC: **0.9517**
  - Confusion Matrix: TN = 4,460, FP = 598, FN = 632, TP = 4,434 (on 10,124 test reviews).
- **Validity Assessment:** Valid stylometric baseline for distinguishing computer-generated text from authentic human reviews. It does not replace multi-signal marketplace fraud detection, where merchant collusion and brushing occur with authentic human text.

### 3. VADER Sentiment Scoring Logic (`src/nlp/review_analysis.py`)
- **Status:** **Valid and Robust.**
- **Evaluation Details:** Uses `vaderSentiment.vaderSentiment.SentimentIntensityAnalyzer` when installed, falling back to a deterministic lexicon. Verified compound scores: positive text (+0.8398), negative text (-0.8402), neutral text (0.0000), empty/None (0.0000).

---

## 3. Incorrect Source Usage & Evaluation Risks Found

The audit uncovered seven distinct methodological and evaluation risks:

### Risk 1: Domain Mismatch from Hotel Review Benchmark
- **Risk:** Training a deceptive review classifier on hotel reviews and treating it as a marketplace risk tool.
- **Impact:** Hotel reviews focus on room noise, bed comfort, bellhops, and location. E-commerce reviews focus on technical specifications, sizing, battery life, and package condition. Transferring hotel models to marketplace listings results in arbitrary false positives and misses genuine marketplace fraud.
- **Resolution:** Isolated the Ott experiment in `notebooks/hotel_benchmark_isolated.ipynb` with prominent domain mismatch notices.

### Risk 2: Density / Survivorship Bias in `dense_reviews.parquet`
- **Risk:** Drawing broad conclusions about review duplication from `dense_reviews.parquet`.
- **Finding:** In the canonical dataset of 3,627 reviewed products:
  - **3,047 products (84.0%) have exactly 1 review.**
  - **580 products (16.0%) have $\ge 2$ reviews.**
  - **502 products (13.8%) have $\ge 5$ reviews.**
  - **469 products (12.9%) have $\ge 10$ reviews.**
- **Impact:** In `dense_reviews.parquet`, 100% of products had $\ge 10$ reviews (mean 25.3). Asserting that listings typically have multiple reviews or that intra-product similarity can be evaluated across the catalog is false. For 84% of products, intra-product review similarity is mathematically undefined.
- **Resolution:** Explicitly labelled `dense_reviews.parquet` as an exploratory subset. The primary pipeline now reports listing density distribution honestly.

### Risk 3: Inflated Rating–Sentiment Disagreement Rates
- **Risk:** The previous notebook defined disagreement as any mismatch between discrete `rating_sentiment` ('Negative', 'Neutral', 'Positive') and `text_sentiment`:
  ```python
  dense_df['sentiment_disagreement'] = dense_df['rating_sentiment'] != dense_df['text_sentiment']
  ```
- **Finding:** Under this naive categorical definition:
  - A 3-star rating ('Neutral') with compound score +0.06 ('Positive') was counted as disagreement.
  - A 5-star rating with compound score 0.00 ('Neutral') was counted as disagreement.
  - This produced an artificially inflated disagreement rate of **21.94%** on `dense_df` and **14.25%** on the canonical dataset.
- **Resolution:** Established the **Polar Discordance** standard:
  $$(Rating \ge 4.0 \land Compound \le -0.20) \lor (Rating \le 2.0 \land Compound \ge +0.30)$$
  Neutral 3-star ratings and mildly polarized text are excluded. Under this standard, the canonical discordance rate is **4.66%** (2,590 / 55,616 reviews).

### Risk 4: Over-Interpreting Disagreement as Fraud
- **Risk:** Treating rating-sentiment disagreement as proof of fraudulent or deceptive reviews.
- **Finding:** Inspection of actual discordant canonical reviews showed:
  - **5★ rating with negative compound ($\le -0.2$):** Customers praise the product but vent about carrier delivery delays ("works fine... but UPS collapsed the shipment"), or mention negative symptom relief ("cured my terrible headache").
  - **1★ rating with positive compound ($\ge +0.3$):** Sarcasm ("great sampler but received the wrong product"), polite dissatisfaction ("I really wanted to love this... but it failed"), or wrong variant shipped.
- **Resolution:** Documented in both notebook and codebase that discordance is a weak exploratory signal for triage, not evidence of merchant fraud.

### Risk 5: Combinatorial Inflation in Review Similarity Pairs
- **Risk:** If a seller posts 5 identical reviews, evaluating all pairwise combinations yields $(5 \times 4)/2 = 10$ pairs. A listing with 20 duplicate reviews generates 190 pairs. Counting pairs as independent evidence exaggerates risk signals.
- **Resolution:** `ProductReviewAnalyzer` and the primary notebook now compute and report both `exact_duplicate_reviews` (count of redundant text instances) and `repetitive_review_pairs` (combinatorial comparison count).

### Risk 6: Mixed-Scale Timestamp Parsing Bug
- **Risk:** In `canonical_reviews.parquet`, Amazon reviews had timestamps formatted in two different units: 7,525 rows in Unix seconds ($< 10^{11}$), and 3,126 rows in Unix milliseconds ($\ge 10^{11}$). Meanwhile, BestBuy reviews had string dates in `review_date` (e.g. "2024-09-03 08:51:00" and "May 2, 2024 6:27 AM"). Passing `unit='s'` globally resulted in year 51,991, throwing an `OutOfBoundsDatetime` exception.
- **Resolution:** Implemented multi-format parsing:
  ```python
  bb_mask = df['review_date'].notna()
  parsed_dt[bb_mask] = pd.to_datetime(df.loc[bb_mask, 'review_date'], format='mixed')
  az_s = df['timestamp'].notna() & (df['timestamp'] < 1e11)
  az_ms = df['timestamp'].notna() & (df['timestamp'] >= 1e11)
  parsed_dt[az_s] = pd.to_datetime(df.loc[az_s, 'timestamp'], unit='s')
  parsed_dt[az_ms] = pd.to_datetime(df.loc[az_ms, 'timestamp'], unit='ms')
  ```
  Result: 100% of 55,616 reviews parse to valid datetimes (spanning Oct 2005 to Feb 2025) with zero missing dates.

### Risk 7: Duplicate Text Leakage in Benchmark Splits
- **Risk:** `ecommerce_fake_reviews_benchmark.parquet` contained 33 duplicate review texts (64 records total). Uncontrolled random splitting allowed identical text strings to appear in both training and test sets.
- **Resolution:** Deduplicated identical texts prior to train/test splitting, guaranteeing strictly zero text overlap between partitions.

---

## 4. Changes Made and Tests Executed

### Codebase Changes
1. **`src/nlp/review_analysis.py`:**
   - Added explicit tracking and evidence flags for missing and unparseable review text (`empty_or_missing_text_count`, `"EMPTY_OR_UNPARSEABLE_REVIEWS"`).
   - Formalized `is_polar_discordance()` with documented thresholds.
   - Refined `ProductReviewAnalyzer` to track both exact duplicate review count and pairwise similarity clusters, avoiding combinatorial inflation.
   - Added `batch_analyze_dataset()` for listing-level batch aggregation.
   - Replaced Unicode star symbols (`★`) with ASCII-compatible text to prevent Windows cp1252 charmap encoding errors.
2. **`src/evaluation/benchmark_eval.py`:**
   - Updated evaluation pipeline to deduplicate identical review texts, preventing cross-fold leakage.
   - Set vectorizer to fit strictly on the training partition.
   - Evaluates full 40,493 deduplicated records.
   - Saves complete metrics, confusion matrix, and boundary warnings to `reports/ecommerce_benchmark_evaluation_report.json`.
3. **`notebooks/04_nlp_analysis.ipynb`:**
   - Completely restructured into an 8-cell primary marketplace pipeline.
   - Ingests `canonical_reviews.parquet` (55,616) and `canonical_products.parquet` (27,789) across Amazon and BestBuy.
   - Validates primary key uniqueness, referential integrity (0 orphans), unified timestamp parsing, and text completeness.
   - Extracts global multi-category TF-IDF vocabulary.
   - Audits polar discordance (4.66%) vs categorical mismatch (14.25%) across categories and marketplaces.
   - Audits intra-product review similarity on multi-review listings (580 products), reporting 91.3% exact duplicate pairs.
   - Evaluates the 40k E-Commerce Fake Reviews Benchmark with zero duplicate leakage.
   - Quarantines the Ott hotel experiment with a clear boundary notice.
4. **`notebooks/hotel_benchmark_isolated.ipynb`:**
   - Created dedicated notebook isolating the Ott et al. hotel deception experiment.
   - Evaluates 1,600 reviews with GroupShuffleSplit by hotel (zero entity leakage).
   - Documents provenance, performance (85.25% test accuracy), and explicit non-transferability to e-commerce products.
5. **`scripts/update_notebooks.py`:**
   - Updated automation script to regenerate both notebooks cleanly.
6. **`tests/test_nlp.py` & `run_tests.py`:**
   - Created comprehensive unit test suite in `tests/test_nlp.py`:
     - `test_sentiment_compound_polarity`
     - `test_polar_discordance_logic`
     - `test_product_review_analyzer_zero_reviews`
     - `test_product_review_analyzer_single_review`
     - `test_product_review_analyzer_multi_review_similarity`
     - `test_product_review_analyzer_missing_empty_text`
   - Registered all 6 tests in `run_tests.py`.

### Test Execution Results
- **Automated Test Suite (`run_tests.py`):** **28 passed, 0 failed** (100% pass rate).
- **Dataset Integrity Suite (`src/validate_dataset_integrity.py`):** **32 passed, 2 warnings (known baseline sample limitations), 0 failures**.
- **Notebook End-to-End Execution (`scratch/test_notebook_execution.py`):**
  - `notebooks/hotel_benchmark_isolated.ipynb`: All 3 code cells executed cleanly to completion.
  - `notebooks/04_nlp_analysis.ipynb`: All 8 code cells executed cleanly to completion.

---

## 5. Remaining NLP Tasks, Prioritized for Implementation

The following NLP engineering tasks are prioritized for subsequent sprints:

| Priority | Task Description | Target File / Module | Objective |
| :---: | :--- | :--- | :--- |
| **P1** | **Listing-Level Review Feature Aggregator** | `src/features/review_features.py` | Transform 55,616 canonical reviews into a product-keyed feature table (`canonical_product_id` $\to$ verified ratio, discordance ratio, similarity score, review velocity, duplicate count) consumed by `MarketplaceRiskEngine`. |
| **P2** | **Cross-Listing Review Syndicate Detection** | `src/nlp/cross_listing_similarity.py` | Detect copy-paste review text appearing across *different* product IDs, brands, or merchant listings (syndicated review manipulation). |
| **P3** | **Stylometric Feature Extraction Pipeline** | `src/features/stylometry.py` | Vectorize text features across canonical reviews: uppercase density, punctuation burstiness, exclamation marks, and length distributions. |
| **P4** | **Aspect-Based Review Sentiment Decomposition** | `src/nlp/aspect_sentiment.py` | Disentangle carrier/delivery grievances from intrinsic product defects to reduce false-positive sentiment discordance flags. |

---

## Next Concrete Marketplace NLP Implementation Task

The immediate, concrete next task is:

> **Implementation of the Canonical Listing-Level Review Feature Aggregator (`src/features/review_features.py`)**  
> **Goal:** Aggregate review-level signals from `data/processed/canonical_reviews.parquet` (55,616 reviews) into a canonical product-keyed tabular artifact (`data/processed/product_review_features.parquet`) containing:
> - `review_count`, `average_rating`, `rating_std_dev`
> - `verified_purchase_ratio`
> - `polar_discordance_count`, `polar_discordance_ratio`
> - `max_intra_listing_similarity`, `repetitive_review_pairs`, `exact_duplicate_review_count`
> - `missing_text_review_count`
> - `review_status` (`ZERO_REVIEWS`, `SPARSE_SINGLE_REVIEW`, `DENSE_MULTI_REVIEW`)  
> This feature table directly supplies the `review_analysis` parameter in `MarketplaceRiskEngine.evaluate_product_listing()`, integrating canonical NLP signals into the platform's multi-signal risk scoring pipeline.
