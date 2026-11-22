# Graph Relationship Intelligence Report
**Indian Marketplace Multimodal Trust Dataset v1.6**
*AI-Powered Indian Marketplace Trust Intelligence Platform*
*Release Date: November 9, 2026*

---

## 1. Executive Summary

A robust knowledge graph representation is central to detecting coordinated fraud rings, cross-catalog brand spoofing, image asset recycling, and merchant fulfillment risks across Indian e-commerce marketplaces.

Prior to Milestone 5, the knowledge graph in v1.5 contained 30,229 edges restricted exclusively to product-centric outbound links (`source_entity_type = 'PRODUCT'`). Milestone 5 executes a major structural expansion:
- Expanding total relationships from 30,229 to **41,372 verified edges** (+36.8% increase).
- Expanding relationship types from 8 to **12 distinct semantic types**.
- Introducing upward and downward listing linkages (`SELLER_OFFERS_LISTING`, `LISTING_OF_PRODUCT`, `LISTING_ON_PLATFORM`).
- Introducing peer-to-peer cross-product visual reuse edges (`SHARED_IMAGE_BETWEEN_PRODUCTS`).
- Enforcing 100% referential integrity with zero dangling or orphaned nodes.

---

## 2. Graph Schema and Topology

The expanded knowledge graph is a heterogeneous, multi-relational property graph. Every edge conforms to an 11-column strict schema:
`relationship_id`, `source_entity_id`, `source_entity_type`, `target_entity_id`, `target_entity_type`, `relationship_type`, `relationship_confidence`, `evidence_reference`, `detection_method`, `validation_status`, `provenance`.

### 2.1 Graph Topology Overview

```
                      [SELLER]
                         │ (SELLER_OFFERS_LISTING: 3,643)
                         ▼
                     [LISTING]
                    /    │    \
 (LISTING_ON_PLATFORM)   │   (HAS_LISTING: 3,643 [inv])
        3,643            │            │
          │              ▼            ▼
          │      [LISTING_OF_PRODUCT: 3,643]
          │              │
          ▼              ▼
     [PLATFORM] ◄──── [PRODUCT] ───────────────► [BRAND]
         ▲     (HOSTED_ON_PLATFORM: 3,643)  (BELONGS_TO_BRAND: 3,643)
         │               │
         │      ┌────────┼────────┐
         │      │        │        │
         ▼      ▼        ▼        ▼
       [IMAGE]       [REVIEW]   [PRICE_OBSERVATION]
     (HAS_IMAGE:    (HAS_REVIEW:  (HAS_PRICE_OBS: 3,667)
       4,708)         3,659)
         │
         │ (SHARED_IMAGE_BETWEEN_PRODUCTS: 214)
         ▼
     [PRODUCT_B]
```

---

## 3. Comprehensive Relationship Distribution

| Relationship Type | Source Type | Target Type | Edge Count | Confidence Range | Primary Evidence Reference |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`HAS_IMAGE`** | `PRODUCT` | `IMAGE` | 4,708 | 1.000 | Scraped Physical Image File Hash |
| **`HAS_PRICE_OBSERVATION`**| `PRODUCT` | `PRICE_OBSERVATION` | 3,667 | 1.000 | Ingested Price Observation Record |
| **`HAS_REVIEW`** | `PRODUCT` | `REVIEW` | 3,659 | 1.000 | Verified Customer Review Link |
| **`HAS_LISTING`** | `PRODUCT` | `LISTING` | 3,643 | 1.000 | Marketplace Catalog Ingestion Record |
| **`HAS_VARIANT`** | `PRODUCT` | `VARIANT` | 3,643 | 1.000 | Primary Catalog Variant Identity |
| **`HOSTED_ON_PLATFORM`** | `PRODUCT` | `PLATFORM` | 3,643 | 1.000 | Marketplace Domain Host Partition |
| **`BELONGS_TO_BRAND`** | `PRODUCT` | `BRAND` | 3,643 | 1.000 | Normalized Catalog Brand Attribute |
| **`SELLER_OFFERS_LISTING`**| `SELLER` | `LISTING` | **3,643** | 1.000 | Platform Aggregate Merchant Pool Link |
| **`LISTING_OF_PRODUCT`** | `LISTING` | `PRODUCT` | **3,643** | 1.000 | Canonical Product Identity Resolution |
| **`LISTING_ON_PLATFORM`** | `LISTING` | `PLATFORM` | **3,643** | 1.000 | Marketplace Domain Host Partition |
| **`HAS_PRICE`** | `PRODUCT` | `PRICE_OBSERVATION` | 3,623 | 1.000 | Historical Price Snapshot Edge |
| **`SHARED_IMAGE_BETWEEN_PRODUCTS`**| `PRODUCT` | `PRODUCT` | **214** | 0.950 – 1.000 | ResNet-18 Centered Cosine Similarity |
| **TOTAL EDGES** | — | — | **41,372** | — | **100% Zero Nulls Across All Edges** |

---

## 4. Key Graph Enhancements

### 4.1 Seller and Listing Linkage
- **`SELLER_OFFERS_LISTING` (3,643 edges):** Connects the 3 certified platform aggregate merchant entities (`SELLER_AGG_AMAZON_IN`, `SELLER_AGG_FLIPKART`, `SELLER_AGG_MYNTRA`) to their 3,643 individual catalog listings.
- **`LISTING_OF_PRODUCT` (3,643 edges):** Establishes the upward bipartite relationship from individual marketplace listings to their canonical resolved product master.
- **`LISTING_ON_PLATFORM` (3,643 edges):** Directly connects marketplace listings to their host platform entities (`PLATFORM_AMAZON_IN`, `PLATFORM_FLIPKART`, `PLATFORM_MYNTRA`).

### 4.2 Cross-Product Image Reuse Edges
- In Milestone 4, 300 cross-product image pairs were detected with centered ResNet-18 cosine similarity $\ge 0.95$ across 216 images.
- Deduplicating parallel image connections between identical product pairs yields exactly **214 unique undirected product-to-product edges** (`SHARED_IMAGE_BETWEEN_PRODUCTS`).
- **Edge Confidence:** Recorded as the maximum observed cosine similarity between the two products (range: 0.9500 to 1.0000).
- **Graph Utility:** Enables graph neural networks (GNNs) and community detection algorithms to instantly trace catalog-level asset hijacking, stock photo reuse, and unauthorized image cloning across independent products and brands.

---

## 5. Referential Integrity and Conformance Verification

Automated integrity verification confirmed:
1. **Source Referential Integrity:** 100% of `source_entity_id` values resolve to valid primary keys in their corresponding entity tables (`products`, `listings`, `sellers`).
2. **Target Referential Integrity:** 100% of `target_entity_id` values resolve to valid primary keys in their corresponding entity tables (`images`, `price_observations`, `reviews`, `listings`, `variants`, `platforms`, `brands`, `products`).
3. **No Dangling Nodes:** 0 orphaned edges exist in the dataset.
4. **Relationship ID Uniqueness:** All 41,372 relationship IDs are strictly unique.
5. **No Nulls:** Every record has non-null entries for all 11 schema columns.

The enriched relationship table is persisted at `data/indian_marketplace_trust_dataset_v1_6/relationships/entity_relationships.parquet`.
