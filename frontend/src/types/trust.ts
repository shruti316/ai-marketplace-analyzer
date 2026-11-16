/**
 * Trust Engine Data Types & Schemas
 * Corresponds to Python trust_engine.contracts and Express backend trust API contracts.
 */

export type RiskTier =
  | 'LOW_OBSERVED_ANOMALY'
  | 'MODERATE_SINGLE_MODALITY_ANOMALY'
  | 'ELEVATED_MULTIMODAL_ANOMALY'
  | 'UNASSESSED_SPARSE_DATA';

export type ModalityStatus =
  | 'OBSERVED'
  | 'UNAVAILABLE'
  | 'PROCESSING_FAILED'
  | 'NOT_APPLICABLE';

export type EvidenceModality =
  | 'REVIEW_NLP'
  | 'IMAGE_CV'
  | 'PRICING'
  | 'SELLER_GOVERNANCE'
  | 'GRAPH_TOPOLOGY'
  | 'OCR';

export type EvidenceNature =
  | 'OBSERVED_EVIDENCE'
  | 'HEURISTIC_SIGNAL'
  | 'MODEL_PREDICTION';

export interface VisualEvidenceDetail {
  canonical_product_id: string;
  visual_asset_id: string;
  duplicate_category: string;
  clip_cosine_similarity?: number | null;
  clip_category_zscore?: number | null;
  is_category_discordant: boolean;
  is_white_background: boolean;
  blur_score: number;
  contrast_std: number;
  is_suitable_for_inference: boolean;
  shared_product_ids: string[];
  sanitized_image_ref: string;
  explanation: string;
}

export interface UnifiedEvidenceItem {
  evidence_id: string;
  entity_id: string;
  canonical_product_id: string;
  listing_id?: string | null;
  evidence_modality: EvidenceModality;
  evidence_type: string;
  evidence_nature: EvidenceNature;
  observed_value: string;
  signal_severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH';
  detection_method: string;
  confidence: number;
  uncertainty_note: string;
  provenance: string;
  timestamp?: string | null;
  modality_available: boolean;
  evidence_limitations: string;
  evidence_event_id?: string | null;
  correlation_group_id?: string | null;
  related_product_ids?: string[];
  source_reference?: string | null;
  modality_status: ModalityStatus;
}

export interface ModalityAssessment {
  modality: EvidenceModality;
  status: string;
  has_anomaly: boolean;
  anomaly_type?: string | null;
  summary_text: string;
  evidence_count: number;
  corroborating_evidence_ids?: string[];
  limitations?: string;
  modality_status: ModalityStatus;
  status_reason?: string;
}

export interface ProductTrustAssessment {
  canonical_product_id: string;
  marketplace: string;
  brand: string;
  category: string;
  subcategory: string;
  overall_risk_tier: RiskTier;
  available_core_modalities_count: number;
  active_anomaly_modality_count: number;
  modality_breakdown: Record<string, ModalityAssessment>;
  positive_evidence: string[];
  negative_evidence: string[];
  missing_modalities: string[];
  assessment_limitations: string[];
  recommendation_summary: string;
  assessment_framework?: string;
  correlated_findings?: Array<Record<string, unknown>>;
  independent_corroboration_count?: number;
  visual_evidence_detail?: VisualEvidenceDetail | null;
}

export interface LearnedMultimodalAssessment {
  canonical_product_id: string;
  model_version: string;
  predicted_risk_tier: RiskTier;
  continuous_anomaly_score: number;
  calibrated_anomaly_score: number;
  confidence_interval?: {
    lower: number;
    upper: number;
  };
  active_modalities_count: number;
  modalities_active: {
    pricing: boolean;
    review: boolean;
    image: boolean;
    clip: boolean;
    graph: boolean;
  };
  zero_penalty_invariant_applied: boolean;
  multitask_risks?: {
    review_risk?: number;
    image_risk?: number;
    price_risk?: number;
    discordance_risk?: number;
  };
  modality_contributions?: Record<string, number>;
  recommendation_summary?: string;
  assessed_at?: string;
}

export interface TrustAssessmentResponse {
  source: 'LIVE_PYTHON_ENGINE' | 'MYSQL_SNAPSHOT' | 'MYSQL_FALLBACK_SNAPSHOT';
  warning?: string;
  assessment: ProductTrustAssessment | LearnedMultimodalAssessment;
}

export interface EvidenceListResponse {
  canonical_product_id: string;
  evidence_count: number;
  evidence: UnifiedEvidenceItem[];
}

export interface ReportResponse {
  format?: 'json' | 'markdown';
  report_markdown?: string;
  [key: string]: unknown;
}

export interface PlatformHealth {
  status: 'healthy' | 'degraded' | 'disconnected';
  service: string;
  version: string;
  uptimeSeconds: number;
  database: {
    status: 'connected' | 'disconnected';
    latencyMs?: number;
  };
}

// Backwards compatibility alias
export interface TrustAssessment {
  productId: string;
  compositeRiskScore: number;
  riskTier: RiskTier;
  confidence: number;
  modalityScores: {
    reviewNlp?: number;
    imageCv?: number;
    pricingAnomaly?: number;
    sellerGovernance?: number;
    networkTopology?: number;
    packagingOcr?: number;
  };
  primaryFlaggedModalities: string[];
  assessedAt: string;
  isHistoricalBaseline?: boolean;
}
