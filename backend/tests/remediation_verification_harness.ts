import { URL } from 'node:url';
import { decoupledTrustEngine } from '../src/modules/investigate/decoupled_trust_engine';
import { reviewNlpEngine } from '../src/modules/investigate/review_nlp_engine';

console.log('=============================================================================');
console.log('TRUSTSPHERE MATHEMATICAL & INVARIANT VERIFICATION HARNESS');
console.log('=============================================================================\n');

// ---------------------------------------------------------------------------
// EXAMPLE A: Product with Strong Positive Evidence
// ---------------------------------------------------------------------------
console.log('--- EXAMPLE A: Product with Strong Positive Evidence ---');
const positiveReviews = [
  'Excellent product! Genuine quality, perfectly durable and great comfort.',
  'Authentic Apple item with full manufacturer warranty. Shandar performance!',
  'Paisa vasool, superb build and crystal clear sound. Highly recommended.',
  'Best earphones I have ever purchased. Battery lasts over 30 hours.',
  'Packaging was intact, original seal verified. Works smoothly.',
];
const nlpA = reviewNlpEngine.analyzeReviews(positiveReviews, {
  claimedStarRating: 4.8,
  ratingsCount: 5200,
  category: 'Electronics / Audio',
  productTitle: 'Apple AirPods Pro 2nd Gen',
});

const resultA = decoupledTrustEngine.evaluateFiveDimensions({
  url: new URL('https://www.amazon.in/dp/B0BDHW4P13'),
  platformName: 'Amazon India',
  domainStatus: 'VERIFIED_AUTHORITATIVE',
  productTitle: 'Apple AirPods Pro 2nd Gen with MagSafe Case',
  brand: 'Apple',
  category: 'Electronics / Audio',
  observedPrice: 19990,
  mrp: 24900,
  sellerName: 'Appario Retail / Amazon Verified Merchant',
  sellerRating: 4.7,
  fulfillmentType: 'Fulfilled by Amazon',
  claimedStarRating: 4.8,
  ratingsCount: 5200,
  nlpReport: nlpA,
  hasVisionProvided: true,
  hasOcrExtracted: true,
});

console.log('Example A Results:');
console.log('Dimensions:');
console.log(`  - Product Quality: ${resultA.dimensions.product_quality.score} (Status: ${resultA.dimensions.product_quality.status})`);
console.log(`  - Seller Reliability: ${resultA.dimensions.seller_reliability.score} (Status: ${resultA.dimensions.seller_reliability.status})`);
console.log(`  - Listing Authenticity: ${resultA.dimensions.listing_authenticity.score} (Status: ${resultA.dimensions.listing_authenticity.status})`);
console.log(`  - Website Legitimacy: ${resultA.dimensions.website_legitimacy.score} (Status: ${resultA.dimensions.website_legitimacy.status})`);
console.log(`Evidence Coverage: ${resultA.evidence.coverage_percent}%`);
console.log(`Score Breakdown (Baseline: ${resultA.score_breakdown.baseline}):`);
resultA.score_breakdown.contributions.forEach(c => {
  console.log(`  - [${c.key}] ${c.title}: delta = ${c.delta > 0 ? '+' : ''}${c.delta} (raw: ${c.raw_score}, status: ${c.status})`);
});
console.log(`Subtotal Before Caps: ${resultA.score_breakdown.subtotal_before_caps}`);
console.log(`Boundary Clamp Adjustment: ${resultA.score_breakdown.boundary_clamp_adjustment}`);
console.log(`Non-Masking Applied: ${resultA.score_breakdown.non_masking_applied} (Penalty: ${resultA.score_breakdown.non_masking_penalty})`);
console.log(`Sparse Evidence Applied: ${resultA.score_breakdown.sparse_evidence_applied} (Penalty: ${resultA.score_breakdown.sparse_evidence_penalty})`);
console.log(`Final Trust Score: ${resultA.overall_trust_score}`);
console.log(`Identity Verified: ${resultA.score_breakdown.mathematical_identity_verified}`);
console.log(`Risk Classification: ${resultA.overall_risk_level}`);
console.log(`Recommendation: ${resultA.recommendation}\n`);

