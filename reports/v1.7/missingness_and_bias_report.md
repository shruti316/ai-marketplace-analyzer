# Missingness, Bias & Dataset Representativeness Report — v1.7
## Marketplace Trust Intelligence Platform

**Execution Timestamp:** 2026-11-04  
**Total Catalog Entities:** 6,043 Products across 6 Marketplaces  
**Total Evidence Records:** 56,697 Reviews, 5,228 Images, 5,153 Valid Prices  

---

### 1. Systematic Missingness Matrix by Marketplace

| Marketplace | Total Products | Missing Price Rate | Missing Image Rate | Missing Review Rate | Missing 3rd-Party Seller ID |
|---|---:|---:|---:|---:|:---:|
| **amazon** | 1,020 | 60.88% | 49.02% | 21.57% | 100.0% |
| **amazon_in** | 1,500 | 1.0% | 0.0% | 99.67% | 100.0% |
| **bestbuy** | 249 | 100.0% | 100.0% | 0.0% | 100.0% |
| **flipkart** | 1,143 | 0.44% | 18.46% | 88.89% | 100.0% |
| **myntra** | 1,000 | 0.0% | 100.0% | 100.0% | 100.0% |
| **walmart** | 1,131 | 0.0% | 100.0% | 100.0% | 100.0% |

---

### 2. The Indian Representation Paradox: Products vs Evidence

| Modality Component | Indian Share | US / International Share | Imbalance Description |
|---|---:|---:|---|
| **Product Entities** | **60.28%** (3,643) | **39.72%** (2,400) | Indian products form the majority of the catalog. |
| **Customer Reviews** | **6.45%** (3,659) | **93.55%** (53,038) | US platforms (BestBuy + Amazon US) dominate review volume. |
| **Usable Images** | **90.05%** (4,708) | **9.95%** (520) | Indian scrapes (Flipkart + Amazon India) dominate image assets. |
| **Valid Prices** | **70.31%** (3,623) | **29.69%** (1,530) | High price completeness on Indian platforms. |
| **Native Indic Text** | **0.00%** (0) | **100.00%** (56,697 Latin) | All Indian reviews are written in Latin script/Hinglish. |

> [!WARNING]
> **Defensibility Declaration:**
> The dataset cannot be characterized as "balanced" or uniformly representative of Indian marketplace dynamics. While product inventory and image assets are predominantly Indian, customer review intelligence is heavily anchored in US retail data (BestBuy 79.31%). Any claim of generalizability to the wider Indian e-commerce landscape must disclose this structural asymmetry.
