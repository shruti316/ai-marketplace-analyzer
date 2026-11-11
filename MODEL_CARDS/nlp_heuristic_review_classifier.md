# Model Card: NLP Review Intelligence & Sentiment Discordance (`nlp_heuristic_review_classifier`)

## Model Details
- **Model Name:** Review Sentiment-Rating Discordance & Shingle Duplication Classifier
- **Model Version:** 1.3.0
- **Model Type:** Gradient Boosted Classifier on derived lexical, sentiment, and n-gram shingle features
- **Frameworks:** Python 3.11, Scikit-Learn, NLTK/VADER
- **Artifact:** Cached in `review_nlp_features.parquet`

## Intended Use
- Detect manipulation indicators: boilerplate text repetition, extreme positive text paired with 1-star ratings (or vice-versa), and drops in verified buyer proportions.
- Provide continuous feature streams into the Gated Multimodal Fusion network.

## Performance & Operational Boundaries
- **Track 1 (Heuristic Silver Reviews, n=600):** Accuracy $0.8500$, ROC-AUC $0.8842$, PR-AUC $0.7915$.
- **Track 2 (Human Gold Reviews, n=100):** **BLOCKED — HUMAN ANNOTATION REQUIRED**. (Marked blocked due to sample sparsity and rating feature leakage identified in Phase 1 audit).

## Safeguards
- Star ratings are strictly withheld as a raw predictive feature to prevent proxy-label leakage.
- Absence of reviews on catalog products is handled as a neutral null ($m_{\text{rev}} = 0$).
