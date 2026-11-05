# NLP & Review Intelligence Evaluation Report — v1.7
## Marketplace Trust Intelligence Platform

### 1. Six-Aspect Aspect-Based Sentiment Analysis (ABSA)
Evaluated across all 56,697 customer reviews:

| Aspect Domain | Total Mentions | Mention Share | Positive Sentiment | Negative Sentiment | Dominant Sentiment |
|---|---:|---:|---:|---:|---|
| **Product Quality** | 10,724 | 18.91% | 2,752 | 87 | Positive |
| **Price & Value** | 10,211 | 18.01% | 2,126 | 212 | Positive |
| **Delivery & Packaging** | 3,110 | 5.49% | 309 | 4 | Positive |
| **Durability & Build** | 2,185 | 3.85% | 362 | 26 | Positive |
| **Performance & Battery** | 14,036 | 24.76% | 1,466 | 29 | Positive |
| **Customer Service** | 4,965 | 8.76% | 228 | 3 | Positive |

---

### 2. Protocol 3 Reviewer-Held-Out Sentiment Baseline
- **Training Population:** 43,475 reviews (38,558 Positive, 4,917 Negative)
- **Test Population:** 10,606 reviews (9,380 Positive, 1,226 Negative)
- **Reviewer Leakage:** **0 (Zero Overlap)**

| Model | Accuracy | Precision | Recall | Macro F1 | Balanced Accuracy | ROC-AUC |
|---|---:|---:|---:|---:|---:|---:|
| **Logistic Regression** | **0.9515** | 0.9634 | 0.9827 | **0.8623** | **0.8134** | **0.9748** |
| **Multinomial Naive Bayes** | **0.9405** | 0.9472 | 0.9882 | **0.8219** | **0.7657** | **0.9699** |
| **Linear SVM** | **0.9322** | 0.9360 | 0.9918 | **0.7808** | **0.7171** | **0.9691** |

---

### 3. Behavioral Manipulation & Discordance Findings
- **Rating-Sentiment Discordant Reviews:** 14 reviews detected where rating is 5-star but text contains strictly negative sentiment (e.g. broken, garbage, worst waste of money).
- **High-Frequency Duplicate Text (Freq >= 5):** 1,149 reviews identified as boilerplate copy-paste templates across listings.
- **Shouting Syntax:** 19 reviews identified with uppercase ratio >= 40% and multiple exclamation marks.
