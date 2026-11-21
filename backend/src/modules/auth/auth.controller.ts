import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { UnauthorizedError } from '../../middleware/errorHandler';

const REFRESH_COOKIE_NAME = 'ts_refresh_token';

function setRefreshTokenCookie(res: Response, refreshToken: string, rememberMe = true): void {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/api/v1/auth',
    maxAge: (rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000
  });
}

function clearRefreshTokenCookie(res: Response): void {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/api/v1/auth'
  });
}

export class AuthController {
  /**
   * Registers a new consumer/analyst user.
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, fullName, rememberMe } = req.body;
      const userAgent = req.headers['user-agent'] || null;
      const ipAddress = req.ip || req.socket.remoteAddress || null;

      const result = await authService.register(
        email,
        password,
        fullName,
        userAgent,
        ipAddress,
        rememberMe !== false
      );

      setRefreshTokenCookie(res, result.refreshToken, rememberMe !== false);

      res.status(201).json({
        status: 'success',
        token: result.token,
        refreshToken: result.refreshToken,
        user: result.user
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Authenticates user and generates session.
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, rememberMe } = req.body;
      const userAgent = req.headers['user-agent'] || null;
      const ipAddress = req.ip || req.socket.remoteAddress || null;

      const result = await authService.login(
        email,
        password,
        userAgent,
        ipAddress,
        rememberMe !== false
      );

      setRefreshTokenCookie(res, result.refreshToken, rememberMe !== false);

      res.json({
        status: 'success',
        token: result.token,
        refreshToken: result.refreshToken,
        user: result.user
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Rotates session tokens using the secure refresh token.
   */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
      if (!rawRefreshToken) {
        throw new UnauthorizedError('Refresh token not provided in cookie or payload', 'REFRESH_TOKEN_REQUIRED');
      }

      const userAgent = req.headers['user-agent'] || null;
      const ipAddress = req.ip || req.socket.remoteAddress || null;

      const result = await authService.refreshToken(rawRefreshToken, userAgent, ipAddress);

      setRefreshTokenCookie(res, result.refreshToken, true);

      res.json({
        status: 'success',
        token: result.token,
        refreshToken: result.refreshToken,
        user: result.user
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves profile for the currently authenticated user.
   */
  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required', 'AUTHENTICATION_REQUIRED');
      }
      const profile = await authService.getCurrentUserProfile(req.user.id);
      res.json({
        status: 'success',
        data: {
          user: profile
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Terminates session and clears credentials.
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
      const userId = req.user?.id || null;

      await authService.logout(rawRefreshToken, userId);
      clearRefreshTokenCookie(res);

      res.json({
        status: 'success',
        message: 'Logged out successfully'
      });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
