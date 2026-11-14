import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { RowDataPacket } from 'mysql2/promise';
import { createMigrationPool } from '../src/config/database';
import { getEnv } from '../src/config/env';

// =============================================================================
// DATABASE MIGRATION RUNNER
// =============================================================================
// Architectural Invariants:
// 1. Bootstraps the frozen `schema_migrations` table if not present.
// 2. Discovers migration files deterministically by integer version prefix.
// 3. Verifies SHA-256 content checksums to prevent retro-modification of history.
// 4. IMPORTANT MYSQL DDL INVARIANT:
//    In MySQL InnoDB, DDL statements (CREATE TABLE, DROP TABLE, ALTER TABLE)
//    trigger an implicit commit immediately before and after execution.
//    Therefore, multi-table DDL migrations CANNOT be rolled back transactionally.
//    Atomic transactional rollback must NOT be promised.
//    Failed migrations record status 'FAILED' with the exact MySQL error message.
//    Recovery requires manual inspection, snapshot restoration, or running the guarded .down.sql script.
// 5. DESTRUCTIVE ROLLBACK GUARD:
//    Down migrations require explicit operator confirmation (--confirm flag)
//    and refuse to execute on migrations not recorded as 'COMPLETED'.
// =============================================================================

export interface MigrationRecord extends RowDataPacket {
  version: number;
  name: string;
  checksum: string;
  status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED';
  execution_time_ms: number | null;
  error_message: string | null;
  applied_at: string | null;
}

export interface DiscoveredMigration {
  version: number;
  name: string;
  upPath: string;
  downPath?: string;
  checksum: string;
}

const MIGRATIONS_DIR = fs.existsSync(path.resolve(__dirname, 'migrations'))
  ? path.resolve(__dirname, 'migrations')
  : path.resolve(__dirname, '../../database/migrations');

/**
 * Calculates SHA-256 checksum from file contents.
 */
