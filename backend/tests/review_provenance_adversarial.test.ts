import { URL } from 'node:url';
import { reviewNlpEngine, ReviewItem } from '../src/modules/investigate/review_nlp_engine';
import { decoupledTrustEngine, FiveDimensionInput } from '../src/modules/investigate/decoupled_trust_engine';

async function runAdversarialProvenanceAudit() {
  console.log('=============================================================================');
  console.log('TRUSTSPHERE AUDIT P0-1: ADVERSARIAL REVIEW PROVENANCE & QUARANTINE');
  console.log('=============================================================================');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${msg}`);
    }
  }

  const baseInput: FiveDimensionInput = {
    url: new URL('https://www.sonatawatches.in/product/sonata-poze-sp8005lkm03w.html'),
    platformName: 'Sonata Watches',
    productTitle: 'Sonata Poze SP8005LKM03W Watch',
    brand: 'Sonata',
    category: 'Watches',
    observedPrice: 1025,
    mrp: 1145,
    priceVerificationStatus: 'MANUALLY_ENTERED',
    sellerName: 'Titan Company Limited',
    sellerRating: 4.9,
    fulfillmentType: 'Direct Brand Fulfillment',
  };

  // -------------------------------------------------------------------------
  // ADVERSARIAL TEST 1: Glowing Test Fixture Poisoning Attempt
  // -------------------------------------------------------------------------
  console.log('\n--- ADVERSARIAL TEST 1: Glowing 5-Star Test Fixture Injection ---');
  const fixturePoison: ReviewItem[] = [
    {
      review_text: 'Absolutely magnificent watch, pure perfection, 100% original Titan warranty!',
      rating: 5,
      source_type: 'TEST_FIXTURE',
      validation_status: 'TEST_DATA',
    },
  ];
  const nlpPoison = reviewNlpEngine.analyzeReviews(fixturePoison, {
    category: 'Watches',
    productTitle: 'Sonata Poze SP8005LKM03W Watch',
    targetModel: 'SP8005LKM03W',
  });
  assert(nlpPoison.is_production_eligible === false, 'Poisoned fixture is NOT production eligible');
  assert(nlpPoison.provenance_status === 'TEST_FIXTURE_EXCLUDED', 'Provenance marked as TEST_FIXTURE_EXCLUDED');
  assert(nlpPoison.status === 'TEST_DATA_EXCLUDED', 'Report status marked as TEST_DATA_EXCLUDED');

  const res1 = decoupledTrustEngine.evaluateFiveDimensions({ ...baseInput, nlpReport: nlpPoison });
  assert(res1.dimensions.product_quality.status === 'UNASSESSED', 'Product quality remains UNASSESSED despite 5-star praise');
  assert(res1.dimensions.product_quality.score === null, 'Product quality score is null (not 100)');
  assert(res1.overall_trust_score <= 68, `Trust score capped at <= 68 (actual: ${res1.overall_trust_score})`);

  // -------------------------------------------------------------------------
  // ADVERSARIAL TEST 2: Missing Source URL & Marketplace (Fail Closed)
  // -------------------------------------------------------------------------
  console.log('\n--- ADVERSARIAL TEST 2: Unprovenanced Reviews (Missing Source URL / Marketplace) ---');
  const unprovenancedReviews: ReviewItem[] = [
    {
      review_text: 'Good watch, works fine, delivery on time.',
      rating: 4,
      // No source_marketplace, no source_url, no validation_status
    },
  ];
  const nlpUnprovenanced = reviewNlpEngine.analyzeReviews(unprovenancedReviews, {
    category: 'Watches',
    productTitle: 'Sonata Poze SP8005LKM03W Watch',
    targetModel: 'SP8005LKM03W',
  });
  assert(nlpUnprovenanced.is_production_eligible === false, 'Unprovenanced review fails closed (is_production_eligible: false)');
  assert(nlpUnprovenanced.provenance_status === 'UNVERIFIED_EXCLUDED', 'Provenance marked as UNVERIFIED_EXCLUDED');

  const res2 = decoupledTrustEngine.evaluateFiveDimensions({ ...baseInput, nlpReport: nlpUnprovenanced });
  assert(res2.dimensions.product_quality.status === 'UNASSESSED', 'Product quality remains UNASSESSED for unprovenanced reviews');
  assert(res2.dimensions.product_quality.score === null, 'Product quality score is null');

  // -------------------------------------------------------------------------
  // ADVERSARIAL TEST 3: Product Model Mismatch (Amazon Cross-Model Poisoning)
  // -------------------------------------------------------------------------
  console.log('\n--- ADVERSARIAL TEST 3: Variant / Model Mismatch (NK1805NM01 vs SP8005LKM03W) ---');
  const mismatchedModelReviews: ReviewItem[] = [
    {
      review_text: 'Titan Neo black dial watch is excellent, great leather strap.',
      rating: 5,
      source_marketplace: 'Amazon India',
      product_model: 'NK1805NM01', // Different model
      validation_status: 'MODEL_MISMATCH',
    },
  ];
  const nlpMismatch = reviewNlpEngine.analyzeReviews(mismatchedModelReviews, {
    category: 'Watches',
    productTitle: 'Sonata Poze SP8005LKM03W Watch',
    targetModel: 'SP8005LKM03W',
  });
  assert(nlpMismatch.is_production_eligible === false, 'Model mismatch review is quarantined (is_production_eligible: false)');
  assert(nlpMismatch.provenance_status === 'UNVERIFIED_EXCLUDED', 'Provenance marked as UNVERIFIED_EXCLUDED');

  const res3 = decoupledTrustEngine.evaluateFiveDimensions({ ...baseInput, nlpReport: nlpMismatch });
  assert(res3.dimensions.product_quality.status === 'UNASSESSED', 'Product quality remains UNASSESSED with mismatched model');
  assert(res3.dimensions.product_quality.score === null, 'Product quality score is null');

  // -------------------------------------------------------------------------
  // ADVERSARIAL TEST 4: Mixed Batch Poisoning (3 Verified + 1 Injected Fixture)
  // -------------------------------------------------------------------------
  console.log('\n--- ADVERSARIAL TEST 4: Mixed Batch Poisoning (3 Verified + 1 Injected Fixture) ---');
  const mixedBatch: ReviewItem[] = [
    { review_text: 'Verified purchase 1: Great watch.', rating: 5, source_marketplace: 'Sonata Watches', validation_status: 'VERIFIED_CORRESPONDENCE' },
    { review_text: 'Verified purchase 2: Accurate quartz.', rating: 4, source_marketplace: 'Sonata Watches', validation_status: 'VERIFIED_CORRESPONDENCE' },
    { review_text: 'Verified purchase 3: Nice clasp.', rating: 5, source_marketplace: 'Sonata Watches', validation_status: 'VERIFIED_CORRESPONDENCE' },
    { review_text: 'Poisoned fixture: Fake review injected.', rating: 5, source_type: 'TEST_FIXTURE', validation_status: 'TEST_DATA' },
  ];
  const nlpMixed = reviewNlpEngine.analyzeReviews(mixedBatch, {
    category: 'Watches',
    productTitle: 'Sonata Poze SP8005LKM03W Watch',
    targetModel: 'SP8005LKM03W',
  });
  assert(nlpMixed.is_production_eligible === false, 'Mixed batch fails closed if any fixture is present (is_production_eligible: false)');
  assert(nlpMixed.provenance_status === 'TEST_FIXTURE_EXCLUDED', 'Provenance marked as TEST_FIXTURE_EXCLUDED');
  assert(nlpMixed.status === 'TEST_DATA_EXCLUDED', 'Report status marked as TEST_DATA_EXCLUDED');

  const res4 = decoupledTrustEngine.evaluateFiveDimensions({ ...baseInput, nlpReport: nlpMixed });
  assert(res4.dimensions.product_quality.status === 'UNASSESSED', 'Product quality remains UNASSESSED on contaminated mixed batch');
  assert(res4.dimensions.product_quality.score === null, 'Product quality score is null');

  // -------------------------------------------------------------------------
  // ADVERSARIAL TEST 5: Legitimate Verified Correspondence (Pass-Through)
  // -------------------------------------------------------------------------
  console.log('\n--- ADVERSARIAL TEST 5: Legitimate Verified Correspondence (Pass-Through) ---');
  const legitimateReviews: ReviewItem[] = [
    {
      review_text: 'Authentic Sonata Poze watch verified from Sonata retail store.',
      rating: 5,
      source_marketplace: 'Sonata Watches',
      product_model: 'SP8005LKM03W',
      validation_status: 'VERIFIED_CORRESPONDENCE',
    },
    {
      review_text: 'Dial color matches catalog description, quartz movement accurate.',
      rating: 5,
      source_marketplace: 'Sonata Watches',
      product_model: 'SP8005LKM03W',
      validation_status: 'VERIFIED_CORRESPONDENCE',
    },
  ];
  const nlpLegit = reviewNlpEngine.analyzeReviews(legitimateReviews, {
    category: 'Watches',
    productTitle: 'Sonata Poze SP8005LKM03W Watch',
    targetModel: 'SP8005LKM03W',
    targetMarketplace: 'Sonata Watches',
  });
  assert(nlpLegit.is_production_eligible === true, 'Verified correspondence is production eligible');
  assert(nlpLegit.provenance_status === 'VERIFIED_LIVE', 'Provenance marked as VERIFIED_LIVE');
  assert(nlpLegit.status === 'EVALUATED', 'Report status marked as EVALUATED');

  console.log('\n=============================================================================');
  console.log(`TEST RESULTS: ${passed}/${total} passed (${((passed / total) * 100).toFixed(1)}%)`);
  if (passed === total) {
    console.log('✅ ALL ADVERSARIAL PROVENANCE TESTS PASSED.');
  } else {
    console.error('❌ SOME ADVERSARIAL PROVENANCE TESTS FAILED.');
    process.exit(1);
  }
}

runAdversarialProvenanceAudit().catch(err => {
  console.error('Unhandled failure:', err);
  process.exit(1);
});
