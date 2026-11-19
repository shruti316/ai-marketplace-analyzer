import { apiClient } from './apiClient';

export interface ComparisonItem {
  id: string | number;
  comparison_id: string;
  canonical_product_id: string;
  product_title?: string;
  brand_name?: string;
  platform_name?: string;
  category?: string;
  subcategory?: string;
  observed_price_inr: number | null;
  mrp_inr?: number | null;
  predicted_risk_tier: string;
  continuous_anomaly_score: number | null;
  active_modalities_count?: number;
  seller_display_name?: string;
  seller_rating?: number | null;
  extracted_attributes_json?: Record<string, any>;
  has_image?: number | boolean;
  has_review?: number | boolean;
  has_price?: number | boolean;
  is_recommended?: boolean | number;
  tradeoff_notes?: string | null;
  display_order?: number;
  evidence_density_rank?: number;
  risk_rank?: number;
  created_at?: string;
}

export interface ComparisonRecord {
  id: string;
  user_id: string | null;
  title?: string;
  comparison_title?: string;
  product_count?: number;
  price_dispersion_inr: number | null;
  max_risk_tier: string;
  recommended_product_id?: string | null;
  recommendation_rationale?: string | null;
  created_at: string;
  updated_at?: string;
  items?: ComparisonItem[];
}

export interface CreateComparisonPayload {
  title?: string;
  canonical_product_ids: string[];
  custom_products?: Array<{
    canonical_product_id: string;
    product_title?: string;
    brand?: string;
    category?: string;
    observed_price_inr?: number;
    mrp_inr?: number;
    marketplace?: string;
    main_image_url?: string;
  }>;
}

export const comparisonService = {
  /**
   * Generates a new cross-platform product comparison matrix.
   */
  async createComparison(payload: CreateComparisonPayload): Promise<ComparisonRecord> {
    const response = await apiClient.post<any>('/api/v1/comparisons', payload);
    const data = response.data?.data;
    return (data?.comparison || data) as ComparisonRecord;
  },

  /**
   * Retrieves saved comparisons for the current user.
   */
  async getComparisons(page = 1, limit = 10): Promise<{ items: ComparisonRecord[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
    const response = await apiClient.get<any>(
      '/api/v1/comparisons',
      { params: { page, limit } }
    );
    const data = response.data?.data;
    return data;
  },

  /**
   * Retrieves full comparison record with all compared product items.
   */
  async getComparisonById(id: string): Promise<ComparisonRecord> {
    const response = await apiClient.get<any>(`/api/v1/comparisons/${id}`);
    const data = response.data?.data;
    return (data?.comparison || data) as ComparisonRecord;
  },

  /**
   * Deletes a comparison record.
   */
  async deleteComparison(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/comparisons/${id}`);
  },
};
