# Security Policy

## 1. Supported Versions

Security updates and critical vulnerability patches are actively maintained for the following versions:

| Version | Supported | Status |
|---------|-----------|--------|
| `1.8.x` | :white_check_mark: | Active (Current Repository Standard) |
| `1.7.x` | :white_check_mark: | Supported (Final ML Readiness Release) |
| `1.1.x` | :white_check_mark: | Supported (Multimodal Vision Candidate) |
| `1.0.x` | :white_check_mark: | Supported (Frozen Baseline Champion) |
| `< 1.0` | :x: | Unsupported (Archived Historical Prototypes) |

---

## 2. Reporting a Vulnerability

The project team takes security, privacy, and scientific integrity seriously. If you discover a security vulnerability or sensitive information exposure:

1. **Do NOT open a public GitHub issue.**
2. Send an email to the repository maintainer with:
   - Detailed description of the vulnerability
   - Steps to reproduce or proof-of-concept payload
   - Potential impact on the inference service or dataset integrity
3. We will acknowledge receipt within 48 hours and provide an estimated resolution timeline.

---

## 3. Scope & Threat Model

The platform is designed around strict security invariants:

1. **Zero Credential Exposure:**  
   No API keys, database credentials, access tokens, or private signing keys are tracked in this repository. `.env.example` provides non-sensitive placeholders.
2. **Safe Model Deserialization:**  
   Model weights (`.joblib`) are strictly loaded from trusted, immutable project paths. SHA-256 checksums are verified before deployment.
3. **Data Privacy & Path Sanitization:**  
   Image, listing, and review evidence extractors sanitize file identifiers (`asset://...`) to prevent exposing internal local host paths (`C:\Users\...`).
4. **Input Validation:**  
   The REST inference dispatcher validates URL routes, canonical product IDs, and query parameters, rejecting malformed inputs with clean structured JSON responses.
