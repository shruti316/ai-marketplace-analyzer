# Phase 2 — Stage 0: Existing Backend Technical Audit
## Deliverable 6: Security and Deployment Gap Analysis

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Audit Date:** November 11, 2026  
**Auditor:** Antigravity AI Engineering Team  

---

## 1. Vulnerability & Security Posture Assessment

An audit of the current Python HTTP server in [`src/api/service.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/api/service.py) and overall codebase revealed critical vulnerabilities and missing security controls:

### 1.1 Identified Vulnerabilities & Technical Debt

| Security Domain | Current Repository State | Risk Severity | Concrete Vulnerability / Missing Control |
| :--- | :--- | :---: | :--- |
| **Authentication** | None | **CRITICAL** | All endpoints are unauthenticated. Anyone on the local network can invoke arbitrary operations. |
| **Authorization** | None | **HIGH** | No user roles or permission gates exist. Administrative or sensitive endpoints have no protection. |
| **CORS Configuration** | Wildcard `Access-Control-Allow-Origin: *` in [`service.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/api/service.py#L150) | **MEDIUM** | In production, a wildcard CORS header exposes API endpoints to unauthorized cross-origin browser requests. Must be restricted to trusted frontend origins. |
| **Input Validation** | Ad-hoc Python dictionary key lookups; no schema validation | **HIGH** | In [`service.py`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/src/api/service.py#L103), `POST /api/v1/compare` checks only `isinstance(pids, list)`, allowing oversized payloads or memory exhaustion via unbounded lists. |
| **Rate Limiting** | None | **HIGH** | The server has zero rate limiting. Vulnerable to Denial-of-Service (DoS) and scraping of catalog trust intelligence. |
| **HTTP Transport** | `http.server.HTTPServer` (Single-threaded blocking) | **HIGH** | Standard library `HTTPServer` processes one request at a time on a single thread. Concurrent incoming requests queue up, creating latency spikes. |
| **Error Handling** | Raw exception strings returned: `{"error": True, "message": str(e)}` | **MEDIUM** | Internal exceptions leak file paths, line numbers, and internal architecture to API clients. |
| **Secret Management** | No `.env` configuration file; no secret loader | **MEDIUM** | Missing `.env.example` and validation framework for future API keys (e.g. LLM providers for MarketMate, MySQL credentials, JWT signing secrets). |
| **File Upload Security** | Ad-hoc file reading; no magic bytes validation | **HIGH** | User-submitted packaging image uploads in future phases could allow malicious executable payloads if MIME types and magic bytes are not validated. |
| **SQL Injection** | Not applicable (no SQL currently exists) | **PREVENTIVE** | Must mandate parameterized SQL / ORM abstractions in Phase 2 to prevent SQL injection in MySQL. |

---

## 2. Security Architecture Implementation Specifications

### 2.1 Authentication & Token Rotation
- **Password Hashing:** Argon2id (memory: 64MB, iterations: 3, parallelism: 1) or bcrypt (cost 12). Plaintext passwords must NEVER be logged or persisted.
- **Access Tokens:** Short-lived JWTs (15 minutes expiry) signed using `RS256` or `HS256` with high-entropy secret ($\ge 256$ bits). Stored strictly in frontend memory.
- **Refresh Tokens:** Long-lived tokens (7 days expiry) stored in an `HttpOnly`, `Secure`, `SameSite=Strict` cookie. Token hashes stored in MySQL `refresh_tokens` table for revocation and rotation detection.

### 2.2 Input Sanitization & Schema Validation
- **Node.js Gateway:** Every incoming request payload and query string must be strictly parsed and validated using **Zod** schemas. Requests failing validation must return `400 Bad Request` with structured error details before reaching controllers.
- **Python AI Engine:** Endpoints must use Pydantic models matching Phase 1 contracts.

### 2.3 Rate Limiting & DoS Protection
- `express-rate-limit` configuration:
  - Global API: Max 100 requests per minute per IP.
  - Auth endpoints (`/auth/login`, `/auth/register`): Max 5 requests per 15 minutes per IP.
  - Heavy AI comparisons (`/compare`): Max 20 requests per minute per user.
- Response on breach: `429 Too Many Requests` with `Retry-After` header.

### 2.4 File Upload Security for Packaging OCR
- Use `multer` configured with:
  - Maximum file size limit: **5 MB**.
  - Whitelist file extensions: `.jpg`, `.jpeg`, `.png`, `.webp`.
  - Validate image magic bytes using `image-type` / `file-type` (reject polyglot files disguised as images).
  - Store uploads in temporary quarantine folder with randomly generated UUID filenames (prevent directory traversal).

### 2.5 Security Headers
- Implement `helmet` on Express:
  - `Content-Security-Policy` (CSP)
  - `Strict-Transport-Security` (HSTS: max-age=31536000; includeSubDomains; preload)
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`

---

## 3. Deployment Architecture & Containerization Plan

### 3.1 Target Production Topology (Docker Compose)

```mermaid
flowchart LR
    User([End User Browser]) --> Nginx[Nginx Reverse Proxy\n(Port 80/443)]
    
    subgraph DockerHost ["Docker Engine Environment"]
        Nginx -->|/ | Frontend[Frontend Container\nVite Nginx Static Build]
        Nginx -->|/api/v1 | NodeApp[Application Backend Container\nNode.js Express / Port 5000]
        
        NodeApp -->|Internal Bridge| PyDaemon[AI Trust Intelligence Daemon\nPython FastAPI / Port 8080]
        NodeApp -->|Internal Bridge| MySQL[(MySQL 8.0 Container\nPort 3306)]
        
        PyDaemon <--> ParquetVolume[(Parquet Volumes\nRead-Only Mount)]
        MySQL <--> DBVolume[(MySQL Data Volume\nPersistent)]
    end
```

### 3.2 Environment Variable Matrix (`.env.example`)

```ini
# ==============================================================================
# AI-Powered Marketplace Trust Intelligence Platform — Environment Configuration
# ==============================================================================

# Node.js Application Backend
NODE_ENV=development
PORT=5000
APP_BASE_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173

# Security & Secrets
JWT_ACCESS_SECRET=your_super_secret_jwt_access_key_min_32_chars
JWT_REFRESH_SECRET=your_super_secret_jwt_refresh_key_min_32_chars
CORS_ORIGIN=http://localhost:5173

# MySQL 8.0 Relational Database
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=trust_admin
DB_PASSWORD=SecureDbPassword123!
DB_NAME=marketplace_trust_db
DB_CONNECTION_LIMIT=20

# Python AI Inference Daemon Integration
PYTHON_AI_SERVICE_URL=http://127.0.0.1:8080
PYTHON_AI_TIMEOUT_MS=5000

# MarketMate LLM Provider (Optional / Phase 2 Stage 5)
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3.3 Database Backups & Health Probes
- **Automated MySQL Backups:** Daily logical backups via `mysqldump` running in a cron job, gzip-compressed, with 30-day retention.
- **Liveness & Readiness Probes:**
  - `GET /health`: Checks process uptime and memory usage.
  - `GET /ready`: Pings MySQL connection pool and Python AI service `GET /health`. Returns `200 OK` if both dependencies are healthy, or `503 Service Unavailable` if either dependency fails.
