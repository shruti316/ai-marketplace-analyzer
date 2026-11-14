import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import { discoverMigrations, calculateChecksum, runMigrationsDown } from '../database/migrate';
import { envSchema, resetEnvCache, resolveEnvFilePath, loadEnv } from '../src/config/env';
import { createMigrationPool } from '../src/config/database';

console.log('Running backend unit tests...');

// -----------------------------------------------------------------------------
// Test 1: Migration discovery and checksum validation
// -----------------------------------------------------------------------------
const migrations = discoverMigrations(path.resolve(__dirname, '../database/migrations'));
assert.strictEqual(migrations.length, 1, 'Should discover exactly 1 migration file pair');

const m1 = migrations[0];
assert.strictEqual(m1.version, 1, 'Migration version must be 1');
assert.strictEqual(m1.name, 'initial_schema', 'Migration name must be initial_schema');
assert.ok(m1.upPath.endsWith('001_initial_schema.up.sql'), 'upPath must target 001_initial_schema.up.sql');
assert.ok(m1.downPath && m1.downPath.endsWith('001_initial_schema.down.sql'), 'downPath must target 001_initial_schema.down.sql');
assert.strictEqual(typeof m1.checksum, 'string', 'Checksum must be a string');
assert.strictEqual(m1.checksum.length, 64, 'SHA-256 checksum must be exactly 64 hexadecimal characters');

// -----------------------------------------------------------------------------
// Test 2: Checksum immutability
// -----------------------------------------------------------------------------
const testString = 'SELECT 1;';
const hash1 = calculateChecksum(testString);
const hash2 = calculateChecksum(testString);
assert.strictEqual(hash1, hash2, 'Checksum calculation must be strictly deterministic');

// -----------------------------------------------------------------------------
// Test 3: Environment Schema Validation
// -----------------------------------------------------------------------------
// Valid configuration without migration credentials
const validConfig = {
  DB_HOST: 'localhost',
  DB_PORT: '3306',
  DB_USER: 'test_user',
  DB_PASSWORD: 'test_password',
  DB_NAME: 'test_db',
  NODE_BACKEND_PORT: '5000',
  NODE_ENV: 'test',
  PYTHON_SERVICE_URL: 'http://127.0.0.1:8000'
};
const parsed = envSchema.safeParse(validConfig);
assert.strictEqual(parsed.success, true, 'Valid environment configuration must parse successfully without migration credentials');
if (parsed.success) {
  assert.strictEqual(parsed.data.DB_PORT, 3306, 'DB_PORT must be coerced to integer');
  assert.strictEqual(parsed.data.NODE_BACKEND_PORT, 5000, 'NODE_BACKEND_PORT must be coerced to integer');
  assert.strictEqual(parsed.data.MIGRATION_DB_USER, undefined, 'MIGRATION_DB_USER must be undefined when omitted');
  assert.strictEqual(parsed.data.MIGRATION_DB_PASSWORD, undefined, 'MIGRATION_DB_PASSWORD must be undefined when omitted');
}

// Valid configuration with optional migration credentials
const validWithMigrationCredentials = {
  ...validConfig,
  MIGRATION_DB_USER: 'marketplace_migrator',
  MIGRATION_DB_PASSWORD: 'secure_migration_password'
};
const parsedWithMigration = envSchema.safeParse(validWithMigrationCredentials);
assert.strictEqual(parsedWithMigration.success, true, 'Environment configuration must parse successfully with optional migration credentials');
if (parsedWithMigration.success) {
  assert.strictEqual(parsedWithMigration.data.MIGRATION_DB_USER, 'marketplace_migrator');
  assert.strictEqual(parsedWithMigration.data.MIGRATION_DB_PASSWORD, 'secure_migration_password');
}

// Invalid configuration (missing required DB_USER, DB_NAME, DB_HOST)
const invalidConfig = {
  DB_PASSWORD: 'only_password'
};
const invalidParsed = envSchema.safeParse(invalidConfig);
assert.strictEqual(invalidParsed.success, false, 'Invalid environment configuration must fail parsing');

