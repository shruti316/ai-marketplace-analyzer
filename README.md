# AI Marketplace Analyzer

An AI-powered marketplace analysis system designed to analyze
product information, pricing, reviews, seller signals, and
visual information to identify potential marketplace risks
and provide explainable insights.

## Project Status

Week 1 — Project Foundation & Data Investigation

## Core Analysis Areas

- Price Analysis
- Product Text Analysis
- Review Analysis
- Image Analysis
- Seller Analysis
- Risk Scoring
- Explainable AI

## Technology Stack

- Python
- Pandas
- NumPy
- Scikit-learn
- NLP
- Computer Vision
- React
- Node.js
- MySQL

## Project Structure

```text
data/       → Dataset storage
docs/       → Project documentation
notebooks/  → Data analysis experiments
src/        → Application/ML source code
tests/      → Testing


## Current Project Progress

### Week 1 — Foundation & Data Preparation

- [x] Project specification defined
- [x] Research completed
- [x] Dataset strategy defined
- [x] Amazon Reviews'23 selected as the primary marketplace dataset
- [x] All_Beauty category selected for initial development
- [x] Project structure created
- [x] Python environment configured
- [x] GitHub repository configured
- [x] Amazon review dataset downloaded
- [x] Amazon product metadata downloaded
- [x] 20,000-review working dataset created
- [x] Review and product data connected using `parent_asin`
- [x] Initial exploratory data analysis completed
- [x] Data dictionary created
- [x] Initial EDA findings documented

### Current Dataset

The current working dataset contains 20,000 sampled Amazon All_Beauty reviews combined with corresponding product metadata.

Raw data is stored separately from interim and processed data to preserve the original datasets.

### Next Stage

### Week 2 — Data Cleaning & Feature Engineering

Planned tasks include:

- Data cleaning
- Missing-value handling
- Duplicate detection
- Text preprocessing
- Price normalization
- Feature engineering
- Review-risk features
- Product-level features
- Initial risk indicators