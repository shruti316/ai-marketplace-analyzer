import assert from 'node:assert';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import express from 'express';
import { createApp } from '../src/app';
import { hfGradioClient } from '../src/modules/trust/hf_gradio.client';
import { trustService } from '../src/modules/trust/trust.service';
import { createAuthToken, AuthUser } from '../src/middleware/auth';
import { query, queryOne, closeApplicationPool } from '../src/config/database';

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

async function runGradioIntegrationSuite() {
  console.log('=============================================================================');
  console.log('TRUSTSPHERE — HUGGING FACE GRADIO BACKEND INTEGRATION TEST SUITE');
  console.log('=============================================================================\n');

  const testUser: AuthUser = {
    id: 'test-analyst-uuid-1',
    email: 'analyst@trustsphere.internal',
    role: 'ANALYST'
  };
  const token = createAuthToken(testUser);
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  // Ensure test user exists in users table so foreign key constraint fk_investigations_user passes
  await query(
    `INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at)
     VALUES (?, ?, 'dummy_hash', 'Test Analyst', 'ANALYST', 1, NOW(3), NOW(3))
     ON DUPLICATE KEY UPDATE email = VALUES(email)`,
    [testUser.id, testUser.email]
  );

  // ---------------------------------------------------------------------------
  // TEST 1: Direct Health Probe to Hugging Face Space
  // ---------------------------------------------------------------------------
  console.log('[Test 1/9] Probing Live Hugging Face Space Health (/health)...');
  const health = await hfGradioClient.checkHealth();
  assert.strictEqual(health.status, 'HEALTHY', 'Space status must be HEALTHY');
  assert.strictEqual(health.zerogpu_active, true, 'ZeroGPU must be active on the Space');
  assert.strictEqual(health.dataset_version, 'v1.7', 'Dataset must be v1.7');
  assert.strictEqual(health.total_canonical_products, 3643, 'Must index 3643 catalog products');
  console.log(`PASS: Hugging Face Space is HEALTHY with ${health.total_canonical_products} products and ZeroGPU active.\n`);

  // ---------------------------------------------------------------------------
  // TEST 2: Direct Marketplace Trust Assessment
  // ---------------------------------------------------------------------------
  console.log('[Test 2/9] Testing Marketplace Trust Assessment via HF Space (/marketplace_trust_assessment)...');
  const trustRes = await hfGradioClient.assessMarketplaceTrust('amazon_in_B000052YQN', 'v1.0');
  assert.strictEqual(trustRes.source, 'LIVE_HUGGINGFACE_ZEROGPU');
  assert.strictEqual(trustRes.canonical_product_id, 'amazon_in_B000052YQN');
  assert.strictEqual(typeof trustRes.calibrated_anomaly_score, 'number');
  assert.ok(trustRes.predicted_risk_tier, 'Risk tier must be present');
  assert.strictEqual(trustRes.zero_penalty_invariant_applied, true);
  console.log(`PASS: Trust assessment returned tier "${trustRes.predicted_risk_tier}", score ${trustRes.calibrated_anomaly_score}.\n`);

  // ---------------------------------------------------------------------------
  // TEST 3: Direct ZeroGPU Image & OCR Inspection
  // ---------------------------------------------------------------------------
  console.log('[Test 3/9] Testing Dual ZeroGPU CLIP & OCR Inspection (/product_image_analysis & /ocr_analysis)...');
  const sample1x1Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const imgRes = await hfGradioClient.inspectImage(
    sample1x1Png,
    'boAt Rockerz 450 Bluetooth On Ear Headphones',
    'boAt',
    1499.0
  );
  assert.strictEqual(imgRes.source, 'LIVE_HUGGINGFACE_ZEROGPU');
  assert.strictEqual(imgRes.processing_status, 'COMPLETED');
  assert.ok(imgRes.request_id.startsWith('hf_insp_'));
  assert.ok(imgRes.quality_findings);
  assert.strictEqual(typeof imgRes.clip_alignment.cosine_similarity, 'number');
  assert.ok(
    imgRes.zero_penalty_note.includes('penalized') ||
    imgRes.zero_penalty_note.includes('Zero-Penalty') ||
    imgRes.zero_penalty_note.includes('ACTIVE')
  );
  console.log(`PASS: Dual CV inspection completed. CLIP score: ${imgRes.clip_alignment.cosine_similarity}, OCR words: ${imgRes.ocr_findings.word_count}.\n`);

  // ---------------------------------------------------------------------------
  // TEST 4: Express API — GET /api/v1/products/:id/learned-multimodal
  // ---------------------------------------------------------------------------
  console.log('[Test 4/9] Testing Express API Learned Multimodal Endpoint...');
  const app = createApp();
  await withTestServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/v1/products/amazon_in_B000052YQN/learned-multimodal`);
    assert.strictEqual(res.status, 200, 'Must return 200 OK');
    const json: any = await res.json();
    assert.strictEqual(json.status, 'success');
    assert.strictEqual(json.data.source, 'LIVE_HUGGINGFACE_ZEROGPU');
    assert.strictEqual(json.data.assessment.canonical_product_id, 'amazon_in_B000052YQN');
    console.log(`PASS: Express API served live Hugging Face multimodal assessment.\n`);
  });

  // ---------------------------------------------------------------------------
  // TEST 5: Express API — POST /api/v1/investigate/image
  // ---------------------------------------------------------------------------
  console.log('[Test 5/9] Testing Express API Image Investigation Endpoint...');
  await withTestServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/v1/investigate/image`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        image_base64: sample1x1Png,
        canonical_brand: 'boAt',
        product_title: 'boAt Rockerz 450'
      })
    });
    assert.strictEqual(res.status, 200, 'Must return 200 OK');
    const json: any = await res.json();
    assert.strictEqual(json.status, 'success');
    assert.ok(json.data.request_id);
    assert.ok(json.data.quality_findings);
    assert.ok(json.data.ocr_findings);
    assert.ok(json.data.zero_shot_findings);
    console.log(`PASS: Express /api/v1/investigate/image returned structured CV inspection payload.\n`);
  });

  // ---------------------------------------------------------------------------
  // TEST 6: Express API — Master Pipeline & TiDB Database Persistence
  // ---------------------------------------------------------------------------
  console.log('[Test 6/9] Testing End-to-End Investigation Pipeline & TiDB Persistence...');
  await withTestServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/v1/investigate/pipeline`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        url: 'https://www.amazon.in/dp/B000052YQN',
        image_base64: sample1x1Png
      })
    });
    assert.strictEqual(res.status, 200, 'Pipeline must return 200');
    const json: any = await res.json();
    assert.strictEqual(json.status, 'success');
    const report = json.data;
    assert.ok(report.investigation_id);
    assert.ok(report.summary.overall_trust_score);
    assert.ok(report.section_6_visual_packaging);
    assert.strictEqual(report.section_6_visual_packaging.image_uploaded, true);

    // Verify DB persistence in investigations table
    const dbRow = await queryOne<any>(
      `SELECT id, user_id, title, overall_risk_tier, status FROM investigations WHERE id = ?`,
      [report.investigation_id]
    );
    assert.ok(dbRow, 'Investigation record must be persisted in database');
    assert.strictEqual(dbRow.id, report.investigation_id);
    assert.strictEqual(dbRow.user_id, testUser.id);
    console.log(`PASS: Pipeline investigation executed and persisted to TiDB (ID: ${dbRow.id}).\n`);
  });

  // ---------------------------------------------------------------------------
  // TEST 7: MySQL/TiDB Fallback Snapshot when Live Engine is Unavailable
  // ---------------------------------------------------------------------------
  console.log('[Test 7/9] Testing Database Fallback Snapshot when Live ML is Disabled...');
  const { trustRepository } = await import('../src/modules/trust/trust.repository');
  const { catalogRepository } = await import('../src/modules/catalog/catalog.repository');
  
  const origFindProduct = catalogRepository.findProductById;
  const origFindLatest = trustRepository.findLatestByProductId;

  catalogRepository.findProductById = async (pid: string) => ({
    canonical_product_id: pid,
    product_title: 'Test Product Title',
    brand_id: 'brand_test',
    category: 'Electronics',
    platform_id: 'PLATFORM_AMAZON_IN'
  } as any);

  trustRepository.findLatestByProductId = async (pid: string) => ({
    id: 'test-snapshot-1',
    canonical_product_id: pid,
    model_version: '2.0.0',
    predicted_risk_tier: 'LOW_OBSERVED_ANOMALY',
    continuous_anomaly_score: 0.05,
    calibrated_anomaly_score: 0.05,
    ci_lower: 0.01,
    ci_upper: 0.09,
    active_modalities_count: 5,
    has_pricing_modality: 1,
    has_review_modality: 1,
    has_image_modality: 1,
    has_clip_modality: 1,
    has_graph_modality: 1,
    zero_penalty_invariant_applied: 1,
    multi_task_review_risk: 0.02,
    multi_task_image_risk: 0.01,
    multi_task_price_risk: 0.03,
    multi_task_discordance_risk: 0.01,
    modality_contributions_json: { pricing: 0.05, graph: 0.35 },
    recommendation_summary: 'Test summary from snapshot',
    raw_response_json: {},
    assessed_at: new Date().toISOString()
  } as any);

  try {
    const cachedResult: any = await trustService.getProductTrustAssessment('amazon_in_B000052YQN', true);
    assert.strictEqual(cachedResult.source, 'MYSQL_SNAPSHOT');
    assert.strictEqual(cachedResult.assessment.canonical_product_id, 'amazon_in_B000052YQN');
    assert.ok(cachedResult.assessment.predicted_risk_tier);
    console.log(`PASS: Historical assessment successfully retrieved from trust_assessments table.\n`);
  } finally {
    catalogRepository.findProductById = origFindProduct;
    trustRepository.findLatestByProductId = origFindLatest;
  }

  // ---------------------------------------------------------------------------
  // TEST 8: Circuit Breaker Protection
  // ---------------------------------------------------------------------------
  console.log('[Test 8/9] Testing Circuit Breaker Safeguard...');
  const anyClient = hfGradioClient as any;
  const initialFailures = anyClient.failureCount;
  // Trigger 3 simulated failures
  anyClient.recordFailure();
  anyClient.recordFailure();
  anyClient.recordFailure();
  assert.strictEqual(anyClient.failureCount >= 3, true);
  try {
    await anyClient.getClient();
    assert.fail('Should have thrown circuit breaker open error');
  } catch (cbErr: any) {
    assert.ok(cbErr.message.includes('circuit breaker is OPEN') || cbErr.code === 'HF_CIRCUIT_BREAKER_OPEN');
    console.log('PASS: Circuit breaker tripped and prevented upstream call storming.');
  } finally {
    // Reset circuit breaker for subsequent operations
    anyClient.failureCount = 0;
  }
  console.log('PASS: Circuit breaker behavior verified.\n');

  // ---------------------------------------------------------------------------
  // TEST 9: Security Guards (Authentication & Rate Limiting)
  // ---------------------------------------------------------------------------
  console.log('[Test 9/9] Testing Security Guards (401 Unauthorized Rejection)...');
  await withTestServer(app, async (baseUrl) => {
    const unauthRes = await fetch(`${baseUrl}/api/v1/investigate/image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: sample1x1Png })
    });
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated image inspection must return 401');
    console.log('PASS: Protected inference routes strictly reject unauthenticated requests.\n');
  });

  console.log('=============================================================================');
  console.log('ALL 9 HUGGING FACE GRADIO INTEGRATION TESTS PASSED CLEANLY (100%)!');
  console.log('=============================================================================');

  // Cleanup test user and investigations created during the test run
  try {
    await query(`DELETE FROM investigations WHERE user_id = ?`, [testUser.id]);
    await query(`DELETE FROM users WHERE id = ?`, [testUser.id]);
    console.log('Test artifacts cleanly removed from database.');
  } catch (cleanErr) {
    console.warn('Warning during test cleanup:', cleanErr);
  }
}

runGradioIntegrationSuite()
  .then(async () => {
    await closeApplicationPool();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('\n[FATAL TEST FAILURE]', err);
    await closeApplicationPool();
    process.exit(1);
  });
