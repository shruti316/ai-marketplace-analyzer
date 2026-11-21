import { hfGradioClient } from '../src/modules/trust/hf_gradio.client';
import { queryOne, closeApplicationPool } from '../src/config/database';

async function runTrustAssessmentTest() {
  console.log('=============================================================================');
  console.log('STARTING E2E TRUST ASSESSMENT AUDIT (v1.0 & v1.1)');
  console.log('=============================================================================');

  const testProductId = 'amazon_in_B000052YQN';

  // 1. Model v1.0 (Primary Champion)
  console.log(`[1/2] Testing Model v1.0 (Primary Champion) for product ${testProductId}...`);
  const startV10 = Date.now();
  const resV10 = await hfGradioClient.assessMarketplaceTrust(testProductId, 'v1.0');
  console.log(`Model v1.0 executed in ${Date.now() - startV10}ms:`);
  console.log(`  Source                : ${resV10.source}`);
  console.log(`  Model Version         : ${resV10.model_version}`);
  console.log(`  Predicted Risk Tier   : ${resV10.predicted_risk_tier}`);
  console.log(`  Calibrated Score      : ${resV10.calibrated_anomaly_score}`);
  console.log(`  Confidence Interval   : ${resV10.confidence_interval} [${resV10.ci_lower}, ${resV10.ci_upper}]`);
  console.log(`  Active Modalities     : ${resV10.active_modalities_count}`);
  console.log(`  Contributions         : ${JSON.stringify(resV10.modality_contributions)}`);
  console.log(`  Zero-Penalty Applied  : ${resV10.zero_penalty_invariant_applied}`);

  // 2. Model v1.1 (Vision Challenger)
  console.log(`\n[2/2] Testing Model v1.1 (Vision Challenger) for product ${testProductId}...`);
  const startV11 = Date.now();
  const resV11 = await hfGradioClient.assessMarketplaceTrust(testProductId, 'v1.1');
  console.log(`Model v1.1 executed in ${Date.now() - startV11}ms:`);
  console.log(`  Source                : ${resV11.source}`);
  console.log(`  Model Version         : ${resV11.model_version}`);
  console.log(`  Predicted Risk Tier   : ${resV11.predicted_risk_tier}`);
  console.log(`  Calibrated Score      : ${resV11.calibrated_anomaly_score}`);
  console.log(`  Confidence Interval   : ${resV11.confidence_interval} [${resV11.ci_lower}, ${resV11.ci_upper}]`);
  console.log(`  Active Modalities     : ${resV11.active_modalities_count}`);
  console.log(`  Contributions         : ${JSON.stringify(resV11.modality_contributions)}`);
  console.log(`  Zero-Penalty Applied  : ${resV11.zero_penalty_invariant_applied}`);

  // 3. TiDB Database Verification
  console.log('\n[3/3] Querying TiDB Cloud database to verify investigations schema compatibility...');
  const tableCheck = await queryOne<any>(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'investigations'"
  );
  console.log(`  TiDB investigations table present: ${Boolean(tableCheck)}`);

  console.log('=============================================================================');
  console.log('E2E TRUST ASSESSMENT AUDIT COMPLETED.');
  console.log('=============================================================================');
}

runTrustAssessmentTest()
  .then(async () => {
    await closeApplicationPool();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('[FATAL TRUST ASSESSMENT ERROR]', err);
    await closeApplicationPool();
    process.exit(1);
  });
