import { Request, Response, NextFunction } from 'express';
import { getEnv } from '../config/env';

/**
 * Sensitive header keys that must NEVER be printed or logged.
 */
const REDACTED_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'proxy-authorization'
]);

/**
 * Sanitizes headers object by masking sensitive credential fields.
 */
export function sanitizeHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (REDACTED_HEADERS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Request logging middleware.
 * Records request method, path, response status code, duration in ms, and client IP.
 * Architectural Invariant: Never outputs sensitive tokens, passwords, or authentication credentials.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  let isTest = false;
  try {
    isTest = getEnv().NODE_ENV === 'test';
  } catch {
    isTest = process.env.NODE_ENV === 'test';
  }

  const startMs = Date.now();
  const method = req.method;
  const path = req.originalUrl || req.url;

  // Intercept response finish event
  res.on('finish', () => {
    if (isTest) return; // Suppress verbose log noise during automated test suite runs

    const durationMs = Date.now() - startMs;
    const statusCode = res.statusCode;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    const statusLevel = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO';
    console.log(`[${statusLevel}] ${method} ${path} ${statusCode} - ${durationMs}ms (IP: ${ip})`);
  });

  next();
}
