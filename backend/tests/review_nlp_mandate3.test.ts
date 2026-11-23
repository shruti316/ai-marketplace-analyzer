import { reviewNlpEngine } from '../src/modules/investigate/review_nlp_engine';

console.log('=============================================================================');
console.log('MANDATE 3: REVIEW NLP & COUNTS VERIFICATION ACROSS 3 PRODUCTS');
console.log('=============================================================================\n');

// ---------------------------------------------------------------------------
// PRODUCT 1: Strong Positive Reviews (Sony WH-1000XM5 Headphones)
// ---------------------------------------------------------------------------
console.log('--- PRODUCT 1: Strong Positive Reviews (Sony WH-1000XM5) ---');
const product1Reviews = [
  'Sound quality is simply unbelievable, crystal clear highs and deep punchy bass.',
  'Battery life easily lasts over 30 hours on a single charge. Superb fast charging!',
  'Extremely comfortable for long flights. Soft cushions and lightweight headband.',
  'Build quality feels solid and premium. Genuine Sony product with original seal.',
  'Paisa vasool, best active noise cancelling headphones in the market. Amazing build!',
  'Smooth Bluetooth connection, connects instantly to laptop and phone simultaneously.',
];

const nlp1 = reviewNlpEngine.analyzeReviews(product1Reviews, {
  claimedStarRating: 4.8,
  ratingsCount: 3840,
  category: 'Electronics / Audio',
  productTitle: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
});

console.log('Product 1 Metadata:');
console.log('  - Claimed Aggregate Rating: 4.8 / 5.0 (3,840 ratings)');
console.log(`  - Retrieved Review Count: ${product1Reviews.length}`);
console.log(`  - Analyzed Review Count: ${nlp1.reviews_analyzed_count}`);
console.log('  - Overall Sentiment Score:', nlp1.overall_sentiment_score);
console.log('  - Satisfaction Index:', nlp1.satisfaction_index + '%');
console.log('Sentiment Distribution:');
console.log(`  - Positive: ${nlp1.sentiment_distribution.positive_percentage}%`);
console.log(`  - Neutral: ${nlp1.sentiment_distribution.neutral_percentage}%`);
console.log(`  - Negative: ${nlp1.sentiment_distribution.negative_percentage}%`);
console.log('Aspect-Level Sentiment Distribution:');
nlp1.aspects.forEach((asp) => {
  if (asp.status === 'EVALUATED') {
    console.log(`  - [${asp.display_name}]: ${asp.satisfaction_pct}% (${asp.sentiment_label}) | Mentions: ${asp.mention_count} (Pos: ${asp.positive_mentions}, Neg: ${asp.negative_mentions})`);
    if (asp.top_praises.length) console.log(`      Praise clause: "${asp.top_praises[0]}"`);
  } else {
    console.log(`  - [${asp.display_name}]: NO DATA (Mentions: 0)`);
  }
});

// ---------------------------------------------------------------------------
// PRODUCT 2: Mixed / Polarizing Reviews (Smartphone with Great Screen but Weak Battery)
// ---------------------------------------------------------------------------
console.log('\n--- PRODUCT 2: Mixed / Polarizing Reviews (Budget 5G Smartphone) ---');
const product2Reviews = [
  'Display is gorgeous and bright, but battery drains very fast within 5 hours.',
  'Camera quality is decent in daylight, but very slow performance in gaming with lag.',
  'Build is okay for the price, however customer support was unhelpful and rude when contacted.',
  'Good looking phone, par charging time is too long and device gets heated up quickly.',
  'Sound speaker is loud and clear, but heating issue is really annoying during calls.',
];

const nlp2 = reviewNlpEngine.analyzeReviews(product2Reviews, {
  claimedStarRating: 3.4,
  ratingsCount: 1250,
  category: 'Electronics / Smartphones',
  productTitle: 'Nova 5G Smartphone',
});

