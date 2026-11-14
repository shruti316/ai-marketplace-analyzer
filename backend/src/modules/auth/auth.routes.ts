import { Router } from 'express';
import { authController } from './auth.controller';
import { validateRequest } from '../../middleware/validator';
import { loginSchema } from './auth.schemas';
import { authenticateToken } from '../../middleware/auth';
import { authRateLimiter } from '../../middleware/rateLimiter';

const router = Router();

// POST /api/v1/auth/login (Guarded with strict brute-force rate limiter)
router.post('/login', authRateLimiter, validateRequest({ body: loginSchema }), (req, res, next) => {
  authController.login(req, res, next);
});

// GET /api/v1/auth/me
router.get('/me', authenticateToken, (req, res, next) => {
  authController.me(req, res, next);
});

// POST /api/v1/auth/logout
router.post('/logout', authenticateToken, (req, res, next) => {
  authController.logout(req, res, next);
});

export const authRoutes = router;