// ---------------------------------------------------------------------------
// EXAMPLE B: Product with Poor Reviews and a Severe Price Anomaly
// ---------------------------------------------------------------------------
console.log('--- EXAMPLE B: Product with Poor Reviews & Severe Price Anomaly ---');
const defectReviews = [
  'Fake product! Broke on the second day. Absolute waste of money.',
  'Defective item received. Buttons stopped working after 3 days. Very bad quality.',
  'Duplicate counterfeit copy. Inferior plastic and pathetic build quality. Return rejected.',
  'Tut gaya do din me. Bilkul bekar product hai. Fraud seller.',
];
const nlpB = reviewNlpEngine.analyzeReviews(defectReviews, {
  claimedStarRating: 1.8,
  ratingsCount: 42,
  category: 'Electronics / Audio',
  productTitle: 'Apple AirPods Pro Replica',
});

const resultB = decoupledTrustEngine.evaluateFiveDimensions({
  url: new URL('https://www.flipkart.com/p/apple-airpods-replica'),
  platformName: 'Flipkart',
  domainStatus: 'VERIFIED_AUTHORITATIVE',
  productTitle: 'First Copy Apple AirPods Pro',
  brand: 'Apple',
  category: 'Electronics / Audio',
  observedPrice: 499, // 98% off 24900
  mrp: 24900,
  sellerName: 'DiscountDeals Store',
  sellerRating: 3.1,
  fulfillmentType: 'Direct Dispatch',
  claimedStarRating: 1.8,
  ratingsCount: 42,
  nlpReport: nlpB,
  hasVisionProvided: false,
  hasOcrExtracted: false,
});

console.log('Example B Results:');
console.log('Dimensions:');
console.log(`  - Product Quality: ${resultB.dimensions.product_quality.score} (Status: ${resultB.dimensions.product_quality.status})`);
console.log(`  - Seller Reliability: ${resultB.dimensions.seller_reliability.score} (Status: ${resultB.dimensions.seller_reliability.status})`);
console.log(`  - Listing Authenticity: ${resultB.dimensions.listing_authenticity.score} (Status: ${resultB.dimensions.listing_authenticity.status})`);
console.log(`  - Website Legitimacy: ${resultB.dimensions.website_legitimacy.score} (Status: ${resultB.dimensions.website_legitimacy.status})`);
console.log(`Evidence Coverage: ${resultB.evidence.coverage_percent}%`);
console.log(`Score Breakdown (Baseline: ${resultB.score_breakdown.baseline}):`);
resultB.score_breakdown.contributions.forEach(c => {
  console.log(`  - [${c.key}] ${c.title}: delta = ${c.delta > 0 ? '+' : ''}${c.delta} (raw: ${c.raw_score}, status: ${c.status})`);
});
console.log(`Subtotal Before Caps: ${resultB.score_breakdown.subtotal_before_caps}`);
console.log(`Boundary Clamp Adjustment: ${resultB.score_breakdown.boundary_clamp_adjustment}`);
console.log(`Non-Masking Applied: ${resultB.score_breakdown.non_masking_applied} (Penalty: ${resultB.score_breakdown.non_masking_penalty})`);
console.log(`Non-Masking Reason: ${resultB.non_masking_reason}`);
console.log(`Sparse Evidence Applied: ${resultB.score_breakdown.sparse_evidence_applied} (Penalty: ${resultB.score_breakdown.sparse_evidence_penalty})`);
console.log(`Final Trust Score: ${resultB.overall_trust_score}`);
console.log(`Identity Verified: ${resultB.score_breakdown.mathematical_identity_verified}`);
console.log(`Risk Classification: ${resultB.overall_risk_level}`);
console.log(`Recommendation: ${resultB.recommendation}\n`);

