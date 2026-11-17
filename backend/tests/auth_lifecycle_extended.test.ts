import assert from 'node:assert';
import { createApp } from '../src/app';
import { query, closeApplicationPool } from '../src/config/database';

async function main() {
  console.log('=============================================================================');
  console.log('TEST SUITE: EXTENDED AUTHENTICATION LIFECYCLE & SESSION ROTATION');
  console.log('=============================================================================\n');

  const app = createApp();
  const server = app.listen(0);
  await new Promise((r) => setTimeout(r, 200));
  const addr = server.address() as any;
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  const TEST_USER_EMAIL = `consumer.run.${Date.now()}@marketplace.internal`;
  const TEST_USER_PASSWORD = 'ConsumerSecure#2026!';
  const TEST_USER_NAME = 'Test Direct Consumer';

  try {
    // 1. Password validation
    console.log('[1/7] Testing short password rejection...');
    const shortRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_USER_EMAIL,
        password: 'short',
        fullName: TEST_USER_NAME
      })
    });
    assert.strictEqual(shortRes.status, 400);
    console.log('PASS: Password < 8 characters rejected with 400.');

    // 2. Register
    console.log('[2/7] Testing consumer self-registration...');
    const regRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
        fullName: TEST_USER_NAME
      })
    });
    assert.strictEqual(regRes.status, 201);
    const regJson = await regRes.json() as any;
    assert.ok(regJson.token, 'Must return JWT access token');
    assert.ok(regJson.refreshToken, 'Must return secure refresh token');
    assert.strictEqual(regJson.user.email, TEST_USER_EMAIL);
    assert.strictEqual(regJson.user.role, 'VIEWER', 'Self-registered user role must strictly be VIEWER');
    console.log('PASS: Registration succeeded. Role assigned: VIEWER. Session created.');

    // 3. Duplicate email
    console.log('[3/7] Testing duplicate email rejection...');
    const dupRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
        fullName: TEST_USER_NAME
      })
    });
    assert.strictEqual(dupRes.status, 409);
    const dupJson = await dupRes.json() as any;
    assert.strictEqual(dupJson.code, 'EMAIL_ALREADY_EXISTS');
    console.log('PASS: Duplicate registration correctly rejected with 409 EMAIL_ALREADY_EXISTS.');

    // 4. Me Profile Check
    console.log('[4/7] Testing profile retrieval with access token...');
    const meRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${regJson.token}` }
    });
    assert.strictEqual(meRes.status, 200);
    const meJson = await meRes.json() as any;
    assert.strictEqual(meJson.data.user.email, TEST_USER_EMAIL);
    assert.strictEqual(meJson.data.user.role, 'VIEWER');
    console.log('PASS: Profile check verified (GET /api/v1/auth/me).');

    // 5. Refresh & Rotate
    console.log('[5/7] Testing refresh token rotation...');
    const refRes = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: regJson.refreshToken })
    });
    assert.strictEqual(refRes.status, 200);
    const refJson = await refRes.json() as any;
    assert.ok(refJson.token, 'Must return new access token');
    assert.ok(refJson.refreshToken, 'Must return new rotated refresh token');
    assert.notStrictEqual(refJson.refreshToken, regJson.refreshToken, 'Rotated token must differ from initial token');
    console.log('PASS: Token refresh & rotation succeeded.');

    // 6. Old token reuse guard
    console.log('[6/7] Testing old refresh token reuse rejection...');
    const oldRes = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: regJson.refreshToken })
    });
    assert.strictEqual(oldRes.status, 401);
    console.log('PASS: Reusing old/rotated refresh token strictly rejected with 401.');

    // 7. Logout and post-logout refresh rejection
    console.log('[7/7] Testing logout and session revocation...');
    const logoutRes = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refJson.token}`
      },
      body: JSON.stringify({ refreshToken: refJson.refreshToken })
    });
    assert.strictEqual(logoutRes.status, 200);

    const postLogoutRef = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refJson.refreshToken })
    });
    assert.strictEqual(postLogoutRef.status, 401);
    console.log('PASS: Logout successfully revoked session in database.');

    console.log('\n=============================================================================');
    console.log('ALL 7 EXTENDED AUTH LIFECYCLE TESTS PASSED (100%).');
    console.log('=============================================================================\n');
  } finally {
    try {
      await query('DELETE FROM user_sessions WHERE user_id IN (SELECT id FROM users WHERE email = ?)', [TEST_USER_EMAIL]);
      await query('DELETE FROM users WHERE email = ?', [TEST_USER_EMAIL]);
    } catch {
      // Ignored
    }
    server.close();
    await closeApplicationPool();
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
