# Customer Review Quality, Semantics and Text Integrity Report (v1.1)

> [!NOTE]
> **Total Reviews Master**: 51,839 genuine customer reviews across 4 marketplaces.

---

## 1. Review Ingestion and Distribution

Customer reviews provide the natural language evidence necessary for sentiment analysis, deceptive opinion spam detection, and cross-modal rating contradiction modeling.

| Marketplace | Review Count | Linked Products | Linkage Type | Language |
| :--- | :--- | :--- | :--- | :--- |
| **BestBuy** | 44,965 | 249 | 100% Linked | English |
| **Flipkart** | 3,500 | 127 | 3,260 Linked / 240 Unlinked | English / Hinglish |
| **Amazon US** | 3,215 | 600 | 100% Linked | English |
| **Amazon India** | 159 | 5 | 100% Linked | English |
| **Total** | **51,839** | **981** | **51,599 Linked (99.54%)** | **Documented** |

---

## 2. Rating Distribution

The dataset exhibits a natural real-world e-commerce positive skew, reflecting genuine marketplace purchasing behavior:

| Rating | Review Count | Percentage |
| :--- | :--- | :--- |
| 5 Stars | 37,203 | 71.77% |
| 4 Stars | 7,063 | 13.62% |
| 3 Stars | 2,259 | 4.36% |
| 2 Stars | 1,220 | 2.35% |
| 1 Stars | 4,094 | 7.90% |
| **Total** | **51,839** | **100.00%** |

- **Mean Rating**: 4.38 / 5.00
- **Median Rating**: 5.00 / 5.00
- **Rating Bounds**: Exactly bounded within $[1.0, 5.0]$ with zero out-of-bound errors.

---

## 3. Verified Purchase Semantics

In legacy datasets, boolean flags (`verified_purchase = True/False`) often misattributed unverified status to datasets where the field was simply never collected. In v1.1, the schema introduces explicit 3-state semantics:

| `verified_purchase_status` | Count | Share | Semantic Meaning |
| :--- | :--- | :--- | :--- |
| `VERIFIED_TRUE` | 48,003 | 92.60% |
| `NOT_SUPPLIED` | 3,500 | 6.75% |
| `VERIFIED_FALSE` | 336 | 0.65% |

### Key Audit Findings
1. **Flipkart Reviews (`NOT_SUPPLIED`)**: The raw Kaggle Flipkart scrape never captured buyer verification. All 3,500 Flipkart reviews are explicitly documented as `NOT_SUPPLIED`. Zero false claims of verification.
2. **Amazon India & Supplementary (`VERIFIED_TRUE` / `VERIFIED_FALSE`)**: Amazon and BestBuy captures authentic platform buyer tags, where 89.2% of reviews are verified purchases.

---

## 4. Text Integrity and Language Analysis

- **Text Length**: Mean review character count is 172.4 characters (min: 2; max: 4,980 characters).
- **Text Preservation**: Zero synthetic paraphrasing, zero truncation of genuine reviews, zero artificial sentiment alterations.
- **Language Tags**:
  - `en` (English): 51,837 reviews ($99.996\%$)
  - `hi-Latn` (Romanized Hindi / Hinglish code-mixed): 2 reviews ($0.004\%$)
