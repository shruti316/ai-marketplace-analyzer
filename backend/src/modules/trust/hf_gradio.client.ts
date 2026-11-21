import { Client } from '@gradio/client';
import { getEnv } from '../../config/env';
import { AppError, ServiceUnavailableError } from '../../middleware/errorHandler';

export interface HfImageInspectionResult {
  request_id: string;
  source: 'LIVE_HUGGINGFACE_ZEROGPU' | 'FALLBACK_HEURISTIC';
  processing_status: 'COMPLETED' | 'PARTIAL' | 'FAILED';
  image_metadata: {
    width: number;
    height: number;
    aspect_ratio: number;
  };
  quality_findings: {
    resolution_tier: string;
    blur_score: number;
    is_white_background: boolean;
    contrast_std: number;
    mean_brightness: number;
  };
  ocr_findings: {
    detected_text: string | null;
    extracted_mrp: number | null;
    extracted_net_quantity: string | null;
    extracted_batch_code: string | null;
    compliance_status: string;
    brand_alignment_status: string;
    word_count: number;
  };
  zero_shot_findings: {
    detected_category: string | null;
    category_confidence: number | null;
    detected_brand_guess: string | null;
    brand_confidence: number | null;
    is_brand_confident: boolean;
    title_image_consistent: boolean;
    consistency_score: number | null;
    consistency_note: string | null;
  };
  clip_alignment: {
    cosine_similarity: number;
    visual_risk_tier: string;
    is_discordant: boolean;
    discrepancy_explanation: string | null;
  };
  zero_penalty_note: string;
}

export interface HfMarketplaceTrustResult {
  source: 'LIVE_HUGGINGFACE_ZEROGPU' | 'MYSQL_SNAPSHOT' | 'MYSQL_FALLBACK_SNAPSHOT';
  canonical_product_id: string;
  model_version: string;
  predicted_risk_tier: string;
  calibrated_anomaly_score: number;
  continuous_anomaly_score: number;
  ci_lower: number;
  ci_upper: number;
  confidence_interval: string;
  modality_contributions: Record<string, number>;
  zero_penalty_invariant_applied: boolean;
  active_modalities_count: number;
  recommendation_summary?: string | null;
  assessed_at: string;
}

export class HfGradioClient {
  private clientInstance: any = null;
  private connectingPromise: Promise<any> | null = null;
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly CIRCUIT_BREAKER_THRESHOLD = 3;
  private readonly CIRCUIT_BREAKER_RESET_MS = 30000; // 30 seconds

