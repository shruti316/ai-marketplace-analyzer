# Data Dictionary: Indian Marketplace Trust Dataset v1.5
**Release Version:** v1.5  
**Directory Path:** [`data/indian_marketplace_trust_dataset_v1_5/`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/)  
**Release Checkpoint:** Combined Milestone 3 + 4 Finalization  

---

## Directory Overview

The v1.5 dataset consists of 48 self-contained files organized across 7 functional partitions:

```
data/indian_marketplace_trust_dataset_v1_5/
├── entities/                   # Normalized core domain entities (6 tables)
├── evidence/                   # Raw observed marketplace evidence (5 tables)
├── annotations/                # Gold, silver, and queued ground truth (7 files)
├── derived_evidence/           # Enriched NLP, CV, graph, and fusion features (12 files)
├── relationships/              # Knowledge graph edges (1 table)
├── benchmarks/                 # Zero-leakage train/val/test splits (4 files)
├── manifests/                  # Dataset manifest & SHA-256 checksums (3 files)
└── reports/                    # Self-contained audit and certification reports (10 files)
```

---

## 1. Entities (`entities/`)

| File Name | Record Count | Description | Primary Key | Key Foreign Keys |
| :--- | :--- | :--- | :--- | :--- |
| [`products.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/entities/products.parquet) | 3,643 | Canonical marketplace products | `canonical_product_id` | `brand_id`, `platform_id` |
| [`listings.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/entities/listings.parquet) | 3,643 | Platform-specific merchant listings | `listing_id` | `canonical_product_id`, `seller_id`, `platform_id` |
| [`brands.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/entities/brands.parquet) | 1,593 | Canonical brand registry with deduplicated casing & alias lists | `brand_id` | N/A |
| [`sellers.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/entities/sellers.parquet) | 3 | Platform aggregate seller nodes (`amazon_in`, `flipkart`, `myntra`) | `seller_id` | `platform_id` |
| [`variants.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/entities/variants.parquet) | 3,643 | Factual variant attributes (size, color, pattern, sleeve, etc.) | `variant_id` | `canonical_product_id`, `parent_product_id` |
| [`platforms.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/entities/platforms.parquet) | 3 | Marketplace platform nodes (`PLATFORM_AMAZON_IN`, `PLATFORM_FLIPKART`, `PLATFORM_MYNTRA`) | `platform_id` | N/A |

---

## 2. Raw Evidence (`evidence/`)

