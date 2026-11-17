import assert from 'node:assert';
import { createApp } from '../src/app';
import { query, closeApplicationPool } from '../src/config/database';

async function main() {
  console.log('=============================================================================');
  console.log('TEST SUITE: INVESTIGATIONS PERSISTENCE & LIFECYCLE');
  console.log('=============================================================================\n');

  const app = createApp();
  const server = app.listen(0);
  await new Promise((r) => setTimeout(r, 200));
  const addr = server.address() as any;
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  const ts = Date.now();
  const emailA = `inv.user.a.${ts}@trustsphere.internal`;
  const emailB = `inv.user.b.${ts}@trustsphere.internal`;
  const password = 'TestUserSecure#2026!';

  let tokenA = '';
  let tokenB = '';
  let userAId = '';
  let userBId = '';
  let createdInvestigationId: string | null = null;

  try {
    // 0. Register User A and User B
    console.log('[0/6] Provisioning test users A and B in database...');
    const regResA = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailA, password, fullName: 'Investigation User A' })
    });
    assert.strictEqual(regResA.status, 201);
    const regJsonA = await regResA.json() as any;
    tokenA = regJsonA.token;
    userAId = regJsonA.user.id;

    const regResB = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailB, password, fullName: 'Investigation User B' })
    });
    assert.strictEqual(regResB.status, 201);
    const regJsonB = await regResB.json() as any;
    tokenB = regJsonB.token;
    userBId = regJsonB.user.id;
    console.log(`PASS: Users provisioned (User A: ${userAId}, User B: ${userBId}).`);

    // 1. Create an investigation snapshot for User A
    console.log('[1/6] Creating investigation snapshot for User A...');
    const snapshotPayload = {
      input_type: 'IMAGE',
      title: 'Packaging Inspection - boAt Rockerz 450 Retail Box',
      marketplace: 'PLATFORM_AMAZON_IN',
      listing_url: 'https://www.amazon.in/dp/B07PR1CL3S',
      extracted_identifier: 'B07PR1CL3S',
      overall_risk_tier: 'MODERATE',
      overall_risk_score: 0.3850,
      verdict_summary: 'Optical text mismatch on serial typography; packaging contrast aligns with known batch.',
      assessment_snapshot: {
        ocr_text: 'boAt Rockerz 450 Bluetooth Headset 15 Hours Battery',
        cv_quality: { blur_score: 182.4, is_low_contrast: false },
        clip_similarity: 0.842,
        detected_anomalies: ['Font weight discrepancy on rear serial string']
      },
      evidence_citations: [
        { modality: 'IMAGE', confidence: 0.88, detail: 'Typography variance' }
      ]
    };

    const createRes = await fetch(`${baseUrl}/api/v1/investigations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify(snapshotPayload)
    });

    assert.strictEqual(createRes.status, 201, `Expected 201, got ${createRes.status}`);
    const createJson = await createRes.json() as any;
    assert.ok(createJson.success);
    assert.ok(createJson.data.id);
    assert.strictEqual(createJson.data.input_type, 'IMAGE');
    assert.strictEqual(createJson.data.overall_risk_tier, 'MODERATE');
    assert.strictEqual(createJson.data.overall_risk_score, 0.3850);
    assert.strictEqual(createJson.data.user_id, userAId);
    createdInvestigationId = createJson.data.id;
    console.log(`PASS: Investigation record created with ID: ${createdInvestigationId}`);

    // 2. Fetch investigation by ID as owner (User A)
    console.log('[2/6] Fetching investigation by ID as owner...');
    const fetchRes = await fetch(`${baseUrl}/api/v1/investigations/${createdInvestigationId}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(fetchRes.status, 200);
    const fetchJson = await fetchRes.json() as any;
    assert.strictEqual(fetchJson.data.id, createdInvestigationId);
    assert.strictEqual(fetchJson.data.assessment_snapshot.cv_quality.blur_score, 182.4);
    assert.strictEqual(fetchJson.data.assessment_snapshot.clip_similarity, 0.842);
    console.log('PASS: Retrievable with exact snapshot JSON preserved.');

    // 3. User B unauthorized access attempt (Boundary verification)
    console.log('[3/6] Testing cross-user isolation boundary (User B fetching User A investigation)...');
    const bRes = await fetch(`${baseUrl}/api/v1/investigations/${createdInvestigationId}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert.strictEqual(bRes.status, 403, `Expected 403 Forbidden for different user, got ${bRes.status}`);
    console.log('PASS: User B access strictly rejected with 403 Forbidden.');

    // 4. List User A's investigations
    console.log('[4/6] Listing investigations for User A...');
    const listRes = await fetch(`${baseUrl}/api/v1/investigations?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(listRes.status, 200);
    const listJson = await listRes.json() as any;
    assert.ok(listJson.items.length >= 1);
    assert.strictEqual(listJson.items[0].id, createdInvestigationId);
    console.log(`PASS: List returned ${listJson.items.length} investigation(s) for User A.`);

    // 5. User B list must be empty
    console.log('[5/6] Verifying User B list is isolated and empty...');
    const bListRes = await fetch(`${baseUrl}/api/v1/investigations?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert.strictEqual(bListRes.status, 200);
    const bListJson = await bListRes.json() as any;
    assert.strictEqual(bListJson.items.length, 0);
    console.log('PASS: User B history list is clean and isolated.');

    // 6. Delete investigation
    console.log('[6/6] Testing deletion of investigation record...');
    const delRes = await fetch(`${baseUrl}/api/v1/investigations/${createdInvestigationId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(delRes.status, 200);

    const reFetch = await fetch(`${baseUrl}/api/v1/investigations/${createdInvestigationId}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(reFetch.status, 404);
    console.log('PASS: Investigation deleted and 404 verified.');

    console.log('\n=============================================================================');
    console.log('ALL 6 INVESTIGATION PERSISTENCE LIFECYCLE TESTS PASSED (100%).');
    console.log('=============================================================================\n');
  } catch (err) {
    console.error('[FAIL] Test execution encountered error:', err);
    process.exitCode = 1;
  } finally {
    if (createdInvestigationId) {
      await query('DELETE FROM investigations WHERE id = ?', [createdInvestigationId]).catch(() => {});
    }
    if (userAId) {
      await query('DELETE FROM users WHERE id = ?', [userAId]).catch(() => {});
    }
    if (userBId) {
      await query('DELETE FROM users WHERE id = ?', [userBId]).catch(() => {});
    }
    server.close();
    await closeApplicationPool();
    process.exit(process.exitCode || 0);
  }
}

main();
