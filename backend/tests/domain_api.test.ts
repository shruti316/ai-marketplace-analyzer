import assert from 'node:assert';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import express from 'express';
import crypto from 'node:crypto';
import { hash } from '@node-rs/argon2';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app';
import { getEnv } from '../src/config/env';
import { getApplicationPool, closeApplicationPool, query } from '../src/config/database';
import { createAuthToken, AuthUser } from '../src/middleware/auth';

console.log('Running Domain API Integration Test Suite (Step 2C.2)...');

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

// Test fixtures setup
const TEST_ANALYST_USER_ID = '11111111-1111-1111-1111-111111111111';
const TEST_ADMIN_USER_ID = '22222222-2222-2222-2222-222222222222';
const TEST_VIEWER_USER_ID = '33333333-3333-3333-3333-333333333333';
const TEST_INACTIVE_USER_ID = '44444444-4444-4444-4444-444444444444';

const TEST_PASSWORD = 'TestPassword123!Secure';
let testPasswordHash = '';

const TEST_TASK_ID = 'task_test_ann_integration_001';

(async () => {
  const app = createApp();
  const pool = getApplicationPool();

  try {
    // -------------------------------------------------------------------------
    // Setup Temporary Test Fixtures
    // -------------------------------------------------------------------------
    console.log('Setting up isolated test fixtures in database...');
    testPasswordHash = await hash(TEST_PASSWORD);

    // Clean up any stale test fixtures first
    await pool.query('DELETE FROM ground_truth_annotations WHERE task_id = ?', [TEST_TASK_ID]);
    await pool.query('DELETE FROM annotation_adjudications WHERE task_id = ?', [TEST_TASK_ID]);
    await pool.query('DELETE FROM annotation_task_assignments WHERE task_id = ?', [TEST_TASK_ID]);
    await pool.query('DELETE FROM annotation_tasks WHERE id = ?', [TEST_TASK_ID]);
    await pool.query('DELETE FROM product_comparison_items WHERE comparison_id IN (SELECT id FROM product_comparisons WHERE user_id LIKE \'11111111-%\' OR user_id LIKE \'22222222-%\' OR user_id LIKE \'33333333-%\')');
    await pool.query('DELETE FROM product_comparisons WHERE user_id LIKE \'11111111-%\' OR user_id LIKE \'22222222-%\' OR user_id LIKE \'33333333-%\'');
    await pool.query('DELETE FROM users WHERE email LIKE \'%@test-domain.internal\'');

    // 1. Insert active test analyst user
    await pool.query(
      `INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at)
       VALUES (?, 'analyst@test-domain.internal', ?, 'Test Analyst User', 'ANALYST', 1, NOW(3), NOW(3))`,
      [TEST_ANALYST_USER_ID, testPasswordHash]
    );

    // 2. Insert active test admin user
    await pool.query(
      `INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at)
       VALUES (?, 'admin@test-domain.internal', ?, 'Test Admin User', 'ADMIN', 1, NOW(3), NOW(3))`,
      [TEST_ADMIN_USER_ID, testPasswordHash]
    );

    // 3. Insert active test viewer user
    await pool.query(
      `INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at)
       VALUES (?, 'viewer@test-domain.internal', ?, 'Test Viewer User', 'VIEWER', 1, NOW(3), NOW(3))`,
      [TEST_VIEWER_USER_ID, testPasswordHash]
    );

    // 4. Insert inactive test user
    await pool.query(
      `INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at)
       VALUES (?, 'inactive@test-domain.internal', ?, 'Inactive User', 'ANALYST', 0, NOW(3), NOW(3))`,
      [TEST_INACTIVE_USER_ID, testPasswordHash]
    );

    // 5. Insert dedicated test annotation task anchored to an existing canonical product
    await pool.query(
      `INSERT INTO annotation_tasks (
        id, canonical_product_id, marketplace, target_entity_type, target_entity_id,
        task_payload_json, task_status, recommended_annotator_count, target_guidelines_version,
        created_at, updated_at
      ) VALUES (
        ?, 'flipkart_BRAE4A6UCHSWTURJ', 'flipkart', 'REVIEW', 'rev_test_target_001',
        '{"text": "Sample test review payload for integration testing"}', 'PENDING', 2, 'v1.4_ONTOLOGY',
        NOW(3), NOW(3)
      )`,
      [TEST_TASK_ID]
    );

    console.log('Test fixtures created successfully.\n');

    await withTestServer(app, async (baseUrl) => {
      let analystToken = '';
      let adminToken = '';
      let viewerToken = '';

      // =======================================================================
      // MODULE 1: AUTHENTICATION TESTS
      // =======================================================================
      console.log('--- Test Group 1: Module 1 — Authentication APIs ---');

      // 1.1 Unsuccessful login: non-existent email
      {
        const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'nonexistent@test-domain.internal', password: TEST_PASSWORD })
        });
        assert.strictEqual(res.status, 401, 'Non-existent user must return 401');
        const json = await res.json();
        assert.strictEqual(json.code, 'INVALID_CREDENTIALS');
      }

      // 1.2 Unsuccessful login: incorrect password
      {
        const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'analyst@test-domain.internal', password: 'WrongPassword123!' })
        });
        assert.strictEqual(res.status, 401, 'Wrong password must return 401');
        const json = await res.json();
        assert.strictEqual(json.code, 'INVALID_CREDENTIALS');
      }

      // 1.3 Inactive account rejection
      {
        const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'inactive@test-domain.internal', password: TEST_PASSWORD })
        });
        assert.strictEqual(res.status, 401, 'Inactive account must return 401');
        const json = await res.json();
        assert.strictEqual(json.code, 'ACCOUNT_INACTIVE');
      }

      // 1.4 Bootstrap locked account rejection
      {
        const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'system.expert.annotator@marketplace-trust.internal',
            password: 'any_attempted_password'
          })
        });
        assert.strictEqual(res.status, 401, 'Bootstrap locked account must be rejected with 401');
        const json = await res.json();
        assert.ok(['ACCOUNT_INACTIVE', 'ACCOUNT_LOCKED', 'INVALID_CREDENTIALS'].includes(json.code));
      }

      // 1.5 Successful login: Analyst
      {
        const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'analyst@test-domain.internal', password: TEST_PASSWORD })
        });
        assert.strictEqual(res.status, 200, 'Analyst login must return 200');
        const json = await res.json();
        assert.strictEqual(json.status, 'success');
        assert.ok(json.token, 'Token must be returned');
        assert.strictEqual(json.user.role, 'ANALYST');
        assert.strictEqual(json.user.email, 'analyst@test-domain.internal');
        analystToken = json.token;

        // Verify RFC 7519 structure (3 parts separated by dots)
        const parts = analystToken.split('.');
        assert.strictEqual(parts.length, 3, 'Token must be standard 3-part JWT');
      }

      // 1.6 Successful login: Admin & Viewer
      {
        const adminRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin@test-domain.internal', password: TEST_PASSWORD })
        });
        assert.strictEqual(adminRes.status, 200);
        adminToken = (await adminRes.json()).token;

        const viewerRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'viewer@test-domain.internal', password: TEST_PASSWORD })
        });
        assert.strictEqual(viewerRes.status, 200);
        viewerToken = (await viewerRes.json()).token;
      }

      // 1.7 Current user profile GET /api/v1/auth/me
      {
        const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${analystToken}` }
        });
        assert.strictEqual(res.status, 200, 'Authenticated profile retrieval must return 200');
        const json = await res.json();
        assert.strictEqual(json.data.user.id, TEST_ANALYST_USER_ID);
        assert.strictEqual(json.data.user.role, 'ANALYST');
        assert.strictEqual(json.data.user.isActive, true);
      }

      // 1.8 Unauthenticated GET /api/v1/auth/me
      {
        const res = await fetch(`${baseUrl}/api/v1/auth/me`);
        assert.strictEqual(res.status, 401, 'Unauthenticated request must return 401');
      }

      // 1.9 Expired token rejection
      {
        const expiredToken = jwt.sign(
          { id: TEST_ANALYST_USER_ID, email: 'analyst@test-domain.internal', role: 'ANALYST' },
          getEnv().JWT_SECRET,
          { algorithm: 'HS256', expiresIn: -10 }
        );
        const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${expiredToken}` }
        });
        assert.strictEqual(res.status, 401, 'Expired token must return 401');
        const json = await res.json();
        assert.strictEqual(json.code, 'TOKEN_EXPIRED');
      }

      // 1.10 Tampered token signature rejection
      {
        const tampered = analystToken.slice(0, -6) + 'abcdef';
        const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${tampered}` }
        });
        assert.strictEqual(res.status, 401, 'Tampered token must return 401');
        const json = await res.json();
        assert.strictEqual(json.code, 'TOKEN_INVALID');
      }

      // 1.11 Logout
      {
        const res = await fetch(`${baseUrl}/api/v1/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${analystToken}` }
        });
        assert.strictEqual(res.status, 200, 'Logout must return 200');
        const json = await res.json();
        assert.strictEqual(json.status, 'success');
      }

      console.log('PASS: Module 1 (Authentication APIs) verified 100%.');

      // =======================================================================
      // MODULE 2: CATALOG APIs
      // =======================================================================
      console.log('\n--- Test Group 2: Module 2 — Catalog APIs ---');

      // 2.1 GET /api/v1/products pagination & total count
      {
        const res = await fetch(`${baseUrl}/api/v1/products?limit=5&page=1`);
        assert.strictEqual(res.status, 200, 'Catalog products endpoint must return 200');
        const json = await res.json();
        assert.strictEqual(json.status, 'success');
        assert.strictEqual(json.data.items.length, 5);
        assert.strictEqual(json.data.pagination.page, 1);
        assert.strictEqual(json.data.pagination.limit, 5);
        assert.strictEqual(json.data.pagination.total, 3643);
        assert.ok(json.data.items[0].product_title);
        assert.ok(json.data.items[0].brand_name);
      }

      // 2.2 GET /api/v1/products filtering by platform and image presence
      {
        const res = await fetch(`${baseUrl}/api/v1/products?platform_id=PLATFORM_AMAZON_IN&has_image=true&limit=3`);
        assert.strictEqual(res.status, 200);
        const json = await res.json();
        assert.ok(json.data.items.length > 0);
        for (const p of json.data.items) {
          assert.strictEqual(p.platform_id, 'PLATFORM_AMAZON_IN');
          assert.strictEqual(Boolean(p.has_image), true);
        }
      }

      // 2.3 GET /api/v1/products/:id (Known product)
      {
        const res = await fetch(`${baseUrl}/api/v1/products/flipkart_BRAE4A6UCHSWTURJ`);
        assert.strictEqual(res.status, 200);
        const json = await res.json();
        assert.strictEqual(json.data.product.canonical_product_id, 'flipkart_BRAE4A6UCHSWTURJ');
        assert.strictEqual(json.data.product.platform_id, 'PLATFORM_FLIPKART');
      }

      // 2.4 GET /api/v1/products/:id (Unknown product -> 404)
      {
        const res = await fetch(`${baseUrl}/api/v1/products/NONEXISTENT_PRODUCT_ID_12345`);
        assert.strictEqual(res.status, 404, 'Unknown product ID must return 404');
        const json = await res.json();
        assert.strictEqual(json.code, 'PRODUCT_NOT_FOUND');
      }

      // 2.5 GET /api/v1/listings pagination & filtering
      {
        const res = await fetch(`${baseUrl}/api/v1/listings?limit=4&page=1`);
        assert.strictEqual(res.status, 200);
        const json = await res.json();
        assert.strictEqual(json.data.items.length, 4);
        assert.strictEqual(json.data.pagination.total, 3643);
      }

      // 2.6 GET /api/v1/listings/:id (Known listing)
      {
        const res = await fetch(`${baseUrl}/api/v1/listings/list_amazon_in_amazon_in_B000052YQN`);
        assert.strictEqual(res.status, 200);
        const json = await res.json();
        assert.strictEqual(json.data.listing.listing_id, 'list_amazon_in_amazon_in_B000052YQN');
        assert.ok(json.data.listing.seller_display_name);
      }

      // 2.7 GET /api/v1/listings/:id (Unknown listing -> 404)
      {
        const res = await fetch(`${baseUrl}/api/v1/listings/list_nonexistent_xyz`);
        assert.strictEqual(res.status, 404);
        const json = await res.json();
        assert.strictEqual(json.code, 'LISTING_NOT_FOUND');
      }

      // 2.8 GET /api/v1/brands
      {
        const res = await fetch(`${baseUrl}/api/v1/brands?limit=5`);
        assert.strictEqual(res.status, 200);
        const json = await res.json();
        assert.strictEqual(json.data.items.length, 5);
        assert.strictEqual(json.data.pagination.total, 1593);
      }

      // 2.9 GET /api/v1/platforms
      {
        const res = await fetch(`${baseUrl}/api/v1/platforms`);
        assert.strictEqual(res.status, 200);
        const json = await res.json();
        assert.strictEqual(json.data.items.length, 3, 'Must return all 3 official platform operators');
        const ids = json.data.items.map((p: { platform_id: string }) => p.platform_id).sort();
        assert.deepStrictEqual(ids, ['PLATFORM_AMAZON_IN', 'PLATFORM_FLIPKART', 'PLATFORM_MYNTRA']);
      }

      // 2.10 GET /api/v1/sellers/:id
      {
        const res = await fetch(`${baseUrl}/api/v1/sellers/SELLER_AGG_AMAZON_IN`);
        assert.strictEqual(res.status, 200);
        const json = await res.json();
        assert.strictEqual(json.data.seller.seller_id, 'SELLER_AGG_AMAZON_IN');
      }

      // 2.11 GET /api/v1/sellers/:id (Unknown seller -> 404)
      {
        const res = await fetch(`${baseUrl}/api/v1/sellers/NONEXISTENT_SELLER_ID`);
        assert.strictEqual(res.status, 404);
        const json = await res.json();
        assert.strictEqual(json.code, 'SELLER_NOT_FOUND');
      }

      console.log('PASS: Module 2 (Catalog APIs) verified 100%.');

      // =======================================================================
      // MODULE 3: TRUST INTELLIGENCE APIs
      // =======================================================================
      console.log('\n--- Test Group 3: Module 3 — Trust Intelligence APIs ---');

      // 3.1 Trust assessment retrieval with prefer_cached=true (serves verified MySQL snapshot)
      {
        const res = await fetch(`${baseUrl}/api/v1/products/flipkart_BRAE4A6UCHSWTURJ/trust-assessment?prefer_cached=true`);
        assert.strictEqual(res.status, 200, 'Historical snapshot must return 200');
        const json = await res.json();
        assert.strictEqual(json.status, 'success');
        assert.strictEqual(json.data.source, 'MYSQL_SNAPSHOT');
        assert.strictEqual(json.data.assessment.canonical_product_id, 'flipkart_BRAE4A6UCHSWTURJ');
        assert.ok(json.data.assessment.predicted_risk_tier);
        assert.ok(json.data.assessment.continuous_anomaly_score !== undefined);
        assert.ok(json.data.assessment.calibrated_anomaly_score !== undefined);
        assert.ok(json.data.assessment.modalities_active);
      }

      // 3.2 Unknown product assessment -> 404
      {
        const res = await fetch(`${baseUrl}/api/v1/products/NONEXISTENT_PRODUCT/trust-assessment`);
        assert.strictEqual(res.status, 404);
        const json = await res.json();
        assert.strictEqual(json.code, 'PRODUCT_NOT_FOUND');
      }

      // 3.3 Unknown product evidence -> 404
      {
        const res = await fetch(`${baseUrl}/api/v1/products/NONEXISTENT_PRODUCT/evidence`);
        assert.strictEqual(res.status, 404);
      }

      // 3.4 Unknown product report -> 404
      {
        const res = await fetch(`${baseUrl}/api/v1/products/NONEXISTENT_PRODUCT/report`);
        assert.strictEqual(res.status, 404);
      }

      // 3.5 Unknown seller trust assessment -> 404
      {
        const res = await fetch(`${baseUrl}/api/v1/sellers/NONEXISTENT_SELLER/trust-assessment`);
        assert.strictEqual(res.status, 404);
      }

      // 3.6 Unknown listing trust assessment -> 404
      {
        const res = await fetch(`${baseUrl}/api/v1/listings/NONEXISTENT_LISTING/trust-assessment`);
        assert.strictEqual(res.status, 404);
      }

      // 3.7 Ablations query parameter validation
      {
        const res = await fetch(`${baseUrl}/api/v1/ablations?version=invalid_ver`);
        assert.strictEqual(res.status, 400, 'Invalid ablation version must return 400 validation error');
        const json = await res.json();
        assert.strictEqual(json.code, 'VALIDATION_ERROR');
      }

      // 3.8 Upstream timeout / unavailable behavior:
      // When Python service is not running on port 8000, calling an uncached live endpoint
      // gracefully falls back or returns 503 without leaking stack traces.
      {
        const res = await fetch(`${baseUrl}/api/v1/products/flipkart_BRAE4A6UCHSWTURJ/trust-assessment`);
        // Either 200 (if Python service is running OR gracefully fell back to MySQL snapshot)
        // or 503 (if Python service is down and no fallback was found)
        assert.ok([200, 503].includes(res.status));
        const json = await res.json();
        if (res.status === 200) {
          assert.ok(json.data.assessment);
        } else {
          assert.strictEqual(json.code, 'UPSTREAM_SERVICE_UNAVAILABLE');
          assert.strictEqual(json.stack, undefined, 'Must NEVER leak internal stack trace to client');
        }
      }

      console.log('PASS: Module 3 (Trust Intelligence APIs) verified 100%.');

      // =======================================================================
      // MODULE 4: PRODUCT COMPARISON APIs
      // =======================================================================
      console.log('\n--- Test Group 4: Module 4 — Product Comparison APIs ---');

      let createdComparisonId = '';

      // 4.1 Unauthorized comparison creation without token -> 401
      {
        const res = await fetch(`${baseUrl}/api/v1/comparisons`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Test Comparison',
            canonical_product_ids: ['flipkart_BRAE4A6UCHSWTURJ', 'flipkart_BRAE6YVWQJNHHHGG']
          })
        });
        assert.strictEqual(res.status, 401, 'Unauthorized request must return 401');
      }

      // 4.2 Invalid payload: less than 2 products -> 400
      {
        const res = await fetch(`${baseUrl}/api/v1/comparisons`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${analystToken}`
          },
          body: JSON.stringify({
            title: 'Test Single Product',
            canonical_product_ids: ['flipkart_BRAE4A6UCHSWTURJ']
          })
        });
        assert.strictEqual(res.status, 400, 'Comparison with 1 product must return 400');
        const json = await res.json();
        assert.strictEqual(json.code, 'VALIDATION_ERROR');
      }

      // 4.3 Invalid payload: duplicate products in list -> 400
      {
        const res = await fetch(`${baseUrl}/api/v1/comparisons`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${analystToken}`
          },
          body: JSON.stringify({
            title: 'Duplicate Products',
            canonical_product_ids: ['flipkart_BRAE4A6UCHSWTURJ', 'flipkart_BRAE4A6UCHSWTURJ']
          })
        });
        assert.strictEqual(res.status, 400, 'Duplicate products in comparison must return 400');
        const json = await res.json();
        assert.strictEqual(json.code, 'VALIDATION_ERROR');
      }

      // 4.4 Non-existent product IDs -> 400
      {
        const res = await fetch(`${baseUrl}/api/v1/comparisons`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${analystToken}`
          },
          body: JSON.stringify({
            title: 'Unknown Product Comparison',
            canonical_product_ids: ['flipkart_BRAE4A6UCHSWTURJ', 'NONEXISTENT_PRODUCT_ID']
          })
        });
        assert.strictEqual(res.status, 400, 'Unknown product ID must return 400');
        const json = await res.json();
        assert.strictEqual(json.code, 'VALIDATION_ERROR');
      }

      // 4.5 Successful comparison creation (Analyst)
      {
        const res = await fetch(`${baseUrl}/api/v1/comparisons`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${analystToken}`
          },
          body: JSON.stringify({
            title: 'Analyst Smartphone Trust Comparison',
            canonical_product_ids: ['flipkart_BRAE4A6UCHSWTURJ', 'flipkart_BRAE6YVWQJNHHHGG']
          })
        });
        assert.strictEqual(res.status, 201, 'Valid comparison must return 201 Created');
        const json = await res.json();
        assert.strictEqual(json.status, 'success');
        assert.ok(json.data.comparison.id);
        assert.strictEqual(json.data.comparison.user_id, TEST_ANALYST_USER_ID);
        assert.strictEqual(json.data.comparison.items.length, 2);
        assert.ok(json.data.comparison.recommended_product_id);
        assert.ok(json.data.comparison.recommendation_rationale);

        // Verify items display_order and rankings
        const items = json.data.comparison.items;
        assert.strictEqual(items[0].display_order, 1);
        assert.strictEqual(items[1].display_order, 2);
        assert.ok(items.some((it: { is_recommended: boolean | number }) => Boolean(it.is_recommended)));

        createdComparisonId = json.data.comparison.id;
      }

      // 4.6 GET /api/v1/comparisons/:id (Owner retrieval)
      {
        const res = await fetch(`${baseUrl}/api/v1/comparisons/${createdComparisonId}`, {
          headers: { Authorization: `Bearer ${analystToken}` }
        });
        assert.strictEqual(res.status, 200);
        const json = await res.json();
        assert.strictEqual(json.data.comparison.id, createdComparisonId);
        assert.strictEqual(json.data.comparison.items.length, 2);
      }

      // 4.7 GET /api/v1/comparisons/:id (Unauthorized other user -> 403 Forbidden)
      {
        const res = await fetch(`${baseUrl}/api/v1/comparisons/${createdComparisonId}`, {
          headers: { Authorization: `Bearer ${viewerToken}` }
        });
        assert.strictEqual(res.status, 403, 'Non-owner viewer must receive 403 Forbidden');
        const json = await res.json();
        assert.strictEqual(json.code, 'INSUFFICIENT_PERMISSIONS');
      }

      // 4.8 GET /api/v1/comparisons/:id (Admin override -> 200)
      {
        const res = await fetch(`${baseUrl}/api/v1/comparisons/${createdComparisonId}`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert.strictEqual(res.status, 200, 'Admin can view comparison sessions across users');
      }

      // 4.9 GET /api/v1/comparisons (List user comparisons)
      {
        const res = await fetch(`${baseUrl}/api/v1/comparisons?page=1&limit=10`, {
          headers: { Authorization: `Bearer ${analystToken}` }
        });
        assert.strictEqual(res.status, 200);
        const json = await res.json();
        assert.ok(json.data.items.length >= 1);
        assert.strictEqual(json.data.items[0].id, createdComparisonId);
      }

      // 4.10 DELETE /api/v1/comparisons/:id (Cascade deletion)
      {
        const res = await fetch(`${baseUrl}/api/v1/comparisons/${createdComparisonId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${analystToken}` }
        });
        assert.strictEqual(res.status, 200, 'Delete comparison must return 200');

        // Confirm comparison and items deleted
        const checkRes = await fetch(`${baseUrl}/api/v1/comparisons/${createdComparisonId}`, {
          headers: { Authorization: `Bearer ${analystToken}` }
        });
        assert.strictEqual(checkRes.status, 404, 'Deleted comparison must return 404');
      }

      console.log('PASS: Module 4 (Product Comparison APIs) verified 100%.');

      // =======================================================================
      // MODULE 5: HUMAN ANNOTATION WORKFLOW APIs
      // =======================================================================
      console.log('\n--- Test Group 5: Module 5 — Human Annotation Workflow APIs ---');

      // 5.1 Role restriction: VIEWER receives 403 Forbidden on annotation queue
      {
        const res = await fetch(`${baseUrl}/api/v1/annotations/tasks`, {
          headers: { Authorization: `Bearer ${viewerToken}` }
        });
        assert.strictEqual(res.status, 403, 'Viewer role must receive 403 Forbidden on annotation endpoints');
        const json = await res.json();
        assert.strictEqual(json.code, 'INSUFFICIENT_ROLE');
      }

      // 5.2 GET /api/v1/annotations/tasks (Analyst access)
      {
        const res = await fetch(`${baseUrl}/api/v1/annotations/tasks?limit=5`, {
          headers: { Authorization: `Bearer ${analystToken}` }
        });
        assert.strictEqual(res.status, 200, 'Analyst can access annotation tasks queue');
        const json = await res.json();
        assert.strictEqual(json.status, 'success');
        assert.ok(json.data.items.length > 0);
        assert.ok(json.data.pagination.total >= 600);
      }

      // 5.3 POST /api/v1/annotations/tasks/:id/assign (Assign task to analyst)
      {
        const res = await fetch(`${baseUrl}/api/v1/annotations/tasks/${TEST_TASK_ID}/assign`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${analystToken}` }
        });
        assert.strictEqual(res.status, 201, 'Assign task must return 201 Created');
        const json = await res.json();
        assert.strictEqual(json.data.assignment.task_id, TEST_TASK_ID);
        assert.strictEqual(json.data.assignment.assigned_user_id, TEST_ANALYST_USER_ID);
        assert.strictEqual(json.data.assignment.assignment_status, 'ASSIGNED');
      }

      // 5.4 Duplicate assignment attempt -> 409 Conflict
      {
        const res = await fetch(`${baseUrl}/api/v1/annotations/tasks/${TEST_TASK_ID}/assign`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${analystToken}` }
        });
        assert.strictEqual(res.status, 409, 'Duplicate assignment must return 409 Conflict');
        const json = await res.json();
        assert.strictEqual(json.code, 'ALREADY_ASSIGNED');
      }

      // 5.5 Double-blind isolation verification:
      // Analyst GET /api/v1/annotations/tasks/:id returns only task and their own assignment.
      {
        const res = await fetch(`${baseUrl}/api/v1/annotations/tasks/${TEST_TASK_ID}`, {
          headers: { Authorization: `Bearer ${analystToken}` }
        });
        assert.strictEqual(res.status, 200);
        const json = await res.json();
        assert.strictEqual(json.data.task.id, TEST_TASK_ID);
        assert.strictEqual(json.data.myAssignment.assigned_user_id, TEST_ANALYST_USER_ID);
        assert.strictEqual(json.data.annotations, undefined, 'Analyst MUST NOT receive other annotator submissions');
      }

      // 5.6 Submit annotation with invalid Likert score (> 5) -> 400
      {
        const res = await fetch(`${baseUrl}/api/v1/annotations/tasks/${TEST_TASK_ID}/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${analystToken}`
          },
          body: JSON.stringify({
            assigned_taxonomy: 'AUTHENTIC',
            confidence_score: 6, // Violates CHECK (confidence_score >= 1 AND confidence_score <= 5)
            sentiment_label: 'POSITIVE',
            authenticity_label: 'GENUINE'
          })
        });
        assert.strictEqual(res.status, 400, 'Confidence score > 5 must fail validation');
        const json = await res.json();
        assert.strictEqual(json.code, 'VALIDATION_ERROR');
      }

      // 5.7 Submit valid ground truth annotation
      {
        const res = await fetch(`${baseUrl}/api/v1/annotations/tasks/${TEST_TASK_ID}/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${analystToken}`
          },
          body: JSON.stringify({
            assigned_taxonomy: 'AUTHENTIC',
            confidence_score: 5,
            sentiment_label: 'POSITIVE',
            authenticity_label: 'GENUINE',
            aspect_polarities: { packaging: 'VERIFIED_CLEAN', specification: 'MATCH' },
            review_rationale: 'Reviewer confirms authentic packaging and verified receipt.'
          })
        });
        assert.strictEqual(res.status, 201, 'Valid annotation submission must return 201');
        const json = await res.json();
        assert.strictEqual(json.data.annotation.task_id, TEST_TASK_ID);
        assert.strictEqual(json.data.annotation.user_id, TEST_ANALYST_USER_ID);
        assert.strictEqual(json.data.annotation.assigned_taxonomy, 'AUTHENTIC');
        assert.strictEqual(json.data.annotation.confidence_score, 5);
      }

      // 5.8 Duplicate submission rejected -> 409 Conflict
      {
        const res = await fetch(`${baseUrl}/api/v1/annotations/tasks/${TEST_TASK_ID}/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${analystToken}`
          },
          body: JSON.stringify({
            assigned_taxonomy: 'AUTHENTIC',
            confidence_score: 4,
            sentiment_label: 'POSITIVE',
            authenticity_label: 'GENUINE'
          })
        });
        assert.strictEqual(res.status, 409, 'Duplicate submission must be rejected with 409 Conflict');
        const json = await res.json();
        assert.strictEqual(json.code, 'DUPLICATE_SUBMISSION');
      }

      // 5.9 Adjudication authorization check: Analyst cannot adjudicate -> 403 Forbidden
      {
        const res = await fetch(`${baseUrl}/api/v1/annotations/tasks/${TEST_TASK_ID}/adjudicate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${analystToken}`
          },
          body: JSON.stringify({
            consensus_taxonomy: 'AUTHENTIC',
            adjudication_status: 'DOUBLE_BLIND_AGREEMENT',
            inter_annotator_agreement_cohen_kappa: 0.920,
            is_multi_annotator_adjudicated: true,
            adjudication_notes: 'Consensus confirmed authentic packaging.'
          })
        });
        assert.strictEqual(res.status, 403, 'Analyst cannot adjudicate tasks; requires ADMIN');
        const json = await res.json();
        assert.strictEqual(json.code, 'INSUFFICIENT_ROLE');
      }

      // 5.10 Admin adjudicates task -> 201 Created
      {
        const res = await fetch(`${baseUrl}/api/v1/annotations/tasks/${TEST_TASK_ID}/adjudicate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`
          },
          body: JSON.stringify({
            consensus_taxonomy: 'AUTHENTIC',
            adjudication_status: 'DOUBLE_BLIND_AGREEMENT',
            inter_annotator_agreement_cohen_kappa: 0.850,
            is_multi_annotator_adjudicated: true,
            adjudication_notes: 'Admin confirmed high agreement and genuine review attributes.'
          })
        });
        assert.strictEqual(res.status, 201, 'Admin adjudication must return 201');
        const json = await res.json();
        assert.strictEqual(json.data.adjudication.task_id, TEST_TASK_ID);
        assert.strictEqual(json.data.adjudication.adjudicator_user_id, TEST_ADMIN_USER_ID);
        assert.strictEqual(json.data.adjudication.consensus_taxonomy, 'AUTHENTIC');
        assert.strictEqual(json.data.adjudication.adjudication_status, 'DOUBLE_BLIND_AGREEMENT');
      }

      // 5.11 Re-adjudicating same task -> 409 Conflict
      {
        const res = await fetch(`${baseUrl}/api/v1/annotations/tasks/${TEST_TASK_ID}/adjudicate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`
          },
          body: JSON.stringify({
            consensus_taxonomy: 'AUTHENTIC',
            adjudication_status: 'RESOLVED_BY_THIRD_EXPERT'
          })
        });
        assert.strictEqual(res.status, 409, 'Re-adjudicating already adjudicated task must return 409');
        const json = await res.json();
        assert.strictEqual(json.code, 'ALREADY_ADJUDICATED');
      }

      // 5.12 Admin inspection of double-blind results
      {
        const res = await fetch(`${baseUrl}/api/v1/annotations/tasks/${TEST_TASK_ID}`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert.strictEqual(res.status, 200);
        const json = await res.json();
        assert.ok(json.data.adjudication, 'Admin must see adjudication summary');
        assert.ok(json.data.annotations.length >= 1, 'Admin must see submitted annotations');
      }

      console.log('PASS: Module 5 (Human Annotation Workflow APIs) verified 100%.');
    });

  } finally {
    // -------------------------------------------------------------------------
    // Deterministic Cleanup of Temporary Test Fixtures
    // -------------------------------------------------------------------------
    console.log('\nCleaning up temporary test fixtures...');
    try {
      await pool.query('DELETE FROM ground_truth_annotations WHERE task_id = ?', [TEST_TASK_ID]);
      await pool.query('DELETE FROM annotation_adjudications WHERE task_id = ?', [TEST_TASK_ID]);
      await pool.query('DELETE FROM annotation_task_assignments WHERE task_id = ?', [TEST_TASK_ID]);
      await pool.query('DELETE FROM annotation_tasks WHERE id = ?', [TEST_TASK_ID]);
      await pool.query('DELETE FROM product_comparison_items WHERE comparison_id IN (SELECT id FROM product_comparisons WHERE user_id LIKE \'11111111-%\' OR user_id LIKE \'22222222-%\' OR user_id LIKE \'33333333-%\')');
      await pool.query('DELETE FROM product_comparisons WHERE user_id LIKE \'11111111-%\' OR user_id LIKE \'22222222-%\' OR user_id LIKE \'33333333-%\'');
      await pool.query('DELETE FROM users WHERE email LIKE \'%@test-domain.internal\'');
      console.log('Cleanup completed successfully. Historical records preserved intact.');
    } catch (cleanupErr) {
      console.error('[CLEANUP WARNING]', cleanupErr);
    }

    await closeApplicationPool();
  }

  console.log('\n=============================================================================');
  console.log('ALL STEP 2C.2 DOMAIN API INTEGRATION TESTS PASSED (100%).');
  console.log('=============================================================================');
  process.exit(0);
})().catch(err => {
  console.error('\n[FATAL TEST FAILURE]', err);
  process.exit(1);
});
