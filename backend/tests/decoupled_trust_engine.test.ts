import { URL } from 'node:url';
import { decoupledTrustEngine, FiveDimensionInput } from '../src/modules/investigate/decoupled_trust_engine';
import { reviewNlpEngine } from '../src/modules/investigate/review_nlp_engine';

function runTests() {
  console.log('=============================================================================');
  console.log('TRUST ENGINE: 5-DIMENSION & NON-MASKING INVARIANT TEST SUITE');
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
  // TEST 1: No Reviews (Zero-penalty invariant, sparse evidence guard)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 1: No Reviews Provided (Zero-Penalty Invariant) ---');
  const emptyNlp = reviewNlpEngine.analyzeReviews([]);
  const inputNoReviews: FiveDimensionInput = {
    url: new URL('https://www.amazon.in/dp/B000052YQN'),
    platformName: 'Amazon India',
    productTitle: 'Standard Office Pen',
    brand: 'Parker',
    category: 'Stationery',
    observedPrice: 450,
    mrp: 500,
    sellerName: 'Appario Retail',
    sellerRating: 4.6,
    fulfillmentType: 'Fulfilled by Amazon',
    nlpReport: emptyNlp,
    hasVisionProvided: false,
    hasOcrExtracted: false,
  };
  const res1 = decoupledTrustEngine.evaluateFiveDimensions(inputNoReviews);
  assert(res1.dimensions.product_quality.status === 'UNASSESSED', 'Product quality is UNASSESSED when zero reviews are provided');
  assert(res1.score_breakdown.contributions.find(c => c.key === 'reviews')?.delta === 0, 'Review modality delta is exactly 0 (no penalty)');
  assert(res1.score_breakdown.contributions.find(c => c.key === 'vision')?.delta === 0, 'Vision modality delta is exactly 0 (no penalty)');
  assert(res1.score_breakdown.contributions.find(c => c.key === 'ocr')?.delta === 0, 'OCR modality delta is exactly 0 (no penalty)');
  assert(res1.recommendation !== 'PROCEED_CONFIDENTLY', 'Sparse evidence prevents PROCEED_CONFIDENTLY recommendation');
  assert(res1.score_breakdown.mathematical_identity_verified, 'Score breakdown mathematical identity verified');

  // -------------------------------------------------------------------------
  // TEST 2: Critical Risk in Reviews Cannot Be Masked by Amazon/Verified Platform
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: Critical Defect/Counterfeit Cannot Be Masked (Non-Masking Invariant) ---');
  const counterfeitReviews = [
    { review_text: 'Bilkul nakli duplicate product hai, 1 din me toot gaya. Paise barbad.' },
    { review_text: 'Fake counterfeit item sent by seller, not genuine.' },
    { review_text: 'Worst purchase, total scam, fake product.' }
  ];
  const nlpCounterfeit = reviewNlpEngine.analyzeReviews(counterfeitReviews, { claimedStarRating: 1.8, ratingsCount: 150 });
  const inputCriticalDefect: FiveDimensionInput = {
    url: new URL('https://www.amazon.in/dp/B00FAKE001'),
    platformName: 'Amazon India',
    productTitle: 'Luxury Smartwatch Pro',
    brand: 'TechBrand',
    observedPrice: 1200,
    mrp: 8000,
    sellerName: 'Shady Seller Corp',
    sellerRating: 2.1,
    nlpReport: nlpCounterfeit,
    hasVisionProvided: false,
    hasOcrExtracted: false,
  };
  const res2 = decoupledTrustEngine.evaluateFiveDimensions(inputCriticalDefect);
  assert(res2.non_masking_applied === true, 'Non-masking invariant was triggered');
  assert(res2.overall_trust_score <= 45, `Trust score is capped <= 45 (actual: ${res2.overall_trust_score})`);
  assert(res2.overall_risk_level === 'CRITICAL_RISK' || res2.overall_risk_level === 'HIGH_OBSERVED_RISK', 'Risk level is CRITICAL or HIGH');
  assert(res2.recommendation === 'DO_NOT_RECOMMEND' || res2.recommendation === 'INVESTIGATE_FURTHER', 'Recommendation is DO_NOT_RECOMMEND or INVESTIGATE_FURTHER');
  assert(res2.score_breakdown.mathematical_identity_verified, 'Score breakdown mathematical identity verified');

  // -------------------------------------------------------------------------
  // TEST 3: No Price Available / Blocked Price
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Price Unavailable / Blocked ---');
  const inputNoPrice: FiveDimensionInput = {
    url: new URL('https://www.sonatawatches.in/product/sonata-poze-sp8005lkm03w.html'),
    platformName: 'Sonata Watches',
    productTitle: 'Sonata Poze Quartz Watch SP8005LKM03W',
    brand: 'Sonata',
    category: 'Watches',
    observedPrice: null,
    mrp: null,
    priceVerificationStatus: 'BLOCKED',
    sellerName: 'Titan Company Limited',
    sellerRating: 4.8,
    fulfillmentType: 'Direct Brand Fulfillment',
    nlpReport: emptyNlp,
    hasVisionProvided: false,
    hasOcrExtracted: false,
  };
  const res3 = decoupledTrustEngine.evaluateFiveDimensions(inputNoPrice);
  assert(res3.dimensions.listing_authenticity.status === 'UNASSESSED', 'Listing authenticity dimension is UNASSESSED when price is blocked');
  assert(res3.score_breakdown.contributions.find(c => c.key === 'pricing')?.delta === 0, 'Pricing modality delta is 0');
  assert(res3.recommendation !== 'PROCEED_CONFIDENTLY', 'Cannot PROCEED_CONFIDENTLY when price is unverified');
  assert(res3.score_breakdown.mathematical_identity_verified, 'Score breakdown mathematical identity verified');

  // -------------------------------------------------------------------------
  // TEST 4: Low Evidence Coverage (< 50% assessed)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: Low Evidence Coverage (< 50%) Returns INSUFFICIENT_EVIDENCE ---');
  const inputBarebones: FiveDimensionInput = {
    url: new URL('https://example-webstore.in/product/unknown-gadget'),
    platformName: 'Unknown',
    observedPrice: null,
    mrp: null,
    sellerName: null,
    nlpReport: emptyNlp,
  };
  const res4 = decoupledTrustEngine.evaluateFiveDimensions(inputBarebones);
  assert(res4.evidence.coverage_percent < 50, `Coverage is low (${res4.evidence.coverage_percent}%)`);
  assert(res4.recommendation === 'INSUFFICIENT_EVIDENCE', 'Recommendation is INSUFFICIENT_EVIDENCE');
  assert(res4.score_breakdown.mathematical_identity_verified, 'Score breakdown mathematical identity verified');

  // -------------------------------------------------------------------------
  // TEST 5: Comprehensive Full-Evidence Genuine Product
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5: Comprehensive Full-Evidence Genuine Listing ---');
  const positiveReviews = [
    { review_text: 'Excellent product, solid build quality and super fast delivery!', source_marketplace: 'Amazon India', validation_status: 'VERIFIED_CORRESPONDENCE' as const },
    { review_text: 'Original genuine brand product. 100% satisfied with performance.', source_marketplace: 'Amazon India', validation_status: 'VERIFIED_CORRESPONDENCE' as const },
    { review_text: 'Bahut achha product hai, packaging bhi shandar thi.', source_marketplace: 'Amazon India', validation_status: 'VERIFIED_CORRESPONDENCE' as const },
    { review_text: 'Original Titan watch with warranty card inside.', source_marketplace: 'Amazon India', validation_status: 'VERIFIED_CORRESPONDENCE' as const }
  ];
  const nlpPositive = reviewNlpEngine.analyzeReviews(positiveReviews, {
    claimedStarRating: 4.7,
    ratingsCount: 2400,
    category: 'Watches',
    productTitle: 'Titan Neo Analog Watch',
    targetMarketplace: 'Amazon India',
  });
  const inputFullGenuine: FiveDimensionInput = {
    url: new URL('https://www.amazon.in/dp/B08XYZ1234'),
    platformName: 'Amazon India',
    productTitle: 'Titan Neo Analog Watch',
    brand: 'Titan',
    category: 'Watches',
    observedPrice: 4995,
    mrp: 5495,
    sellerName: 'Titan Company Official',
    sellerRating: 4.9,
    fulfillmentType: 'Fulfilled by Amazon',
    nlpReport: nlpPositive,
    hasVisionProvided: true,
    hasOcrExtracted: true,
  };
  const res5 = decoupledTrustEngine.evaluateFiveDimensions(inputFullGenuine);
  assert(res5.evidence.coverage_percent === 100, 'Coverage is 100%');
  assert(res5.overall_trust_score >= 80, `Trust score is high (${res5.overall_trust_score}/100)`);
  assert(res5.overall_risk_level === 'MINIMAL_RISK', 'Risk level is MINIMAL_RISK');
  assert(res5.recommendation === 'PROCEED_CONFIDENTLY', 'Recommendation is PROCEED_CONFIDENTLY');
  assert(res5.non_masking_applied === false, 'No critical masking applied');
  assert(res5.score_breakdown.mathematical_identity_verified, 'Score breakdown mathematical identity verified');

  console.log('\n=============================================================================');
  console.log(`TEST RESULTS: ${passed}/${total} passed (${((passed / total) * 100).toFixed(1)}%)`);
  if (passed === total) {
    console.log('✅ ALL TRUST ENGINE TESTS PASSED.');
  } else {
    console.error('❌ SOME TRUST ENGINE TESTS FAILED.');
    process.exit(1);
  }
}

runTests();
