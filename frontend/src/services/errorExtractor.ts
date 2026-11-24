/**
 * TrustSphere Unified API & Auth Error Extractor
 * 
 * Safely extracts human-readable error messages, diagnostic error codes,
 * HTTP status codes, and validation details from any error shape:
 * - Standard Error instances
 * - TrustSphereApiError instances
 * - AxiosError with response.data ({ message, error, msg, code, details })
 * - Cloudflare / Vercel Edge error envelopes ({ error: { code, message } })
 * - Network failures, timeouts, and offline states
 * - Corrupted or unexpected objects (Guarantees "[object Object]" is NEVER returned)
 */

export interface ExtractedApiError {
  /** The clean, human-readable error description (Guaranteed NEVER "[object Object]") */
  message: string;
  /** Machine-readable error code if present (e.g., EMAIL_ALREADY_EXISTS, INVALID_CREDENTIALS) */
  code?: string;
  /** HTTP status code if present (e.g., 400, 401, 409, 429, 500) */
  status?: number;
  /** Any individual validation error messages extracted from details array */
  validationErrors?: string[];
  /** Categorization flags */
  isTimeout?: boolean;
  isNetworkError?: boolean;
  isColdStart?: boolean;
  isOffline?: boolean;
  retryAfter?: number;
}

/**
 * Safely converts an arbitrary value to a trimmed string, returning null if empty or "[object Object]".
 */
export function safeString(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === '[object Object]' || trimmed === 'null' || trimmed === 'undefined') {
      return null;
    }
    return trimmed;
  }
  if (typeof val === 'number' || typeof val === 'boolean') {
    return String(val);
  }
  return null;
}

/**
 * Recursively inspects an object to extract string messages, error codes, and validation detail lists.
 */
export function extractStringFromObject(obj: unknown): {
  message: string | null;
  code: string | null;
  details: string[];
} {
  if (!obj || typeof obj !== 'object') {
    return { message: null, code: null, details: [] };
  }

  const rec = obj as Record<string, unknown>;
  const details: string[] = [];

  // 1. Check details array (common in Zod / Express validation errors)
  if (Array.isArray(rec.details)) {
    for (const item of rec.details) {
      if (typeof item === 'string') {
        const s = safeString(item);
        if (s) details.push(s);
      } else if (item && typeof item === 'object') {
        const itemRec = item as Record<string, unknown>;
        const field = safeString(itemRec.path || itemRec.location || itemRec.field || itemRec.param);
        const msg = safeString(itemRec.message || itemRec.msg || itemRec.error);
        if (field && msg) {
          details.push(`${field}: ${msg}`);
        } else if (msg) {
          details.push(msg);
        }
      }
    }
  }

  // 2. Extract error code
  let code = safeString(rec.code);
  if (!code && rec.error && typeof rec.error === 'object') {
    code = safeString((rec.error as Record<string, unknown>).code);
  }

  // 3. Extract message candidates in priority order
  let message: string | null = null;

  if (safeString(rec.message)) {
    message = safeString(rec.message);
  } else if (safeString(rec.error)) {
    message = safeString(rec.error);
  } else if (rec.error && typeof rec.error === 'object') {
    const nested = extractStringFromObject(rec.error);
    message = nested.message;
    if (!code && nested.code) code = nested.code;
  } else if (safeString(rec.msg)) {
    message = safeString(rec.msg);
  } else if (safeString(rec.errorMessage)) {
    message = safeString(rec.errorMessage);
  }

  // If the top message is generic and field details are available, prioritize the concrete details
  if (details.length > 0) {
    if (!message || message.toLowerCase().includes('validation') || message.toLowerCase().includes('schema')) {
      message = details.join('. ');
    }
  }

  return { message, code, details };
}

/**
 * Central Error Extractor
 * Invariant: Returned message is ALWAYS a non-empty, meaningful string and NEVER "[object Object]".
 */