  /**
   * Acquires or reuses connected Gradio Client instance.
   */
  private async getClient(): Promise<any> {
    // Check circuit breaker
    const now = Date.now();
    if (this.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
      if (now - this.lastFailureTime < this.CIRCUIT_BREAKER_RESET_MS) {
        throw new ServiceUnavailableError(
          'Hugging Face ZeroGPU Space circuit breaker is OPEN due to repeated upstream failures. Serving verified fallback.',
          'HF_CIRCUIT_BREAKER_OPEN'
        );
      } else {
        // Half-open state: allow one attempt to recover
        this.failureCount = 0;
      }
    }

    if (this.clientInstance) {
      return this.clientInstance;
    }

    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    const env = getEnv();
    const spaceId = env.HF_SPACE_ID || '06Remontada06/trustphere-ml';
    const hfToken = env.HF_TOKEN || process.env.HF_TOKEN || undefined;

    this.connectingPromise = (async () => {
      try {
        console.log(`[HfGradioClient] Connecting to Space: ${spaceId}...`);
        const client = await Client.connect(spaceId, {
          token: hfToken as any,
          hf_token: hfToken as any
        });
        console.log(`[HfGradioClient] Connected successfully to Space: ${spaceId}`);
        this.clientInstance = client;
        this.failureCount = 0;
        return client;
      } catch (err: any) {
        console.warn(`[HfGradioClient] Connection failed to ${spaceId}:`, err.message);
        this.recordFailure();
        this.clientInstance = null;
        throw new ServiceUnavailableError(
          `Unable to connect to Hugging Face Space (${spaceId}): ${err.message}`,
          'HF_CONNECTION_FAILED'
        );
      } finally {
        this.connectingPromise = null;
      }
    })();

    return this.connectingPromise;
  }

  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
  }

  private recordSuccess(): void {
    this.failureCount = 0;
  }

  /**
   * Converts base64 image data string into a native binary Blob for @gradio/client.
   */
  public base64ToBlob(base64Str: string): Blob {
    let clean = base64Str.trim();
    let mimeType = 'image/png';
    const match = clean.match(/^data:([^;]+);base64,/);
    if (match) {
      mimeType = match[1];
      clean = clean.slice(match[0].length);
    }
    const buffer = Buffer.from(clean, 'base64');
    return new Blob([buffer], { type: mimeType });
  }

  /**
   * Health diagnostic check on live Hugging Face Space (/health).
   */
  async checkHealth(): Promise<Record<string, any>> {
    try {
      const client = await this.getClient();
      const res = await Promise.race([
        client.predict('/health'),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('HF Health check timeout')), 10000)
        )
      ]);
      this.recordSuccess();
      return (res as any).data?.[0] || {};
    } catch (err: any) {
      this.recordFailure();
      throw new ServiceUnavailableError(
        `Hugging Face ML health probe failed: ${err.message}`,
        'HF_HEALTH_FAILED'
      );
    }
  }

  /**
   * Marketplace Multimodal Trust Assessment via frozen GBDT gated models (/marketplace_trust_assessment).
   */
  async assessMarketplaceTrust(
    productId: string,
    version: 'v1.0' | 'v1.1' = 'v1.0'
  ): Promise<HfMarketplaceTrustResult> {
    const modelVersionParam = version === 'v1.1' ? 'v1.1 (Vision Challenger)' : 'v1.0 (Primary Champion)';

    try {
      const client = await this.getClient();
      const res: any = await Promise.race([
        client.predict('/marketplace_trust_assessment', {
          product_id: productId,
          model_version: modelVersionParam
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('HF Trust assessment timeout')), 25000)
        )
      ]);

      this.recordSuccess();
      const data = res.data;
      if (!Array.isArray(data) || data.length < 5) {
        throw new AppError('Unexpected response structure from HF Trust assessment endpoint', 502, 'HF_INVALID_RESPONSE');
      }

      const predictedRiskTierLabel = typeof data[0] === 'object' && data[0]?.label ? data[0].label : String(data[0] || 'UNASSESSED_SPARSE_DATA');
      const calibratedScore = typeof data[1] === 'number' ? data[1] : Number(data[1] || 0);
      const ciStr = typeof data[2] === 'string' ? data[2] : '[0.0000, 0.0000]';
      const contributions = (typeof data[3] === 'object' && data[3] !== null) ? data[3] : {};
      const fullEvidence = (typeof data[4] === 'object' && data[4] !== null) ? data[4] : {};

      // Parse CI bounds [lower, upper]
      const ciMatch = ciStr.match(/\[([0-9.]+),\s*([0-9.]+)\]/);
      const ciLower = ciMatch ? Number(ciMatch[1]) : 0.0;
      const ciUpper = ciMatch ? Number(ciMatch[2]) : 0.0;

      // Normalize Risk Tier enum
      let tierEnum = 'LOW_OBSERVED_ANOMALY';
      const tierUpper = predictedRiskTierLabel.toUpperCase();
      if (tierUpper.includes('ELEVATED')) tierEnum = 'ELEVATED_MULTIMODAL_ANOMALY';
      else if (tierUpper.includes('MODERATE')) tierEnum = 'MODERATE_SINGLE_MODALITY_ANOMALY';
      else if (tierUpper.includes('SPARSE') || tierUpper.includes('UNASSESSED')) tierEnum = 'UNASSESSED_SPARSE_DATA';

      return {
        source: 'LIVE_HUGGINGFACE_ZEROGPU',
        canonical_product_id: productId,
        model_version: fullEvidence.model_version || (version === 'v1.1' ? '1.1.0' : '2.0.0'),
        predicted_risk_tier: tierEnum,
        calibrated_anomaly_score: calibratedScore,
        continuous_anomaly_score: fullEvidence.continuous_anomaly_score ?? calibratedScore,
        ci_lower: ciLower,
        ci_upper: ciUpper,
        confidence_interval: ciStr,
        modality_contributions: contributions,
        zero_penalty_invariant_applied: fullEvidence.zero_penalty_invariant_applied ?? true,
        active_modalities_count: fullEvidence.active_modalities_count ?? Object.keys(contributions).length,
        recommendation_summary: fullEvidence.recommendation_summary || null,
        assessed_at: new Date().toISOString()
      };
    } catch (err: any) {
      this.recordFailure();
      throw err;
    }
  }

  /**
   * Dual Computer Vision & Packaging Inspection via ZeroGPU CLIP & OCR (/product_image_analysis & /ocr_analysis).
   * Note: NEVER automatically retries on GPU failure to preserve user ZeroGPU quota.
   */
  async inspectImage(
    imageBase64: string,
    title?: string,
    brand?: string,
    claimedMrp?: number
  ): Promise<HfImageInspectionResult> {
    const cleanTitle = (title || 'Product Inspection Item').slice(0, 300);
    const cleanBrand = (brand || 'Generic').slice(0, 100);
    const imageBlob = this.base64ToBlob(imageBase64);
    const client = await this.getClient();

    let visionData: any[] = [];
    let ocrData: any[] = [];

    try {
      // 1. ZeroGPU Product Image Analysis (Forward pass, timeout: 60s)
      console.log(`[HfGradioClient] [1/2] Initiating ZeroGPU CLIP visual forward pass (timeout: 60s) for "${cleanTitle}"...`);
      const vStart = Date.now();
      const visionRes: any = await Promise.race([
        client.predict('/product_image_analysis', {
          image: imageBlob,
          listing_title: cleanTitle,
          claimed_brand: cleanBrand,
          claimed_mrp: claimedMrp ? Number(claimedMrp) : 1499.0
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('ZeroGPU CLIP image inference timed out (60s limit)')), 60000)
        )
      ]);
      const vElapsed = Date.now() - vStart;
      console.log(`[HfGradioClient] [1/2] ZeroGPU vision forward pass completed in ${vElapsed}ms.`);
      visionData = visionRes.data || [];
    } catch (visionErr: any) {
      // Do NOT retry expensive GPU inference repeatedly
      this.recordFailure();
      console.warn('[HfGradioClient] ZeroGPU vision forward pass failed or timed out:', visionErr.message);
    }

    try {
      // 2. CPU Packaging OCR Analysis (Timeout: 20s)
      console.log(`[HfGradioClient] [2/2] Initiating CPU packaging OCR analysis (timeout: 20s)...`);
      const oStart = Date.now();
      const ocrRes: any = await Promise.race([
        client.predict('/ocr_analysis', {
          packaging_image: imageBlob,
          claimed_mrp: claimedMrp ? Number(claimedMrp) : 250.0,
          claimed_brand: cleanBrand
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Packaging OCR inference timed out (20s limit)')), 20000)
        )
      ]);
      const oElapsed = Date.now() - oStart;
      console.log(`[HfGradioClient] [2/2] CPU packaging OCR analysis completed in ${oElapsed}ms.`);
      ocrData = ocrRes.data || [];
      this.recordSuccess();
    } catch (ocrErr: any) {
      console.warn('[HfGradioClient] CPU packaging OCR inference failed:', ocrErr.message);
    }

    // Adapt Gradio Vision response
    const visualRiskTier = visionData[0]?.label || 'LOW';
    const clipSimilarity = typeof visionData[1] === 'number' ? visionData[1] : 0.0;
    const zeroShot = visionData[2] || {};
    const quality = visionData[3] || {};
    const forensic = visionData[4] || {};

    // Adapt Gradio OCR response
    const complianceLabel = ocrData[0]?.label || 'No Packaging Text (Zero-Penalty Rule)';
    const ocrIdentifiers = ocrData[1] || {};
    const rawOcrText = typeof ocrData[2] === 'string' ? ocrData[2] : null;
    const zeroPenaltyStatus = typeof ocrData[3] === 'string' ? ocrData[3] : 'ACTIVE (Zero-Penalty Rule Preserved)';

    const wordCount = rawOcrText ? rawOcrText.split(/\s+/).filter(Boolean).length : 0;

    return {
      request_id: `hf_insp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      source: 'LIVE_HUGGINGFACE_ZEROGPU',
      processing_status: (visionData.length > 0 || ocrData.length > 0) ? 'COMPLETED' : 'FAILED',
      image_metadata: {
        width: quality.width || 0,
        height: quality.height || 0,
        aspect_ratio: quality.aspect_ratio || 1.0
      },
      quality_findings: {
        resolution_tier: quality.resolution_tier || 'STANDARD',
        blur_score: quality.blur_score || 0,
        is_white_background: Boolean(quality.is_white_background),
        contrast_std: quality.contrast_std || 0,
        mean_brightness: quality.mean_brightness || 0
      },
      ocr_findings: {
        detected_text: rawOcrText,
        extracted_mrp: ocrIdentifiers.mrp_detected ?? null,
        extracted_net_quantity: ocrIdentifiers.net_quantity ?? null,
        extracted_batch_code: ocrIdentifiers.batch_code ?? null,
        compliance_status: complianceLabel,
        brand_alignment_status: ocrIdentifiers.brand_alignment_status || 'UNKNOWN',
        word_count: wordCount
      },
      zero_shot_findings: {
        detected_category: zeroShot.detected_category ?? null,
        category_confidence: zeroShot.category_confidence ?? null,
        detected_brand_guess: zeroShot.detected_brand ?? null,
        brand_confidence: zeroShot.brand_confidence ?? null,
        is_brand_confident: Boolean(zeroShot.is_brand_confident),
        title_image_consistent: Boolean(zeroShot.title_image_consistent ?? true),
        consistency_score: zeroShot.consistency_score ?? null,
        consistency_note: zeroShot.consistency_note ?? null
      },
      clip_alignment: {
        cosine_similarity: clipSimilarity,
        visual_risk_tier: visualRiskTier,
        is_discordant: Boolean(forensic.is_discordant),
        discrepancy_explanation: forensic.discrepancy_explanation ?? null
      },
      zero_penalty_note: zeroPenaltyStatus
    };
  }
}

export const hfGradioClient = new HfGradioClient();
