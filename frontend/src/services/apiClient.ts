import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiErrorResponse } from '../types/api';

export const TOKEN_STORAGE_KEY = 'trustsphere_token';
export const USER_STORAGE_KEY = 'trustsphere_user';

// Determine base API URL (in dev, proxy routes /api to http://127.0.0.1:5000)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request Interceptor: Attach JWT Bearer Token from localStorage or sessionStorage
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token =
      localStorage.getItem(TOKEN_STORAGE_KEY) ||
      sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Standardize error handling and handle 401/429
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    if (error.response) {
      const { status, data } = error.response;

      // Handle token expiration or unauthorized access
      if (status === 401) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
        sessionStorage.removeItem(USER_STORAGE_KEY);
        window.dispatchEvent(new Event('auth:unauthorized'));
      }

      // Handle Rate Limiting (429)
      if (status === 429) {
        const retryAfter = data?.retryAfter || 60;
        const rateLimitError = new Error(
          data?.message || `Rate limit exceeded. Please wait ${retryAfter} seconds before retrying.`
        );
        (rateLimitError as unknown as { code: string; retryAfter: number }).code = 'RATE_LIMIT_EXCEEDED';
        (rateLimitError as unknown as { code: string; retryAfter: number }).retryAfter = retryAfter;
        return Promise.reject(rateLimitError);
      }

      // Handle Upstream Gateway / Reverse Proxy 500 (Vite proxy ECONNREFUSED)
      if (status === 500 && (!data || typeof data === 'string' || !data.message)) {
        return Promise.reject(
          new Error('Backend connection failure (Gateway 500). Please ensure the backend is running at http://127.0.0.1:5000.')
        );
      }

      // Format custom API error message
      const formattedMessage = data?.message || `Request failed with status ${status}`;
      const customError = new Error(formattedMessage);
      (customError as unknown as { code?: string }).code = data?.code || 'API_ERROR';
      return Promise.reject(customError);
    } else if (error.request) {
      // Network failure / backend offline
      return Promise.reject(
        new Error('Unable to connect to backend service. Please ensure the backend is running at http://127.0.0.1:5000.')
      );
    }

    return Promise.reject(error);
  }
);
