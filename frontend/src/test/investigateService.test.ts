import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../services/apiClient';
import { investigateService } from '../services/investigateService';

describe('investigateService API Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('resolveMarketplaceUrl posts to /api/v1/investigate/url with expected payload', async () => {
    const mockResponse = {
      data: {
        status: 'success',
        data: {
          catalogue_match: true,
          is_live_scraped: false,
          recognized_platform: 'Amazon India',
          extracted_identifier: 'B000052YQN',
          canonical_product_id: 'amazon_in_B000052YQN',
          product: {
            canonical_product_id: 'amazon_in_B000052YQN',
            title: 'Test Earphone',
            brand_id: 'boAt',
            category: 'Electronics',
            platform_id: 'amazon_india',
            platform_name: 'Amazon India',
            observed_price_inr: 1299,
            mrp_inr: 2999,
            listing_url: 'https://www.amazon.in/dp/B000052YQN',
          },
        },
      },
    };

    const spy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce(mockResponse);

    const result = await investigateService.resolveMarketplaceUrl('https://www.amazon.in/dp/B000052YQN');

    expect(spy).toHaveBeenCalledWith('/api/v1/investigate/url', {
      url: 'https://www.amazon.in/dp/B000052YQN',
    });
    expect(result.catalogue_match).toBe(true);
    expect(result.extracted_identifier).toBe('B000052YQN');
  });

  it('inspectImage posts to /api/v1/investigate/image with base64 payload', async () => {
    const mockResponse = {
      data: {
        status: 'success',
        data: {
          request_id: 'req_123',
          processing_status: 'SUCCESS',
          image_metadata: {
            format: 'JPEG',
            width: 800,
            height: 800,
            aspect_ratio: 1.0,
            channels: 3,
            size_bytes: 45000,
          },
          quality_findings: {
            blur_score: 310.5,
            mean_brightness: 195.0,
            contrast_std: 48.0,
            resolution_tier: 'HIGH',
            quality_status: 'PASS',
            is_suitable_for_inference: true,
            is_white_background: true,
            transparency_detected: false,
          },
          ocr_findings: {
            engine_status: 'ACTIVE',
            detected_text: 'MRP Rs. 2499',
            word_count: 3,
            extracted_mrp: 2499,
            extracted_net_quantity: '1 Unit',
            extracted_batch_code: 'BATCH-2026',
            brand_alignment_status: 'MATCHED',
            brand_confidence: 0.95,
            words: [],
          },
          evidence_records: [],
          warnings: [],
          processing_metadata: {
            latency_ms: 45,
            cv_engine_version: '1.7.0',
            timestamp: Date.now(),
          },
        },
      },
    };

    const spy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce(mockResponse);

    const result = await investigateService.inspectImage('data:image/jpeg;base64,abc123==', 'boAt', 'Headphones');

    expect(spy).toHaveBeenCalledWith('/api/v1/investigate/image', {
      image_base64: 'data:image/jpeg;base64,abc123==',
      canonical_brand: 'boAt',
      product_title: 'Headphones',
    });
    expect(result.quality_findings.blur_score).toBe(310.5);
    expect(result.ocr_findings.extracted_mrp).toBe(2499);
  });

  it('inferAdhoc posts to /api/v1/investigate/adhoc and returns honest sparse data tier', async () => {
    const mockResponse = {
      data: {
        status: 'success',
        data: {
          product_title: 'Adhoc Earphones',
          available_modalities_count: 1,
          overall_risk_tier: 'UNASSESSED_SPARSE_DATA',
          flags: ['SPARSE_PRODUCT_DATA'],
          zero_penalty_invariant_applied: true,
          timestamp: Date.now(),
        },
      },
    };

    const spy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce(mockResponse);

    const result = await investigateService.inferAdhoc({
      product_title: 'Adhoc Earphones',
      observed_price_inr: 899,
      mrp_inr: 1999,
    });

    expect(spy).toHaveBeenCalledWith('/api/v1/investigate/adhoc', {
      product_title: 'Adhoc Earphones',
      observed_price_inr: 899,
      mrp_inr: 1999,
    });
    expect(result.overall_risk_tier).toBe('UNASSESSED_SPARSE_DATA');
    expect(result.zero_penalty_invariant_applied).toBe(true);
  });

  it('chatAssistant posts to /api/v1/assistant/chat with grounded context', async () => {
    const mockResponse = {
      data: {
        status: 'success',
        data: {
          request_id: 'chat_999',
          query: 'Why is this product assigned this tier?',
          canonical_product_id: 'myntra_8987003_L',
          message: {
            role: 'assistant',
            content: 'This product exhibits consistent pricing corridors and zero critical anomalies.',
          },
          evidence_citations: ['EVID_PRICING_001', 'EVID_VISION_002'],
          grounded_context: {
            canonical_product_id: 'myntra_8987003_L',
            overall_risk_tier: 'LOW_OBSERVED_ANOMALY',
            core_modalities_count: 5,
            negative_evidence_count: 0,
            positive_evidence_count: 4,
            is_grounded: true,
          },
          provider_info: {
            provider: 'DETERMINISTIC_EVIDENCE_ENGINE',
            model: 'evidence-grounded-v1.7',
            status: 'HEALTHY',
          },
          timestamp: Date.now(),
        },
      },
    };

    const spy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce(mockResponse);

    const result = await investigateService.chatAssistant(
      'Why is this product assigned this tier?',
      'myntra_8987003_L',
      [{ role: 'user', content: 'Hello' }]
    );

    expect(spy).toHaveBeenCalledWith('/api/v1/assistant/chat', {
      query: 'Why is this product assigned this tier?',
      canonical_product_id: 'myntra_8987003_L',
      conversation_history: [{ role: 'user', content: 'Hello' }],
    });
    expect(result.message.content).toContain('consistent pricing corridors');
    expect(result.evidence_citations.length).toBe(2);
    expect(result.provider_info.provider).toBe('DETERMINISTIC_EVIDENCE_ENGINE');
  });
});
