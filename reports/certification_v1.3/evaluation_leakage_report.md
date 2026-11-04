# Evaluation Leakage and Partition Integrity Report (v1.2)

## 1. Partition Statistics

| Split | Product Count | Share (%) | Indian Products | Supplementary Products | Complete Multimodal (Tier A) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Train** | 4,230 | 70.00% | 2,550 | 1,680 | 213 |
| **Validation** | 906 | 14.99% | 546 | 360 | 46 |
| **Test** | 907 | 15.01% | 547 | 360 | 46 |
| **Total** | **6,043** | **100.00%** | **3,643** | **2,400** | **305** |

---

## 2. Leakage Verification Results
- **Product ID Overlap:** **0 products** (Train $\cap$ Val = $\emptyset$, Train $\cap$ Test = $\emptyset$, Val $\cap$ Test = $\emptyset$).
- **Duplicate Image Cluster Leakage:** **0 leaking clusters**. Union-Find connected components guarantee all duplicate images stay within the same partition.
