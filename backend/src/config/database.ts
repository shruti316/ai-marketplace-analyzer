import mysql, { Pool, PoolOptions, Connection, PoolConnection, RowDataPacket } from 'mysql2/promise';
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

/**
 * Safely executes a parameterized query using the shared application runtime pool.
 * Architectural Invariant: multipleStatements is false, preventing stacked SQL injection.
 */
export async function query<T extends RowDataPacket[]>(sql: string, params: unknown[] = []): Promise<T> {
  const pool = getApplicationPool();
  const [rows] = await pool.query<T>(sql, params);
  return rows;
}

/**
 * Safely executes a parameterized query and returns the first matching row or null.
 */
export async function queryOne<T extends RowDataPacket>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T[]>(sql, params);
  return rows && rows.length > 0 ? rows[0] : null;
}

/**
 * Executes a callback within a managed database transaction.
 * Automatically initiates `beginTransaction`, commits on success,
 * performs `rollback` on errors, and ensures connection release in finally block.
 * Architectural Invariant: Preserves foreign key constraints at all times.
 */
export async function withTransaction<T>(
  callback: (connection: PoolConnection) => Promise<T>
): Promise<T> {
  const pool = getApplicationPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (err) {
    try {
      await connection.rollback();
    } catch (rollbackErr) {
      console.error('[DATABASE ROLLBACK ERROR]', rollbackErr);
    }
    throw err;
  } finally {
    connection.release();
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
 * Non-security-sensitive connection options permitted for migration pool configuration.
 * Security-sensitive and architectural invariants (credentials, connectionLimit, multipleStatements,
 * host, port, database) are strictly protected and cannot be overridden.
 */
export type SafeMigrationPoolOptions = Pick<
  PoolOptions,
  'connectTimeout' | 'enableKeepAlive' | 'keepAliveInitialDelay' | 'maxIdle' | 'idleTimeout'
>;

/**
 * List of configuration keys that must NEVER be overridden by callers.
 */
const PROTECTED_MIGRATION_CONFIG_KEYS = [
  'user',
  'password',
  'connectionLimit',
  'multipleStatements',
  'queueLimit',
  'host',
  'port',
  'database'
] as const;

/**
 * Creates an isolated single-connection pool dedicated solely to migration runs.
 * Requires dedicated MIGRATION_DB_USER and MIGRATION_DB_PASSWORD credentials.
 * Throws a clear configuration error if migration credentials are missing or empty.
 * Never silently falls back to application runtime credentials (DB_USER/DB_PASSWORD) or root.
 * Enforces connectionLimit: 1 and multipleStatements: true for executing DDL scripts.
 * Rejects any attempts to override protected security or architectural properties.
 * Must NOT be shared or reused by application API endpoints.
 */
export function createMigrationPool(overrideConfig?: SafeMigrationPoolOptions): Pool {
  const env = getEnv();

  // 1. Guard against attempts to override protected security or architectural properties
  if (overrideConfig) {
    const rawConfig = overrideConfig as Record<string, unknown>;
    for (const key of PROTECTED_MIGRATION_CONFIG_KEYS) {
      if (key in rawConfig && rawConfig[key] !== undefined) {
        throw new Error(
          `Security violation: Attempted to override protected migration pool property "${key}". ` +
          `Migration credentials and execution invariants are strictly protected and cannot be altered.`
        );
      }
    }
  }

  // 2. Enforce migration credentials strictly from MIGRATION_DB_USER and MIGRATION_DB_PASSWORD
  const migrationUser = env.MIGRATION_DB_USER?.trim();
  const migrationPassword = env.MIGRATION_DB_PASSWORD;

  if (!migrationUser) {
    throw new Error(
      'Migration database credential error: MIGRATION_DB_USER is required for migration operations but was missing or empty.\n' +
      'Please configure MIGRATION_DB_USER and MIGRATION_DB_PASSWORD in your environment or .env file (see .env.example).'
    );
  }

  if (
    migrationPassword === undefined ||
    migrationPassword === null ||
    migrationPassword.trim() === ''
  ) {
    throw new Error(
      'Migration database credential error: MIGRATION_DB_PASSWORD is required for migration operations but was missing or empty.\n' +
      'Please configure MIGRATION_DB_USER and MIGRATION_DB_PASSWORD in your environment or .env file (see .env.example).'
    );
  }

  // 3. Assemble pool configuration with protected properties strictly locked
  const config: PoolOptions = {
    // Permitted safe override options spread first
    ...(overrideConfig ? {
      connectTimeout: overrideConfig.connectTimeout,
      enableKeepAlive: overrideConfig.enableKeepAlive,
      keepAliveInitialDelay: overrideConfig.keepAliveInitialDelay,
      maxIdle: overrideConfig.maxIdle,
      idleTimeout: overrideConfig.idleTimeout
    } : {}),

    // Invariants: Protected properties are strictly enforced and immutable
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: migrationUser,
    password: migrationPassword,
    database: env.DB_NAME,
    waitForConnections: true,
    connectTimeout: overrideConfig?.connectTimeout ?? 10000,
    timezone: '+00:00',
    dateStrings: true,
    charset: 'utf8mb4',
    connectionLimit: 1, // Strictly 1: deterministic sequential DDL execution
    multipleStatements: true, // Permitted EXCLUSIVELY for migration execution scripts
    queueLimit: 1
  };

  return mysql.createPool(config);
}
