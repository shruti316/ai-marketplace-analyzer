import { apiClient } from './apiClient';
import { ApiResponse } from '../types/catalog';

export interface UrlResolutionResult {
  catalogue_match: boolean;
  is_live_scraped: boolean;
  recognized_platform: string | null;
  extracted_identifier: string | null;
  canonical_product_id?: string;
  product?: {
    canonical_product_id: string;
    title: string;
    brand_id: string;
    category: string;
    platform_id: string;
    platform_name: string;
    observed_price_inr: number | null;
    mrp_inr: number | null;
    listing_url: string;
  };
  links?: {
    trust_assessment: string;
    evidence: string;
    report: string;
  };
  message?: string;
}

export interface ImageQualityFindings {
  blur_score: number;
  mean_brightness: number;
  contrast_std: number;
  resolution_tier: string;
  quality_status: string;
  is_suitable_for_inference: boolean;
  is_white_background: boolean;
  transparency_detected: boolean;
}

export interface ImageOcrFindings {
  engine_status: string;
  detected_text: string;
  word_count: number;
  extracted_mrp: number | null;
  extracted_net_quantity: string | null;
  extracted_batch_code: string | null;
  brand_alignment_status: string;
  brand_confidence: number;
  words: Array<{ text: string; confidence?: number }>;
}

export interface ImageInspectionResult {
  request_id: string;
  processing_status: 'SUCCESS' | 'DEGRADED_OCR_UNAVAILABLE' | string;
  image_metadata: {
    format: string;
    width: number;
    height: number;
    aspect_ratio: number;
    channels: number;
    size_bytes: number;
  };
  quality_findings: ImageQualityFindings;
  ocr_findings: ImageOcrFindings;
  evidence_records: Array<{
    evidence_id: string;
    evidence_type: string;
    modality: string;
    status: string;
    claim: string;
    metrics: Record<string, unknown>;
    is_anomaly: boolean;
  }>;
  warnings: string[];
  processing_metadata: {
    latency_ms: number;
    cv_engine_version: string;
    timestamp: number;
  };
}

export interface AdhocInferenceResult {
  product_title: string;
  available_modalities_count: number;
  overall_risk_tier: string;
  flags: string[];
  zero_penalty_invariant_applied: boolean;
  timestamp: number;
}

export interface AssistantChatResult {
  request_id: string;
  query: string;
  canonical_product_id?: string;
  message: {
    role: 'assistant' | 'user';
    content: string;
  };
  evidence_citations: string[];
  grounded_context: {
    canonical_product_id?: string;
    overall_risk_tier: string;
    core_modalities_count: number;
    negative_evidence_count: number;
    positive_evidence_count: number;
    is_grounded: boolean;
  };
  provider_info: {
    provider: string;
    model: string;
    status: string;
  };
  timestamp: number;
}

export const investigateService = {
  /**
   * Evaluates and parses marketplace URL with SSRF defense and catalog resolution.
   */
  async resolveMarketplaceUrl(url: string): Promise<UrlResolutionResult> {
    const response = await apiClient.post<ApiResponse<UrlResolutionResult>>(
      '/api/v1/investigate/url',
      { url }
    );
    return response.data.data;
  },

  /**
   * Forwards image to Python CV and OCR engine for packaging inspection.
   */
  async inspectImage(
    imageBase64: string,
    canonicalBrand?: string,
    productTitle?: string
  ): Promise<ImageInspectionResult> {
    const response = await apiClient.post<ApiResponse<ImageInspectionResult>>(
      '/api/v1/investigate/image',
      {
        image_base64: imageBase64,
        canonical_brand: canonicalBrand,
        product_title: productTitle,
      }
    );
    return response.data.data;
  },

  /**
   * Evaluates ad-hoc product details through the Python ML inference engine.
   */
  async inferAdhoc(data: {
    product_title: string;
    observed_price_inr?: number;
    mrp_inr?: number;
    brand?: string;
    category?: string;
  }): Promise<AdhocInferenceResult> {
    const response = await apiClient.post<ApiResponse<AdhocInferenceResult>>(
      '/api/v1/investigate/adhoc',
      data
    );
    return response.data.data;
  },

  /**
   * Queries the grounded conversational AI assistant with product context.
   */
  async chatAssistant(
    query: string,
    canonicalProductId?: string,
    conversationHistory?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  ): Promise<AssistantChatResult> {
    const response = await apiClient.post<ApiResponse<AssistantChatResult>>(
      '/api/v1/assistant/chat',
      {
        query,
        canonical_product_id: canonicalProductId,
        conversation_history: conversationHistory,
      }
    );
    return response.data.data;
  },
};
