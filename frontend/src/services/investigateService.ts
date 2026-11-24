import { apiClient } from './apiClient';
import { ApiResponse } from '../types/catalog';

export interface StructuredAspectItem {
  key: string;
  display_name: string;
  sentiment_score: number | null;
  satisfaction_pct: number | null;
  mention_count: number;
  positive_mentions: number;
  negative_mentions: number;
  sentiment_label: string;
  defect_risk_level: string;
  status: 'EVALUATED' | 'NO_DATA';
  top_complaints: string[];
  top_praises: string[];
}

export interface RadarSignalItem {
  modality: string;
  listing_score: number | null;
  genuine_benchmark: number;
  status: 'EVALUATED' | 'NOT_PROVIDED' | 'NOT_EVALUATED' | 'PROCESSING_FAILED';
}

export interface ModalityCoverageItem {
  name: string;
  status: 'EVALUATED' | 'NOT_PROVIDED' | 'NOT_EVALUATED' | 'PROCESSING_FAILED';
  note: string;
}

export interface WebsiteTrustAssessment {
  domain: string;
  is_https: boolean;
  trust_tier: string;
  trust_score: number;
  organization_identity: string;
  registered_entity: string;
  grievance_officer_available: boolean;
  return_policy_status: string;
  payment_security_indicator: string;
  supporting_evidence: string[];
  concerning_signals: string[];
  unavailable_checks: string[];
  explanation: string;
}

export interface ExactMarketplaceOffer {
  marketplace: string;
  seller_name: string;
  price_inr: number;
  mrp_inr: number;
  discount_percent: number;
  listing_url: string;
  in_stock: boolean;
  is_cheapest: boolean;
  retrieval_provenance: string;
  retrieval_timestamp: string;
}

export interface CompetingProductAlternative {
  product_id: string;
  title: string;
  brand: string;
  category: string;
  product_type?: string;
  hierarchy_level?: string;
  hierarchy_label?: string;
  observed_price_inr: number;
  mrp_inr: number;
  marketplace: string;
  trust_score_estimate: number;
  key_advantage: string;
  trade_off: string;
  retrieval_provenance: string;
}

export type RiskLevel = 'MINIMAL_RISK' | 'MODERATE_RISK' | 'HIGH_OBSERVED_RISK' | 'CRITICAL_RISK';

export interface DimensionEvaluation {
  dimension_key: 'product_quality' | 'seller_reliability' | 'listing_authenticity' | 'website_legitimacy';
  dimension_name: string;
  score: number | null;
  status: 'ASSESSED' | 'UNASSESSED';
  risk_level: RiskLevel;
  confidence: number;
  summary: string;
  positive_signals: string[];
  risk_factors: string[];
  missing_data: string[];
}

export interface ModalityContribution {
  key: 'pricing' | 'seller' | 'reviews' | 'vision' | 'ocr' | 'platform';
  title: string;
  modality_name: string;
  status: 'EVALUATED' | 'NOT_PROVIDED' | 'UNASSESSED';
  raw_score: number | null;
  delta: number;
  max_pts: number;
  status_label: string;
  description: string;
}

export interface ScoreBreakdown {
  baseline: number;
  contributions: ModalityContribution[];
  subtotal_before_caps: number;
  boundary_clamp_adjustment?: number;
  non_masking_applied: boolean;
  non_masking_penalty: number;
  sparse_evidence_applied: boolean;
  sparse_evidence_penalty: number;
  final_trust_score: number;
  mathematical_identity_verified: boolean;
}

export interface FiveDimensionTrustResult {
  overall_trust_score: number;
  overall_risk_level: RiskLevel;
  recommendation: 'PROCEED_CONFIDENTLY' | 'PROCEED_WITH_CAUTION' | 'INVESTIGATE_FURTHER' | 'DO_NOT_RECOMMEND' | 'INSUFFICIENT_EVIDENCE';
  recommendation_rationale: string;
  non_masking_applied: boolean;
  non_masking_reason?: string;
  dimensions: {
    product_quality: DimensionEvaluation;
    seller_reliability: DimensionEvaluation;
    listing_authenticity: DimensionEvaluation;
    website_legitimacy: DimensionEvaluation;
  };
  score_breakdown?: ScoreBreakdown;
  evidence: {
    coverage_percent: number;
    confidence_score: number;
    supporting_evidence: string[];
    contradicting_evidence: string[];
    missing_evidence: string[];
  };
}

