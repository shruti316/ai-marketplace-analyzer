# Aspect-Based Sentiment Analysis (ABSA) Report — v1.7
## Marketplace Trust Intelligence Platform

**Execution Timestamp:** 2026-11-04  
**Total Reviews Analyzed:** 56,697  
**Reviews with Aspect Mentions:** 30,972 (54.63%)  

---

### 1. Six-Aspect Prevalence and Polarity Breakdown

| Aspect Domain | Total Mentions | Mention Share | Positive Sentiment | Negative Sentiment | Neutral / Mixed | Dominant Polarity |
|---|---:|---:|---:|---:|---:|---|
| **Product Quality** | 7,256 | 12.8% | 1,316 | 307 | 5,633 | Positive |
| **Price & Value** | 10,882 | 19.19% | 2,101 | 436 | 8,345 | Positive |
| **Delivery & Packaging** | 3,389 | 5.98% | 196 | 10 | 3,183 | Positive |
| **Durability & Build** | 2,314 | 4.08% | 432 | 79 | 1,803 | Positive |
| **Performance & Battery** | 17,152 | 30.25% | 1,764 | 558 | 14,830 | Positive |
| **Customer Service** | 5,282 | 9.32% | 58 | 15 | 5,209 | Positive |

---

### 2. Methodological Rigor & Limitations
1. Aspect extraction uses deterministic keyword and phrase lexicons preserved across versions.
2. In-context negation (e.g., "not good quality") is explicitly preserved and mapped to negative polarity.
3. Ratings are strictly decoupled from aspect sentiment: a 5-star review containing "poor delivery" has aspect delivery scored as negative.
