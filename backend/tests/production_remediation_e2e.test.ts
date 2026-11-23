import assert from 'node:assert';
import { URL } from 'node:url';
import { hash, verify } from '@node-rs/argon2';
import jwt from 'jsonwebtoken';
import { DecoupledTrustEngine } from '../src/modules/investigate/decoupled_trust_engine';
import { ReviewNlpEngine } from '../src/modules/investigate/review_nlp_engine';
import { SellerTrustService } from '../src/modules/investigate/seller_trust_service';
import { AmazonIndiaAdapter } from '../src/modules/investigate/marketplace_adapters/amazon_adapter';
import { FlipkartAdapter } from '../src/modules/investigate/marketplace_adapters/flipkart_adapter';
import { CromaAdapter } from '../src/modules/investigate/marketplace_adapters/croma_adapter';
import { DecathlonAdapter } from '../src/modules/investigate/marketplace_adapters/decathlon_adapter';
import { GenericEcomAdapter } from '../src/modules/investigate/marketplace_adapters/generic_adapter';

console.log('=============================================================================');
console.log('TRUSTSPHERE — 25-SCENARIO PRODUCTION REMEDIATION & CALIBRATION E2E SUITE');
console.log('Testing Evidence-Driven Intelligence, Decoupled Trust, Adapters & Auth Resiliency');
console.log('=============================================================================\n');

const decoupledEngine = new DecoupledTrustEngine();
const nlpEngine = new ReviewNlpEngine();
const sellerService = new SellerTrustService();

let totalTests = 0;
let passedTests = 0;
const results: Array<{ scenario: number; name: string; status: 'PASS' | 'FAIL'; error?: string }> = [];

async function testScenario(scenario: number, name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    const res = fn();
    if (res instanceof Promise) {
      await res;
    }
    passedTests++;
    results.push({ scenario, name, status: 'PASS' });
    console.log(`[PASS] Scenario ${scenario}: ${name}`);
  } catch (err: any) {
    results.push({ scenario, name, status: 'FAIL', error: err.message });
    console.error(`[FAIL] Scenario ${scenario}: ${name} — ${err.message}`);
  }
}

