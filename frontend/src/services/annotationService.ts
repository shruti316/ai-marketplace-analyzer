import { apiClient } from './apiClient';
import { ApiResponse } from '../types/catalog';

export interface AnnotationTask {
  id: string;
  canonical_product_id: string;
  marketplace: string;
  target_entity_type: string;
  target_entity_id: string;
  task_payload_json: Record<string, unknown>;
  task_status: 'PENDING' | 'IN_REVIEW' | 'ADJUDICATED' | string;
  recommended_annotator_count: number;
  target_guidelines_version: string;
  created_at: string;
  updated_at: string;
  product_title?: string;
}

export interface AnnotationTaskListResponse {
  items: AnnotationTask[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const annotationService = {
  /**
   * Retrieves paginated human expert annotation tasks.
   */
  async getTasks(params?: {
    page?: number;
    limit?: number;
    status?: string;
    target_entity_type?: string;
  }): Promise<AnnotationTaskListResponse> {
    const response = await apiClient.get<ApiResponse<AnnotationTaskListResponse>>(
      '/api/v1/annotations/tasks',
      { params }
    );
    return response.data.data;
  },

  /**
   * Retrieves single annotation task details.
   */
  async getTaskById(taskId: string): Promise<AnnotationTask> {
    const response = await apiClient.get<ApiResponse<{ task: AnnotationTask }>>(
      `/api/v1/annotations/tasks/${taskId}`
    );
    return response.data.data.task;
  },

  /**
   * Adjudicates an annotation task (ADMIN only).
   */
  async adjudicateTask(
    taskId: string,
    payload: {
      final_consensus_label: 'CONFIRMED_ANOMALY' | 'BENIGN_DISCORDANCE' | 'UNVERIFIABLE_SPARSE_DATA';
      adjudication_rationale: string;
    }
  ): Promise<unknown> {
    const response = await apiClient.post<ApiResponse<unknown>>(
      `/api/v1/annotations/tasks/${taskId}/adjudicate`,
      payload
    );
    return response.data.data;
  },
};
