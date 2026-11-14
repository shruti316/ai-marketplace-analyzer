import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { getEnv } from '../config/env';

// =============================================================================
// CENTRALIZED OPERATIONAL ERROR CLASSES
// =============================================================================

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    // Restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Requested resource not found', code: string = 'NOT_FOUND', details?: unknown) {
    super(message, 404, code, details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required', code: string = 'UNAUTHORIZED', details?: unknown) {
    super(message, 401, code, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied', code: string = 'FORBIDDEN', details?: unknown) {
    super(message, 403, code, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', code: string = 'CONFLICT', details?: unknown) {
    super(message, 409, code, details);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message: string = 'Payload exceeds maximum permitted size', code: string = 'PAYLOAD_TOO_LARGE', details?: unknown) {
    super(message, 413, code, details);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Upstream service is currently unavailable', code: string = 'SERVICE_UNAVAILABLE', details?: unknown) {
    super(message, 503, code, details);
  }
}

// =============================================================================
// CENTRALIZED 404 NOT FOUND HANDLER
// =============================================================================

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`, 'ROUTE_NOT_FOUND'));
}

// =============================================================================
// CENTRALIZED ERROR HANDLING MIDDLEWARE
// =============================================================================

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const timestamp = new Date().toISOString();

  let envMode = 'development';
  try {
    envMode = getEnv().NODE_ENV;
  } catch {
    envMode = process.env.NODE_ENV || 'development';
  }
  const isProd = envMode === 'production';

  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    const formatted = err.errors.map(e => ({
      path: e.path.join('.'),
      message: e.message,
      code: e.code
    }));

    res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: 'Request schema validation failed',
      details: formatted,
      timestamp
    });
    return;
  }

  // 2. SyntaxError from body-parser / express.json (Malformed JSON)
  if (err instanceof SyntaxError && 'status' in err && (err as { status?: number }).status === 400 && 'body' in err) {
    res.status(400).json({
      status: 'error',
      code: 'INVALID_JSON',
      message: 'Malformed JSON payload provided in request body',
      timestamp
    });
    return;
  }

  // 3. Payload size limit exceeded (e.g. from express.json limit)
  if (err && typeof err === 'object' && 'type' in err && (err as { type?: string }).type === 'entity.too.large') {
    res.status(413).json({
      status: 'error',
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Request payload exceeded maximum size limit (1MB)',
      timestamp
    });
    return;
  }

  // 4. Known Operational AppErrors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      code: err.code,
      message: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}),
      timestamp
    });
    return;
  }

  // 5. Unhandled / Unexpected Errors
  const genericError = err instanceof Error ? err : new Error(String(err));

  // Log unhandled error server-side for debugging
  if (envMode !== 'test') {
    console.error('[UNHANDLED INTERNAL ERROR]', genericError);
  }

  // In production, mask internal database or filesystem error details
  const safeMessage = isProd
    ? 'An internal server error occurred'
    : genericError.message;

  res.status(500).json({
    status: 'error',
    code: 'INTERNAL_SERVER_ERROR',
    message: safeMessage,
    ...(!isProd && genericError.stack ? { stack: genericError.stack } : {}),
    timestamp
  });
}
