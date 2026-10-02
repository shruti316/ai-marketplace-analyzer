# Data Dictionary

## Dataset

The initial working dataset is a 20,000-review sample from the Amazon Reviews'23 All_Beauty category.

The dataset combines Amazon review information with product metadata using `parent_asin`.

## Review Features

| Column | Description | Data Type | Role |
|---|---|---|---|
| `rating` | Rating given by the reviewer | Numeric | Review analysis |
| `title_review` | Title of the customer review | Text | NLP |
| `text` | Full customer review text | Text | NLP |
| `asin` | Amazon product/item identifier associated with the review | String | Reference |
| `parent_asin` | Parent product identifier used to connect reviews with product metadata | String | Join key |
| `user_id` | Anonymous reviewer identifier | String | Reviewer analysis |
| `timestamp` | Time when the review was created | Integer/Date | Temporal analysis |
| `helpful_vote` | Number of helpful votes received by the review | Numeric | Review analysis |
| `verified_purchase` | Indicates whether the review is associated with a verified purchase | Boolean | Review-risk analysis |

## Product Features

| Column | Description | Data Type | Role |
|---|---|---|---|
| `main_category` | Main Amazon product category | Text | Product analysis |
| `title_product` | Product title | Text | Product/NLP analysis |
| `average_rating` | Average rating associated with the product | Numeric | Product analysis |
| `rating_number` | Number of ratings associated with the product | Numeric | Product analysis |
| `price` | Product price in the dataset | Numeric | Price-risk analysis |
| `store` | Store/brand information associated with the product | Text | Product analysis |
| `details` | Additional product details | Structured/Text | Product analysis |
| `parent_asin` | Product identifier shared with review records | String | Join key |

## Engineered Features

| Feature | Description | Purpose |
|---|---|---|
| `review_length` | Number of characters in the review text | Review behavior analysis |
| `reviews_per_product` | Number of sampled reviews associated with a product | Product/review analysis |

## Dataset Structure

The data is organized into three main layers:

```text
Raw Data
   ↓
Interim Data
   ↓
Processed Data