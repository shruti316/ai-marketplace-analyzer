# OCR Processing & Dependency Provenance Report — Indian Marketplace Trust Dataset v1.4

## 1. Executive Summary
Documents the empirical status of Optical Character Recognition (OCR) processing, offline dependency blockers, and strict isolation of heuristic proxies.

## 2. Dependency Blocker Analysis
- **Execution Environment:** Windows local terminal sandbox without outbound internet access.
- **Missing Dependencies:** Neither the Tesseract OCR system binary nor the EasyOCR Python neural package is installed in the offline environment.
- **Provenance Integrity Invariant:** Under zero synthetic fabrication rules, execution of an uninstalled OCR engine cannot be simulated or claimed.

## 3. Physical OCR Audit Records (`ocr_evidence.parquet`)
- **Audit Records:** 50 sample product packaging images evaluated.
- **Recorded Status:** `OCR_BLOCKED_OFFLINE_DEPENDENCY_ABSENT`
- **Extraction Confidence:** 0.00
- **Physical OCR Executed:** False
- **Physical Images Verified:** All 50 referenced image files exist on disk.

## 4. Isolation of Title-Token Proxies (`title_token_packaging_proxy.parquet`)
- **Quarantined Records:** 1,000 packaging proxy records isolated in dedicated table `evidence/title_token_packaging_proxy.parquet`.
- **Proxy Engine:** `TITLE_TOKEN_PACKAGING_PROXY_v1.4`
- **Proxy Confidence:** 0.50
- **Contamination Zero:** Exactly 0 title-token proxy strings are merged into `ocr_evidence.parquet`.
