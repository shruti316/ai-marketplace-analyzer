import { Router } from 'express';
import { authController } from './auth.controller';
import { validateRequest } from '../../middleware/validator';
import { loginSchema, registerSchema, refreshSchema } from './auth.schemas';
import { authenticateToken } from '../../middleware/auth';
import { authRateLimiter } from '../../middleware/rateLimiter';

const router = Router();

// POST /api/v1/auth/register (New User Self-Registration)
router.post('/register', authRateLimiter, validateRequest({ body: registerSchema }), (req, res, next) => {
  authController.register(req, res, next);
});

// POST /api/v1/auth/login (Guarded with brute-force rate limiter)
router.post('/login', authRateLimiter, validateRequest({ body: loginSchema }), (req, res, next) => {
  authController.login(req, res, next);
});

// POST /api/v1/auth/refresh (Session Rotation & Access Token Refresh)
router.post('/refresh', validateRequest({ body: refreshSchema }), (req, res, next) => {
  authController.refresh(req, res, next);
});

// GET /api/v1/auth/me (User Profile Validation)
router.get('/me', authenticateToken, (req, res, next) => {
  authController.me(req, res, next);
});

// POST /api/v1/auth/logout (Session Revocation & Cookie Clear)
router.post('/logout', (req, res, next) => {
  authController.logout(req, res, next);
});

export const authRoutes = router;
