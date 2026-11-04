# Dataset v1.6 Model Evaluation & Benchmarks Report

## Protocol 3 Reviewer-Held-Out Sentiment Benchmarks
- Train Set: 38,532 reviews | Test Set: 12,314 reviews (0 named reviewer overlap)
- **Logistic Regression (L2 + TF-IDF 10k):** Accuracy 0.9510 | F1 0.9728 | ROC-AUC 0.9774
- **Multinomial Naive Bayes (TF-IDF 10k):** Accuracy 0.9419 | F1 0.9679 | ROC-AUC 0.9719
- **Rule-Based Lexicon Heuristic:** Accuracy 0.8990 | F1 0.9455 | ROC-AUC 0.7983
