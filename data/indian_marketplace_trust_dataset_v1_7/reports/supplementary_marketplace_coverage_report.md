# Supplementary Marketplace Coverage and Architecture Report

> [!NOTE]
> **Supplementary Cohort**: 2,400 products (39.72% of master catalog) from Amazon US, BestBuy, and Walmart.

---

## 1. Role and Strategic Purpose of Supplementary Data

While the platform's primary mission focuses on Indian e-commerce, supplementary international data serves four vital technical purposes:
1. **Multimodal Ground Truth Calibration**: Providing established multimodal baselines (Tier A Gold 100) where complete 4-modality evidence exists with verified ground-truth labels.
2. **Dense Rating-Text Modeling**: BestBuy's 44,965 reviews provide dense statistical distributions of sentiment, rating mismatch, and review duplication patterns that cannot be derived from sparse catalogs.
3. **Cross-Marketplace Generalization**: Evaluating whether NLP, CV, and pricing anomaly models trained on international benchmarks successfully transfer to Indian marketplaces.
4. **Controlled Disjoint Partitioning**: The 2,400 supplementary cohort is strictly isolated from Indian entities, ensuring that Indian metrics are never diluted or confounded.

---

## 2. Cohort Composition (2,400 Products)

The 2,400 supplementary products were deterministically sampled into disjoint cohorts based on evidence density:

| Cohort Name | Marketplace | Product Count | Review Count | Local Images | Price Coverage | Tier Assignment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Amazon US Gold 100** | Amazon US | 100 | 2,667 | 100 (100.0%) | 100 USD (100.0%) | **Tier A: Complete Multimodal** |
| **Amazon US Multi-Category** | Amazon US | 420 | 0 | 420 (100.0%) | 420 USD (100.0%) | **Tier B: Partial Modalities** |
| **BestBuy Dense Reviews** | BestBuy | 249 | 44,965 | 0 (0.0%) | 249 USD (100.0%) | **Tier B: Partial Modalities** |
| **Amazon US Review-Dense** | Amazon US | 500 | 548 | 0 (0.0%) | 500 USD (100.0%) | **Tier B: Partial Modalities** |
| **Walmart Reference Catalog** | Walmart | 1,131 | 0 | 0 (0.0%) | 312 USD (27.6%) | **Tier B: Partial Modalities** |
| **Total Supplementary** | **Combined** | **2,400** | **48,180** | **520 (21.7%)** | **1,581 (65.9%)** | **100 Tier A / 2,300 Tier B** |

---

## 3. Disjointness and Attribution Clarification

During previous audits, ambiguity existed regarding the marketplace attribution of the 420 multi-category cache products. Forensic inspection of image URLs, metadata filenames, and ASIN patterns confirmed:
- All **420 products** belong to Amazon US (`marketplace: amazon`), spanning Clothing (95), Home (91), Electronics (78), Toys (73), Books (58), and Other (25).
- BestBuy has exactly **249 products** (`marketplace: bestbuy`), all belonging to Consumer Electronics.
- Walmart has exactly **1,131 products** (`marketplace: walmart`), covering General Merchandise and Groceries.

There is zero overlap between supplementary product IDs and Indian product IDs. Foreign marketplace records are strictly barred from the `INDIAN_MARKETPLACE` domain partition.