export interface ProductIntelligenceReport {
  investigation_id: string;
  timestamp: string;
  summary: {
    title: string;
    brand: string;
    category: string;
    marketplace: string;
    overall_risk_tier: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    overall_trust_score: number;
    buying_suitability_score: number;
    suitability_category: string;
    verdict_headline: string;
    provenance: string;
  };
  five_dimension_trust?: FiveDimensionTrustResult;
  section_1_overview: {
    title: string;
    brand: string;
    category: string;
    sku_identifier: string;
    marketplace: string;
    listing_url: string;
    observed_price_inr: number | null;
    claimed_mrp_inr: number | null;
    discount_percentage: number | null;
    effective_offer_price_inr?: number | null;
    reference_market_price?: any | null;
    price_evidence?: any[];
    primary_image_url: string | null;
    specifications: Record<string, string>;
    retrieval_timestamp: string;
    provenance: string;
    status_note: string;
  };
  section_2_website_trust: WebsiteTrustAssessment;
  section_3_seller_trust: {
    seller_name: string | null;
    seller_tier: string;
    seller_trust_score: number;
    risk_tier: string;
    fulfillment_channel: string | null;
    fulfillment_risk: string;
    rating_summary: {
      average_rating: number | null;
      total_ratings_estimate: string;
      is_rating_satisfactory: boolean;
    };
    pricing_integrity: {
      is_steep_discount_anomaly: boolean;
      discount_percentage: number | null;
      observed_price_inr: number | null;
      claimed_mrp_inr: number | null;
      category_corridor_status: string;
      anomaly_explanation: string;
    };
    supporting_evidence: string[];
    concerning_signals: string[];
    explanation: string;
  };
  section_4_multimodal_evidence: {
    risk_tier: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    trust_score: number;
    confidence_score: number;
    zero_penalty_invariant_applied: boolean;
    radar_signals: RadarSignalItem[];
    modality_coverage: ModalityCoverageItem[];
    defect_matrix: Array<{
      title: string;
      severity: string;
      description: string;
    }>;
  };
  section_5_review_intelligence: {
    overall_sentiment_score: number | null;
    satisfaction_index: number | null;
    aspects: StructuredAspectItem[];
    rating_review_dissonance_detected: boolean;
    positive_themes: string[];
    negative_themes: string[];
    complaints: string[];
    published_review_count?: number | null;
    retrieved_review_count?: number;
    reviews_analyzed_count: number;
    sentiment_distribution?: {
      positive_percentage: number;
      neutral_percentage: number;
      negative_percentage: number;
      mixed_percentage: number;
    };
    sample_reviews: Array<{
      rating?: number;
      review_text: string;
      sentiment?: string;
    }>;
    status: 'EVALUATED' | 'NO_REVIEWS';
  };
  section_6_visual_packaging: {
    evaluation_state: 'NOT_PROVIDED' | 'NOT_EVALUATED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    image_uploaded: boolean;
    resolution_tier: string;
    dimensions: string;
    laplacian_blur_score: number | null;
    is_sharp: boolean | null;
    quality_status: string;
    white_background_detected: boolean | null;
    packaging_ocr: {
      compliance_status: string;
      detected_text: string | null;
      detected_mrp: string | null;
      net_quantity: string | null;
      batch_code: string | null;
    };
    zero_shot_vision: {
      status: string;
      predicted_category: string | null;
      category_confidence: number | null;
      predicted_brand: string | null;
      brand_confidence: number | null;
      title_consistency_match: boolean | null;
    };
    modality_status_note: string;
  };
  section_7_price_comparison: {
    price_corridor_analysis: {
      listing_price: number;
      claimed_mrp: number;
      corridor_min: number;
      corridor_median: number;
      corridor_max: number;
      fake_threshold: number;
      is_anomalous: boolean;
      status: 'MULTIPLE_VERIFIED_OFFERS' | 'SINGLE_OFFER_ONLY';
    };
    exact_offers: ExactMarketplaceOffer[];
    cheapest_offer?: ExactMarketplaceOffer;
    price_dispersion_inr: number;
    data_provenance_note: string;
  };
  section_8_competing_products: {
    status: 'ALTERNATIVES_FOUND' | 'NO_ALTERNATIVES_FOUND';
    alternatives: CompetingProductAlternative[];
    comparison_summary: string;
    search_context: {
      category_searched: string;
      normalized_categories: string[];
      price_min_inr: number;
      price_max_inr: number;
      sources_checked: string;
      total_candidates_found: number;
      explanation: string;
    };
  };
  section_9_buying_recommendation: {
    overall_suitability_score: number;
    recommendation_tier: string;
    verdict_title: string;
    summary_reasoning: string;
    dimension_scores: {
      specification_match: number;
      review_quality_and_satisfaction: number;
      price_competitiveness: number;
      feature_to_price_value: number;
    };
    reasons_to_consider: string[];
    reasons_for_caution: string[];
    explicit_trust_warning: string | null;
    doorstep_verification_checklist: string[];
  };
  report_html: string;
}

