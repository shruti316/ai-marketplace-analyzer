import { URL } from 'node:url';
import { urlRetrieverService } from '../src/modules/investigate/url_retriever';
import { reviewNlpEngine } from '../src/modules/investigate/review_nlp_engine';
import { decoupledTrustEngine } from '../src/modules/investigate/decoupled_trust_engine';

async function runSonataAcceptanceTest() {
  console.log('=============================================================================');
  console.log('TRUSTSPHERE END-TO-END ACCEPTANCE TEST: SONATA POZE WATCH');
  console.log('=============================================================================');

  const testUrl = 'https://www.sonatawatches.in/product/sonata-poze-quartz-analog-green-dial-metal-strap-watch-for-women-sp8005lkm03w.html';
  console.log(`Target URL: ${testUrl}`);

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
  // STEP 1: Automated URL Retrieval & Anti-Bot Cloudflare Detection
  // -------------------------------------------------------------------------
  console.log('\n--- STEP 1: Live Marketplace URL Extraction & Cloudflare Detection ---');
  const retrieval = await urlRetrieverService.retrieveAndExtract(testUrl);
  console.log('Retrieval diagnostics:', {
    marketplace: retrieval.marketplace,
    retrieval_status: retrieval.retrieval_status,
    title: retrieval.title,
    brand: retrieval.brand,
    category: retrieval.category,
    price_status: retrieval.price_diagnostics?.status,
    price_note: retrieval.price_diagnostics?.note,
    observed_price: retrieval.observed_price,
    mrp: retrieval.mrp,
    image_url: retrieval.main_image_url,
  });

  assert(retrieval.marketplace === 'Sonata Watches' || retrieval.marketplace.includes('Sonata'), 'Platform recognized as Sonata Watches');
  assert(retrieval.brand?.toLowerCase() === 'sonata', 'Brand correctly identified as Sonata');
  assert(retrieval.category?.toLowerCase() === 'watches', 'Category correctly identified as Watches');
  assert(retrieval.title.includes('SP8005LKM03W'), 'Model SP8005LKM03W extracted from product URL slug');
  assert(retrieval.mrp === null || retrieval.mrp === undefined, 'MRP is NOT fabricated with 1.4x multiplier');
  assert(retrieval.main_image_url === undefined || !retrieval.main_image_url.includes('unsplash'), 'No fake Unsplash stock image injected');
  assert(retrieval.price_diagnostics?.status === 'BLOCKED' || retrieval.price_diagnostics?.status === 'NOT_FOUND', 'Anti-bot / Cloudflare challenge honestly reported');

  // -------------------------------------------------------------------------
  // STEP 2: Category-Specific Aspect Discovery & Provenance Quarantine (Watches ABSA)
  // -------------------------------------------------------------------------
  console.log('\n--- STEP 2: Category-Specific Aspect Discovery & Provenance Quarantine ---');
  // Reviews marked as TEST_DATA / FIXTURE because Sonata live page was Cloudflare blocked
  const watchReviews = [
    { review_text: 'The green dial looks stunning and the brass case finishing is very classy.', rating: 5, source_type: 'TEST_FIXTURE' as const, validation_status: 'TEST_DATA' as const },
    { review_text: 'Mesh metal strap fits comfortably on the wrist and clasp is sturdy.', rating: 5, source_type: 'TEST_FIXTURE' as const, validation_status: 'TEST_DATA' as const },
    { review_text: 'Original Titan Sonata watch with official warranty card in box.', rating: 5, source_type: 'TEST_FIXTURE' as const, validation_status: 'TEST_DATA' as const },
    { review_text: 'Timekeeping is accurate quartz movement, accurate to the second.', rating: 4, source_type: 'TEST_FIXTURE' as const, validation_status: 'TEST_DATA' as const },
  ];

  const nlpReport = reviewNlpEngine.analyzeReviews(watchReviews, {
    claimedStarRating: null, // Cloudflare blocked, no live stars extracted
    ratingsCount: null,
    category: 'Watches',
    productTitle: retrieval.title,
    targetModel: 'SP8005LKM03W',
    targetMarketplace: 'Sonata Watches',
  });

  console.log('NLP Analyzed Aspects:', nlpReport.aspects.map(a => `${a.display_name}: ${a.sentiment_label}`));
  console.log('Provenance Status:', {
    provenance_status: nlpReport.provenance_status,
    is_production_eligible: nlpReport.is_production_eligible,
    status: nlpReport.status,
    provenance_note: nlpReport.provenance_note,
  });

  const aspectNames = nlpReport.aspects.map(a => a.display_name);
  assert(aspectNames.includes('Design & Aesthetics'), 'Watches ABSA includes Design & Aesthetics');
  assert(aspectNames.includes('Comfort & Wearability'), 'Watches ABSA includes Comfort & Wearability');
  assert(aspectNames.includes('Timekeeping & Accuracy'), 'Watches ABSA includes Timekeeping & Accuracy');
  assert(aspectNames.includes('Seller Experience & Authenticity'), 'Watches ABSA includes Seller Experience & Authenticity');
  assert(nlpReport.is_production_eligible === false, 'Test fixtures are strictly quarantined (is_production_eligible: false)');
  assert(nlpReport.provenance_status === 'TEST_FIXTURE_EXCLUDED', 'Provenance marked as TEST_FIXTURE_EXCLUDED');
  assert(nlpReport.status === 'TEST_DATA_EXCLUDED', 'Review analysis status marked as TEST_DATA_EXCLUDED');

  // -------------------------------------------------------------------------
  // STEP 3: Decoupled 5-Dimension Trust Assessment on Sonata Poze Watch (Manual Price Entry)
  // -------------------------------------------------------------------------
  console.log('\n--- STEP 3: Decoupled 5-Dimension Trust Assessment (Manual Price Entry) ---');
  // Manual price entry from official price tag: Observed ₹1,025, MRP ₹1,145
  // Price verification status: MANUALLY_ENTERED
  // Quarantined reviews: is_production_eligible is false
  const fiveDimensionResult = decoupledTrustEngine.evaluateFiveDimensions({
    url: new URL(testUrl),
    platformName: 'Sonata Watches',
    productTitle: retrieval.title,
    brand: 'Sonata',
    category: 'Watches',
    observedPrice: 1025,
    mrp: 1145,
    priceVerificationStatus: 'MANUALLY_ENTERED',
    sellerName: 'Titan Company Limited',
    sellerRating: 4.9,
    fulfillmentType: 'Direct Brand Fulfillment',
    claimedStarRating: null, // Not accessible due to Cloudflare block
    ratingsCount: null,
    nlpReport, // Quarantined test fixtures
    hasVisionProvided: false,
    hasOcrExtracted: false,
  });

  console.log('Trust Assessment Summary:', {
    overall_trust_score: fiveDimensionResult.overall_trust_score,
    overall_risk_level: fiveDimensionResult.overall_risk_level,
    recommendation: fiveDimensionResult.recommendation,
    coverage: `${fiveDimensionResult.evidence.coverage_percent}%`,
    confidence: fiveDimensionResult.evidence.confidence_score,
    website_score: fiveDimensionResult.dimensions.website_legitimacy.score,
    seller_score: fiveDimensionResult.dimensions.seller_reliability.score,
    authenticity_score: fiveDimensionResult.dimensions.listing_authenticity.score,
    quality_score: fiveDimensionResult.dimensions.product_quality.score,
  });

  assert(fiveDimensionResult.dimensions.product_quality.status === 'UNASSESSED', 'Product quality remains UNASSESSED because test reviews are quarantined');
  assert(fiveDimensionResult.dimensions.product_quality.score === null, 'Product quality score is null');
  assert(fiveDimensionResult.dimensions.listing_authenticity.score! <= 70, `Listing authenticity score capped at <= 70 for manual price (${fiveDimensionResult.dimensions.listing_authenticity.score})`);
  assert(fiveDimensionResult.overall_trust_score <= 68, `Sparse evidence caps trust score at <= 68 (actual: ${fiveDimensionResult.overall_trust_score}/100)`);
  assert(fiveDimensionResult.overall_risk_level === 'MODERATE_RISK', 'Risk level is MODERATE_RISK');
  assert(fiveDimensionResult.recommendation === 'PROCEED_WITH_CAUTION', 'Sparse evidence & self-reported price enforces PROCEED_WITH_CAUTION, never PROCEED_CONFIDENTLY');
  assert(fiveDimensionResult.evidence.confidence_score <= 0.52, `Overall confidence capped at <= 0.52 (actual: ${fiveDimensionResult.evidence.confidence_score})`);
  assert(fiveDimensionResult.dimensions.seller_reliability.score! >= 90, 'Titan Company Limited recognized as official brand flagship');
  assert(fiveDimensionResult.score_breakdown.mathematical_identity_verified, 'Score breakdown mathematical identity holds true');

  // -------------------------------------------------------------------------
  // STEP 4: Sparse Evidence Test (When 0 Reviews & Cloudflare Block Active)
  // -------------------------------------------------------------------------
  console.log('\n--- STEP 4: Cloudflare Block + Zero Reviews (Non-Masking & Sparse Evidence Guard) ---');
  const emptyNlp = reviewNlpEngine.analyzeReviews([]);
  const blockedAssessment = decoupledTrustEngine.evaluateFiveDimensions({
    url: new URL(testUrl),
    platformName: 'Sonata Watches',
    productTitle: retrieval.title,
    brand: 'Sonata',
    category: 'Watches',
    observedPrice: null,
    mrp: null,
    priceVerificationStatus: 'BLOCKED',
    sellerName: 'Titan Company Limited',
    sellerRating: 4.9,
    fulfillmentType: 'Direct Brand Fulfillment',
    nlpReport: emptyNlp,
    hasVisionProvided: false,
    hasOcrExtracted: false,
  });

  assert(blockedAssessment.dimensions.listing_authenticity.status === 'UNASSESSED', 'Listing authenticity is UNASSESSED when price is blocked');
  assert(blockedAssessment.dimensions.product_quality.status === 'UNASSESSED', 'Product quality is UNASSESSED when zero reviews are retrieved');
  assert(blockedAssessment.recommendation !== 'PROCEED_CONFIDENTLY', 'Sparse evidence strictly prevents PROCEED_CONFIDENTLY recommendation');
  assert(blockedAssessment.score_breakdown.mathematical_identity_verified, 'Mathematical identity holds under blocked conditions');

  console.log('\n=============================================================================');
  console.log(`TEST RESULTS: ${passed}/${total} passed (${((passed / total) * 100).toFixed(1)}%)`);
  if (passed === total) {
    console.log('✅ ALL SONATA POZE ACCEPTANCE TESTS PASSED.');
  } else {
    console.error('❌ SOME SONATA POZE ACCEPTANCE TESTS FAILED.');
    process.exit(1);
  }
}

runSonataAcceptanceTest().catch((err) => {
  console.error('Unhandled acceptance test failure:', err);
  process.exit(1);
});
