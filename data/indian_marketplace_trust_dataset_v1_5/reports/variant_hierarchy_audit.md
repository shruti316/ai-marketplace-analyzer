# Product Variant Hierarchy Audit — Indian Marketplace Trust Dataset v1.4

## 1. Executive Summary
Evaluates the representation of product variants, parent-child hierarchies, and attribute factualness across the 3,643 catalog products.

## 2. Parent-Child Modeling for Apparel
- **Parent Product Models:** 959 distinct parent product models tracked for Myntra apparel using base product IDs (`parent_product_id = myntra_{base_pid}`).
- **Variant Linking:** Multi-size apparel items belonging to the same style/colorway are linked under their respective parent models.
- **Benchmark Leakage Protection:** Sibling variants under the same parent product model are guaranteed to reside in the exact same benchmark split.

## 3. Attribute Factualness & Elimination of Placeholders
- **'Standard' String Placeholders:** Exactly 0 instances exist across `colour`, `size`, `material`, and `model_number`.
- **Factual Attributes Extracted:** Factual sizes (e.g. S, M, L, XL, 32, 34), colors (e.g. Blue, Black, Red), and materials (e.g. Cotton, Silk, Stainless Steel) are extracted directly from listing text and specifications.
- **Explicit Null Preservation:** 2,171 unknown color attributes and 2,138 unknown material attributes are preserved as explicit nulls rather than manufactured strings.