export function calculateChecksum(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Discovers and sorts all versioned SQL migrations in the migrations directory.
 */
export function discoverMigrations(migrationsDir: string = MIGRATIONS_DIR): DiscoveredMigration[] {
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found at: ${migrationsDir}`);
  }

  const files = fs.readdirSync(migrationsDir);
  const upFiles = files.filter(f => f.endsWith('.up.sql'));

  const migrations: DiscoveredMigration[] = [];

  for (const upFile of upFiles) {
    const match = upFile.match(/^(\d+)_(.+)\.up\.sql$/);
    if (!match) {
      console.warn(`[WARN] Skipping non-conformant migration file: ${upFile}`);
      continue;
    }

    const version = parseInt(match[1], 10);
    const name = match[2];
    const upPath = path.join(migrationsDir, upFile);
    const downFile = `${match[1]}_${name}.down.sql`;
    const downPath = path.join(migrationsDir, downFile);

    const upContent = fs.readFileSync(upPath, 'utf8');
    const checksum = calculateChecksum(upContent);

    migrations.push({
      version,
      name,
      upPath,
      downPath: fs.existsSync(downPath) ? downPath : undefined,
      checksum
    });
  }

  return migrations.sort((a, b) => a.version - b.version);
}

/**
 * Ensures the `schema_migrations` audit table exists using the exact frozen Step 2A DDL.
 */
async function bootstrapSchemaMigrationsTable(pool: ReturnType<typeof createMigrationPool>): Promise<void> {
  const bootstrapSql = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
        version INT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        checksum VARCHAR(64) NOT NULL,
        status ENUM('PENDING', 'EXECUTING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
        execution_time_ms INT UNSIGNED NULL,
        error_message TEXT NULL,
        applied_at TIMESTAMP NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await pool.query(bootstrapSql);
}

/**
 * Fetches all applied migration records from `schema_migrations`.
 */
async function getAppliedMigrations(pool: ReturnType<typeof createMigrationPool>): Promise<Map<number, MigrationRecord>> {
  const [rows] = await pool.query<MigrationRecord[]>(
    'SELECT version, name, checksum, status, execution_time_ms, error_message, applied_at FROM schema_migrations ORDER BY version ASC'
  );

  const map = new Map<number, MigrationRecord>();
  for (const row of rows) {
    map.set(row.version, row);
  }
  return map;
}

/**
 * Runs pending up-migrations sequentially.
 */
export async function runMigrationsUp(): Promise<void> {
  console.log('=============================================================================');
  console.log('AI-Powered Indian Marketplace Trust Intelligence Platform — Migration Runner');
  console.log('Target Operation: UP (Apply pending migrations)');
  console.log('=============================================================================');

  // Validate environment variables first
  const env = getEnv();
  console.log(`[INFO] Connecting to MySQL at ${env.DB_HOST}:${env.DB_PORT}, Database: ${env.DB_NAME}...`);

  const pool = createMigrationPool();

  try {
    // 1. Test basic database connection
    await pool.query('SELECT 1');
    console.log('[OK] Database connectivity verified.');

    // 2. Ensure schema_migrations exists
    await bootstrapSchemaMigrationsTable(pool);
    console.log('[OK] schema_migrations tracking table verified/bootstrapped.');

    // 3. Discover available migration files
    const availableMigrations = discoverMigrations();
    console.log(`[INFO] Discovered ${availableMigrations.length} migration file(s).`);

    // 4. Retrieve migration history
    const appliedMap = await getAppliedMigrations(pool);

    // 5. Verify integrity of previously completed migrations
    for (const migration of availableMigrations) {
      const applied = appliedMap.get(migration.version);
      if (applied && applied.status === 'COMPLETED') {
        if (applied.checksum !== migration.checksum) {
          throw new Error(
            `FATAL: Migration checksum mismatch for version ${migration.version} (${migration.name})!\n` +
            `  Applied Checksum: ${applied.checksum}\n` +
            `  File Checksum:    ${migration.checksum}\n` +
            `Migration files must be immutable once executed.`
          );
        }
      }
    }

    // 6. Execute pending migrations in version order
    let pendingCount = 0;

    for (const migration of availableMigrations) {
      const applied = appliedMap.get(migration.version);

      if (applied && applied.status === 'COMPLETED') {
        console.log(`[SKIP] Version ${migration.version} (${migration.name}) already applied on ${applied.applied_at}.`);
        continue;
      }

      if (applied && applied.status === 'FAILED') {
        throw new Error(
          `FATAL: Migration version ${migration.version} (${migration.name}) previously FAILED with error:\n` +
          `  "${applied.error_message}"\n` +
          `MySQL DDL causes implicit commits and does not roll back automatically.\n` +
          `Resolve the database state manually before rerunning migrations.`
        );
      }

      if (applied && applied.status === 'EXECUTING') {
        throw new Error(
          `FATAL: Migration version ${migration.version} is in 'EXECUTING' status from a previous crashed run.\n` +
          `Manual database inspection is required.`
        );
      }

      pendingCount++;
      console.log(`-----------------------------------------------------------------------------`);
      console.log(`[APPLYING] Migration ${migration.version}: ${migration.name}`);
      console.log(`  Source File: ${migration.upPath}`);
      console.log(`  SHA-256:     ${migration.checksum}`);

      // Record 'EXECUTING' status
      await pool.query(
        `INSERT INTO schema_migrations (version, name, checksum, status, applied_at)
         VALUES (?, ?, ?, 'EXECUTING', CURRENT_TIMESTAMP(3))
         ON DUPLICATE KEY UPDATE status = 'EXECUTING', checksum = VALUES(checksum), error_message = NULL`,
        [migration.version, migration.name, migration.checksum]
      );

      const sqlContent = fs.readFileSync(migration.upPath, 'utf8');
      const startTime = Date.now();

      try {
        // Execute DDL statements using the dedicated multipleStatements connection
        await pool.query(sqlContent);
        const executionTimeMs = Date.now() - startTime;

        // Record 'COMPLETED' status
        await pool.query(
          `UPDATE schema_migrations
           SET status = 'COMPLETED',
               execution_time_ms = ?,
               applied_at = CURRENT_TIMESTAMP(3),
               error_message = NULL
           WHERE version = ?`,
          [executionTimeMs, migration.version]
        );

        console.log(`[SUCCESS] Migration ${migration.version} applied successfully in ${executionTimeMs}ms.`);
      } catch (migrationErr: unknown) {
        const executionTimeMs = Date.now() - startTime;
        const errMessage = migrationErr instanceof Error ? migrationErr.message : String(migrationErr);

        console.error(`[FAILED] Migration ${migration.version} failed after ${executionTimeMs}ms.`);
        console.error(`  Error: ${errMessage}`);

        // Record 'FAILED' status with exact error
        try {
          await pool.query(
            `UPDATE schema_migrations
             SET status = 'FAILED',
                 execution_time_ms = ?,
                 error_message = ?,
                 applied_at = CURRENT_TIMESTAMP(3)
             WHERE version = ?`,
            [executionTimeMs, errMessage, migration.version]
          );
        } catch (statusUpdateErr) {
          console.error(`[CRITICAL] Failed to record FAILED status in schema_migrations:`, statusUpdateErr);
        }

        throw new Error(
          `Migration ${migration.version} execution failed: ${errMessage}\n` +
          `Note: DDL statements in MySQL cause implicit commits and cannot be rolled back automatically.\n` +
          `Inspect the database state and schema_migrations table.`
        );
      }
    }

    console.log('=============================================================================');
    if (pendingCount === 0) {
      console.log('[COMPLETE] Database schema is up to date. No pending migrations.');
    } else {
      console.log(`[COMPLETE] Successfully applied ${pendingCount} pending migration(s).`);
    }
    console.log('=============================================================================');
  } finally {
    await pool.end();
  }
}

/**
 * Reverts the most recently applied migration (requires explicit operator confirmation).
 */
export async function runMigrationsDown(forceConfirm: boolean = false): Promise<void> {
  console.log('=============================================================================');
  console.log('AI-Powered Indian Marketplace Trust Intelligence Platform — Migration Runner');
  console.log('Target Operation: DOWN (Revert last applied migration)');
  console.log('=============================================================================');

  // DESTRUCTIVE ROLLBACK GUARD:
  // Require explicit operator confirmation via --confirm CLI flag or forceConfirm parameter.
  const hasCliConfirm = process.argv.includes('--confirm');
  const hasEnvConfirm = process.env.CONFIRM_DESTRUCTIVE_ROLLBACK === 'true';

  if (!forceConfirm && !hasCliConfirm && !hasEnvConfirm) {
    console.error('[BLOCKED] DESTRUCTIVE ROLLBACK GUARD REJECTED OPERATION:');
    console.error('  Down migrations permanently drop tables and erase stored data.');
    console.error('  To confirm you deliberately want to execute this destructive operation, pass:');
    console.error('    npm run migrate:down -- --confirm');
    console.error('  or set environment variable CONFIRM_DESTRUCTIVE_ROLLBACK=true.');
    console.error('=============================================================================');
    throw new Error('Destructive down migration rejected: Missing explicit --confirm flag.');
  }

  const pool = createMigrationPool();

  try {
    await bootstrapSchemaMigrationsTable(pool);
    const appliedMap = await getAppliedMigrations(pool);
    const availableMigrations = discoverMigrations();

    // Find the highest applied version
    const appliedVersions = Array.from(appliedMap.keys())
      .filter(v => appliedMap.get(v)?.status === 'COMPLETED')
      .sort((a, b) => b - a);

    if (appliedVersions.length === 0) {
      console.log('[INFO] No completed migrations found to roll back.');
      return;
    }

    const targetVersion = appliedVersions[0];
    const targetMigration = availableMigrations.find(m => m.version === targetVersion);
    const targetAppliedRecord = appliedMap.get(targetVersion);

    // Verify migration was recorded as COMPLETED before permitting rollback
    if (!targetAppliedRecord || targetAppliedRecord.status !== 'COMPLETED') {
      throw new Error(
        `Refusing rollback: Migration ${targetVersion} status is '${targetAppliedRecord?.status ?? 'UNKNOWN'}'.\n` +
        `Down migrations may only be executed against migrations in 'COMPLETED' status.`
      );
    }

    if (!targetMigration || !targetMigration.downPath) {
      throw new Error(
        `Cannot roll back version ${targetVersion}: No corresponding .down.sql script found!`
      );
    }

    console.log(`[ROLLING BACK] Migration ${targetVersion}: ${targetMigration.name}`);
    console.log(`  Down Script: ${targetMigration.downPath}`);

    const sqlContent = fs.readFileSync(targetMigration.downPath, 'utf8');
    const startTime = Date.now();

    await pool.query(sqlContent);
    const executionTimeMs = Date.now() - startTime;

    // Check if schema_migrations table still exists (since 001 down drops all 16 tables including schema_migrations)
    try {
      const [tableCheck] = await pool.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'schema_migrations'`
      );
      if (tableCheck && tableCheck[0] && Number(tableCheck[0].count) > 0) {
        await pool.query('DELETE FROM schema_migrations WHERE version = ?', [targetVersion]);
      }
    } catch {
      // Table was dropped as part of full down script; expected behavior for initial schema down
    }

    console.log(`[SUCCESS] Migration ${targetVersion} successfully rolled back in ${executionTimeMs}ms.`);
  } finally {
    await pool.end();
  }
}