export function extractApiError(
  err: unknown,
  defaultMessage = 'An unexpected error occurred. Please try again.'
): ExtractedApiError {
  if (typeof err === 'string') {
    const s = safeString(err);
    return {
      message: s || defaultMessage,
    };
  }

  let status: number | undefined;
  let code: string | undefined;
  let message: string | null = null;
  let validationErrors: string[] = [];
  let isTimeout = false;
  let isNetworkError = false;
  let isColdStart = false;
  let isOffline = false;
  let retryAfter: number | undefined;

  const isObject = Boolean(err && typeof err === 'object');
  const errObj = isObject ? (err as Record<string, unknown>) : null;

  if (errObj) {
    // 1. Direct fields from TrustSphereApiError or custom error objects
    if (typeof errObj.status === 'number') status = errObj.status;
    if (typeof errObj.code === 'string') code = safeString(errObj.code) || undefined;
    if (Boolean(errObj.isTimeout)) isTimeout = true;
    if (Boolean(errObj.isNetworkError)) isNetworkError = true;
    if (Boolean(errObj.isColdStart)) isColdStart = true;
    if (typeof errObj.retryAfter === 'number') retryAfter = errObj.retryAfter;

    // 2. Check Axios response payload
    const response = errObj.response as Record<string, unknown> | undefined;
    if (response) {
      if (typeof response.status === 'number') {
        status = response.status;
      }
      const data = response.data;
      if (typeof data === 'string') {
        // Guard against HTML error pages (e.g. Cloudflare / Nginx 502/504)
        if (data.trim().startsWith('<')) {
          message = `Upstream service returned HTTP ${status}. The backend container may be initializing.`;
          isColdStart = true;
        } else {
          message = safeString(data);
        }
      } else if (data && typeof data === 'object') {
        const unpacked = extractStringFromObject(data);
        if (unpacked.message) message = unpacked.message;
        if (unpacked.code) code = unpacked.code;
        if (unpacked.details.length > 0) validationErrors = unpacked.details;
      }
    }

    // 3. Check for timeout / network aborts
    if (
      errObj.code === 'ECONNABORTED' ||
      errObj.code === 'TIMEOUT' ||
      (typeof errObj.message === 'string' && errObj.message.toLowerCase().includes('timeout'))
    ) {
      isTimeout = true;
      isColdStart = true;
      code = 'TIMEOUT';
      message = 'Connecting to TrustSphere cloud engine took longer than expected (~75s). Please retry.';
    }

    // 4. Check for offline / network dropped
    if (!response && !isTimeout && ('isAxiosError' in errObj || 'response' in errObj)) {
      isNetworkError = true;
      isColdStart = true;
      code = 'UNREACHABLE';
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        isOffline = true;
        code = 'OFFLINE';
        message = 'Internet connection appears offline. Please check your network connectivity.';
      } else {
        message = 'Unable to reach TrustSphere backend service. The container may be initializing or network was interrupted.';
      }
    }

    // 5. Check errObj.message if still unset
    if (!message && typeof errObj.message === 'string') {
      message = safeString(errObj.message);
    }
  }

  // 6. Check for Vercel deployment protection before standard 401
  if (
    message?.includes('Protected by Vercel Authentication') ||
    message?.includes('Protected deployment') ||
    code === 'VERCEL_SSO_PROTECTED'
  ) {
    code = 'VERCEL_SSO_PROTECTED';
    message = 'This preview deployment is protected by Vercel Authentication. Please use a shareable bypass link or test on the live production domain.';
  }
  // 7. Semantic HTTP status & error code formatting
  else if (status === 409 || code === 'EMAIL_ALREADY_EXISTS') {
    code = 'EMAIL_ALREADY_EXISTS';
    message = 'An account with this email address already exists. Please sign in instead.';
  } else if (status === 401 || code === 'INVALID_CREDENTIALS') {
    code = 'INVALID_CREDENTIALS';
    message = 'Invalid email or password. Please verify your credentials or create a new account.';
  } else if (status === 403 || code === 'FORBIDDEN' || code === 'CORS_NOT_ALLOWED') {
    code = code || 'FORBIDDEN';
    message = message || 'Access restricted. Please verify your permissions.';
  } else if (status === 429 || code === 'RATE_LIMIT_EXCEEDED') {
    code = 'RATE_LIMIT_EXCEEDED';
    const waitSec = retryAfter || 60;
    message = `Too many attempts. Please wait ${waitSec} seconds before retrying.`;
  } else if (status === 400 && !message) {
    code = code || 'VALIDATION_ERROR';
    message = validationErrors.length > 0 ? validationErrors.join('. ') : 'Validation failed. Please verify your inputs.';
  } else if (status && status >= 500 && (!message || message === 'An internal server error occurred')) {
    code = code || 'SERVER_ERROR';
    message = `Backend service error (HTTP ${status}). Container may be warming up; please retry in a moment.`;
  }

  // 8. Absolute Invariant Guard: NEVER return "[object Object]" or empty string
  if (!message || message === '[object Object]' || message.trim() === '') {
    message = defaultMessage;
  }

  return {
    message,
    code,
    status,
    validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
    isTimeout,
    isNetworkError,
    isColdStart,
    isOffline,
    retryAfter,
  };
}
