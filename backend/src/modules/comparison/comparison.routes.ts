import { Router } from 'express';
import { comparisonController } from './comparison.controller';
import { validateRequest } from '../../middleware/validator';
import { createComparisonSchema, comparisonQuerySchema } from './comparison.schemas';
import { entityIdParamSchema } from '../catalog/catalog.schemas';
import { authenticateToken } from '../../middleware/auth';
import { heavyOpsRateLimiter } from '../../middleware/rateLimiter';

const router = Router();

// All comparison endpoints require authentication
router.use(authenticateToken);

// POST /api/v1/comparisons (Guarded by heavy operations rate limiter)
router.post(
  '/',
  heavyOpsRateLimiter,
  validateRequest({ body: createComparisonSchema }),
  (req, res, next) => {
    comparisonController.createComparison(req, res, next);
  }
);

// GET /api/v1/comparisons
router.get(
  '/',
  validateRequest({ query: comparisonQuerySchema }),
  (req, res, next) => {
    comparisonController.getUserComparisons(req, res, next);
  }
);

// GET /api/v1/comparisons/:id
router.get(
  '/:id',
  validateRequest({ params: entityIdParamSchema }),
  (req, res, next) => {
    comparisonController.getComparisonById(req, res, next);
  }
);

// DELETE /api/v1/comparisons/:id
router.delete(
  '/:id',
  validateRequest({ params: entityIdParamSchema }),
  (req, res, next) => {
    comparisonController.deleteComparison(req, res, next);
  }
);

export const comparisonRoutes = router;
