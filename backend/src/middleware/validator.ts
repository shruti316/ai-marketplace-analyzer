import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from './errorHandler';

export interface RequestValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

// Augment Express Request to carry validated type-safe parsed dictionaries
declare global {
  namespace Express {
    interface Request {
      parsedQuery?: unknown;
      parsedParams?: unknown;
    }
  }
}

/**
 * Express middleware factory to validate incoming request data using Zod schemas.
 * Validates request body, query parameters, and route parameters.
 * Replaces request attributes with type-safe parsed and coerced values.
 */
export function validateRequest(schemas: RequestValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.params) {
        const parsedParams = schemas.params.parse(req.params);
        req.parsedParams = parsedParams;
        try {
          Object.assign(req.params, parsedParams);
        } catch {
          // Fallback if req.params properties are non-writable in Express 5
        }
      }
      if (schemas.query) {
        const parsedQuery = schemas.query.parse(req.query);
        req.parsedQuery = parsedQuery;
        try {
          Object.assign(req.query, parsedQuery);
        } catch {
          // Fallback if req.query properties are non-writable in Express 5
        }
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      next();
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        const formatted = err.errors.map(e => ({
          location: e.path.join('.'),
          message: e.message,
          code: e.code
        }));
        return next(new ValidationError('Request validation failed', formatted));
      }
      next(err);
    }
  };
}
