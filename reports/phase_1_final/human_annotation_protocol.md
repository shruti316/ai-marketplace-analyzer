# Human Annotation Protocol v2.0 — Double-Blind Adjudication Specification

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Document:** `human_annotation_protocol.md`  
**Standard:** Double-Blind Dual-Annotator Review Authenticity Adjudication  
**Version:** 2.0.0  

---

## 1. System Architecture & Workflow Pipeline

The v2.0 human annotation workflow eliminates single-annotator bias by enforcing dual-annotator blinded submission, automated Cohen's Kappa tracking, and lead-adjudicator resolution.

```
       [Raw Review & Context Queue]
                     │
       ┌─────────────┴─────────────┐
       ▼                           ▼
[Annotator A]               [Annotator B]
(Blinded Submission)        (Blinded Submission)
       │                           │
       └─────────────┬─────────────┘
                     ▼
       [Automated Agreement Engine]
         ├── Compute Agreement & Kappa
         ├── If Labels Match: Verified Final Ground Truth
         └── If Labels Disagree: Route to Lead Adjudicator
                     │
                     ▼
         [Lead Adjudicator Queue]
         ├── Review Both Rationale Submissions
         ├── Inspect Behavioral Evidence & Graph Duplicate Clusters
         └── Assign Adjudicated Final Label
```

---

## 2. Protocol Specifications

### 2.1 Annotator Blindness
- Annotators evaluate reviews in randomized batch queues.
- Star ratings are visible as contextual data, but annotators are presented with a persistent guideline prompt: *"A 1-star review complaining about build quality is genuine criticism, NOT deceptive review fraud."*
- Annotators cannot see:
  1. The decisions of the other annotator.
  2. Historical labels from prior audit iterations.
  3. Upstream heuristic model predictions.

### 2.2 Record Schema
Every submission produces an immutable audit record:

```json
{
  "submission_id": "ann_sub_flipkart_rev_00270_ann01",
  "task_id": "task_rev_flipkart_rev_00270",
  "review_id": "flipkart_rev_00270",
  "annotator_id": "HUMAN_EXPERT_ANNOTATOR_01",
  "assigned_label": "VERIFIED_DECEPTIVE",
  "aspect_ratings": {
    "authenticity": "NEGATIVE",
    "quality": "NEGATIVE",
    "delivery": "NEUTRAL",
    "packaging": "NEUTRAL",
    "service": "NEUTRAL",
    "value": "NEUTRAL"
  },
  "rationale": "Explicit customer complaint regarding seller incentive for positive review.",
  "timestamp": 1794321600.0,
  "confidence": 0.95
}
```

### 2.3 Mathematical Inter-Annotator Agreement Formulation
For any paired annotation cohort of $N$ reviews across $k$ categories ($k=4$: `VERIFIED_GENUINE`, `SUSPICIOUS`, `VERIFIED_DECEPTIVE`, `UNCERTAIN`):

1. **Observed Agreement ($p_o$):**
   $$p_o = \frac{1}{N} \sum_{i=1}^N \mathbb{I}(y_{i, 1} = y_{i, 2})$$

2. **Expected Chance Agreement ($p_e$):**
   $$p_e = \sum_{c=1}^k \left( \frac{n_{c, 1}}{N} \times \frac{n_{c, 2}}{N} \right)$$
   where $n_{c, 1}$ and $n_{c, 2}$ are the counts of class $c$ assigned by Annotator 1 and Annotator 2, respectively.

3. **Cohen's Kappa ($\kappa$):**
   $$\kappa = \frac{p_o - p_e}{1 - p_e}$$

4. **Quality Gates:**
   - $\kappa \ge 0.70$: High inter-annotator reliability; eligible for model benchmarking.
   - $0.50 \le \kappa < 0.70$: Moderate agreement; guideline clarification session required.
   - $\kappa < 0.50$: Failed audit threshold; entire batch discarded and guidelines revised.

---

## 3. Disagreement Resolution & Adjudication Protocol

When $y_{i, 1} \ne y_{i, 2}$:
1. The agreement engine generates a `DisagreementTicket` containing:
   - Review text, listing title, brand, platform, and observed price.
   - Both annotators' labels and written rationale.
   - Cross-catalog duplicate review links (from `review_nlp_features.parquet`).
2. The Lead Adjudicator (`LEAD_ADJUDICATOR_01`) conducts independent inspection.
3. The final label is assigned as `adjudicated_final_label` with `adjudication_rationale`.
4. The record stores `is_multi_annotator_adjudicated = True` and links both submission IDs for audit transparency.
