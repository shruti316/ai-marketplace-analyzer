# Research & Exploratory Data Analysis Notebooks

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Target Marketplaces:** Amazon India, Flipkart, Myntra  

This directory contains the sequential, numbered research notebooks documenting the exploratory data analysis (EDA), text feature extraction, sentiment analysis, and computer vision modeling phases.

---

## 1. Execution Sequence & Notebook Index

To reproduce the exploratory research trajectory, execute the notebooks in numerical order:

| Notebook | Focus & Research Objective | Output Artifacts |
|----------|----------------------------|------------------|
| [`01_eda.ipynb`](01_eda.ipynb) | Exploratory analysis across Amazon India, Flipkart, and Myntra catalog tables. Analysis of price dispersion, rating skews, and marketplace distributions. | Distribution summaries, category frequencies |
| [`02_data_cleaning.ipynb`](02_data_cleaning.ipynb) | Data normalization, currency conversion to INR, deduplication, handling missing values, and entity canonicalization. | Cleaned product and review datasets |
| [`03_text_features.ipynb`](03_text_features.ipynb) | Feature engineering for text: review length, lexical density, punctuation anomalies, and Hinglish token identification. | Tabular review NLP feature vectors |
| [`04_nlp_analysis.ipynb`](04_nlp_analysis.ipynb) | VADER sentiment scoring, rating-sentiment discordance quantification, aspect-based sentiment prototypes, and review clustering. | Sentiment calibration plots, discordance metrics |
| [`05_computer_vision.ipynb`](05_computer_vision.ipynb) | Difference hashing (dHash), ResNet-18 visual embedding extraction, hero image deduplication, and cross-seller image reuse clustering. | Visual hash tables, embedding clusters |
| [`hotel_benchmark_isolated.ipynb`](hotel_benchmark_isolated.ipynb) | Independent reference benchmark on public review deception datasets (Ott et al. Hotel Deceptive Opinion spam dataset) to validate NLP classifiers on external ground truth. | External NLP baseline validation metrics |

---

## 2. Execution Guidelines

- **Environment:** Run within the project virtual environment (`.venv`).
- **Dependencies:** Ensure all packages in `requirements.txt` are installed.
- **Data Dependency:** All notebooks read directly from certified datasets located in `data/` using relative paths (`../data/...`).
- **Reproducibility Note:** In accordance with platform governance, notebooks document historical research and feature discovery; production inference and evaluation are orchestrated through modular Python source code in `src/` and `tests/`.
