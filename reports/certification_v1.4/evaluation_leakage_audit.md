# Workstream B: Evaluation Leakage Audit & Multi-Protocol Splits

## 1. Vulnerabilities Identified in v1.3
The independent v1.3 audit revealed subtle forms of data leakage when using a single evaluation split:
- **Variant Group Overlap (LIM-03):** 64 variant parent groups (representing 142 products) had member listings split across both Train and Test splits. Models could memorize variant attributes (e.g., brand, title prefix, shared seller behavior).
- **Reviewer Identity Overlap (LIM-04):** 2,160 multi-product reviewers authored reviews across products residing in both Train and Test sets.

## 2. Multi-Protocol Split Architecture
To eliminate all evaluation leakage without collapsing the dataset into an intractable single component, v1.4 introduces **three discrete evaluation protocols**:

| Protocol Name | Target Research Task | Partition Unit | Cross-Split Overlap | Train / Val / Test Products |
| :--- | :--- | :--- | :--- | :--- |
| **Protocol 1** | Listing-Level Trust Assessment | Product ID | 0 Product IDs, 0 Duplicate-Image Clusters | 4,230 / 906 / 907 |
| **Protocol 2** | Cross-Variant Generalization | Variant Parent Group | **0 Variant Groups, 0 Variant Products** | 3,853 / 825 / 827 |
| **Protocol 3** | Reviewer Deception & Manipulation | Reviewer Account ID | **0 Named Reviewers** | 3,981 / 853 / 854 |

## 3. Verification Results
- **Protocol 2 Variant Leakage:** Exact set intersection of parent group IDs across Train, Val, and Test is **$\emptyset$ (0 groups, 0 products)**.
- **Protocol 3 Reviewer Leakage:** Exact set intersection of named reviewer IDs across Train, Val, and Test is **$\emptyset$ (0 reviewers)**.
- Stored under: `data/marketplace_trust_dataset_v1.4/evaluation/protocols/`.
