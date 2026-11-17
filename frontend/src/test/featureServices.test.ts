import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../services/apiClient';
import { comparisonService } from '../services/comparisonService';
import { annotationService } from '../services/annotationService';

describe('Feature Services (Comparisons & Annotations)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('comparisonService.createComparison posts to /api/v1/comparisons', async () => {
    const mockRecord = {
      id: 'comp_123',
      user_id: 'usr_abc',
      title: 'Headphones Comparison',
      product_count: 2,
      price_dispersion_inr: 450,
      max_risk_tier: 'LOW_OBSERVED_ANOMALY',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: [],
    };

    const spy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: { status: 'success', data: mockRecord },
    });

    const result = await comparisonService.createComparison({
      title: 'Headphones Comparison',
      canonical_product_ids: ['prod_1', 'prod_2'],
    });

    expect(spy).toHaveBeenCalledWith('/api/v1/comparisons', {
      title: 'Headphones Comparison',
      canonical_product_ids: ['prod_1', 'prod_2'],
    });
    expect(result.id).toBe('comp_123');
    expect(result.product_count).toBe(2);
  });

  it('comparisonService.getComparisons calls GET /api/v1/comparisons with page and limit', async () => {
    const mockList = {
      items: [],
      pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
    };

    const spy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: { status: 'success', data: mockList },
    });

    const result = await comparisonService.getComparisons(1, 10);
    expect(spy).toHaveBeenCalledWith('/api/v1/comparisons', { params: { page: 1, limit: 10 } });
    expect(result.items).toEqual([]);
  });

  it('annotationService.getTasks calls GET /api/v1/annotations/tasks with filters', async () => {
    const mockTasks = {
      items: [
        {
          id: 'task_001',
          canonical_product_id: 'prod_1',
          marketplace: 'flipkart',
          target_entity_type: 'REVIEW',
          target_entity_id: 'rev_1',
          task_payload_json: { text: 'good' },
          task_status: 'ADJUDICATED',
          recommended_annotator_count: 1,
          target_guidelines_version: 'v1.4_ONTOLOGY',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
    };

    const spy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: { status: 'success', data: mockTasks },
    });

    const result = await annotationService.getTasks({ page: 1, status: 'ADJUDICATED' });
    expect(spy).toHaveBeenCalledWith('/api/v1/annotations/tasks', {
      params: { page: 1, status: 'ADJUDICATED' },
    });
    expect(result.items.length).toBe(1);
    expect(result.items[0].id).toBe('task_001');
  });
});
