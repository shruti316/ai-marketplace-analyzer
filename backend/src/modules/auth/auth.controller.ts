import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { UnauthorizedError } from '../../middleware/errorHandler';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.json({
        status: 'success',
        token: result.token,
        user: result.user
      });
    } catch (err) {
      next(err);
    }
  }

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

  async logout(_req: Request, res: Response, _next: NextFunction): Promise<void> {
    res.json({
      status: 'success',
      message: 'Logged out successfully'
    });
  }
}

export const authController = new AuthController();
