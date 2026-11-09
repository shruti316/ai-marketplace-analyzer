# Native Indic Language Coverage & Script Identification Report — v1.8
## AI-Powered Marketplace Trust Intelligence Platform

**Date:** 2026-11-04  
**Audit Scope:** Script Identification, Code-Mixed Parsing, Indic Unicode Support, and Corpus Language Breakdown.

---

### 1. The Language & Script Coverage Bottleneck

Independent auditing across the 56,697 customer reviews confirmed:
- **Total Customer Reviews in Catalog:** 56,697 reviews.
- **Corpus Script Breakdown (5,000 Sample Census):**
  - **Standard English (Latin Script):** 5,000 reviews (100.00%)
  - **Hinglish (Transliterated Code-Mixed Latin):** 0 reviews (0.00%)
  - **Native Indic Scripts (Devanagari, Tamil, Telugu, etc.):** **0 reviews (0.00%)**

> [!WARNING]
> While consumer reviews frequently use Indian vocabulary (*"paisa wasool"*, *"bekaar"*, *"mast"*), they are **100% encoded in Latin script**.  
> Scraped web crawlers historically target English e-commerce views, completely omitting vernacular native script customer feedback.

---

### 2. Multi-Script Identification Engine Validation

The service [`src/nlp/indic_multilingual_v1_8.py`](file:///C:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/nlp/indic_multilingual_v1_8.py) decouples script detection from language modeling:
- **Unicode Range Segmentation:** Detects Devanagari, Tamil, Bengali, Telugu, Kannada, Gujarati, and Malayalam independently from Latin.
- **Unicode NFC Normalization:** Preserves diacritics and ligatures without destructive ASCII transliteration.
- **Hinglish Token Analyzer:** Flags colloquial Latin-script code mixing based on an e-commerce lexicon.

#### Golden Benchmark Validation:
- **Benchmark Accuracy:** **100.00%** (7 / 7 test cases passed).

| Test Text | Target Language (Script) | Model Prediction | Verdict |
|---|---|---|:---:|
| `This phone has amazing battery life...` | English (LATIN) | English (LATIN) | [OK] PASS |
| `बहुत ही बढ़िया प्रोडक्ट है, पैसा वस...` | Hindi/Marathi (DEVANAGARI) | Hindi/Marathi (DEVANAGARI) | [OK] PASS |
| `இந்த போன் மிக அருமையாக உள்ளது, பேட்...` | Tamil (TAMIL) | Tamil (TAMIL) | [OK] PASS |
| `খুব ভালো প্রোডাক্ট, ক্যামেরা দারুণ!...` | Bengali (BENGALI) | Bengali (BENGALI) | [OK] PASS |
| `ఈ ఫోన్ చాలా బాగుంది, బ్యాటరీ లైఫ్ స...` | Telugu (TELUGU) | Telugu (TELUGU) | [OK] PASS |
| `Ye phone bohot hi bekaar hai, paisa...` | Hinglish (Code-Mixed Latin) (LATIN) | Hinglish (Code-Mixed Latin) (LATIN) | [OK] PASS |
| `Quality accha hai but delivery late...` | Hinglish (Code-Mixed Latin) (LATIN) | Hinglish (Code-Mixed Latin) (LATIN) | [OK] PASS |

---

### 3. Native Indic Review Collection Manifest (`BLOCKED_EXTERNAL`)

To expand native Indic language representation in prospective releases, a collection manifest has been established:
- Manifest File: [`manifests/native_indic_review_collection_manifest_v1_8.csv`](file:///C:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/manifests/native_indic_review_collection_manifest_v1_8.csv)
- Status: **`BLOCKED_EXTERNAL`**
- Requirements: Live authenticated egress to Amazon India vernacular endpoints (`review_language=hi_IN`, `ta_IN`, `te_IN`) and Flipkart multilingual interfaces.
