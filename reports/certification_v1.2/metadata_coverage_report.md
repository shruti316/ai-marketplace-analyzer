# Product Metadata and Attribute Coverage Report (v1.2)

## 1. Field Availability Across Catalog

| Field Name | Completeness (%) | Populated Count | Missing Count | Handling Strategy |
| :--- | :---: | :---: | :---: | :--- |
| `canonical_product_id` | 100.0% | 6,043 | 0 | Primary Key (prefix-normalized) |
| `marketplace` | 100.0% | 6,043 | 0 | Categorical slug |
| `source_product_id` | 100.0% | 6,043 | 0 | Upstream identifier preserved |
| `country` | 100.0% | 6,043 | 0 | ISO 3166-1 alpha-2 (`IN` / `US`) |
| `currency` | 100.0% | 6,043 | 0 | ISO 4217 (`INR` / `USD`) |
| `product_title` | 100.0% | 6,043 | 0 | Cleaned text headline |
| `brand` | 98.4% | 5,946 | 97 | Categorized as 'Unknown' when absent |
| `category` | 100.0% | 6,043 | 0 | Harmonized high-level category |
| `product_description` | 96.1% | 5,807 | 236 | Detailed description or provenance note |
| `extracted_attributes_json` | 100.0% | 6,043 | 0 | Raw specification JSON payload |
| `seller_id` | 0.0% | 0 | 6,043 | Honestly null |
