# Knowledge Graph Topology & Integrity Report — Indian Marketplace Trust Dataset v1.4

## 1. Executive Summary
Evaluates the graph schema, relational distribution, and structural integrity of the multi-relational Knowledge Graph.

## 2. Graph Size & Edge Distribution
- **Total Graph Edges:** 30,229 typed edges.
- **Edge Type Breakdown:**
- **`HAS_IMAGE`**: 4,708 edges
- **`HAS_PRICE_OBSERVATION`**: 3,667 edges
- **`HAS_REVIEW`**: 3,659 edges
- **`HAS_LISTING`**: 3,643 edges
- **`HAS_VARIANT`**: 3,643 edges
- **`HOSTED_ON_PLATFORM`**: 3,643 edges
- **`BELONGS_TO_BRAND`**: 3,643 edges
- **`HAS_PRICE`**: 3,623 edges

## 3. Structural Integrity Constraints
- **Self-Loops:** Exactly 0 self-loops ($source \neq target$ for all edges).
- **Orphaned Nodes:** Exactly 0 orphaned nodes.
- **Misleading Seller Edges:** Exactly 0 misleading `SOLD_BY` platform edges.
- **Brand Grounding:** Exactly 3,643 `BELONGS_TO_BRAND` edges linking every catalog product to a registered brand node.
