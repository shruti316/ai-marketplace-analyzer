import { Router } from 'express';
import { trustController } from './trust.controller';
import { validateRequest } from '../../middleware/validator';
import { entityIdParamSchema } from '../catalog/catalog.schemas';
import { inferenceRateLimiter, heavyOpsRateLimiter } from '../../middleware/rateLimiter';
import {
  assessmentQuerySchema,
  learnedMultimodalQuerySchema,
  reportQuerySchema,
  ablationsQuerySchema
} from './trust.schemas';

const router = Router();

// Products Trust Intelligence
// GET /api/v1/products/:id/trust-assessment
router.get(
  '/products/:id/trust-assessment',
  validateRequest({ params: entityIdParamSchema, query: assessmentQuerySchema }),
  (req, res, next) => {
    trustController.getProductTrustAssessment(req, res, next);
  }
);

// GET /api/v1/products/:id/learned-multimodal (Guarded by ML inference rate limiter)
router.get(
  '/products/:id/learned-multimodal',
  inferenceRateLimiter,
  validateRequest({ params: entityIdParamSchema, query: learnedMultimodalQuerySchema }),
  (req, res, next) => {
    trustController.getProductLearnedMultimodal(req, res, next);
  }
);

// GET /api/v1/products/:id/evidence
router.get(
  '/products/:id/evidence',
  validateRequest({ params: entityIdParamSchema }),
  (req, res, next) => {
    trustController.getProductEvidence(req, res, next);
  }
);

// GET /api/v1/products/:id/report (Guarded by heavy operations rate limiter)
router.get(
  '/products/:id/report',
  heavyOpsRateLimiter,
  validateRequest({ params: entityIdParamSchema, query: reportQuerySchema }),
  (req, res, next) => {
    trustController.getProductReport(req, res, next);
  }
);

// Sellers Governance
// GET /api/v1/sellers/:id/trust-assessment
router.get(
  '/sellers/:id/trust-assessment',
  validateRequest({ params: entityIdParamSchema }),
  (req, res, next) => {
    trustController.getSellerTrustAssessment(req, res, next);
  }
);

// Listings Trust Assessment
// GET /api/v1/listings/:id/trust-assessment
router.get(
  '/listings/:id/trust-assessment',
  validateRequest({ params: entityIdParamSchema }),
  (req, res, next) => {
    trustController.getListingTrustAssessment(req, res, next);
  }
);

// Model Modality Ablations
// GET /api/v1/ablations
router.get(
  '/ablations',
  validateRequest({ query: ablationsQuerySchema }),
  (req, res, next) => {
    trustController.getModalityAblations(req, res, next);
  }
);

export const trustRoutes = router;
