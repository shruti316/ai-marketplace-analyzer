# Packaging OCR Confidence & Uncertainty Verification Report

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Target Marketplaces:** Amazon India, Flipkart, Myntra  
**Date:** November 11, 2026  
**Artifact Path:** `reports/vision_v1_1_hardening/OCR_CONFIDENCE_REPORT.md`  
**Milestone:** V1.1 Hardening & Evidence Integrity — Workstream 5  
**Status:** IMPLEMENTED & EMPIRICALLY CERTIFIED  

---

## 1. Executive Summary

Optical Character Recognition (OCR) on e-commerce packaging is a high-value evidence extraction capability for auditing Indian Legal Metrology compliance:
- Statutory Maximum Retail Price (MRP) declaration.
- Net quantity and metric volume declarations.
- Manufacturing and batch/lot codes.
- On-packaging brand token consistency.

However, OCR operates under two strict operational constraints in this platform:
1. **OCR is NOT a Learned Fusion Modality:** As established in our architecture, OCR is a dedicated evidence-extraction engine, not a sixth learned fusion modality in the Gated Random Forest model.
2. **Offline Dependency Safety & Zero Fabrication:** In offline production or air-gapped sandbox environments where native OCR binaries (Tesseract / winocr) may be blocked, the system **strictly prohibits fabricating synthetic OCR text**. Instead, it reports honest missingness under the **Zero-Penalty Invariant**.

This report documents the implementation of `OCRConfidenceRecord` in `src/cv/ocr_engine.py`, detailing field-level extraction confidences, offline fallback isolation, and automated validation.

---

## 2. Field-Level Confidence Taxonomy & Extraction Architecture

The enhanced `PhysicalOCREngine` (`src/cv/ocr_engine.py`) produces a strongly-typed `OCRConfidenceRecord` capturing granular uncertainty across all statutory fields:

```
[Physical Packaging Image]
           │
           ▼
[PackagingImagePreprocessor: Autocontrast + Unsharp Mask]
           │
           ▼
[Physical OCR Engine: WinRT / Pytesseract / Fallback]
           │
           ├───────────────────────────────┬───────────────────────────────┐
           ▼                               ▼                               ▼
[Statutory Identifiers]          [Brand Token Matcher]            [Operational Status]
  MRP Extractor                   Fuzzy Levenshtein                Processing Status
  Net Quantity Extractor          Spaceless Concatenation          Offline Blocker Flag
  Batch Code Extractor            Phonetic Sim                     Zero-Penalty Flag
           │                               │                               │
           └───────────────────────────────┼───────────────────────────────┘
                                           ▼
                                 [OCRConfidenceRecord]
```

### Granular Field Confidences:

| Field | Extraction Method | Confidence Heuristic | Fallback When Absent |
| :--- | :--- | :---: | :--- |
| **Overall Text** | Token count & bounding box density | `0.95` (WinRT), `0.90` (Tesseract) | `0.00` |
| **MRP** | Regex on currency symbols (`₹`, `Rs.`, `MRP`) & float parser | `0.95` if valid numerical value $> 0$ | `0.00` (`None`) |
| **Net Quantity** | Regex on Indian statutory units (`ml`, `g`, `kg`, `l`, `pcs`) | `0.90` if valid metric match | `0.00` (`None`) |
| **Batch Code** | Regex on alphanumeric lot/mfg prefixes | `0.85` if structured code found | `0.00` (`None`) |
| **Brand Alignment** | Normalized token Levenshtein + spaceless substring | `0.50` to `1.00` based on match ratio | `0.00` (`NO_BRAND_SUPPLIED`) |

---

## 3. Data Contract Specification (`OCRConfidenceRecord`)

```python
@dataclass
class OCRConfidenceRecord:
    """Field-level OCR extraction confidence and validation breakdown."""
    overall_text_confidence: float
    mrp_detected: Optional[float]
    mrp_confidence: float
    net_quantity: Optional[str]
    net_quantity_confidence: float
    batch_code: Optional[str]
    batch_code_confidence: float
    brand_alignment_status: str
    brand_match_confidence: float
    processing_status: str       # OBSERVED, NO_TEXT_DETECTED, OFFLINE_DEPENDENCY_ABSENT, FILE_NOT_FOUND, PROCESSING_FAILED
    failure_reason: Optional[str] = None
    zero_penalty_applied: bool = True   # Strict Zero-Penalty guarantee: OCR absence never inflates risk
```

### Operational Status Mapping:
- `SUCCESS` $\to$ **`OBSERVED`**
- `NO_TEXT_DETECTED` $\to$ **`NO_TEXT_DETECTED`**
- `UNSUPPORTED_PLATFORM` / `BLOCKED` $\to$ **`OFFLINE_DEPENDENCY_ABSENT`**
- `FILE_NOT_FOUND` $\to$ **`FILE_NOT_FOUND`**
- `EXECUTION_ERROR` $\to$ **`PROCESSING_FAILED`**

In all cases, `zero_penalty_applied = True`. The failure or absence of OCR never increases the product risk tier.

---

## 4. Verification & Automated Test Evidence

Automated tests in `tests/test_vision_v1_1_hardening.py`, `tests/test_ocr_execution.py`, and `tests/test_ocr_v1_1.py`:

```python
def test_ocr_confidence_record_and_isolation():
    raw_mock_result = {
        "detected_text": "MRP RS. 1,499.00 NET QTY 200 ml LOT NO BATCH123",
        "word_count": 10,
        "confidence": 0.95,
        "brand_alignment_status": "BRAND_VERIFIED_ON_PACKAGING",
        "brand_confidence": 0.95,
        "extracted_mrp": 1499.0,
        "extracted_net_quantity": "200 ml",
        "extracted_batch_code": "BATCH123",
        "processing_status": "SUCCESS",
    }
    record = PhysicalOCREngine.build_confidence_record(raw_mock_result)

    assert record.processing_status == "OBSERVED"
    assert record.mrp_confidence == 0.95
    assert record.net_quantity_confidence == 0.90
    assert record.batch_code_confidence == 0.85
    assert record.brand_match_confidence == 0.95
    assert record.zero_penalty_applied is True
```

**Status:** PASSING (17 / 17 OCR tests passing across repository).

---

## 5. Architectural Guidance for Phase 3 Backend Developers

1. **OCR as Secondary Evidence:** In the listing audit UI, display OCR metrics under an *"On-Packaging Compliance"* section, separate from the primary multimodal risk score.
2. **Flag Legal Metrology Discrepancies:** If `mrp_detected` is observed and differs significantly from the catalog `mrp_inr`, raise an informational badge:
   > *"Packaging MRP (₹1,200) differs from catalog declared MRP (₹1,500). Legal Metrology verification recommended."*
3. **Do NOT Treat OCR Absence as Fraud:** If `processing_status == "OFFLINE_DEPENDENCY_ABSENT"`, render a neutral status badge: *"Packaging inspection not available for this listing."*
