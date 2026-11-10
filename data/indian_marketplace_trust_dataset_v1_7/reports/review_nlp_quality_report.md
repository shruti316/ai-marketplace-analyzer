# Review NLP Data Quality & Intelligence Report
**Release Version:** Indian Marketplace Trust Dataset v1.5  
**Component:** Review NLP Intelligence Pipeline  
**Execution Pipeline:** [`src/nlp/review_intelligence.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/nlp/review_intelligence.py)  
**Derived Tables:**
- [`derived_evidence/review_nlp_features.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/derived_evidence/review_nlp_features.parquet)
- [`derived_evidence/review_similarity_clusters.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/derived_evidence/review_similarity_clusters.parquet)

---

## 1. Executive Summary & Review Corpus Quality

A comprehensive, reproducible review NLP intelligence pipeline was executed across the certified 3,659 customer review records in [`evidence/reviews.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/evidence/reviews.parquet). 

### Corpus Breakdown
- **Total Customer Reviews:** 3,659
- **Review ID Uniqueness:** 3,659 unique review IDs (100% primary key uniqueness, 0 collisions).
- **Empty / Null Text Records:** 0 (all 3,659 records contain non-empty customer feedback).
- **Marketplace Distribution:**
  - Flipkart: 3,500 reviews (95.65%)
  - Amazon India: 159 reviews (4.35%)
- **Product Coverage:** Reviews are concentrated across 148 canonical products.
- **Unreviewed Products:** 3,495 products currently have 0 reviews. Under the multimodal architecture, unreviewed products are strictly assigned `review_modality_status = 'MODALITY_UNAVAILABLE'` with 0 trust penalties.

---

## 2. Text Statistics & Length Distributions

Text preprocessing preserves the raw, unedited source text in `review_text_original` while providing whitespace-normalized, lowercase NFKC unicode strings in `review_text_normalized`.

| Metric | Min | Median | Mean | Max |
| :--- | :--- | :--- | :--- | :--- |
| **Character Length** | 4 | 58.0 | 128.4 | 1,489 |
| **Word Count** | 1 | 11.0 | 24.6 | 288 |
| **Avg Word Length** | 2.50 | 4.60 | 4.72 | 12.00 |
| **Capitalization Ratio** | 0.00 | 0.02 | 0.04 | 1.00 |

### Length Anomaly Detection
- **Short Review Anomaly ($\le 2$ words):** 1,383 reviews (37.80%) consist of low-effort phrases such as `"nice"`, `"good product"`, or `"super"`. These are captured by `REVIEW_LENGTH_ANOMALY_SIGNAL`.
- **Long Detailed Reviews ($> 50$ words):** 468 reviews (12.79%) offer extensive multi-sentence product feedback.

---

## 3. Language & Script Distribution

Script identification was conducted using Unicode block frequency matching (Devanagari $\text{U+0900}-\text{U+097F}$, Latin $\text{U+0000}-\text{U+024F}$), coupled with a curated Indian e-commerce transliterated lexicon for code-mixed Hinglish.

| Detected Language | Dominant Script | Record Count | Percentage | Mean Confidence |
| :--- | :--- | :--- | :--- | :--- |
| **English (`en`)** | Latin | 3,656 | 99.92% | 0.948 |
| **Hinglish (`hi-en`)** | Latin (Code-mixed) | 3 | 0.08% | 0.720 |
| **Native Hindi (`hi`)** | Devanagari | 0 | 0.00% | N/A |

> [!NOTE]
> Native Indic script reviews (e.g. Devanagari Hindi, Tamil, Bengali) do not exist in the upstream marketplace scrape cache. This is documented as an environmental limitation; synthetic multilingual text was strictly prohibited.

---

## 4. Sentiment Intelligence & Rating Discordance

Sentiment analysis is implemented through a bounded, explainable lexical analyzer with valence shifters, negators (`not`, `never`, `nahi`, `nahin`), and intensifiers (`very`, `bahut`, `super`).

### Sentiment Polarity Distribution
- **Positive ($s > 0.15$):** 2,493 reviews (68.13%)
- **Neutral ($-0.15 \le s \le 0.15$):** 844 reviews (23.07%)
- **Negative ($s < -0.15$):** 322 reviews (8.80%)

### Rating vs Text Discordance Formulation
Let $r \in [1, 5]$ be the marketplace star rating, and $s \in [-1.0, 1.0]$ be the lexical sentiment score. The normalized ratings are:
$$r_{\text{norm}} = \frac{r - 1.0}{4.0} \in [0.0, 1.0]$$
$$s_{\text{norm}} = \frac{s + 1.0}{2.0} \in [0.0, 1.0]$$
Discordance is defined as:
$$\Delta_{\text{discordance}} = |r_{\text{norm}} - s_{\text{norm}}|$$

A review is flagged with `RATING_DISCORDANCE_SIGNAL` when $\Delta_{\text{discordance}} \ge 0.50$.
- **Discordant Reviews Detected:** 571 reviews (15.61%).
- **Common Discordance Pattern:** 5-star ratings where the text describes severe defects (e.g., `"broke after 1 week but giving 5 star so seller sees this"`), or 1-star ratings with praise where a buyer clicked the wrong rating star.

---

## 5. Aspect-Based Sentiment Analysis (ABSA)

Aspect extraction segments reviews into syntactic clauses, mapping target keyword mentions across 6 e-commerce domains and extracting supporting evidence text spans:

| Aspect Domain | Experience Type | Mentions | Positive | Neutral | Negative | Supporting Span Sample |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Quality** | Product | 556 | 412 | 68 | 76 | `"the fabric quality is really good and durable"` |
| **Authenticity** | Product | 131 | 84 | 22 | 25 | `"100% genuine product with original seal"` |
| **Value for Money** | Product | 375 | 321 | 39 | 15 | `"worth every penny paisa vasool"` |
| **Delivery** | Seller/Logistics | 234 | 162 | 28 | 44 | `"delivery was super fast received before date"` |
| **Packaging** | Seller/Logistics | 44 | 26 | 10 | 8 | `"packaging was damaged box was torn"` |
| **Customer Service** | Seller/Logistics | 90 | 48 | 18 | 24 | `"replacement request was resolved promptly"` |

---

## 6. Review Manipulation Signals

Four explainable manipulation signals were computed without asserting unverified fraud:
1. **`REVIEW_SIMILARITY_SIGNAL`:** 143 exact duplicate text clusters covering 1,335 reviews.
2. **`REVIEW_BURST_SIGNAL`:** 109 temporal burst clusters covering 3,454 reviews.
3. **`RATING_DISCORDANCE_SIGNAL`:** 571 reviews with rating-sentiment conflict $\ge 0.50$.
4. **`REVIEW_LENGTH_ANOMALY_SIGNAL`:** 1,383 short template reviews ($\le 2$ words).
