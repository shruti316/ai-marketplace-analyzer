# Model Card: Physical Packaging OCR Verification (`ocr_packaging_verification`)

## Model Details
- **Model Name:** Physical Packaging Brand Token Extraction Engine
- **Model Version:** 1.1.0
- **Model Type:** Windows Media OCR (WinRT) with abstract Linux migration interface (Tesseract / PaddleOCR)
- **Frameworks:** Python 3.11, WinRT, Levenshtein
- **Artifact:** Extracted packaging evidence in `ocr_evidence.parquet`

## Intended Use
- Extract textual tokens from physical packaging images to verify authentic manufacturer branding and detect typographic tampering.

## Performance & Empirical Findings
- **Evaluated Packaging Images:** 100 physical packaging hero shots.
- **Character Error Rate (CER):** $0.1400$ ($14.0\%$).
- **Word Error Rate (WER):** $0.1240$ ($12.4\%$).
- **Brand Verification Rate:** $32.0\%$ ($32/100$ verified).
- **Insufficient Text Rate:** $44.0\%$ ($44/100$ photos lack legible text).
- **Zero-Penalty Compliance:** Lack of text is treated as a neutral null ($m_{\text{ocr}} = 0$).

## Limitations & Migration
- WinRT OCR is Windows-native; production Linux containers utilize the standardized `UnifiedEvidenceItem` contract via `pytesseract`.
