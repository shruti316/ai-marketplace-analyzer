import { Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import { getAllowedOrigins, getEnv } from '../config/env';
import { ForbiddenError } from './errorHandler';

/**
 * Applies essential HTTP security headers to protect against common web vulnerabilities:
 * - MIME type sniffing (X-Content-Type-Options)
 * - Clickjacking (X-Frame-Options)
 * - Cross-site scripting filtering (X-XSS-Protection)
 * - Referrer leakage (Referrer-Policy)
 * - Strict Transport Security (HSTS) in production
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Remove Express fingerprinting header
  res.removeHeader('X-Powered-By');

  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Block iframe embedding to prevent clickjacking attacks
  res.setHeader('X-Frame-Options', 'DENY');

  // Configure modern XSS protection
  res.setHeader('X-XSS-Protection', '0');

  // Restrict referrer leakage on cross-origin requests
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Enable HSTS in production environments
  try {
    const env = getEnv();
    if (env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
  } catch {
    // Default safe fallback if env not initialized
  }

  next();
}

/**
 * Builds configured CORS middleware with explicit origin whitelist validation.
 */
export function buildCorsMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
  const corsOptions: CorsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (e.g. mobile applications, curl, server-to-server requests)
      if (!origin) {
        return callback(null, true);
      }

      const allowed = getAllowedOrigins();
      if (allowed.includes(origin) || allowed.includes('*')) {
        return callback(null, true);
      }

      // Rejection for unauthorized cross-origin requests
      callback(new ForbiddenError(`Origin "${origin}" is not permitted by CORS policy`, 'CORS_NOT_ALLOWED'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true,
    maxAge: 86400 // 24 hours
  };

  return cors(corsOptions);
}