// -----------------------------------------------------------------------------
// Test 4: Destructive Rollback Safety Guard
// -----------------------------------------------------------------------------
(async () => {
  let guardTriggered = false;
  try {
    // Calling runMigrationsDown without --confirm or forceConfirm must throw
    await runMigrationsDown(false);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('Destructive down migration rejected')) {
      guardTriggered = true;
    }
  }
  assert.strictEqual(guardTriggered, true, 'Destructive down migration MUST be blocked without explicit confirmation');
  console.log('PASS: Destructive down migration safety guard verified.');

  // ---------------------------------------------------------------------------
  // Test 5: createMigrationPool Credential Enforcement & Protected Configuration (Offline Validation)
  // ---------------------------------------------------------------------------
  const originalEnv = { ...process.env };
  try {
    // Case A: Missing MIGRATION_DB_USER throws descriptive error before connecting
    delete process.env.MIGRATION_DB_USER;
    delete process.env.MIGRATION_DB_PASSWORD;
    resetEnvCache();

    let missingUserThrown = false;
    try {
      createMigrationPool();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('MIGRATION_DB_USER is required for migration operations')) {
        missingUserThrown = true;
      }
    }
    assert.strictEqual(missingUserThrown, true, 'createMigrationPool must reject missing MIGRATION_DB_USER');

    // Case B: Missing MIGRATION_DB_PASSWORD throws descriptive error before connecting
    process.env.MIGRATION_DB_USER = 'marketplace_migrator';
    delete process.env.MIGRATION_DB_PASSWORD;
    resetEnvCache();

    let missingPasswordThrown = false;
    try {
      createMigrationPool();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('MIGRATION_DB_PASSWORD is required for migration operations')) {
        missingPasswordThrown = true;
      }
    }
    assert.strictEqual(missingPasswordThrown, true, 'createMigrationPool must reject missing MIGRATION_DB_PASSWORD');

    // Setup valid migration credentials in environment for regression tests
    process.env.MIGRATION_DB_USER = 'marketplace_migrator';
    process.env.MIGRATION_DB_PASSWORD = 'secure_migration_password';
    resetEnvCache();

    // Case C: Regression tests - attempts to override protected configuration MUST be rejected
    const protectedOverrideAttempts: Array<{ key: string; payload: any }> = [
      { key: 'user', payload: { user: 'malicious_user' } },
      { key: 'password', payload: { password: 'wrong_password' } },
      { key: 'connectionLimit', payload: { connectionLimit: 10 } },
      { key: 'multipleStatements', payload: { multipleStatements: false } },
      { key: 'database', payload: { database: 'compromised_db' } },
      { key: 'host', payload: { host: 'rogue_host' } },
      { key: 'port', payload: { port: 9999 } }
    ];

    for (const { key, payload } of protectedOverrideAttempts) {
      let rejected = false;
      try {
        createMigrationPool(payload);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes(`Attempted to override protected migration pool property "${key}"`)) {
          rejected = true;
        }
      }
      assert.strictEqual(rejected, true, `createMigrationPool must reject attempts to override protected property "${key}"`);
    }

    // Case D: Valid migration credentials with safe option creates pool successfully without live connection
    const pool = createMigrationPool({ connectTimeout: 15000 });
    assert.ok(pool, 'createMigrationPool must return a pool object when migration credentials are provided with safe options');
    await pool.end();
    console.log('PASS: createMigrationPool credential enforcement, security overrides rejection, and offline validation verified.');
  } finally {
    process.env = { ...originalEnv };
    resetEnvCache();
  }

  // ---------------------------------------------------------------------------
  // Test 6: Deterministic Environment File Resolution
  // ---------------------------------------------------------------------------
  const resolvedPath = resolveEnvFilePath();
  assert.ok(resolvedPath, 'resolveEnvFilePath must find a valid .env file');
  assert.ok(fs.existsSync(resolvedPath), 'Resolved .env file path must exist on disk');
  assert.ok(resolvedPath.endsWith('.env'), 'Resolved file path must end with .env');
  assert.ok(resolvedPath.includes('backend'), 'Resolved path must target backend/.env');

  // Case A: Verify DOTENV_CONFIG_PATH override
  const customEnvPath = path.resolve(__dirname, '../.env.example');
  process.env.DOTENV_CONFIG_PATH = customEnvPath;
  assert.strictEqual(resolveEnvFilePath(), customEnvPath, 'Explicit DOTENV_CONFIG_PATH must be respected');
  delete process.env.DOTENV_CONFIG_PATH;

  // Case B: Verify loadEnv preserves pre-existing environment variables
  const sentinelKey = 'TEST_PRESERVE_PREEXISTING_VAR';
  process.env[sentinelKey] = 'original_value';
  loadEnv();
  assert.strictEqual(process.env[sentinelKey], 'original_value', 'loadEnv must not overwrite pre-existing process.env variables');
  delete process.env[sentinelKey];
  console.log('PASS: Deterministic environment file path resolution and variable preservation verified.');

  console.log('ALL BACKEND UNIT TESTS PASSED (100%).');
})();
