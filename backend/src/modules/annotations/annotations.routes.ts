import { Router } from 'express';
import { annotationsController } from './annotations.controller';
import { validateRequest } from '../../middleware/validator';
import {
  taskListQuerySchema,
  submitAnnotationSchema,
  adjudicateTaskSchema
} from './annotations.schemas';
import { entityIdParamSchema } from '../catalog/catalog.schemas';
import { authenticateToken, requireRole } from '../../middleware/auth';

const router = Router();

// Base protection: Must be authenticated and hold at least ANALYST or ADMIN role
router.use(authenticateToken);
router.use(requireRole('ADMIN', 'ANALYST'));

// GET /api/v1/annotations/tasks
router.get(
  '/tasks',
  validateRequest({ query: taskListQuerySchema }),
  (req, res, next) => {
    annotationsController.getTasks(req, res, next);
  }
);

// POST /api/v1/annotations/tasks/:id/assign
router.post(
  '/tasks/:id/assign',
  validateRequest({ params: entityIdParamSchema }),
  (req, res, next) => {
    annotationsController.assignTask(req, res, next);
  }
);

// GET /api/v1/annotations/tasks/:id
router.get(
  '/tasks/:id',
  validateRequest({ params: entityIdParamSchema }),
  (req, res, next) => {
    annotationsController.getTaskById(req, res, next);
  }
);

// POST /api/v1/annotations/tasks/:id/submit
router.post(
  '/tasks/:id/submit',
  validateRequest({ params: entityIdParamSchema, body: submitAnnotationSchema }),
  (req, res, next) => {
    annotationsController.submitAnnotation(req, res, next);
  }
);

// POST /api/v1/annotations/tasks/:id/adjudicate (Requires ADMIN)
router.post(
  '/tasks/:id/adjudicate',
  requireRole('ADMIN'),
  validateRequest({ params: entityIdParamSchema, body: adjudicateTaskSchema }),
  (req, res, next) => {
    annotationsController.adjudicateTask(req, res, next);
  }
);

export const annotationsRoutes = router;
