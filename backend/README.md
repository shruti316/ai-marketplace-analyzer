# AI-Powered Indian Marketplace Trust Intelligence Platform — Backend

Backend API and database management service for the AI-Powered Indian Marketplace Trust Intelligence Platform (Amazon India, Flipkart, Myntra).

## 1. Architecture Overview

- **Runtime:** Node.js (v20+) with Express 5
- **Language:** TypeScript 5.6+
- **Database Engine:** MySQL 8.0+ (InnoDB Engine, `utf8mb4_unicode_ci`)
- **Database Driver:** `mysql2/promise`
- **Validation:** Zod 3.23+
- **Execution Model:** Explicit parameterized SQL queries (no ORM abstraction overhead)
- **Schema Model:** 16 frozen normalized relational tables, 19 foreign-key constraints, 26 CHECK constraints

---

## 2. Directory Structure

```
backend/
├── package.json               # Backend dependencies and execution scripts
├── package-lock.json          # Reproducible dependency lockfile
├── tsconfig.json              # TypeScript compilation configuration
├── .gitignore                 # Excludes node_modules, build outputs, and .env
├── .env.example               # Safe environment variable configuration template
├── README.md                  # This documentation
├── src/
│   └── config/
│       ├── env.ts             # Zod environment variable validation
│       └── database.ts        # Isolated Application Pool vs Migration Pool
└── database/
    ├── migrate.ts             # Idempotent migration runner (SHA-256 checksum audit)
    └── migrations/
        ├── 001_initial_schema.up.sql   # Complete frozen 16-table schema
        └── 001_initial_schema.down.sql # Reverse topological destructive rollback
```

---

## 3. Database Connection Architecture

To maintain strict security boundaries and protect against multi-query injection vulnerabilities, database access is split into two isolated connection managers in `src/config/database.ts`:

### 1. Application Runtime Pool (`getApplicationPool()`)
- **Driver:** `mysql2/promise`
- **`multipleStatements: false`**: Strictly enforced to mitigate stacked-query SQL injection vulnerabilities.
- **Connection Limit:** 10
- **Timeouts:** 10-second connect timeout with UTC timezone normalization.
- **Usage:** Standard API queries, analytical lookups, and double-blind annotation transactions.

### 2. Migration Execution Connection (`createMigrationPool()`)
- **`multipleStatements: true`**: Permitted exclusively within `database/migrate.ts` for batch DDL execution.
- **Connection Limit:** 1
- **Dedicated Lifecycle:** Instantiated on-demand during migration runs and immediately closed upon completion.
- **Security Invariant:** Never imported, exposed, or bound to HTTP route handlers.

---

## 4. Migration Runner (`database/migrate.ts`)

The migration runner provides deterministic, version-controlled schema evolution with content tamper protection.

### Commands

```bash
# Apply all pending migrations
npm run migrate

# Inspect migration status, completion time, and SHA-256 checksums
npm run migrate:status

# Revert the latest applied migration (destructive rollback)
npm run migrate:down
```

### Critical MySQL DDL Invariant
In MySQL InnoDB, DDL statements (`CREATE TABLE`, `DROP TABLE`, `ALTER TABLE`) cause an **implicit commit**. Therefore, multi-table DDL migrations **cannot** be rolled back atomically using transactions. 
- The migration runner does not pretend to offer atomic transactional rollback for DDL.
- If a migration encounters an error mid-execution, it records status `'FAILED'` with the exact error message in `schema_migrations`.
- Recovery requires manual review of the failed statement, snapshot restoration, or running the corresponding `.down.sql` script.

---

## 5. Frozen Schema Invariants (Phase 3 Step 2A)

1. **Table Count:** Exactly 16 tables in dependency order.
2. **Foreign Keys:** Exactly 19 foreign key constraints with `FOREIGN_KEY_CHECKS` enabled throughout.
3. **Seller Default:** `sellers.seller_type` default is strictly `'PLATFORM_AGGREGATE'`.
4. **Timezone Provenance:** Verbatim raw crawl strings are preserved in `price_history.source_raw_timestamp` alongside UTC `DATETIME(3)`.
5. **Calibrated Semantics:** `trust_assessments` represents calibrated multimodal policy anomaly patterns, not unverified counterfeit claims.
