# Benchmark Partitioning & Leakage Elimination Report — Indian Marketplace Trust Dataset v1.4

## 1. Executive Summary
Evaluates the dual-grouping connected components splitting strategy across train, validation, and test partitions.

## 2. Partition Sizes & Ratios
- **Train Split:** 2,550 products (70.0%)
- **Validation Split:** 546 products (15.0%)
- **Test Split:** 547 products (15.0%)
- **Total Partitioned:** 3,643 products (100.0%)

## 3. Leakage Verification Results
- **Canonical Product ID Overlap:** Exactly 0 overlapping products across partitions.
- **Parent Product Model Variant Overlap:** Exactly 0 overlapping apparel parent models across partitions. All sibling variants reside in the same split.
- **Duplicate Review Text Cluster Overlap:** Exactly 0 overlapping duplicate review text clusters across partitions. All identical review texts reside in the same split.
