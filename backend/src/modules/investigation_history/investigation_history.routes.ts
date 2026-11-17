import { Router } from 'express';
import { investigationController } from './investigation_history.controller';
import { validateRequest } from '../../middleware/validator';
import { authenticateToken, optionalAuthentication } from '../../middleware/auth';
import { heavyOpsRateLimiter } from '../../middleware/rateLimiter';
import {
  createInvestigationSchema,
  investigationQuerySchema,
  investigationIdParamSchema,
} from './investigation_history.schemas';

const router = Router();

// POST /api/v1/investigations (Save an investigation snapshot, optional authentication to associate with user)
router.post(
  '/',
  optionalAuthentication,
  heavyOpsRateLimiter,
  validateRequest({ body: createInvestigationSchema }),
  (req, res, next) => {
    investigationController.create(req, res, next);
  }
);

// GET /api/v1/investigations (List user's saved investigations)
router.get(
  '/',
  authenticateToken,
  validateRequest({ query: investigationQuerySchema }),
  (req, res, next) => {
    investigationController.list(req, res, next);
  }
);

// GET /api/v1/investigations/:id (Retrieve an investigation snapshot)
router.get(
  '/:id',
  optionalAuthentication,
  validateRequest({ params: investigationIdParamSchema }),
  (req, res, next) => {
    investigationController.getById(req, res, next);
  }
);

// DELETE /api/v1/investigations/:id (Delete an investigation)
router.delete(
  '/:id',
  authenticateToken,
  validateRequest({ params: investigationIdParamSchema }),
  (req, res, next) => {
    investigationController.delete(req, res, next);
  }
);

export const investigationHistoryRoutes = router;
