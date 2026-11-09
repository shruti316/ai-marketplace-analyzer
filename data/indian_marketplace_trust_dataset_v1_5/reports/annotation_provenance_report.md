# Annotation Quality & Provenance Audit Report
**Release Version:** Indian Marketplace Trust Dataset v1.5  
**Component:** Annotation Provenance and Active Annotation Queue  
**Audit Pipeline:** [`src/annotation/annotation_audit.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/annotation/annotation_audit.py)  
**Associated Tables:**
- [`annotations/review_human_annotations.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/annotations/review_human_annotations.parquet)
- [`annotations/review_silver_annotations.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/annotations/review_silver_annotations.parquet)
- [`annotations/human_annotation_pending_tasks.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/annotations/human_annotation_pending_tasks.parquet)
- [`annotations/annotation_task_queue_v1_5.json`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/annotations/annotation_task_queue_v1_5.json)
- [`annotations/image_annotations.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/annotations/image_annotations.parquet)
- [`annotations/listing_annotations.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/annotations/listing_annotations.parquet)

---

## 1. Audit of Human Review Annotations (100 Records)

An independent provenance audit of the 100 reported human review annotations in [`annotations/review_human_annotations.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/annotations/review_human_annotations.parquet) revealed the following structural properties:

### A. Provenance Findings
1. **Annotator Identity:** All 100 records were produced under a single identifier (`HUMAN_EXPERT_ANNOTATOR_01`).
2. **Timestamps:** 100% of the records share an identical batch timestamp (`2026-11-06T00:00:00+05:30`), indicating programmatic batch insertion rather than individual session logs.
3. **Inter-Annotator Agreement:** The column `inter_annotator_agreement_cohen_kappa` is `NaN` across all 100 records (100% null). Because only one annotator labeled each review, dual-blind agreement was never computed.
4. **Label Rationales:** The textual rationale strings are largely template duplicates (e.g. 98 records repeat `"Customer usage feedback without explicit counterfeit markers."`).
5. **Class Balance:**
   - `VERIFIED_GENUINE`: 83 records
   - `SUSPICIOUS`: 16 records
   - `VERIFIED_DECEPTIVE`: 1 record

### B. Reclassification & Governance Action
To preserve strict scientific integrity:
- These records are **NOT** presented as certified Gold-standard multi-annotator ground truth.
- A new classification column `provenance_classification = 'TIER_2_PROVISIONAL_SINGLE_ANNOTATOR'` has been added.
- `is_multi_annotator_adjudicated` is explicitly set to `False`.
- Audit notes document that these records represent exploratory single-annotator reviews requiring dual-blind adjudication before benchmark freezing.

---

## 2. Separation of Silver Pseudo-Labels (600 Records)

The 600 silver annotations in [`annotations/review_silver_annotations.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/annotations/review_silver_annotations.parquet) were verified to remain strictly isolated:
- `provenance` is set to `RULE_BASED_PSEUDO_LABEL`.
- `annotation_benchmark_tier` is marked as `SILVER_HEURISTIC`.
- These labels are strictly excluded from gold evaluation splits and are reserved for semi-supervised pretraining only.

---

## 3. Pending Annotation Queue (500 Tasks)

The 500 review records queued for human evaluation in [`annotations/human_annotation_pending_tasks.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/annotations/human_annotation_pending_tasks.parquet) remain in status `QUEUED_PENDING_ANNOTATION`.

To facilitate rigorous multi-annotator campaigns, an active JSON task queue has been exported to [`annotations/annotation_task_queue_v1_5.json`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/annotations/annotation_task_queue_v1_5.json).

### Task Queue Architecture
```json
{
  "queue_version": "v1.5",
  "total_pending_tasks": 500,
  "guidelines_reference": "annotations/annotation_guidelines.md",
  "tasks": [
    {
      "task_id": "human_task_flipkart_rev_00000",
      "review_id": "flipkart_rev_00000",
      "canonical_product_id": "flipkart_MOBEY23ZHYPFFHYM",
      "marketplace": "flipkart",
      "rating": 4.0,
      "review_text": "havent really used it much but its classy...",
      "workflow_status": "QUEUED_PENDING_ANNOTATION",
      "annotation_protocol": {
        "required_annotators": 2,
        "adjudication_required_on_disagreement": true,
        "fields_to_annotate": [
          "sentiment_polarity",
          "authenticity_label",
          "aspect_polarities",
          "supporting_evidence_span",
          "annotator_rationale"
        ]
      },
      "annotator_submissions": {
        "annotator_01": null,
        "annotator_02": null,
        "adjudicator": null
      }
    }
  ]
}
```

---

## 4. Audit of Image & Listing Annotations (250 Each)

### Image Annotations (250 Records)
In [`annotations/image_annotations.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/annotations/image_annotations.parquet):
- **`CORRECT_PRODUCT_HERO_MATCH`:** 200 records (80.0%) — Verified hero images matching product identity.
- **`LEGITIMATE_MANUFACTURER_IMAGE_REUSE`:** 39 records (15.6%) — Brand stock photos shared across retailers (legitimate catalog reuse).
- **`SUSPICIOUS_IMAGE_REUSE`:** 10 records (4.0%) — Cross-seller image duplication on non-brand listings.
- **`VARIANT_MISMATCH`:** 1 record (0.4%) — Incorrect color shown on variant listing.

### Listing Annotations (250 Records)
In [`annotations/listing_annotations.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/annotations/listing_annotations.parquet):
- **`VERIFIED_CONSISTENT`:** 200 records (80.0%) — Clean catalog listings.
- **`PRICE_ANOMALY_SIGNAL`:** 39 records (15.6%) — Price outlier without metadata deception.
- **`LISTING_INFORMATION_CONFLICT`:** 7 records (2.8%) — Title contradicts specifications.
- **`POTENTIAL_VARIANT_MISMATCH`:** 4 records (1.6%) — Size/color mismatch in bullet points.