/**
 * Displays current status of all discovered migrations.
 */
export async function printMigrationStatus(): Promise<void> {
  console.log('=============================================================================');
  console.log('Migration Status Audit');
  console.log('=============================================================================');

  const pool = createMigrationPool();

  try {
    await bootstrapSchemaMigrationsTable(pool);
    const appliedMap = await getAppliedMigrations(pool);
    const available = discoverMigrations();

    console.log(
      'Version'.padEnd(10) +
      'Name'.padEnd(30) +
      'Status'.padEnd(14) +
      'Time (ms)'.padEnd(12) +
      'Checksum (First 12)'.padEnd(22) +
      'Applied At'
    );
    console.log('-'.repeat(105));

    for (const m of available) {
      const applied = appliedMap.get(m.version);
      const status = applied ? applied.status : 'PENDING';
      const timeMs = applied?.execution_time_ms != null ? String(applied.execution_time_ms) : '-';
      const checksumDisplay = `${m.checksum.substring(0, 12)}...`;
      const appliedAt = applied?.applied_at ?? '-';

      console.log(
        String(m.version).padEnd(10) +
        m.name.padEnd(30) +
        status.padEnd(14) +
        timeMs.padEnd(12) +
        checksumDisplay.padEnd(22) +
        appliedAt
      );

      if (applied?.error_message) {
        console.log(`  ERROR: ${applied.error_message}`);
      }
    }
    console.log('=============================================================================');
  } finally {
    await pool.end();
  }
}

// =============================================================================
// CLI DISPATCHER
// =============================================================================
if (require.main === module) {
  const command = (process.argv[2] || 'up').toLowerCase();

  (async () => {
    try {
      if (command === 'up') {
        await runMigrationsUp();
      } else if (command === 'down') {
        await runMigrationsDown();
      } else if (command === 'status') {
        await printMigrationStatus();
      } else {
        console.error(`Unknown command: "${command}". Available commands: up, down, status.`);
        process.exit(1);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\n[FATAL ERROR] ${message}`);
      process.exit(1);
    }
  })();
}
