import { reviewNlpEngine, ReviewItem } from '../src/modules/investigate/review_nlp_engine';

function testLiveNlpAcceptance() {
  console.log('=============================================================================');
  console.log('NLP ACCEPTANCE: MULTILINGUAL ABSA ON REAL CUSTOMER REVIEWS');
  console.log('=============================================================================');

  // Realistic review inputs spanning English, Hindi (Devanagari), Hinglish, duplicates, and dissonance
  const testReviews: ReviewItem[] = [
    // 1. English - Build quality & design praise
    {
      review_text: 'The green dial looks stunning and the brass case finishing is very classy. Absolutely genuine Titan product.',
      rating: 5,
      reviewer_name: 'Ananya S.',
      verified_purchase: true,
    },
    // 2. Hinglish - Comfort & battery praise
    {
      review_text: 'Mesh metal strap fits comfortably on the wrist and clasp is sturdy. Battery backup bhi badiya hai.',
      rating: 5,
      reviewer_name: 'Rohit K.',
      verified_purchase: true,
    },
    // 3. Hindi (Devanagari) - Build quality & packaging praise
    {
      review_text: 'यह घड़ी बहुत सुंदर है, क्वालिटी और फिनिशिंग एकदम शानदार है। बहुत बढ़िया पैकेजिंग।',
      rating: 5,
      reviewer_name: 'सुमन वर्मा',
      verified_purchase: true,
    },
    // 4. Duplicate review (astroturfing pattern test)
    {
      review_text: 'The green dial looks stunning and the brass case finishing is very classy. Absolutely genuine Titan product.',
      rating: 5,
      reviewer_name: 'Bot User 1',
      verified_purchase: false,
    },
    // 5. Hinglish - Minor complaint with diminisher
    {
      review_text: 'Chala to theek hai par strap thoda sa tight hai wrist pe.',
      rating: 3,
      reviewer_name: 'Vikram M.',
      verified_purchase: true,
    },
    // 6. Rating dissonance - 5 stars with negative complaint
    {
      review_text: 'Bekar service center experience, glass cracked within 2 days.',
      rating: 5, // Dissonant 5-star rating with severe negative text!
      reviewer_name: 'Deepak P.',
      verified_purchase: true,
    },
    // 7. Hindi (Devanagari) - Fake alert complaint
    {
      review_text: 'धोखा मिला, नकली और टूटा हुआ माल भेजा। बिल्कुल मत खरीदो।',
      rating: 1,
      reviewer_name: 'अमित कुमार',
      verified_purchase: true,
    },
  ];

  const report = reviewNlpEngine.analyzeReviews(testReviews, {
    claimedStarRating: 3.8,
    ratingsCount: 1420,
    publishedReviewCount: 1420,
    retrievedReviewCount: testReviews.length,
    category: 'Watches',
    productTitle: 'Sonata Poze Quartz Analog Green Dial Metal Strap Watch SP8005LKM03W',
  });

  console.log('\n--- 1. OVERALL COUNTS & METRICS ---');
  console.log(`Status: ${report.status}`);
  console.log(`Published Review Count: ${report.published_review_count}`);
  console.log(`Retrieved Review Count: ${report.retrieved_review_count}`);
  console.log(`Analyzed Review Count:  ${report.reviews_analyzed_count}`);
  console.log(`Overall Sentiment Score: ${report.overall_sentiment_score} (-1.0 to +1.0)`);
  console.log(`Satisfaction Index:     ${report.satisfaction_index}%`);
  console.log('Sentiment Distribution:', report.sentiment_distribution);

  console.log('\n--- 2. ASPECT-BASED SENTIMENT ANALYSIS (WATCHES DIMENSIONS) ---');
  report.aspects.forEach((a) => {
    if (a.status === 'EVALUATED') {
      console.log(`• [${a.display_name}]`);
      console.log(`    Score: ${a.sentiment_score} | Satisfaction: ${a.satisfaction_pct}% | Label: ${a.sentiment_label}`);
      console.log(`    Mentions: ${a.mention_count} (Pos: ${a.positive_mentions}, Neg: ${a.negative_mentions})`);
      if (a.top_praises.length) console.log(`    Top Praises: ${JSON.stringify(a.top_praises)}`);
      if (a.top_complaints.length) console.log(`    Top Complaints: ${JSON.stringify(a.top_complaints)}`);
    }
  });

  console.log('\n--- 3. PATTERN DETECTION & ANOMALIES ---');
  console.log('Duplicate Indicators:', report.duplicate_review_indicators);
  console.log('Suspicious Patterns:', {
    rating_review_dissonance_detected: report.suspicious_patterns.rating_review_dissonance_detected,
    dissonant_reviews_count: report.suspicious_patterns.dissonant_reviews_count,
    counterfeit_complaints_count: report.suspicious_patterns.counterfeit_complaints_count,
    detailed_observations: report.suspicious_patterns.detailed_observations,
  });

  console.log('\n--- 4. FOUR-WAY CLASSIFICATION ---');
  console.log('Product Dissatisfaction:', report.four_way_classification.product_dissatisfaction);
  console.log('Manipulated Reviews:', report.four_way_classification.manipulated_reviews);
  console.log('Authenticity Concerns:', report.four_way_classification.authenticity_concerns);
  console.log('Insufficient Evidence:', report.four_way_classification.insufficient_evidence);

  console.log('\n--- 5. MODEL CONFIDENCE & LIMITATIONS ---');
  console.log(`Confidence Score: ${report.confidence_score}`);
  console.log(`Limitations: ${JSON.stringify(report.limitations)}`);
}

testLiveNlpAcceptance();
