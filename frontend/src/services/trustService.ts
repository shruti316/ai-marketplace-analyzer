import { apiClient } from './apiClient';
import {
  TrustAssessmentResponse,
  EvidenceListResponse,
  ReportResponse,
  LearnedMultimodalAssessment,
} from '../types/trust';
import { ApiResponse } from '../types/catalog';

export const trustService = {
  /**
   * Retrieves product trust assessment (calls Python live engine with MySQL fallback).
   */
  async getProductTrustAssessment(productId: string, preferCached = false): Promise<TrustAssessmentResponse> {
    const response = await apiClient.get<ApiResponse<TrustAssessmentResponse>>(
      `/api/v1/products/${productId}/trust-assessment`,
      {
        params: preferCached ? { prefer_cached: 'true' } : {},
      }
    );
    return response.data.data;
  },

  /**
   * Retrieves learned multimodal model inference (v1.0 or v1.1).
   */
  async getProductLearnedMultimodal(productId: string, version = 'v1.0'): Promise<LearnedMultimodalAssessment> {
    const response = await apiClient.get<ApiResponse<LearnedMultimodalAssessment>>(
      `/api/v1/products/${productId}/learned-multimodal`,
      {
        params: { version },
      }
    );
    return response.data.data;
  },

  /**
   * Retrieves atomic multimodal evidence indicators for a canonical product.
   */
  async getProductEvidence(productId: string): Promise<EvidenceListResponse> {
    const response = await apiClient.get<ApiResponse<EvidenceListResponse>>(
      `/api/v1/products/${productId}/evidence`
    );
    return response.data.data;
  },

  /**
   * Generates explainable audit report in JSON or Markdown format.
   */
  async getProductReport(productId: string, format: 'json' | 'markdown' = 'json'): Promise<ReportResponse> {
    const response = await apiClient.get<ApiResponse<ReportResponse>>(
      `/api/v1/products/${productId}/report`,
      {
        params: { format },
      }
    );
    return response.data.data;
  },

  /**
   * Retrieves modality ablation studies for the frozen models.
   */
  async getModalityAblations(version = 'v1.0'): Promise<unknown> {
    const response = await apiClient.get<ApiResponse<unknown>>('/api/v1/ablations', {
      params: { version },
    });
    return response.data.data;
  },

  /**
   * Creates a cross-marketplace product comparison.
   */
  async createComparison(name: string, canonicalProductIds: string[]): Promise<unknown> {
    const response = await apiClient.post<ApiResponse<unknown>>('/api/v1/comparisons', {
      name,
      canonical_product_ids: canonicalProductIds,
    });
    return response.data.data;
  },

  /**
   * Retrieves saved user comparisons.
   */
  async getComparisons(page = 1, limit = 10): Promise<unknown> {
    const response = await apiClient.get<ApiResponse<unknown>>('/api/v1/comparisons', {
      params: { page, limit },
    });
    return response.data.data;
  },
};