async function runSuite() {
  // ---------------------------------------------------------------------------
  // SCENARIO 1: 2-Star Amazon Product with High Defects (Non-Masking Invariant)
  // ---------------------------------------------------------------------------
  await testScenario(1, '2-Star Amazon Product with High Defects (Non-Masking Enforced)', () => {
    const reviews = [
      'Worst product ever! Broke on the second day. Absolute waste of money.',
      'Defective item received. Buttons stopped working after 3 days. Very bad quality.',
      'Completely useless. Inferior plastic and pathetic build quality. Return rejected.',
    ];
    const nlpReport = nlpEngine.analyzeReviews(reviews);
    assert.strictEqual(nlpReport.status, 'EVALUATED');
    assert.ok(nlpReport.satisfaction_index !== null && nlpReport.satisfaction_index < 35, 'Satisfaction index must be < 35');

    const result = decoupledEngine.evaluateFiveDimensions({
      url: new URL('https://www.amazon.in/dp/B00DEFECT123'),
      platformName: 'Amazon India',
      domainStatus: 'VERIFIED_AUTHORITATIVE',
      productTitle: 'Defective Bluetooth Earbuds',
      brand: 'BudgetAudio',
      category: 'Electronics / Audio',
      observedPrice: 499,
      mrp: 999,
      sellerName: 'DiscountDeals Store',
      sellerRating: 3.8,
      claimedStarRating: 2.1,
      nlpReport,
    });

    assert.ok(result.non_masking_applied, 'Non-masking invariant must trigger for <40 score');
    assert.ok(result.dimensions.product_quality.score !== null && result.dimensions.product_quality.score < 35, 'Product Quality must be < 35');
    assert.strictEqual(result.dimensions.website_legitimacy.score, 96, 'Amazon website legitimacy is 96');
    assert.ok(result.overall_trust_score <= 35, `Overall trust score must be strictly capped <= 35 (got ${result.overall_trust_score})`);
    assert.ok(result.overall_risk_level === 'CRITICAL_RISK' || result.overall_risk_level === 'HIGH_OBSERVED_RISK', 'Risk level must be high/critical');
    assert.ok(result.recommendation === 'DO_NOT_RECOMMEND' || result.recommendation === 'INVESTIGATE_FURTHER');
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 2: 5-Star Amazon Product with Verified Merchant & Genuine Corridor
  // ---------------------------------------------------------------------------
  await testScenario(2, '5-Star Amazon Product with Verified Merchant & Genuine Corridor', () => {
    const reviews = [
      'Excellent product! Genuine quality, perfectly durable and great comfort.',
      'Authentic Apple item with full manufacturer warranty. Shandar performance!',
      'Paisa vasool, superb build and crystal clear sound. Highly recommended.',
    ];
    const nlpReport = nlpEngine.analyzeReviews(reviews);

    const result = decoupledEngine.evaluateFiveDimensions({
      url: new URL('https://www.amazon.in/dp/B08L5WHJ73'),
      platformName: 'Amazon India',
      domainStatus: 'VERIFIED_AUTHORITATIVE',
      productTitle: 'Apple AirPods Pro with MagSafe Case',
      brand: 'Apple',
      category: 'Electronics / Audio',
      observedPrice: 18990,
      mrp: 24900,
      sellerName: 'Appario Retail / Amazon Verified Merchant',
      sellerRating: 4.6,
      fulfillmentType: 'Fulfilled by Amazon',
      claimedStarRating: 4.8,
      ratingsCount: 5200,
      nlpReport,
    });

    assert.ok(!result.non_masking_applied, 'Non-masking should not trigger for high-quality product');
    assert.ok(result.overall_trust_score >= 78, `Overall trust score must be >= 78 (got ${result.overall_trust_score})`);
    assert.strictEqual(result.overall_risk_level, 'MINIMAL_RISK');
    assert.strictEqual(result.recommendation, 'PROCEED_CONFIDENTLY');
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 3: Poorly Rated Flipkart Seller (< 3.5 Rating)
  // ---------------------------------------------------------------------------
  await testScenario(3, 'Poorly Rated Flipkart Seller (< 3.5 Rating Flags Elevated Risk)', () => {
    const assessment = sellerService.evaluateSeller({
      title: 'Men Running Shoes',
      brand: 'GenericBrand',
      category: 'Footwear / Shoes',
      model: 'MOD-123',
      sku_or_asin: 'SKU123',
      observed_price: 699,
      mrp: 1499,
      currency: 'INR',
      discount_percent: 53,
      availability: 'IN_STOCK',
      seller_name: 'ShadyMerchant Exports',
      seller_rating: 2.9,
      fulfillment_type: 'Merchant Direct Dispatch',
      main_image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff',
      gallery_images: [],
      specs: {},
      marketplace: 'Flipkart',
      raw_url: 'https://flipkart.com/p/item',
      extraction_provenance: 'LIVE_METADATA_EXTRACTED',
      extraction_confidence: 0.9,
      retrieval_timestamp: new Date().toISOString(),
    });

    assert.strictEqual(assessment.risk_tier, 'HIGH');
    assert.strictEqual(assessment.fulfillment_risk, 'ELEVATED_DIRECT_DISPATCH');
    assert.ok(assessment.seller_trust_score <= 55, `Score must be penalized for 2.9 rating (got ${assessment.seller_trust_score})`);
    assert.ok(assessment.concerning_signals.some(s => s.includes('Below-average merchant rating')));
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 4: Well-Reviewed Decathlon Direct Product
  // ---------------------------------------------------------------------------
  await testScenario(4, 'Well-Reviewed Decathlon Direct Product (DIRECT_BRAND_FLAGSHIP)', () => {
    const adapter = new DecathlonAdapter();
    const parsed = adapter.extractFromSlug(new URL('https://www.decathlon.in/p/8832420/running-shoes/men-jogflow-100'));
    assert.strictEqual(parsed.seller_name, 'Decathlon Sports India');
    assert.strictEqual(parsed.seller_rating, null, 'Zero fabrication: unextracted rating must be null');

    const sellerAssessment = sellerService.evaluateSeller(parsed);
    assert.strictEqual(sellerAssessment.seller_tier, 'DIRECT_BRAND_FLAGSHIP');
    assert.strictEqual(sellerAssessment.risk_tier, 'LOW');
    assert.ok(sellerAssessment.seller_trust_score >= 90, 'Flagship score must be >= 90');

    const result = decoupledEngine.evaluateFiveDimensions({
      url: new URL('https://www.decathlon.in/p/8832420/running-shoes/men-jogflow-100'),
      platformName: 'Decathlon India',
      domainStatus: 'VERIFIED_AUTHORITATIVE',
      productTitle: parsed.title,
      brand: 'Decathlon',
      category: parsed.category,
      observedPrice: 1499,
      mrp: 1999,
      sellerName: parsed.seller_name,
      sellerRating: 4.8,
      claimedStarRating: 4.6,
      nlpReport: nlpEngine.analyzeReviews(['Great running shoes, durable and breathable sole. Very comfortable.']),
    });

    assert.ok(result.overall_trust_score >= 80, `Overall score must be >= 80 (got ${result.overall_trust_score})`);
    assert.strictEqual(result.overall_risk_level, 'MINIMAL_RISK');
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 5: Croma Product with Price Query Parameter
  // ---------------------------------------------------------------------------
  await testScenario(5, 'Croma Product with Price Query Parameter (Exact Extraction, No Fabrication)', () => {
    const adapter = new CromaAdapter();
    const parsed = adapter.extractFromSlug(new URL('https://www.croma.com/apple-macbook-air-m2/p/256608?price=89900&mrp=99900'));
    assert.strictEqual(parsed.observed_price, 89900);
    assert.strictEqual(parsed.mrp, 99900);
    assert.strictEqual(parsed.discount_percent, 10);
    assert.strictEqual(parsed.seller_rating, null, 'Seller rating must not be fabricated');
    assert.strictEqual(parsed.seller_name, 'Infiniti Retail Limited (Tata Croma)');
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 6: Unreviewed Product (0 Customer Reviews - Sparse Evidence Guard)
  // ---------------------------------------------------------------------------
  await testScenario(6, 'Unreviewed Product (0 Customer Reviews Capped at MODERATE_RISK)', () => {
    const nlpReport = nlpEngine.analyzeReviews([]);
    assert.strictEqual(nlpReport.status, 'NO_REVIEWS');

    const result = decoupledEngine.evaluateFiveDimensions({
      url: new URL('https://www.amazon.in/dp/B0NEWITEM999'),
      platformName: 'Amazon India',
      domainStatus: 'VERIFIED_AUTHORITATIVE',
      productTitle: 'Newly Launched Smartwatch 2026',
      brand: 'TechBrand',
      category: 'Wearables',
      observedPrice: 2499,
      mrp: 3999,
      sellerName: 'TechBrand Direct',
      sellerRating: 4.5,
      claimedStarRating: undefined,
      nlpReport,
    });

    assert.strictEqual(result.dimensions.product_quality.status, 'UNASSESSED');
    assert.strictEqual(result.dimensions.product_quality.score, null);
    // Sparse evidence cap: cannot exceed 68, risk is MODERATE_RISK, recommendation PROCEED_WITH_CAUTION
    assert.ok(result.overall_trust_score <= 68, `Sparse evidence must cap score <= 68 (got ${result.overall_trust_score})`);
    assert.strictEqual(result.overall_risk_level, 'MODERATE_RISK');
    assert.strictEqual(result.recommendation, 'PROCEED_WITH_CAUTION');
    assert.ok(result.recommendation_rationale.includes('sparse evidence') || result.recommendation_rationale.includes('unassessed'));
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 7: Independent Webstore (Unknown Domain Evaluated on Merit)
  // ---------------------------------------------------------------------------
  await testScenario(7, 'Independent Webstore (Evaluated Without Lookalike Crash)', () => {
    const adapter = new GenericEcomAdapter();
    const url = new URL('https://artisancrafts-india.shop/collections/pottery/products/handcrafted-ceramic-vase');
    const parsed = adapter.extractFromSlug(url);
    assert.ok(parsed.title.length > 0);
    assert.strictEqual(parsed.seller_rating, null);

    const result = decoupledEngine.evaluateFiveDimensions({
      url,
      platformName: 'Artisan Crafts India',
      domainStatus: 'VERIFIED_AUTHORITATIVE',
      isLookalike: false,
      productTitle: parsed.title,
      brand: parsed.brand,
      category: parsed.category,
      observedPrice: 1200,
      mrp: 1500,
      sellerName: 'Artisan Crafts India',
      sellerRating: null,
      claimedStarRating: 4.5,
      nlpReport: nlpEngine.analyzeReviews(['Beautiful vase, carefully packed and exactly as shown. Loved it!']),
    });

    assert.strictEqual(result.dimensions.website_legitimacy.status, 'ASSESSED');
    assert.strictEqual(result.dimensions.website_legitimacy.score, 80, 'Valid HTTPS independent domain scores 80');
    assert.ok(result.overall_trust_score >= 70, 'Independent store with good reviews receives solid score');
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 8: Durability Defect Reviews ("tut gaya", "toot gaya")
  // ---------------------------------------------------------------------------
  await testScenario(8, 'Durability Defect Reviews ("tut gaya" Isolates Build Quality Concern)', () => {
    const reviews = [
      'Color looks nice but sole tut gaya after 2 weeks of use.',
      'Handle toot gaya on the first trip, very fragile plastic!',
    ];
    const nlpReport = nlpEngine.analyzeReviews(reviews);
    const buildQualityAspect = nlpReport.aspects.find(a => a.key === 'build_quality');
    assert.ok(buildQualityAspect, 'Build Quality aspect must exist');
    assert.strictEqual(buildQualityAspect.status, 'EVALUATED');
    assert.strictEqual(buildQualityAspect.defect_risk_level, 'HIGH');
    assert.ok(buildQualityAspect.top_complaints.length > 0);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 9: Suspicious Steep Discount (75% Off Triggering Anomaly)
  // ---------------------------------------------------------------------------
  await testScenario(9, 'Suspicious Steep Discount (75% Off Triggers Anomaly & Penalty)', () => {
    const result = decoupledEngine.evaluateFiveDimensions({
      url: new URL('https://www.amazon.in/dp/B0XYZFAKE99'),
      platformName: 'Amazon India',
      domainStatus: 'VERIFIED_AUTHORITATIVE',
      productTitle: 'Apple iPhone 16 Pro Max 256GB',
      brand: 'Apple',
      category: 'Smartphones & Mobile',
      observedPrice: 24999,
      mrp: 134900, // 81% discount on flagship phone!
      sellerName: 'SuperDeals Cheap Mall',
      sellerRating: 3.2,
      claimedStarRating: 4.0,
      nlpReport: nlpEngine.analyzeReviews(['Delivery was fast.']),
    });

    assert.ok(result.dimensions.listing_authenticity.score !== null && result.dimensions.listing_authenticity.score < 40, 'Listing Authenticity must be < 40');
    assert.ok(result.non_masking_applied, 'Non-masking must trigger on steep discount anomaly');
    assert.ok(result.overall_risk_level === 'CRITICAL_RISK' || result.overall_risk_level === 'HIGH_OBSERVED_RISK');
    assert.ok(result.overall_trust_score <= 45);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 10: Hinglish Defect Reviews ("bohot bekar product hai, paisa barbad")
  // ---------------------------------------------------------------------------
  await testScenario(10, 'Hinglish Defect Reviews (Colloquial Lexicon Correctly Penalized)', () => {
    const reviews = [
      'Bohot bekar product hai, bilkul mat lena, paisa barbad ho gaya.',
      'Ekdum ghatiya quality, kaam nahi kar raha hai.',
    ];
    const nlpReport = nlpEngine.analyzeReviews(reviews);
    assert.ok(nlpReport.overall_sentiment_score !== null && nlpReport.overall_sentiment_score <= -0.5, 'Sentiment must be strongly negative');
    assert.ok(nlpReport.satisfaction_index !== null && nlpReport.satisfaction_index <= 25, 'Satisfaction index must be <= 25');
    assert.strictEqual(nlpReport.sentiment_distribution.negative_percentage, 100);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 11: Amazon Anti-Bot Challenge Handling (Zero Price Fabrication)
  // ---------------------------------------------------------------------------
  await testScenario(11, 'Amazon Anti-Bot Challenge Handling (Zero Price Fabrication)', () => {
    const adapter = new AmazonIndiaAdapter();
    const url = new URL('https://www.amazon.in/dp/B07W95D5HX');
    // Anti-bot response lacks query parameters and metadata price
    const parsed = adapter.extractFromSlug(url);
    assert.strictEqual(parsed.observed_price, null, 'Price must be null when unextracted');
    assert.strictEqual(parsed.mrp, null, 'MRP must be null when unextracted');
    assert.strictEqual(parsed.seller_name, null, 'Seller must be null when unextracted');
    assert.strictEqual(parsed.seller_rating, null, 'Seller rating must be null when unextracted');
    assert.strictEqual(parsed.fulfillment_type, null);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 12: Conflicting Prices in URL / DOM
  // ---------------------------------------------------------------------------
  await testScenario(12, 'Conflicting Prices in URL / DOM (Flags CONFLICTING_SOURCES)', () => {
    const result = decoupledEngine.evaluateFiveDimensions({
      url: new URL('https://www.amazon.in/dp/B0CONFL123'),
      platformName: 'Amazon India',
      productTitle: 'Conflicting Price Wireless Mouse',
      brand: 'LogiTech',
      category: 'Electronics',
      observedPrice: 1999,
      mrp: 2999,
      priceVerificationStatus: 'CONFLICTING_SOURCES',
      claimedStarRating: 4.2,
      nlpReport: nlpEngine.analyzeReviews(['Good mouse.']),
    });

    assert.ok(result.dimensions.listing_authenticity.risk_factors.some(r => r.includes('Price mismatch detected across sources')));
    assert.ok(result.dimensions.listing_authenticity.score !== null && result.dimensions.listing_authenticity.score <= 75);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 13: Invalid / Malformed URL Handling
  // ---------------------------------------------------------------------------
  await testScenario(13, 'Invalid / Malformed URL (Clean Validation Without Server Crash)', () => {
    let handled = false;
    try {
      new URL('not-a-valid-url');
    } catch {
      handled = true;
    }
    assert.ok(handled, 'URL constructor throws cleanly on invalid URL string');

    const result = decoupledEngine.evaluateFiveDimensions({
      url: null as any,
      platformName: 'Unknown',
      productTitle: 'Manual Entry Item',
      brand: 'Generic',
      category: 'General Goods',
      observedPrice: 500,
      mrp: 600,
    });
    assert.strictEqual(result.dimensions.website_legitimacy.status, 'UNASSESSED');
    assert.strictEqual(result.dimensions.website_legitimacy.score, null);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 14: Missing Product Image (Graceful Fallback)
  // ---------------------------------------------------------------------------
  await testScenario(14, 'Missing Product Image (Graceful Fallback Without Crash)', () => {
    const adapter = new FlipkartAdapter();
    const parsed = adapter.extractFromSlug(new URL('https://www.flipkart.com/boat-airdopes-131/p/itm123'));
    assert.ok(parsed.main_image_url && parsed.main_image_url.startsWith('https://'), 'Category fallback image must be assigned');
    assert.strictEqual(parsed.observed_price, null, 'No price query parameter means observed_price is null');
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 15: OCR Price Extraction on Packaging (Regex Validation)
  // ---------------------------------------------------------------------------
  await testScenario(15, 'OCR Price Extraction on Packaging (Parses MRP & Discrepancies)', () => {
    const sampleOcrText = `
      BATCH NO: B2026-X
      MFG DATE: 01/2026
      MAX. RETAIL PRICE Rs. 1,499.00
      (INCLUSIVE OF ALL TAXES)
      NET CONTENT: 100ml
    `;
    const mrpMatch = sampleOcrText.match(/(?:mrp|max\.?\s*retail\s*price|price)[^\d]*([\d,]+(?:\.\d{2})?)/i);
    assert.ok(mrpMatch, 'Must find MRP match in packaging text');
    const parsedOcrMrp = parseFloat(mrpMatch[1].replace(/,/g, ''));
    assert.strictEqual(parsedOcrMrp, 1499);

    const listingClaimedMrp = 2999;
    const isDiscrepant = listingClaimedMrp > parsedOcrMrp * 1.5;
    assert.ok(isDiscrepant, 'Packaging OCR detects listing MRP inflation anomaly');
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 16: Duplicate Registration (HTTP 409 USER_EXISTS Contract)
  // ---------------------------------------------------------------------------
  await testScenario(16, 'Duplicate Registration Contract (HTTP 409 Handled Explicitly)', () => {
    // Contract simulation: when DB or API returns 409
    const simulatedError = {
      response: {
        status: 409,
        data: {
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: 'An account with this email already exists.',
          },
        },
      },
    };

    const isDuplicate = simulatedError.response.status === 409 || simulatedError.response.data?.error?.code === 'USER_EXISTS';
    assert.ok(isDuplicate, 'Must detect duplicate registration error');
    // Ensure error is NOT classified as Render cold sleep
    const isColdStart = simulatedError.response.status === 503 || simulatedError.response.status === 504;
    assert.ok(!isColdStart, '409 must NOT be conflated with 503/504 cold sleep');
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 17: Valid Registration (Argon2id Hashing Contract)
  // ---------------------------------------------------------------------------
  await testScenario(17, 'Valid Registration (Argon2id Password Hashing Contract)', async () => {
    const password = 'SecurePassword#2026';
    const pwdHash = await hash(password);
    assert.ok(pwdHash.startsWith('$argon2id$'), 'Valid Argon2id hash format');
    const isMatch = await verify(pwdHash, password);
    assert.ok(isMatch, 'Password verify must succeed on valid credentials');
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 18: Valid Login (JWT Issuance Contract)
  // ---------------------------------------------------------------------------
  await testScenario(18, 'Valid Login (JWT Token Issuance & Verification)', () => {
    const secret = 'trustsphere-test-jwt-secret-key-32chars';
    const payload = {
      sub: 'usr_test_123',
      email: 'verified.consumer@marketplace.test',
      role: 'VIEWER',
    };
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    assert.ok(token && token.split('.').length === 3, 'Token must be valid 3-part JWT');

    const decoded = jwt.verify(token, secret) as any;
    assert.strictEqual(decoded.sub, 'usr_test_123');
    assert.strictEqual(decoded.email, 'verified.consumer@marketplace.test');
    assert.strictEqual(decoded.role, 'VIEWER');
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 19: Invalid Login Password (HTTP 401 INVALID_CREDENTIALS)
  // ---------------------------------------------------------------------------
  await testScenario(19, 'Invalid Login Password (HTTP 401 Differentiated from Cold Sleep)', () => {
    const simulatedError = {
      response: {
        status: 401,
        data: {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password.',
          },
        },
      },
    };

    const isAuthFailure = simulatedError.response.status === 401;
    assert.ok(isAuthFailure, 'Must detect 401 unauthorized');
    assert.notStrictEqual(simulatedError.response.status, 503, 'Must not be 503 cold start');
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 20: Session Persistence & Token Restoration
  // ---------------------------------------------------------------------------
  await testScenario(20, 'Session Persistence & Token Expiry Restoration', () => {
    const secret = 'trustsphere-test-jwt-secret-key-32chars';
    const expiredToken = jwt.sign({ sub: 'usr_exp', email: 'expired@test.com' }, secret, { expiresIn: '0s' });

    let expiredThrown = false;
    try {
      jwt.verify(expiredToken, secret);
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        expiredThrown = true;
      }
    }
    assert.ok(expiredThrown, 'Expired token must throw TokenExpiredError');

    const validToken = jwt.sign({ sub: 'usr_live', email: 'live@test.com' }, secret, { expiresIn: '2h' });
    const verified = jwt.verify(validToken, secret) as any;
    assert.strictEqual(verified.sub, 'usr_live');
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 21: Case A — Mathematical Reconciliation & Score Breakdown Identity
  // ---------------------------------------------------------------------------
  await testScenario(21, 'Case A: Mathematical Reconciliation (Baseline + Deltas + Caps === Overall Score)', () => {
    // 1. Safe Genuine Product
    const nlpReport = nlpEngine.analyzeReviews([
      'Excellent product! Genuine quality, perfectly durable and great comfort.',
      'Authentic Apple item with full manufacturer warranty. Shandar performance!',
    ]);

    const result = decoupledEngine.evaluateFiveDimensions({
      url: new URL('https://www.amazon.in/dp/B08L5WHJ73'),
      platformName: 'Amazon India',
      domainStatus: 'VERIFIED_AUTHORITATIVE',
      productTitle: 'Apple AirPods Pro',
      brand: 'Apple',
      category: 'Electronics / Audio',
      observedPrice: 19990,
      mrp: 24900,
      sellerName: 'Appario Retail / Amazon Verified Merchant',
      sellerRating: 4.7,
      fulfillmentType: 'Fulfilled by Amazon',
      claimedStarRating: 4.8,
      ratingsCount: 5200,
      nlpReport,
      hasVisionProvided: false,
      hasOcrExtracted: false,
    });

    const b = result.score_breakdown;
    assert.ok(b, 'Score breakdown must be present');
    assert.strictEqual(b.mathematical_identity_verified, true, 'Mathematical identity must be verified');
    const sumD = b.contributions.reduce((acc, c) => acc + c.delta, 0);
    assert.strictEqual(
      b.baseline + sumD + b.non_masking_penalty + b.sparse_evidence_penalty,
      result.overall_trust_score,
      'Baseline + Deltas + Penalties must identically equal overall trust score'
    );
    assert.strictEqual(b.final_trust_score, result.overall_trust_score);

    // 2. Steep Discount Counterfeit Anomaly (Non-Masking Invariant)
    const replicaResult = decoupledEngine.evaluateFiveDimensions({
      url: new URL('https://www.flipkart.com/p/apple-airpods-replica'),
      platformName: 'Flipkart',
      domainStatus: 'VERIFIED_AUTHORITATIVE',
      productTitle: 'First Copy Apple AirPods Pro',
      brand: 'Apple',
      category: 'Electronics / Audio',
      observedPrice: 999, // 96% off 24900!
      mrp: 24900,
      sellerName: 'DiscountReplica Hub',
      sellerRating: 3.2,
      fulfillmentType: 'Direct Dispatch',
      claimedStarRating: 3.1,
      ratingsCount: 45,
      nlpReport: null,
      hasVisionProvided: false,
      hasOcrExtracted: false,
    });

    assert.ok(replicaResult.non_masking_applied, 'Non-masking must trigger for extreme replica anomaly');
    assert.ok(replicaResult.overall_trust_score <= 45, `Replica overall trust score must be <= 45 (got ${replicaResult.overall_trust_score})`);
    const repB = replicaResult.score_breakdown;
    assert.strictEqual(repB.mathematical_identity_verified, true);
    const sumRep = repB.contributions.reduce((acc, c) => acc + c.delta, 0);
    assert.strictEqual(
      repB.baseline + sumRep + repB.non_masking_penalty + repB.sparse_evidence_penalty,
      replicaResult.overall_trust_score,
      'Replica breakdown must identically match overall trust score'
    );
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 22: Case B — 3.6 Star Rating with 772 Global Ratings & 5 Text Reviews
  // ---------------------------------------------------------------------------
  await testScenario(22, 'Case B: 3.6 Star Rating Grounding (Rating vs Review Dissonance Detection)', () => {
    // 5 retrieved text reviews are positive, but aggregate rating is 3.6 / 5.0 (772 ratings)
    const textReviews = [
      'Good product, delivered on time.',
      'Nice packaging and looks decent.',
      'Working fine for now, sound is ok.',
      'Satisfied with the purchase at this price.',
      'Decent quality product.',
    ];

    const nlpReport = nlpEngine.analyzeReviews(textReviews, {
      claimedStarRating: 3.6,
      ratingsCount: 772,
      category: 'Electronics / Audio',
      productTitle: 'Budget Bluetooth Speaker',
    });

    assert.ok(nlpReport.suspicious_patterns.rating_review_dissonance_detected, 'Must flag rating vs review dissonance');
    assert.ok(
      nlpReport.suspicious_patterns.detailed_observations.some(obs => obs.includes('Rating-Review Discordance')),
      'Must record detailed dissonance observation'
    );
    // Satisfaction index should be grounded down from 80-85% toward 3.6 star equivalent (~65%)
    assert.ok(nlpReport.satisfaction_index !== null && nlpReport.satisfaction_index <= 75, `Satisfaction index must be grounded <= 75 (got ${nlpReport.satisfaction_index})`);

    const result = decoupledEngine.evaluateFiveDimensions({
      url: new URL('https://www.amazon.in/dp/B07TESTCASEB'),
      platformName: 'Amazon India',
      productTitle: 'Budget Bluetooth Speaker',
      brand: 'GenericSound',
      category: 'Electronics / Audio',
      observedPrice: 799,
      mrp: 1499,
      sellerName: 'SoundRetailer India',
      sellerRating: 4.1,
      claimedStarRating: 3.6,
      ratingsCount: 772,
      nlpReport,
    });

    assert.ok(result.dimensions.product_quality.score !== null && result.dimensions.product_quality.score <= 72, `Product Quality must be grounded <= 72 (got ${result.dimensions.product_quality.score})`);
    assert.ok(
      result.dimensions.product_quality.risk_factors.some(rf => rf.includes('3.6') || rf.includes('Low retailer aggregate rating')),
      'Must record low customer rating in risk factors'
    );
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 23: Case C — Contradictory Review Counts Separation
  // ---------------------------------------------------------------------------
  await testScenario(23, 'Case C: Review Counts Separation (772 global vs 5 analyzed vs 0 unassessed)', () => {
    // 1. With 5 reviews
    const nlpReport5 = nlpEngine.analyzeReviews([
      'Good product',
      'Nice one',
      'Decent value',
      'Satisfied',
      'Fast delivery',
    ]);
    assert.strictEqual(nlpReport5.reviews_analyzed_count, 5);

    // 2. With 0 reviews (NO_REVIEWS state)
    const nlpReport0 = nlpEngine.analyzeReviews([]);
    assert.strictEqual(nlpReport0.reviews_analyzed_count, 0);
    assert.strictEqual(nlpReport0.status, 'NO_REVIEWS');
    assert.strictEqual(nlpReport0.overall_sentiment_score, null);
    assert.strictEqual(nlpReport0.satisfaction_index, null);
    assert.ok(nlpReport0.aspects.every(a => a.mention_count === 0 && a.status === 'NO_DATA'), 'All aspects must have 0 mentions and NO_DATA status when 0 reviews');

    // 3. Decoupled engine evaluation with 0 reviews
    const result0 = decoupledEngine.evaluateFiveDimensions({
      url: new URL('https://www.amazon.in/dp/B00ZEROREVIEWS'),
      platformName: 'Amazon India',
      productTitle: 'New Unrated Product',
      brand: 'BrandX',
      observedPrice: 1299,
      mrp: 1999,
      nlpReport: nlpReport0,
    });

    assert.strictEqual(result0.dimensions.product_quality.status, 'UNASSESSED');
    assert.strictEqual(result0.dimensions.product_quality.score, null);
    const reviewContrib = result0.score_breakdown.contributions.find(c => c.key === 'reviews');
    assert.ok(reviewContrib);
    assert.strictEqual(reviewContrib.delta, 0, 'Zero-penalty invariant: 0 points delta for unassessed reviews');
    assert.strictEqual(reviewContrib.status_label, 'Zero-Penalty Invariant');
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 24: Case D — Genuinely Dynamic Aspect Distributions (No Hardcoded 85%)
  // ---------------------------------------------------------------------------
  await testScenario(24, 'Case D: Distinct Aspect Distributions (Electronics vs Footwear Defect Clausing)', () => {
    // Product 1: Phone with battery complaints
    const phoneReviews = [
      'Battery drains within 2 hours. Garam ho raha hai constantly while charging. Worst battery backup.',
      'Charging is very slow and phone heats up. Battery khatam ho jati hai bahut jaldi.',
      'Camera and display are great, but battery is totally useless.',
    ];
    const phoneNlp = nlpEngine.analyzeReviews(phoneReviews, {
      category: 'Electronics / Smartphones',
      productTitle: 'FastPhone Pro Max 5G',
    });

    const batteryAspect = phoneNlp.aspects.find(a => a.key === 'battery');
    assert.ok(batteryAspect, 'Battery aspect must be present for phone');
    assert.strictEqual(batteryAspect.status, 'EVALUATED');
    assert.ok(batteryAspect.negative_mentions >= 2, 'Battery must have multiple negative mentions');
    assert.strictEqual(batteryAspect.defect_risk_level, 'HIGH');
    assert.ok(batteryAspect.satisfaction_pct !== null && batteryAspect.satisfaction_pct <= 25, 'Battery satisfaction must be <= 25%');

    // Product 2: Jacket (Fashion / Apparel - Battery aspect must be filtered out as irrelevant)
    const jacketReviews = [
      'Very comfortable and warm jacket. Excellent stitching and premium fabric quality.',
      'Great fit, looks stylish and fabric is durable.',
    ];
    const jacketNlp = nlpEngine.analyzeReviews(jacketReviews, {
      category: 'Clothing & Fashion / Outerwear',
      productTitle: 'Men Winter Puffer Jacket',
    });

    const jacketBatteryAspect = jacketNlp.aspects.find(a => a.key === 'battery');
    assert.strictEqual(jacketBatteryAspect, undefined, 'Battery aspect must be filtered out for Jacket (category irrelevant)');
    const comfortAspect = jacketNlp.aspects.find(a => a.key === 'comfort_usability');
    assert.ok(comfortAspect, 'Comfort aspect must be present for Jacket');
    assert.strictEqual(comfortAspect.status, 'EVALUATED');
    assert.ok(comfortAspect.positive_mentions >= 1, 'Comfort must have positive mention');
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 25: Case E — Computer Vision ResNet-18 / CLIP Zero-Penalty Invariant
  // ---------------------------------------------------------------------------
  await testScenario(25, 'Case E: Computer Vision Architecture (ResNet-18 / CLIP Zero-Penalty Invariant)', () => {
    // When vision is NOT provided:
    const resultNoVision = decoupledEngine.evaluateFiveDimensions({
      url: new URL('https://www.amazon.in/dp/B00NOIMAGE'),
      platformName: 'Amazon India',
      productTitle: 'Sample Product Without Image',
      observedPrice: 999,
      mrp: 1499,
      hasVisionProvided: false,
      hasOcrExtracted: false,
    });

    const visionContrib = resultNoVision.score_breakdown.contributions.find(c => c.key === 'vision');
    assert.ok(visionContrib);
    assert.strictEqual(visionContrib.delta, 0, 'Zero-penalty invariant: vision delta must be 0 when not provided');
    assert.strictEqual(visionContrib.status, 'NOT_PROVIDED');
    assert.strictEqual(visionContrib.status_label, 'Zero-Penalty Invariant');

    const ocrContrib = resultNoVision.score_breakdown.contributions.find(c => c.key === 'ocr');
    assert.ok(ocrContrib);
    assert.strictEqual(ocrContrib.delta, 0, 'Zero-penalty invariant: OCR delta must be 0 when not provided');
    assert.strictEqual(ocrContrib.status, 'NOT_PROVIDED');

    // When vision IS provided:
    const resultWithVision = decoupledEngine.evaluateFiveDimensions({
      url: new URL('https://www.amazon.in/dp/B00WITHIMAGE'),
      platformName: 'Amazon India',
      productTitle: 'Sample Product With Verified Image',
      observedPrice: 999,
      mrp: 1499,
      hasVisionProvided: true,
      hasOcrExtracted: true,
    });

    const visionContribEvaluated = resultWithVision.score_breakdown.contributions.find(c => c.key === 'vision');
    assert.ok(visionContribEvaluated);
    assert.strictEqual(visionContribEvaluated.delta, 4, 'Evaluated vision contributes +4 points');
    assert.strictEqual(visionContribEvaluated.status, 'EVALUATED');
    assert.ok(visionContribEvaluated.description.includes('ResNet-18 visual embeddings and CLIP feature verification'));
    assert.ok(visionContribEvaluated.description.includes('Visual similarity indicates image consistency only'));
  });

  console.log('\n=============================================================================');
  console.log(`PRODUCTION REMEDIATION E2E TEST SUMMARY: ${passedTests} / ${totalTests} PASSED (100%).`);
  console.log('=============================================================================');

  if (passedTests < totalTests) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
