import fs from 'node:fs';
import path from 'node:path';
import { investigationOrchestrator, OrchestratorInput } from '../src/modules/investigate/investigation_orchestrator';
import { closeApplicationPool } from '../src/config/database';

async function runFullIntegrationTrace() {
  console.log('=============================================================================');
  console.log('TRUSTSPHERE FULL INTEGRATION PIPELINE TRACE');
  console.log('Trace: URL → Extraction → Reviews → NLP → CV → Fusion → Trust Score → Report');
  console.log('=============================================================================');

  // Load a real product image from disk
  const sampleImagePath = path.resolve(__dirname, '../../data/indian_marketplace/raw/images/amazon_in/B000052YQN.jpg');
  let sampleImageBase64: string | undefined = undefined;
  if (fs.existsSync(sampleImagePath)) {
    sampleImageBase64 = fs.readFileSync(sampleImagePath).toString('base64');
    console.log(`Loaded real packaging image (${sampleImageBase64.length} base64 chars).`);
  }

  const input: OrchestratorInput = {
    url: 'https://www.sonatawatches.in/product/sonata-poze-quartz-analog-green-dial-metal-strap-watch-for-women-sp8005lkm03w.html',
    image_base64: sampleImageBase64,
    reviews: [
      { review_text: 'The green dial looks stunning and the brass case finishing is very classy. Absolutely genuine Titan product.', rating: 5 },
      { review_text: 'Mesh metal strap fits comfortably on the wrist and clasp is sturdy.', rating: 5 },
      { review_text: 'Timekeeping is accurate quartz movement, accurate to the second.', rating: 5 }
    ] as any,
  };

  const startTime = Date.now();
  console.log('\n[STAGE 1] Initiating pipeline with URL:', input.url);

  try {
    const report = await investigationOrchestrator.orchestrate(input);
    const totalDuration = Date.now() - startTime;

    console.log('\n=============================================================================');
    console.log('GENUINE PIPELINE EXECUTION AUDIT TRACE');
    console.log('=============================================================================');
    console.log(`Total Pipeline Execution Time: ${totalDuration}ms`);
    console.log(`Investigation ID:             ${report.investigation_id}`);
    
    console.log('\n--- STAGE 2: URL & Marketplace Adapter Extraction ---');
    console.log(`Platform Identified:          ${report.section_1_overview.marketplace}`);
    console.log(`Product Title:                ${report.section_1_overview.title}`);
    console.log(`Brand:                        ${report.section_1_overview.brand}`);
    console.log(`Category:                     ${report.section_1_overview.category}`);
    console.log(`Observed Price INR:           ₹${report.section_1_overview.observed_price_inr ?? 'N/A'}`);
    console.log(`Claimed MRP INR:              ₹${report.section_1_overview.claimed_mrp_inr ?? 'N/A'}`);

    console.log('\n--- STAGE 3: Seller & Website Legitimacy Assessment ---');
    console.log(`Domain:                       ${report.section_2_website_trust?.domain}`);
    console.log(`TLS Encryption:               ${report.section_2_website_trust?.is_https ? 'TLS 1.3 / HTTPS Active' : 'Insecure'}`);
    console.log(`Domain Trust Tier:            ${report.section_2_website_trust?.trust_tier} (${report.section_2_website_trust?.trust_score}/100)`);
    console.log(`Merchant Name:                ${report.section_3_seller_trust.seller_name}`);
    console.log(`Merchant Governance Tier:     ${report.section_3_seller_trust.seller_tier}`);
    console.log(`Seller Trust Score:           ${report.section_3_seller_trust.seller_trust_score}/100`);

    console.log('\n--- STAGE 4: NLP Aspect-Based Sentiment Analysis (ABSA) ---');
    console.log(`Reviews Analyzed Count:       ${report.section_5_review_intelligence.reviews_analyzed_count}`);
    console.log(`Overall Sentiment Score:      ${report.section_5_review_intelligence.overall_sentiment_score}`);
    console.log(`Satisfaction Index:           ${report.section_5_review_intelligence.satisfaction_index}%`);
    console.log(`Evaluated Aspects:`);
    report.section_5_review_intelligence.aspects.forEach(a => {
      if (a.status === 'EVALUATED') {
        console.log(`  • ${a.display_name}: Score ${a.sentiment_score} (${a.satisfaction_pct}%) [${a.sentiment_label}]`);
      }
    });

    console.log('\n--- STAGE 5: Computer Vision & Packaging OCR ---');
    console.log(`Evaluation State:             ${report.section_6_visual_packaging.evaluation_state}`);
    console.log(`Image Uploaded:               ${report.section_6_visual_packaging.image_uploaded}`);
    console.log(`Resolution Tier:              ${report.section_6_visual_packaging.resolution_tier}`);
    console.log(`Laplacian Blur Score:         ${report.section_6_visual_packaging.laplacian_blur_score}`);
    console.log(`Quality Status:               ${report.section_6_visual_packaging.quality_status}`);
    console.log(`Packaging OCR Status:         ${report.section_6_visual_packaging.packaging_ocr?.compliance_status}`);

    console.log('\n--- STAGE 6: Decoupled 5-Dimension Trust Score Synthesis ---');
    console.log(`Overall Trust Score:          ${report.summary.overall_trust_score}/100`);
    console.log(`Overall Risk Tier:            ${report.summary.overall_risk_tier}`);
    console.log(`Verdict Headline:             ${report.summary.verdict_headline}`);
    console.log(`Confidence Score:             ${report.five_dimension_trust.evidence.confidence_score}`);
    console.log(`Mathematical Breakdown:`);
    console.log(`  Baseline:                   ${report.five_dimension_trust.score_breakdown.baseline}`);
    console.log(`  Modalities:`);
    report.five_dimension_trust.score_breakdown.contributions.forEach(c => {
      console.log(`    - ${c.title.padEnd(28)}: ${c.delta > 0 ? `+${c.delta}` : c.delta} pts (${c.status_label})`);
    });
    console.log(`  Subtotal:                   ${report.five_dimension_trust.score_breakdown.subtotal_before_caps}`);
    console.log(`  Sparse Evidence Penalty:    ${report.five_dimension_trust.score_breakdown.sparse_evidence_penalty}`);
    console.log(`  Final Score:                ${report.five_dimension_trust.score_breakdown.final_trust_score}`);
    console.log(`  Identity Verified:          ${report.five_dimension_trust.score_breakdown.mathematical_identity_verified}`);

    console.log('\n--- STAGE 7: Buying Recommendation ---');
    console.log(`Recommendation Tier:          ${report.section_9_buying_recommendation.recommendation_tier}`);
    console.log(`Suitability Score:            ${report.section_9_buying_recommendation.overall_suitability_score}/100`);
    console.log(`Checklist Steps:              ${report.section_9_buying_recommendation.doorstep_verification_checklist.length} verification steps`);

    console.log('\n=============================================================================');
    console.log('✅ FULL INTEGRATION PIPELINE COMPLETED SUCCESSFULLY.');
    console.log('=============================================================================');
  } catch (err: any) {
    console.error('❌ Integration pipeline error:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  } finally {
    await closeApplicationPool();
  }
}

runFullIntegrationTrace();
