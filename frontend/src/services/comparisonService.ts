import { apiClient } from './apiClient';
import { ApiResponse } from '../types/catalog';

export interface ComparisonItem {
  id: string;
  comparison_id: string;
  canonical_product_id: string;
  product_title?: string;
  brand_name?: string;
  platform_name?: string;
  category?: string;
  observed_price_inr: number | null;
  predicted_risk_tier: string;
  continuous_anomaly_score: number | null;
  created_at: string;
}

export interface ComparisonRecord {
  id: string;
  user_id: string;
  title: string;
  product_count: number;
  price_dispersion_inr: number | null;
  max_risk_tier: string;
  created_at: string;
  updated_at: string;
  items?: ComparisonItem[];
}

export interface CreateComparisonPayload {
  title?: string;
  canonical_product_ids: string[];
}

export const comparisonService = {
  /**
   * Generates a new cross-platform product comparison matrix.
   */
  async createComparison(payload: CreateComparisonPayload): Promise<ComparisonRecord> {
    const response = await apiClient.post<ApiResponse<ComparisonRecord>>('/api/v1/comparisons', payload);
    return response.data.data;
  },

  /**
   * Retrieves saved comparisons for the current user.
   */
  async getComparisons(page = 1, limit = 10): Promise<{ items: ComparisonRecord[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
    const response = await apiClient.get<ApiResponse<{ items: ComparisonRecord[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>>(
      '/api/v1/comparisons',
      { params: { page, limit } }
    );
    return response.data.data;
  },

  /**
   * Retrieves full comparison record with all compared product items.
   */
  async getComparisonById(id: string): Promise<ComparisonRecord> {
    const response = await apiClient.get<ApiResponse<ComparisonRecord>>(`/api/v1/comparisons/${id}`);
    return response.data.data;
  },

  /**
   * Deletes a comparison record.
   */
  async deleteComparison(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/comparisons/${id}`);
  },
};
