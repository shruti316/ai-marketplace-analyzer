import { rateLimit, Options } from 'express-rate-limit';
import { Request, Response } from 'express';
import { getEnv } from '../config/env';

/**
 * Standardized 429 error handler conforming to AppError response schema.
 * Prevents information disclosure and provides structured JSON diagnostics.
 */
export function createRateLimitHandler(customMessage?: string) {
  return (_req: Request, res: Response): void => {
    res.status(429).json({
      status: 'error',
      code: 'RATE_LIMIT_EXCEEDED',
      message: customMessage || 'Too many requests from this IP address. Please try again later.'
    });
  };
}

/**
 * Factory helper for creating standardized rate limiters.
 */
export function buildRateLimiter(options: Partial<Options> & { message?: string }) {
  const { message, ...rest } = options;
  return rateLimit({
    standardHeaders: 'draft-7',
    legacyHeaders: true,
    handler: createRateLimitHandler(message),
    ...rest
  });
}

/**
 * Strict Rate Limiter for Authentication (POST /api/v1/auth/login).
 * Mitigates credential stuffing, password spray, and brute-force attacks.
 * Window: 15 minutes, Limit: configurable via AUTH_RATE_LIMIT (default: 10 attempts).
 */
export const authRateLimiter = buildRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: () => getEnv().AUTH_RATE_LIMIT,
  message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
});

/**
 * Machine Learning Inference Rate Limiter (GET /products/:id/learned-multimodal).
 * Mitigates CPU exhaustion from concurrent multi-stream neural feature extraction.
 * Window: 1 minute, Limit: configurable via INFERENCE_RATE_LIMIT (default: 30 req/min).
 */
export const inferenceRateLimiter = buildRateLimiter({
  windowMs: 60 * 1000,
  limit: () => getEnv().INFERENCE_RATE_LIMIT,
  message: 'Machine learning inference rate limit exceeded. Please throttle requests.'
});

/**
 * Heavy Operations Rate Limiter for Reports and Comparison Sessions.
 * Mitigates database lock contention and memory spikes.
 * Window: 1 minute, Limit: configurable via HEAVY_OPS_RATE_LIMIT (default: 40 req/min).
 */
export const heavyOpsRateLimiter = buildRateLimiter({
  windowMs: 60 * 1000,
  limit: () => getEnv().HEAVY_OPS_RATE_LIMIT,
  message: 'Rate limit exceeded for heavy report and comparison operations. Please try again shortly.'
});
