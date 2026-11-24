import { describe, it, expect } from 'vitest';
import { extractApiError, safeString } from '../services/errorExtractor';
import { TrustSphereApiError } from '../services/apiClient';

describe('TrustSphere Error Extractor & Sanitizer', () => {
  it('safely handles non-string and "[object Object]" values', () => {
    expect(safeString('[object Object]')).toBeNull();
    expect(safeString(null)).toBeNull();
    expect(safeString(undefined)).toBeNull();
    expect(safeString('')).toBeNull();
    expect(safeString('   ')).toBeNull();
    expect(safeString('Valid Error Message')).toBe('Valid Error Message');
    expect(safeString(404)).toBe('404');
  });

  it('unpacks nested backend error objects without returning "[object Object]"', () => {
    // Case 1: Nested { error: { message: "Invalid credentials", code: "INVALID_CREDENTIALS" } }
    const err1 = {
      response: {
        status: 401,
        data: {
          error: {
            message: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS',
          },
        },
      },
    };
    const res1 = extractApiError(err1);
    expect(res1.message).toBe('Invalid email or password. Please verify your credentials or create a new account.');
    expect(res1.code).toBe('INVALID_CREDENTIALS');
    expect(res1.status).toBe(401);
    expect(res1.message).not.toContain('[object Object]');

    // Case 2: Direct backend validation error with details array
    const err2 = {
      response: {
        status: 400,
        data: {
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: [
            { location: 'fullName', message: 'Required' },
            { location: 'email', message: 'Invalid email format' },
          ],
        },
      },
    };
    const res2 = extractApiError(err2);
    expect(res2.message).toBe('fullName: Required. email: Invalid email format');
    expect(res2.code).toBe('VALIDATION_ERROR');
    expect(res2.status).toBe(400);
    expect(res2.validationErrors).toEqual(['fullName: Required', 'email: Invalid email format']);

    // Case 3: Vercel SSO Protected Deployment Envelope
    const err3 = {
      response: {
        status: 401,
        data: {
          error: {
            code: '401',
            message: 'Protected deployment',
          },
          message: 'Protected by Vercel Authentication',
        },
      },
    };
    const res3 = extractApiError(err3);
    expect(res3.message).toContain('protected by Vercel Authentication');
    expect(res3.code).toBe('VERCEL_SSO_PROTECTED');
    expect(res3.status).toBe(401);

    // Case 4: Duplicate Email 409 Conflict
    const err4 = {
      response: {
        status: 409,
        data: {
          status: 'error',
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'An account with email "test@example.com" already exists.',
        },
      },
    };
    const res4 = extractApiError(err4);
    expect(res4.message).toBe('An account with this email address already exists. Please sign in instead.');
    expect(res4.code).toBe('EMAIL_ALREADY_EXISTS');
    expect(res4.status).toBe(409);
  });

  it('guarantees empty or corrupted objects never produce "[object Object]"', () => {
    // Empty object
    const emptyObjRes = extractApiError({});
    expect(emptyObjRes.message).toBe('An unexpected error occurred. Please try again.');
    expect(emptyObjRes.message).not.toContain('[object Object]');

    // Object with message: "[object Object]"
    const corruptedErr = new Error('[object Object]');
    const corruptedRes = extractApiError(corruptedErr);
    expect(corruptedRes.message).toBe('An unexpected error occurred. Please try again.');
    expect(corruptedRes.message).not.toContain('[object Object]');

    // Corrupted nested message
    const nestedCorrupted = {
      message: '[object Object]',
      status: 500,
    };
    const nestedRes = extractApiError(nestedCorrupted);
    expect(nestedRes.message).toBe('Backend service error (HTTP 500). Container may be warming up; please retry in a moment.');
    expect(nestedRes.message).not.toContain('[object Object]');
  });

  it('correctly handles network drop, offline, and container cold-start timeouts', () => {
    // Timeout
    const timeoutErr = {
      code: 'ECONNABORTED',
      message: 'timeout of 75000ms exceeded',
      isAxiosError: true,
    };
    const timeoutRes = extractApiError(timeoutErr);
    expect(timeoutRes.isTimeout).toBe(true);
    expect(timeoutRes.isColdStart).toBe(true);
    expect(timeoutRes.code).toBe('TIMEOUT');
    expect(timeoutRes.message).toContain('took longer than expected');

    // Unreachable network drop (e.g. CORS failure or server down)
    const networkDropErr = {
      message: 'Network Error',
      isAxiosError: true,
    };
    const networkRes = extractApiError(networkDropErr);
    expect(networkRes.isNetworkError).toBe(true);
    expect(networkRes.code).toBe('UNREACHABLE');
    expect(networkRes.message).toContain('Unable to reach TrustSphere backend service');
  });

  it('preserves TrustSphereApiError fields and prevents "[object Object]" in constructor', () => {
    // If an object was mistakenly passed into constructor
    const apiErr = new TrustSphereApiError({ someKey: 'someVal' } as any, {
      status: 400,
      code: 'VALIDATION_ERROR',
    });
    expect(apiErr.message).toBe('An unexpected API error occurred.');
    expect(apiErr.message).not.toContain('[object Object]');
    expect(apiErr.status).toBe(400);
    expect(apiErr.code).toBe('VALIDATION_ERROR');
  });
});
