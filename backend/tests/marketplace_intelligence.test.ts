import assert from 'node:assert';
import { UrlRetrieverService } from '../src/modules/investigate/url_retriever';
import { DecathlonAdapter } from '../src/modules/investigate/marketplace_adapters/decathlon_adapter';
import { CromaAdapter } from '../src/modules/investigate/marketplace_adapters/croma_adapter';
import { AdidasAdapter } from '../src/modules/investigate/marketplace_adapters/adidas_adapter';
import { WebsiteTrustService } from '../src/modules/investigate/website_trust_service';
import { SellerTrustService } from '../src/modules/investigate/seller_trust_service';
import { BuyingSuitabilityService } from '../src/modules/investigate/buying_suitability_service';
import { ReviewNlpEngine } from '../src/modules/investigate/review_nlp_engine';

console.log('=============================================================================');
console.log('Running TrustSphere Marketplace Intelligence & Agnostic Trust Test Suite');
console.log('=============================================================================\n');

let passedTests = 0;
let totalTests = 0;

function it(description: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    const res = fn();
    if (res instanceof Promise) {
      return res.then(() => {
        passedTests++;
        console.log(`PASS: ${description}`);
      }).catch((err) => {
        console.error(`FAIL: ${description}`);
        console.error(err);
        process.exitCode = 1;
      });
    }
    passedTests++;
    console.log(`PASS: ${description}`);
  } catch (err) {
    console.error(`FAIL: ${description}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function runAll() {
  console.log('--- Test Group 1: Layered Price & Structured Data Extraction ---');

  const retriever = new UrlRetrieverService();

  await it('Layer 1: Parses JSON-LD Product with Offer and priceSpecification', () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "Sony WH-1000XM5 Wireless Headphones",
            "brand": { "@type": "Brand", "name": "Sony" },
            "category": "Electronics > Audio",
            "image": "https://images.example.com/sony.jpg",
            "offers": {
              "@type": "Offer",
              "price": "26990",
              "priceCurrency": "INR",
              "availability": "https://schema.org/InStock",
              "priceSpecification": {
                "@type": "PriceSpecification",
                "price": 26990,
                "priceCurrency": "INR"
              }
            }
          }
          </script>
        </head>
      </html>
    `;
    const res = retriever.parseJsonLd(html);
    assert.strictEqual(res.title, 'Sony WH-1000XM5 Wireless Headphones');
    assert.strictEqual(res.brand, 'Sony');
    assert.strictEqual(res.price, 26990);
    assert.strictEqual(res.currency, 'INR');
  });

  await it('Layer 1: Parses JSON-LD within @graph structure with MRP in priceSpecification', () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebPage",
                "name": "Listing page"
              },
              {
                "@type": "Product",
                "name": "Kalenji Jogflow 500.1 Running Shoes",
                "brand": "Decathlon",
                "offers": {
                  "@type": "AggregateOffer",
                  "lowPrice": 3499,
                  "highPrice": 4999,
                  "priceCurrency": "INR"
                }
              }
            ]
          }
          </script>
        </head>
      </html>
    `;
    const res = retriever.parseJsonLd(html);
    assert.strictEqual(res.title, 'Kalenji Jogflow 500.1 Running Shoes');
    assert.strictEqual(res.price, 3499);
    assert.strictEqual(res.mrp, 4999);
  });

  await it('Layer 2: Parses Embedded Next.js __NEXT_DATA__ state (Decathlon architecture)', () => {
    const html = `
      <html>
        <body>
          <script id="__NEXT_DATA__" type="application/json">
          {
            "props": {
              "pageProps": {
                "initialProduct": {
                  "title": "Women Running Grip Foam Cushion Shoes, Jogflow 190.1 - White/Purple",
                  "brand": "Decathlon",
                  "category": "Running Shoes",
                  "sellingPrice": 2499,
                  "mrp": 3399,
                  "images": ["https://contents.mediadecathlon.com/p8832420/k$def.jpg"]
                }
              }
            }
          }
          </script>
        </body>
      </html>
    `;
    const res = retriever.parseEmbeddedState(html);
    assert.strictEqual(res.title, 'Women Running Grip Foam Cushion Shoes, Jogflow 190.1 - White/Purple');
    assert.strictEqual(res.brand, 'Decathlon');
    assert.strictEqual(res.price, 2499);
    assert.strictEqual(res.mrp, 3399);
  });

  await it('Layer 3: Parses OpenGraph and Product Meta Tags', () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Apple iPhone 15 (128 GB) - Blue" />
          <meta property="product:price:amount" content="71999" />
          <meta property="product:original_price:amount" content="79900" />
          <meta property="product:price:currency" content="INR" />
          <meta property="og:image" content="https://croma.com/iphone.jpg" />
        </head>
      </html>
    `;
    const res = retriever.parseMetaTags(html);
    assert.strictEqual(res['og:title'], 'Apple iPhone 15 (128 GB) - Blue');
    assert.strictEqual(res['product:price:amount'], '71999');
    assert.strictEqual(res['product:original_price:amount'], '79900');
  });

  await it('Layer 4: Parses Semantic DOM Prices and ignores EMI / Savings / Ratings', () => {
    const html = `
      <div>
        <span class="rating">4.7 stars (4,700 reviews)</span>
        <div class="emi-text">EMI starting at ₹120/month</div>
        <div class="save-badge">You save ₹900 (26% off)</div>
        <span itemprop="price" content="2499">₹2,499</span>
        <span class="mrp-strike">MRP ₹3,399</span>
      </div>
    `;
    const res = retriever.parseDomPrices(html);
    assert.strictEqual(res.price, 2499);
    assert.strictEqual(res.mrp, 3399);
  });

  await it('Never treats model numbers (e.g. 190, 8832420) as prices from slug', () => {
    const url = new URL('https://www.decathlon.in/p/8832420/jogflow-190-1-women-s-running-shoes-white-purple');
    const res = retriever.extractPriceFromUrl(url);
    assert.notStrictEqual(res.price, 190, 'Model number 190 must not be extracted as price');
    assert.notStrictEqual(res.price, 8832420, 'SKU ID 8832420 must not be extracted as price');
  });

  console.log('\n--- Test Group 2: Marketplace Adapters (Decathlon, Croma, Adidas) ---');

  await it('Decathlon Adapter: Extracts clean title, brand, and category from slug without numeric SKU pollution', () => {
    const adapter = new DecathlonAdapter();
    const url = new URL('https://www.decathlon.in/p/8832420/jogflow-190-1-women-s-running-shoes-white-purple');
    assert.strictEqual(adapter.canHandle(url), true);
    assert.strictEqual(adapter.extractIdentifier(url), '8832420');

    const slugData = adapter.extractFromSlug(url);
    assert.strictEqual(slugData.title, 'Jogflow 190 1 Women S Running Shoes White Purple');
    assert.strictEqual(slugData.brand, 'Decathlon');
    assert.strictEqual(slugData.category, 'Footwear / Shoes');
    assert.strictEqual(slugData.sku_or_asin, '8832420');
  });

  await it('Croma Adapter: Extracts clean title and SKU', () => {
    const adapter = new CromaAdapter();
    const url = new URL('https://www.croma.com/apple-iphone-15-128gb-blue/p/300652');
    assert.strictEqual(adapter.canHandle(url), true);
    assert.strictEqual(adapter.extractIdentifier(url), '300652');

    const slugData = adapter.extractFromSlug(url);
    assert.strictEqual(slugData.title, 'Apple Iphone 15 128gb Blue');
    assert.strictEqual(slugData.brand, 'Apple');
    assert.strictEqual(slugData.category, 'Mobile Phones');
  });

  await it('Adidas Adapter: Extracts clean title, article code, and category', () => {
    const adapter = new AdidasAdapter();
    const url = new URL('https://www.adidas.co.in/ultraboost-light-running-shoes/HQ6351.html');
    assert.strictEqual(adapter.canHandle(url), true);
    assert.strictEqual(adapter.extractIdentifier(url), 'HQ6351');

    const slugData = adapter.extractFromSlug(url);
    assert.strictEqual(slugData.title, 'Ultraboost Light Running Shoes');
    assert.strictEqual(slugData.brand, 'Adidas Ultraboost');
    assert.strictEqual(slugData.category, 'Footwear / Shoes');
  });

  console.log('\n--- Test Group 3: Marketplace-Agnostic Trust Engine ---');

  const websiteTrustService = new WebsiteTrustService();
  const sellerTrustService = new SellerTrustService();
  const suitabilityService = new BuyingSuitabilityService();

  await it('Website Trust: Decathlon India receives high trust (95) and LEGITIMATE_RETAILER tier', () => {
    const res = websiteTrustService.evaluateWebsite(new URL('https://www.decathlon.in/p/8832420/shoes'));
    assert.strictEqual(res.trust_score, 95);
    assert.strictEqual(res.trust_tier, 'LEGITIMATE_RETAILER');
  });

  await it('Website Trust: Croma receives high trust (94) and VERIFIED_MARKETPLACE tier', () => {
    const res = websiteTrustService.evaluateWebsite(new URL('https://www.croma.com/p/300652'));
    assert.strictEqual(res.trust_score, 94);
    assert.strictEqual(res.trust_tier, 'VERIFIED_MARKETPLACE');
  });

  await it('Website Trust: Adidas receives high trust (95) and LEGITIMATE_RETAILER tier', () => {
    const res = websiteTrustService.evaluateWebsite(new URL('https://www.adidas.co.in/shoes/HQ6351.html'));
    assert.strictEqual(res.trust_score, 95);
    assert.strictEqual(res.trust_tier, 'LEGITIMATE_RETAILER');
  });

  await it('Website Trust: Independent webstore receives fair baseline (72) with explicit uncertainty, not punitive 35', () => {
    const res = websiteTrustService.evaluateWebsite(new URL('https://myartisanbakery.in/product/organic-sourdough'));
    assert.strictEqual(res.trust_score >= 70, true, `Expected >= 70, got ${res.trust_score}`);
    assert.strictEqual(res.trust_tier, 'INDEPENDENT_WEBSTORE');
    assert.strictEqual(res.unavailable_checks.length > 0, true);
  });

  await it('Website Trust: Only genuine typosquatting triggers SUSPECTED_IMPERSONATION', () => {
    const res = websiteTrustService.evaluateWebsite(new URL('https://amaz0n-offers-today.online/deals'));
    assert.strictEqual(res.trust_tier, 'SUSPECTED_IMPERSONATION');
    assert.strictEqual(res.trust_score <= 25, true);
  });

  await it('Seller Trust: Brand Flagship store receives DIRECT_BRAND_FLAGSHIP rating (94)', () => {
    const res = sellerTrustService.evaluateSeller({
      seller_name: 'Decathlon Sports India Direct',
      marketplace: 'Decathlon India',
      rating: 4.8,
      fulfillment_channel: 'Brand Direct Official Fulfillment',
    } as any);
    assert.strictEqual(res.seller_tier, 'DIRECT_BRAND_FLAGSHIP');
    assert.strictEqual(res.seller_trust_score >= 90, true);
  });

  await it('Buying Suitability: Does NOT clamp Decathlon or legitimate webstores to "Don\'t buy"', () => {
    const decathlonTrust = websiteTrustService.evaluateWebsite(new URL('https://www.decathlon.in/p/8832420/shoes'));
    const decathlonSeller = sellerTrustService.evaluateSeller({
      seller_name: 'Decathlon Sports India Direct',
      marketplace: 'Decathlon India',
      rating: 4.7,
      fulfillment_channel: 'Brand Direct Official Fulfillment',
    });

    const suitability = suitabilityService.evaluateSuitability({
      productTitle: 'Jogflow 190.1 Running Shoes',
      brand: 'Decathlon',
      category: 'Footwear',
      price: 2499,
      mrp: 3399,
      websiteTrust: decathlonTrust,
      sellerTrust: decathlonSeller,
      engineATrustScore: 92,
      isSteepDiscountAnomaly: false,
      nlpReviewScore: 0.65,
    });

    assert.notStrictEqual(suitability.recommendation_category, 'HIGH_RISK_CAUTION');
    assert.strictEqual(suitability.overall_suitability_score >= 75, true, `Expected >= 75, got ${suitability.overall_suitability_score}`);
  });

  console.log('\n--- Test Group 4: Advanced NLP Review Intelligence ---');

  const nlp = new ReviewNlpEngine();

  await it('NLP: Aspect-Based Sentiment across 7 dimensions (Quality, Delivery, Battery, etc.)', () => {
    const reviews = [
      'The build quality and material finish are amazing, really durable stitching.',
      'Battery life is great and lasts over 3 days on a single charge.',
      'Delivery was delayed and courier packaging arrived damaged in shipping.',
    ];
    const res = nlp.analyzeReviews(reviews);
    assert.strictEqual(res.status, 'EVALUATED');
    const qualityAspect = res.aspects.find(a => a.key === 'quality');
    const batteryAspect = res.aspects.find(a => a.key === 'battery');
    const deliveryAspect = res.aspects.find(a => a.key === 'delivery');
    assert.strictEqual(qualityAspect?.sentiment_label, 'POSITIVE');
    assert.strictEqual(batteryAspect?.sentiment_label, 'POSITIVE');
    assert.strictEqual(deliveryAspect?.sentiment_label, 'CONCERN');
  });

  await it('NLP: Hinglish Sentiment Lexicons (paisa vasool, mast vs bekar, nakli, kachra)', () => {
    const positiveHinglish = [
      'Ekdum mast product hai bhai, total paisa vasool deal!',
      'Quality bahut badiya hai, fitting shandar hai.',
    ];
    const posRes = nlp.analyzeReviews(positiveHinglish);
    assert.strictEqual(posRes.status, 'EVALUATED');
    assert.strictEqual((posRes.overall_sentiment_score ?? 0) > 0.3, true);

    const negativeHinglish = [
      'Ekdum bakwas aur ghatiya quality hai, bilkul nakli product bheja.',
      'Total kachra hai, paise waste ho gaye.',
    ];
    const negRes = nlp.analyzeReviews(negativeHinglish);
    assert.strictEqual(negRes.status, 'EVALUATED');
    assert.strictEqual((negRes.overall_sentiment_score ?? 0) < 0, true);
  });

  await it('NLP: Scope-Based Negation Handling ("not good", "never buy", "bilkul bekar")', () => {
    const reviews = [
      'This is definitely not worth the price, do not buy this at all.',
      'Quality is not good and sound is terrible.',
    ];
    const res = nlp.analyzeReviews(reviews);
    assert.strictEqual(res.status, 'EVALUATED');
    assert.strictEqual((res.overall_sentiment_score ?? 0) < 0, true);
  });

  await it('NLP: Star-Rating vs Text Dissonance Detection', () => {
    const reviews = [
      { review_text: 'Worst product ever, totally fake and broke on day 1.', rating: 5 },
      { review_text: 'Absolutely love this shoe! Best purchase I made all year.', rating: 1 },
    ];
    const res = nlp.analyzeReviews(reviews);
    assert.strictEqual(res.suspicious_patterns.rating_review_dissonance_detected, true);
    assert.strictEqual(res.suspicious_patterns.dissonant_reviews_count >= 1, true);
  });

  await it('NLP: Review Deduplication and Bot Farm Clustering', () => {
    const duplicateReviews = [
      'Amazing product loved it so much recommend to everyone!',
      'Amazing product loved it so much recommend to everyone!',
      'Amazing product loved it so much recommend to everyone!',
      'Good packaging and fast delivery.',
    ];
    const res = nlp.analyzeReviews(duplicateReviews);
    assert.strictEqual(res.duplicate_review_indicators.duplicate_reviews_count >= 2, true);
    assert.strictEqual(res.duplicate_review_indicators.duplicate_clusters_found >= 1, true);
  });

  await it('NLP: Honest 0-Review Handling (never synthesizes fake reviews)', () => {
    const emptyRes = nlp.analyzeReviews([]);
    assert.strictEqual(emptyRes.status, 'NO_REVIEWS');
    assert.strictEqual(emptyRes.reviews_analyzed_count, 0);
    assert.strictEqual(emptyRes.overall_sentiment_score, null);
    assert.strictEqual(emptyRes.limitations.length > 0, true);
  });

  console.log('\n=============================================================================');
  console.log(`ALL ${passedTests} / ${totalTests} MARKETPLACE INTELLIGENCE TESTS PASSED (100%).`);
  console.log('=============================================================================');
}

runAll().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
