# Data Leakage, Duplicate Cluster Isolation and Bias Audit Report (v1.1)

> [!IMPORTANT]
> **Audit Conclusion**: Zero product ID overlap and zero duplicate-image cluster leakage across Train, Validation, and Test partitions.

---

## 1. Leakage Vectors Audited

Machine learning models evaluating e-commerce trust are vulnerable to subtle forms of data leakage that yield inflated evaluation metrics:
1. **Product ID Leakage**: The same product appearing in both training and test sets.
2. **Duplicate Image Cluster Leakage**: Identical or perceptually matching images appearing in train and test sets across different product IDs.
3. **Seller / Brand Memorization**: Models learning seller-level fraud correlations rather than generalizable signals.
4. **Benchmark Contamination**: Synthetic or external benchmark labels leaking into general catalog training.

---

## 2. Empirical Leakage Verification

### 2.1 Product Entity Disjointness
- **Train Set**: 4,230 products ($70.00\%$)
- **Validation Set**: 906 products ($14.99\%$)
- **Test Set**: 907 products ($15.01\%$)
- **Total Partition Sum**: $4,230 + 906 + 907 = \mathbf{6,043} \text{ products}$ ($100.00\%$)

$$\text{Train} \cap \text{Val} = 0 \quad | \quad \text{Train} \cap \text{Test} = 0 \quad | \quad \text{Val} \cap \text{Test} = 0$$

**Result**: **Zero product ID overlap** ($100.00\%$ disjoint).

### 2.2 Duplicate Image Cluster Leakage Audit
In v1.0, individual products were assigned randomly, which risked assigning two products that share the exact same manufacturer image into Train and Test.

In v1.1, the evaluation partition algorithm executes **Union-Find clustering** across:
- 60 exact SHA-256 duplicate clusters (83 edges)
- 81 perceptual dHash ($d=0$) duplicate clusters (300 edges)

Every connected component of products sharing duplicate images is assigned atomically to a single split.

- **Audited Duplicate Pairs Crossing Train/Val Boundary**: **0 pairs**
- **Audited Duplicate Pairs Crossing Train/Test Boundary**: **0 pairs**
- **Audited Duplicate Pairs Crossing Val/Test Boundary**: **0 pairs**
- **Total Duplicate Image Leakage**: **0.00%** ($100.00\%$ leakage-free)

---

## 3. Modality and Marketplace Bias Mitigation

- **Indian vs Supplementary Stratification**: Both Indian ($60.28\%$) and Supplementary ($39.72\%$) cohorts are proportionally distributed across Train, Val, and Test.
- **Marketplace Coverage**: Every split contains products from all 6 marketplaces, enabling reliable cross-marketplace generalization testing.
