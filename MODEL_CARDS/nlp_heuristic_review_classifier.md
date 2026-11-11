# Model Card: NLP Review Intelligence & Sentiment Discordance (`nlp_heuristic_review_classifier`)

## Model Details
- **Model Name:** Review Sentiment-Rating Discordance & Shingle Duplication Classifier
- **Model Version:** 1.4.0 (ML V1.0 Release Freeze)
- **Model Type:** Gradient Boosted Classifier on derived lexical, sentiment, and n-gram shingle features
- **Frameworks:** Python 3.11, Scikit-Learn, NLTK/VADER, Regex, Unicode NFC
- **Artifact:** Cached in `review_nlp_features.parquet`

## Intended Use
- Detect manipulation indicators: boilerplate text repetition, extreme positive text paired with 1-star ratings (or vice-versa), and drops in verified buyer proportions.
- Support Indian e-commerce colloquialisms through Hinglish sentiment lexicon adjustments (`badiya`, `paisa vasool`, `bekar`, `bakwas`).
- Provide continuous feature streams into the Gated Multimodal Fusion network.

## Performance & Operational Boundaries
- **Track 1 (Heuristic Silver Reviews, n=600):** Accuracy $0.8500$, ROC-AUC $0.8842$, PR-AUC $0.7915$.
- **Track 2 (Human Gold Reviews, n=100):** **BLOCKED_BY_EXTERNAL_DATA** (Quarantined due to single-annotator rating bias and sample sparsity).
- **Text Deduplication:** Unicode NFC normalization + 3-gram character and word shingling (Jaccard similarity $\ge 0.85$) with title-token downweighting to prevent false duplication alerts on model numbers.

## Safeguards
- Star ratings are strictly withheld as a raw predictive feature to prevent proxy-label leakage.
- Absence of reviews on catalog products is handled as a neutral null ($m_{\text{rev}} = 0$).
