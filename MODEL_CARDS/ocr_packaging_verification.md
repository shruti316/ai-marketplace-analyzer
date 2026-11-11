# Model Card: Physical Packaging OCR Verification (`ocr_packaging_verification`)

## Model Details
- **Model Name:** Physical Packaging Brand & Statutory Identifier Extraction Engine
- **Model Version:** 1.3.0 (Multimodal Vision V1.1 Candidate)
- **Model Type:** Dual-Engine Architecture: Windows Media OCR (`winocr-winrt`) on Windows with automatic fallback to `pytesseract` on Linux/macOS, enhanced with Indian statutory packaging regex extraction, contrast preconditioning, and Levenshtein fuzzy brand matching.
- **Frameworks:** Python 3.11, WinRT, Pytesseract, Levenshtein, PIL
- **Artifacts:**
  - V1.0 Evidence: `ocr_evidence.parquet`
  - V1.1 Enhanced Module: `src/cv/ocr_engine.py` (`PackagingImagePreprocessor`, `PackagingIdentifierExtractor`, `PackagingBrandMatcher`)

## Intended Use
- Extract textual tokens from physical packaging images to verify authentic manufacturer branding and detect typographic tampering.
- Extract Indian statutory markings: Maximum Retail Price (`mrp_inr`), Net Quantity (`net_quantity` in ml/g/kg), and Batch/Lot Numbers.

## Performance & Empirical Findings
- **Evaluated Packaging Images:** 100 physical packaging hero shots.
- **Character Error Rate (CER):** $0.1400$ ($14.0\%$).
- **Word Error Rate (WER):** $0.1240$ ($12.4\%$).
- **Brand Verification Rate:** $32.0\%$ baseline; improved via spaceless & fuzzy Levenshtein token matching (handles "Mamaearth" vs "Mama Earth", "Boat" vs "boAt").
- **Insufficient Text Rate:** $44.0\%$ ($44/100$ photos lack legible text).
- **Statutory Extraction:** Regex extraction of `MRP Rs. X`, `Net Wt. X g/ml`, `Batch No. X`.
- **Zero-Penalty Compliance:** Lack of text or platform absence is treated as a neutral null status (`UNSUPPORTED_PLATFORM` / `OCR_UNAVAILABLE_ON_PLATFORM`, $m_{\text{ocr}} = 0$).

## Limitations & Migration
- WinRT OCR provides accelerated OCR on Windows hosts; containerized Linux environments utilize `pytesseract` or PaddleOCR through the unified `extract_text_from_image()` contract with zero code changes required.
