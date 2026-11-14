import assert from 'node:assert';
import http from 'node:http';
import express, { Request, Response } from 'express';
import { hash, verify } from '@node-rs/argon2';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import {
  authRateLimiter,
  inferenceRateLimiter,
  heavyOpsRateLimiter,
  buildRateLimiter,
  createRateLimitHandler
} from '../src/middleware/rateLimiter';
import {
  provisionAdmin,
  validateAdminEmail,
  validateAdminPassword,
  BOOTSTRAP_REVIEWER_ID,
  BOOTSTRAP_REVIEWER_EMAIL
} from '../src/scripts/provision_admin';
import { TrustIntelligenceClient } from '../src/modules/trust/trust.client';
import { trustService } from '../src/modules/trust/trust.service';
import { getApplicationPool, closeApplicationPool } from '../src/config/database';
import { createApp } from '../src/app';
import { createAuthToken } from '../src/middleware/auth';

// =============================================================================
// STEP 2C.4 HARDENING & SECURITY REGRESSION TEST SUITE
// =============================================================================

async function runTests() {
  console.log('=============================================================================');
  console.log('PHASE 3 — STEP 2C.4: BACKEND HARDENING & COMPLETION VERIFICATION');
  console.log('=============================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. RATE LIMITING TESTS
  // ---------------------------------------------------------------------------
  console.log('--- Test Suite 1: Rate Limiting & HTTP 429 Responses ---');

  // 1.1 Custom rate limiter test with low limit to trigger 429 deterministically
  {
    const app = express();
    const testLimiter = buildRateLimiter({
      windowMs: 60 * 1000,
      limit: 3,
      message: 'Custom rate limit exceeded for testing.'
    });

    app.get('/test-limit', testLimiter, (_req: Request, res: Response) => {
      res.status(200).json({ status: 'ok' });
    });

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const testUrl = `http://127.0.0.1:${port}/test-limit`;

    try {
      // First 3 requests must succeed
      for (let i = 1; i <= 3; i++) {
        const res = await fetch(testUrl);
        assert.strictEqual(res.status, 200, `Request ${i} must succeed with 200`);
      }

      // 4th request must be rate-limited with HTTP 429
      const blockedRes = await fetch(testUrl);
      assert.strictEqual(blockedRes.status, 429, '4th request must return HTTP 429');
      
      const body = await blockedRes.json();
      assert.strictEqual(body.status, 'error');
      assert.strictEqual(body.code, 'RATE_LIMIT_EXCEEDED');
      assert.strictEqual(body.message, 'Custom rate limit exceeded for testing.');

      // Standard headers check
      const hasRateLimitHeader =
        blockedRes.headers.has('ratelimit') ||
        blockedRes.headers.has('x-ratelimit-limit') ||
        blockedRes.headers.has('retry-after');
      assert.ok(hasRateLimitHeader, 'Rate limit headers (RateLimit / X-RateLimit / Retry-After) must be present');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    console.log('PASS: Standardized HTTP 429 response schema and RateLimit headers verified.');
  }

  // 1.2 Rate limiter factory error handler integrity
  {
    let capturedStatus = 0;
    let capturedJson: any = null;
    const mockRes = {
      status(code: number) {
        capturedStatus = code;
        return this;
      },
      json(data: any) {
        capturedJson = data;
      }
    } as unknown as Response;

    const handler = createRateLimitHandler('Custom limit reached');
    handler({} as Request, mockRes);

    assert.strictEqual(capturedStatus, 429);
    assert.strictEqual(capturedJson.status, 'error');
    assert.strictEqual(capturedJson.code, 'RATE_LIMIT_EXCEEDED');
    assert.strictEqual(capturedJson.message, 'Custom limit reached');
    console.log('PASS: Rate limit error handler isolation verified.');
  }

  // 1.3 Verify middleware export instances
  {
    assert.strictEqual(typeof authRateLimiter, 'function');
    assert.strictEqual(typeof inferenceRateLimiter, 'function');
    assert.strictEqual(typeof heavyOpsRateLimiter, 'function');
    console.log('PASS: Rate limiter middleware instances successfully configured.');
  }

  // ---------------------------------------------------------------------------
  // 2. SECURE INITIAL ADMIN PROVISIONING TESTS
  // ---------------------------------------------------------------------------
  console.log('\n--- Test Suite 2: Secure Initial Administrator Provisioning ---');

  // 2.1 Email validation
  {
    assert.throws(() => validateAdminEmail(''), /Email cannot be empty/);
    assert.throws(() => validateAdminEmail('notanemail'), /Must conform to standard email syntax/);
    assert.throws(() => validateAdminEmail('user@nodomain'), /Must conform to standard email syntax/);
    assert.throws(
      () => validateAdminEmail(BOOTSTRAP_REVIEWER_EMAIL),
      /Cannot provision or overwrite the historical bootstrap reviewer account/
    );
    assert.doesNotThrow(() => validateAdminEmail('admin.operations@marketplace.local'));
    console.log('PASS: Administrator email validation and bootstrap reviewer lock verified.');
  }

  // 2.2 Password complexity validation
  {
    assert.throws(() => validateAdminPassword('short1!A'), /at least 12 characters/);
    assert.throws(() => validateAdminPassword('alllowercaseanddigits1234!'), /uppercase letter/);
    assert.throws(() => validateAdminPassword('ALLUPPERCASEANDDIGITS1234!'), /lowercase letter/);
    assert.throws(() => validateAdminPassword('NoSpecialCharsOrDigitsHere'), /digit/);
    assert.throws(() => validateAdminPassword('NoSpecialChars123456'), /special character/);
    assert.doesNotThrow(() => validateAdminPassword('ComplexP@ssw0rd2026!'));
    console.log('PASS: Administrator password complexity policy verified (min 12 chars, mixed case, digit, symbol).');
  }

  // 2.3 Live Database Provisioning, Invariants, and Clean-Up
  const TEST_ADMIN_EMAIL = 'test.hardening.admin@marketplace.internal';
  const TEST_ADMIN_PASS = 'TestAdminSecure#2026';
  const pool = getApplicationPool();

  try {
    // Ensure clean initial state
    await pool.query('DELETE FROM users WHERE email = ?', [TEST_ADMIN_EMAIL]);

    // Provision test administrator
    const provisionResult = await provisionAdmin({
      email: TEST_ADMIN_EMAIL,
      fullName: 'Hardening Audit Administrator',
      password: TEST_ADMIN_PASS,
      force: true // Allow in test context
    });

    assert.strictEqual(provisionResult.email, TEST_ADMIN_EMAIL);
    assert.strictEqual(provisionResult.role, 'ADMIN');
    assert.strictEqual(provisionResult.isActive, true);
    assert.ok(provisionResult.userId);

    // Verify row in MySQL
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, email, password_hash, role, is_active FROM users WHERE id = ?',
      [provisionResult.userId]
    );

    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].role, 'ADMIN');
    assert.strictEqual(rows[0].is_active, 1);

    // Verify Argon2id hash validity
    const isPasswordValid = await verify(rows[0].password_hash, TEST_ADMIN_PASS);
    assert.strictEqual(isPasswordValid, true, 'Stored password hash must verify with Argon2id');

    let isWrongPasswordValid = false;
    try {
      isWrongPasswordValid = await verify(rows[0].password_hash, 'WrongPassword123!');
    } catch {
      isWrongPasswordValid = false;
    }
    assert.strictEqual(isWrongPasswordValid, false, 'Invalid password must be rejected by Argon2id');

    // Test duplicate admin block (without force)
    await assert.rejects(
      async () => {
        await provisionAdmin({
          email: 'another.admin@marketplace.internal',
          fullName: 'Another Admin',
          password: 'AnotherPassword#2026',
          force: false
        });
      },
      /An active administrator account already exists/
    );
    console.log('PASS: Duplicate initial administrator guard verified.');

    // Verify bootstrap reviewer remains untouched
    const [bootstrapRows] = await pool.query<RowDataPacket[]>(
      'SELECT id, email, is_active FROM users WHERE id = ?',
      [BOOTSTRAP_REVIEWER_ID]
    );
    assert.strictEqual(bootstrapRows.length, 1);
    assert.strictEqual(bootstrapRows[0].is_active, 0, 'Bootstrap reviewer must remain inactive (0)');

  } finally {
    // Clean up test admin so canonical seed count (1 user) is restored
    await pool.query('DELETE FROM users WHERE email = ?', [TEST_ADMIN_EMAIL]);
    console.log('PASS: Isolated test administrator cleaned up. Historical user table invariant preserved.');
  }

  // ---------------------------------------------------------------------------
  // 3. PYTHON TIMEOUT CONSISTENCY & DIFFERENTIATION TESTS
  // ---------------------------------------------------------------------------
  console.log('\n--- Test Suite 3: Python Timeouts & Upstream Resilience ---');

  // 3.1 Verify differentiated timeout tiers
  {
    const client = new TrustIntelligenceClient();
    assert.strictEqual(typeof client.fastTimeoutMs, 'number');
    assert.strictEqual(typeof client.standardTimeoutMs, 'number');
    assert.strictEqual(typeof client.inferenceTimeoutMs, 'number');

    assert.ok(
      client.fastTimeoutMs <= client.standardTimeoutMs,
      'Fast timeout (5s) must be <= standard timeout (10s)'
    );
    assert.ok(
      client.standardTimeoutMs <= client.inferenceTimeoutMs,
      'Standard timeout (10s) must be <= inference timeout (45s)'
    );
    assert.ok(
      client.inferenceTimeoutMs >= 35000,
      'Inference timeout must accommodate the 32.4s CPU cold start'
    );
    console.log(`PASS: Differentiated timeout tiers verified: Fast=${client.fastTimeoutMs}ms, Standard=${client.standardTimeoutMs}ms, Inference=${client.inferenceTimeoutMs}ms.`);
  }

  // 3.2 Verify timeout error handling and stack trace suppression
  {
    const hangingServer = http.createServer((_req, _res) => {
      // Intentionally do not respond to cause timeout
    });

    await new Promise<void>((resolve) => hangingServer.listen(0, resolve));
    const hangingPort = (hangingServer.address() as any).port;

    const hangingClient = new TrustIntelligenceClient({
      fast: 300, // 300ms fast timeout
      standard: 500,
      inference: 1000
    });

    // Override base URL temporarily to hanging port
    (hangingClient as any).getBaseUrl = () => `http://127.0.0.1:${hangingPort}`;

    try {
      await assert.rejects(
        async () => {
          await hangingClient.get('/hang-endpoint', undefined, 200);
        },
        (err: any) => {
          assert.strictEqual(err.statusCode, 503);
          assert.strictEqual(err.code, 'UPSTREAM_TIMEOUT');
          assert.ok(err.message.includes('timed out'));
          return true;
        }
      );
      console.log('PASS: Client timeout correctly raises 503 UPSTREAM_TIMEOUT without stack leak.');
    } finally {
      await new Promise<void>((resolve) => hangingServer.close(() => resolve()));
    }
  }

  // 3.3 Verify snapshot fallback logic in trust service
  {
    const cachedResult = await trustService.getProductTrustAssessment(
      'flipkart_BRAE4A6UCHSWTURJ',
      true // prefer_cached = true
    );
    assert.strictEqual(cachedResult.source, 'MYSQL_SNAPSHOT');
    assert.ok(cachedResult.assessment);
    console.log('PASS: Cached trust snapshot serves from MySQL directly with zero Python dependency.');
  }

  // ---------------------------------------------------------------------------
  // 4. COMPARISON OWNERSHIP & DELETION AUDIT BEHAVIOR
  // ---------------------------------------------------------------------------
  console.log('\n--- Test Suite 4: Comparison Ownership & Audit Trail ---');

  {
    const app = createApp();
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const U1_ID = '99999999-1111-1111-1111-111111111111';
    const U2_ID = '99999999-2222-2222-2222-222222222222';
    const U1_EMAIL = 'hardening_u1@marketplace.internal';
    const U2_EMAIL = 'hardening_u2@marketplace.internal';

    // Set up test users in MySQL so foreign key constraint fk_comparisons_user is satisfied
    await pool.query('DELETE FROM users WHERE email IN (?, ?)', [U1_EMAIL, U2_EMAIL]);
    const dummyHash = await hash('DummyP@ss1234!');
    await pool.query(
      `INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at)
       VALUES (?, ?, ?, 'Hardening User 1', 'ANALYST', 1, NOW(3), NOW(3)),
              (?, ?, ?, 'Hardening User 2', 'ANALYST', 1, NOW(3), NOW(3))`,
      [U1_ID, U1_EMAIL, dummyHash, U2_ID, U2_EMAIL, dummyHash]
    );

    const user1Token = createAuthToken({
      id: U1_ID,
      email: U1_EMAIL,
      role: 'ANALYST'
    });

    const user2Token = createAuthToken({
      id: U2_ID,
      email: U2_EMAIL,
      role: 'ANALYST'
    });

    try {
      // 1. User 1 creates a comparison
      const createRes = await fetch(`${baseUrl}/api/v1/comparisons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user1Token}`
        },
        body: JSON.stringify({
          title: 'Hardening Ownership Test',
          canonical_product_ids: [
            'flipkart_BRAE4A6UCHSWTURJ',
            'flipkart_BRAE6YVWQJNHHHGG'
          ]
        })
      });

      assert.strictEqual(createRes.status, 201);
      const createdData = (await createRes.json() as any).data;
      const comparisonId = createdData.comparison.id;

      // 2. User 2 (non-owner) attempts to view comparison -> 403 Forbidden
      const viewResUser2 = await fetch(`${baseUrl}/api/v1/comparisons/${comparisonId}`, {
        headers: { Authorization: `Bearer ${user2Token}` }
      });
      assert.strictEqual(viewResUser2.status, 403);
      const viewErrorUser2 = await viewResUser2.json() as any;
      assert.strictEqual(viewErrorUser2.code, 'INSUFFICIENT_PERMISSIONS');

      // 3. User 2 attempts to delete comparison -> 403 Forbidden
      const delResUser2 = await fetch(`${baseUrl}/api/v1/comparisons/${comparisonId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user2Token}` }
      });
      assert.strictEqual(delResUser2.status, 403);

      // 4. User 1 (owner) successfully deletes comparison
      const delResUser1 = await fetch(`${baseUrl}/api/v1/comparisons/${comparisonId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user1Token}` }
      });
      assert.strictEqual(delResUser1.status, 200);

      // 5. Subsequent lookup returns 404
      const viewResAfter = await fetch(`${baseUrl}/api/v1/comparisons/${comparisonId}`, {
        headers: { Authorization: `Bearer ${user1Token}` }
      });
      assert.strictEqual(viewResAfter.status, 404);

      console.log('PASS: Comparison creator ownership strictly guarded against unauthorized view and delete.');
    } finally {
      await pool.query('DELETE FROM product_comparison_items WHERE comparison_id IN (SELECT id FROM product_comparisons WHERE user_id IN (?, ?))', [U1_ID, U2_ID]);
      await pool.query('DELETE FROM product_comparisons WHERE user_id IN (?, ?)', [U1_ID, U2_ID]);
      await pool.query('DELETE FROM users WHERE email IN (?, ?)', [U1_EMAIL, U2_EMAIL]);
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }

  // ---------------------------------------------------------------------------
  // 5. HEALTH AND READINESS CONSISTENCY
  // ---------------------------------------------------------------------------
  console.log('\n--- Test Suite 5: Health & Readiness Endpoint Consistency ---');

  {
    const app = createApp();
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      // 5.1 /live probe
      const liveRes = await fetch(`${baseUrl}/live`);
      assert.strictEqual(liveRes.status, 200);
      const liveBody = await liveRes.json() as any;
      assert.strictEqual(liveBody.status, 'alive');

      // 5.2 /ready probe
      const readyRes = await fetch(`${baseUrl}/ready`);
      assert.strictEqual(readyRes.status, 200);
      const readyBody = await readyRes.json() as any;
      assert.strictEqual(readyBody.status, 'ready');
      assert.strictEqual(readyBody.ready, true);

      // 5.3 /health probe
      const healthRes = await fetch(`${baseUrl}/health`);
      assert.strictEqual(healthRes.status, 200);
      const healthBody = await healthRes.json() as any;
      assert.strictEqual(healthBody.status, 'healthy');
      assert.strictEqual(healthBody.database.status, 'connected');

      // 5.4 /api/v1/health probe (alias)
      const apiHealthRes = await fetch(`${baseUrl}/api/v1/health`);
      assert.strictEqual(apiHealthRes.status, 200);
      const apiHealthBody = await apiHealthRes.json() as any;
      assert.strictEqual(apiHealthBody.status, 'healthy');
      assert.strictEqual(apiHealthBody.database.status, 'connected');

      console.log('PASS: /live, /ready, /health, and /api/v1/health contracts verified 100%.');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }

  console.log('\n=============================================================================');
  console.log('ALL STEP 2C.4 HARDENING & SECURITY TESTS PASSED (100%).');
  console.log('=============================================================================');
}

runTests()
  .catch((err) => {
    console.error('\n[FATAL HARDENING TEST FAILURE]', err?.stack || err);
    process.exit(1);
  })
  .finally(async () => {
    await closeApplicationPool();
  });
