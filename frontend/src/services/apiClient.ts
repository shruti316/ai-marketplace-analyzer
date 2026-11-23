import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiErrorResponse } from '../types/api';

export const TOKEN_STORAGE_KEY = 'trustsphere_token';
export const USER_STORAGE_KEY = 'trustsphere_user';
export const REFRESH_TOKEN_STORAGE_KEY = 'trustsphere_refresh_token';

/**
 * Standardized TrustSphere API Error with HTTP status and diagnostic categorization.
 */
export class TrustSphereApiError extends Error {
  public status?: number;
  public code?: string;
  public isTimeout?: boolean;
  public isNetworkError?: boolean;
  public isColdStart?: boolean;
  public retryAfter?: number;

  constructor(
    message: string,
    options?: {
      status?: number;
      code?: string;
      isTimeout?: boolean;
      isNetworkError?: boolean;
      isColdStart?: boolean;
      retryAfter?: number;
    }
  ) {
    super(message);
    this.name = 'TrustSphereApiError';
    this.status = options?.status;
    this.code = options?.code;
    this.isTimeout = options?.isTimeout;
    this.isNetworkError = options?.isNetworkError;
    this.isColdStart = options?.isColdStart;
    this.retryAfter = options?.retryAfter;
  }
}

// Determine base API URL (in dev, proxy routes /api to http://127.0.0.1:5000; in prod on Vercel, set to Render backend URL)
const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
const API_BASE_URL = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 75000, // 75-second timeout to accommodate Render free-tier cold starts
  withCredentials: true, // Send HttpOnly refresh cookies across origins
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

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor: Standardize error handling and handle 401 with silent session refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response) {
      const { status, data } = error.response;
      const url = originalRequest?.url || '';

      // Skip refresh attempt on login, register, or refresh endpoints themselves
      const isAuthEndpoint =
        url.includes('/api/v1/auth/login') ||
        url.includes('/api/v1/auth/register') ||
        url.includes('/api/v1/auth/refresh');

      // Handle 401 Unauthorized by attempting session refresh once
      if (status === 401 && !originalRequest?._retry && !isAuthEndpoint) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              return apiClient(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const fallbackRefresh =
            localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) ||
            sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) ||
            undefined;

          const refreshRes = await axios.post<{
            status: string;
            token: string;
            refreshToken?: string;
          }>(
            `${API_BASE_URL}/api/v1/auth/refresh`,
            { refreshToken: fallbackRefresh },
            { withCredentials: true }
          );

          const newToken = refreshRes.data.token;
          const newRefreshToken = refreshRes.data.refreshToken;

          if (localStorage.getItem(TOKEN_STORAGE_KEY)) {
            localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
            if (newRefreshToken) localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, newRefreshToken);
          } else {
            sessionStorage.setItem(TOKEN_STORAGE_KEY, newToken);
            if (newRefreshToken) sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, newRefreshToken);
          }

          processQueue(null, newToken);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return apiClient(originalRequest);
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          localStorage.removeItem(USER_STORAGE_KEY);
          localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
          sessionStorage.removeItem(TOKEN_STORAGE_KEY);
          sessionStorage.removeItem(USER_STORAGE_KEY);
          sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
          window.dispatchEvent(new Event('auth:unauthorized'));
          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      }

      // Handle Rate Limiting (429)
      if (status === 429) {
        const retryAfter = data?.retryAfter || 60;
        const msg = data?.message || `Rate limit exceeded. Please wait ${retryAfter} seconds before retrying.`;
        return Promise.reject(
          new TrustSphereApiError(msg, {
            status: 429,
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter,
          })
        );
      }

      // Extract descriptive error message
      const message =
        data?.message ||
        (data as unknown as { error?: string })?.error ||
        (data as unknown as { msg?: string })?.msg ||
        `Request failed with HTTP status ${status}`;

      return Promise.reject(
        new TrustSphereApiError(message, {
          status,
          code: data?.code,
        })
      );
    }

    if (error.code === 'ECONNABORTED') {
      return Promise.reject(
        new TrustSphereApiError(
          'Server request timed out after 75 seconds. The cloud backend may be waking up from sleep (cold start).',
          {
            isTimeout: true,
            isColdStart: true,
            code: 'TIMEOUT',
          }
        )
      );
    }

    if (!error.response) {
      const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
      if (isOffline) {
        return Promise.reject(
          new TrustSphereApiError(
            'Internet connection appears to be offline. Please verify network connectivity.',
            {
              isNetworkError: true,
              code: 'OFFLINE',
            }
          )
        );
      }

      return Promise.reject(
        new TrustSphereApiError(
          'Unable to reach TrustSphere backend service. The server may be waking up from cold sleep or network was interrupted.',
          {
            isNetworkError: true,
            isColdStart: true,
            code: 'UNREACHABLE',
          }
        )
      );
    }

    return Promise.reject(
      new TrustSphereApiError(error.message || 'Network error encountered. Please check connectivity.', {
        isNetworkError: true,
      })
    );
  }
);
