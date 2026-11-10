# OCR Capability, Execution & Multimodal Text Report
**Release Version:** Indian Marketplace Trust Dataset v1.5  
**Component:** Physical OCR Execution & Vision-Language Dependency Audit  
**Execution Pipeline:** [`src/ocr/ocr_pipeline.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/ocr/ocr_pipeline.py)  
**Associated Tables:**
- [`evidence/ocr_evidence.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/evidence/ocr_evidence.parquet)
- [`evidence/title_token_packaging_proxy.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/evidence/title_token_packaging_proxy.parquet)
- [`derived_evidence/image_text_consistency.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/derived_evidence/image_text_consistency.parquet)

---

## 1. System Environment & Dependency Audit

A runtime audit of OCR and Vision-Language dependencies within the active Windows virtual environment (`.venv\Scripts\python.exe`) established the following:

| Dependency | Target Capability | Presence Status | Technical Detail |
| :--- | :--- | :--- | :--- |
| **`tesseract` Binary** | Physical OCR engine | **ABSENT** | `shutil.which("tesseract")` returns `None`. |
| **`pytesseract` Package** | Python Tesseract bindings | **ABSENT** | `importlib.util.find_spec("pytesseract")` is `None`. |
| **`easyocr` Package** | Deep learning OCR engine | **ABSENT** | `importlib.util.find_spec("easyocr")` is `None`. |
| **`open_clip` / `transformers`** | Vision-Language consistency | **ABSENT** | Neither package installed in current environment. |
| **Sandbox Network Access** | Dependency download | **DISABLED** | Offline execution mode prevents runtime package installation. |

---

## 2. Physical OCR Execution Status

Rather than manufacturing synthetic OCR strings or guessing text from product titles, physical OCR execution was formally audited across candidate hero images and recorded in [`evidence/ocr_evidence.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/evidence/ocr_evidence.parquet):

- **Images Audited:** 100 representative hero images across Amazon India, Flipkart, and Myntra.
- **`ocr_engine`:** `NONE_AVAILABLE`
- **`processing_status`:** `BLOCKED_OFFLINE_DEPENDENCY_ABSENT`
- **`ocr_confidence`:** `0.0`
- **`detected_text`:** `None` (100% null)
- **`failure_reason`:** `"Neither Tesseract-OCR binary nor EasyOCR package is installed in this offline Windows sandbox environment. Physical OCR execution is safely blocked to prevent synthetic fabrication."`

> [!IMPORTANT]
> Under the Zero Synthetic Fabrication Invariant, missing OCR dependencies must produce explicit dependency blocker records with 0.0 confidence and null text. Fabricating OCR strings from product titles or metadata violates scientific benchmark validity.

---

## 3. Strict Isolation of Title-Token Packaging Proxy

The 1,000 title-token proxy records in [`evidence/title_token_packaging_proxy.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/evidence/title_token_packaging_proxy.parquet) were created in historical iterations as an exploratory proxy for packaging brand text.

To eliminate any ambiguity between physical OCR text and metadata heuristics:
1. **Dedicated Table:** All proxy records remain strictly isolated in `title_token_packaging_proxy.parquet`.
2. **Explicit Column Names:** Fields are explicitly labeled `proxy_id`, `proxy_method = 'TITLE_TOKEN_PACKAGING_HEURISTIC'`, and `proxy_confidence = 0.5`.
3. **No Cross-Contamination:** No proxy record is merged into `ocr_evidence.parquet`.

---

## 4. Image-Text Consistency Schema & Dependency Blocker

Vision-language models (e.g. CLIP / SigLIP) can assess semantic consistency between hero images and declared catalog titles.

Because vision-language model weights and packages are unavailable in the offline environment:
- The target schema was initialized in [`derived_evidence/image_text_consistency.parquet`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/data/indian_marketplace_trust_dataset_v1_5/derived_evidence/image_text_consistency.parquet).
- `execution_status` is marked as `BLOCKED_OFFLINE_DEPENDENCY_ABSENT`.
- `similarity_score` is set to `0.0`.
- In the multimodal fusion engine, image-text consistency is marked as `image_text_modality_status = 'BLOCKED_OFFLINE_DEPENDENCY_ABSENT'`, and products receive **zero penalty** for this unassessed modality.
