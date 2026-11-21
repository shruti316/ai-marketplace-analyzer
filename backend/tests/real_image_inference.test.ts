import fs from 'node:fs';
import path from 'node:path';
import { hfGradioClient } from '../src/modules/trust/hf_gradio.client';
import { closeApplicationPool } from '../src/config/database';

function log(msg: string) {
  const timestamp = new Date().toISOString().substring(11, 19);
  console.log(`[${timestamp}] ${msg}`);
}

async function runRealImageTest() {
  log('=============================================================================');
  log('STARTING REAL PRODUCT IMAGE INFERENCE AUDIT');
  log('=============================================================================');

  const imagePath = path.resolve(__dirname, '../../data/indian_marketplace/raw/images/amazon_in/B000052YQN.jpg');
  log(`Checking for target image at: ${imagePath}`);

  if (!fs.existsSync(imagePath)) {
    throw new Error(`Target image not found at ${imagePath}`);
  }

  const fileBytes = fs.readFileSync(imagePath);
  log(`Read ${fileBytes.length} bytes from image file.`);
  const base64Data = fileBytes.toString('base64');
  log(`Base64 encoded string length: ${base64Data.length} characters.`);

  // 1. Health Probe
  log('Step 1: Probing Hugging Face Space health (/health)...');
  const healthStart = Date.now();
  const health = await hfGradioClient.checkHealth();
  log(`Space Health: ${health.status} (ZeroGPU Active: ${health.zerogpu_active}) in ${Date.now() - healthStart}ms.`);

  // 2. Dual Inspection
  log('Step 2: Submitting real product image for dual CLIP and OCR inspection...');
  const inspectStart = Date.now();
  const result = await hfGradioClient.inspectImage(
    base64Data,
    'boAt Rockerz 450 Bluetooth On Ear Headphones with Mic',
    'boAt',
    1499.0
  );
  const totalInspectTime = Date.now() - inspectStart;
  log(`Inspection completed in ${totalInspectTime}ms.`);

  log('=============================================================================');
  log('REAL IMAGE INFERENCE REPORT');
  log('=============================================================================');
  log(`Processing Status      : ${result.processing_status}`);
  log(`Source                 : ${result.source}`);
  log(`Request ID             : ${result.request_id}`);
  log(`Image Dimensions       : ${result.image_metadata.width}x${result.image_metadata.height} (Aspect: ${result.image_metadata.aspect_ratio})`);
  log(`Quality Tier           : ${result.quality_findings.resolution_tier} (Blur score: ${result.quality_findings.blur_score})`);
  log(`CLIP Visual Risk Tier  : ${result.clip_alignment.visual_risk_tier}`);
  log(`CLIP Cosine Similarity : ${result.clip_alignment.cosine_similarity}`);
  log(`Discordant Signal      : ${result.clip_alignment.is_discordant}`);
  log(`OCR Word Count         : ${result.ocr_findings.word_count}`);
  log(`OCR Detected Text      : ${result.ocr_findings.detected_text ? JSON.stringify(result.ocr_findings.detected_text) : 'None'}`);
  log(`Compliance Status      : ${result.ocr_findings.compliance_status}`);
  log(`Zero-Penalty Status    : ${result.zero_penalty_note}`);
  log('=============================================================================');
  log('REAL PRODUCT IMAGE INFERENCE AUDIT COMPLETED SUCCESSFULLY.');
  log('=============================================================================');
}

runRealImageTest()
  .then(async () => {
    await closeApplicationPool();
    process.exit(0);
  })
  .catch(async (err) => {
    log(`[FATAL INFERENCE ERROR]: ${err.message}`);
    if (err.stack) console.error(err.stack);
    await closeApplicationPool();
    process.exit(1);
  });
