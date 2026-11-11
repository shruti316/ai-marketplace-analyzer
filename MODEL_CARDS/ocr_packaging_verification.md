# Model Card: Physical Packaging OCR Verification (`ocr_packaging_verification`)

## Model Details
- **Model Name:** Physical Packaging Brand Token Extraction Engine
- **Model Version:** 1.2.0 (ML V1.0 Release Freeze)
- **Model Type:** Dual-Engine Architecture: Windows Media OCR (`winocr-winrt`) on Windows with automatic fallback to `pytesseract` on Linux/macOS, plus neutral fallback handling.
- **Frameworks:** Python 3.11, WinRT, Pytesseract, Levenshtein
- **Artifact:** Extracted packaging evidence in `ocr_evidence.parquet`

## Intended Use
- Extract textual tokens from physical packaging images to verify authentic manufacturer branding and detect typographic tampering.

## Performance & Empirical Findings
- **Evaluated Packaging Images:** 100 physical packaging hero shots.
- **Character Error Rate (CER):** $0.1400$ ($14.0\%$).
- **Word Error Rate (WER):** $0.1240$ ($12.4\%$).
- **Brand Verification Rate:** $32.0\%$ ($32/100$ verified).
- **Insufficient Text Rate:** $44.0\%$ ($44/100$ photos lack legible text).
- **Zero-Penalty Compliance:** Lack of text or platform absence is treated as a neutral null status (`UNSUPPORTED_PLATFORM` / `OCR_UNAVAILABLE_ON_PLATFORM`, $m_{\text{ocr}} = 0$).

## Limitations & Migration
- WinRT OCR provides accelerated OCR on Windows hosts; containerized Linux environments utilize `pytesseract` or PaddleOCR through the unified `extract_text_from_image()` contract with zero code changes required.
