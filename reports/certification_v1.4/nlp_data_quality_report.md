# Workstream E: NLP Data Quality, Hinglish/Indic & Deception Baselines

## 1. Review Corpus Inventory & Retention
- Total customer reviews: **56,697**.
- Retention rate: **100.00%** (zero reviews filtered, deleted, or suppressed).
- Linked reviews: 53,104 reviews (1,143 Flipkart, 51,961 International).
- Unlinked reviews: 3,593 reviews (3,490 Amazon India, 103 Supplementary).

## 2. Linguistic Composition & Indic/Hinglish Audit
Audited in `src/nlp/quality_audit.py`:
- 98.4% of review texts are English or Romanized text.
- 1.6% of reviews exhibit strong Hinglish/Latinized Indic markers (tokens such as *achha, bahut, kharab, paisa vasool, mast, bekar*).
- Character length, token count, uppercase ratio, and exclamation density are precomputed and stored in `derived_evidence/review_quality_features.parquet`.

## 3. Deception Detection Baseline Model
Trained on the isolated Ott Deceptive Opinion Spam benchmark (1,600 reviews; 800 truthful, 800 deceptive):
- Algorithm: TF-IDF Vectorizer (max_features=5000, n-gram=(1,2)) + Logistic Regression ($C=1.0$).
- Precision: **0.9006**
- Recall: **0.8529**
- F1-Score: **0.8761**
- ROC-AUC: **0.9490**
- PR-AUC: **0.9549**
- Naive Bayes Comparison: F1 0.8652, ROC-AUC 0.9412.
