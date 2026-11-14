import { getEnv } from '../../config/env';
import { NotFoundError, AppError, ServiceUnavailableError } from '../../middleware/errorHandler';

export interface PythonServiceResponse<T = unknown> {
  error?: boolean;
  status_code?: number;
  message?: string;
  [key: string]: unknown;
}

export class TrustIntelligenceClient {
  public fastTimeoutMs: number;
  public standardTimeoutMs: number;
  public inferenceTimeoutMs: number;

  constructor(customTimeouts?: { fast?: number; standard?: number; inference?: number }) {
    let fast = 5000;
    let standard = 10000;
    let inference = 45000;
    try {
      const env = getEnv();
      fast = env.PYTHON_FAST_TIMEOUT_MS;
      standard = env.PYTHON_STANDARD_TIMEOUT_MS;
      inference = env.PYTHON_INFERENCE_TIMEOUT_MS;
    } catch {
      // Use defaults if env is uninitialized
    }
    this.fastTimeoutMs = customTimeouts?.fast ?? fast;
    this.standardTimeoutMs = customTimeouts?.standard ?? standard;
    this.inferenceTimeoutMs = customTimeouts?.inference ?? inference;
  }

  private getBaseUrl(): string {
    return getEnv().PYTHON_SERVICE_URL.replace(/\/+$/, '');
  }

  /**
   * Safe HTTP GET to internal Python service with timeout and sanitized error handling.
   */
  async get<T = unknown>(
    endpoint: string,
    queryParams?: Record<string, string>,
    timeoutMs?: number
  ): Promise<T> {
    const effectiveTimeout = timeoutMs ?? this.standardTimeoutMs;
    const baseUrl = this.getBaseUrl();
    const url = new URL(`${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`);

    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value);
        }
      }
    }

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        },
        signal: AbortSignal.timeout(effectiveTimeout)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorData = data as PythonServiceResponse;
        const message = errorData.message || `Upstream service responded with status ${response.status}`;

        if (response.status === 404) {
          throw new NotFoundError(message, 'UPSTREAM_RESOURCE_NOT_FOUND');
        }

        if (response.status === 400) {
          throw new AppError(message, 400, 'UPSTREAM_BAD_REQUEST');
        }

        throw new AppError(message, response.status, 'UPSTREAM_ERROR');
      }

      return data as T;
    } catch (err: unknown) {
      if (err instanceof AppError) {
        throw err;
      }

      const errorMessage = err instanceof Error ? err.message : String(err);
      const isTimeout = errorMessage.includes('timeout') || (err instanceof Error && err.name === 'TimeoutError');

      if (isTimeout) {
        throw new ServiceUnavailableError(
          `Trust intelligence inference service timed out after ${effectiveTimeout}ms`,
          'UPSTREAM_TIMEOUT'
        );
      }

      throw new ServiceUnavailableError(
        'Trust intelligence inference service is currently unreachable',
        'UPSTREAM_SERVICE_UNAVAILABLE'
      );
    }
  }

  /**
   * Safe HTTP POST to internal Python service.
   */
  async post<T = unknown>(endpoint: string, body: unknown, timeoutMs?: number): Promise<T> {
    const effectiveTimeout = timeoutMs ?? this.standardTimeoutMs;
    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(effectiveTimeout)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorData = data as PythonServiceResponse;
        const message = errorData.message || `Upstream service responded with status ${response.status}`;

        if (response.status === 404) {
          throw new NotFoundError(message, 'UPSTREAM_RESOURCE_NOT_FOUND');
        }
        if (response.status === 400) {
          throw new AppError(message, 400, 'UPSTREAM_BAD_REQUEST');
        }
        throw new AppError(message, response.status, 'UPSTREAM_ERROR');
      }

      return data as T;
    } catch (err: unknown) {
      if (err instanceof AppError) {
        throw err;
      }

      const errorMessage = err instanceof Error ? err.message : String(err);
      const isTimeout = errorMessage.includes('timeout') || (err instanceof Error && err.name === 'TimeoutError');

      if (isTimeout) {
        throw new ServiceUnavailableError(
          `Trust intelligence inference service timed out after ${effectiveTimeout}ms`,
          'UPSTREAM_TIMEOUT'
        );
      }

      throw new ServiceUnavailableError(
        'Trust intelligence inference service is currently unreachable',
        'UPSTREAM_SERVICE_UNAVAILABLE'
      );
    }
  }

  // --- Specific Domain Proxy Methods with Tiered Latency Bounds ---

  /**
   * Fast metadata and snapshot evaluation (Tier 1: 5,000 ms).
   */
  async assessProduct(productId: string) {
    return this.get(`/api/v1/products/${encodeURIComponent(productId)}/trust-assessment`, undefined, this.fastTimeoutMs);
  }

  /**
   * Heavy learned multimodal neural inference (Tier 3: 45,000 ms).
   * Accommodates cold-start multi-stream feature extraction across 3,643 items.
   */
  async assessProductLearnedMultimodal(productId: string, version = 'v1.0') {
    return this.get(
      `/api/v1/products/${encodeURIComponent(productId)}/learned-multimodal`,
      { version },
      this.inferenceTimeoutMs
    );
  }

  /**
   * Standard evidence lookup (Tier 2: 10,000 ms).
   */
  async getProductEvidence(productId: string) {
    return this.get(`/api/v1/products/${encodeURIComponent(productId)}/evidence`, undefined, this.standardTimeoutMs);
  }

  /**
   * Standard explainable report generation (Tier 2: 10,000 ms).
   */
  async getProductReport(productId: string, format = 'json') {
    return this.get(`/api/v1/products/${encodeURIComponent(productId)}/report`, { format }, this.standardTimeoutMs);
  }

  /**
   * Fast listing assessment (Tier 1: 5,000 ms).
   */
  async assessListing(listingId: string) {
    return this.get(`/api/v1/listings/${encodeURIComponent(listingId)}/trust-assessment`, undefined, this.fastTimeoutMs);
  }

  /**
   * Fast seller governance assessment (Tier 1: 5,000 ms).
   */
  async assessSeller(sellerId: string) {
    return this.get(`/api/v1/sellers/${encodeURIComponent(sellerId)}/trust-assessment`, undefined, this.fastTimeoutMs);
  }

  /**
   * Standard ablation metrics evaluation (Tier 2: 10,000 ms).
   */
  async getModalityAblations(version = 'v1.0') {
    return this.get('/api/v1/ablations', { version }, this.standardTimeoutMs);
  }

  /**
   * Standard multi-product comparison (Tier 2: 10,000 ms).
   */
  async compareProducts(canonicalProductIds: string[]) {
    return this.post('/api/v1/compare', { canonical_product_ids: canonicalProductIds }, this.standardTimeoutMs);
  }
}

export const trustClient = new TrustIntelligenceClient();
