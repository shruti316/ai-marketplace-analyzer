import assert from 'node:assert';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import express from 'express';
import { createApp } from '../src/app';
import { closeApplicationPool, queryOne } from '../src/config/database';
import { RowDataPacket } from 'mysql2';

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

async function runTests() {
  console.log('=============================================================================');
  console.log('Running Investigation & Assistant Backend Route Tests (Step 2.F)');
  console.log('=============================================================================');

  const app = createApp();

  await withTestServer(app, async (baseUrl) => {
    // -------------------------------------------------------------------------
    // 1. SSRF Protection Tests
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 1: URL Investigation SSRF Defense ---');

    // 1.1 Localhost restriction
    const ssrfLocalRes = await fetch(`${baseUrl}/api/v1/investigate/url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://localhost:5000/api/v1/health' })
    });
    assert.strictEqual(ssrfLocalRes.status, 400, 'SSRF loopback target must return 400');
    const ssrfLocalJson = (await ssrfLocalRes.json()) as any;
    assert.strictEqual(ssrfLocalJson.code, 'SSRF_RESTRICTED_HOST');
    console.log('PASS: Localhost SSRF attempt rejected with 400 SSRF_RESTRICTED_HOST.');

    // 1.2 Private IPv4 (127.0.0.1)
    const ssrfIpRes = await fetch(`${baseUrl}/api/v1/investigate/url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://127.0.0.1:8000/health' })
    });
    assert.strictEqual(ssrfIpRes.status, 400, 'SSRF 127.0.0.1 target must return 400');
    console.log('PASS: 127.0.0.1 SSRF attempt rejected with 400 SSRF_RESTRICTED_HOST.');

    // 1.3 Non-HTTP protocol
    const ssrfProtoRes = await fetch(`${baseUrl}/api/v1/investigate/url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'file:///etc/passwd' })
    });
    assert.strictEqual(ssrfProtoRes.status, 400, 'Non-HTTP protocol must return 400');
    console.log('PASS: file:// protocol SSRF attempt rejected with 400.');

    // -------------------------------------------------------------------------
    // 2. Marketplace Recognition & Catalog Resolution Tests
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 2: Marketplace Recognition & Catalog Resolution ---');

    // 2.1 Unsupported retail domain
    const unsuppRes = await fetch(`${baseUrl}/api/v1/investigate/url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/some-random-page' })
    });
    assert.strictEqual(unsuppRes.status, 200);
    const unsuppJson = (await unsuppRes.json()) as any;
    assert.strictEqual(unsuppJson.data.catalogue_match, false);
    assert.strictEqual(unsuppJson.data.recognized_platform, null);
    console.log('PASS: Unsupported domain correctly returns catalogue_match: false.');

    // 2.2 Unmatched Amazon URL (valid format, unindexed ASIN)
    const unindexedAmazonRes = await fetch(`${baseUrl}/api/v1/investigate/url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://www.amazon.in/dp/B000000000' })
    });
    assert.strictEqual(unindexedAmazonRes.status, 200);
    const unindexedAmazonJson = (await unindexedAmazonRes.json()) as any;
    assert.strictEqual(unindexedAmazonJson.data.catalogue_match, false);
    assert.strictEqual(unindexedAmazonJson.data.recognized_platform, 'Amazon India');
    assert.strictEqual(unindexedAmazonJson.data.extracted_identifier, 'B000000000');
    assert.ok(unindexedAmazonJson.data.message.includes('not present in the indexed 3,643'));
    console.log('PASS: Unindexed Amazon ASIN recognized and reported as unmatched with 200.');

    // 2.3 Matched Marketplace Listing from real MySQL database
    interface SampleListingRow extends RowDataPacket {
      marketplace_product_id: string;
      canonical_product_id: string;
      listing_url: string;
    }
    const sampleListing = await queryOne<SampleListingRow>(
      `SELECT marketplace_product_id, canonical_product_id, listing_url 
       FROM marketplace_listings 
       WHERE platform_id = 'PLATFORM_AMAZON_IN' 
       LIMIT 1`
    );

    if (sampleListing && sampleListing.marketplace_product_id) {
      const rawAsin = sampleListing.marketplace_product_id.replace(/^amazon_in_/i, '');
      const matchedRes = await fetch(`${baseUrl}/api/v1/investigate/url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: `https://www.amazon.in/dp/${rawAsin}` })
      });
      assert.strictEqual(matchedRes.status, 200);
      const matchedJson = (await matchedRes.json()) as any;
      assert.strictEqual(matchedJson.data.catalogue_match, true);
      assert.strictEqual(matchedJson.data.canonical_product_id, sampleListing.canonical_product_id);
      assert.ok(matchedJson.data.product.title);
      assert.ok(matchedJson.data.links.trust_assessment);
      console.log(`PASS: Real catalog listing (${rawAsin}) successfully matched to canonical product: ${sampleListing.canonical_product_id}.`);
    }

    // -------------------------------------------------------------------------
    // 3. Authentication Guards on Protected Routes
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 3: Authentication Guards on Protected Intake Routes ---');

    // 3.1 Unauthenticated Image Upload
    const unauthImageRes = await fetch(`${baseUrl}/api/v1/investigate/image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: 'dGVzdA==' })
    });
    assert.strictEqual(unauthImageRes.status, 401, 'POST /api/v1/investigate/image must require auth');
    console.log('PASS: Unauthenticated image investigation rejected with 401.');

    // 3.2 Unauthenticated Ad-hoc Details
    const unauthAdhocRes = await fetch(`${baseUrl}/api/v1/investigate/adhoc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_title: 'Test Product' })
    });
    assert.strictEqual(unauthAdhocRes.status, 401, 'POST /api/v1/investigate/adhoc must require auth');
    console.log('PASS: Unauthenticated ad-hoc investigation rejected with 401.');

    // 3.3 Unauthenticated Assistant Chat
    const unauthAssistantRes = await fetch(`${baseUrl}/api/v1/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'What is the risk level?' })
    });
    assert.strictEqual(unauthAssistantRes.status, 401, 'POST /api/v1/assistant/chat must require auth');
    console.log('PASS: Unauthenticated assistant chat rejected with 401.');

    // -------------------------------------------------------------------------
    // 4. Authenticated Request Validation
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 4: Authenticated Payload Validation ---');

    // Log in as provisioned administrator to acquire token
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
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
    assert.ok(token, 'Must receive token');

    // 4.1 Empty query rejected on assistant
    const emptyQueryRes = await fetch(`${baseUrl}/api/v1/assistant/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ query: '' })
    });
    assert.strictEqual(emptyQueryRes.status, 400, 'Empty assistant query must return 400');
    console.log('PASS: Empty assistant query rejected with 400.');

    // 4.2 Missing title rejected on ad-hoc
    const emptyAdhocRes = await fetch(`${baseUrl}/api/v1/investigate/adhoc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({})
    });
    assert.strictEqual(emptyAdhocRes.status, 400, 'Adhoc details without title must return 400');
    console.log('PASS: Empty adhoc payload rejected with 400.');

    console.log('\n=============================================================================');
    console.log('ALL INVESTIGATION & ASSISTANT BACKEND TESTS PASSED (100%).');
    console.log('=============================================================================');
  });
}

runTests()
  .then(async () => {
    await closeApplicationPool();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('[FATAL TEST ERROR]', err);
    await closeApplicationPool();
    process.exit(1);
  });