// ---------------------------------------------------------------------------
// EXAMPLE C: Product with Insufficient Reviews, Missing Seller, and Critical Risk Signal
// ---------------------------------------------------------------------------
console.log('--- EXAMPLE C: Insufficient Reviews, Missing Seller, Critical Risk Signal ---');
const nlpC = reviewNlpEngine.analyzeReviews([], {
  claimedStarRating: null,
  ratingsCount: null,
  category: 'Fashion / Luxury',
  productTitle: 'Gucci Leather Handbag',
});

const resultC = decoupledTrustEngine.evaluateFiveDimensions({
  url: new URL('https://www.amaz0n-offers.co/item/gucci-bag'),
  platformName: 'Amaz0n Phishing Clone',
  domainStatus: 'SUSPECTED_IMPERSONATION',
  isLookalike: true,
  productTitle: 'Gucci Genuine Leather Handbag',
  brand: 'Gucci',
  category: 'Fashion / Luxury',
  observedPrice: 1999, // 95% off 45000
  mrp: 45000,
  sellerName: null, // missing seller
  sellerRating: null,
  fulfillmentType: null,
  claimedStarRating: null,
  ratingsCount: null,
  nlpReport: nlpC, // zero reviews
  hasVisionProvided: false,
  hasOcrExtracted: false,
});

console.log('Example C Results:');
console.log('Dimensions:');
console.log(`  - Product Quality: ${resultC.dimensions.product_quality.score} (Status: ${resultC.dimensions.product_quality.status})`);
console.log(`  - Seller Reliability: ${resultC.dimensions.seller_reliability.score} (Status: ${resultC.dimensions.seller_reliability.status})`);
console.log(`  - Listing Authenticity: ${resultC.dimensions.listing_authenticity.score} (Status: ${resultC.dimensions.listing_authenticity.status})`);
console.log(`  - Website Legitimacy: ${resultC.dimensions.website_legitimacy.score} (Status: ${resultC.dimensions.website_legitimacy.status})`);
console.log(`Evidence Coverage: ${resultC.evidence.coverage_percent}%`);
console.log(`Score Breakdown (Baseline: ${resultC.score_breakdown.baseline}):`);
resultC.score_breakdown.contributions.forEach(c => {
  console.log(`  - [${c.key}] ${c.title}: delta = ${c.delta > 0 ? '+' : ''}${c.delta} (raw: ${c.raw_score}, status: ${c.status})`);
});
console.log(`Subtotal Before Caps: ${resultC.score_breakdown.subtotal_before_caps}`);
console.log(`Boundary Clamp Adjustment: ${resultC.score_breakdown.boundary_clamp_adjustment}`);
console.log(`Non-Masking Applied: ${resultC.score_breakdown.non_masking_applied} (Penalty: ${resultC.score_breakdown.non_masking_penalty})`);
console.log(`Non-Masking Reason: ${resultC.non_masking_reason}`);
console.log(`Sparse Evidence Applied: ${resultC.score_breakdown.sparse_evidence_applied} (Penalty: ${resultC.score_breakdown.sparse_evidence_penalty})`);
console.log(`Final Trust Score: ${resultC.overall_trust_score}`);
console.log(`Identity Verified: ${resultC.score_breakdown.mathematical_identity_verified}`);
console.log(`Risk Classification: ${resultC.overall_risk_level}`);
console.log(`Recommendation: ${resultC.recommendation}\n`);

// ---------------------------------------------------------------------------
// MANDATE 4: Reproduction of Previous Production Failure Case
// ---------------------------------------------------------------------------
console.log('--- MANDATE 4: Reproduction of Previous Production Failure Case ---');
console.log('Parameters:');
console.log('  - Retailer Aggregate Rating: 3.6 / 5.0 (772 ratings)');
console.log('  - Rating Breakdown: 1★: 19%, 2★: 6%, 3★: 12%, 4★: 16%, 5★: 47%');
console.log('  - Price Anomaly: 56% discount (Observed: ₹1,499 vs Claimed MRP: ₹3,400)');
console.log('  - Scraped Text Reviews: 5 predominantly positive reviews retrieved');

