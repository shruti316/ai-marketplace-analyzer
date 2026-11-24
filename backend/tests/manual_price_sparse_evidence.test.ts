import { URL } from 'node:url';
import { reviewNlpEngine, ReviewItem } from '../src/modules/investigate/review_nlp_engine';
import { decoupledTrustEngine, FiveDimensionInput } from '../src/modules/investigate/decoupled_trust_engine';

async function runManualPriceSparseEvidenceTests() {
  console.log('=============================================================================');
  console.log('TRUSTSPHERE REGRESSION TEST SUITE: MANUAL PRICE ENTRY & SPARSE EVIDENCE');
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

  // -------------------------------------------------------------------------
  // TEST 1: Manual Price Entry (Observed ₹1,025, MRP ₹1,145) with Zero Reviews
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 1: Manual Price Entry + Zero Reviews ---');
  const inputZeroReviews: FiveDimensionInput = {
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
    nlpReport: reviewNlpEngine.analyzeReviews([]),
    hasVisionProvided: false,
    hasOcrExtracted: false,
  };

  const res1 = decoupledTrustEngine.evaluateFiveDimensions(inputZeroReviews);
  assert(res1.dimensions.product_quality.status === 'UNASSESSED', 'Product quality is UNASSESSED when zero reviews exist');
  assert(res1.dimensions.product_quality.score === null, 'Product quality score is null');
  assert(res1.dimensions.listing_authenticity.score! <= 70, `Listing authenticity score capped at <= 70 (actual: ${res1.dimensions.listing_authenticity.score})`);
  assert(res1.overall_trust_score <= 68, `Trust score capped at <= 68 under sparse evidence (actual: ${res1.overall_trust_score})`);
  assert(res1.evidence.confidence_score <= 0.52, `Confidence capped at <= 0.52 (actual: ${res1.evidence.confidence_score})`);
  assert(res1.recommendation === 'PROCEED_WITH_CAUTION', 'Recommendation is strictly PROCEED_WITH_CAUTION, never PROCEED_CONFIDENTLY');
  assert(res1.score_breakdown.sparse_evidence_applied, 'Sparse evidence guard was triggered');
  assert(res1.score_breakdown.mathematical_identity_verified, 'Score breakdown mathematical identity holds true');

  // -------------------------------------------------------------------------
  // TEST 2: Manual Price Entry with Quarantined Test Fixtures (TEST_DATA)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: Manual Price Entry + Quarantined Test Reviews ---');
  const fixtureReviews: ReviewItem[] = [
    { review_text: 'Best watch ever, fantastic green dial and solid build.', rating: 5, source_type: 'TEST_FIXTURE', validation_status: 'TEST_DATA' },
    { review_text: 'Super fast delivery, genuine Titan warranty in box.', rating: 5, source_type: 'TEST_FIXTURE', validation_status: 'TEST_DATA' },
  ];
  const nlpReportFixtures = reviewNlpEngine.analyzeReviews(fixtureReviews, {
    category: 'Watches',
    productTitle: 'Sonata Poze SP8005LKM03W Watch',
    targetModel: 'SP8005LKM03W',
  });

  assert(nlpReportFixtures.is_production_eligible === false, 'Test fixtures are marked is_production_eligible: false');
  assert(nlpReportFixtures.provenance_status === 'TEST_FIXTURE_EXCLUDED', 'Provenance marked as TEST_FIXTURE_EXCLUDED');
  assert(nlpReportFixtures.status === 'TEST_DATA_EXCLUDED', 'Status marked as TEST_DATA_EXCLUDED');

  const inputWithFixtures: FiveDimensionInput = {
    ...inputZeroReviews,
    nlpReport: nlpReportFixtures,
  };
  const res2 = decoupledTrustEngine.evaluateFiveDimensions(inputWithFixtures);
  assert(res2.dimensions.product_quality.status === 'UNASSESSED', 'Product quality remains UNASSESSED with quarantined fixtures');
  assert(res2.dimensions.product_quality.score === null, 'Product quality score is null');
  assert(res2.overall_trust_score <= 68, `Trust score capped at <= 68 (actual: ${res2.overall_trust_score})`);
  assert(res2.recommendation === 'PROCEED_WITH_CAUTION', 'Recommendation remains PROCEED_WITH_CAUTION');
  assert(res2.score_breakdown.mathematical_identity_verified, 'Score breakdown mathematical identity holds true');

  // -------------------------------------------------------------------------
  // TEST 3: Cross-Marketplace Model Mismatch Quarantine
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Model Mismatch Quarantine (Cross-Marketplace Amazon Review) ---');
  const mismatchedReviews: ReviewItem[] = [
    {
      review_text: 'Titan Neo black dial watch is excellent, great leather strap.',
      rating: 5,
      source_marketplace: 'Amazon India',
      product_model: 'NK1805NM01', // Different model than SP8005LKM03W
      validation_status: 'MODEL_MISMATCH',
    },
  ];
  const nlpReportMismatch = reviewNlpEngine.analyzeReviews(mismatchedReviews, {
    category: 'Watches',
    productTitle: 'Sonata Poze SP8005LKM03W Watch',
    targetModel: 'SP8005LKM03W',
  });

  assert(nlpReportMismatch.is_production_eligible === false, 'Model mismatch reviews are quarantined (is_production_eligible: false)');
  assert(nlpReportMismatch.provenance_status === 'UNVERIFIED_EXCLUDED', 'Provenance marked as UNVERIFIED_EXCLUDED');
  assert(nlpReportMismatch.status === 'UNVERIFIED_EXCLUDED', 'Status marked as UNVERIFIED_EXCLUDED');

  const inputWithMismatch: FiveDimensionInput = {
    ...inputZeroReviews,
    nlpReport: nlpReportMismatch,
  };
  const res3 = decoupledTrustEngine.evaluateFiveDimensions(inputWithMismatch);
  assert(res3.dimensions.product_quality.status === 'UNASSESSED', 'Product quality remains UNASSESSED with mismatched model');
  assert(res3.overall_trust_score <= 68, `Trust score capped at <= 68 (actual: ${res3.overall_trust_score})`);
  assert(res3.recommendation === 'PROCEED_WITH_CAUTION', 'Recommendation remains PROCEED_WITH_CAUTION');
  assert(res3.score_breakdown.mathematical_identity_verified, 'Score breakdown mathematical identity holds true');

  // -------------------------------------------------------------------------
  // TEST 4: Manual Price Entry with Severe Discount Anomaly (90% Off)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: Manual Price Entry + Severe Discount Anomaly ---');
  const inputSevereDiscount: FiveDimensionInput = {
    ...inputZeroReviews,
    observedPrice: 150, // 87% off claimed MRP of ₹1,145
    mrp: 1145,
  };
  const res4 = decoupledTrustEngine.evaluateFiveDimensions(inputSevereDiscount);
  assert(res4.dimensions.listing_authenticity.score! < 40, `Authenticity score plunged due to extreme discount anomaly (${res4.dimensions.listing_authenticity.score})`);
  assert(res4.non_masking_applied, 'Non-masking invariant was triggered');
  assert(res4.overall_trust_score <= 45, `Trust score capped strictly at <= 45 (actual: ${res4.overall_trust_score})`);
  assert(res4.recommendation === 'INVESTIGATE_FURTHER' || res4.recommendation === 'DO_NOT_RECOMMEND', 'Severe anomaly prevents PROCEED_CONFIDENTLY / CAUTION');
  assert(res4.score_breakdown.mathematical_identity_verified, 'Score breakdown mathematical identity holds true');

  console.log('\n=============================================================================');
  console.log(`TEST RESULTS: ${passed}/${total} passed (${((passed / total) * 100).toFixed(1)}%)`);
  if (passed === total) {
    console.log('✅ ALL MANUAL PRICE & SPARSE EVIDENCE TESTS PASSED.');
  } else {
    console.error('❌ SOME TESTS FAILED.');
    process.exit(1);
  }
}

runManualPriceSparseEvidenceTests().catch(err => {
  console.error('Unhandled failure:', err);
  process.exit(1);
});
