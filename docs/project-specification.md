# Dataset Selection Report

## 1. Data Strategy

The AI Marketplace Analyzer requires multiple types of data because marketplace risk cannot be determined from a single signal.

The project will use different datasets for different analysis modules instead of combining every dataset into one large file.

The main data sources will support:

- Product information
- Product pricing
- Customer reviews
- Review-risk analysis
- Product images
- Controlled evaluation cases

The overall data strategy is:

Amazon Reviews'23  
↓  
Product + Price + Review + Image Signals

Yelp Review Datasets  
↓  
Review-Risk Research

Amazon Product Images  
↓  
Image Signals

Controlled Benchmark  
↓  
System Evaluation

All Signals  
↓  
Risk Engine  
↓  
Risk Score + Confidence + Explanation


## 2. Primary Marketplace Dataset

### Amazon Reviews'23

Source: https://amazon-reviews-2023.github.io/

Amazon Reviews'23 is the primary dataset selected for the marketplace analysis component of this project.

It was collected by the McAuley Lab and contains large-scale Amazon product review and product metadata.

The dataset contains information about:

- Products
- Customers/reviewers
- Reviews
- Ratings
- Review text
- Review timestamps
- Verified purchases
- Helpful votes
- Product prices
- Product descriptions
- Product categories
- Product images
- Product stores
- Product features

Important review fields include:

- `rating`
- `title`
- `text`
- `images`
- `asin`
- `parent_asin`
- `user_id`
- `timestamp`
- `verified_purchase`
- `helpful_vote`

Important product metadata fields include:

- `main_category`
- `title`
- `average_rating`
- `rating_number`
- `features`
- `description`
- `price`
- `images`
- `videos`
- `store`
- `categories`
- `details`
- `parent_asin`

### Why Amazon Reviews'23 was selected

This dataset closely matches the marketplace-focused problem of the project.

It provides multiple signals that can eventually be analyzed together, including:

- Price
- Product information
- Customer reviews
- Ratings
- Purchase verification
- Review activity
- Product images

It also allows the project to study relationships between product-level and review-level information.

### Dataset limitation

Amazon Reviews'23 is extremely large, so downloading the entire dataset is unnecessary for this project.

A manageable category and sample will therefore be selected for development and experimentation.

The project will initially work with a controlled subset of the dataset rather than the complete Amazon dataset.


## 3. Review-Risk Research Dataset

### YelpCHI / YelpNYC / YelpZip

The project will also study publicly available Yelp review datasets for research related to deceptive or suspicious review behavior.

Potential datasets include:

- YelpCHI
- YelpNYC
- YelpZip

These datasets contain review information together with reviewer/business information and, in some versions, labels associated with filtered or suspicious reviews.

### Purpose

The Yelp datasets will NOT be treated as direct marketplace-product fraud data.

Instead, they will be used to:

- Study existing research on deceptive review detection
- Understand features associated with suspicious review behavior
- Compare possible review-level features
- Support experimentation with review-risk analysis

### Important limitation

Yelp datasets primarily represent restaurants and hospitality businesses rather than online product marketplaces.

Therefore, conclusions learned from Yelp data cannot automatically be assumed to apply to Amazon or other product marketplaces.

The project will clearly distinguish between:

1. Review-risk research
2. Marketplace-product risk analysis


## 4. Image Data

### Primary Image Strategy

Amazon Reviews'23 product metadata already contains product image information.

Therefore, the initial project will use the image references available through the Amazon dataset instead of immediately downloading a separate large image dataset.

This approach reduces unnecessary storage and keeps the image analysis connected to the corresponding product information.

Potential image signals may include:

- Image availability
- Number of product images
- Image quality
- Image dimensions
- Visual consistency
- Possible duplicate or highly similar images
- Visual features extracted using computer vision models

The exact image features will be finalized after inspecting the available data.


## 5. Optional Image Benchmark

### Amazon Berkeley Objects (ABO)

The Amazon Berkeley Objects dataset is considered as an optional dedicated image benchmark.

It contains a large collection of product listings and catalog images.

ABO may be considered later if the project requires a larger or more structured image dataset for computer vision experimentation.

It will NOT be downloaded during the initial setup unless the project requires it.

The initial approach is to use image information already associated with the Amazon Reviews'23 dataset.


## 6. Controlled Evaluation Benchmark

In addition to public datasets, the project will create a small controlled benchmark for evaluating the risk-analysis pipeline.

The benchmark will contain carefully designed cases representing different combinations of signals.

### Case A — Low-risk example

- Normal product description
- Reasonable price
- Consistent ratings
- Normal review activity
- Sufficient product information

### Case B — Price-risk example

- Unusually low price compared with similar products
- Otherwise limited warning signals

### Case C — Review-risk example

- Highly repetitive reviews
- Similar wording across multiple reviews
- Unusual rating distribution

### Case D — Information-risk example

- Missing product information
- Very limited description
- Few available reviews

### Case E — Multiple-signal example

- Unusually low price
- Suspicious review patterns
- Limited product information
- Potentially inconsistent image information

These cases will be used only for controlled testing and evaluation.

They will NOT be presented as confirmed real-world fraud cases.


## 7. Seller Data

Seller information is an important part of marketplace risk analysis.

However, the primary Amazon Reviews'23 dataset does not provide a complete and reliable seller-history dataset suitable for directly calculating long-term seller trustworthiness.

Therefore, the project will NOT fabricate seller information.

If suitable seller-level data becomes available later, additional features may include:

- Seller rating
- Seller review count
- Seller history
- Seller activity
- Seller consistency
- Seller tenure

Until such data is available, seller analysis will remain a future/optional component.


## 8. Data Architecture

The project will keep different datasets separated according to their purpose.

Amazon Reviews'23  
↓  
Product + Price + Review + Image Signals

Yelp Review Datasets  
↓  
Review-Risk Research

Controlled Benchmark  
↓  
Evaluation

All Signals  
↓  
Risk Engine  
↓  
Risk Score + Confidence + Explanation

The datasets will therefore NOT be merged into one large CSV file.

Each dataset will retain its original purpose and structure.


## 9. Initial Dataset Plan

For the first development phase, the project will use a manageable subset of Amazon Reviews'23.

The selected subset should contain enough information for:

- Product analysis
- Price analysis
- Review analysis
- Basic image analysis
- Exploratory data analysis

The selected category will be chosen after comparing available Amazon categories based on:

- Number of products
- Number of reviews
- Price availability
- Description availability
- Image availability
- Dataset size
- Data diversity
- Computational requirements

The initial dataset will be stored inside:

`data/raw/amazon/`

Processed versions will later be stored inside:

`data/processed/`

Temporary/intermediate files will be stored inside:

`data/interim/`


## 10. Data Processing Pipeline

The planned data flow is:

Raw Dataset  
↓  
Data Loading  
↓  
Data Inspection  
↓  
Data Cleaning  
↓  
Missing Value Analysis  
↓  
Feature Selection  
↓  
Feature Engineering  
↓  
Processed Dataset  
↓  
EDA / Model Development

The raw dataset will be kept separate from processed data so that the original data remains unchanged.


## 11. Planned Data Features

The exact features will be finalized after inspecting the selected dataset.

Potential product-level features include:

- Product ID
- Product title
- Product category
- Product price
- Average rating
- Number of ratings
- Product description
- Number of product features
- Number of product images
- Store information

Potential review-level features include:

- Review ID
- Product ID
- User ID
- Rating
- Review title
- Review text
- Review timestamp
- Verified purchase
- Helpful votes

Potential engineered features may include:

- Review length
- Rating deviation
- Review frequency
- Rating distribution
- Percentage of verified reviews
- Duplicate/repetitive review indicators
- Price deviation from category statistics
- Missing information indicators
- Image-count indicators

These features are candidates and will be finalized after exploratory data analysis.


## 12. Risk and Confidence

The system will keep two concepts separate.

### Risk

Risk represents the strength or number of warning signals detected in a marketplace listing.

A high risk score does NOT mean that fraud has been proven.

### Confidence

Confidence represents how reliable the system's assessment is based on factors such as:

- Amount of available data
- Data quality
- Model performance
- Signal consistency
- Agreement between different analysis modules

For example, a listing may have several warning signals but low confidence if very little data is available.

Therefore:

Risk ≠ Confidence

Both values will be displayed separately by the final system.


## 13. Data Leakage Prevention

The project will avoid using information that would not realistically be available at the time of analysis.

Examples of possible leakage include:

- Using future reviews to judge an earlier listing
- Using post-event information to calculate an earlier risk score
- Allowing evaluation data to influence model training
- Using target labels directly as model input

The dataset will therefore be divided carefully when machine-learning experiments are performed.

Where timestamps are available, temporal relationships will also be considered.

More detailed leakage rules will be documented in:

`docs/data-leakage.md`


## 14. Dataset Limitations

The project has several important limitations.

### 1. Dataset scale

Amazon Reviews'23 is extremely large, so only a manageable subset will initially be used.

### 2. Domain differences

Yelp data represents restaurants and hospitality businesses, while the main project focuses on product marketplaces.

### 3. Seller information

Complete seller-history information is not available in the primary dataset.

### 4. Ground truth

Public marketplace datasets do not necessarily provide a perfect real-world fraud label.

Therefore, the project will focus on identifying and combining risk signals rather than claiming definitive fraud detection.

### 5. Image availability

Some products may have incomplete or unavailable image information.

### 6. Dataset bias

Public datasets may contain sampling, category, geographic, temporal, or platform-specific biases.

These limitations will be considered when interpreting model results.


## 15. Dataset Selection Summary

| Dataset | Role | Status |
|---|---|---|
| Amazon Reviews'23 | Main marketplace dataset | Selected |
| YelpCHI | Review-risk research | Candidate |
| YelpNYC | Review-risk research | Candidate |
| YelpZip | Review-risk research | Candidate |
| Amazon Berkeley Objects | Optional image benchmark | Optional |
| Controlled benchmark | System evaluation | Selected |


## 16. Final Dataset Decision

The initial project will use Amazon Reviews'23 as the primary marketplace dataset.

The project will begin with a manageable category/sample rather than downloading the entire dataset.

Yelp datasets will be considered for research and experimentation related to deceptive review patterns.

Product image analysis will initially use image information associated with the Amazon dataset.

A controlled benchmark will be created to evaluate the complete risk-analysis pipeline.

Additional datasets may be introduced later if they provide information that is not available in the primary dataset.


## 17. Key Principle

The project is designed to identify marketplace risk signals, not to automatically declare that a seller, product, or review is fraudulent.

The final system should provide an interpretable assessment containing:

- Risk Score
- Risk Level
- Confidence
- Detected Signals
- Explanation

This approach allows the system to support human decision-making while clearly communicating uncertainty and data limitations.