console.log('Product 2 Metadata:');
console.log('  - Claimed Aggregate Rating: 3.4 / 5.0 (1,250 ratings)');
console.log(`  - Retrieved Review Count: ${product2Reviews.length}`);
console.log(`  - Analyzed Review Count: ${nlp2.reviews_analyzed_count}`);
console.log('  - Overall Sentiment Score:', nlp2.overall_sentiment_score);
console.log('  - Satisfaction Index:', nlp2.satisfaction_index + '%');
console.log('Sentiment Distribution:');
console.log(`  - Positive: ${nlp2.sentiment_distribution.positive_percentage}%`);
console.log(`  - Neutral: ${nlp2.sentiment_distribution.neutral_percentage}%`);
console.log(`  - Negative: ${nlp2.sentiment_distribution.negative_percentage}%`);
console.log('Aspect-Level Sentiment Distribution:');
nlp2.aspects.forEach((asp) => {
  if (asp.status === 'EVALUATED') {
    console.log(`  - [${asp.display_name}]: ${asp.satisfaction_pct}% (${asp.sentiment_label}) | Mentions: ${asp.mention_count} (Pos: ${asp.positive_mentions}, Neg: ${asp.negative_mentions})`);
    if (asp.top_praises.length) console.log(`      Praise clause: "${asp.top_praises[0]}"`);
    if (asp.top_complaints.length) console.log(`      Complaint clause: "${asp.top_complaints[0]}"`);
  } else {
    console.log(`  - [${asp.display_name}]: NO DATA (Mentions: 0)`);
  }
});

// ---------------------------------------------------------------------------
// PRODUCT 3: Strongly Negative Reviews (Counterfeit / Defective Fast Charger)
// ---------------------------------------------------------------------------
console.log('\n--- PRODUCT 3: Strongly Negative Reviews (Defective Fast Charger) ---');
const product3Reviews = [
  'Fake duplicate product! Stopped working within 2 days, complete waste of money.',
  'Dangerous item. Started smoking and burnt my socket. Farzi nakli product.',
  'Terrible quality, cheap plastic and loose pin. Defective item received.',
  'Bekar charger hai, zero build quality. Return request was rejected by seller.',
  'Duplicate counterfeit copy. Not an original Apple charger. Fraud seller.',
];

const nlp3 = reviewNlpEngine.analyzeReviews(product3Reviews, {
  claimedStarRating: 1.5,
  ratingsCount: 89,
  category: 'Electronics / Accessories',
  productTitle: 'Apple 20W USB-C Power Adapter (Replica)',
});

console.log('Product 3 Metadata:');
console.log('  - Claimed Aggregate Rating: 1.5 / 5.0 (89 ratings)');
console.log(`  - Retrieved Review Count: ${product3Reviews.length}`);
console.log(`  - Analyzed Review Count: ${nlp3.reviews_analyzed_count}`);
console.log('  - Overall Sentiment Score:', nlp3.overall_sentiment_score);
console.log('  - Satisfaction Index:', nlp3.satisfaction_index + '%');
console.log('Sentiment Distribution:');
console.log(`  - Positive: ${nlp3.sentiment_distribution.positive_percentage}%`);
console.log(`  - Neutral: ${nlp3.sentiment_distribution.neutral_percentage}%`);
console.log(`  - Negative: ${nlp3.sentiment_distribution.negative_percentage}%`);
console.log('Aspect-Level Sentiment Distribution:');
nlp3.aspects.forEach((asp) => {
  if (asp.status === 'EVALUATED') {
    console.log(`  - [${asp.display_name}]: ${asp.satisfaction_pct}% (${asp.sentiment_label}) | Mentions: ${asp.mention_count} (Pos: ${asp.positive_mentions}, Neg: ${asp.negative_mentions})`);
    if (asp.top_complaints.length) console.log(`      Complaint clause: "${asp.top_complaints[0]}"`);
  } else {
    console.log(`  - [${asp.display_name}]: NO DATA (Mentions: 0)`);
  }
});
console.log('\nFour-Way Classification on Product 3:');
console.log('  - Product Dissatisfaction:', nlp3.four_way_classification.product_dissatisfaction);
console.log('  - Authenticity Concerns:', nlp3.four_way_classification.authenticity_concerns);
console.log('  - Counterfeit Complaints Count:', nlp3.suspicious_patterns.counterfeit_complaints_count);
