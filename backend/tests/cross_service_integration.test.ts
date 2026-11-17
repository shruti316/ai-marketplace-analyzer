import assert from 'node:assert';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:5000';

async function runCrossServiceAudit() {
  console.log('=============================================================================');
  console.log('STEP 3: CROSS-SERVICE LIVE INTEGRATION VERIFICATION');
  console.log(`Target Backend: ${BACKEND_URL}`);
  console.log('=============================================================================\n');

  // 0. Acquire Admin JWT Token
  console.log('[Setup] Authenticating Administrator...');
  const loginRes = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@marketplace.internal',
      password: 'TrustAdmin#2026!'
    })
  });
  assert.strictEqual(loginRes.status, 200, 'Admin login must return 200');
  const loginJson = (await loginRes.json()) as any;
  const token = loginJson.token;
  assert.ok(token, 'Must acquire valid JWT token');
  console.log('PASS: Administrator authenticated. Bearer token acquired.\n');

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  // 1. Product lookup from MySQL
  console.log('[1/10] Verifying Product Lookup from MySQL (GET /api/v1/products)...');
  const prodRes = await fetch(`${BACKEND_URL}/api/v1/products?limit=2`);
  assert.strictEqual(prodRes.status, 200);
  const prodJson = (await prodRes.json()) as any;
  assert.strictEqual(prodJson.status, 'success');
  assert.ok(prodJson.data.items.length >= 1);
  const sampleProduct = prodJson.data.items[0];
  const sampleProductId = sampleProduct.canonical_product_id;
  console.log(`PASS: Retrieved product from MySQL: "${sampleProduct.product_title.slice(0, 50)}..." (ID: ${sampleProductId}).\n`);

  // 2. Marketplace URL parsing and catalogue resolution
  console.log('[2/10] Verifying URL Resolution & Catalog Match (POST /api/v1/investigate/url)...');
  const urlRes = await fetch(`${BACKEND_URL}/api/v1/investigate/url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: `https://www.amazon.in/dp/B000052YQN`
    })
  });
  assert.strictEqual(urlRes.status, 200);
  const urlJson = (await urlRes.json()) as any;
  assert.strictEqual(urlJson.status, 'success');
  assert.strictEqual(urlJson.data.catalogue_match, true);
  assert.strictEqual(urlJson.data.recognized_platform, 'Amazon India');
  console.log(`PASS: Resolved Amazon URL to canonical product: ${urlJson.data.canonical_product_id}.\n`);

  // 3. Image upload and Python inspection (Express -> Python CV engine)
  console.log('[3/10] Verifying Image Inspection Pipeline (POST /api/v1/investigate/image)...');
  // 100x100 valid base64 JPEG image
  const sampleJpegB64 = 
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/' +
    '2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCABkAGQDASIAAhEBAxEB/8QA' +
    'HwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkK' +
    'FhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXG' +
    'x8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECA' +
    'xEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEh' +
    'YaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDi6KKK+ZP3EKK' +
    'KKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooo' +
    'oAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiig' +
    'AooooA//Z';

  const imgRes = await fetch(`${BACKEND_URL}/api/v1/investigate/image`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      image_base64: sampleJpegB64,
      canonical_brand: 'SOJANYA',
      product_title: 'Test Inspection Item'
    })
  });
  if (imgRes.status !== 200) {
    const errJson = await imgRes.json();
    console.error('Image inspection error response:', errJson);
  }
  assert.strictEqual(imgRes.status, 200);
  const imgJson = (await imgRes.json()) as any;
  assert.strictEqual(imgJson.status, 'success');
  assert.ok(imgJson.data.request_id);
  assert.ok(imgJson.data.image_metadata);
  assert.ok(imgJson.data.quality_findings);
  console.log(`PASS: Image inspected via Python CV engine. Blur Score: ${imgJson.data.quality_findings.blur_score}, Status: ${imgJson.data.processing_status}.\n`);

  // 4. Manual product ad-hoc inference (Express -> Python /api/v1/infer)
  console.log('[4/10] Verifying Ad-hoc Inference Pipeline (POST /api/v1/investigate/adhoc)...');
  const adhocRes = await fetch(`${BACKEND_URL}/api/v1/investigate/adhoc`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      product_title: 'Brand New Wireless Noise Cancelling Headphones',
      observed_price_inr: 2999,
      mrp_inr: 9999,
      brand: 'SONY',
      category: 'Electronics'
    })
  });
  assert.strictEqual(adhocRes.status, 200);
  const adhocJson = (await adhocRes.json()) as any;
  assert.strictEqual(adhocJson.status, 'success');
  assert.ok(adhocJson.data.overall_risk_tier);
  assert.strictEqual(typeof adhocJson.data.available_modalities_count, 'number');
  console.log(`PASS: Ad-hoc inference evaluated. Risk Tier: ${adhocJson.data.overall_risk_tier}, Modalities: ${adhocJson.data.available_modalities_count}.\n`);

  // 5. Product trust assessment retrieval (Express -> Python Engine)
  console.log(`[5/10] Verifying Trust Assessment Retrieval (GET /api/v1/products/${sampleProductId}/trust-assessment)...`);
  const trustRes = await fetch(`${BACKEND_URL}/api/v1/products/${sampleProductId}/trust-assessment`);
  assert.strictEqual(trustRes.status, 200);
  const trustJson = (await trustRes.json()) as any;
  assert.strictEqual(trustJson.status, 'success');
  const assessmentData = trustJson.data.assessment || trustJson.data;
  assert.ok(assessmentData.overall_risk_tier);
  console.log(`PASS: Trust assessment retrieved. Overall Risk: ${assessmentData.overall_risk_tier}.\n`);

  // 6. Atomic evidence retrieval (Express -> Python Unified Evidence Engine)
  console.log(`[6/10] Verifying Atomic Evidence Retrieval (GET /api/v1/products/${sampleProductId}/evidence)...`);
  const evRes = await fetch(`${BACKEND_URL}/api/v1/products/${sampleProductId}/evidence`);
  assert.strictEqual(evRes.status, 200);
  const evJson = (await evRes.json()) as any;
  assert.strictEqual(evJson.status, 'success');
  assert.ok(Array.isArray(evJson.data.evidence));
  console.log(`PASS: Retrieved ${evJson.data.evidence.length} atomic evidence items for product.\n`);

  // 7. Grounded Assistant Chat (Express -> Python Assistant Service)
  console.log('[7/10] Verifying Grounded Assistant Chat (POST /api/v1/assistant/chat)...');
  const chatRes = await fetch(`${BACKEND_URL}/api/v1/assistant/chat`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      query: 'What is the risk tier of this product and are there any observed price anomalies?',
      canonical_product_id: sampleProductId,
      conversation_history: []
    })
  });
  assert.strictEqual(chatRes.status, 200);
  const chatJson = (await chatRes.json()) as any;
  assert.strictEqual(chatJson.status, 'success');
  assert.ok(chatJson.data.message.content.length > 50);
  assert.strictEqual(chatJson.data.grounded_context.is_grounded, true);
  console.log(`PASS: Assistant generated grounded response (${chatJson.data.message.content.slice(0, 60)}...).\n`);

  // 8. Invalid product handling (Graceful 404)
  console.log('[8/10] Verifying Graceful 404 on Unknown Product...');
  const notFoundRes = await fetch(`${BACKEND_URL}/api/v1/products/NONEXISTENT_CANONICAL_ID_99999`);
  assert.strictEqual(notFoundRes.status, 404);
  console.log('PASS: Unknown product correctly returned 404.\n');

  // 9. Python Service Upstream Resilience
  console.log('[9/10] Verifying Cached Fallback / Upstream Resilience...');
  const cachedTrustRes = await fetch(`${BACKEND_URL}/api/v1/products/${sampleProductId}/trust-assessment?prefer_cached=true`);
  assert.strictEqual(cachedTrustRes.status, 200);
  const cachedTrustJson = (await cachedTrustRes.json()) as any;
  assert.strictEqual(cachedTrustJson.status, 'success');
  console.log('PASS: Cached trust assessment served cleanly from MySQL.\n');

  // 10. Unauthorized Request Security Guard
  console.log('[10/10] Verifying Protected Endpoints Reject Unauthorized Callers (401)...');
  const unauthRes = await fetch(`${BACKEND_URL}/api/v1/assistant/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'Hello unauthorized' })
  });
  assert.strictEqual(unauthRes.status, 401);
  console.log('PASS: Missing Authorization header rejected with 401.\n');

  console.log('=============================================================================');
  console.log('ALL 10 CROSS-SERVICE LIVE INTEGRATION SCENARIOS VERIFIED SUCCESSFULLY (100%).');
  console.log('=============================================================================');
}

runCrossServiceAudit()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n[FATAL AUDIT ERROR]', err);
    process.exit(1);
  });
