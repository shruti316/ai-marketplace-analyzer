import { apiClient } from './apiClient';
import { PlatformHealth } from '../types/trust';

export const healthService = {
  async getHealth(): Promise<PlatformHealth> {
    const response = await apiClient.get<PlatformHealth>('/api/v1/health');
    return response.data;
  },
};