const case4Reviews = [
  'Good product for this price point, delivered safely.',
  'Satisfied with the sound quality and look.',
  'Decent build quality, looks nice on desk.',
  'Working well so far, happy with purchase.',
  'Fast shipping and nice packaging.',
];
const nlpCase4 = reviewNlpEngine.analyzeReviews(case4Reviews, {
  claimedStarRating: 3.6,
  ratingsCount: 772,
  category: 'Electronics / Audio',
  productTitle: 'Boat Airdopes 141 Bluetooth Earbuds',
});

const resultCase4 = decoupledTrustEngine.evaluateFiveDimensions({
  url: new URL('https://www.amazon.in/dp/B09N3ZNHTY'),
  platformName: 'Amazon India',
  domainStatus: 'VERIFIED_AUTHORITATIVE',
  productTitle: 'Boat Airdopes 141 Bluetooth Earbuds',
  brand: 'boAt',
  category: 'Electronics / Audio',
  observedPrice: 1499,
  mrp: 3400, // 56% discount
  sellerName: 'Imagine Marketing / boAt Official Seller',
  sellerRating: 4.2,
  fulfillmentType: 'Fulfilled by Amazon',
  claimedStarRating: 3.6,
  ratingsCount: 772,
  nlpReport: nlpCase4,
  hasVisionProvided: false,
  hasOcrExtracted: false,
});

console.log('\nCase 4 Results:');
console.log('NLP Intelligence:');
console.log(`  - Raw Scraped Text Polarity: ${nlpCase4.overall_sentiment_score}`);
console.log(`  - Grounded Satisfaction Index: ${nlpCase4.satisfaction_index}%`);
console.log(`  - Dissonance Detected: ${nlpCase4.suspicious_patterns.rating_review_dissonance_detected}`);
console.log(`  - Observations: ${nlpCase4.suspicious_patterns.detailed_observations.join('; ')}`);

console.log('\nDimensions:');
console.log(`  - Product Quality: ${resultCase4.dimensions.product_quality.score}/100 (Risk: ${resultCase4.dimensions.product_quality.risk_level})`);
console.log(`  - Seller Reliability: ${resultCase4.dimensions.seller_reliability.score}/100 (Risk: ${resultCase4.dimensions.seller_reliability.risk_level})`);
console.log(`  - Listing Authenticity: ${resultCase4.dimensions.listing_authenticity.score}/100 (Risk: ${resultCase4.dimensions.listing_authenticity.risk_level})`);
console.log(`  - Website Legitimacy: ${resultCase4.dimensions.website_legitimacy.score}/100 (Risk: ${resultCase4.dimensions.website_legitimacy.risk_level})`);

console.log('\nScore Breakdown (Baseline: 50):');
resultCase4.score_breakdown.contributions.forEach(c => {
  console.log(`  - [${c.key}] ${c.title}: delta = ${c.delta > 0 ? '+' : ''}${c.delta} (raw: ${c.raw_score}, status: ${c.status_label})`);
});
console.log(`Subtotal Before Caps: ${resultCase4.score_breakdown.subtotal_before_caps}`);
console.log(`Boundary Clamp Adjustment: ${resultCase4.score_breakdown.boundary_clamp_adjustment}`);
console.log(`Non-Masking Applied: ${resultCase4.score_breakdown.non_masking_applied} (Penalty: ${resultCase4.score_breakdown.non_masking_penalty})`);
console.log(`Sparse Evidence Applied: ${resultCase4.score_breakdown.sparse_evidence_applied} (Penalty: ${resultCase4.score_breakdown.sparse_evidence_penalty})`);
console.log(`Final Trust Score: ${resultCase4.overall_trust_score}`);
console.log(`Identity Verified: ${resultCase4.score_breakdown.mathematical_identity_verified}`);
console.log(`Risk Classification: ${resultCase4.overall_risk_level}`);
console.log(`Recommendation: ${resultCase4.recommendation}`);
console.log(`Recommendation Rationale: ${resultCase4.recommendation_rationale}`);
