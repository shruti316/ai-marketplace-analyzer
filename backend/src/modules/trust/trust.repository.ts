import { RowDataPacket } from 'mysql2/promise';
import { queryOne } from '../../config/database';

export interface TrustAssessmentRow extends RowDataPacket {
  id: string;
  canonical_product_id: string;
  model_version: string;
  predicted_risk_tier: string;
  continuous_anomaly_score: number;
  calibrated_anomaly_score: number;
  ci_lower: number;
  ci_upper: number;
  active_modalities_count: number;
  has_pricing_modality: number | boolean;
  has_review_modality: number | boolean;
  has_image_modality: number | boolean;
  has_clip_modality: number | boolean;
  has_graph_modality: number | boolean;
  zero_penalty_invariant_applied: number | boolean;
  multi_task_review_risk: number;
  multi_task_image_risk: number;
  multi_task_price_risk: number;
  multi_task_discordance_risk: number;
  modality_contributions_json: unknown;
  recommendation_summary: string;
  raw_response_json: unknown;
  assessed_at: string;
}

export class TrustRepository {
  /**
   * Retrieves the most recent historical trust assessment snapshot from MySQL.
   */
  async findLatestByProductId(productId: string): Promise<TrustAssessmentRow | null> {
    const sql = `
      SELECT *
      FROM trust_assessments
      WHERE canonical_product_id = ?
      ORDER BY assessed_at DESC
      LIMIT 1
    `;
    return queryOne<TrustAssessmentRow>(sql, [productId]);
  }
}

export const trustRepository = new TrustRepository();
