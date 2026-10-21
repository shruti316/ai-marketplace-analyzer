# AI-Powered Marketplace Trust Intelligence Platform

An explainable, multimodal marketplace intelligence platform designed to analyze product listings, category-relative pricing, customer review patterns, and packaging visual signals across multiple categories and marketplaces.

---

## 1. Project Scope & Architecture

The platform assesses marketplace listings using multiple evidence sources and provides explainable, evidence-grounded risk signals, comparisons, and product intelligence.

### Multi-Category Support:
- **Electronics & Accessories** (Audio, Cameras, Computers, Cell Phones & Accessories)
- **Beauty & Personal Care** (Cosmetics, Hair Care, Skin Care)
- **Clothing, Shoes & Fashion** (Apparel, Footwear, Accessories)
- **Home & Kitchen** (Appliances, Dining, Décor, Storage)
- **Books & Stationery** (Books, Office Products)
- **Toys & Games** (Board Games, Puzzles, Collectibles)

### Multi-Marketplace Support:
- **Amazon** (Full review text, star ratings, helpful votes, CloudFront image URLs)
- **Walmart** (Product catalog listings, categories, model numbers, brands, prices)
- **BestBuy** (Customer reviews, verified purchases, star ratings, submission dates)

---

## 2. Core Intelligence Features

1. **Category-Relative Price Anomaly Detection:** Robust statistics (Median, IQR, Tukey fences, MAD robust Z-scores) computed per category cohort to distinguish price dumping and price gouging.
2. **Review Repetition & Similarity:** TF-IDF n-gram vectorization and cosine similarity ($\ge 0.80$) to surface copy-paste review clusters within the same listing.
3. **Sentiment & Rating Discordance:** VADER sentiment polarity compared against star ratings to identify anomalous positive text with 1★ ratings or negative complaints with 5★ ratings.
4. **Writing Style & Stylometry:** Evaluation of excessive capitalization, exclamation mark bursts, and repetitive punctuation.
5. **Multimodal Visual & Packaging Consistency:** Cryptographic SHA-256 and perceptual dHash image hashing paired with native WinRT OCR text extraction to verify packaging-to-listing consistency.
6. **Cautious Seller Modeling:** Strict isolation of brand display names from verified merchant account tokens.
7. **Explainable Risk Engine:** Modular evidence synthesis producing risk tiers (LOW, MODERATE, ELEVATED, HIGH), confidence scores (0.0 to 1.0), and auditable evidence findings.

---

## 3. Directory Layout

```text
ai-based-marketplace-analyzer/
├── data/
│   ├── dataset_manifest.json          → Machine-readable provenance and capability manifest
│   ├── raw/                           → Immutable source data (Amazon, Walmart, BestBuy, Benchmarks, Images)
│   ├── interim/                       → Relational dense cohorts, pricing cohort, image manifest
│   └── processed/                     → Canonical products, reviews, and images
├── docs/                              → Data dictionary, leakage guidelines, dataset selection
├── notebooks/                         → Structured exploratory and experimental notebooks (01 to 04)
├── reports/                           → Generated dataset audit and validation reports
├── src/
│   ├── data/                          → Canonical schema, acquisition, and normalization pipeline
│   ├── features/                      → Category-relative pricing anomaly detection
│   ├── nlp/                           → Review similarity, sentiment discordance, stylometry
│   ├── vision/                        → Cryptographic & perceptual hashing, WinRT OCR consistency
│   ├── risk/                          → Explainable multimodal risk scoring engine
│   └── utils/                         → Reliable DNS fallback & download utilities
├── tests/                             → Automated unit and integration test suite
└── run_tests.py                       → Deterministic test runner
```

---

## 4. Execution Commands

### Run Automated Tests
```powershell
.\.venv\Scripts\python.exe run_tests.py
```

### Run Dataset Integrity Validation
```powershell
.\.venv\Scripts\python.exe -m src.validate_dataset_integrity
```

### Rebuild Canonical Datasets
```powershell
.\.venv\Scripts\python.exe -m src.data.pipeline
```

### Regenerate Dataset Manifest
```powershell
.\.venv\Scripts\python.exe -m src.generate_dataset_manifest
```
