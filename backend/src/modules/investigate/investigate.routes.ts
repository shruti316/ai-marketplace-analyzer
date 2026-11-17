import { Router } from 'express';
import { investigateController } from './investigate.controller';
import { validateRequest } from '../../middleware/validator';
import { authenticateToken } from '../../middleware/auth';
import { heavyOpsRateLimiter, inferenceRateLimiter } from '../../middleware/rateLimiter';
import {
  investigateUrlSchema,
  investigateImageSchema,
  investigateAdhocSchema,
  assistantChatSchema
} from './investigate.schemas';

const router = Router();

// 1. Marketplace Listing URL Investigation (Catalog matching & SSRF Guard)
// POST /api/v1/investigate/url
router.post(
  '/url',
  validateRequest({ body: investigateUrlSchema }),
  (req, res, next) => {
    investigateController.resolveUrl(req, res, next);
  }
);

// 2. Physical Packaging & Product Image Investigation
// POST /api/v1/investigate/image
router.post(
  '/image',
  authenticateToken,
  heavyOpsRateLimiter,
  validateRequest({ body: investigateImageSchema }),
  (req, res, next) => {
    investigateController.inspectImage(req, res, next);
  }
);

// 3. Ad-Hoc / Manual Product Details Inference
// POST /api/v1/investigate/adhoc
router.post(
  '/adhoc',
  authenticateToken,
  inferenceRateLimiter,
  validateRequest({ body: investigateAdhocSchema }),
  (req, res, next) => {
    investigateController.inferAdhoc(req, res, next);
  }
);

export const investigateRoutes = router;

// Assistant Router mounted at /api/v1/assistant
const assistantRouter = Router();

// 4. Grounded Conversational AI Assistant
// POST /api/v1/assistant/chat
assistantRouter.post(
  '/chat',
  authenticateToken,
  validateRequest({ body: assistantChatSchema }),
  (req, res, next) => {
    investigateController.chatAssistant(req, res, next);
  }
);

export const assistantRoutes = assistantRouter;
