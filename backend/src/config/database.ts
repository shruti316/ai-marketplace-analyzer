import mysql, { Pool, PoolOptions, Connection, RowDataPacket } from 'mysql2/promise';
import { getEnv, Env } from './env';

// =============================================================================
// DATABASE CONNECTION INFRASTRUCTURE
// Architecture Requirement: Strict separation between Application Runtime Pool
// and Migration Execution Connection.
// =============================================================================

let applicationPool: Pool | null = null;

/**
 * Builds base connection configuration using validated environment settings.
 * Does NOT provide silent fallback to hardcoded default passwords.
 */
function buildBaseConfig(env: Env): PoolOptions {
  return {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    waitForConnections: true,
    connectTimeout: 10000, // 10 second timeout
    timezone: '+00:00', // Enforce UTC
    dateStrings: true, // Preserve ISO-like representation for fractional seconds
    charset: 'utf8mb4'
  };
}

// -----------------------------------------------------------------------------
// 1. APPLICATION RUNTIME POOL
// -----------------------------------------------------------------------------
// Specifications:
// - multipleStatements: false (Mitigates stacked-query SQL injection vulnerabilities)
// - Connection limit: 10
// - Intended for API query execution and transactions only (no DDL privileges assumed)
// -----------------------------------------------------------------------------

/**
 * Returns the singleton application connection pool.
 * Instantiates lazily upon first request.
 */
export function getApplicationPool(): Pool {
  if (!applicationPool) {
    const env = getEnv();
    const config: PoolOptions = {
      ...buildBaseConfig(env),
      connectionLimit: 10,
      multipleStatements: false, // Invariant: Application queries must NEVER permit multiple statements
      queueLimit: 50,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000
    };
    applicationPool = mysql.createPool(config);
  }
  return applicationPool;
}

/**
 * Closes the application connection pool.
 */
export async function closeApplicationPool(): Promise<void> {
  if (applicationPool) {
    await applicationPool.end();
    applicationPool = null;
  }
}

/**
 * Health check probe for the application database connection.
 * Executes a lightweight `SELECT 1` ping and measures round-trip latency.
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latencyMs: number;
  database?: string;
  error?: string;
}> {
  const startTime = Date.now();
  try {
    const pool = getApplicationPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT 1 AS health_check, DATABASE() AS active_db');
    const latencyMs = Date.now() - startTime;
    const activeDb = rows && rows[0] ? (rows[0].active_db as string) : undefined;

    return {
      healthy: true,
      latencyMs,
      database: activeDb
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      healthy: false,
      latencyMs,
      error: errorMessage
    };
  }
}

// -----------------------------------------------------------------------------
// 2. MIGRATION EXECUTION CONNECTION
// -----------------------------------------------------------------------------
// Specifications:
// - multipleStatements: true (Strictly required for executing multi-table DDL migration scripts)
// - Connection limit: 1 (Sequential, deterministic schema application)
// - Dedicated lifecycle: created specifically for migration runs and immediately closed
// - WARNING: Never export or bind this connection to API route handlers!
// -----------------------------------------------------------------------------

/**
 * Creates an isolated single-connection pool dedicated solely to migration runs.
 * Requires dedicated MIGRATION_DB_USER and MIGRATION_DB_PASSWORD credentials.
 * Throws a clear configuration error if migration credentials are missing or empty.
 * Never silently falls back to application runtime credentials (DB_USER/DB_PASSWORD) or root.
 * Enables multipleStatements: true for executing DDL scripts.
 * Must NOT be shared or reused by application API endpoints.
 */
export function createMigrationPool(overrideConfig?: Partial<PoolOptions>): Pool {
  const env = getEnv();

  const migrationUser = overrideConfig?.user ?? env.MIGRATION_DB_USER;
  const migrationPassword = overrideConfig?.password ?? env.MIGRATION_DB_PASSWORD;

  if (!migrationUser || typeof migrationUser !== 'string' || migrationUser.trim() === '') {
    throw new Error(
      'Migration database credential error: MIGRATION_DB_USER is required for migration operations but was missing or empty.\n' +
      'Please configure MIGRATION_DB_USER and MIGRATION_DB_PASSWORD in your environment or .env file (see .env.example).'
    );
  }

  if (
    migrationPassword === undefined ||
    migrationPassword === null ||
    (typeof migrationPassword === 'string' && migrationPassword.trim() === '')
  ) {
    throw new Error(
      'Migration database credential error: MIGRATION_DB_PASSWORD is required for migration operations but was missing or empty.\n' +
      'Please configure MIGRATION_DB_USER and MIGRATION_DB_PASSWORD in your environment or .env file (see .env.example).'
    );
  }

  const config: PoolOptions = {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: migrationUser.trim(),
    password: migrationPassword,
    database: env.DB_NAME,
    waitForConnections: true,
    connectTimeout: 10000,
    timezone: '+00:00',
    dateStrings: true,
    charset: 'utf8mb4',
    connectionLimit: 1, // Single dedicated connection for deterministic migration execution
    multipleStatements: true, // Permitted EXCLUSIVELY for migration execution scripts
    queueLimit: 1,
    ...overrideConfig
  };

  return mysql.createPool(config);
}