| File Name | Record Count | Description | Primary Key | Key Fields |
| :--- | :--- | :--- | :--- | :--- |
| [`reviews.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/evidence/reviews.parquet) | 3,659 | Raw customer reviews across Flipkart (3,500) and Amazon India (159) | `review_id` | `review_text_original`, `rating`, `review_date`, `language` |
| [`images.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/evidence/images.parquet) | 5,034 | Image metadata (4,708 usable images physically verified on disk) | `image_id` | `local_path`, `width`, `height`, `sha256`, `perceptual_hash_dhash` |
| [`price_observations.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/evidence/price_observations.parquet) | 3,667 | Append-only pricing observations with INR currency normalization | `observation_id` | `listing_id`, `price_inr`, `mrp_inr`, `observation_date` |
| [`ocr_evidence.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/evidence/ocr_evidence.parquet) | 100 | Audited physical OCR attempts (blocked offline status, 0 false text) | `ocr_record_id` | `image_id`, `ocr_engine`, `processing_status`, `failure_reason` |
| [`title_token_packaging_proxy.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/evidence/title_token_packaging_proxy.parquet) | 1,000 | Isolated title-token packaging proxy records | `proxy_id` | `image_id`, `detected_text`, `proxy_method`, `proxy_confidence` |

---

## 3. Derived Multimodal Evidence (`derived_evidence/`)

| File Name | Record Count | Description | Primary Key | Key Features |
| :--- | :--- | :--- | :--- | :--- |
| [`review_nlp_features.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/derived_evidence/review_nlp_features.parquet) | 3,659 | NLP feature extraction, language, sentiment, ABSA, and manipulation signals | `review_id` | `sentiment_score`, `rating_discordance_score`, `aspect_*`, `REVIEW_SIMILARITY_SIGNAL` |
| [`review_similarity_clusters.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/derived_evidence/review_similarity_clusters.parquet) | 143 | Exact text duplicate clusters | `cluster_id` | `member_count`, `unique_product_count`, `sample_text`, `text_hash` |
| [`image_intelligence_features.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/derived_evidence/image_intelligence_features.parquet) | 4,708 | Per-image validations, formats, aspect ratios, perceptual hashes | `image_id` | `aspect_ratio`, `sha256_hash`, `dhash`, `is_cross_product_image_reuse` |
| [`image_similarity_pairs.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/derived_evidence/image_similarity_pairs.parquet) | 2,936 | Near-duplicate image pairs with centered cosine similarity $\ge 0.90$ | `image_pair_id`| `image_id_1`, `image_id_2`, `similarity_score`, `is_cross_product` |
| [`image_clusters.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/derived_evidence/image_clusters.parquet) | 694 | Connected component visual similarity clusters ($\cos \ge 0.95$) | `cluster_id` | `image_count`, `member_image_ids` |
| [`visual_embeddings_resnet18.npz`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/derived_evidence/visual_embeddings_resnet18.npz) | 4,708 | 512-dim unit L2-normalized ResNet-18 visual feature vectors | `image_ids` | `normalized_embeddings` (4708, 512), `l2_normalized: True` |
| [`multimodal_evidence_records.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/derived_evidence/multimodal_evidence_records.parquet) | 9,072 | Atomic multimodal evidence observations across all 5 modalities | `evidence_id` | `evidence_modality`, `evidence_signal_name`, `signal_severity`, `confidence` |
| [`product_multimodal_summary.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/derived_evidence/product_multimodal_summary.parquet) | 3,643 | Product-level aggregation with explicit missing modality handling | `canonical_product_id`| `review_modality_status`, `image_modality_status`, `provisional_risk_tier` |
| [`image_text_consistency.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/derived_evidence/image_text_consistency.parquet) | 1 | Vision-Language dependency audit record | `consistency_record_id` | `execution_status: BLOCKED_OFFLINE_DEPENDENCY_ABSENT` |
| [`pricing_features.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/derived_evidence/pricing_features.parquet) | 3,643 | Pricing corridors, median reference, robust z-scores | `canonical_product_id`| `robust_z_score`, `is_price_outlier` |
| [`seller_features.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/derived_evidence/seller_features.parquet) | 3 | Seller platform features and resolution status | `seller_id` | `is_merchant_resolved`, `platform_id` |
| [`multimodal_coverage_matrix.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/derived_evidence/multimodal_coverage_matrix.parquet) | 3,643 | Complete product-level modality coverage registry | `canonical_product_id`| `review_status`, `image_status`, `price_status`, `coverage_tier` |

---

## 4. Annotations (`annotations/`)

| File Name | Record Count | Description | Primary Key | Key Attributes |
| :--- | :--- | :--- | :--- | :--- |
| [`review_human_annotations.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/annotations/review_human_annotations.parquet) | 100 | Audited single-annotator provisional labels (`TIER_2_PROVISIONAL_SINGLE_ANNOTATOR`) | `annotation_id` | `authenticity_label`, `sentiment_label`, `provenance_classification` |
| [`review_silver_annotations.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/annotations/review_silver_annotations.parquet) | 600 | Isolated rule-based pseudo-labels for semi-supervised pretraining | `annotation_id` | `annotation_benchmark_tier: SILVER_HEURISTIC` |
| [`human_annotation_pending_tasks.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/annotations/human_annotation_pending_tasks.parquet) | 500 | Queued pending annotation tasks | `task_id` | `workflow_status: QUEUED_PENDING_ANNOTATION` |
| [`annotation_task_queue_v1_5.json`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/annotations/annotation_task_queue_v1_5.json) | 500 tasks | Active exportable dual-annotator task queue | `task_id` | Full guidelines & submission slots for Annotator 1, Annotator 2, Adjudicator |
| [`image_annotations.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/annotations/image_annotations.parquet) | 250 | Catalog image matching annotations | `annotation_id` | `visual_matching_label`, `provenance` |
| [`listing_annotations.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/annotations/listing_annotations.parquet) | 250 | Listing consistency and price corridor annotations | `annotation_id` | `listing_integrity_label`, `provenance` |
| [`annotation_guidelines.md`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/annotations/annotation_guidelines.md) | N/A | Human annotation guidelines document | N/A | Operational instructions and edge case definitions |

---

## 5. Benchmarks & Relationships

- **[`relationships/entity_relationships.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/relationships/entity_relationships.parquet):** 30,229 typed graph edges connecting products, listings, brands, sellers, variants, reviews, and images.
- **Benchmarks:** Zero-leakage connected component splits (Train: 2,550 products / 70%, Validation: 546 products / 15%, Test: 547 products / 15%). 0 product overlap, 0 variant family overlap, 0 duplicate text cluster overlap.
