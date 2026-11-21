# Evidence Provenance & Traceability Report
**Indian Marketplace Multimodal Trust Dataset v1.7**
*AI-Powered Indian Marketplace Trust Intelligence Platform*
*Release Date: November 10, 2026*

---

## 1. Executive Summary

Scientific reproducibility and enterprise auditing demand unbroken data provenance. Every analytical conclusion produced by the Trust Intelligence Engine must trace directly back to empirical crawl records, verified corporate registries, or transparent mathematical pipelines.

This report documents the **Comprehensive Evidence Provenance Registry** for Dataset v1.7.

---

## 2. Upstream Data Sources & Primary Ingestion

All primary entities and evidence observations in Dataset v1.7 trace directly to verified PromptCloud Indian marketplace crawls conducted between October 28 and November 2, 2026:

| Source Identifier | Source File Path | Catalog Items | Captured Attributes | Upstream Omissions |
| :--- | :--- | :--- | :--- | :--- |
| `SRC_PROMPTCLOUD_AMZ_IN` | `data/indian_marketplace/raw/products/amazon_india_products_raw.csv` | 1,500 | Title, ASIN, Category tree, Selling price, MRP, Rating, Specifications JSON, Image URLs | 3rd-party merchant store IDs, merchant names, GSTINs |
| `SRC_PROMPTCLOUD_FK` | `data/indian_marketplace/raw/products/flipkart_products_raw.csv` | 1,143 | Title, PID, Category tree, Retail price, Discounted price, Brand, Specifications, Description | 3rd-party merchant store IDs, merchant ratings, GSTINs |
| `SRC_PROMPTCLOUD_MYN` | `data/indian_marketplace/raw/products/myntra_products_raw.csv` | 1,000 | Title, Product ID, Brand, Gender, Category, Subcategory, Colour, Style attributes, Pricing | 3rd-party merchant store IDs, customer reviews |

---

## 3. End-to-End Pipeline Lineage

```
Upstream Raw Crawls
├── Amazon India Raw (1,500 rows)
├── Flipkart Raw (1,143 rows)
└── Myntra Raw (1,000 rows)
        │
        ▼ (Milestone 2: Entity Finalization & Brand Normalization)
├── entities/products.parquet (3,643 canonical rows, products.seller_id 100% NULL)
├── entities/listings.parquet (3,643 listings, seller_id FK populated)
├── entities/brands.parquet (1,593 canonical brand entities)
├── entities/sellers.parquet (4 certified entities: 3 platform aggregates + 1 unresolved)
└── entities/platforms.parquet (3 active platform operators)
        │
        ▼ (Milestones 3 & 4: Review NLP & CV Intelligence)
├── evidence/reviews.parquet (3,659 customer reviews)
├── evidence/images.parquet (4,708 physical hero images)
├── derived_evidence/review_nlp_features.parquet (3,659 NLP enriched rows)
├── derived_evidence/image_intelligence_features.parquet (4,708 visual embedding rows)
└── derived_evidence/visual_embeddings_resnet18.npz (4,708 x 512 embedding matrix)
        │
        ▼ (Milestone 5: Advanced Pricing & Graph Enrichment)
├── evidence/price_observations.parquet (3,667 append-only price records)
├── derived_evidence/pricing_features.parquet (3,643 robust corridor rows)
├── derived_evidence/pricing_category_benchmarks.parquet (343 subcategory corridors)
├── derived_evidence/pricing_brand_benchmarks.parquet (1,608 brand benchmarks)
├── derived_evidence/seller_features.parquet (3 platform aggregate profiles)
└── relationships/entity_relationships.parquet (41,372 edges across 12 types)
        │
        ▼ (Milestone 6: Central Multimodal Trust Intelligence Engine)
├── derived_evidence/trust_assessments_products.parquet (3,643 product trust assessments)
├── derived_evidence/trust_assessments_listings.parquet (3,643 listing trust assessments)
└── derived_evidence/trust_assessments_sellers.parquet (4 seller governance assessments)
```

---

## 4. Atomic Evidence Schema & Field Traceability

Every evidence item created by `src/trust_engine/evidence_engine.py` conforms to the following provenance contract:

| Field | Source Origin | Example Value | Lineage Documentation |
| :--- | :--- | :--- | :--- |
| `evidence_id` | Deterministic Hash | `ev_price_obs_amazon_in_B000052YQN` | Uniquely identifies atomic evidence record. |
| `entity_id` | Table Primary Key | `amazon_in_B000052YQN` | Foreign key to primary entity table. |
| `evidence_modality`| Enumerated Type | `PRICING` | Review NLP, Image CV, Pricing, Seller, Graph, OCR. |
| `evidence_nature` | Tri-Tier Classification | `OBSERVED_EVIDENCE` | Observed empirical evidence vs heuristic vs model. |
| `detection_method` | Pipeline Component | `NON_PARAMETRIC_IQR_MAD_CORRIDOR` | Algorithmic method used to derive signal. |
| `confidence` | Mathematical Score | `0.9200` | Qualitative or statistical confidence in [0, 1]. |
| `provenance` | Source Crawl / Table | `SRC_PROMPTCLOUD_AMZ_IN` | Raw scrape origin or derived table identifier. |
| `evidence_limitations`| Governance Policy | *"Single point-in-time snapshot"* | Explicit disclosure of known limitations. |

---

## 5. Offline Dependency Blockers & Audit Integrity

Where external dependencies are unavailable in the offline sandbox environment, the platform strictly disclaims execution rather than inventing synthetic data:
1. **OCR Text Extraction (`OCR_DEPENDENCY_AUDIT`):**
   - Binary dependency on Tesseract / EasyOCR is absent.
   - Traceability: Documented as `BLOCKED_OFFLINE_DEPENDENCY_ABSENT`. Title tokens remain segregated in `evidence/title_token_packaging_proxy.parquet`.
2. **Vision-Language Alignment (`img_txt_audit_offline_blocker`):**
   - Pre-trained CLIP / BLIP weights are absent.
   - Traceability: Documented as `BLOCKED_OFFLINE_DEPENDENCY_ABSENT` in `derived_evidence/image_text_consistency.parquet`.
