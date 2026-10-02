# Initial EDA Findings

## Dataset Overview

The initial exploratory data analysis was performed on a 20,000-record sample from the Amazon Reviews'23 All_Beauty category.

The working dataset combines review-level information with product metadata using `parent_asin`.

## Initial Observations

The dataset contains information covering:

- Product ratings
- Review text
- Review timestamps
- Verified purchase status
- Helpful votes
- Product prices
- Product average ratings
- Product rating counts
- Product categories
- Product/store information

## Review Analysis

The rating distribution was examined to understand how customer ratings are distributed across the sample.

Review text length was also calculated as an initial engineered feature. This will later support natural language processing and review-behavior analysis.

Verified and non-verified purchase reviews were compared to understand the structure of the available review data.

## Product Analysis

Product price distribution was examined to understand the range and spread of prices within the selected category.

The number of reviews associated with individual products was also analyzed. This can later be used as a product-level feature.

## Missing Data

Missing values were analyzed across the dataset.

Some product and review fields may contain missing information. These missing values will be handled during the data-cleaning and feature-engineering stage rather than being removed automatically.

## Initial Risk-Signal Ideas

The EDA suggests several potentially useful signals for later development:

- Product price
- Rating distribution
- Review length
- Verified purchase status
- Helpful votes
- Review volume
- Product rating count
- Missing product information

These are potential risk signals and are not considered proof of fraudulent activity.

## Current Conclusion

The initial Amazon dataset is suitable for continuing development of the AI Marketplace Analyzer.

The next stage will focus on data cleaning, feature engineering, and developing measurable risk indicators.