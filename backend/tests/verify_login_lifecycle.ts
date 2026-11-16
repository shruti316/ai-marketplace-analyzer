import assert from 'node:assert';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import express from 'express';
import { createApp } from '../src/app';
import { closeApplicationPool } from '../src/config/database';

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

async function runAudit() {
  console.log('=============================================================================');
  console.log('Phase 4.1.3: Live Integration & Authentication Lifecycle Verification');
  console.log('=============================================================================');

  const app = createApp();

  await withTestServer(app, async (baseUrl) => {
    // 1. Health Probe Verification
    console.log('\n[1/6] Verifying System Health Probe (/api/v1/health)...');
    const healthRes = await fetch(`${baseUrl}/api/v1/health`);
    assert.strictEqual(healthRes.status, 200, 'Health endpoint must respond with 200');
    const healthJson = await healthRes.json() as any;
    assert.strictEqual(healthJson.status, 'healthy');
    assert.strictEqual(healthJson.database.status, 'connected');
    console.log('PASS: System health probe verified. Database connected.');

    // 2. Negative Authentication: Bad password
    console.log('\n[2/6] Verifying Negative Authentication Guard (Invalid Password)...');
    const badLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@marketplace.internal',
        password: 'IncorrectPassword#123'
      })
    });
    assert.strictEqual(badLoginRes.status, 401, 'Invalid password must be rejected with 401');
    const badLoginJson = await badLoginRes.json() as any;
    assert.strictEqual(badLoginJson.code, 'INVALID_CREDENTIALS');
    console.log('PASS: Invalid password correctly rejected with 401 INVALID_CREDENTIALS.');

    // 3. Positive Authentication: Admin Login
    console.log('\n[3/6] Verifying Admin Authentication Flow (admin@marketplace.internal)...');
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.ADMIN_EMAIL || 'admin@marketplace.internal',
        password: process.env.ADMIN_PASSWORD || 'TrustAdmin#2026!'
      })
    });
    assert.strictEqual(loginRes.status, 200, 'Valid admin login must return 200');
    const loginJson = await loginRes.json() as any;
    assert.strictEqual(loginJson.status, 'success');
    assert.ok(loginJson.token, 'JWT token must be returned upon successful login');
    assert.strictEqual(loginJson.user.email, 'admin@marketplace.internal');
    assert.strictEqual(loginJson.user.role, 'ADMIN');
    const token = loginJson.token;
    console.log(`PASS: Admin login successful. Token acquired. User: ${loginJson.user.fullName} (${loginJson.user.role}).`);

    // 4. Session Validation: /api/v1/auth/me
    console.log('\n[4/6] Verifying Session Profile Endpoint (/api/v1/auth/me)...');
    const meRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(meRes.status, 200, 'Protected profile endpoint must return 200');
    const meJson = await meRes.json() as any;
    assert.strictEqual(meJson.status, 'success');
    assert.strictEqual(meJson.data.user.email, 'admin@marketplace.internal');
    assert.strictEqual(meJson.data.user.role, 'ADMIN');
    assert.strictEqual(meJson.data.user.isActive, true);
    console.log('PASS: Authenticated user profile retrieved successfully.');

    // 5. Catalog Products Query: /api/v1/products
    console.log('\n[5/6] Verifying Catalog Products Endpoint (/api/v1/products?limit=6)...');
    const productsRes = await fetch(`${baseUrl}/api/v1/products?limit=6`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(productsRes.status, 200, 'Catalog products endpoint must return 200');
    const productsJson = await productsRes.json() as any;
    assert.strictEqual(productsJson.status, 'success');
    assert.ok(Array.isArray(productsJson.data.items), 'data.items must be an array');
    assert.strictEqual(productsJson.data.items.length, 6, 'Must return 6 items as requested');
    assert.ok(productsJson.data.pagination.total > 0, 'Total products count must be greater than 0');
    const sampleProduct = productsJson.data.items[0];
    assert.ok(sampleProduct.canonical_product_id, 'Product must have canonical_product_id');
    assert.ok(sampleProduct.product_title, 'Product must have product_title');
    console.log(`PASS: Catalog products verified. Total items: ${productsJson.data.pagination.total}. Sample product: "${sampleProduct.product_title.substring(0, 40)}..."`);

    // 6. Marketplace Platforms Query: /api/v1/platforms
    console.log('\n[6/6] Verifying Retail Platforms Endpoint (/api/v1/platforms)...');
    const platformsRes = await fetch(`${baseUrl}/api/v1/platforms`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(platformsRes.status, 200, 'Platforms endpoint must return 200');
    const platformsJson = await platformsRes.json() as any;
    assert.strictEqual(platformsJson.status, 'success');
    const platformItems = platformsJson.data.items || platformsJson.data;
    assert.strictEqual(platformItems.length, 3, 'Must return 3 marketplace platforms');
    const platformNames = platformItems.map((p: any) => p.platform_name || p.name).sort();
    console.log(`PASS: Retail platforms verified: [${platformNames.join(', ')}].`);
  });

  console.log('\n=============================================================================');
  console.log('ALL 6 END-TO-END INTEGRATION AUDIT STEPS PASSED SUCCESSFULLY (100%).');
  console.log('=============================================================================');
}

runAudit()
  .catch((err) => {
    console.error('Audit failed with error:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeApplicationPool();
  });
