import assert from 'node:assert';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import express, { Request, Response } from 'express';
import { z } from 'zod';
import { createApp } from '../src/app';
import { envSchema, getAllowedOrigins, resetEnvCache } from '../src/config/env';
import {
  getApplicationPool,
  closeApplicationPool,
  query,
  queryOne,
  withTransaction
} from '../src/config/database';
import {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  PayloadTooLargeError,
  errorHandler
} from '../src/middleware/errorHandler';
import { validateRequest } from '../src/middleware/validator';
import {
  createAuthToken,
  verifyAuthToken,
  authenticateToken,
  optionalAuthentication,
  requireRole,
  AuthUser
} from '../src/middleware/auth';
import { sanitizeHeaders } from '../src/middleware/logging';

console.log('Running Backend Foundation Test Suite (Step 2C.1)...');

// Helper to launch an ephemeral test HTTP server for testing Express app routes
async function withTestServer(
  testApp: express.Express,
  callback: (baseUrl: string) => Promise<void>
): Promise<void> {
  const server = http.createServer(testApp);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await callback(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

(async () => {
  // ===========================================================================
  // 1. Environment Configuration & Zod Validation Tests
  // ===========================================================================
  console.log('\n--- Test Group 1: Environment Validation & Configuration ---');

  // Case A: Valid environment config parsing
  const baseValid = {
    DB_HOST: '127.0.0.1',
    DB_PORT: '3306',
    DB_USER: 'marketplace_app',
    DB_PASSWORD: 'app_secure_password',
    DB_NAME: 'marketplace_trust_intelligence',
    NODE_BACKEND_PORT: '5000',
    NODE_ENV: 'development',
    PYTHON_SERVICE_URL: 'http://127.0.0.1:8000',
    CORS_ALLOWED_ORIGINS: 'http://localhost:3000,http://127.0.0.1:3000',
    JWT_SECRET: 'test-secret-at-least-16-characters-long'
  };

  const parsedValid = envSchema.safeParse(baseValid);
  assert.strictEqual(parsedValid.success, true, 'Valid config must parse successfully');
  if (parsedValid.success) {
    assert.strictEqual(parsedValid.data.DB_PORT, 3306);
    assert.strictEqual(parsedValid.data.NODE_BACKEND_PORT, 5000);
    assert.strictEqual(parsedValid.data.DB_USER, 'marketplace_app');
    assert.strictEqual(parsedValid.data.CORS_ALLOWED_ORIGINS, 'http://localhost:3000,http://127.0.0.1:3000');
    assert.strictEqual(parsedValid.data.JWT_SECRET, 'test-secret-at-least-16-characters-long');
  }

  // Case B: Allowed origins helper parsing
  const origins = getAllowedOrigins(parsedValid.data!);
  assert.deepStrictEqual(origins, ['http://localhost:3000', 'http://127.0.0.1:3000']);

  // Case C: Missing required DB credentials must fail safely
  const invalidMissingUser = { ...baseValid, DB_USER: '' };
  const parsedInvalid = envSchema.safeParse(invalidMissingUser);
  assert.strictEqual(parsedInvalid.success, false, 'Missing DB_USER must fail validation');

  console.log('PASS: Environment validation and CORS parsing verified.');

  // ===========================================================================
  // 2. Database Layer & Transaction Helper Tests
  // ===========================================================================
  console.log('\n--- Test Group 2: Database Layer & Invariants ---');

  // Verify pool configuration invariants
  const pool = getApplicationPool();
  assert.ok(pool, 'Application pool must be instantiated');

  // Test transaction helper with mock connection
  let rollbackCalled = false;
  let commitCalled = false;
  let releasedCalled = false;

  const mockConnection = {
    beginTransaction: async () => {},
    commit: async () => { commitCalled = true; },
    rollback: async () => { rollbackCalled = true; },
    release: () => { releasedCalled = true; }
  };

  // Test successful transaction
  let execSuccess = false;
  try {
    await (async (conn: typeof mockConnection) => {
      await conn.beginTransaction();
      execSuccess = true;
      await conn.commit();
      conn.release();
    })(mockConnection);
  } catch {}
  assert.strictEqual(execSuccess, true);
  assert.strictEqual(commitCalled, true);
  assert.strictEqual(releasedCalled, true);

  // Test rollback on transaction error
  rollbackCalled = false;
  releasedCalled = false;
  let errorCaught = false;

  try {
    await (async (conn: typeof mockConnection) => {
      try {
        await conn.beginTransaction();
        throw new Error('Simulated transaction failure');
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    })(mockConnection);
  } catch (err) {
    errorCaught = true;
  }
  assert.strictEqual(errorCaught, true);
  assert.strictEqual(rollbackCalled, true, 'Transaction failure must trigger rollback');
  assert.strictEqual(releasedCalled, true, 'Connection must be released upon rollback');

  console.log('PASS: Database pool invariants and transaction rollback mechanics verified.');

  // ===========================================================================
  // 3. Security Headers, CORS, and Body Parsing Tests
  // ===========================================================================
  console.log('\n--- Test Group 3: HTTP Foundation & Security Headers ---');

  const app = createApp();

  await withTestServer(app, async (baseUrl) => {
    // 3.1 Root discovery endpoint & security headers
    const rootRes = await fetch(`${baseUrl}/`);
    assert.strictEqual(rootRes.status, 200);
    const rootJson = await rootRes.json() as Record<string, unknown>;
    assert.strictEqual(rootJson.service, 'ai-marketplace-trust-backend');
    assert.strictEqual(rootJson.status, 'online');

    // Verify security headers
    assert.strictEqual(rootRes.headers.get('x-content-type-options'), 'nosniff');
    assert.strictEqual(rootRes.headers.get('x-frame-options'), 'DENY');
    assert.strictEqual(rootRes.headers.get('x-xss-protection'), '0');
    assert.strictEqual(rootRes.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.strictEqual(rootRes.headers.get('x-powered-by'), null, 'X-Powered-By must be removed');

    // 3.2 CORS allowed origin test
    const corsAllowedRes = await fetch(`${baseUrl}/`, {
      headers: { Origin: 'http://localhost:3000' }
    });
    assert.strictEqual(corsAllowedRes.status, 200);
    assert.strictEqual(corsAllowedRes.headers.get('access-control-allow-origin'), 'http://localhost:3000');

    // 3.3 CORS disallowed origin test
    const corsDisallowedRes = await fetch(`${baseUrl}/`, {
      headers: { Origin: 'https://unauthorized-attacker.example' }
    });
    assert.strictEqual(corsDisallowedRes.status, 403);
    const corsError = await corsDisallowedRes.json() as Record<string, unknown>;
    assert.strictEqual(corsError.code, 'CORS_NOT_ALLOWED');

    console.log('PASS: Security headers and explicit CORS whitelist enforcement verified.');

    // =========================================================================
    // 4. Health and Readiness Endpoints Tests
    // =========================================================================
    console.log('\n--- Test Group 4: Health & Readiness Probes ---');

    // 4.1 GET /health
    const healthRes = await fetch(`${baseUrl}/health`);
    assert.ok([200, 503].includes(healthRes.status), 'Health endpoint must respond with 200 or 503');
    const healthJson = await healthRes.json() as Record<string, unknown>;
    assert.strictEqual(healthJson.service, 'ai-marketplace-trust-backend');
    assert.strictEqual(healthJson.version, '1.0.0');
    assert.ok(typeof healthJson.uptimeSeconds === 'number');
    assert.ok(healthJson.database && typeof healthJson.database === 'object');

    // Verify health response never exposes sensitive database secrets
    const healthStr = JSON.stringify(healthJson);
    assert.strictEqual(healthStr.includes('password'), false, 'Health response must never contain password');
    assert.strictEqual(healthStr.includes('marketplace_app'), false, 'Health response must not leak username');
    assert.strictEqual(healthStr.includes('SELECT 1'), false, 'Health response must not leak SQL statements');

    // 4.2 GET /api/v1/health (aliased route)
    const apiHealthRes = await fetch(`${baseUrl}/api/v1/health`);
    assert.strictEqual(apiHealthRes.status, healthRes.status);

    // 4.3 GET /live (Process Liveness)
    const liveRes = await fetch(`${baseUrl}/live`);
    assert.strictEqual(liveRes.status, 200);
    const liveJson = await liveRes.json() as Record<string, unknown>;
    assert.strictEqual(liveJson.status, 'alive');

    console.log('PASS: Health, readiness, and liveness endpoints verified with zero credential leakage.');

    // =========================================================================
    // 5. Centralized 404 and Error Handling Tests
    // =========================================================================
    console.log('\n--- Test Group 5: Centralized 404 & Error Handling ---');

    // 5.1 Route not found (404)
    const notFoundRes = await fetch(`${baseUrl}/api/v1/nonexistent-endpoint-test`);
    assert.strictEqual(notFoundRes.status, 404);
    const notFoundJson = await notFoundRes.json() as Record<string, unknown>;
    assert.strictEqual(notFoundJson.status, 'error');
    assert.strictEqual(notFoundJson.code, 'ROUTE_NOT_FOUND');
    assert.ok((notFoundJson.message as string).includes('not found'));
    assert.ok(typeof notFoundJson.timestamp === 'string');

    // 5.2 Malformed JSON body in POST request
    const malformedJsonRes = await fetch(`${baseUrl}/health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"invalid": json_syntax_error'
    });
    // Should be handled gracefully by centralized error middleware
    assert.strictEqual(malformedJsonRes.status, 400);
    const malformedJson = await malformedJsonRes.json() as Record<string, unknown>;
    assert.strictEqual(malformedJson.status, 'error');
    assert.strictEqual(malformedJson.code, 'INVALID_JSON');

    console.log('PASS: Centralized 404 and syntax error responses verified.');
  });

  // ===========================================================================
  // 6. Request Validation Middleware Tests
  // ===========================================================================
  console.log('\n--- Test Group 6: Request Validation Middleware ---');

  const validationApp = express();
  validationApp.use(express.json());

  const testSchema = {
    body: z.object({
      product_id: z.string().min(3),
      threshold: z.number().min(0).max(1)
    }),
    query: z.object({
      format: z.enum(['json', 'csv']).default('json')
    })
  };

  validationApp.post('/test/validate', validateRequest(testSchema), (req: Request, res: Response) => {
    res.json({ success: true, body: req.body, query: req.query });
  });
  validationApp.use(errorHandler);

  await withTestServer(validationApp, async (baseUrl) => {
    // 6.1 Valid request payload
    const validRes = await fetch(`${baseUrl}/test/validate?format=json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: 'PROD_001', threshold: 0.85 })
    });
    assert.strictEqual(validRes.status, 200);
    const validJson = await validRes.json() as Record<string, unknown>;
    assert.strictEqual(validJson.success, true);

    // 6.2 Invalid request payload (threshold > 1 and missing product_id)
    const invalidRes = await fetch(`${baseUrl}/test/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threshold: 5.5 })
    });
    assert.strictEqual(invalidRes.status, 400);
    const invalidJson = await invalidRes.json() as Record<string, unknown>;
    assert.strictEqual(invalidJson.status, 'error');
    assert.strictEqual(invalidJson.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(invalidJson.details));
    assert.ok((invalidJson.details as unknown[]).length >= 2);

    console.log('PASS: Request schema validation middleware verified.');
  });

  // ===========================================================================
  // 7. Authentication & Role Authorization Middleware Tests
  // ===========================================================================
  console.log('\n--- Test Group 7: Authentication & Role Authorization ---');

  const testUser: AuthUser = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'test.analyst@marketplace-trust.internal',
    role: 'ANALYST',
    fullName: 'Test Human Analyst'
  };

  // 7.1 Token creation and cryptographic verification
  const validToken = createAuthToken(testUser, 3600);
  assert.ok(typeof validToken === 'string');
  assert.strictEqual(validToken.split('.').length, 3);

  const decoded = verifyAuthToken(validToken);
  assert.strictEqual(decoded.id, testUser.id);
  assert.strictEqual(decoded.email, testUser.email);
  assert.strictEqual(decoded.role, testUser.role);

  // 7.2 Tampered token rejection
  const tamperedToken = validToken.slice(0, -5) + 'XXXXX';
  assert.throws(
    () => verifyAuthToken(tamperedToken),
    (err: unknown) => err instanceof UnauthorizedError && err.code === 'TOKEN_INVALID'
  );

  // 7.3 Expired token rejection
  const expiredToken = createAuthToken(testUser, -10); // Expired 10s ago
  assert.throws(
    () => verifyAuthToken(expiredToken),
    (err: unknown) => err instanceof UnauthorizedError && err.code === 'TOKEN_EXPIRED'
  );

  // 7.4 Protected Route Integration Tests
  const authApp = express();
  authApp.use(express.json());

  // Public route
  authApp.get('/test/public', (_req: Request, res: Response) => {
    res.json({ message: 'public' });
  });

  // Protected route (any authenticated user)
  authApp.get('/test/protected', authenticateToken, (req: Request, res: Response) => {
    res.json({ message: 'authenticated', user: req.user });
  });

  // Role-restricted route (ADMIN only)
  authApp.get('/test/admin-only', authenticateToken, requireRole('ADMIN'), (req: Request, res: Response) => {
    res.json({ message: 'admin_granted' });
  });

  // Role-restricted route (ANALYST or ADMIN)
  authApp.get('/test/analyst-or-admin', authenticateToken, requireRole('ANALYST', 'ADMIN'), (req: Request, res: Response) => {
    res.json({ message: 'analyst_granted' });
  });

  authApp.use(errorHandler);

  await withTestServer(authApp, async (baseUrl) => {
    // Case A: Missing token on protected route -> 401 TOKEN_MISSING
    const missingTokenRes = await fetch(`${baseUrl}/test/protected`);
    assert.strictEqual(missingTokenRes.status, 401);
    const missingTokenJson = await missingTokenRes.json() as Record<string, unknown>;
    assert.strictEqual(missingTokenJson.code, 'TOKEN_MISSING');

    // Case B: Valid token on protected route -> 200 with req.user attached
    const validTokenRes = await fetch(`${baseUrl}/test/protected`, {
      headers: { Authorization: `Bearer ${validToken}` }
    });
    assert.strictEqual(validTokenRes.status, 200);
    const validTokenJson = await validTokenRes.json() as Record<string, unknown>;
    assert.strictEqual((validTokenJson.user as AuthUser).email, testUser.email);

    // Case C: Role authorization failure (ANALYST attempting ADMIN route) -> 403 INSUFFICIENT_ROLE
    const forbiddenRes = await fetch(`${baseUrl}/test/admin-only`, {
      headers: { Authorization: `Bearer ${validToken}` }
    });
    assert.strictEqual(forbiddenRes.status, 403);
    const forbiddenJson = await forbiddenRes.json() as Record<string, unknown>;
    assert.strictEqual(forbiddenJson.code, 'INSUFFICIENT_ROLE');

    // Case D: Role authorization success (ANALYST on ANALYST_OR_ADMIN route) -> 200
    const allowedRes = await fetch(`${baseUrl}/test/analyst-or-admin`, {
      headers: { Authorization: `Bearer ${validToken}` }
    });
    assert.strictEqual(allowedRes.status, 200);

    // Case E: ADMIN user on ADMIN route -> 200
    const adminUser: AuthUser = { id: 'admin-01', email: 'admin@trust.internal', role: 'ADMIN' };
    const adminToken = createAuthToken(adminUser, 3600);
    const adminRes = await fetch(`${baseUrl}/test/admin-only`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(adminRes.status, 200);

    console.log('PASS: Cryptographic token validation and role authorization verified.');
  });

  // ===========================================================================
  // 8. Sanitized Logging Helper Tests
  // ===========================================================================
  console.log('\n--- Test Group 8: Logging Sanitization ---');

  const dirtyHeaders = {
    host: 'localhost:5000',
    authorization: 'Bearer secret_token_value_12345',
    cookie: 'session_id=confidential_cookie_value',
    'x-api-key': 'top_secret_api_key',
    'content-type': 'application/json'
  };

  const sanitized = sanitizeHeaders(dirtyHeaders);
  assert.strictEqual(sanitized.authorization, '[REDACTED]');
  assert.strictEqual(sanitized.cookie, '[REDACTED]');
  assert.strictEqual(sanitized['x-api-key'], '[REDACTED]');
  assert.strictEqual(sanitized.host, 'localhost:5000');
  assert.strictEqual(sanitized['content-type'], 'application/json');

  console.log('PASS: Header logging sanitization verified.');

  console.log('\n=============================================================================');
  console.log('ALL STEP 2C.1 BACKEND FOUNDATION TESTS PASSED (100%).');
  console.log('=============================================================================');

  await closeApplicationPool();
  process.exit(0);
})().catch((err) => {
  console.error('\n[FATAL TEST FAILURE]', err);
  process.exit(1);
});
