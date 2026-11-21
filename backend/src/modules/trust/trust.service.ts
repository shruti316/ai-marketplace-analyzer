import { trustClient } from './trust.client';
import { hfGradioClient } from './hf_gradio.client';
import { trustRepository, TrustAssessmentRow } from './trust.repository';
import { catalogRepository } from '../catalog/catalog.repository';
import { NotFoundError, ServiceUnavailableError } from '../../middleware/errorHandler';

export class TrustService {
  /**
   * Retrieves product trust assessment.
   * Prioritizes live Hugging Face Gradio ML service with fallback to live Python engine and MySQL historical snapshot.
   */
  async getProductTrustAssessment(productId: string, preferCached = false): Promise<unknown> {
    const product = await catalogRepository.findProductById(productId);

    if (preferCached && product) {
      const cached = await trustRepository.findLatestByProductId(productId);
      if (cached) {
        return {
          source: 'MYSQL_SNAPSHOT',
          assessment: this.formatDbAssessment(cached)
        };
      }
    }

    // 1. Attempt Live Hugging Face ZeroGPU Gradio ML Service
    try {
      const hfResult = await hfGradioClient.assessMarketplaceTrust(productId, 'v1.0');
      return {
        source: 'LIVE_HUGGINGFACE_ZEROGPU',
        assessment: hfResult
      };
    } catch (hfErr) {
      // Gracefully continue to secondary engine or database fallback
    }

    if (!product) {
      throw new NotFoundError(`Product not found with ID "${productId}"`, 'PRODUCT_NOT_FOUND');
    }

    // 2. Secondary: Live Internal Python Engine
    try {
      const liveResult = await trustClient.assessProduct(productId);
      return {
        source: 'LIVE_PYTHON_ENGINE',
        assessment: liveResult
      };
    } catch (err) {
      // 3. Tertiary: Graceful fallback to MySQL snapshot
      const cached = await trustRepository.findLatestByProductId(productId);
      if (cached) {
        return {
          source: 'MYSQL_FALLBACK_SNAPSHOT',
          warning: 'Live inference engines currently unreachable; serving verified historical assessment snapshot.',
          assessment: this.formatDbAssessment(cached)
        };
      }
      throw err;
    }
  }

  /**
   * Evaluates product using frozen learned multimodal model (v1.0 or v1.1).
   * Invariant: Elevates policy anomaly classification, not confirmed fraud.
   */
  async getProductLearnedMultimodal(productId: string, version: 'v1.0' | 'v1.1' = 'v1.0'): Promise<unknown> {
    const product = await catalogRepository.findProductById(productId);

    // 1. Attempt Live Hugging Face ZeroGPU Gradio ML Service
    try {
      const hfResult = await hfGradioClient.assessMarketplaceTrust(productId, version);
      return {
        source: 'LIVE_HUGGINGFACE_ZEROGPU',
        assessment: hfResult
      };
    } catch (hfErr) {
      // Gracefully continue to secondary engine or database fallback
    }

    if (!product) {
      throw new NotFoundError(`Product not found with ID "${productId}"`, 'PRODUCT_NOT_FOUND');
    }

    // 2. Secondary: Internal Python Engine
    try {
      return await trustClient.assessProductLearnedMultimodal(productId, version);
    } catch (err) {
      // 3. Tertiary: MySQL Historical Snapshot Fallback
      const cached = await trustRepository.findLatestByProductId(productId);
      if (cached) {
        return {
          source: 'MYSQL_FALLBACK_SNAPSHOT',
          warning: 'Live multimodal inference engines currently unreachable; serving verified historical assessment snapshot.',
          assessment: this.formatDbAssessment(cached)
        };
      }
      throw err;
    }
  }

  /**
   * Retrieves atomic multimodal evidence indicators for a canonical product.
   * Invariant: OCR remains an evidence-only engine, not a fusion modality.
   */
  async getProductEvidence(productId: string): Promise<unknown> {
    const product = await catalogRepository.findProductById(productId);
    if (!product) {
      throw new NotFoundError(`Product not found with ID "${productId}"`, 'PRODUCT_NOT_FOUND');
    }

    return trustClient.getProductEvidence(productId);
  }

  /**
   * Generates explainable trust intelligence report in JSON or Markdown.
   */
  async getProductReport(productId: string, format = 'json'): Promise<unknown> {
    const product = await catalogRepository.findProductById(productId);
    if (!product) {
      throw new NotFoundError(`Product not found with ID "${productId}"`, 'PRODUCT_NOT_FOUND');
    }

    return trustClient.getProductReport(productId, format);
  }

  /**
   * Evaluates seller governance and merchant resolution risk.
   */
  async getSellerTrustAssessment(sellerId: string): Promise<unknown> {
    const seller = await catalogRepository.findSellerById(sellerId);
    if (!seller) {
      throw new NotFoundError(`Seller not found with ID "${sellerId}"`, 'SELLER_NOT_FOUND');
    }

    return trustClient.assessSeller(sellerId);
  }

  /**
   * Evaluates marketplace listing offer anomaly.
   */
  async getListingTrustAssessment(listingId: string): Promise<unknown> {
    const listing = await catalogRepository.findListingById(listingId);
    if (!listing) {
      throw new NotFoundError(`Marketplace listing not found with ID "${listingId}"`, 'LISTING_NOT_FOUND');
    }

    return trustClient.assessListing(listingId);
  }

  /**
   * Retrieves modality ablation evaluation metrics for frozen models.
   */
  async getModalityAblations(version = 'v1.0'): Promise<unknown> {
    return trustClient.getModalityAblations(version);
  }

  /**
   * Formats a raw database row into an API-friendly response structure.
   */
  private formatDbAssessment(row: TrustAssessmentRow) {
    return {
      id: row.id,
      canonical_product_id: row.canonical_product_id,
      model_version: row.model_version,
      predicted_risk_tier: row.predicted_risk_tier,
      continuous_anomaly_score: Number(row.continuous_anomaly_score),
      calibrated_anomaly_score: Number(row.calibrated_anomaly_score),
      confidence_interval: {
        lower: Number(row.ci_lower),
        upper: Number(row.ci_upper)
      },
      active_modalities_count: row.active_modalities_count,
      modalities_active: {
        pricing: Boolean(row.has_pricing_modality),
        review: Boolean(row.has_review_modality),
        image: Boolean(row.has_image_modality),
        clip: Boolean(row.has_clip_modality),
        graph: Boolean(row.has_graph_modality)
      },
      zero_penalty_invariant_applied: Boolean(row.zero_penalty_invariant_applied),
      multitask_risks: {
        review_risk: Number(row.multi_task_review_risk),
        image_risk: Number(row.multi_task_image_risk),
        price_risk: Number(row.multi_task_price_risk),
        discordance_risk: Number(row.multi_task_discordance_risk)
      },
      modality_contributions: typeof row.modality_contributions_json === 'string'
        ? JSON.parse(row.modality_contributions_json)
        : row.modality_contributions_json,
      recommendation_summary: row.recommendation_summary,
      assessed_at: row.assessed_at
    };
  }
}

export const trustService = new TrustService();