export interface PipelineInvestigationPayload {
  url?: string;
  image_base64?: string;
  product_title?: string;
  brand?: string;
  category?: string;
  observed_price_inr?: number;
  mrp_inr?: number;
  marketplace?: string;
  seller_name?: string;
  fulfillment_type?: string;
  specifications?: Record<string, string>;
  reviews?: string[];
}

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

export interface InvestigationRecord {
  id: string;
  user_id: string | null;
  input_type: 'URL' | 'IMAGE' | 'ADHOC' | 'CATALOG';
  title: string;
  marketplace: string | null;
  listing_url: string | null;
  extracted_identifier: string | null;
  canonical_product_id: string | null;
  overall_risk_tier: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  overall_risk_score: number;
  verdict_summary: string | null;
  assessment_snapshot: Record<string, any>;
  evidence_citations?: any | null;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  created_at: string;
  updated_at: string;
}

export interface PaginatedInvestigations {
  items: InvestigationRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SaveInvestigationPayload {
  id?: string;
  input_type: 'URL' | 'IMAGE' | 'ADHOC' | 'CATALOG';
  title: string;
  marketplace?: string | null;
  listing_url?: string | null;
  extracted_identifier?: string | null;
  canonical_product_id?: string | null;
  overall_risk_tier: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  overall_risk_score: number;
  verdict_summary?: string | null;
  assessment_snapshot: Record<string, any>;
  evidence_citations?: any;
  status?: 'PENDING' | 'COMPLETED' | 'FAILED';
}

export const investigateService = {
  /**
   * Runs the automated end-to-end multimodal 9-section shopping intelligence pipeline.
   */
  async runPipeline(payload: PipelineInvestigationPayload): Promise<ProductIntelligenceReport> {
    const response = await apiClient.post<{ status: string; data: ProductIntelligenceReport }>(
      '/api/v1/investigate/pipeline',
      payload
    );
    return response.data.data;
  },

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

  /**
   * Persists an investigation snapshot to user's history in MySQL.
   */
  async saveInvestigation(payload: SaveInvestigationPayload): Promise<InvestigationRecord> {
    const response = await apiClient.post<{ success: boolean; data: InvestigationRecord }>(
      '/api/v1/investigations',
      payload
    );
    return response.data.data;
  },

  /**
   * Retrieves paginated list of user's past investigations.
   */
  async getInvestigations(params?: {
    page?: number;
    limit?: number;
    risk_tier?: string;
    input_type?: string;
    search?: string;
  }): Promise<PaginatedInvestigations> {
    const response = await apiClient.get<PaginatedInvestigations & { success: boolean }>(
      '/api/v1/investigations',
      { params }
    );
    return {
      items: response.data.items,
      total: response.data.total,
      page: response.data.page,
      limit: response.data.limit,
      totalPages: response.data.totalPages,
    };
  },

  /**
   * Retrieves full snapshot of a specific historical investigation.
   */
  async getInvestigationById(id: string): Promise<InvestigationRecord> {
    const response = await apiClient.get<{ success: boolean; data: InvestigationRecord }>(
      `/api/v1/investigations/${id}`
    );
    return response.data.data;
  },

  /**
   * Deletes a saved investigation record.
   */
  async deleteInvestigation(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/investigations/${id}`);
  },
};
