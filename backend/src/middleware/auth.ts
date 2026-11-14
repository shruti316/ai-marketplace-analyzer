import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload, TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { getEnv } from '../config/env';
import { UnauthorizedError, ForbiddenError } from './errorHandler';

// =============================================================================
// AUTHENTICATION & ROLE AUTHORIZATION INFRASTRUCTURE
// Architecture Requirement: Cryptographically secure RFC 7519 JWT validation
// =============================================================================

export type UserRole = 'ADMIN' | 'ANALYST' | 'VIEWER';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  fullName?: string;
}

// Augment Express Request interface with typed user property
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Cryptographically signs a standard RFC 7519 JSON Web Token for an authenticated user.
 * Format: Standard header.payload.signature encoded with HMAC-SHA256.
 */
export function createAuthToken(user: AuthUser, expiresInSeconds = 86400): string {
  const env = getEnv();
  const secret = env.JWT_SECRET;

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    ...(user.fullName ? { fullName: user.fullName } : {})
  };

  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn: expiresInSeconds
  });
}

/**
 * Validates and decodes a cryptographically signed standard RFC 7519 JSON Web Token.
 * Throws UnauthorizedError if signature is invalid, token is expired, or payload is malformed.
 */
export function verifyAuthToken(token: string): AuthUser {
  const env = getEnv();
  const secret = env.JWT_SECRET;

  if (!token || typeof token !== 'string') {
    throw new UnauthorizedError('Malformed authentication token structure', 'TOKEN_INVALID');
  }

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256']
    }) as JwtPayload;

    const validRoles: UserRole[] = ['ADMIN', 'ANALYST', 'VIEWER'];
    if (!decoded.role || !validRoles.includes(decoded.role as UserRole)) {
      throw new UnauthorizedError(`Invalid user role "${decoded.role}" encoded in token`, 'TOKEN_INVALID');
    }

    if (!decoded.id || !decoded.email) {
      throw new UnauthorizedError('Token payload missing mandatory user identification fields', 'TOKEN_INVALID');
    }

    return {
      id: decoded.id as string,
      email: decoded.email as string,
      role: decoded.role as UserRole,
      ...(decoded.fullName ? { fullName: decoded.fullName as string } : {})
    };
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      throw new UnauthorizedError('Authentication token has expired', 'TOKEN_EXPIRED');
    }
    if (err instanceof JsonWebTokenError) {
      throw new UnauthorizedError('Invalid authentication token signature', 'TOKEN_INVALID');
    }
    if (err instanceof UnauthorizedError) {
      throw err;
    }
    throw new UnauthorizedError('Authentication token validation failed', 'TOKEN_INVALID');
  }
}

/**
 * Authentication middleware that enforces a valid Bearer token on protected routes.
 */
export function authenticateToken(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : (req.headers['x-access-token'] as string | undefined);

  if (!token) {
    return next(new UnauthorizedError('Authentication required: Bearer token is missing', 'TOKEN_MISSING'));
  }

  try {
    const user = verifyAuthToken(token);
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Optional authentication middleware:
 * Populates req.user if a valid token is present; proceeds without failing if absent.
 */
export function optionalAuthentication(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : (req.headers['x-access-token'] as string | undefined);

  if (!token) {
    return next();
  }

  try {
    const user = verifyAuthToken(token);
    req.user = user;
  } catch {
    // In optional auth, invalid token is ignored
  }
  next();
}

/**
 * Role-based authorization middleware factory:
 * Enforces that req.user holds one of the specified roles.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required for role verification', 'AUTHENTICATION_REQUIRED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access denied: Action requires one of [${allowedRoles.join(', ')}], current role is "${req.user.role}"`,
          'INSUFFICIENT_ROLE'
        )
      );
    }

    next();
  };
}
